const CONVERSIONS = {
  // Masse → kg (prixUnitaire stocké en €/kg)
  'kg': 1,
  'g': 0.001,
  'mg': 0.000001,
  // Volume → L (prixUnitaire stocké en €/L)
  'L': 1,
  'l': 1,
  'ml': 0.001,
  'cl': 0.01,
  // Cuillères → L (approximations culinaires standard)
  'c.c.': 0.005,
  'c.s.': 0.015,
  'càc': 0.005,
  'càs': 0.015,
  // Pièce/unité (prixUnitaire stocké en €/pièce)
  'pièce': 1,
  'piece': 1,
  'unité': 1,
  'unite': 1,
  'u': 1,
  // Autres unités courantes
  'botte': 1,
  'bouquet': 1,
  'sachet': 1,
  'boîte': 1,
  'feuille': 0.001,
  'pincée': 0.0005,
  'gousse': 0.005,
  'tranche': 0.03,
};

export function convertirEnUniteBase(quantite, unite) {
  return quantite * (CONVERSIONS[unite] || 1);
}

export function calculerCoutIngredient(quantite, uniteRecette, prixUnitaire) {
  return convertirEnUniteBase(quantite, uniteRecette) * prixUnitaire;
}
