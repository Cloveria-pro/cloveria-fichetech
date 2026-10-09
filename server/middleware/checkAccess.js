import { getDb } from '../db.js';

// Délai de grâce de 7 jours après un premier échec de paiement ('past_due'). Pure, aucune écriture.
// Date absente ou invalide, ou statut différent de 'past_due' : false (pas de délai).
export function delaiDeGraceActif(user, maintenant = Date.now()) {
  if (user?.subscriptionStatus !== 'past_due') return false;
  const depuis = new Date(user?.pastDueSince).getTime();
  if (!Number.isFinite(depuis)) return false;
  const SEPT_JOURS_MS = 7 * 24 * 60 * 60 * 1000;
  return maintenant - depuis < SEPT_JOURS_MS;
}

export async function checkAccess(req, res, next) {
  // Routes exemptées : /auth/* et /stripe/*
  if (req.path.startsWith('/auth') || req.path.startsWith('/stripe')) return next();

  const db = await getDb();
  const user = await db.collection('users').findOne(
    { id: req.userId },
    { projection: { _id: 0, betaAccess: 1, subscriptionStatus: 1, trialEndDate: 1, trialStartDate: 1, pastDueSince: 1 } }
  );

  if (!user) return next();

  // Anciens comptes sans champs trial → accès libre
  if (!user.trialStartDate) return next();

  if (user.betaAccess === true) return next();
  if (user.subscriptionStatus === 'active') return next();
  if (user.subscriptionStatus === 'lifetime') return next();
  if (delaiDeGraceActif(user)) return next();
  if (user.subscriptionStatus === 'trial' && user.trialEndDate && new Date() < new Date(user.trialEndDate)) return next();

  return res.status(403).json({ error: 'trial_expired', trialEndDate: user.trialEndDate });
}
