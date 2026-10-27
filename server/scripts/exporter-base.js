// Export manuel de la base MongoDB `cloveria` (Atlas M0, sans sauvegarde automatique).
//
// Usage (depuis server/) :
//   node scripts/exporter-base.js                    → export dans <répertoire personnel>/cloveria-backups
//   node scripts/exporter-base.js --sortie <dossier> → export dans <dossier>
// Un sous-dossier cloveria-AAAA-MM-JJ-HHMM est créé ; il contient un fichier <collection>.ejson par
// collection (EJSON canonique, un document par ligne, _id conservés) et un manifeste.json.
//
// LECTURE SEULE : listCollections et find uniquement, aucune écriture en base.
// Connexion directe par MongoClient (jamais getDb(), qui écrit au démarrage : seed, index, migration, démo).
// Garde-fous, vérifiés AVANT la connexion : refus si le dossier de sortie est dans le dépôt, s'il contient
// « OneDrive », ou si le sous-dossier existe déjà. Collection users : les jetons de vérification et de
// réinitialisation sont retirés avant écriture. Affichage limité à des comptages et au chemin du dossier
// (jamais d'URI, d'adresse e-mail ni de contenu de document). En cas d'échec, le sous-dossier partiel
// est supprimé et le code de sortie est non nul.
import { createHash } from 'crypto';
import { createWriteStream, existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { once } from 'events';
import { homedir } from 'os';
import { dirname, isAbsolute, join, relative, resolve } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { MongoClient, BSON } from 'mongodb';

export const VERSION_SCRIPT = '1.0.0';
export const NOM_BASE = 'cloveria';
export const COLLECTIONS_CONNUES = [
  'users', 'recettes', 'ingredients', 'cartes', 'sous_recettes', 'aliases', 'historique_prix',
  'parametres', 'agenda', 'ventes_imports', 'documents_ventes', 'documents_fiches', 'documents_factures',
];
export const CHAMPS_EXCLUS = {
  users: ['emailVerificationToken', 'emailVerificationExpiry', 'passwordResetToken', 'passwordResetExpiry'],
};
export const RACINE_DEPOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAPPEL = 'Contient des données personnelles et des hachages de mots de passe : ne jamais mettre dans le dépôt ni dans un dossier synchronisé ; supprimer sous 30 jours.';

class ErreurExport extends Error {
  constructor(code, texte) { super(texte); this.code = code; this.texte = texte; }
}

// true si `chemin` est `dossier` ou se trouve dessous (comparaison insensible à la casse sous Windows).
export function estDansDossier(chemin, dossier) {
  const rel = relative(dossier, chemin);
  return rel === '' || (!rel.startsWith('..') && !isAbsolute(rel));
}

export function nomSousDossier(date = new Date()) {
  const d = n => String(n).padStart(2, '0');
  return `cloveria-${date.getFullYear()}-${d(date.getMonth() + 1)}-${d(date.getDate())}-${d(date.getHours())}${d(date.getMinutes())}`;
}

export function analyserArguments(argv) {
  let sortie = join(homedir(), 'cloveria-backups');
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--sortie') {
      if (!argv[i + 1] || argv[i + 1].startsWith('--')) throw new ErreurExport('argument_sortie', '--sortie attend un dossier.');
      sortie = argv[++i];
    } else {
      throw new ErreurExport('argument_inconnu', `argument inconnu : ${argv[i]}`);
    }
  }
  return { sortie: resolve(sortie) };
}

// Vérifications du chemin de sortie, sans rien créer. Renvoie le chemin du sous-dossier.
export function validerSortie(dossierSortie, date = new Date()) {
  const sousDossier = join(dossierSortie, nomSousDossier(date));
  if (estDansDossier(sousDossier, RACINE_DEPOT)) {
    throw new ErreurExport('sortie_dans_depot', 'le dossier de sortie est dans le dépôt : refusé.');
  }
  if (sousDossier.toLowerCase().includes('onedrive')) {
    throw new ErreurExport('sortie_onedrive', 'le dossier de sortie contient « OneDrive » (dossier synchronisé) : refusé.');
  }
  if (existsSync(sousDossier)) {
    throw new ErreurExport('sous_dossier_existe', 'le sous-dossier d\'export existe déjà : refusé.');
  }
  return sousDossier;
}

// Écrit une collection, document par document via le curseur. Renvoie { documents, sha256 }.
async function exporterCollection(db, nom, chemin) {
  const exclus = CHAMPS_EXCLUS[nom] || [];
  const hash = createHash('sha256');
  const flux = createWriteStream(chemin, { flags: 'wx', encoding: 'utf8' });
  let documents = 0;
  try {
    for await (const doc of db.collection(nom).find({})) {
      for (const champ of exclus) delete doc[champ];
      const ligne = BSON.EJSON.stringify(doc, { relaxed: false }) + '\n';
      hash.update(ligne, 'utf8');
      if (!flux.write(ligne)) await once(flux, 'drain');
      documents++;
    }
  } finally {
    flux.end();
    await once(flux, 'finish');
  }
  return { documents, sha256: hash.digest('hex') };
}

async function main() {
  let sousDossier;
  let cree = false;
  let client;
  try {
    const { sortie } = analyserArguments(process.argv.slice(2));
    sousDossier = validerSortie(sortie);

    await import('../env.js');
    if (!process.env.MONGODB_URI) throw new ErreurExport('uri_manquante', 'MONGODB_URI manquant.');

    client = new MongoClient(process.env.MONGODB_URI);
    await client.connect();
    const db = client.db(NOM_BASE);
    const infos = await db.listCollections({}, { nameOnly: true }).toArray();
    const noms = infos
      .filter(c => !c.name.startsWith('system.') && (c.type === undefined || c.type === 'collection'))
      .map(c => c.name)
      .sort();
    const inattendues = noms.filter(n => !COLLECTIONS_CONNUES.includes(n));

    mkdirSync(sortie, { recursive: true });
    mkdirSync(sousDossier); // échoue si le sous-dossier est apparu entre-temps
    cree = true;

    const manifeste = {
      date: new Date().toISOString(),
      base: NOM_BASE,
      versionScript: VERSION_SCRIPT,
      format: 'EJSON canonique, un document par ligne',
      collections: {},
      champsExclus: CHAMPS_EXCLUS,
      collectionsInattendues: inattendues,
    };
    for (const nom of noms) {
      const fichier = `${nom}.ejson`;
      const { documents, sha256 } = await exporterCollection(db, nom, join(sousDossier, fichier));
      manifeste.collections[nom] = { fichier, documents, sha256 };
      console.log(`[Export] ${nom} : ${documents} document(s)`);
    }
    writeFileSync(join(sousDossier, 'manifeste.json'), JSON.stringify(manifeste, null, 2) + '\n', { flag: 'wx' });

    for (const nom of inattendues) console.warn(`[Export] avertissement : collection inattendue exportée : ${nom}`);
    const total = Object.values(manifeste.collections).reduce((s, c) => s + c.documents, 0);
    console.log(`[Export] ${noms.length} collection(s), ${total} document(s) au total.`);
    console.log(`[Export] dossier créé : ${sousDossier}`);
    console.log(`[Export] ${RAPPEL}`);
  } catch (err) {
    if (cree) rmSync(sousDossier, { recursive: true, force: true });
    const detail = err instanceof ErreurExport ? err.texte : (err?.codeName || err?.name || 'erreur inconnue');
    console.error('[Export] arrêt :', detail);
    process.exitCode = 1;
  } finally {
    if (client) await client.close().catch(() => {});
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
