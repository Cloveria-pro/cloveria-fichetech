import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../data/cartes.json');

function readDB() { return JSON.parse(readFileSync(DB_PATH, 'utf-8')); }
function writeDB(data) { writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8'); }

router.get('/', (req, res) => {
  res.json(readDB().filter(c => c.user_id === req.userId));
});

router.get('/:id', (req, res) => {
  const item = readDB().find(r => r.id === req.params.id && r.user_id === req.userId);
  if (!item) return res.status(404).json({ error: 'Introuvable' });
  res.json(item);
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
  db[idx] = { ...db[idx], ...req.body, id: req.params.id, user_id: req.userId };
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
