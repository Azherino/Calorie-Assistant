const { GoogleGenAI } = require('@google/genai');
const config = require('../config');
const SYSTEM_PROMPT = require('./system-prompt');
const geminiTools = require('./tools');

// Tool implementations
const { searchFood } = require('../tools/search-food');
const { logMeal } = require('../tools/log-meal');
const { calculateTdee } = require('../tools/calculate-tdee');
const { getDailySummaryTool } = require('../tools/get-daily-summary');
const { updateProfile } = require('../tools/update-profile');

// ─── Gemini Client ───────────────────────────────────────────────────────────
const geminiAI = new GoogleGenAI({
  apiKey: config.geminiApiKey || process.env.GEMINI_API_KEY
});

// ─── Groq Client (lazy-load agar tidak crash jika groq-sdk belum diinstall) ──
let groqClient = null;
function getGroqClient() {
  if (groqClient) return groqClient;
  if (!config.groqApiKey) return null;
  try {
    const Groq = require('groq-sdk');
    groqClient = new Groq({ apiKey: config.groqApiKey });
    console.log('✅ Groq SDK berhasil dimuat sebagai fallback provider');
    return groqClient;
  } catch {
    console.warn('⚠️  groq-sdk belum terinstall. Jalankan: npm install groq-sdk');
    return null;
  }
}

// ─── Conversation Memory ─────────────────────────────────────────────────────
// Masing-masing user menyimpan riwayat chat (phone number → messages[])
const conversations = new Map();
const MAX_HISTORY = 10; // Dikurangi dari 20 → 10 untuk hemat token (±50% penghematan)

function getConversationHistory(phoneNumber) {
  if (!conversations.has(phoneNumber)) {
    conversations.set(phoneNumber, []);
  }
  return conversations.get(phoneNumber);
}

// ─── Tool Executor ────────────────────────────────────────────────────────────
function executeTool(toolName, toolInput, phoneNumber) {
  console.log(`🔧 Executing tool: ${toolName}`, JSON.stringify(toolInput));

  switch (toolName) {
    case 'search_food':
      return searchFood(toolInput.query);
    case 'log_meal':
      return logMeal(phoneNumber, toolInput);
    case 'calculate_tdee':
      return calculateTdee(phoneNumber, toolInput);
    case 'get_daily_summary':
      return getDailySummaryTool(phoneNumber, toolInput?.date || null);
    case 'update_profile':
      return updateProfile(phoneNumber, toolInput.field, toolInput.value);
    default:
      return { error: `Tool "${toolName}" tidak dikenal` };
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function isRateLimitError(err) {
  const msg = err?.message || '';
  return (
    msg.includes('429') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('quota') ||
    msg.includes('rate limit') ||
    err?.status === 429
  );
}

// ─── Gemini API Call ──────────────────────────────────────────────────────────
/**
 * Panggil Gemini dengan retry otomatis untuk error 503/high-demand.
 * Lempar error ke caller jika 429 (quota) agar bisa fallback ke Groq.
 */
async function callGemini(contents, maxRetries = 3) {
  const model = config.geminiModel || 'gemini-3.6-flash';
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await geminiAI.models.generateContent({
        model,
        contents,
        config: {
          systemInstruction: SYSTEM_PROMPT,
          tools: geminiTools,
          temperature: 0.7,
        }
      });
      return response;
    } catch (err) {
      console.warn(`⚠️ Gemini attempt ${attempt}/${maxRetries}:`, err.message || err);
      lastError = err;

      // Jika rate limit (429), langsung lempar — jangan retry — agar fallback ke Groq
      if (isRateLimitError(err)) throw err;

      // Error 503 / high-demand: retry dengan backoff
      const isUnavailable = err.message?.includes('503') || err.message?.includes('UNAVAILABLE');
      if (isUnavailable && attempt < maxRetries) {
        console.log(`⏳ Gemini unavailable, retry dalam ${attempt * 1.5}s...`);
        await sleep(attempt * 1500);
        continue;
      }

      throw err;
    }
  }

  throw lastError;
}

