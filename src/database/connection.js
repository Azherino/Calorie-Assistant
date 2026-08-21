const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', '..');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'calorie-bot.db');

let db;

function getDb() {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    console.log('✅ Database connected:', DB_PATH);
  }
  return db;
}

function closeDb() {
  if (db) {
    db.close();
    db = null;
    console.log('📦 Database closed');
  }
}

module.exports = { getDb, closeDb };
