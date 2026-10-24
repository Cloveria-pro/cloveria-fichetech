import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };
const DEFAULTS = { etablissement: 'Mon Restaurant', foodCostCible: 30, tva: 10 };

const nonVide = (v) => typeof v === 'string' && v.trim() !== '';

// Toujours une valeur pour etablissement, tva et foodCostCible.
// etablissement : profil (users) d'abord, car c'est là que Paramètres l'enregistre, puis document parametres, puis défaut.
router.get('/', async (req, res) => {
  const db = await getDb();
  const [entry, user] = await Promise.all([
    db.collection('parametres').findOne({ user_id: req.userId }, PROJ),
    db.collection('users').findOne({ id: req.userId }, { projection: { _id: 0, etablissement: 1 } }),
  ]);
  const doc = entry || {};
  res.json({
    ...DEFAULTS,
    ...doc,
    user_id: req.userId,
    etablissement: nonVide(user?.etablissement) ? user.etablissement
      : nonVide(doc.etablissement) ? doc.etablissement
      : DEFAULTS.etablissement,
    tva: doc.tva ?? DEFAULTS.tva,
    foodCostCible: doc.foodCostCible ?? DEFAULTS.foodCostCible,
  });
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
