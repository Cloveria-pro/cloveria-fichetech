import '../env.js';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';

const newPassword = process.env.NEW_PASSWORD;
if (!newPassword || newPassword.length < 8) {
  console.error('Erreur : définissez NEW_PASSWORD (min 8 caractères) avant de lancer ce script.');
  process.exit(1);
}

const db = await getDb();
const hash = await bcrypt.hash(newPassword, 10);
const result = await db.collection('users').updateOne(
  { email: 'demo@cloveria.fr' },
  { $set: { password_hash: hash, updated_at: new Date().toISOString() } }
);

if (result.matchedCount === 0) {
  console.error('Compte demo@cloveria.fr introuvable en base.');
  process.exit(1);
}
console.log('Mot de passe du compte demo mis à jour avec succès.');
process.exit(0);
