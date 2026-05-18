import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };

router.get('/', async (req, res) => {
  const db = await getDb();
  const items = await db.collection('cartes').find({ user_id: req.userId }, PROJ).toArray();
  res.json(items);
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const item = await db.collection('cartes').findOne({ id: req.params.id, user_id: req.userId }, PROJ);
  if (!item) return res.status(404).json({ error: 'Introuvable' });
  res.json(item);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const item = { id: uuidv4(), user_id: req.userId, ...req.body, createdAt: new Date().toISOString() };
  await db.collection('cartes').insertOne(item);
  delete item._id;
  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const col = db.collection('cartes');
  const existing = await col.findOne({ id: req.params.id, user_id: req.userId }, PROJ);
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  const updated = { ...existing, ...req.body, id: req.params.id, user_id: req.userId };
  await col.replaceOne({ id: req.params.id, user_id: req.userId }, updated);
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const result = await db.collection('cartes').deleteOne({ id: req.params.id, user_id: req.userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Introuvable' });
  res.status(204).send();
});

export default router;
