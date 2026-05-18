import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };

router.get('/', async (req, res) => {
  const db = await getDb();
  const filter = { user_id: req.userId };
  if (req.query.nom) filter.nom = { $regex: new RegExp(`^${req.query.nom}$`, 'i') };
  const items = await db.collection('historique_prix').find(filter, PROJ).toArray();
  res.json(items.sort((a, b) => new Date(a.date) - new Date(b.date)));
});

router.post('/', async (req, res) => {
  const { nom, prix, unite, fournisseur } = req.body;
  if (!nom || prix == null) return res.status(400).json({ error: 'nom et prix requis' });
  const db = await getDb();
  const entry = {
    user_id: req.userId,
    nom,
    date: new Date().toISOString(),
    prix: parseFloat(prix),
    unite: unite || 'kg',
    fournisseur: fournisseur || '',
  };
  await db.collection('historique_prix').insertOne(entry);
  delete entry._id;
  res.status(201).json(entry);
});

router.delete('/', async (req, res) => {
  const { nom, date } = req.query;
  if (!nom || !date) return res.status(400).json({ error: 'nom et date requis' });
  const db = await getDb();
  const result = await db.collection('historique_prix').deleteOne({ user_id: req.userId, nom, date });
  if (result.deletedCount === 0) return res.status(404).json({ error: 'Introuvable' });
  res.status(204).send();
});

export default router;
