import '../env.js';
import express from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import XLSX from 'xlsx';
import { v4 as uuidv4 } from 'uuid';
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

const uploadVentes = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = [
      'text/csv', 'text/plain', 'application/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/pdf',
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    ].includes(file.mimetype) || /\.(csv|xlsx|xls|pdf|jpg|jpeg|png|webp)$/i.test(file.originalname);
    cb(ok ? null : new Error('Format non supporté'), ok);
  },
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_, file, cb) => {
    const ok = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.mimetype);
    cb(ok ? null : new Error('Format non supporté'), ok);
  },
});

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const VENTES_SYSTEM = `Tu es un expert en restauration et analyse de données de ventes POS (point de vente). Analyse ce fichier de ventes et identifie la structure des données.

Retourne UNIQUEMENT un JSON valide sans markdown avec cette structure exacte :
{
  "colonnes": [
    { "index": 0, "nom": "nom détecté ou inféré", "type": "nom_plat|quantite|prix_unitaire|date|service|inconnu", "incertain": false }
  ],
  "lignes": [
    { "nomPOS": "string", "quantite": number, "prixVente": number_ou_null, "date": "string_ou_null", "service": "midi|soir|null" }
  ]
}

RÈGLE CRITIQUE sur la détection des colonnes :
- Si le document n'a que DEUX colonnes, la première est TOUJOURS le nom du plat et la deuxième est TOUJOURS la quantité vendue. Ne jamais interpréter la deuxième colonne comme un prix.
- Si le document n'a que TROIS colonnes sans en-tête de prix explicite, les colonnes sont : nom du plat, quantité vendue, et une troisième colonne (date ou service). Il n'y a pas de prix.
- "prixVente" doit être null sauf si une colonne de prix est EXPLICITEMENT présente et clairement identifiable dans le document (intitulée "prix", "tarif", "PU", "prix unitaire", "montant unitaire", "prix TTC", etc.). Ne jamais déduire le prix depuis la quantité ou toute autre colonne ambiguë.

RÈGLES ABSOLUES :
- "nom_plat" : colonne avec les noms des plats/articles vendus
- "quantite" : nombre de portions/couverts vendus — toujours un entier positif, jamais un montant en euros
- "prix_unitaire" : prix de vente unitaire TTC en euros — null si absent du document
- "date" : date ou période de la vente
- "service" : "midi" (déjeuner/lunch) ou "soir" (dîner/dinner) si présent
- incertain: true si tu n'es pas sûr du type d'une colonne
- Ignore les lignes de totaux, sous-totaux, en-têtes répétés, lignes vides
- Ignore les boissons (eau, café, thé, vin, bière) si clairement identifiables comme telles
- Pour "service" dans les lignes : "midi"/"déjeuner"/"lunch" → "midi", "soir"/"dîner"/"dinner" → "soir", sinon null
- Si quantite n'est pas détectable, utilise 1 comme valeur par défaut
- Ne retourne que les lignes plats/articles réels, pas les métadonnées`;

