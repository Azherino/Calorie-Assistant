const { getOrCreateUser, updateUser } = require('../database/queries');

/**
 * Update data profil user (berat badan, tinggi, dll)
 */
function updateProfile(phoneNumber, field, value) {
  // Map field names yang user-friendly ke database fields
  const fieldMapping = {
    'nama': 'name',
    'name': 'name',
    'umur': 'age',
    'usia': 'age',
    'age': 'age',
    'gender': 'gender',
    'jenis_kelamin': 'gender',
    'jenis kelamin': 'gender',
    'tinggi': 'height_cm',
    'tinggi_badan': 'height_cm',
    'height': 'height_cm',
    'height_cm': 'height_cm',
    'berat': 'weight_kg',
    'berat_badan': 'weight_kg',
    'weight': 'weight_kg',
    'weight_kg': 'weight_kg',
    'bb': 'weight_kg',
    'tb': 'height_cm',
    'aktivitas': 'activity_level',
    'activity_level': 'activity_level',
    'activity': 'activity_level',
    'goal': 'goal',
    'tujuan': 'goal',
    'target_kalori': 'target_calories',
    'target_calories': 'target_calories',
    'target': 'target_calories',
    'target_protein': 'target_protein',
    'protein': 'target_protein',
    'target protein': 'target_protein',
    'target_sugar': 'target_sugar',
    'target_gula': 'target_sugar',
    'gula': 'target_sugar',
    'sugar': 'target_sugar'
  };

  const dbField = fieldMapping[field.toLowerCase()] || field.toLowerCase();

  try {
    // Auto-create user jika belum ada
    getOrCreateUser(phoneNumber);

    const updatedUser = updateUser(phoneNumber, dbField, value);
    return {
      success: true,
      field: dbField,
      value: value,
      message: `Profil berhasil diupdate: ${dbField} = ${value}`,
      profile: {
        name: updatedUser.name,
        age: updatedUser.age,
        gender: updatedUser.gender,
        height_cm: updatedUser.height_cm,
        weight_kg: updatedUser.weight_kg,
        activity_level: updatedUser.activity_level,
        goal: updatedUser.goal,
        target_calories: updatedUser.target_calories,
        target_protein: updatedUser.target_protein,
        target_sugar: updatedUser.target_sugar
      }
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { updateProfile };
