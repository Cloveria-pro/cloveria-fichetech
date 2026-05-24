import express from 'express';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';

const router = express.Router();
const __dirname = dirname(fileURLToPath(import.meta.url));

function loadPack() {
  return JSON.parse(readFileSync(join(__dirname, '../data/example_pack.json'), 'utf-8'));
}

function isoDate(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

router.post('/inject-example', async (req, res) => {
  try {
    const db = await getDb();
    const userId = req.userId;

    const user = await db.collection('users').findOne(
      { id: userId },
      { projection: { _id: 0, examplePackChoice: 1 } }
    );
    if (user?.examplePackChoice) {
      return res.status(409).json({ error: 'Pack déjà appliqué' });
    }

    const pack = loadPack();
    const now = new Date().toISOString();

    // ── Ingrédients ──────────────────────────────────────────────────────────
    const ingredients = pack.ingredients.map(({ id: _id, user_id: _uid, ...rest }) => ({
      ...rest,
      id: uuidv4(),
      user_id: userId,
      createdAt: now,
    }));
    if (ingredients.length > 0) {
      await db.collection('ingredients').insertMany(ingredients);
    }

    // ── Sous-recettes ────────────────────────────────────────────────────────
    const sousRecettes = pack.sousRecettes.map(({ id: _id, user_id: _uid, ...rest }) => ({
      ...rest,
      id: uuidv4(),
      user_id: userId,
      createdAt: now,
      updatedAt: now,
    }));
    if (sousRecettes.length > 0) {
      await db.collection('sous_recettes').insertMany(sousRecettes);
    }

    // ── Recettes — génère les IDs et construit le mapping ────────────────────
    const recetteIdMap = {};
    const recettes = pack.recettes.map(({ id: oldId, user_id: _uid, ...rest }) => {
      const newId = uuidv4();
      recetteIdMap[oldId] = newId;
      return { ...rest, id: newId, user_id: userId, createdAt: now, updatedAt: now };
    });
    if (recettes.length > 0) {
      await db.collection('recettes').insertMany(recettes);
    }

    // ── Carte — remplace les recetteId via le mapping ────────────────────────
    const { id: _cid, user_id: _cuid, ...carteRest } = pack.carte;
    const carte = {
      ...carteRest,
      id: uuidv4(),
      user_id: userId,
      sections: carteRest.sections.map(section => ({
        ...section,
        plats: section.plats.map(plat => ({
          ...plat,
          recetteId: recetteIdMap[plat.recetteId] ?? plat.recetteId,
        })),
      })),
      createdAt: now,
    };
    await db.collection('cartes').insertOne(carte);

    // ── Agenda ───────────────────────────────────────────────────────────────
    const agendaItems = pack.agendaItems.map(({ _daysOffset, statut, ...item }) => {
      const date = _daysOffset != null ? isoDate(_daysOffset) : null;
      return {
        id: uuidv4(),
        user_id: userId,
        type: item.type,
        categorie: item.categorie || null,
        titre: item.titre,
        description: item.description || null,
        date,
        dateFin: item.type === 'evenement' ? null : null,
        heure: item.heure || null,
        statut: (item.type === 'rappel' || item.type === 'note') ? (statut || 'a_faire') : null,
        createdAt: now,
        updatedAt: now,
      };
    });
    if (agendaItems.length > 0) {
      await db.collection('agenda').insertMany(agendaItems);
    }

    // ── Marquer le choix ─────────────────────────────────────────────────────
    await db.collection('users').updateOne(
      { id: userId },
      { $set: { examplePackChoice: 'example', updated_at: now } }
    );

    res.json({ success: true });
  } catch (err) {
    console.error('[Onboarding] inject-example error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/skip-example', async (req, res) => {
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    await db.collection('users').updateOne(
      { id: req.userId },
      { $set: { examplePackChoice: 'blank', updated_at: now } }
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
