const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const path = require('path');
const fs = require('fs');
const qrcode = require('qrcode-terminal');
const config = require('../config');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..');
const AUTH_DIR = path.join(DATA_DIR, 'auth_info');
if (!fs.existsSync(AUTH_DIR)) {
  fs.mkdirSync(AUTH_DIR, { recursive: true });
}

let sock = null;
const sentMessageIds = new Set(); // Track bot's own messages to avoid loops

// ─── Reconnect State ─────────────────────────────────────────────────────────
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;
const BASE_RECONNECT_DELAY_MS = 3000; // mulai dari 3 detik

/**
 * Buat koneksi WhatsApp menggunakan Baileys
 * @param {Function} onMessage - Callback saat ada pesan masuk
 */
async function connectWhatsApp(onMessage) {
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  sock = makeWASocket({
    auth: state,
    printQRInTerminal: false,
    logger: pino({ level: 'silent' }),
    browser: ['Kalo Bot', 'Chrome', '1.0.0']
  });

  // Handle connection updates
  sock.ev.on('connection.update', (update) => {
    const { connection, lastDisconnect, qr } = update;

    // Tampilkan QR code di terminal
    if (qr) {
      console.log('\n📱 Scan QR code ini dengan WhatsApp kamu:\n');
      qrcode.generate(qr, { small: true });
      console.log('\nBuka WhatsApp → Settings → Linked Devices → Link a Device\n');
    }

    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      console.log(`❌ Koneksi terputus (code: ${statusCode}).`);

      // Code 440 = Conflict/Duplicate session
      // Terjadi jika ada 2 instance bot berjalan bersamaan atau WhatsApp Web aktif
      if (statusCode === 440) {
        console.log('⚠️  Error 440: Sesi duplikat terdeteksi!');
        console.log('   Kemungkinan penyebab:');
        console.log('   1. Ada proses bot lain yang masih berjalan (tutup terminal lama)');
        console.log('   2. WhatsApp Web sedang aktif di browser (logout dulu dari WA Web)');
        console.log(`   Mencoba reconnect dalam ${BASE_RECONNECT_DELAY_MS / 1000}s...`);
      }

      if (isLoggedOut) {
        console.log('🚪 Logged out. Hapus folder auth_info dan scan ulang QR code.');
        reconnectAttempts = 0;
        return; // Jangan reconnect jika sudah logout
      }

      // Batasi jumlah reconnect agar tidak spam
      if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
        console.error(`🛑 Gagal reconnect setelah ${MAX_RECONNECT_ATTEMPTS} percobaan. Bot berhenti.`);
        console.error('   Coba jalankan ulang secara manual: npm start');
        process.exit(1);
        return;
      }

      // Exponential backoff: 3s, 6s, 12s, 24s, 48s
      const delay = BASE_RECONNECT_DELAY_MS * Math.pow(2, reconnectAttempts);
      reconnectAttempts++;
      console.log(`🔄 Reconnecting... (percobaan ${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS}, tunggu ${delay / 1000}s)`);

      setTimeout(() => connectWhatsApp(onMessage), delay);
    }

    if (connection === 'open') {
      reconnectAttempts = 0; // Reset counter saat berhasil connect
      console.log('✅ WhatsApp connected! Bot siap menerima pesan.');
      if (sock.user) {
        console.log(`👤 Akun bot terhubung: ${sock.user.id} (${sock.user.name || 'User'})`);
        if (sock.user.lid) {
          console.log(`   LID Akun: ${sock.user.lid}`);
        }
      }
    }
  });

  // Simpan credentials saat ada update
  sock.ev.on('creds.update', saveCreds);

  // Handle pesan masuk
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const msg of messages) {
      // 1. Skip pesan kosong, status broadcast, atau pesan grup
      if (!msg.message) continue;
      const remoteJid = msg.key.remoteJid;
      if (!remoteJid || remoteJid === 'status@broadcast' || remoteJid.endsWith('@g.us')) {
        continue;
      }

      // 2. Skip pesan yang dikirim oleh bot sendiri (cegah loop)
      if (sentMessageIds.has(msg.key.id)) {
        sentMessageIds.delete(msg.key.id); // Cleanup
        continue;
      }

      // 3. Identifikasi akun sendiri secara presisi
      const myPhoneNum = sock?.user?.id ? sock.user.id.split(':')[0] : null;
      const myLidNum = sock?.user?.lid ? sock.user.lid.split(':')[0] : null;
      const myPhoneJid = myPhoneNum ? `${myPhoneNum}@s.whatsapp.net` : null;
      const myLidJid = myLidNum ? `${myLidNum}@lid` : null;

      // Cek apakah pesan berada di room "Message Yourself" (You)
      const isSelfChat = (myPhoneJid && remoteJid === myPhoneJid) || (myLidJid && remoteJid === myLidJid);

      // 4. Jika pesan dikirim oleh user (fromMe = true)
      // HANYA proses jika di room Message Yourself. JANGAN proses jika user sedang chat dengan teman!
      if (msg.key.fromMe && !isSelfChat) {
        continue; // User sedang chat dengan orang lain, jangan balas!
      }

      // 5. Jika pesan datang dari orang lain (fromMe = false)
      if (!msg.key.fromMe && !isSelfChat) {
        // Jika ALLOWED_NUMBER diatur, periksa apakah pengirim adalah nomor tersebut
        if (config.allowedNumber) {
          const senderNumber = remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');
          if (senderNumber !== config.allowedNumber && !remoteJid.includes(config.allowedNumber)) {
            continue; // Bukan nomor yang diizinkan, abaikan
          }
        } else {
          // Jika ALLOWED_NUMBER tidak diatur dan bukan self-chat, jangan balas orang lain
          continue;
        }
      }

      // 6. Ambil teks pesan
      const text = msg.message.conversation
        || msg.message.extendedTextMessage?.text
        || '';

      if (!text.trim()) continue;

      const phoneNumber = myPhoneNum || remoteJid.replace('@s.whatsapp.net', '').replace('@lid', '');

      console.log(`📩 Pesan diproses [Self: ${isSelfChat}] di ${remoteJid}: ${text}`);

      // Panggil callback
      if (onMessage) {
        await onMessage(remoteJid, phoneNumber, text, msg, isSelfChat);
      }
    }
  });

  return sock;
}


/**
 * Kirim pesan ke nomor WhatsApp
 */
async function sendMessage(jid, text) {
  if (!sock) {
    console.error('❌ WhatsApp belum terkoneksi');
    return;
  }

  try {
    const sentMsg = await sock.sendMessage(jid, { text });
    if (sentMsg?.key?.id) {
      sentMessageIds.add(sentMsg.key.id);
    }
    console.log(`📤 Pesan terkirim ke ${jid}`);
  } catch (error) {
    console.error(`❌ Gagal kirim pesan ke ${jid}:`, error.message);
  }
}

/**
 * Get current socket instance
 */
function getSocket() {
  return sock;
}

module.exports = { connectWhatsApp, sendMessage, getSocket };