// ─── Strip Thinking Tags ──────────────────────────────────────────────────────
/**
 * Strip <think>...</think> tags dari model (chain-of-thought reasoning)
 * agar internal reasoning tidak tampil ke user WhatsApp.
 */
function stripThinkingTags(text) {
  if (!text) return text;
  let cleaned = text.replace(/<think>[\s\S]*?<\/think>\s*/gi, '');
  cleaned = cleaned.replace(/<think>[\s\S]*/gi, '');
  return cleaned.trim();
}

// ─── Groq Tool Definitions (format OpenAI/Groq) ──────────────────────────────
const groqTools = [
  {
    type: 'function',
    function: {
      name: 'search_food',
      description: 'Cari data nutrisi makanan di database lokal. Gunakan tool ini SEBELUM log_meal untuk mendapatkan data kalori yang akurat.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Nama makanan yang dicari, misal "nasi goreng", "ayam bakar"' }
        },
        required: ['query']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'log_meal',
      description: 'Catat makanan yang dimakan user ke database. Panggil SETELAH search_food atau setelah estimasi kalori.',
      parameters: {
        type: 'object',
        properties: {
          food_name: { type: 'string', description: 'Nama makanan' },
          portion: { type: 'string', description: 'Ukuran porsi, misal "1 piring"' },
          calories: { type: 'number', description: 'Jumlah kalori (kkal)' },
          protein: { type: 'number', description: 'Protein dalam gram' },
          carbs: { type: 'number', description: 'Karbohidrat dalam gram' },
          fat: { type: 'number', description: 'Lemak dalam gram' },
          meal_time: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snack'], description: 'Waktu makan' }
        },
        required: ['food_name', 'calories']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'calculate_tdee',
      description: 'Hitung kebutuhan kalori harian (TDEE) berdasarkan profil user.',
      parameters: {
        type: 'object',
        properties: {
          age: { type: 'integer', description: 'Umur dalam tahun' },
          gender: { type: 'string', description: 'Jenis kelamin: "laki-laki"/"pria" atau "perempuan"/"wanita"' },
          weight_kg: { type: 'number', description: 'Berat badan dalam kg' },
          height_cm: { type: 'number', description: 'Tinggi badan dalam cm' },
          activity_level: { type: 'string', description: 'Level aktivitas: "jarang olahraga", "1-2x seminggu", "3-5x seminggu", "6-7x seminggu", "atlet/sangat aktif"' }
        },
        required: ['age', 'gender', 'weight_kg', 'height_cm', 'activity_level']
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'get_daily_summary',
      description: 'Ambil rekap kalori dan nutrisi untuk tanggal tertentu.',
      parameters: {
        type: 'object',
        properties: {
          date: { type: 'string', description: 'Tanggal format YYYY-MM-DD. Kosongkan untuk hari ini.' }
        }
      }
    }
  },
  {
    type: 'function',
    function: {
      name: 'update_profile',
      description: 'Update data profil user seperti berat badan, tinggi, nama, dll.',
      parameters: {
        type: 'object',
        properties: {
          field: { type: 'string', description: 'Field: "nama", "berat"/"bb", "tinggi"/"tb", "umur", "gender", "aktivitas", "goal", "target_kalori"' },
          value: { type: 'string', description: 'Nilai baru' }
        },
        required: ['field', 'value']
      }
    }
  }
];

/**
 * Panggil Groq sebagai fallback — dengan prompt-based tool calling.
 * Karena groq/compound-mini tidak support API tool calling,
 * kita gunakan prompt engineering: model diminta output JSON jika perlu tool.
 */
