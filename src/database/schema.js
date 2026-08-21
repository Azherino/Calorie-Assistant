const { getDb } = require('./connection');

function initializeSchema() {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone_number TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT NULL,
      age INTEGER DEFAULT NULL,
      gender TEXT DEFAULT NULL,
      height_cm REAL DEFAULT NULL,
      weight_kg REAL DEFAULT NULL,
      activity_level TEXT DEFAULT NULL,
      goal TEXT DEFAULT NULL,
      target_calories INTEGER DEFAULT NULL,
      target_protein INTEGER DEFAULT NULL,
      target_sugar REAL DEFAULT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS meal_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      food_name TEXT NOT NULL,
      portion TEXT DEFAULT '1 porsi',
      calories REAL DEFAULT 0,
      protein REAL DEFAULT 0,
      carbs REAL DEFAULT 0,
      fat REAL DEFAULT 0,
      sugar REAL DEFAULT 0,
      meal_time TEXT DEFAULT NULL,
      logged_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE INDEX IF NOT EXISTS idx_meal_logs_user_date 
      ON meal_logs(user_id, logged_at);
  `);

  // Migrasi kolom jika tabel lama sudah ada
  try {
    db.exec(`ALTER TABLE users ADD COLUMN target_protein INTEGER DEFAULT NULL`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE users ADD COLUMN target_sugar REAL DEFAULT NULL`);
  } catch (_) {}
  try {
    db.exec(`ALTER TABLE meal_logs ADD COLUMN sugar REAL DEFAULT 0`);
  } catch (_) {}

  console.log('✅ Database schema initialized');
}

module.exports = { initializeSchema };