router.post('/analyser-ventes', uploadVentes.single('ventes'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });

  const fileBase64 = req.file.buffer.toString('base64');

  const VISUAL_MIMES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  const isVisual = VISUAL_MIMES.includes(req.file.mimetype) || /\.(pdf|jpg|jpeg|png|webp)$/i.test(req.file.originalname);

  let messageContent;

  if (isVisual) {
    const base64 = req.file.buffer.toString('base64');
    const isPDF = req.file.mimetype === 'application/pdf' || /\.pdf$/i.test(req.file.originalname);
    const fileBlock = isPDF
      ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
      : { type: 'image', source: { type: 'base64', media_type: req.file.mimetype || 'image/jpeg', data: base64 } };
    messageContent = [fileBlock, { type: 'text', text: 'Analyse ce document de ventes et retourne le JSON.' }];
  } else {
    const isExcel = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ].includes(req.file.mimetype) || /\.(xlsx|xls)$/i.test(req.file.originalname);

    let textContent;
    if (isExcel) {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
      textContent = XLSX.utils.sheet_to_csv(firstSheet);
    } else {
      textContent = req.file.buffer.toString('utf-8');
    }
    if (textContent.length > 10000) textContent = textContent.substring(0, 10000) + '\n[... tronqué]';
    messageContent = `Analyse ce fichier de ventes :\n\n${textContent}`;
  }

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: VENTES_SYSTEM,
      messages: [{ role: 'user', content: messageContent }],
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'Réponse IA invalide', raw: text });
    const parsed = JSON.parse(jsonMatch[0]);
    getDb().then(db => {
      const doc = {
        id: uuidv4(), user_id: req.userId,
        nomFichier: req.file.originalname,
        fileBase64,
        fileMimeType: req.file.mimetype,
        dateImport: new Date().toISOString(),
        statut: 'validé',
        lignesCount: (parsed.lignes || []).length,
      };
      db.collection('documents_ventes').insertOne(doc).catch(() => {});
    }).catch(() => {});
    res.json({ ...parsed, nomFichier: req.file.originalname });
  } catch (err) {
    console.error('IA analyser-ventes error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/analyser-fiche', upload.single('fiche'), async (req, res) => {
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
      system: `Tu es un assistant expert en restauration professionnelle. Analyse ce document (fiche technique de cuisine) et extrais les informations structurées.

Retourne UNIQUEMENT un JSON valide sans markdown :
{
  "nom": "string ou null si illisible",
  "categorie": "Amuse-bouche|Entrée|Plat viande|Plat poisson|Plat végétarien|Dessert|Autre ou null",
  "portions": number ou null,
  "tempsPreparation": number_en_minutes ou null,
  "tempsCuisson": number_en_minutes ou null,
  "incertains": ["noms des champs de haut niveau dont tu n'es pas certain"],
  "ingredients": [
    { "nom": "string", "quantite": number ou null, "unite": "g|kg|ml|L|piece|c.s.|c.c.|botte|tranche ou null", "prixUnitaire": number ou null, "incertain": boolean }
  ]
}

RÈGLES ABSOLUES :
- Retourne null pour tout champ absent ou illisible. Ne jamais inventer.
- Ajoute le nom du champ dans "incertains" si la valeur est déduite ou peu lisible.
- "prixUnitaire" d'un ingrédient : null sauf si clairement visible sur le document.
- "categorie" déduite (non explicite) → ajouter "categorie" dans "incertains".
- Ingrédient peu lisible → "incertain": true.`,
      messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: 'Analyse cette fiche technique et retourne le JSON.' }] }],
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'Réponse IA invalide', raw: text });
    const result = JSON.parse(jsonMatch[0]);
    getDb().then(db => {
      const meta = {
        id: uuidv4(), user_id: req.userId,
        nomFichier: req.file.originalname,
        fileBase64: base64,
        fileMimeType: req.file.mimetype,
        dateImport: new Date().toISOString(),
        statut: 'validé', version: 1,
        nomPlat: result.nom || null,
        categoriePlat: result.categorie || null,
        recetteLiee: null,
      };
      db.collection('documents_fiches').insertOne(meta).catch(() => {});
    }).catch(() => {});
    res.json(result);
  } catch (err) {
    console.error('IA analyser-fiche error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

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
      system: 'Tu es un assistant pour professionnels de la restauration. Analyse cette facture fournisseur et extrais le fournisseur et tous les produits alimentaires avec leurs prix. Retourne UNIQUEMENT un JSON valide sans markdown : { "fournisseur": "nom du fournisseur ou null si non identifiable", "produits": [{ "nom": "string", "quantite": number, "unite": "string", "prix_unitaire": number, "prix_total": number }] }. Omets les produits illisibles ou non alimentaires.',
      messages: [{ role: 'user', content: [fileBlock, { type: 'text', text: 'Analyse cette facture et retourne le JSON des produits.' }] }],
    });

    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'Réponse IA invalide', raw: text });
    const result = JSON.parse(jsonMatch[0]);
    const fournisseurFinal = req.body?.fournisseur || result.fournisseur || null;
    getDb().then(db => {
      const meta = {
        id: uuidv4(), user_id: req.userId,
        nomFichier: req.file.originalname,
        fileBase64: base64,
        fileMimeType: req.file.mimetype,
        dateImport: new Date().toISOString(),
        statut: 'validé',
        fournisseur: fournisseurFinal,
        dateFacture: req.body?.dateFacture || null,
        moisFacture: req.body?.moisFacture || null,
        anneeFacture: req.body?.anneeFacture || null,
        categorieAchat: req.body?.categorieAchat || null,
        ingredientsLies: (result.produits || []).map(p => p.nom).filter(Boolean),
      };
      db.collection('documents_factures').insertOne(meta).catch(() => {});
    }).catch(() => {});
    res.json(result);
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

