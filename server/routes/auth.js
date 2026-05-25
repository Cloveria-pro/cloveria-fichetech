import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes, createHash } from 'crypto';
import { getDb } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';
import { envoyerConfirmationEmail, envoyerResetEmail } from '../emails/verification.js';

const router = express.Router();

function hashResetToken(raw) {
  return createHash('sha256').update(raw).digest('hex');
}

// Rate limiter in-memory : max 3 demandes par IP par fenêtre de 15 minutes
const forgotPasswordAttempts = new Map();
function forgotPasswordRateLimit(req, res, next) {
  const ip = req.ip || req.headers['x-forwarded-for'] || 'unknown';
  const now = Date.now();
  const WINDOW = 15 * 60 * 1000;
  const MAX = 3;
  const entry = forgotPasswordAttempts.get(ip) || { count: 0, resetAt: now + WINDOW };
  if (now > entry.resetAt) {
    entry.count = 0;
    entry.resetAt = now + WINDOW;
  }
  entry.count += 1;
  forgotPasswordAttempts.set(ip, entry);
  if (entry.count > MAX) {
    return res.status(429).json({ error: 'Trop de demandes. Réessayez dans 15 minutes.' });
  }
  next();
}
const JWT_SECRET = process.env.JWT_SECRET || 'cloveria-fichetech-secret-2026';
const JWT_EXPIRES = '7d';
const PROJ = { projection: { _id: 0 } };
const PROJ_SAFE = { projection: { _id: 0, password_hash: 0 } };

function makeToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}


router.post('/register', async (req, res) => {
  const { email, password, etablissement } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
  if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum)' });

  const db = await getDb();
  const col = db.collection('users');
  if (await col.findOne({ email: email.toLowerCase().trim() })) {
    return res.status(409).json({ error: 'Un compte existe déjà avec cet email' });
  }

  const hash = await bcrypt.hash(password, 10);
  const now = new Date();
  const trialEnd = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const user = {
    id: uuidv4(),
    email: email.toLowerCase().trim(),
    password_hash: hash,
    etablissement: (etablissement || 'Mon Restaurant').trim(),
    plan: 'free',
    food_cost_cible: 30,
    tva_defaut: 10,
    created_at: now.toISOString(),
    prenom: '',
    typeEtablissement: '',
    role: '',
    objectifs: [],
    nbPlats: '',
    foodCostCible: 30,
    onboardingComplete: false,
    trialStartDate: now.toISOString(),
    trialEndDate: trialEnd.toISOString(),
    subscriptionStatus: 'trial',
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    betaAccess: false,
    emailsEnvoyes: [],
    emailVerified: false,
    emailVerificationToken: randomBytes(32).toString('hex'),
    emailVerificationExpiry: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
    emailVerificationSentAt: now.toISOString(),
  };
  await col.insertOne(user);
  delete user._id;
  envoyerConfirmationEmail(user.email, user.emailVerificationToken).catch(console.error);
  const token = makeToken(user);
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, etablissement: user.etablissement, onboardingComplete: false, emailVerified: false },
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  const db = await getDb();
  const col = db.collection('users');
  const user = await col.findOne({ email: email.toLowerCase().trim() }, PROJ);
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  if (user.disabled) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const token = makeToken(user);
  res.json({
    token,
    user: { id: user.id, email: user.email, etablissement: user.etablissement, onboardingComplete: user.onboardingComplete ?? true, emailVerified: user.emailVerified !== false },
  });
});

router.delete('/delete-test-account', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email requis' });
  const lower = email.toLowerCase();
  if (!lower.includes('test') && !lower.includes('beuce') && !lower.includes('chez')) {
    return res.status(403).json({ error: 'Suppression non autorisée pour cet email' });
  }
  const db = await getDb();
  const result = await db.collection('users').deleteOne({ email: lower.trim() });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Compte introuvable' });
  res.json({ success: true, deleted: lower.trim() });
});

router.post('/forgot-password', forgotPasswordRateLimit, async (req, res) => {
  const { email } = req.body;
  const NEUTRAL = { message: 'Si cet email existe, un lien de réinitialisation a été envoyé.' };
  if (!email) return res.json(NEUTRAL);

  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ email: email.toLowerCase().trim() }, PROJ);
    if (user) {
      const rawToken = randomBytes(32).toString('hex');
      const tokenHash = hashResetToken(rawToken);
      const expiry = new Date(Date.now() + 60 * 60 * 1000).toISOString();
      await db.collection('users').updateOne(
        { id: user.id },
        { $set: { passwordResetToken: tokenHash, passwordResetExpiry: expiry } }
      );
      envoyerResetEmail(user.email, rawToken).catch(console.error);
    }
  } catch (err) {
    console.error('[ForgotPassword]', err.message);
  }
  res.json(NEUTRAL);
});

