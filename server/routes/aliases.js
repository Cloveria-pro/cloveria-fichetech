import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };

router.get('/', async (req, res) => {
  const db = await getDb();
  const items = await db.collection('aliases').find({}, PROJ).toArray();
  res.json(items);
});

router.post('/', async (req, res) => {
  const { from, to } = req.body;
  if (!from?.trim() || !to?.trim()) return res.status(400).json({ error: 'from et to requis' });
  const db = await getDb();
  await db.collection('aliases').replaceOne(
    { from: from.trim() },
    { from: from.trim(), to: to.trim() },
    { upsert: true }
  );
  res.json({ from: from.trim(), to: to.trim() });
});

export default router;
