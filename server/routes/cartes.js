import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };
const PROJ_PRIX = { projection: { _id: 0, id: 1, prixVentePratiqueTTC: 1 } };

// La fiche technique est la source de vérité pour prixVente.
// On écrase au moment du GET, sans toucher la base.
function applyFichePrix(carte, recettesMap) {
  return {
    ...carte,
    sections: (carte.sections || []).map(s => ({
      ...s,
      plats: (s.plats || []).map(p => {
        const prixFiche = p.recetteId != null ? recettesMap[p.recetteId] : undefined;
        if (prixFiche != null) return { ...p, prixVente: prixFiche };
        return p;
      }),
    })),
  };
}

router.get('/', async (req, res) => {
  const db = await getDb();
  const [items, recettes] = await Promise.all([
    db.collection('cartes').find({ user_id: req.userId }, PROJ).toArray(),
    db.collection('recettes').find({ user_id: req.userId }, PROJ_PRIX).toArray(),
  ]);
  const recettesMap = Object.fromEntries(recettes.map(r => [r.id, r.prixVentePratiqueTTC]));
  res.json(items.map(c => applyFichePrix(c, recettesMap)));
});

router.get('/:id', async (req, res) => {
  const db = await getDb();
  const [item, recettes] = await Promise.all([
    db.collection('cartes').findOne({ id: req.params.id, user_id: req.userId }, PROJ),
    db.collection('recettes').find({ user_id: req.userId }, PROJ_PRIX).toArray(),
  ]);
  if (!item) return res.status(404).json({ error: 'Introuvable' });
  const recettesMap = Object.fromEntries(recettes.map(r => [r.id, r.prixVentePratiqueTTC]));
  res.json(applyFichePrix(item, recettesMap));
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
