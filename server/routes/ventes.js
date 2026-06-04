import express from 'express';
import { getDb } from '../db.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };

// Dérive une date métier YYYY-MM-DD depuis les champs disponibles.
// Priorité : dateDebut → dateFin → createdAt (backfill, source documentée).
function deriveReportDate(dateDebut, dateFin, createdAt) {
  const isDateStr = s => s && /^\d{4}-\d{2}-\d{2}/.test(String(s));
  if (isDateStr(dateDebut)) return { reportDate: String(dateDebut).slice(0, 10), _reportDateSource: 'dateDebut' };
  if (isDateStr(dateFin))   return { reportDate: String(dateFin).slice(0, 10),   _reportDateSource: 'dateFin' };
  return {
    reportDate: (createdAt || new Date().toISOString()).slice(0, 10),
    _reportDateSource: 'backfill', // date approximative — dérivée de createdAt, pas de la période réelle
  };
}

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
  const {
    periode, lignes, dateDebut, dateFin, cartesIds, matchings,
    typePeriode, service, nomFichier, hasLineDates,
    extractedData, sourceFileMimeType,
  } = req.body;
  if (!lignes || !Array.isArray(lignes)) return res.status(400).json({ error: 'lignes requis' });
  try {
    const db = await getDb();
    const now = new Date().toISOString();
    const { reportDate, _reportDateSource } = deriveReportDate(dateDebut, dateFin, now);
    const doc = {
      id: uuidv4(),
      user_id: req.userId,
      // ── champs métier existants ──────────────────────────────────────────
      periode: periode || null,
      lignes,
      dateDebut: dateDebut || null,
      dateFin: dateFin || null,
      cartesIds: Array.isArray(cartesIds) ? cartesIds : [],
      matchings: Array.isArray(matchings) ? matchings : [],
      hasLineDates: hasLineDates === true,
      typePeriode: typePeriode || null,
      service: service || null,
      nomFichier: nomFichier || null,
      statut: 'validé',
      // ── champs enrichis ──────────────────────────────────────────────────
      reportDate,             // YYYY-MM-DD — date métier du rapport
      _reportDateSource,      // 'dateDebut' | 'dateFin' | 'backfill'
      sourceFileName: nomFichier || null,
      sourceFileMimeType: sourceFileMimeType || null,
      extractedData: extractedData || null,  // sortie brute IA avant validation utilisateur
      validatedData: lignes,                 // données confirmées par l'utilisateur
      status: 'validated',
      // ── timestamps ──────────────────────────────────────────────────────
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
  const {
    periode, lignes, dateDebut, dateFin, cartesIds, matchings,
    nomFichier, hasLineDates,
    extractedData, sourceFileMimeType,
  } = req.body;
  if (!lignes || !Array.isArray(lignes)) return res.status(400).json({ error: 'lignes requis' });
  try {
    const db = await getDb();

    // Calcule reportDate seulement si une date exploitable est fournie —
    // sinon on ne touche pas à la valeur existante pour préserver la précision.
    const reportDateUpdate = {};
    const isDateStr = s => s && /^\d{4}-\d{2}-\d{2}/.test(String(s));
    if (isDateStr(dateDebut)) {
      reportDateUpdate.reportDate = String(dateDebut).slice(0, 10);
      reportDateUpdate._reportDateSource = 'dateDebut';
    } else if (isDateStr(dateFin)) {
      reportDateUpdate.reportDate = String(dateFin).slice(0, 10);
      reportDateUpdate._reportDateSource = 'dateFin';
    }

    const setFields = {
      periode: periode || null,
      lignes,
      dateDebut: dateDebut || null,
      dateFin: dateFin || null,
      cartesIds: Array.isArray(cartesIds) ? cartesIds : [],
      matchings: Array.isArray(matchings) ? matchings : [],
      hasLineDates: hasLineDates === true,
      nomFichier: nomFichier || null,
      sourceFileName: nomFichier || null,
      validatedData: lignes,
      updatedAt: new Date().toISOString(),
      ...reportDateUpdate,
    };
    if (sourceFileMimeType !== undefined) setFields.sourceFileMimeType = sourceFileMimeType;
    if (extractedData !== undefined) setFields.extractedData = extractedData;

    const result = await db.collection('ventes_imports').findOneAndUpdate(
      { id: rapportId, user_id: req.userId },
      { $set: setFields },
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
