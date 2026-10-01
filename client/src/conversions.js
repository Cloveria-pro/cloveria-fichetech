const CONVERSIONS = {
  // Masse → kg (prixUnitaire stocké en €/kg)
  'kg': 1,
  'g': 0.001,
  'gr': 0.001,
  'mg': 0.000001,
  // Volume → L (prixUnitaire stocké en €/L)
  'L': 1,
  'l': 1,
  'ml': 0.001,
  'cl': 0.01,
  // Cuillères → L (approximations culinaires standard)
  'c.c': 0.005,
  'c.s': 0.015,
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

// Normalise une unité avant recherche : trim, minuscules, un seul point final supprimé.
// Ne lève jamais d'exception — toute entrée qui n'est pas une chaîne renvoie ''.
function normaliserUnite(unite) {
  if (typeof unite !== 'string') return '';
  let u = unite.trim().toLowerCase();
  if (u.endsWith('.')) u = u.slice(0, -1);
  return u;
}

// Table de recherche construite à partir des clés de CONVERSIONS, elles-mêmes normalisées,
// afin qu'une clé comme 'L' reste trouvable après normalisation (lowercase) sous 'l'.
const CONVERSIONS_NORMALISEES = Object.keys(CONVERSIONS).reduce((acc, cle) => {
  acc[normaliserUnite(cle)] = CONVERSIONS[cle];
  return acc;
}, {});

export function convertirEnUniteBase(quantite, unite) {
  const u = normaliserUnite(unite);
  return (parseFloat(quantite) || 0) * (CONVERSIONS_NORMALISEES[u] || 1);
}

// Indique si une unité (après normalisation) correspond à une clé connue de la table.
export function estUniteConnue(unite) {
  const u = normaliserUnite(unite);
  return u !== '' && Object.prototype.hasOwnProperty.call(CONVERSIONS_NORMALISEES, u);
}

// Unités connues mais dont le facteur est une approximation jamais validée métier
// (voir commentaire "Autres unités courantes" ci-dessus) — à signaler à l'utilisateur.
const UNITES_LEGACY_APPROXIMATIVES = ['tranche', 'botte', 'pincée', 'gousse', 'feuille', 'sachet', 'bouquet', 'boîte'];

// Indique si une unité mérite un signal "à vérifier" : vide, inconnue, ou legacy approximative.
// Les 7 unités officielles et leurs variantes reconnues (piece/pièce, unite/unité, casse) renvoient false.
export function uniteAVerifier(unite) {
  const u = normaliserUnite(unite);
  if (u === '') return true;
  if (!estUniteConnue(unite)) return true;
  return UNITES_LEGACY_APPROXIMATIVES.includes(u);
}

export function calculerCoutIngredient(quantite, uniteRecette, prixUnitaire) {
  return convertirEnUniteBase(quantite, uniteRecette) * (parseFloat(prixUnitaire) || 0);
}
