const { getDb } = require('./connection');

// ==================== USER QUERIES ====================

function findUserByPhone(phoneNumber) {
  const db = getDb();
  return db.prepare('SELECT * FROM users WHERE phone_number = ?').get(phoneNumber);
}

function createUser(phoneNumber, name = null) {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO users (phone_number, name) VALUES (?, ?)'
  ).run(phoneNumber, name);
  return findUserByPhone(phoneNumber);
}

function getOrCreateUser(phoneNumber) {
  let user = findUserByPhone(phoneNumber);
  if (!user) {
    user = createUser(phoneNumber);
  }
  return user;
}

function updateUser(phoneNumber, field, value) {
  const db = getDb();
  const allowedFields = [
    'name', 'age', 'gender', 'height_cm', 'weight_kg',
    'activity_level', 'goal', 'target_calories', 'target_protein', 'target_sugar'
  ];

  if (!allowedFields.includes(field)) {
    throw new Error(`Field "${field}" tidak diizinkan untuk diupdate. Field yang valid: ${allowedFields.join(', ')}`);
  }

  db.prepare(
    `UPDATE users SET ${field} = ?, updated_at = CURRENT_TIMESTAMP WHERE phone_number = ?`
  ).run(value, phoneNumber);

  return findUserByPhone(phoneNumber);
}

function updateUserMultiple(phoneNumber, updates) {
  const db = getDb();
  const allowedFields = [
    'name', 'age', 'gender', 'height_cm', 'weight_kg',
    'activity_level', 'goal', 'target_calories', 'target_protein', 'target_sugar'
  ];

  const setClauses = [];
  const values = [];

  for (const [field, value] of Object.entries(updates)) {
    if (allowedFields.includes(field)) {
      setClauses.push(`${field} = ?`);
      values.push(value);
    }
  }

  if (setClauses.length === 0) return findUserByPhone(phoneNumber);

  setClauses.push('updated_at = CURRENT_TIMESTAMP');
  values.push(phoneNumber);

  db.prepare(
    `UPDATE users SET ${setClauses.join(', ')} WHERE phone_number = ?`
  ).run(...values);

  return findUserByPhone(phoneNumber);
}

// ==================== MEAL LOG QUERIES ====================

function insertMealLog(userId, mealData) {
  const db = getDb();
  const {
    food_name,
    portion = '1 porsi',
    calories = 0,
    protein = 0,
    carbs = 0,
    fat = 0,
    sugar = 0,
    meal_time = null
  } = mealData;

  const result = db.prepare(`
    INSERT INTO meal_logs (user_id, food_name, portion, calories, protein, carbs, fat, sugar, meal_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(userId, food_name, portion, calories, protein, carbs, fat, sugar, meal_time);

  return { id: result.lastInsertRowid, ...mealData };
}

function getMealLogsByDate(userId, date = null) {
  const db = getDb();
  const targetDate = date || new Date().toISOString().split('T')[0];

  return db.prepare(`
    SELECT * FROM meal_logs 
    WHERE user_id = ? AND DATE(logged_at) = DATE(?)
    ORDER BY logged_at ASC
  `).all(userId, targetDate);
}

function getDailySummary(userId, date = null) {
  const db = getDb();
  const targetDate = date || new Date().toISOString().split('T')[0];

  const summary = db.prepare(`
    SELECT 
      COUNT(*) as total_meals,
      COALESCE(SUM(calories), 0) as total_calories,
      COALESCE(SUM(protein), 0) as total_protein,
      COALESCE(SUM(carbs), 0) as total_carbs,
      COALESCE(SUM(fat), 0) as total_fat,
      COALESCE(SUM(sugar), 0) as total_sugar
    FROM meal_logs 
    WHERE user_id = ? AND DATE(logged_at) = DATE(?)
  `).get(userId, targetDate);

  const meals = getMealLogsByDate(userId, targetDate);

  return { ...summary, meals, date: targetDate };
}

module.exports = {
  findUserByPhone,
  createUser,
  getOrCreateUser,
  updateUser,
  updateUserMultiple,
  insertMealLog,
  getMealLogsByDate,
  getDailySummary
};
