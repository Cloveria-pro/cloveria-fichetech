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
  gluten:       ['farine', 'ble', 'seigle', 'orge', 'avoine', 'pain', 'pate', 'crouton', 'chapelure', 'semoule', 'epeautre',
                 'brioche', 'biscuit', 'nouille', 'couscous', 'boulgour', 'panure', 'panko', 'pita', 'tortilla', 'crepe', 'gaufre',
                 'genoise', 'biere', 'bechamel'],
  crustaces:    ['crevette', 'homard', 'crabe', 'langouste', 'langoustine', 'ecrevisse', 'gambas', 'tourteau', 'bisque', 'scampi'],
  oeufs:        ['oeuf', 'oeufs', 'egg', 'mayonnaise', 'meringue', 'aioli', 'sabayon', 'omelette'],
  // Pas de « lieu » seul (« au lieu de »).
  poisson:      ['saumon', 'thon', 'cabillaud', 'sole', 'daurade', 'anchois', 'sardine', 'truite', 'filet de poisson',
                 'loup', 'lieu noir', 'lieu jaune', 'maquereau', 'merlu', 'colin', 'rouget', 'turbot', 'hareng', 'haddock',
                 'fletan', 'espadon', 'sauce poisson', 'nuoc mam', 'worcestershire', 'bar', 'poisson'],
  arachides:    ['cacahuete', 'arachide', 'peanut'],
  soja:         ['soja', 'tofu', 'edamame', 'miso', 'shoyu', 'tamari', 'tempeh'],
  lait:         ['beurre', 'creme', 'lait', 'fromage', 'yaourt', 'parmesan', 'gruyere', 'feta', 'burrata', 'mozzarella', 'pecorino', 'mascarpone',
                 'ricotta', 'comte', 'emmental', 'cheddar', 'chevre', 'brie', 'camembert', 'roquefort', 'gorgonzola', 'chantilly',
                 'bechamel', 'ghee', 'babeurre', 'lactose', 'skyr'],
  fruits_a_coque: ['noix', 'amande', 'noisette', 'pistache', 'cajou', 'pecan', 'macadamia',
                 'praline', 'frangipane', 'nougat', 'gianduja', 'massepain'],
  celeri:       ['celeri'],
  moutarde:     ['moutarde'],
  sesame:       ['sesame', 'tahini', 'gomasio', 'halva'],
  sulfites:     ['sulfite', 'anhydride sulfureux', 'vinaigre balsamique', 'vinaigre de vin', 'vin', 'vinaigre',
                 'porto', 'madere', 'champagne', 'cidre', 'xeres', 'marsala', 'vinaigrette', 'cornichon', 'sauternes'],
  lupin:        ['lupin'],
  // Pas de « coque » ni de « couteau » (trop ambigus).
  mollusques:   ['moule', 'huitre', 'saint-jacques', 'calmar', 'seiche', 'escargot', 'poulpe',
                 'palourde', 'bulot', 'bigorneau', 'petoncle', 'praire', 'encornet', 'ormeau'],
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
    // « pâté » est retiré, sauf dans « pâté en croûte » : il reste alors « pate », qui donne gluten.
    pate: motifGlobal('pâtés?(?![\\s-]+en[\\s-]+cro[uû]tes?(?!\\p{L}))'),
    // Retirées avant l'analyse (faux positifs) ; le groupe capturé ($1) est conservé :
    // « noix de saint-jacques » garde « saint-jacques », « noix de beurre » garde « beurre »,
    // « beurre de cacahuète » garde « cacahuete », « beurre d'arachide » garde « arachide »,
    // « crème de marrons / cassis » garde « marrons » / « cassis ».
    exclusions: [
      [motifGlobal('noix[\\s-]+de[\\s-]+(?:coco|muscade|veau)'), ' '],
      [motifGlobal('lait[\\s-]+de[\\s-]+coco'), ' '],
      [motifGlobal('noix[\\s-]+de[\\s-]+(saint[\\s-]+jacques)'), ' $1'],
      [motifGlobal('noix[\\s-]+de[\\s-]+(beurre)'), ' $1'],
      [motifGlobal('beurres?[\\s-]+de[\\s-]+(cacahuetes?)'), ' $1'],
      [motifGlobal("beurres?[\\s-]+d['’]\\s*(arachides?)"), ' $1'],
      [motifGlobal('cremes?[\\s-]+de[\\s-]+(marrons?|cassis)'), ' $1'],
    ],
    motifs: Object.fromEntries(
      Object.entries(ALLERGENES_MAPPING).map(([cle, motsCles]) => [cle, motsCles.map(motifMotCle)])
    ),
  };
  return expressions;
}

// Nom comparable : minuscules, sans accents, œ/æ développés, espaces réduits.
const nomNormalise = s => sansAccents(String(s || '').normalize('NFC').toLowerCase()).replace(/\s+/g, ' ').trim();

// Sous-recette d'une ligne : par sousRecetteId exact, sinon par nom normalisé identique.
function sousRecetteDeLigne(ligne, sousRecettes) {
  if (!ligne || !Array.isArray(sousRecettes) || sousRecettes.length === 0) return null;
  if (ligne.sousRecetteId) {
    const parId = sousRecettes.find(sr => sr && sr.id === ligne.sousRecetteId);
    if (parId) return parId;
  }
  const nom = nomNormalise(ligne.nom);
  if (!nom) return null;
  return sousRecettes.find(sr => sr && nomNormalise(sr.nom) === nom) || null;
}

const nomsIngredients = liste => (liste || []).map(i => (i && typeof i.nom === 'string' ? i.nom : ''));

function texteAnalyse(ingredients, etapes, sousRecettes, { pate, exclusions }) {
  // Un seul niveau : les noms des ingrédients d'une sous-recette sont ajoutés, sans développer
  // une sous-recette citée à son tour par son nom (pas de récursion, donc pas de boucle).
  const nomsSousRecettes = (ingredients || []).flatMap(ligne => {
    const sr = sousRecetteDeLigne(ligne, sousRecettes);
    return sr ? nomsIngredients(sr.ingredients) : [];
  });
  const morceaux = [
    ...nomsIngredients(ingredients),
    ...nomsSousRecettes,
    ...(etapes || []).map(e => (typeof e === 'string' ? e : '')),
  ];
  // « | » sépare les morceaux pour qu'un mot-clé ou une exclusion ne chevauche pas deux lignes.
  let texte = morceaux.join(' | ').normalize('NFC').toLowerCase();
  texte = texte.replace(pate, ' ');
  texte = sansAccents(texte);
  for (const [motif, remplacement] of exclusions) texte = texte.replace(motif, remplacement);
  return texte;
}

// Détection indicative depuis les noms des ingrédients (y compris ceux des sous-recettes utilisées) et les
// étapes ; clés dans l'ordre de ALLERGENES_14.
// Renvoie null si le navigateur ne sait pas compiler les expressions (détection indisponible).
export function detecterAllergenes({ ingredients, etapes, sousRecettes = [] } = {}) {
  let exp;
  try { exp = compiler(); } catch { return null; }
  const texte = texteAnalyse(ingredients, etapes, sousRecettes, exp);
  return ALLERGENES_14
    .map(a => a.key)
    .filter(cle => (exp.motifs[cle] || []).some(motif => motif.test(texte)));
}
