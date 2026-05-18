import express from 'express';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));
const PATH = join(__dir, '../data/aliases.json');

function read() {
  try { return JSON.parse(readFileSync(PATH, 'utf-8')); } catch { return []; }
}

const router = express.Router();

router.get('/', (req, res) => {
  res.json(read());
});

router.post('/', (req, res) => {
  const { from, to } = req.body;
  if (!from?.trim() || !to?.trim()) return res.status(400).json({ error: 'from et to requis' });
  const aliases = read();
  const idx = aliases.findIndex(a => a.from.toLowerCase() === from.toLowerCase());
  if (idx >= 0) aliases[idx] = { from: from.trim(), to: to.trim() };
  else aliases.push({ from: from.trim(), to: to.trim() });
  writeFileSync(PATH, JSON.stringify(aliases, null, 2));
  res.json({ from, to });
});

export default router;
