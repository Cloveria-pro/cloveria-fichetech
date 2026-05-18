import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PATH = join(__dirname, '../data/historique_prix.json');

function readDB() {
  try { return JSON.parse(readFileSync(PATH, 'utf-8')); } catch { return []; }
}
function writeDB(data) { writeFileSync(PATH, JSON.stringify(data, null, 2), 'utf-8'); }

const router = express.Router();

router.get('/', (req, res) => {
  const all = readDB();
  const nom = req.query.nom;
  const filtered = nom
    ? all.filter(e => e.user_id === req.userId && e.nom.toLowerCase() === nom.toLowerCase())
    : all.filter(e => e.user_id === req.userId);
  res.json(filtered.sort((a, b) => new Date(a.date) - new Date(b.date)));
});

router.post('/', (req, res) => {
  const { nom, prix, unite, fournisseur } = req.body;
  if (!nom || prix == null) return res.status(400).json({ error: 'nom et prix requis' });
  const db = readDB();
  const entry = {
    user_id: req.userId,
    nom,
    date: new Date().toISOString().slice(0, 10),
    prix: parseFloat(prix),
    unite: unite || 'kg',
    fournisseur: fournisseur || '',
  };
  db.push(entry);
  writeDB(db);
  res.status(201).json(entry);
});

export default router;
