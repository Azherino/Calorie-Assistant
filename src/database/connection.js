const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', '..', 'calorie-bot.db');

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
