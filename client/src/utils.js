import { calculerCoutIngredient } from './conversions.js';

export function coutIng(ing) {
  const { quantite = 0, prixUnitaire = 0, unite = '' } = ing;
  return calculerCoutIngredient(quantite, unite, prixUnitaire);
}

export function coutIngTTC(ing) {
  return coutIng(ing) * (1 + (ing.tva ?? 10) / 100);
}

export function coutPortionHT(recette) {
  const total = (recette.ingredients || []).reduce((s, i) => s + coutIng(i), 0);
  return recette.portions > 0 ? total / recette.portions : 0;
}

export function coutPortionTTC(recette) {
  const total = (recette.ingredients || []).reduce((s, i) => s + coutIngTTC(i), 0);
  return recette.portions > 0 ? total / recette.portions : 0;
}

export function foodCostPct(recette) {
  const pvTTC = recette.prixVentePratiqueTTC || 0;
  if (pvTTC <= 0) return null;
  return (coutPortionTTC(recette) / pvTTC) * 100;
}

export function calculerFoodCost(coutParCouvertTTC, prixVenteTTC) {
  if (!prixVenteTTC || prixVenteTTC <= 0) return null;
  return (coutParCouvertTTC / prixVenteTTC) * 100;
}

export function prixSuggereTTC(recette, foodCostCible, tvaPct) {
  const cpHT = coutPortionHT(recette);
  if (cpHT <= 0 || foodCostCible <= 0) return null;
  return (cpHT / (foodCostCible / 100)) * (1 + tvaPct / 100);
}
