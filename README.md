# 🍽️ Kalo — Personal Calorie & Nutrition Assistant (WhatsApp Bot)

Asisten nutrisi dan penghitung kalori pribadi berbasis **WhatsApp Bot**, didukung oleh **Google Gemini AI** dengan fallback otomatis ke **Groq (Open-Source LLM)** serta database lokal SQLite.

---

## ✨ Fitur Utama

- 🥗 **Catat Makanan Otomatis**: Cukup ketik makanan yang Anda makan dalam bahasa santai / natural sehari-hari.
- 📊 **Rincian Nutrisi Per Item**: Menampilkan porsi, estimasi kalori, dan gram protein untuk setiap item makanan.
- 🏋️‍♂️ **Kalkulator TDEE & Target Protein**: Menghitung kebutuhan kalori harian (BMR & TDEE) serta target protein harian berdasarkan berat badan dan intensitas latihan.
- 📈 **Tracking Progres Harian**: Memantau akumulasi kalori dan protein harian vs sisa target harian Anda.
- 🔄 **Dual Provider AI (Anti-Downtime)**:
  - Utama: **Google Gemini API** (`gemini-3.6-flash`)
  - Fallback Otomatis: **Groq API** jika kuota Gemini habis (Error 429)
- 🔒 **Privasi & Keamanan**: Hanya merespons nomor yang diizinkan (`ALLOWED_NUMBER`) atau ruang chat *Message Yourself*.

---

## 🛠️ Tech Stack

- **Runtime**: Node.js
- **WhatsApp Engine**: `@whiskeysockets/baileys` (Multi-Device)
- **AI Models**: Google Gemini 3.6 Flash / Groq (Compound & Open-Source LLMs)
- **Database**: SQLite (`better-sqlite3`)

---

## 🚀 Panduan Instalasi & Menjalankan

### 1. Clone Repository
```bash
git clone <URL_REPOSITORY_ANDA>
cd Calorie-Assistant
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup Environment Variables
Salin file `.env.example` menjadi `.env`:
```bash
cp .env.example .env
```

Lalu sesuaikan isinya:
```env
# Google Gemini API (Dapatkan gratis di https://aistudio.google.com/app/apikey)
GEMINI_API_KEY=AIzaSyxxxx
GEMINI_MODEL=gemini-3.6-flash

# Groq API (Fallback gratis di https://console.groq.com)
GROQ_API_KEY=gsk_xxxx
GROQ_MODEL=groq/compound-mini

# Nomor WhatsApp Anda (Format: 628xxxxxxxxxx)
ALLOWED_NUMBER=6282264254228

# Nama Bot
BOT_NAME=Kalo
```

### 4. Jalankan Bot
```bash
npm start
```
Scan QR code yang muncul di terminal menggunakan aplikasi WhatsApp di HP Anda (**Settings → Linked Devices → Link a Device**).

---

## 📂 Struktur Direktori

```
Calorie-Assistant/
├── src/
│   ├── ai/               # Prompt, tool calling, & Gemini/Groq handler
│   ├── database/         # SQLite schema & queries
│   ├── tools/            # Implementasi kalkulator TDEE, log meal, food search
│   ├── whatsapp/         # Baileys client & message router
│   ├── config.js         # Konfigurasi aplikasi & environment
│   └── index.js          # Entry point utama bot
├── package.json
└── README.md
```
