import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../data/users.json');

const JWT_SECRET = process.env.JWT_SECRET || 'cloveria-fichetech-secret-2026';
const JWT_EXPIRES = '7d';

function readDB() { return JSON.parse(readFileSync(DB_PATH, 'utf-8')); }
function writeDB(data) { writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8'); }

function makeToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, JWT_SECRET, { expiresIn: JWT_EXPIRES });
}

// Auto-seed demo user on first run
async function ensureDemoUser() {
  const users = readDB();
  if (!users.find(u => u.email === 'demo@cloveria.fr')) {
    const hash = await bcrypt.hash('Demo1234!', 10);
    users.push({
      id: 'demo',
      email: 'demo@cloveria.fr',
      password_hash: hash,
      etablissement: 'Restaurant CloverIA',
      plan: 'demo',
      food_cost_cible: 30,
      tva_defaut: 10,
      created_at: new Date().toISOString(),
    });
    writeDB(users);
    console.log('Compte demo cree : demo@cloveria.fr / Demo1234!');
  }
}

ensureDemoUser();

router.post('/register', async (req, res) => {
  const { email, password, etablissement } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });
  if (password.length < 6) return res.status(400).json({ error: 'Mot de passe trop court (6 caractères minimum)' });

  const users = readDB();
  if (users.find(u => u.email.toLowerCase() === email.toLowerCase().trim())) {
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
  users.push(user);
  writeDB(users);

  const token = makeToken(user);
  res.status(201).json({
    token,
    user: { id: user.id, email: user.email, etablissement: user.etablissement },
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email et mot de passe requis' });

  const users = readDB();
  const user = users.find(u => u.email.toLowerCase() === email.toLowerCase().trim());
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
