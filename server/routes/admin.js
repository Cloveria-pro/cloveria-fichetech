import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || !process.env.ADMIN_SECRET || key !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Accès non autorisé' });
  }
  next();
}

const SAFE_PROJECTION = {
  projection: {
    _id: 0,
    password_hash: 0,
    emailVerificationToken: 0,
    emailVerificationExpiry: 0,
    emailVerificationSentAt: 0,
    stripeCustomerId: 0,
    stripeSubscriptionId: 0,
  },
};

function computeStatut(u, nbFiches) {
  if (u.subscriptionStatus === 'active') return 'client engagé';
  if (u.emailVerified && u.onboardingComplete && nbFiches > 0) return 'activé';
  if (u.emailVerified && u.onboardingComplete && nbFiches === 0) return 'à relancer';
  return 'lead';
}

router.get('/users', adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.collection('users')
      .find({}, SAFE_PROJECTION)
      .sort({ created_at: -1 })
      .toArray();

    const enriched = await Promise.all(users.map(async (u) => {
      const [nbFiches, nbIngredients, nbCartes] = await Promise.all([
        db.collection('recettes').countDocuments({ user_id: u.id }),
        db.collection('ingredients').countDocuments({ user_id: u.id }),
        db.collection('cartes').countDocuments({ user_id: u.id }),
      ]);

      return {
        id: u.id,
        email: u.email,
        etablissement: u.etablissement || '',
        createdAt: u.created_at || null,
        emailVerified: u.emailVerified === true,
        onboardingComplete: u.onboardingComplete === true,
        subscriptionStatus: u.subscriptionStatus || null,
        trialEndDate: u.trialEndDate || null,
        plan: u.plan || null,
        nbFiches,
        nbIngredients,
        nbCartes,
        statutCommercial: computeStatut(u, nbFiches),
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error('[Admin] GET /users error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
