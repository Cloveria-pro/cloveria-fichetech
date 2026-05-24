import express from 'express';
import { getDb } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };

router.get('/', async (req, res) => {
  try {
    const db = await getDb();
    const items = await db.collection('agenda')
      .find({ user_id: req.userId }, PROJ)
      .sort({ date: 1, createdAt: 1 })
      .toArray();
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  const { type, categorie, titre, description, date, dateFin, heure, statut } = req.body;
  if (!titre) return res.status(400).json({ error: 'titre requis' });
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const doc = {
      id: uuidv4(),
      user_id: req.userId,
      type: type || 'note',
      categorie: categorie || null,
      titre,
      description: description || null,
      date: date || null,
      dateFin: type === 'evenement' ? (dateFin || null) : null,
      heure: heure || null,
      statut: type === 'rappel' ? (statut || 'a_faire') : null,
      createdAt: now,
      updatedAt: now,
    };
    await db.collection('agenda').insertOne(doc);
    delete doc._id;
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { type, categorie, titre, description, date, dateFin, heure, statut } = req.body;
  if (!titre) return res.status(400).json({ error: 'titre requis' });
  try {
    const db = await getDb();
    const result = await db.collection('agenda').findOneAndUpdate(
      { id, user_id: req.userId },
      {
        $set: {
          type: type || 'note',
          categorie: categorie || null,
          titre,
          description: description || null,
          date: date || null,
          dateFin: type === 'evenement' ? (dateFin || null) : null,
          heure: heure || null,
          statut: type === 'rappel' ? (statut || 'a_faire') : null,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    if (!result) return res.status(404).json({ error: 'Élément non trouvé' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const db = await getDb();
    const result = await db.collection('agenda').deleteOne({ id, user_id: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Élément non trouvé' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
