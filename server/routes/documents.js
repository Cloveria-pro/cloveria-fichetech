import express from 'express';
import { getDb } from '../db.js';

const router = express.Router();

const ALLOWED = {
  factures: 'documents_factures',
  fiches: 'documents_fiches',
  ventes: 'documents_ventes',
};

router.get('/:type', async (req, res) => {
  const col = ALLOWED[req.params.type];
  if (!col) return res.status(400).json({ error: 'Type invalide' });
  try {
    const db = await getDb();
    const docs = await db.collection(col)
      .find({ user_id: req.userId }, { projection: { _id: 0, fileBase64: 0, fileMimeType: 0 } })
      .sort({ dateImport: -1 })
      .toArray();
    res.json(docs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:type/:id/file', async (req, res) => {
  const col = ALLOWED[req.params.type];
  if (!col) return res.status(400).json({ error: 'Type invalide' });
  try {
    const db = await getDb();
    const doc = await db.collection(col).findOne(
      { id: req.params.id, user_id: req.userId },
      { projection: { _id: 0, fileBase64: 1, fileMimeType: 1, nomFichier: 1 } }
    );
    if (!doc) return res.status(404).json({ error: 'Document introuvable' });
    if (!doc.fileBase64) return res.status(404).json({ error: 'Fichier non disponible' });
    res.json({ base64: doc.fileBase64, mimeType: doc.fileMimeType, nomFichier: doc.nomFichier });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:type/:id', async (req, res) => {
  const col = ALLOWED[req.params.type];
  if (!col) return res.status(400).json({ error: 'Type invalide' });
  try {
    const db = await getDb();
    const result = await db.collection(col).deleteOne({ id: req.params.id, user_id: req.userId });
    if (result.deletedCount === 0) return res.status(404).json({ error: 'Document introuvable' });
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
