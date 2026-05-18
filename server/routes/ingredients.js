import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../data/ingredients.json');
const HIST_PATH = join(__dirname, '../data/historique_prix.json');

function readHist() {
  try { return JSON.parse(readFileSync(HIST_PATH, 'utf-8')); } catch { return []; }
}
function appendHist(entry) {
  const hist = readHist();
  hist.push(entry);
  writeFileSync(HIST_PATH, JSON.stringify(hist, null, 2), 'utf-8');
}

function readDB() { return JSON.parse(readFileSync(DB_PATH, 'utf-8')); }
function writeDB(data) { writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8'); }

router.get('/', (req, res) => {
  res.json(readDB().filter(i => i.user_id === req.userId));
});

router.post('/', (req, res) => {
  const db = readDB();
  const item = { id: uuidv4(), user_id: req.userId, ...req.body, createdAt: new Date().toISOString() };
  db.push(item);
  writeDB(db);
  res.status(201).json(item);
});

router.put('/:id', (req, res) => {
  const db = readDB();
  const idx = db.findIndex(r => r.id === req.params.id && r.user_id === req.userId);
  if (idx === -1) return res.status(404).json({ error: 'Introuvable' });
  const prev = db[idx];
  db[idx] = { ...prev, ...req.body, id: req.params.id, user_id: req.userId };
  writeDB(db);
  const newPrix = parseFloat(req.body.prixUnitaire);
  if (!isNaN(newPrix) && newPrix !== prev.prixUnitaire) {
    appendHist({
      user_id: req.userId,
      nom: db[idx].nom,
      date: new Date().toISOString().slice(0, 10),
      prix: newPrix,
      unite: db[idx].unite,
      fournisseur: req.body.fournisseur || '',
    });
  }
  res.json(db[idx]);
});

router.delete('/:id', (req, res) => {
  const db = readDB();
  const idx = db.findIndex(r => r.id === req.params.id && r.user_id === req.userId);
  if (idx === -1) return res.status(404).json({ error: 'Introuvable' });
  db.splice(idx, 1);
  writeDB(db);
  res.status(204).send();
});

export default router;
