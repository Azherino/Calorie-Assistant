const { getOrCreateUser, getDailySummary } = require('../database/queries');

/**
 * Ambil rekap kalori & makro untuk tanggal tertentu
 */
function getDailySummaryTool(phoneNumber, date = null) {
  const user = getOrCreateUser(phoneNumber);
  const summary = getDailySummary(user.id, date);
  const targetCalories = user.target_calories || 2000;
  const targetProtein = user.target_protein || Math.round((user.weight_kg || 65) * 1.6);
  const remainingCalories = targetCalories - summary.total_calories;
  const remainingProtein = targetProtein - summary.total_protein;

  // Format daftar makanan
  const mealList = summary.meals.map((meal, i) => ({
    no: i + 1,
    food: meal.food_name,
    portion: meal.portion,
    calories: Math.round(meal.calories),
    protein: Math.round(meal.protein),
    carbs: Math.round(meal.carbs),
    fat: Math.round(meal.fat),
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
    total_carbs: Math.round(summary.total_carbs),
    total_fat: Math.round(summary.total_fat),
    total_meals: summary.total_meals,
    meals: mealList,
    status: remainingCalories > 0 ? 'under_budget' : 'over_budget'
  };
}

module.exports = { getDailySummaryTool };
