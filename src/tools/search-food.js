const foods = require('../data/indonesian-foods.json');

/**
 * Cari makanan di database nutrisi lokal
 * Menggunakan fuzzy matching (lowercase + includes)
 */
function searchFood(query) {
  const q = query.toLowerCase().trim();

  // 1. Exact match on name
  const exactMatch = foods.find(f => f.name.toLowerCase() === q);
  if (exactMatch) {
    return { found: true, results: [exactMatch] };
  }

  // 2. Match on aliases
  const aliasMatch = foods.filter(f =>
    f.aliases.some(alias => alias.toLowerCase() === q)
  );
  if (aliasMatch.length > 0) {
    return { found: true, results: aliasMatch };
  }

  // 3. Partial match (includes) on name + aliases
  const partialMatches = foods.filter(f => {
    const nameMatch = f.name.toLowerCase().includes(q) || q.includes(f.name.toLowerCase());
    const aliasMatch = f.aliases.some(
      alias => alias.toLowerCase().includes(q) || q.includes(alias.toLowerCase())
    );
    return nameMatch || aliasMatch;
  });

  if (partialMatches.length > 0) {
    return { found: true, results: partialMatches.slice(0, 5) };
  }

  // 4. Word-level matching (split query into words, match any)
  const words = q.split(/\s+/).filter(w => w.length > 2);
  const wordMatches = foods.filter(f => {
    const allText = [f.name, ...f.aliases].join(' ').toLowerCase();
    return words.some(word => allText.includes(word));
  });

  if (wordMatches.length > 0) {
    return { found: true, results: wordMatches.slice(0, 5) };
  }

  return {
    found: false,
    results: [],
    message: `Makanan "${query}" tidak ditemukan di database. Silakan estimasi berdasarkan pengetahuan umum.`
  };
}

module.exports = { searchFood };