async function callGroq(userMessage, phoneNumber) {
  const groq = getGroqClient();
  if (!groq) throw new Error('Groq client tidak tersedia');

  console.log('🔄 Fallback ke Groq API...');

  const toolInstructions = `
## Tool Calling (WAJIB diikuti)
Kamu punya akses ke tools berikut. Jika user meminta sesuatu yang memerlukan tool, KAMU HARUS merespons HANYA dengan JSON (tanpa teks lain):

1. calculate_tdee - Hitung kebutuhan kalori harian
   Format: {"tool":"calculate_tdee","args":{"age":22,"gender":"pria","weight_kg":67,"height_cm":173,"activity_level":"6-7x seminggu"}}

2. search_food - Cari nutrisi makanan
   Format: {"tool":"search_food","args":{"query":"nasi goreng"}}

3. log_meal - Catat makanan yang dimakan
   Format: {"tool":"log_meal","args":{"food_name":"Nasi Goreng","portion":"1 piring","calories":550,"protein":15,"carbs":70,"fat":20,"meal_time":"lunch"}}

4. get_daily_summary - Rekap kalori hari ini
   Format: {"tool":"get_daily_summary","args":{"date":null}}

5. update_profile - Update profil user
   Format: {"tool":"update_profile","args":{"field":"berat","value":"67"}}

ATURAN:
- Jika perlu memanggil tool, respons HANYA JSON, tanpa teks apapun sebelum/sesudahnya
- activity_level harus salah satu dari: "jarang olahraga", "1-2x seminggu", "3-5x seminggu", "6-7x seminggu", "atlet/sangat aktif"
- Jika TIDAK perlu tool, jawab langsung dengan teks biasa (casual, singkat, WhatsApp-friendly)`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT + '\n' + toolInstructions },
    { role: 'user', content: userMessage }
  ];

  let maxLoops = 3;

  while (maxLoops > 0) {
    maxLoops--;

    const completion = await groq.chat.completions.create({
      model: config.groqModel || 'groq/compound-mini',
      messages,
      temperature: 0.5,
      max_tokens: 1024,
    });

    let rawText = completion.choices[0]?.message?.content || '';
    let cleaned = stripThinkingTags(rawText);
    console.log('📝 Groq response (first 300 chars):', cleaned.substring(0, 300));

    // Cek apakah respons berisi JSON tool call
    const toolCall = parseToolCall(cleaned);

    if (toolCall) {
      // Eksekusi tool
      const result = executeTool(toolCall.tool, toolCall.args, phoneNumber);
      console.log(`✅ [Groq] Tool ${toolCall.tool}:`, JSON.stringify(result).substring(0, 200));

      // Tambah ke messages dan minta Groq merangkum hasilnya
      messages.push({ role: 'assistant', content: cleaned });
      messages.push({
        role: 'user',
        content: `Tool "${toolCall.tool}" menghasilkan:\n${JSON.stringify(result, null, 2)}\n\nTolong rangkum hasil ini untuk user dengan bahasa casual dan singkat. Jangan panggil tool lagi.`
      });

      // Lanjut loop untuk mendapatkan respons teks final
      continue;
    }

    // Bukan tool call → ini respons teks final
    return cleaned || 'Maaf, gw lagi ada gangguan teknis. Coba kirim ulang ya! 🙏';
  }

  return 'Maaf, proses terlalu panjang. Coba kirim ulang ya! 🙏';
}

/**
 * Parse respons Groq untuk mendeteksi tool call JSON.
 * Return { tool, args } jika ditemukan, null jika bukan tool call.
 */
function parseToolCall(text) {
  if (!text) return null;

  try {
    // Coba parse seluruh teks sebagai JSON
    const trimmed = text.trim();
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const parsed = JSON.parse(trimmed);
      if (parsed.tool && typeof parsed.tool === 'string') {
        return { tool: parsed.tool, args: parsed.args || {} };
      }
    }
  } catch {}

  // Coba ekstrak JSON dari dalam teks (misal ada teks sebelum/sesudah)
  try {
    const jsonMatch = text.match(/\{[\s\S]*"tool"\s*:\s*"[^"]+"/);
    if (jsonMatch) {
      // Cari closing brace yang cocok
      const startIdx = text.indexOf(jsonMatch[0]);
      let braceCount = 0;
      let endIdx = startIdx;
      for (let i = startIdx; i < text.length; i++) {
        if (text[i] === '{') braceCount++;
        if (text[i] === '}') braceCount--;
        if (braceCount === 0) { endIdx = i + 1; break; }
      }
      const jsonStr = text.substring(startIdx, endIdx);
      const parsed = JSON.parse(jsonStr);
      if (parsed.tool) return { tool: parsed.tool, args: parsed.args || {} };
    }
  } catch {}

  return null;
}

