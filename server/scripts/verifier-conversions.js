// Script autonome, local uniquement — jamais importé par l'application, jamais exécuté en production.
// Compare server/lib/conversions.js (copie) à client/src/conversions.js (source de vérité).
// Usage : node server/scripts/verifier-conversions.js

import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const cheminServeur = path.resolve(__dirname, '../lib/conversions.js');
const cheminClient = path.resolve(__dirname, '../../client/src/conversions.js');

const ecarts = [];

// ── 1. Comparaison des clés/valeurs de CONVERSIONS (lecture du code source) ──
function extraireConversions(cheminFichier) {
  const texte = readFileSync(cheminFichier, 'utf-8');
  const match = texte.match(/const CONVERSIONS = (\{[\s\S]*?\n\});/);
  if (!match) throw new Error(`Bloc CONVERSIONS introuvable dans ${cheminFichier}`);
  // Évaluation du littéral objet extrait (clés/valeurs simples : chaînes et nombres uniquement).
  return Function('"use strict"; return (' + match[1] + ');')();
}

const conversionsServeur = extraireConversions(cheminServeur);
const conversionsClient = extraireConversions(cheminClient);

const clesServeur = Object.keys(conversionsServeur).sort();
const clesClient = Object.keys(conversionsClient).sort();

if (JSON.stringify(clesServeur) !== JSON.stringify(clesClient)) {
  ecarts.push(`Clés de CONVERSIONS différentes.\n  serveur: ${JSON.stringify(clesServeur)}\n  client:  ${JSON.stringify(clesClient)}`);
} else {
  for (const cle of clesServeur) {
    if (conversionsServeur[cle] !== conversionsClient[cle]) {
      ecarts.push(`CONVERSIONS['${cle}'] différent : serveur=${conversionsServeur[cle]} client=${conversionsClient[cle]}`);
    }
  }
}

// ── 2. Comparaison comportementale des fonctions exportées ──
const serveur = await import(pathToFileURL(cheminServeur).href);
const client = await import(pathToFileURL(cheminClient).href);

const grilleUnites = [
  'g', 'G', ' kg ', 'Kg', 'gr', 'mg', 'ml', 'ML', 'cl', 'CL', 'L', 'l',
  'c.s', 'c.s.', 'C.S.', 'c.c', 'c.c.', 'càs', 'càc',
  'pièce', 'piece', 'unité', 'unite', 'u',
  'tranche', 'botte', 'pincée', 'gousse', 'feuille', 'sachet', 'bouquet', 'boîte',
  'carton', '', null, undefined, 42,
];
const grilleQuantites = [0, 1, 2.5];
const PRIX_TEST = 3.5;

for (const unite of grilleUnites) {
  // familleUnite
  const fServeur = serveur.familleUnite(unite);
  const fClient = client.familleUnite(unite);
  if (fServeur !== fClient) {
    ecarts.push(`familleUnite(${JSON.stringify(unite)}) différent : serveur=${fServeur} client=${fClient}`);
  }

  for (const quantite of grilleQuantites) {
    // convertirEnUniteBase
    const cServeur = serveur.convertirEnUniteBase(quantite, unite);
    const cClient = client.convertirEnUniteBase(quantite, unite);
    if (cServeur !== cClient) {
      ecarts.push(`convertirEnUniteBase(${quantite}, ${JSON.stringify(unite)}) différent : serveur=${cServeur} client=${cClient}`);
    }

    // calculerCoutIngredient
    const iServeur = serveur.calculerCoutIngredient(quantite, unite, PRIX_TEST);
    const iClient = client.calculerCoutIngredient(quantite, unite, PRIX_TEST);
    if (iServeur !== iClient) {
      ecarts.push(`calculerCoutIngredient(${quantite}, ${JSON.stringify(unite)}, ${PRIX_TEST}) différent : serveur=${iServeur} client=${iClient}`);
    }
  }
}

if (ecarts.length === 0) {
  console.log('OK : tables identiques');
  process.exit(0);
} else {
  console.error(`ECARTS DETECTES (${ecarts.length}) :`);
  for (const e of ecarts) console.error(' - ' + e);
  process.exit(1);
}
