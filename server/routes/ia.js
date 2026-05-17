import '../env.js';
import express from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __routedir = dirname(fileURLToPath(import.meta.url));
const INGREDIENTS_PATH = join(__routedir, '../data/ingredients.json');

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function matchIngredientPrice(nom, userId) {
  try {
    const all = JSON.parse(readFileSync(INGREDIENTS_PATH, 'utf-8'));
    const pool = all.filter(i => i.user_id === userId || i.user_id === 'demo');
    const normalizedNom = normalize(nom);
    return pool.find(i => normalize(i.nom) === normalizedNom) || null;
  } catch {
    return null;
  }
}

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype);
    cb(ok ? null : new Error('Format non supporté'), ok);
  },
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

router.post('/analyser-facture', upload.single('facture'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });

  const base64 = req.file.buffer.toString('base64');
  const isPDF = req.file.mimetype === 'application/pdf';

  const fileBlock = isPDF
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: req.file.mimetype, data: base64 } };

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: 'Tu es un assistant pour professionnels de la restauration. Analyse cette facture fournisseur et extrais tous les produits alimentaires avec leurs prix. Retourne UNIQUEMENT un JSON valide sans markdown : { "produits": [{ "nom": "string", "quantite": number, "unite": "string", "prix_unitaire": number, "prix_total": number }] }. Omets les produits illisibles ou non alimentaires.',
      messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: 'Analyse cette facture et retourne le JSON des produits.' }] }],
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'Réponse IA invalide', raw: text });

    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('IA error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/structurer', async (req, res) => {
  console.log('Clé API:', process.env.ANTHROPIC_API_KEY ? 'PRÉSENTE' : 'ABSENTE');
  const { description } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: 'Description manquante' });

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: `Tu es un assistant culinaire pour professionnels de la restauration. À partir d'une description libre d'une recette, retourne UNIQUEMENT un JSON valide sans markdown avec cette structure exacte :
{
  "nom": "string",
  "categorie": "Amuse-bouche|Entrée|Plat viande|Plat poisson|Plat végétarien|Dessert|Autre",
  "portions": number,
  "tempsPreparation": number,
  "tempsCuisson": number,
  "description": "string",
  "allergenes": ["gluten"|"lait"|"oeufs"|"arachides"|"poisson"|"crustaces"|"soja"|"fruits_a_coque"],
  "ingredients": [{ "nom": "string", "quantite": number, "unite": "g|kg|ml|cl|L|piece|c.s.|c.c.|botte|tranche|pincée|gousse|feuille|sachet", "prixUnitaire": 0, "tva": 10 }],
  "etapes": ["string"]
}`,
      messages: [{ role: 'user', content: description }],
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'Réponse IA invalide', raw: text });

    const result = JSON.parse(jsonMatch[0]);

    if (Array.isArray(result.ingredients)) {
      result.ingredients = result.ingredients.map(ing => {
        const found = matchIngredientPrice(ing.nom, req.userId);
        if (!found) return ing;
        // Stocke le prix catalogue de référence (€/kg, €/L, €/piece).
        // La conversion d'unités se fait côté client via coutIng().
        return { ...ing, prixUnitaire: found.prixUnitaire };
      });
    }

    res.json(result);
  } catch (err) {
    console.error('IA structurer error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
