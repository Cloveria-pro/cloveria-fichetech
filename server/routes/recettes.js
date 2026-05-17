import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../data/recettes.json');
const ING_PATH = join(__dirname, '../data/ingredients.json');

function readDB() { return JSON.parse(readFileSync(DB_PATH, 'utf-8')); }
function writeDB(data) { writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8'); }

function norm(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function enrichIngredients(ingredients, userId) {
  let catalog;
  try {
    const all = JSON.parse(readFileSync(ING_PATH, 'utf-8'));
    catalog = all.filter(i => i.user_id === userId || i.user_id === 'demo');
  } catch { return ingredients; }
  return (ingredients || []).map(ing => {
    if (!ing.nom) return ing;
    const found = catalog.find(c => norm(c.nom) === norm(ing.nom));
    return found ? { ...ing, prixUnitaire: found.prixUnitaire } : ing;
  });
}

router.get('/', (req, res) => {
  const list = readDB().filter(r => r.user_id === req.userId);
  res.json(list.map(r => ({ ...r, ingredients: enrichIngredients(r.ingredients, req.userId) })));
});

router.get('/:id', (req, res) => {
  const item = readDB().find(r => r.id === req.params.id && r.user_id === req.userId);
  if (!item) return res.status(404).json({ error: 'Introuvable' });
  res.json({ ...item, ingredients: enrichIngredients(item.ingredients, req.userId) });
});

router.post('/', (req, res) => {
  const db = readDB();
  const item = { id: uuidv4(), user_id: req.userId, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  db.push(item);
  writeDB(db);
  res.status(201).json(item);
});

router.put('/:id', (req, res) => {
  const db = readDB();
  const idx = db.findIndex(r => r.id === req.params.id && r.user_id === req.userId);
  if (idx === -1) return res.status(404).json({ error: 'Introuvable' });
  db[idx] = { ...db[idx], ...req.body, id: req.params.id, user_id: req.userId, updatedAt: new Date().toISOString() };
  writeDB(db);
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
