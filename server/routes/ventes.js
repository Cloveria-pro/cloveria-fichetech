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
  const { periode, lignes, dateDebut, dateFin, cartesIds, matchings, typePeriode, service, nomFichier } = req.body;
  if (!lignes || !Array.isArray(lignes)) return res.status(400).json({ error: 'lignes requis' });
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const doc = {
      id: uuidv4(),
      user_id: req.userId,
      periode: periode || null,
      lignes,
      dateDebut: dateDebut || null,
      dateFin: dateFin || null,
      cartesIds: Array.isArray(cartesIds) ? cartesIds : [],
      matchings: Array.isArray(matchings) ? matchings : [],
      typePeriode: typePeriode || null,
      service: service || null,
      nomFichier: nomFichier || null,
      statut: 'validé',
      createdAt: now,
      updatedAt: now,
    };
    await db.collection('ventes_imports').insertOne(doc);
    delete doc._id;
    res.status(201).json(doc);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:rapportId', async (req, res) => {
  const { rapportId } = req.params;
  const { periode, lignes, dateDebut, dateFin, cartesIds, matchings, nomFichier } = req.body;
  if (!lignes || !Array.isArray(lignes)) return res.status(400).json({ error: 'lignes requis' });
  try {
    const db = await getDb();
    const result = await db.collection('ventes_imports').findOneAndUpdate(
      { id: rapportId, user_id: req.userId },
      {
        $set: {
          periode: periode || null,
          lignes,
          dateDebut: dateDebut || null,
          dateFin: dateFin || null,
          cartesIds: Array.isArray(cartesIds) ? cartesIds : [],
          matchings: Array.isArray(matchings) ? matchings : [],
          nomFichier: nomFichier || null,
          updatedAt: new Date().toISOString(),
        },
      },
      { returnDocument: 'after', projection: { _id: 0 } }
    );
    if (!result) return res.status(404).json({ error: 'Rapport non trouvé' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:rapportId', async (req, res) => {
  const { rapportId } = req.params;
  try {
    const db = await getDb();
    const result = await db.collection('ventes_imports').deleteOne({ id: rapportId, user_id: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Rapport non trouvé' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
