// Restauration manuelle d'un export produit par scripts/exporter-base.js.
//
// Usage (depuis server/) :
//   node scripts/restaurer-base.js <dossier>                                   → SIMULATION hors ligne
//   node scripts/restaurer-base.js <dossier> --cible cloveria_restoretest --reel → restauration réelle
//   node scripts/restaurer-base.js <dossier> --cible cloveria --reel --confirmer-production
//   node scripts/restaurer-base.js --supprimer cloveria_restoretest [--reel]     → vide une base de test
//
// À SAVOIR AVANT DE RESTAURER :
// (1) Les documents restaurés n'ont pas les jetons de vérification d'e-mail ni de réinitialisation de mot
//     de passe (emailVerificationToken/Expiry, passwordResetToken/Expiry), exclus à l'export : un lien
//     envoyé avant l'export ne fonctionnera plus ; l'utilisateur devra en redemander un.
// (2) Après une perte totale en production, SUSPENDRE le service Render avant de restaurer : getDb()
//     sème des données d'exemple dans toute collection vide au démarrage, ce qui ferait refuser (ou
//     polluer) la restauration.
// (3) Ce script ne couvre pas une perte partielle : il refuse d'écrire dans une base qui contient déjà
//     au moins une collection non vide (pas de fusion, pas d'écrasement).
//
// Garde-fous : sans --reel, aucune connexion (vérification hors ligne du dossier : manifeste, SHA-256,
// nombre de lignes, relecture EJSON). Avec --reel : --cible obligatoire ; seuls les noms commençant par
// cloveria_restoretest sont acceptés, et `cloveria` uniquement avec --confirmer-production ; toute
// validation se fait avant la connexion. Connexion directe par MongoClient (jamais getDb()). Affichage
// limité à des comptages (jamais d'URI, d'adresse e-mail ni de contenu de document).
import { createHash } from 'crypto';
import { createReadStream, existsSync, readFileSync } from 'fs';
import { createInterface } from 'readline';
import { join, resolve } from 'path';
import { pathToFileURL } from 'url';
import { MongoClient, BSON } from 'mongodb';

const PREFIXE_TEST = 'cloveria_restoretest';
const NOM_TEST = /^cloveria_restoretest[A-Za-z0-9_-]*$/;
const TAILLE_LOT = 200;

class ErreurRestauration extends Error {
  constructor(code, texte) { super(texte); this.code = code; this.texte = texte; }
}

export function analyserArguments(argv) {
  const opts = { dossier: null, cible: null, reel: false, confirmerProduction: false, supprimer: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--reel') opts.reel = true;
    else if (a === '--confirmer-production') opts.confirmerProduction = true;
    else if (a === '--cible' || a === '--supprimer') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new ErreurRestauration('argument_valeur', `${a} attend un nom de base.`);
      opts[a === '--cible' ? 'cible' : 'supprimer'] = argv[++i];
    } else if (a.startsWith('--')) throw new ErreurRestauration('argument_inconnu', `argument inconnu : ${a}`);
    else if (opts.dossier === null) opts.dossier = resolve(a);
    else throw new ErreurRestauration('argument_en_trop', `argument en trop : ${a}`);
  }
  if (opts.supprimer !== null) {
    if (opts.dossier !== null || opts.cible !== null || opts.confirmerProduction) {
      throw new ErreurRestauration('arguments_incompatibles', '--supprimer ne se combine ni avec un dossier, ni avec --cible, ni avec --confirmer-production.');
    }
    if (opts.supprimer === 'cloveria' || !NOM_TEST.test(opts.supprimer)) {
      throw new ErreurRestauration('suppression_refusee', `--supprimer n'accepte qu'une base dont le nom commence par ${PREFIXE_TEST} : refusé.`);
    }
    return { mode: 'supprimer', ...opts };
  }
  if (opts.dossier === null) throw new ErreurRestauration('dossier_manquant', 'dossier d\'export manquant.');
  if (opts.reel) {
    if (!opts.cible) throw new ErreurRestauration('cible_manquante', '--reel exige --cible <base>.');
    if (opts.cible === 'cloveria') {
      if (!opts.confirmerProduction) {
        throw new ErreurRestauration('production_non_confirmee', '--cible cloveria (production) exige aussi --confirmer-production : refusé.');
      }
    } else if (!NOM_TEST.test(opts.cible)) {
      throw new ErreurRestauration('cible_refusee', `--cible doit commencer par ${PREFIXE_TEST} (ou être cloveria avec --confirmer-production) : refusé.`);
    }
  }
  return { mode: opts.reel ? 'restaurer' : 'simulation', ...opts };
}

