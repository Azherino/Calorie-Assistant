const config = require('./config');
const { initializeSchema } = require('./database/schema');
const { closeDb } = require('./database/connection');
const { connectWhatsApp } = require('./whatsapp/client');
const { handleMessage } = require('./whatsapp/handler');

console.log(`
╔══════════════════════════════════════╗
║   🍽️  ${config.botName} — Asisten Kalori Bot    ║
╠══════════════════════════════════════╣
║  WhatsApp Bot + Google Gemini AI     ║
║  Catat makanan, hitung kalori!       ║
╚══════════════════════════════════════╝
`);

// 1. Initialize database
console.log('📦 Initializing database...');
initializeSchema();

// 2. Connect to WhatsApp
console.log('📱 Connecting to WhatsApp...');
connectWhatsApp(handleMessage)
  .then(() => {
    console.log('🚀 Bot startup complete!');
    if (config.allowedNumber) {
      console.log(`🔒 Hanya menerima pesan dari: ${config.allowedNumber}`);
    } else {
      console.log('⚠️  ALLOWED_NUMBER tidak diset — bot menerima pesan dari semua nomor');
      console.log('   Set ALLOWED_NUMBER di .env untuk membatasi akses');
    }
  })
  .catch((error) => {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  });

// 3. Web Healthcheck Server (untuk Railway / Cloud Monitoring)
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.json({
    status: 'online',
    bot: config.botName,
    message: 'Kalo Calorie Assistant WhatsApp Bot is running healthy 24/7! 🍽️',
    timestamp: new Date().toISOString()
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Healthcheck web server listening on port ${PORT}`);
});

// Graceful shutdown
function shutdown() {
  console.log('\n🛑 Shutting down...');
  closeDb();
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

// Handle uncaught errors
process.on('uncaughtException', (error) => {
  console.error('💥 Uncaught exception:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('💥 Unhandled rejection:', error);
});
