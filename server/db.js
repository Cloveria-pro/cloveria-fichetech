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
