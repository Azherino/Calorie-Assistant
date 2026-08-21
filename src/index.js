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
