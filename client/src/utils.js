import { calculerCoutIngredient } from './conversions.js';

export function coutIng(ing) {
  const { quantite = 0, prixUnitaire = 0, unite = '', rendement = 100 } = ing;
  const base = calculerCoutIngredient(quantite, unite, prixUnitaire);
  const r = (rendement > 0 && rendement <= 100) ? rendement : 100;
  return r < 100 ? base / (r / 100) : base;
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

// Saisie décimale française ou anglaise : "12,5" | "12.5" | " 1 234,5 " → nombre ; vide, "abc", ".", "1,2,3" → null.
export function parseDecimal(texte) {
  if (texte === null || texte === undefined) return null;
  if (typeof texte === 'number') return Number.isFinite(texte) ? texte : null;
  const s = String(texte).trim().replace(/\s/g, '').replace(',', '.');
  if (s === '' || s === '.' || !/^\d*\.?\d*$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

// Food cost : coût matière HT par portion ÷ prix de vente HT × 100,
// avec prix HT = prix TTC / (1 + TVA de vente). TVA de vente non numérique → 10.
export function prixVenteHT(prixVenteTTC, tvaVentePct) {
  const tva = typeof tvaVentePct === 'number' && Number.isFinite(tvaVentePct) ? tvaVentePct : 10;
  return (prixVenteTTC || 0) / (1 + tva / 100);
}

export function foodCostHT(coutPortionHT, prixVenteTTC, tvaVentePct) {
  if (!(prixVenteTTC > 0)) return null;
  return (coutPortionHT / prixVenteHT(prixVenteTTC, tvaVentePct)) * 100;
}

export function foodCostRecetteHT(recette, tvaVentePct) {
  return foodCostHT(coutPortionHT(recette), recette.prixVentePratiqueTTC || 0, tvaVentePct);
}

export function prixSuggereTTC(recette, foodCostCible, tvaPct) {
  const cpHT = coutPortionHT(recette);
  if (cpHT <= 0 || foodCostCible <= 0) return null;
  return (cpHT / (foodCostCible / 100)) * (1 + tvaPct / 100);
}