router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token et mot de passe requis' });
  if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum)' });

  const db = await getDb();
  const col = db.collection('users');
  const tokenHash = hashResetToken(token);
  const user = await col.findOne({ passwordResetToken: tokenHash }, PROJ);
  if (!user) return res.status(400).json({ error: 'Lien invalide ou déjà utilisé' });
  if (new Date(user.passwordResetExpiry) < new Date()) {
    return res.status(400).json({ error: 'Lien expiré. Demandez un nouveau lien depuis la page de connexion.' });
  }

  const hash = await bcrypt.hash(password, 10);
  await col.updateOne(
    { id: user.id },
    {
      $set: { password_hash: hash, updated_at: new Date().toISOString() },
      $unset: { passwordResetToken: '', passwordResetExpiry: '' },
    }
  );
  res.json({ success: true });
});

router.get('/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token manquant' });

  const db = await getDb();
  const col = db.collection('users');
  const user = await col.findOne({ emailVerificationToken: token }, PROJ);
  if (!user) return res.status(400).json({ error: 'Lien invalide ou déjà utilisé' });
  if (new Date(user.emailVerificationExpiry) < new Date()) {
    return res.status(400).json({ error: 'Lien expiré. Demandez un nouveau lien depuis l\'application.' });
  }

  await col.updateOne({ id: user.id }, {
    $set: { emailVerified: true },
    $unset: { emailVerificationToken: '', emailVerificationExpiry: '', emailVerificationSentAt: '' },
  });
  res.json({ success: true });
});

router.post('/resend-verification', authMiddleware, async (req, res) => {
  const db = await getDb();
  const col = db.collection('users');
  const user = await col.findOne({ id: req.userId }, PROJ);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  if (user.emailVerified) return res.status(400).json({ error: 'Email déjà vérifié' });

  const now = new Date();
  if (user.emailVerificationSentAt) {
    const elapsed = now.getTime() - new Date(user.emailVerificationSentAt).getTime();
    if (elapsed < 60 * 1000) {
      const wait = Math.ceil((60 * 1000 - elapsed) / 1000);
      return res.status(429).json({ error: `Veuillez patienter ${wait} secondes avant de renvoyer l'email.` });
    }
  }

  const newToken = randomBytes(32).toString('hex');
  await col.updateOne({ id: req.userId }, {
    $set: {
      emailVerificationToken: newToken,
      emailVerificationExpiry: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(),
      emailVerificationSentAt: now.toISOString(),
    },
  });
  envoyerConfirmationEmail(user.email, newToken).catch(console.error);
  res.json({ success: true });
});

router.get('/profil', authMiddleware, async (req, res) => {
  const db = await getDb();
  const user = await db.collection('users').findOne({ id: req.userId }, PROJ_SAFE);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(user);
});

router.put('/profil', authMiddleware, async (req, res) => {
  const db = await getDb();
  const col = db.collection('users');
  const existing = await col.findOne({ id: req.userId }, { projection: { _id: 0 } });
  if (!existing) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const ALLOWED = ['prenom', 'etablissement', 'typeEtablissement', 'role', 'objectifs', 'nbPlats', 'foodCostCible', 'onboardingComplete', 'sourceDecouverte'];
  const updates = {};
  for (const key of ALLOWED) {
    if (req.body[key] !== undefined) updates[key] = req.body[key];
  }

  const updated = { ...existing, ...updates, updated_at: new Date().toISOString() };
  await col.replaceOne({ id: req.userId }, updated);

  if (updates.foodCostCible !== undefined) {
    const paramCol = db.collection('parametres');
    const params = await paramCol.findOne({ user_id: req.userId });
    const newParams = { ...(params || {}), user_id: req.userId, foodCostCible: updates.foodCostCible };
    delete newParams._id;
    await paramCol.replaceOne({ user_id: req.userId }, newParams, { upsert: true });
  }

  const { password_hash, ...profile } = updated;
  res.json(profile);
});

router.delete('/account', authMiddleware, async (req, res) => {
  const { password } = req.body;
  if (!password) return res.status(400).json({ error: 'Mot de passe requis' });

  const db = await getDb();
  const col = db.collection('users');
  const user = await col.findOne({ id: req.userId }, PROJ);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Mot de passe incorrect' });

  await col.deleteOne({ id: user.id });
  res.json({ success: true });
});

export default router;
