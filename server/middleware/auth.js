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
    const user = await db.collection('users').findOne({ id: userId }, { projection: { _id: 0, lastSeenAt: 1 } });
    if (!user) return;
    const now = Date.now();
    if (user.lastSeenAt && now - new Date(user.lastSeenAt).getTime() < SEEN_THROTTLE_MS) return;
    await db.collection('users').updateOne({ id: userId }, { $set: { lastSeenAt: new Date(now).toISOString() } });
  } catch { /* silencieux */ }
}
