import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';
import { authMiddleware } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cloveria-fichetech-secret-2026';
const JWT_EXPIRES = '7d';
const PROJ = { projection: { _id: 0 } };
const PROJ_SAFE = { projection: { _id: 0, password_hash: 0 } };

function makeToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

async function ensureDemoUser() {
  const db = await getDb();
  const col = db.collection('users');
  if (await col.findOne({ email: 'demo@cloveria.fr' })) return;
  const hash = await bcrypt.hash('Demo1234!', 10);
  await col.insertOne({
    id: 'demo',
    email: 'demo@cloveria.fr',
    password_hash: hash,
    etablissement: 'Restaurant CloverIA',
    plan: 'demo',
    food_cost_cible: 30,
    tva_defaut: 10,
    onboardingComplete: true,
    created_at: new Date().toISOString(),
  });
  console.log('Compte demo cree : demo@cloveria.fr / Demo1234!');
}

ensureDemoUser().catch(console.error);

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
  const user = {
    id: uuidv4(),
    email: email.toLowerCase().trim(),
    password_hash: hash,
    etablissement: (etablissement || 'Mon Restaurant').trim(),
    plan: 'free',
    food_cost_cible: 30,
    tva_defaut: 10,
    created_at: new Date().toISOString(),
    prenom: '',
    typeEtablissement: '',
    role: '',
    objectifs: [],
    nbPlats: '',
    foodCostCible: 30,
    onboardingComplete: false,
  };
  await col.insertOne(user);
  delete user._id;
  const token = makeToken(user);
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, etablissement: user.etablissement, onboardingComplete: false },
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  const db = await getDb();
  const col = db.collection('users');
  const user = await col.findOne({ email: email.toLowerCase().trim() }, PROJ);
  if (!user) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Email ou mot de passe incorrect' });

  const token = makeToken(user);
  res.json({
    token,
    user: { id: user.id, email: user.email, etablissement: user.etablissement, onboardingComplete: user.onboardingComplete ?? true },
  });
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

export default router;
