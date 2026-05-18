import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'cloveria-fichetech-secret-2026';
const JWT_EXPIRES = '7d';
const PROJ = { projection: { _id: 0 } };

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
  };
  await col.insertOne(user);
  const token = makeToken(user);
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, etablissement: user.etablissement },
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
    user: { id: user.id, email: user.email, etablissement: user.etablissement },
  });
});

export default router;