// Vérification hors ligne d'un dossier d'export. Ne lève pas : renvoie { manifeste, comptages, ecarts }.
export function verifierDossier(dossier) {
  const ecarts = [];
  const comptages = {};
  const cheminManifeste = join(dossier, 'manifeste.json');
  if (!existsSync(cheminManifeste)) return { manifeste: null, comptages, ecarts: ['manifeste.json absent'] };
  let manifeste;
  try {
    manifeste = JSON.parse(readFileSync(cheminManifeste, 'utf8'));
  } catch {
    return { manifeste: null, comptages, ecarts: ['manifeste.json illisible'] };
  }
  const collections = manifeste?.collections;
  if (!collections || typeof collections !== 'object') return { manifeste, comptages, ecarts: ['manifeste sans collections'] };

  for (const [nom, info] of Object.entries(collections)) {
    const chemin = join(dossier, String(info?.fichier || ''));
    if (!info?.fichier || !existsSync(chemin)) { ecarts.push(`${nom} : fichier absent`); continue; }
    const contenu = readFileSync(chemin);
    const sha256 = createHash('sha256').update(contenu).digest('hex');
    if (sha256 !== info.sha256) ecarts.push(`${nom} : SHA-256 différent du manifeste`);
    const texte = contenu.toString('utf8');
    const lignes = texte === '' ? [] : texte.replace(/\n$/, '').split('\n');
    if (lignes.length !== info.documents) ecarts.push(`${nom} : ${lignes.length} ligne(s) pour ${info.documents} document(s) au manifeste`);
    let illisibles = 0;
    for (const ligne of lignes) {
      try { BSON.EJSON.parse(ligne, { relaxed: false }); } catch { illisibles++; }
    }
    if (illisibles > 0) ecarts.push(`${nom} : ${illisibles} ligne(s) illisible(s) en EJSON`);
    comptages[nom] = lignes.length;
  }
  return { manifeste, comptages, ecarts };
}

function afficherVerification({ comptages, ecarts }) {
  for (const [nom, n] of Object.entries(comptages)) console.log(`[Restauration] ${nom} : ${n} document(s) dans le fichier`);
  if (ecarts.length === 0) console.log('[Restauration] vérification hors ligne : OK');
  else for (const e of ecarts) console.error(`[Restauration] écart : ${e}`);
}

async function connecter() {
  await import('../env.js');
  if (!process.env.MONGODB_URI) throw new ErreurRestauration('uri_manquante', 'MONGODB_URI manquant.');
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  return client;
}

async function collectionsDe(db) {
  const infos = await db.listCollections({}, { nameOnly: true }).toArray();
  return infos.map(c => c.name).filter(n => !n.startsWith('system.')).sort();
}

async function restaurerCollection(db, nom, chemin) {
  const col = db.collection(nom);
  const lignes = createInterface({ input: createReadStream(chemin, { encoding: 'utf8' }), crlfDelay: Infinity });
  let lot = [];
  let inseres = 0;
  for await (const ligne of lignes) {
    if (ligne === '') continue;
    lot.push(BSON.EJSON.parse(ligne, { relaxed: false }));
    if (lot.length >= TAILLE_LOT) { await col.insertMany(lot); inseres += lot.length; lot = []; }
  }
  if (lot.length > 0) { await col.insertMany(lot); inseres += lot.length; }
  return inseres;
}

async function modeRestaurer(opts) {
  const verif = verifierDossier(opts.dossier);
  afficherVerification(verif);
  if (verif.ecarts.length > 0) throw new ErreurRestauration('dossier_invalide', 'dossier d\'export non conforme : rien n\'est écrit.');

  const client = await connecter();
  try {
    const db = client.db(opts.cible);
    for (const nom of await collectionsDe(db)) {
      if (await db.collection(nom).countDocuments({}, { limit: 1 }) > 0) {
        throw new ErreurRestauration('cible_non_vide', `la base cible ${opts.cible} contient déjà des documents : refusé (pas de fusion).`);
      }
    }
    const collections = verif.manifeste.collections;
    for (const [nom, info] of Object.entries(collections)) {
      const n = await restaurerCollection(db, nom, join(opts.dossier, info.fichier));
      console.log(`[Restauration] ${nom} : ${n} document(s) insérés`);
    }
    if (collections.users) {
      await db.collection('users').createIndex({ id: 1 }, { unique: true });
      await db.collection('users').createIndex({ email: 1 }, { unique: true });
      console.log('[Restauration] index uniques de users recréés (id, email)');
    }
    let ecarts = 0;
    for (const [nom, info] of Object.entries(collections)) {
      const n = await db.collection(nom).countDocuments();
      if (n === info.documents) console.log(`[Restauration] ${nom} : OK (${n})`);
      else { ecarts++; console.error(`[Restauration] ${nom} : écart (${n} en base, ${info.documents} au manifeste)`); }
    }
    if (ecarts > 0) process.exitCode = 1;
    else console.log(`[Restauration] terminé : base ${opts.cible} conforme au manifeste.`);
  } finally {
    await client.close().catch(() => {});
  }
}

async function modeSupprimer(opts) {
  const client = await connecter();
  try {
    const db = client.db(opts.supprimer);
    const noms = await collectionsDe(db);
    if (noms.length === 0) { console.log(`[Suppression] base ${opts.supprimer} : aucune collection.`); return; }
    for (const nom of noms) {
      if (opts.reel) { await db.collection(nom).drop(); console.log(`[Suppression] ${nom} : supprimée`); }
      else console.log(`[Suppression] simulation : ${nom} serait supprimée`);
    }
    if (!opts.reel) console.log('[Suppression] simulation : ajoutez --reel pour supprimer.');
  } finally {
    await client.close().catch(() => {});
  }
}

async function main() {
  try {
    const opts = analyserArguments(process.argv.slice(2));
    if (opts.mode === 'simulation') {
      const verif = verifierDossier(opts.dossier);
      afficherVerification(verif);
      console.log('[Restauration] SIMULATION : aucune connexion, rien n\'est écrit.');
      if (verif.ecarts.length > 0) process.exitCode = 1;
    } else if (opts.mode === 'restaurer') {
      await modeRestaurer(opts);
    } else {
      await modeSupprimer(opts);
    }
  } catch (err) {
    const detail = err instanceof ErreurRestauration ? err.texte : (err?.codeName || err?.name || 'erreur inconnue');
    console.error('[Restauration] arrêt :', detail);
    process.exitCode = 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
