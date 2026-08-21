# Rencana Project: Asisten Kalori Pribadi via WhatsApp Bot (Tahap 1 - MVP)

## 1. Tujuan
Membangun asisten AI pribadi yang bisa diajak ngobrol via WhatsApp untuk:
- Mencatat makanan yang dikonsumsi (input teks bebas)
- Menghitung estimasi kalori & makro (protein/karbo/lemak)
- Menghitung kebutuhan kalori harian (BMR/TDEE) berdasarkan profil user
- Memberi rekap harian/mingguan

---

## 2. Arsitektur Tahap 1

```
User (WhatsApp)
      │
      ▼
WhatsApp Bot Gateway (webhook)
      │
      ▼
Backend Server (Node.js / Python)
      │
      ├──► LLM Agent (Claude API + Tool Calling)
      │         │
      │         ├──► Tool: search_food()
      │         ├──► Tool: log_meal()
      │         ├──► Tool: calculate_tdee()
      │         └──► Tool: get_daily_summary()
      │
      ├──► Database Nutrisi (API eksternal / lokal)
      │
      └──► Database User (profile + log makan)
                (SQLite / PostgreSQL)
```

---

## 3. Komponen yang Dibutuhkan

### 3.1 WhatsApp Gateway
Pilihan platform untuk koneksi ke WhatsApp:

| Opsi | Kelebihan | Kekurangan |
|---|---|---|
| **WhatsApp Cloud API (Meta resmi)** | Resmi, stabil, gratis untuk volume kecil | Perlu verifikasi bisnis untuk fitur penuh, agak ribet setup awal |
| **Baileys (library open-source)** | Gratis, gampang, cocok untuk personal use, nggak perlu approval Meta | Nggak resmi, bisa kena banned kalau melanggar ToS WhatsApp, kurang stabil jangka panjang |
| **Twilio WhatsApp API** | Gampang integrasi, dokumentasi bagus | Berbayar per pesan |

**Rekomendasi untuk personal project:** mulai dengan **Baileys** (Node.js) karena gratis dan simpel untuk 1 nomor pribadi. Kalau nanti mau lebih serius/banyak user, baru pindah ke WhatsApp Cloud API resmi.

### 3.2 Backend Server
- **Node.js (Express)** — cocok kalau pakai Baileys (sama-sama JS ecosystem)
- Bertugas: terima pesan dari WhatsApp → kirim ke LLM Agent → proses hasil tool call → kirim balasan ke WhatsApp

### 3.3 LLM Agent (Otak)
- **Claude API** dengan tool calling
- System prompt berisi persona asisten + instruksi cara menangani logging makanan
- Tools yang didefinisikan:

| Tool | Fungsi |
|---|---|
| `search_food(query)` | Cari data nutrisi makanan berdasarkan nama |
| `log_meal(food_name, portion, calories, meal_time)` | Simpan catatan makan ke database |
| `calculate_tdee(age, gender, weight, height, activity_level)` | Hitung kebutuhan kalori harian |
| `get_daily_summary(date)` | Ambil rekap kalori & makro hari itu |
| `update_profile(field, value)` | Update data profil user (berat badan terbaru, dll) |

### 3.4 Database Nutrisi
- **Tahap awal:** kompilasi manual/scraping database makanan Indonesia umum (nasi, lauk, jajanan) dalam bentuk tabel sederhana (JSON/CSV)
- **Fallback:** kalau makanan nggak ketemu di database, minta LLM estimasi kalori berdasarkan pengetahuan umum (dengan disclaimer "estimasi")
- **Opsional:** API eksternal seperti Nutritionix atau USDA FoodData Central untuk makanan kemasan/internasional

### 3.5 Database User
- **SQLite** — paling simpel untuk personal use (1 file, nggak perlu server database terpisah)
- Skema kasar:

```
users
├── id, name, age, gender, height, weight, activity_level, goal, target_calories

meal_logs
├── id, user_id, food_name, portion, calories, protein, carbs, fat, meal_time, logged_at
```

---

## 4. Alur Kerja (Flow) Contoh

1. User kirim WA: *"gw makan nasi padang ayam goreng tadi siang"*
2. Webhook backend terima pesan → forward ke Claude API
3. Claude memanggil tool `search_food("nasi padang ayam goreng")`
4. Backend cari di database lokal → kalau ketemu, kembalikan data kalori
5. Claude memanggil tool `log_meal(...)` untuk simpan ke database
6. Claude balas ke user: *"Oke, gw catat nasi padang ayam goreng tadi siang (~750 kkal). Sisa budget kalori hari ini: 1.200 kkal."*
7. Backend kirim balasan tersebut lewat WhatsApp Gateway

---

## 5. Tech Stack Ringkasan (Tahap 1)

| Layer | Teknologi |
|---|---|
| WhatsApp Gateway | Baileys (Node.js) |
| Backend | Node.js + Express |
| LLM & Tool Calling | Claude API |
| Database Nutrisi | JSON/CSV lokal + fallback estimasi LLM |
| Database User | SQLite |
| Hosting | VPS kecil / Railway / Render (untuk keep bot online 24/7) |

---

## 6. Langkah Selanjutnya
- [ ] Setup project Node.js + install Baileys
- [ ] Setup koneksi WhatsApp (scan QR code)
- [ ] Buat schema database SQLite (users, meal_logs)
- [ ] Kumpulkan/susun database nutrisi makanan Indonesia dasar
- [ ] Integrasi Claude API dengan tool calling
- [ ] Implementasi tool: `search_food`, `log_meal`, `calculate_tdee`, `get_daily_summary`
- [ ] Testing end-to-end via WhatsApp pribadi
- [ ] (Opsional) Tambah reminder harian & laporan mingguan
