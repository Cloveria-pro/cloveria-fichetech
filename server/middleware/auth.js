import jwt from 'jsonwebtoken';
import { getDb } from '../db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'cloveria-fichetech-secret-2026';
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
