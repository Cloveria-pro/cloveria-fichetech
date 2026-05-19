import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };

function norm(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

async function enrichIngredients(ingredients, userId, db) {
  if (!ingredients || ingredients.length === 0) return ingredients || [];
  const catalog = await db.collection('ingredients')
    .find({ $or: [{ user_id: userId }, { user_id: 'demo' }] }, PROJ)
    .toArray();
  return ingredients.map(ing => {
    if (!ing.nom) return ing;
    const found = catalog.find(c => norm(c.nom) === norm(ing.nom));
    return found
      ? { ...ing, prixUnitaire: found.prixUnitaire }
      : { ...ing, prixUnitaire: ing.prixUnitaire ?? 0 };
  });
}

router.get('/', async (req, res) => {
  const db = await getDb();
  const items = await db.collection('sous_recettes').find({ user_id: req.userId }, PROJ).toArray();
  const enriched = await Promise.all(items.map(async sr => ({
    ...sr,
    ingredients: await enrichIngredients(sr.ingredients, req.userId, db),
  })));
  res.json(enriched);
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const item = await db.collection('sous_recettes').findOne({ id: req.params.id, user_id: req.userId }, PROJ);
  if (!item) return res.status(404).json({ error: 'Introuvable' });
  res.json({ ...item, ingredients: await enrichIngredients(item.ingredients, req.userId, db) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const item = {
    id: uuidv4(),
    user_id: req.userId,
    ...req.body,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await db.collection('sous_recettes').insertOne(item);
  delete item._id;
  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const col = db.collection('sous_recettes');
  const existing = await col.findOne({ id: req.params.id, user_id: req.userId }, PROJ);
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  const updated = {
    ...existing,
    ...req.body,
    id: req.params.id,
    user_id: req.userId,
    updatedAt: new Date().toISOString(),
  };
  await col.replaceOne({ id: req.params.id, user_id: req.userId }, updated);
  res.json(updated);
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const result = await db.collection('sous_recettes').deleteOne({ id: req.params.id, user_id: req.userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Introuvable' });
  res.status(204).send();
});

export default router;
