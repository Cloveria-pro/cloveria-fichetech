import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };
const DEFAULTS = { etablissement: 'Mon Restaurant', foodCostCible: 30, tva: 10 };

router.get('/', async (req, res) => {
  const db = await getDb();
  const entry = await db.collection('parametres').findOne({ user_id: req.userId }, PROJ);
  res.json(entry || { ...DEFAULTS, user_id: req.userId });
});

router.put('/', async (req, res) => {
  const db = await getDb();
  const updated = { ...req.body, user_id: req.userId };
  await db.collection('parametres').replaceOne(
    { user_id: req.userId },
    updated,
    { upsert: true }
  );
  res.json(updated);
});

export default router;