description_commerciale : 2 à 3 phrases simples et naturelles pour donner envie au client. Parle UNIQUEMENT du résultat dans l'assiette — goûts, textures, ce que ça évoque. Jamais de comment c'est fait, jamais de gestes de cuisine, jamais d'ustensiles, jamais de températures, jamais de temps de cuisson. Ton naturel et chaleureux, comme un ami qui recommande un plat. JAMAIS les mots ni leurs dérivés : sublimé, nappé, réalisé, élaboré, déglacer, thermoplongeur, bain-marie, blanchir, monter, infuser, chiffonnade, fouetter, incorporer, blanchiment, mélanger, tamiser, beurrer, chemiser, cuire, rôtir, tapisser, déposer, enfourner, préparer.

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

  const ingList = (ingredients || []).map(i => i.nom).filter(Boolean).join(', ');

  const systemPrompt = `Tu es un ami gourmand qui recommande des plats à des clients au restaurant. Tu parles uniquement de ce qu'on ressent dans l'assiette : les goûts, les textures, les parfums, les émotions que le plat provoque. Tu ne mentionnes jamais comment le plat est préparé.

MOTS STRICTEMENT INTERDITS (et tous leurs dérivés) : cuire, rôtir, tapisser, déposer, enfourner, préparer, réaliser, fouetter, incorporer, blanchir, tamiser, beurrer, chemiser, thermoplongeur, bain-marie, poêler, dorer, caraméliser, réduire, déglacer, monter, infuser, napper, sublimer, élaborer, mélanger, chiffonnade, mijoter, sauter, snacker, mariner, assaisonner, dresser, disposer, enrobe, basculer, fond en bouche, généreux, délicat, subtil, raffiné, savoureux, succulent, divin, exquis, incontournable, inimitable. Aussi interdit : toute température, tout temps de cuisson, tout ustensile.

RÈGLE D'OR : si tu expliques comment c'est fait, tu t'es trompé. Parle uniquement de ce qu'on perçoit dans l'assiette.

FORMAT : exactement 2 phrases. Pas plus. Ton direct, chaleureux, appétissant. Retourne UNIQUEMENT ce JSON : { "description_commerciale": "string" }`;

  const userMsg = `Plat : "${nom}"${portions ? ` (${portions} portions)` : ''}.${ingList ? ` Il contient : ${ingList}.` : ''}

Exemples du ton attendu (exactement 2 phrases, naturel, zéro mot interdit) :
- Cromesquis foie gras : "Une bouchée croustillante qui cache du foie gras fondant et une touche de gelée de Sauternes. Le genre de petit truc qu'on redemande aussitôt."
- Magret sauce miel balsamique : "Du magret juteux avec une sauce qui joue entre le doux du miel et l'acidité du balsamique, sur un lit de patate douce. Équilibré et vraiment bon."
- Salade pastèque feta : "La douceur de la pastèque contre le sel de la feta, avec la menthe qui réveille tout. Parfaite pour les jours où on veut manger léger."
- Fondant chocolat : "Un fondant avec le cœur qui coule au moindre coup de cuillère, accompagné de framboises qui tranchent avec l'intensité du chocolat. Le dessert qu'on commande les yeux fermés."
- Burger maison : "Un burger costaud avec un steak maison bien moelleux, des légumes croquants et une sauce qu'on retrouve nulle part ailleurs. Rassasiant et vraiment bon."`;

  try {
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 256,
      system: systemPrompt,
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
