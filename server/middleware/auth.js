import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

// En production (Render ou NODE_ENV=production), JWT_SECRET est obligatoire : pas de clé de repli.
// En local, le repli est conservé pour ne pas casser le développement.
export function resolveJwtSecret(env = process.env) {
  if (env.JWT_SECRET) return env.JWT_SECRET;
  if (env.RENDER || env.NODE_ENV === 'production') {
    throw new Error('[Auth] JWT_SECRET manquant en production : définir la variable d\'environnement JWT_SECRET. Démarrage interrompu.');
  }
  return 'cloveria-fichetech-secret-2026';
}

export const JWT_SECRET = resolveJwtSecret();
const SEEN_THROTTLE_MS = 5 * 60 * 1000;

export function authMiddleware(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Non authentifié' });
  }
  const token = auth.slice(7);
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.userId = payload.userId;
    next();
    updateLastSeen(payload.userId);
  } catch {
    return res.status(401).json({ error: 'Token invalide ou expiré' });
  }
}

async function updateLastSeen(userId) {
  try {
    const db = await getDb();
    const threshold = new Date(Date.now() - SEEN_THROTTLE_MS).toISOString();
    await db.collection('users').updateOne(
      { id: userId, $or: [{ lastSeenAt: { $exists: false } }, { lastSeenAt: { $lt: threshold } }] },
      { $set: { lastSeenAt: new Date().toISOString() } }
    );
  } catch { /* silencieux */ }
}
