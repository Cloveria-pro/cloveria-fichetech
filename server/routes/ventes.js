import express from 'express';
import { getDb } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const items = await db.collection('ventes_imports')
      .find({ user_id: req.userId }, PROJ)
      .sort({ createdAt: -1 })
      .toArray();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { periode, lignes } = req.body;
  if (!lignes || !Array.isArray(lignes)) return res.status(400).json({ error: 'lignes requis' });
  try {
    const db = await getDb();
    const doc = {
      id: uuidv4(),
      user_id: req.userId,
      periode: periode || null,
      lignes,
      createdAt: new Date().toISOString(),
    };
    await db.collection('ventes_imports').insertOne(doc);
    delete doc._id;
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
