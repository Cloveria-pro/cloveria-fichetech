import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));
const DB_PATH = join(__dirname, '../data/parametres.json');

const DEFAULTS = { etablissement: 'Mon Restaurant', foodCostCible: 30, tva: 10 };

function readDB() { return JSON.parse(readFileSync(DB_PATH, 'utf-8')); }
function writeDB(data) { writeFileSync(DB_PATH, JSON.stringify(data, null, 2), 'utf-8'); }

router.get('/', (req, res) => {
  const db = readDB();
  const entry = db.find(p => p.user_id === req.userId);
  res.json(entry || { ...DEFAULTS, user_id: req.userId });
});

router.put('/', (req, res) => {
  const db = readDB();
  const idx = db.findIndex(p => p.user_id === req.userId);
  const updated = { ...req.body, user_id: req.userId };
  if (idx === -1) db.push(updated);
  else db[idx] = updated;
  writeDB(db);
  res.json(updated);
});

export default router;
