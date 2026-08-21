const { Type } = require('@google/genai');

/**
 * Tool definitions untuk Google Gemini API Tool Calling
 */
const geminiTools = [
  {
    functionDeclarations: [
      {
        name: 'search_food',
        description: 'Cari data nutrisi makanan di database lokal. Gunakan tool ini SEBELUM log_meal untuk mendapatkan data kalori yang akurat. Kalau hasilnya not found, kamu bisa estimasi sendiri.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            query: {
              type: Type.STRING,
              description: 'Nama makanan yang dicari, misal "nasi goreng", "ayam bakar", "indomie"'
            }
          },
          required: ['query']
        }
      },
      {
        name: 'log_meal',
        description: 'Catat makanan yang dimakan user ke database. Panggil SETELAH search_food atau setelah estimasi kalori. Bisa dipanggil berkali-kali kalau user makan beberapa item.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            food_name: {
              type: Type.STRING,
              description: 'Nama makanan yang dicatat'
            },
            portion: {
              type: Type.STRING,
              description: 'Ukuran porsi, misal "1 piring", "2 potong", "setengah porsi"'
            },
            calories: {
              type: Type.NUMBER,
              description: 'Jumlah kalori (kkal)'
            },
            protein: {
              type: Type.NUMBER,
              description: 'Protein dalam gram'
            },
            carbs: {
              type: Type.NUMBER,
              description: 'Karbohidrat dalam gram'
            },
            fat: {
              type: Type.NUMBER,
              description: 'Lemak dalam gram'
            },
            sugar: {
              type: Type.NUMBER,
              description: 'Gula dalam gram (sugar), terutama untuk makanan/minuman manis'
            },
            meal_time: {
              type: Type.STRING,
              enum: ['breakfast', 'lunch', 'dinner', 'snack'],
              description: 'Waktu makan: breakfast (pagi), lunch (siang), dinner (malam), snack (cemilan)'
            }
          },
          required: ['food_name', 'calories']
        }
      },
      {
        name: 'calculate_tdee',
        description: 'Hitung kebutuhan kalori harian (TDEE) dan target protein & batas konsumsi gula harian.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            age: {
              type: Type.INTEGER,
              description: 'Umur user dalam tahun'
            },
            gender: {
              type: Type.STRING,
              description: 'Jenis kelamin: "laki-laki"/"cowok"/"pria" atau "perempuan"/"cewek"/"wanita"'
            },
            weight_kg: {
              type: Type.NUMBER,
              description: 'Berat badan dalam kilogram'
            },
            height_cm: {
              type: Type.NUMBER,
              description: 'Tinggi badan dalam centimeter'
            },
            activity_level: {
              type: Type.STRING,
              description: 'Level aktivitas: "jarang olahraga", "1-2x seminggu", "3-5x seminggu", "6-7x seminggu", "atlet/sangat aktif"'
            }
          },
          required: ['age', 'gender', 'weight_kg', 'height_cm', 'activity_level']
        }
      },
      {
        name: 'get_daily_summary',
        description: 'Ambil rekap kalori, protein, gula, dan nutrisi untuk tanggal tertentu. Kalau user tidak sebut tanggal, gunakan hari ini.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            date: {
              type: Type.STRING,
              description: 'Tanggal dalam format YYYY-MM-DD. Kosongkan atau null untuk hari ini.'
            }
          }
        }
      },
      {
        name: 'update_profile',
        description: 'Update data profil user seperti berat badan terbaru, tinggi, nama, target_protein, target_sugar, dll.',
        parameters: {
          type: Type.OBJECT,
          properties: {
            field: {
              type: Type.STRING,
              description: 'Field yang mau diupdate: "nama", "berat"/"bb", "tinggi"/"tb", "umur", "gender", "aktivitas", "goal", "target_kalori", "target_protein", "target_sugar"'
            },
            value: {
              type: Type.STRING,
              description: 'Nilai baru untuk field tersebut'
            }
          },
          required: ['field', 'value']
        }
      }
    ]
  }
];

module.exports = geminiTools;
