import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };

router.get('/', async (req, res) => {
  const db = await getDb();
  const items = await db.collection('ingredients').find({ user_id: req.userId }, PROJ).toArray();
  res.json(items);
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const item = { id: uuidv4(), user_id: req.userId, ...req.body, createdAt: new Date().toISOString() };
  await db.collection('ingredients').insertOne(item);
  delete item._id;
  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const col = db.collection('ingredients');
  const existing = await col.findOne({ id: req.params.id, user_id: req.userId }, PROJ);
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  const updated = { ...existing, ...req.body, id: req.params.id, user_id: req.userId };
  await col.replaceOne({ id: req.params.id, user_id: req.userId }, updated);

  const newPrix = parseFloat(req.body.prixUnitaire);
  if (!isNaN(newPrix) && newPrix !== existing.prixUnitaire) {
    await db.collection('historique_prix').insertOne({
      user_id: req.userId,
      nom: updated.nom,
      date: new Date().toISOString(),
      prix: newPrix,
      unite: updated.unite,
      fournisseur: req.body.fournisseur || '',
    });
  }
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const result = await db.collection('ingredients').deleteOne({ id: req.params.id, user_id: req.userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Introuvable' });
  res.status(204).send();
});

export default router;
