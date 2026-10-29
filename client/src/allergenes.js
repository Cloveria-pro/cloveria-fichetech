// Les 14 allergènes réglementaires (Règlement UE n°1169/2011) : clé enregistrée dans les fiches,
// code court (export Allergènes des cartes) et libellé affiché.
export const ALLERGENES_14 = [
  { code: 'G',   key: 'gluten',        label: 'Gluten' },
  { code: 'C',   key: 'crustaces',     label: 'Crustacés' },
  { code: 'O',   key: 'oeufs',         label: 'Œufs' },
  { code: 'P',   key: 'poisson',       label: 'Poisson' },
  { code: 'A',   key: 'arachides',     label: 'Arachides' },
  { code: 'So',  key: 'soja',          label: 'Soja' },
  { code: 'L',   key: 'lait',          label: 'Lait' },
  { code: 'FN',  key: 'fruits_a_coque',label: 'Fruits à coque' },
  { code: 'Ce',  key: 'celeri',        label: 'Céleri' },
  { code: 'Mo',  key: 'moutarde',      label: 'Moutarde' },
  { code: 'Se',  key: 'sesame',        label: 'Sésame' },
  { code: 'Su',  key: 'sulfites',      label: 'Sulfites' },
  { code: 'Lu',  key: 'lupin',         label: 'Lupin' },
  { code: 'Mol', key: 'mollusques',    label: 'Mollusques' },
];

// Libellé d'un allergène ; une clé inconnue est renvoyée telle quelle.
export function libelleAllergene(key) {
  const a = ALLERGENES_14.find(x => x.key === key);
  return a ? a.label : key;
}
