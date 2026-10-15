// Nettoyage des données orphelines : documents des 12 collections utilisateur dont le user_id ne
// correspond à aucun compte de `users` (comptes supprimés avant S10/A1).
//
// Usage (depuis server/) :
//   node scripts/purger-orphelins.js          → SIMULATION : aucune écriture, comptages uniquement
//   node scripts/purger-orphelins.js --reel   → effacement réel, puis recomptage des orphelins restants
//
// Garde-fous : refus si `users` est vide ou inaccessible ; documents sans user_id jamais supprimés ;
// user_id 'demo' jamais considéré comme orphelin ; seules les 12 collections de COLLECTIONS_UTILISATEUR
// sont touchées ; affichage limité à des comptages (jamais d'URI, d'adresse, d'id ni de contenu).
// Connexion directe par MongoClient (pas getDb(), qui écrit au démarrage : seed, index, migration).
import { pathToFileURL } from 'url';
import { COLLECTIONS_UTILISATEUR, CHAMP_PROPRIETAIRE } from '../lib/effacerUtilisateur.js';

// user_id jamais considérés comme orphelins, même sans document users correspondant.
const USER_IDS_PROTEGES = ['demo'];

function filtreOrphelins(idsComptes) {
  return { [CHAMP_PROPRIETAIRE]: { $exists: true, $nin: [...idsComptes, ...USER_IDS_PROTEGES, null, ''] } };
}

// Identifiants des comptes existants. Lève 'users_inaccessible' ou 'users_vide'.
export async function idsComptesExistants(db) {
  let ids;
  try {
    ids = await db.collection('users').distinct('id');
  } catch {
    throw new Error('users_inaccessible');
  }
  ids = ids.filter(id => typeof id === 'string' && id !== '');
  if (ids.length === 0) throw new Error('users_vide');
  return ids;
}

// Comptages par collection : documents orphelins et nombre de user_id distincts orphelins.
export async function compterOrphelins(db, idsComptes) {
  const comptages = {};
  for (const collection of COLLECTIONS_UTILISATEUR) {
    const filtre = filtreOrphelins(idsComptes);
    const documents = await db.collection(collection).countDocuments(filtre);
    const userIds = (await db.collection(collection).distinct(CHAMP_PROPRIETAIRE, filtre)).length;
    comptages[collection] = { documents, userIds };
  }
  return comptages;
}

// Simulation par défaut. En réel : pour chaque collection, les user_id candidats sont revérifiés dans
// `users` juste avant l'effacement (un compte créé entre-temps est épargné), puis recomptage final.
export async function purgerOrphelins(db, { reel = false } = {}) {
  const ids = await idsComptesExistants(db);
  const avant = await compterOrphelins(db, ids);
  if (!reel) return { mode: 'simulation', avant };

  const supprimes = {};
  for (const collection of COLLECTIONS_UTILISATEUR) {
    const candidats = await db.collection(collection).distinct(CHAMP_PROPRIETAIRE, filtreOrphelins(ids));
    if (candidats.length === 0) { supprimes[collection] = 0; continue; }
    const existants = await db.collection('users').find({ id: { $in: candidats } }, { projection: { _id: 0, id: 1 } }).toArray();
    const encoreExistants = new Set(existants.map(u => u.id));
    const confirmes = candidats.filter(id => !encoreExistants.has(id));
    if (confirmes.length === 0) { supprimes[collection] = 0; continue; }
    const { deletedCount } = await db.collection(collection).deleteMany({ [CHAMP_PROPRIETAIRE]: { $in: confirmes } });
    supprimes[collection] = deletedCount;
  }

  const restants = await compterOrphelins(db, await idsComptesExistants(db));
  return { mode: 'reel', avant, supprimes, restants };
}

export function afficherResultat(r, log = console.log) {
  const total = obj => Object.values(obj).reduce((n, v) => n + (typeof v === 'number' ? v : v.documents), 0);
  log(`[Orphelins] mode : ${r.mode === 'reel' ? 'RÉEL' : 'simulation (aucune écriture)'}`);
  log('| Collection | Orphelins | user_id distincts' + (r.mode === 'reel' ? ' | Supprimés | Restants |' : ' |'));
  log('|---|---:|---:' + (r.mode === 'reel' ? '|---:|---:|' : '|'));
  for (const c of COLLECTIONS_UTILISATEUR) {
    const a = r.avant[c];
    log(`| ${c} | ${a.documents} | ${a.userIds}` + (r.mode === 'reel' ? ` | ${r.supprimes[c]} | ${r.restants[c].documents} |` : ' |'));
  }
  log(`Total orphelins : ${total(r.avant)}` + (r.mode === 'reel' ? ` ; supprimés : ${total(r.supprimes)} ; restants : ${total(r.restants)}` : ''));
}

async function main() {
  await import('../env.js');
  const reel = process.argv.includes('--reel');
  if (!process.env.MONGODB_URI) {
    console.error('[Orphelins] MONGODB_URI manquant');
    process.exit(1);
  }
  const { MongoClient } = await import('mongodb');
  const client = new MongoClient(process.env.MONGODB_URI);
  try {
    await client.connect();
    afficherResultat(await purgerOrphelins(client.db('cloveria'), { reel }));
  } catch (err) {
    const connu = ['users_vide', 'users_inaccessible'].includes(err?.message);
    console.error('[Orphelins] arrêt :', connu ? err.message : (err?.codeName || err?.name || 'erreur inconnue'));
    process.exitCode = 1;
  } finally {
    await client.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
