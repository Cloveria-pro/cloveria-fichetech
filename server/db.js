import { MongoClient } from 'mongodb';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

let _dbPromise = null;

export function getDb() {
  if (!_dbPromise) {
    _dbPromise = (async () => {
      const uri = process.env.MONGODB_URI;
      if (!uri) throw new Error('MONGODB_URI manquant');
      const client = new MongoClient(uri);
      await client.connect();
      const db = client.db('cloveria');
      console.log('[MongoDB] Connecté à cloveria');
      await seedAll(db);
      await db.collection('users').createIndex({ id: 1 }, { unique: true, background: true });
      await migrateVentesImports(db);
      const demoResult = await db.collection('users').updateOne(
        { email: 'demo@cloveria.fr' },
        { $set: { emailVerified: true, onboardingComplete: true } }
      );
      console.log(`[Demo] updateOne demo@cloveria.fr — matched: ${demoResult.matchedCount}, modified: ${demoResult.modifiedCount}`);
      return db;
    })();
  }
  return _dbPromise;
}

async function seedCollection(db, name, file) {
  const count = await db.collection(name).countDocuments();
  if (count > 0) return;
  try {
    const data = JSON.parse(readFileSync(join(__dirname, 'data', file), 'utf-8'));
    if (Array.isArray(data) && data.length > 0) {
      await db.collection(name).insertMany(data);
      console.log(`[Seed] ${name}: ${data.length} documents insérés`);
    }
  } catch (e) {
    console.warn(`[Seed] ${name}: impossible de lire ${file}:`, e.message);
  }
}

// Migration idempotente : enrichit les documents ventes_imports existants
// qui n'ont pas encore reportDate avec les nouveaux champs du modèle enrichi.
// _reportDateSource: 'backfill' = date approximative dérivée de createdAt (pas de la période réelle).
async function migrateVentesImports(db) {
  const isDateStr = s => s && /^\d{4}-\d{2}-\d{2}/.test(String(s));
  const cursor = db.collection('ventes_imports').find(
    { reportDate: { $exists: false } },
    { projection: { _id: 1, dateDebut: 1, dateFin: 1, createdAt: 1, lignes: 1, nomFichier: 1 } }
  );
  let count = 0;
  for await (const doc of cursor) {
    let reportDate, _reportDateSource;
    if (isDateStr(doc.dateDebut)) {
      reportDate = String(doc.dateDebut).slice(0, 10);
      _reportDateSource = 'dateDebut';
    } else if (isDateStr(doc.dateFin)) {
      reportDate = String(doc.dateFin).slice(0, 10);
      _reportDateSource = 'dateFin';
    } else {
      reportDate = (doc.createdAt || new Date().toISOString()).slice(0, 10);
      _reportDateSource = 'backfill';
    }
    await db.collection('ventes_imports').updateOne(
      { _id: doc._id },
      {
        $set: {
          reportDate,
          _reportDateSource,
          sourceFileName: doc.nomFichier || null,
          validatedData: doc.lignes || [],
          status: 'validated',
        },
      }
    );
    count++;
  }
  if (count > 0) console.log(`[Migration] ventes_imports: ${count} doc(s) enrichis (reportDate + metadata)`);
}

async function seedAll(db) {
  await Promise.all([
    seedCollection(db, 'users',           'users.json'),
    seedCollection(db, 'ingredients',     'ingredients.json'),
    seedCollection(db, 'recettes',        'recettes.json'),
    seedCollection(db, 'cartes',          'cartes.json'),
    seedCollection(db, 'parametres',      'parametres.json'),
    seedCollection(db, 'historique_prix', 'historique_prix.json'),
  ]);
}
