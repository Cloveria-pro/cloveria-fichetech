import { calculerCoutIngredient, convertirEnUniteBase, familleUnite } from './conversions.js';

// Reproduit exactement la sémantique de computePrixUnitaireSR (client/src/components/IngredientAutocomplete.jsx) :
// sr.ingredients est supposé avoir déjà des prixUnitaire à jour (à la charge de l'appelant).
// sr.quantiteProduite || 1 : une quantité absente ou égale à 0 est traitée comme 1, comme côté client.
export function calculerPrixUnitaireSousRecette(sr) {
  if (!sr || !Array.isArray(sr.ingredients)) return 0;

  const coutTotal = sr.ingredients.reduce((acc, i) => {
    if (!i) return acc;
    return acc + calculerCoutIngredient(i.quantite, i.unite, i.prixUnitaire);
  }, 0);

  const qBase = convertirEnUniteBase(sr.quantiteProduite || 1, sr.unite);
  if (!(qBase > 0)) return 0;

  return coutTotal / qBase;
}

// true seulement si les deux unités ont une famille connue et identique (masse/volume/piece).
export function memeFamilleUnite(uniteA, uniteB) {
  const fa = familleUnite(uniteA);
  const fb = familleUnite(uniteB);
  return fa !== null && fb !== null && fa === fb;
}