// ─── Main: Process Message ────────────────────────────────────────────────────
/**
 * Proses pesan dari user.
 * Alur: Gemini (utama) → jika 429, fallback ke Groq (cadangan).
 */
async function processMessage(phoneNumber, userMessage) {
  const history = getConversationHistory(phoneNumber);

  // Tambah pesan user ke history
  history.push({
    role: 'user',
    parts: [{ text: userMessage }]
  });

  // Trim jika melebihi MAX_HISTORY (hapus pasangan terlama: 2 entry = 1 turn)
  while (history.length > MAX_HISTORY) {
    history.splice(0, 2);
  }

  // ── Coba Gemini (utama) ───────────────────────────────────────────────────
  try {
    const contents = [...history];
    let maxLoops = 5;
    let response = await callGemini(contents);

    // Agentic loop: proses tool calls jika ada
    while (response.functionCalls?.length > 0 && maxLoops > 0) {
      maxLoops--;

      const candidateContent = response.candidates?.[0]?.content;
      if (candidateContent) {
        contents.push(candidateContent);
        history.push(candidateContent);
      }

      const functionResponseParts = [];
      for (const call of response.functionCalls) {
        const result = executeTool(call.name, call.args, phoneNumber);
        console.log(`✅ Tool ${call.name}:`, JSON.stringify(result).substring(0, 200));

        functionResponseParts.push({
          functionResponse: {
            name: call.name,
            response: { result }
          }
        });
      }

      const toolMessage = { role: 'user', parts: functionResponseParts };
      contents.push(toolMessage);
      history.push(toolMessage);

      response = await callGemini(contents);
    }

    const finalText = response.text;
    if (finalText) {
      history.push({ role: 'model', parts: [{ text: finalText }] });
    }

    return finalText || 'Maaf, gw belum bisa memahami pesan itu. Coba ulangi lagi ya! 🙏';

  } catch (geminiError) {
    console.error('❌ Gemini error:', geminiError.message);

    // ── Fallback ke Groq jika Gemini kena rate limit ──────────────────────
    if (isRateLimitError(geminiError) && config.groqApiKey) {
      console.log('🔄 Gemini kena limit 429, switching ke Groq...');
      try {
        const groqText = await callGroq(userMessage, phoneNumber);

        // Simpan respons Groq ke history (hanya teks tanpa tool call)
        history.push({ role: 'model', parts: [{ text: groqText }] });

        return groqText;
      } catch (groqError) {
        console.error('❌ Groq fallback juga gagal:', groqError.message);
        return '⚠️ Kedua AI (Gemini & Groq) sedang sibuk. Tunggu sebentar lalu coba lagi ya. 🙏';
      }
    }

    // Pesan error yang informatif
    if (isRateLimitError(geminiError)) {
      return config.groqApiKey
        ? '⚠️ Kuota Gemini habis dan Groq fallback gagal. Coba lagi dalam beberapa menit ya!'
        : '⚠️ Kuota Gemini sementara habis. Tambahkan GROQ_API_KEY di .env untuk fallback otomatis, atau tunggu sebentar lagi. 🙏';
    }

    if (geminiError.message?.includes('API_KEY_INVALID') || geminiError.message?.includes('API key')) {
      return '⚠️ GEMINI_API_KEY tidak valid. Cek kembali API key di file .env ya!';
    }

    return `⚠️ Server AI sedang sibuk: ${geminiError.message}. Coba kirim ulang ya! 🙏`;
  }
}

module.exports = { processMessage };
