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

// Affichage d'une quantité : jusqu'à 3 décimales sans zéros inutiles (0.008, 0.08, 1.25) ;
// une petite quantité non nulle qui s'arrondirait à 0 garde 2 chiffres significatifs (0.0002).
export function formatQuantite(q) {
  if (typeof q !== 'number' || !Number.isFinite(q)) return '0';
  if (Number.isInteger(q)) return String(q);
  const arrondi = Number(q.toFixed(3));
  if (arrondi === 0 && q > 0) return String(Number(q.toPrecision(2)));
  return String(arrondi);
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

// Menu Engineering : marge d'une ligne de rapport en HT − HT, recalculée depuis les valeurs enregistrées
// (prixVente TTC, coutMat HT, quantite). Si l'une manque ou n'est pas numérique, la ligne est renvoyée
// telle quelle (marges enregistrées conservées). Un prix à 0 donne une marge négative (−coût).
export function recalculerLigneMargeHT(ligne, tvaVentePct) {
  const estNombre = v => typeof v === 'number' && Number.isFinite(v);
  if (!ligne || !estNombre(ligne.prixVente) || !estNombre(ligne.coutMat) || !estNombre(ligne.quantite)) return ligne;
  const margeUnitaire = prixVenteHT(ligne.prixVente, tvaVentePct) - ligne.coutMat;
  return { ...ligne, margeUnitaire, margeTotal: margeUnitaire * ligne.quantite };
}

export function foodCostRecetteHT(recette, tvaVentePct) {
  return foodCostHT(coutPortionHT(recette), recette.prixVentePratiqueTTC || 0, tvaVentePct);
}

export function prixSuggereTTC(recette, foodCostCible, tvaPct) {
  const cpHT = coutPortionHT(recette);
  if (cpHT <= 0 || foodCostCible <= 0) return null;
  return (cpHT / (foodCostCible / 100)) * (1 + tvaPct / 100);
}
