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

// Mots-clés de la détection indicative, écrits sans accents. Pluriel en s ou x accepté sur chaque mot ;
// dans un mot-clé, tiret et espace sont interchangeables.
const ALLERGENES_MAPPING = {
  gluten:       ['farine', 'ble', 'seigle', 'orge', 'avoine', 'pain', 'pate', 'crouton', 'chapelure', 'semoule', 'epeautre'],
  crustaces:    ['crevette', 'homard', 'crabe', 'langouste', 'langoustine', 'ecrevisse'],
  oeufs:        ['oeuf', 'oeufs', 'egg'],
  poisson:      ['saumon', 'thon', 'cabillaud', 'sole', 'daurade', 'anchois', 'sardine', 'truite', 'filet de poisson'],
  arachides:    ['cacahuete', 'arachide', 'peanut'],
  soja:         ['soja', 'tofu', 'edamame', 'miso'],
  lait:         ['beurre', 'creme', 'lait', 'fromage', 'yaourt', 'parmesan', 'gruyere', 'feta', 'burrata', 'mozzarella', 'pecorino', 'mascarpone'],
  fruits_a_coque: ['noix', 'amande', 'noisette', 'pistache', 'cajou', 'pecan', 'macadamia'],
  celeri:       ['celeri'],
  moutarde:     ['moutarde'],
  sesame:       ['sesame', 'tahini'],
  sulfites:     ['sulfite', 'anhydride sulfureux', 'vinaigre balsamique', 'vinaigre de vin', 'vin', 'vinaigre'],
  lupin:        ['lupin'],
  mollusques:   ['moule', 'huitre', 'saint-jacques', 'calmar', 'seiche', 'escargot', 'poulpe'],
};

const HORS_LETTRE_AVANT = '(?<!\\p{L})';
const HORS_LETTRE_APRES = '(?!\\p{L})';
const echapper = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function sansAccents(s) {
  return s.replace(/œ/g, 'oe').replace(/æ/g, 'ae').normalize('NFD').replace(/[̀-ͯ]/g, '');
}

// Expression d'un mot-clé : chaque mot accepte un pluriel en s ou x, mots séparés par espaces ou tirets.
function motifMotCle(motCle) {
  const mots = motCle.split(/[\s-]+/).map(m => echapper(m) + '(?:s|x)?');
  return new RegExp(HORS_LETTRE_AVANT + mots.join('[\\s-]+') + HORS_LETTRE_APRES, 'u');
}

const motifGlobal = corps => new RegExp(HORS_LETTRE_AVANT + corps + HORS_LETTRE_APRES, 'gu');

// Expressions compilées au premier appel : un navigateur sans lookbehind (Safari < 16.4) perd seulement
// la détection, pas le chargement des pages qui importent ce fichier.
let expressions = null;
function compiler() {
  if (expressions) return expressions;
  expressions = {
    pate: motifGlobal('pâtés?'),
    // Retirées avant l'analyse (faux positifs) ; « noix de saint-jacques » garde « saint-jacques ».
    exclusions: [
      [motifGlobal('noix[\\s-]+de[\\s-]+(?:coco|muscade|veau)'), ' '],
      [motifGlobal('lait[\\s-]+de[\\s-]+coco'), ' '],
      [motifGlobal('noix[\\s-]+de[\\s-]+(saint[\\s-]+jacques)'), ' $1'],
    ],
    motifs: Object.fromEntries(
      Object.entries(ALLERGENES_MAPPING).map(([cle, motsCles]) => [cle, motsCles.map(motifMotCle)])
    ),
  };
  return expressions;
}

function texteAnalyse(ingredients, etapes, { pate, exclusions }) {
  const morceaux = [
    ...(ingredients || []).map(i => (i && typeof i.nom === 'string' ? i.nom : '')),
    ...(etapes || []).map(e => (typeof e === 'string' ? e : '')),
  ];
  // « | » sépare les morceaux pour qu'un mot-clé ou une exclusion ne chevauche pas deux lignes.
  let texte = morceaux.join(' | ').normalize('NFC').toLowerCase();
  texte = texte.replace(pate, ' ');
  texte = sansAccents(texte);
  for (const [motif, remplacement] of exclusions) texte = texte.replace(motif, remplacement);
  return texte;
}

// Détection indicative depuis les noms des ingrédients et les étapes ; clés dans l'ordre de ALLERGENES_14.
// Renvoie null si le navigateur ne sait pas compiler les expressions (détection indisponible).
export function detecterAllergenes({ ingredients, etapes } = {}) {
  let exp;
  try { exp = compiler(); } catch { return null; }
  const texte = texteAnalyse(ingredients, etapes, exp);
  return ALLERGENES_14
    .map(a => a.key)
    .filter(cle => (exp.motifs[cle] || []).some(motif => motif.test(texte)));
}
