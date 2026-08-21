require('dotenv').config();

const config = {
  geminiApiKey: process.env.GEMINI_API_KEY,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY,
  groqApiKey: process.env.GROQ_API_KEY || null,
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3.6-flash',
  groqModel: process.env.GROQ_MODEL || 'groq/compound-mini',
  allowedNumber: process.env.ALLOWED_NUMBER || null,
  botName: process.env.BOT_NAME || 'Kalo',
};

// Validasi required config
if (!config.geminiApiKey && !config.groqApiKey && !config.anthropicApiKey) {
  console.error('❌ API key belum diset di file .env');
  console.error('   Gemini (utama): https://aistudio.google.com/app/apikey');
  console.error('   Groq  (fallback): https://console.groq.com');
  process.exit(1);
}

module.exports = config;
