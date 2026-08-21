const { getOrCreateUser, getDailySummary } = require('../database/queries');

/**
 * Ambil rekap kalori & makro untuk tanggal tertentu
 */
function getDailySummaryTool(phoneNumber, date = null) {
  const user = getOrCreateUser(phoneNumber);
  const summary = getDailySummary(user.id, date);
  const targetCalories = user.target_calories || 2000;
  const targetProtein = user.target_protein || Math.round((user.weight_kg || 65) * 1.6);
  const targetSugar = user.target_sugar || 50; // default 50g per day
  const remainingCalories = targetCalories - summary.total_calories;
  const remainingProtein = targetProtein - summary.total_protein;
  const remainingSugar = targetSugar - summary.total_sugar;

  // Format daftar makanan
  const mealList = summary.meals.map((meal, i) => ({
    no: i + 1,
    food: meal.food_name,
    portion: meal.portion,
    calories: Math.round(meal.calories),
    protein: Math.round(meal.protein),
    carbs: Math.round(meal.carbs),
    fat: Math.round(meal.fat),
    sugar: Math.round(meal.sugar || 0),
    time: meal.meal_time || 'tidak dicatat',
    logged_at: meal.logged_at
  }));

  return {
    date: summary.date,
    target_calories: targetCalories,
    total_calories: Math.round(summary.total_calories),
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
    total_meals: summary.total_meals,
    meals: mealList,
    status: remainingCalories > 0 ? 'under_budget' : 'over_budget'
  };
}

module.exports = { getDailySummaryTool };
