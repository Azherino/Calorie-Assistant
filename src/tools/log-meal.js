const { getOrCreateUser, insertMealLog, getDailySummary } = require('../database/queries');

/**
 * Catat makanan ke database
 * Auto-create user jika belum ada
 */
function logMeal(phoneNumber, mealData) {
  const user = getOrCreateUser(phoneNumber);

  const logEntry = insertMealLog(user.id, {
    food_name: mealData.food_name,
    portion: mealData.portion || '1 porsi',
    calories: mealData.calories || 0,
    protein: mealData.protein || 0,
    carbs: mealData.carbs || 0,
    fat: mealData.fat || 0,
    sugar: mealData.sugar || 0,
    meal_time: mealData.meal_time || null
  });

  // Ambil summary hari ini untuk info sisa budget
  const summary = getDailySummary(user.id);
  const targetCalories = user.target_calories || 2000; // default 2000 kalau belum diset
  const targetProtein = user.target_protein || Math.round((user.weight_kg || 65) * 1.6);
  const targetSugar = user.target_sugar || 50; // default rekomendasi Kemenkes/WHO: max 50g/hari
  const remainingCalories = targetCalories - summary.total_calories;
  const remainingProtein = targetProtein - summary.total_protein;
  const remainingSugar = targetSugar - summary.total_sugar;

  return {
    success: true,
    logged_item: {
      food_name: logEntry.food_name,
      portion: logEntry.portion,
      calories: Math.round(logEntry.calories),
      protein: Math.round(logEntry.protein),
      carbs: Math.round(logEntry.carbs),
      fat: Math.round(logEntry.fat),
      sugar: Math.round(logEntry.sugar || 0),
      meal_time: logEntry.meal_time
    },
    daily_summary: {
      total_calories: Math.round(summary.total_calories),
      target_calories: targetCalories,
      remaining_calories: Math.round(remainingCalories),
      total_protein: Math.round(summary.total_protein),
      target_protein: targetProtein,
      remaining_protein: Math.max(0, Math.round(remainingProtein)),
      total_sugar: Math.round(summary.total_sugar),
      target_sugar: targetSugar,
      remaining_sugar: Math.max(0, Math.round(remainingSugar)),
      sugar_warning: summary.total_sugar >= targetSugar ? 'Batas gula harian sudah tercapai/terlewati!' : (summary.total_sugar >= targetSugar * 0.8 ? 'Mendekati batas maksimal gula harian!' : null),
      total_carbs: Math.round(summary.total_carbs),
      total_fat: Math.round(summary.total_fat),
      total_meals: summary.total_meals
    }
  };
}

module.exports = { logMeal };
