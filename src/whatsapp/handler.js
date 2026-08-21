const config = require('../config');
const { sendMessage } = require('./client');
const { processMessage } = require('../ai/agent');

/**
 * Handle pesan masuk dari WhatsApp
 * Hanya proses pesan di room Self-chat (You) atau dari ALLOWED_NUMBER
 */
async function handleMessage(senderJid, phoneNumber, text, rawMessage, isSelfChat = false) {
  // Jika bukan self-chat dan ada batasan ALLOWED_NUMBER
  if (!isSelfChat && config.allowedNumber) {
    const isAllowed = phoneNumber === config.allowedNumber || senderJid.includes(config.allowedNumber);
    if (!isAllowed) {
      console.log(`⛔ Pesan dari ${senderJid} diabaikan (bukan chat bot / bukan nomor yang diizinkan)`);
      return;
    }
  }

  // Kirim "typing" indicator
  try {
    const { getSocket } = require('./client');
    const sock = getSocket();
    if (sock) {
      await sock.sendPresenceUpdate('composing', senderJid);
    }
  } catch (e) {
    // Ignore typing indicator errors
  }

  try {
    console.log(`🤖 Memproses pesan di ${senderJid}...`);

    // Proses pesan melalui AI agent
    const reply = await processMessage(phoneNumber, text);

    // Kirim balasan
    await sendMessage(senderJid, reply);

  } catch (error) {
    console.error(`❌ Error processing message:`, error);

    // Kirim pesan error ke user
    await sendMessage(senderJid,
      '⚠️ Maaf, ada gangguan sementara. Coba lagi dalam beberapa saat ya! 🙏'
    );
  }
}

module.exports = { handleMessage };
