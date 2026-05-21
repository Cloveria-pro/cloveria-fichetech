import { getDb } from '../db.js';

export async function checkAccess(req, res, next) {
  // Routes exemptées : /auth/* et /stripe/*
  if (req.path.startsWith('/auth') || req.path.startsWith('/stripe')) return next();

  const db = await getDb();
  const user = await db.collection('users').findOne(
    { id: req.userId },
    { projection: { _id: 0, betaAccess: 1, subscriptionStatus: 1, trialEndDate: 1, trialStartDate: 1 } }
  );

  if (!user) return next();

  // Anciens comptes sans champs trial → accès libre
  if (!user.trialStartDate) return next();

  if (user.betaAccess === true) return next();
  if (user.subscriptionStatus === 'active') return next();
  if (user.subscriptionStatus === 'trial' && user.trialEndDate && new Date() < new Date(user.trialEndDate)) return next();

  return res.status(403).json({ error: 'trial_expired', trialEndDate: user.trialEndDate });
}
