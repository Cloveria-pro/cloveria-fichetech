import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };

function norm(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

async function syncIngredientsToBase(ingredients, userId, db) {
  if (!ingredients || ingredients.length === 0) return;
  const existing = await db.collection('ingredients')
    .find({ $or: [{ user_id: userId }, { user_id: 'demo' }] }, { projection: { _id: 0, nom: 1 } })
    .toArray();
  const existingNorms = new Set(existing.map(i => norm(i.nom)));
  const seen = new Set();
  for (const ing of ingredients) {
    if (!ing.nom?.trim()) continue;
    const n = norm(ing.nom);
    if (existingNorms.has(n) || seen.has(n)) continue;
    seen.add(n);
    await db.collection('ingredients').insertOne({
      id: uuidv4(),
      user_id: userId,
      nom: ing.nom.trim(),
      prixUnitaire: 0,
      unite: ing.unite || 'g',
      fournisseur: '',
      createdAt: new Date().toISOString(),
    });
  }
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
  const list = await db.collection('recettes').find({ user_id: req.userId }, PROJ).toArray();
  const enriched = await Promise.all(list.map(async r => ({
    ...r,
    ingredients: await enrichIngredients(r.ingredients, req.userId, db),
  })));
  res.json(enriched);
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const item = await db.collection('recettes').findOne({ id: req.params.id, user_id: req.userId }, PROJ);
  if (!item) return res.status(404).json({ error: 'Introuvable' });
  res.json({ ...item, ingredients: await enrichIngredients(item.ingredients, req.userId, db) });
});

router.post('/', async (req, res) => {
  const db = await getDb();
  const item = { id: uuidv4(), user_id: req.userId, ...req.body, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  await db.collection('recettes').insertOne(item);
  delete item._id;
  syncIngredientsToBase(item.ingredients, req.userId, db).catch(() => {});
  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const db = await getDb();
  const col = db.collection('recettes');
  const existing = await col.findOne({ id: req.params.id, user_id: req.userId }, PROJ);
  if (!existing) return res.status(404).json({ error: 'Introuvable' });
  const updated = { ...existing, ...req.body, id: req.params.id, user_id: req.userId, updatedAt: new Date().toISOString() };
  await col.replaceOne({ id: req.params.id, user_id: req.userId }, updated);
  syncIngredientsToBase(updated.ingredients, req.userId, db).catch(() => {});
  res.json(updated);
});

router.put('/:id/prix', async (req, res) => {
  const { prix } = req.body;
  if (prix == null) return res.status(400).json({ error: 'prix requis' });
  const db = await getDb();
  const prixNum = parseFloat(prix) || 0;

  const col = db.collection('recettes');
  const recette = await col.findOne({ id: req.params.id, user_id: req.userId }, PROJ);
  if (!recette) return res.status(404).json({ error: 'Introuvable' });

  const updatedRecette = { ...recette, prixVentePratiqueTTC: prixNum, updatedAt: new Date().toISOString() };
  await col.replaceOne({ id: req.params.id, user_id: req.userId }, updatedRecette);

  const cartes = await db.collection('cartes').find({ user_id: req.userId }, PROJ).toArray();
  for (const carte of cartes) {
    let changed = false;
    const sections = (carte.sections || []).map(s => ({
      ...s,
      plats: s.plats.map(p => {
        if (p.recetteId === req.params.id) { changed = true; return { ...p, prixVente: prixNum }; }
        return p;
      }),
    }));
    if (changed) await db.collection('cartes').replaceOne({ id: carte.id, user_id: req.userId }, { ...carte, sections });
  }

  res.json({ recette: updatedRecette });
});

router.delete('/:id', async (req, res) => {
  const db = await getDb();
  const result = await db.collection('recettes').deleteOne({ id: req.params.id, user_id: req.userId });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Introuvable' });
  res.status(204).send();
});

export default router;
