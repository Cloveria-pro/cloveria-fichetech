import express from 'express';
import bcrypt from 'bcryptjs';
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

function isTestAccount(email) {
  const lower = (email || '').toLowerCase();
  return ['test', 'beuce', 'chez'].some(marker => lower.includes(marker));
}

function computeStatut(u, nbFiches) {
  if (u.subscriptionStatus === 'active') return 'client engagé';
  if (!u.emailVerified) return 'lead';
  if (nbFiches > 0) return 'activé';
  return 'à relancer';
}

router.get('/users', adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.collection('users')
      .find({}, SAFE_PROJECTION)
      .sort({ created_at: -1 })
      .toArray();

    const enriched = await Promise.all(users.map(async (u) => {
      const realFilter = { user_id: u.id, _source: { $ne: 'example' } };
      const [nbFiches, nbIngredients, nbCartes] = await Promise.all([
        db.collection('recettes').countDocuments(realFilter),
        db.collection('ingredients').countDocuments(realFilter),
        db.collection('cartes').countDocuments(realFilter),
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
        examplePackChoice: u.examplePackChoice || null,
        disabled: u.disabled === true,
        statutCommercial: computeStatut(u, nbFiches),
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error('[Admin] GET /users error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-user-password', adminAuth, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email et password requis' });
    if (password.length < 8) return res.status(400).json({ error: 'Mot de passe trop court (8 caractères minimum)' });
    const db = await getDb();
    const hash = await bcrypt.hash(password, 10);
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase().trim() },
      { $set: { password_hash: hash, updated_at: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/disable', adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: req.params.id }, { projection: { _id: 0, id: 1, email: 1, disabled: 1 } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const newState = !user.disabled;
    await db.collection('users').updateOne(
      { id: user.id },
      { $set: { disabled: newState, disabledAt: newState ? new Date().toISOString() : null, updated_at: new Date().toISOString() } }
    );
    res.json({ success: true, disabled: newState, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: req.params.id }, { projection: { _id: 0, id: 1, email: 1 } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    await db.collection('users').deleteOne({ id: user.id });
    res.json({ success: true, deleted: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/test-accounts/:id', adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: req.params.id }, { projection: { _id: 0, id: 1, email: 1 } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (!isTestAccount(user.email)) return res.status(403).json({ error: 'Compte non autorisé à la suppression — email ne correspond pas à un compte test' });
    await db.collection('users').deleteOne({ id: user.id });
    res.json({ success: true, deleted: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/test-accounts', adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const all = await db.collection('users').find({}, { projection: { _id: 0, id: 1, email: 1 } }).toArray();
    const targets = all.filter(u => isTestAccount(u.email));
    if (targets.length === 0) return res.json({ success: true, deleted: 0, emails: [] });
    const ids = targets.map(u => u.id);
    const result = await db.collection('users').deleteMany({ id: { $in: ids } });
    res.json({ success: true, deleted: result.deletedCount, emails: targets.map(u => u.email) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
