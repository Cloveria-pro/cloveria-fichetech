import '../env.js';
import express from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { getDb } from '../db.js';

function normalize(str) {
  return str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

async function matchIngredientPrice(nom, userId) {
  try {
    const db = await getDb();
    const pool = await db.collection('ingredients')
      .find({ $or: [{ user_id: userId }, { user_id: 'demo' }] }, { projection: { _id: 0 } })
      .toArray();
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
      system: `Tu es un expert culinaire et gastronomique mondial avec 20 ans d'expérience dans tous les types de restauration : gastronomie étoilée, brasserie, bistrot, fast-food, street food, restauration collective, cuisine du monde. Tu maîtrises toutes les cuisines et techniques culinaires mondiales.

À partir d'une description libre d'une recette, retourne UNIQUEMENT un JSON valide sans markdown avec cette structure exacte :
{
  "nom": "string",
  "categorie": "Amuse-bouche|Entrée|Plat viande|Plat poisson|Plat végétarien|Dessert|Autre",
  "portions": number,
  "tempsPreparation": number,
  "tempsCuisson": number,
  "description": "string",
  "description_commerciale": "string",
  "allergenes": ["gluten"|"crustaces"|"oeufs"|"poisson"|"arachides"|"soja"|"lait"|"fruits_a_coque"|"celeri"|"moutarde"|"sesame"|"sulfites"|"lupin"|"mollusques"],
  "ingredients": [{ "nom": "string", "quantite": number, "unite": "g|kg|ml|cl|L|piece|c.s.|c.c.|botte|tranche|pincée|gousse|feuille|sachet", "prixUnitaire": 0, "tva": 10 }],
  "etapes": ["string"]
}

RÈGLE ABSOLUE sur les temps de cuisson :
Analyse chaque ingrédient de la recette un par un. Le temps de cuisson est la somme des cuissons réelles nécessaires. Si aucun ingrédient n'est soumis à une source de chaleur directe, le temps de cuisson est 0. Exemples : salade melon prosciutto burrata = 0 min de cuisson. Burger = 8-10 min (cuisson du steak). Pasta carbonara = 12 min (cuisson des pâtes). Ne jamais inventer un temps de cuisson.

RÈGLE ABSOLUE sur les temps de préparation :
Sois réaliste et proportionnel à la complexité. Salade simple = 5-10 min. Plat avec sauce = 20-30 min. Plat complexe avec plusieurs éléments = 45-60 min+.

description_commerciale : 2 à 3 phrases simples et naturelles pour donner envie au client. Parle des goûts, des textures, de ce que ça évoque. Ton naturel et chaleureux, comme un ami qui recommande un plat. JAMAIS de termes techniques, JAMAIS de méthodes de cuisson, JAMAIS de températures ou de temps. JAMAIS les mots : sublimé, nappé, réalisé, élaboré, déglacer, thermoplongeur, bain-marie, blanchir, monter, infuser, chiffonnade.

Exemples corrects :
- Cromesquis foie gras : "Un petit bouchée croustillante avec du foie gras fondant à l'intérieur et une touche sucrée de gelée de Sauternes. Parfait pour démarrer le repas."
- Magret canard : "Du magret de canard avec une sauce au miel et vinaigre balsamique, servi avec une purée de patate douce. C'est doux, savoureux et bien généreux."
- Salade pastèque feta : "Une salade fraîche avec de la pastèque, de la feta et de la menthe. Simple, légère et pleine de goût — parfaite pour l'été."
- Burger : "Un burger avec un steak maison, des légumes frais et notre sauce maison. Costaud et vraiment bon."
- Fondant chocolat : "Un fondant au chocolat avec le cœur qui coule, accompagné de framboises fraîches. Pour les amateurs de chocolat, c'est le dessert parfait."

Pour les ingrédients, utilise les noms français courants et professionnels. Indique des quantités réalistes pour le nombre de portions demandé.`,
      messages: [{ role: 'user', content: description }],
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'Réponse IA invalide', raw: text });

    const result = JSON.parse(jsonMatch[0]);

    if (Array.isArray(result.ingredients)) {
      result.ingredients = await Promise.all(result.ingredients.map(async ing => {
        const found = await matchIngredientPrice(ing.nom, req.userId);
        if (!found) return ing;
        return { ...ing, prixUnitaire: found.prixUnitaire };
      }));
    }

    res.json(result);
  } catch (err) {
    console.error('IA structurer error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/description-commerciale', async (req, res) => {
  const { nom, ingredients, portions } = req.body;
  if (!nom) return res.status(400).json({ error: 'nom requis' });

  const ingList = (ingredients || []).map(i => `${i.quantite} ${i.unite} de ${i.nom}`).join(', ');
  const userMsg = `Plat : "${nom}"${portions ? `, ${portions} portions` : ''}. Ingrédients : ${ingList || 'non spécifiés'}.

Génère UNIQUEMENT ce JSON : { "description_commerciale": "string" }

2 à 3 phrases simples et naturelles pour donner envie au client. Parle des goûts, des textures, de ce que ça évoque. Ton naturel et chaleureux, comme un ami qui recommande un plat. JAMAIS de termes techniques, JAMAIS de méthodes de cuisson, JAMAIS de températures ou de temps. JAMAIS les mots : sublimé, nappé, réalisé, élaboré, déglacer, thermoplongeur, bain-marie, blanchir, monter, infuser, chiffonnade.

Exemples corrects :
- "Un burger avec un steak maison, des légumes frais et notre sauce maison. Costaud et vraiment bon."
- "Un fondant au chocolat avec le cœur qui coule, accompagné de framboises fraîches. Pour les amateurs de chocolat, c'est le dessert parfait."
- "Une salade fraîche avec de la pastèque, de la feta et de la menthe. Simple, légère et pleine de goût — parfaite pour l'été."`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      messages: [{ role: 'user', content: userMsg }],
    });
    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'Réponse IA invalide', raw: text });
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    console.error('IA desc-commerciale error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

export default router;
