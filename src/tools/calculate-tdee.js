const { getOrCreateUser, updateUserMultiple } = require('../database/queries');

/**
 * Hitung BMR menggunakan Mifflin-St Jeor Equation
 * Laki-laki: BMR = 10 × berat(kg) + 6.25 × tinggi(cm) − 5 × umur − 161 + 166
 *            BMR = 10 × berat(kg) + 6.25 × tinggi(cm) − 5 × umur + 5
 * Perempuan: BMR = 10 × berat(kg) + 6.25 × tinggi(cm) − 5 × umur − 161
 */
function calculateTdee(phoneNumber, params) {
  const { age, gender, weight_kg, height_cm, activity_level } = params;

  // Hitung BMR (Mifflin-St Jeor)
  let bmr;
  const genderLower = gender.toLowerCase();
  if (genderLower === 'male' || genderLower === 'laki-laki' || genderLower === 'cowok' || genderLower === 'pria') {
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) + 5;
  } else {
    bmr = (10 * weight_kg) + (6.25 * height_cm) - (5 * age) - 161;
  }

  // Activity multiplier
  const activityMultipliers = {
    'sedentary': { multiplier: 1.2, description: 'Jarang olahraga / kerja duduk' },
    'light': { multiplier: 1.375, description: 'Olahraga ringan 1-3x/minggu' },
    'moderate': { multiplier: 1.55, description: 'Olahraga sedang 3-5x/minggu' },
    'active': { multiplier: 1.725, description: 'Olahraga berat 6-7x/minggu' },
    'very_active': { multiplier: 1.9, description: 'Olahraga sangat berat / atlet' }
  };

  // Normalize activity level input
  let normalizedActivity = 'moderate'; // default
  const actLower = activity_level.toLowerCase();
  if (actLower.includes('jarang') || actLower.includes('sedentary') || actLower.includes('tidak') || actLower.includes('nggak')) {
    normalizedActivity = 'sedentary';
  } else if (actLower.includes('ringan') || actLower.includes('light') || actLower.includes('1') || actLower.includes('2')) {
    normalizedActivity = 'light';
  } else if (actLower.includes('sedang') || actLower.includes('moderate') || actLower.includes('3') || actLower.includes('4') || actLower.includes('5')) {
    normalizedActivity = 'moderate';
  } else if (actLower.includes('berat') || actLower.includes('active') || actLower.includes('6') || actLower.includes('7') || actLower.includes('tiap hari')) {
    normalizedActivity = 'active';
  } else if (actLower.includes('sangat') || actLower.includes('very') || actLower.includes('atlet')) {
    normalizedActivity = 'very_active';
  }

  const activityInfo = activityMultipliers[normalizedActivity];
  const tdee = Math.round(bmr * activityInfo.multiplier);

  // Kebutuhan Protein Harian:
  // Sedentary: 1.2 - 1.4 g/kg
  // Light: 1.4 - 1.6 g/kg
  // Moderate: 1.6 - 1.8 g/kg
  // Active / Very Active (Gym/Strength + Lari/Olahraga 5-6x): 1.8 - 2.2 g/kg (optimal ~2.0 g/kg)
  let proteinMultiplier = 1.6;
  if (normalizedActivity === 'sedentary') proteinMultiplier = 1.3;
  else if (normalizedActivity === 'light') proteinMultiplier = 1.5;
  else if (normalizedActivity === 'moderate') proteinMultiplier = 1.7;
  else if (normalizedActivity === 'active' || normalizedActivity === 'very_active') proteinMultiplier = 2.0;

  const targetProtein = Math.round(weight_kg * proteinMultiplier);
  const minProtein = Math.round(weight_kg * (proteinMultiplier - 0.2));
  const maxProtein = Math.round(weight_kg * (proteinMultiplier + 0.2));

  // Simpan ke profil user
  const user = getOrCreateUser(phoneNumber);
  updateUserMultiple(phoneNumber, {
    age,
    gender: genderLower,
    weight_kg,
    height_cm,
    activity_level: normalizedActivity,
    target_calories: tdee,
    target_protein: targetProtein
  });

  return {
    bmr: Math.round(bmr),
    tdee: tdee,
    activity_level: normalizedActivity,
    activity_description: activityInfo.description,
    protein_target: {
      daily_grams: targetProtein,
      range_grams: `${minProtein} - ${maxProtein} gram/hari`,
      multiplier_info: `${proteinMultiplier}g per kg berat badan (BB: ${weight_kg} kg)`
    },
    sugar_recommendation: {
      max_grams: 50,
      ideal_grams: 30,
      description: 'Batas maksimal Kemenkes/WHO 50 gram/hari (~4 sendok makan), ideal < 30 gram/hari untuk kesehatan optimal'
    },
    recommendations: {
      maintain: tdee,
      mild_loss: tdee - 250,
      loss: tdee - 500,
      mild_gain: tdee + 250,
      gain: tdee + 500
    },
    profile: {
      age,
      gender: genderLower,
      weight_kg,
      height_cm,
      activity_level: normalizedActivity,
      target_protein_grams: targetProtein,
      target_sugar_grams: 50
    }
  };
}

module.exports = { calculateTdee };
