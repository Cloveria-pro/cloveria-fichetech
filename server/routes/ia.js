import '../env.js';
import express from 'express';
import multer from 'multer';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { getDb } from '../db.js';

// ── Quota IA mensuel par utilisateur ────────────────────────────────────────
// Limite et poids : constantes nommées, modifiables facilement.
const QUOTA_IA_LIMITE = 300;
const POIDS_DESCRIPTION_COMMERCIALE = 1;
const POIDS_STRUCTURER = 2;
const POIDS_ANALYSER_FICHIER = 3; // analyser-facture, analyser-fiche, analyser-ventes

// Fenêtre courante au format "AAAA-MM", calculée en UTC.
export function fenetreQuotaIA(date = new Date()) {
  const annee = date.getUTCFullYear();
  const mois = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${annee}-${mois}`;
}

// Décision pure : autorise si le compteur de la fenêtre courante + le poids ne dépasse pas la limite.
// Une fenêtre différente de la fenêtre courante (ou absente) est traitée comme un compteur à zéro.
export function decisionQuotaIA({ iaCallsWindow, iaCallsCount } = {}, poids, fenetreCourante, limite = QUOTA_IA_LIMITE) {
  const compteurActuel = iaCallsWindow === fenetreCourante ? (iaCallsCount || 0) : 0;
  return compteurActuel + poids <= limite;
}

// Réserve atomiquement `poids` points de quota pour cet utilisateur. Retourne true si accordé.
export async function reserverQuota(db, userId, poids) {
  const fenetre = fenetreQuotaIA();
  const col = db.collection('users');

  // (a) Réinitialise le compteur si la fenêtre stockée n'est plus la fenêtre courante.
  await col.updateOne(
    { id: userId, iaCallsWindow: { $ne: fenetre } },
    { $set: { iaCallsWindow: fenetre, iaCallsCount: 0 } }
  );

  // (b) Incrément atomique, seulement si le compteur + poids reste sous la limite.
  const result = await col.findOneAndUpdate(
    { id: userId, iaCallsWindow: fenetre, iaCallsCount: { $lte: QUOTA_IA_LIMITE - poids } },
    { $inc: { iaCallsCount: poids } }
  );
  return !!result;
}

// Remboursement au mieux (sans bloquer la réponse d'erreur) si l'appel Anthropic échoue après réservation.
async function remettreQuota(userId, poids) {
  try {
    const db = await getDb();
    await db.collection('users').updateOne({ id: userId }, { $inc: { iaCallsCount: -poids } });
  } catch { /* au mieux, sans impact sur la réponse déjà envoyée */ }
}

const QUOTA_DEPASSE = {
  error: "Vous avez atteint votre limite d'utilisation de l'IA pour ce mois. Elle se renouvelle le 1er du mois prochain. Besoin de plus ? Écrivez-nous à contact@cloveria.fr.",
  code: 'quota_ia_atteint',
};

// ── Délai et tentatives du client Anthropic ─────────────────────────────────
const IA_TIMEOUT_MS = 90000;
const IA_MAX_RETRIES = 0;

// ── Erreurs Anthropic : jamais le message brut renvoyé au client ───────────
const TEXTE_IA_INDISPONIBLE = "Le service d'analyse est momentanément indisponible ou très sollicité. Réessayez dans quelques instants.";
const TEXTE_IA_CONFIGURATION = "Cette fonction est momentanément indisponible. Réessayez plus tard ou écrivez-nous à contact@cloveria.fr.";
const TEXTE_IA_DEFAUT = "Une erreur est survenue. Réessayez dans un instant ou écrivez-nous à contact@cloveria.fr.";

// Fonction pure : transforme une erreur Anthropic (ou autre) en réponse sûre, sans jamais exposer err.message.
export function messageErreurIA(err) {
  const status = err?.status;
  const type = err?.error?.type;
  const name = err?.name;
  const message = (err?.message || '').toLowerCase();

  const estIndisponible =
    status === 429 || status === 529 || (typeof status === 'number' && status >= 500) ||
    type === 'rate_limit_error' || type === 'overloaded_error' || type === 'api_error' ||
    name === 'APIConnectionTimeoutError' || name === 'APIConnectionError';
  if (estIndisponible) {
    return { httpStatus: 503, body: { error: TEXTE_IA_INDISPONIBLE, code: 'ia_indisponible' } };
  }

  const estConfiguration =
    status === 401 || status === 403 || status === 404 ||
    type === 'authentication_error' || type === 'permission_error' || type === 'not_found_error' ||
    (status === 400 && message.includes('credit balance'));
  if (estConfiguration) {
    return { httpStatus: 503, body: { error: TEXTE_IA_CONFIGURATION, code: 'ia_indisponible' } };
  }

  return { httpStatus: 500, body: { error: TEXTE_IA_DEFAUT, code: 'ia_erreur' } };
}

function normalize(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/œ/g, 'oe')
    .replace(/æ/g, 'ae')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

async function matchIngredientPrice(nom, userId) {
  try {
    const db = await getDb();
    const pool = await db.collection('ingredients')
      .find({ user_id: userId }, { projection: { _id: 0 } })
      .toArray();
    const normalizedNom = normalize(nom);
    if (normalizedNom === '') return null;
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
      'application/pdf',
      'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    ].includes(file.mimetype) || /\.(csv|pdf|jpg|jpeg|png|webp)$/i.test(file.originalname);
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

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY, timeout: IA_TIMEOUT_MS, maxRetries: IA_MAX_RETRIES });

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

  let quotaOk;
  try {
    const db = await getDb();
    quotaOk = await reserverQuota(db, req.userId, POIDS_ANALYSER_FICHIER);
  } catch (err) {
    console.error('[IA] analyser-ventes (réservation quota) :', err?.message);
    return res.status(503).json({ error: TEXTE_IA_INDISPONIBLE, code: 'ia_indisponible' });
  }
  if (!quotaOk) {
    return res.status(429).json(QUOTA_DEPASSE);
  }

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
    let textContent = req.file.buffer.toString('utf-8');
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
    const sourceDocumentId = uuidv4();
    getDb().then(db => {
      const doc = {
        id: sourceDocumentId, user_id: req.userId,
        nomFichier: req.file.originalname,
        fileBase64,
        fileMimeType: req.file.mimetype,
        dateImport: new Date().toISOString(),
        statut: 'validé',
        lignesCount: (parsed.lignes || []).length,
      };
      db.collection('documents_ventes').insertOne(doc).catch(() => {});
    }).catch(() => {});
    res.json({ ...parsed, nomFichier: req.file.originalname, sourceDocumentId });
  } catch (err) {
    const { httpStatus, body } = messageErreurIA(err);
    const prefixe = body.error === TEXTE_IA_CONFIGURATION ? '[IA][ALERTE]' : '[IA]';
    console.error(`${prefixe} analyser-ventes :`, err?.status, err?.error?.type, err?.message);
    remettreQuota(req.userId, POIDS_ANALYSER_FICHIER);
    res.status(httpStatus).json(body);
  }
});

router.post('/analyser-fiche', upload.single('fiche'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });

  let quotaOk;
  try {
    const db = await getDb();
    quotaOk = await reserverQuota(db, req.userId, POIDS_ANALYSER_FICHIER);
  } catch (err) {
    console.error('[IA] analyser-fiche (réservation quota) :', err?.message);
    return res.status(503).json({ error: TEXTE_IA_INDISPONIBLE, code: 'ia_indisponible' });
  }
  if (!quotaOk) {
    return res.status(429).json(QUOTA_DEPASSE);
  }

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
    { "nom": "string", "quantite": number ou null, "unite": "g|kg|ml|L|pièce|c.s|c.c ou null", "prixUnitaire": number ou null, "incertain": boolean }
  ]
}

RÈGLES ABSOLUES :
- Retourne null pour tout champ absent ou illisible. Ne jamais inventer.
- Ajoute le nom du champ dans "incertains" si la valeur est déduite ou peu lisible.
- "prixUnitaire" d'un ingrédient : null sauf si clairement visible sur le document.
- "categorie" déduite (non explicite) → ajouter "categorie" dans "incertains".
- Ingrédient peu lisible → "incertain": true.
- "unite" : n'utilise g|kg|ml|L|pièce|c.s|c.c que lorsque la conversion depuis l'unité d'origine du document est certaine (ex. cl vers ml, cuillère à soupe/café vers c.s/c.c, ingrédient comptable comme œuf ou citron vers pièce).
- Si l'unité d'origine (pincée, gousse, feuille, tranche, sachet, botte, ou toute autre unité) ne peut pas être convertie de façon certaine vers cette liste : ne jamais convertir en grammes, ne jamais inventer d'équivalent. Garde la mention d'origine directement dans "nom" (ex. "Ail (2 gousses)"), mets "quantite" à null, "unite" à null, et "incertain" à true.`,
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
    const { httpStatus, body } = messageErreurIA(err);
    const prefixe = body.error === TEXTE_IA_CONFIGURATION ? '[IA][ALERTE]' : '[IA]';
    console.error(`${prefixe} analyser-fiche :`, err?.status, err?.error?.type, err?.message);
    remettreQuota(req.userId, POIDS_ANALYSER_FICHIER);
    res.status(httpStatus).json(body);
  }
});

router.post('/analyser-facture', upload.single('facture'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fichier manquant' });

  let quotaOk;
  try {
    const db = await getDb();
    quotaOk = await reserverQuota(db, req.userId, POIDS_ANALYSER_FICHIER);
  } catch (err) {
    console.error('[IA] analyser-facture (réservation quota) :', err?.message);
    return res.status(503).json({ error: TEXTE_IA_INDISPONIBLE, code: 'ia_indisponible' });
  }
  if (!quotaOk) {
    return res.status(429).json(QUOTA_DEPASSE);
  }

  const base64 = req.file.buffer.toString('base64');
  const isPDF = req.file.mimetype === 'application/pdf';

  const fileBlock = isPDF
    ? { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } }
    : { type: 'image', source: { type: 'base64', media_type: req.file.mimetype, data: base64 } };

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
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
    const { httpStatus, body } = messageErreurIA(err);
    const prefixe = body.error === TEXTE_IA_CONFIGURATION ? '[IA][ALERTE]' : '[IA]';
    console.error(`${prefixe} analyser-facture :`, err?.status, err?.error?.type, err?.message);
    remettreQuota(req.userId, POIDS_ANALYSER_FICHIER);
    res.status(httpStatus).json(body);
  }
});

router.post('/structurer', async (req, res) => {
  const { description } = req.body;
  if (!description?.trim()) return res.status(400).json({ error: 'Description manquante' });

  let quotaOk;
  try {
    const db = await getDb();
    quotaOk = await reserverQuota(db, req.userId, POIDS_STRUCTURER);
  } catch (err) {
    console.error('[IA] structurer (réservation quota) :', err?.message);
    return res.status(503).json({ error: TEXTE_IA_INDISPONIBLE, code: 'ia_indisponible' });
  }
  if (!quotaOk) {
    return res.status(429).json(QUOTA_DEPASSE);
  }

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
  "ingredients": [{ "nom": "string", "quantite": number, "unite": "g|kg|ml|L|pièce|c.s|c.c", "prixUnitaire": 0, "tva": 10 }],
  "etapes": ["string"]
}

RÈGLE ABSOLUE sur les unités :
N'utilise g|kg|ml|L|pièce|c.s|c.c que lorsque la conversion est certaine (ex. cl vers ml, cuillère à soupe/café vers c.s/c.c, ingrédient comptable comme œuf ou citron vers pièce). Pour pincée, gousse, feuille, tranche, sachet, botte, ou toute autre unité qui ne peut pas être convertie de façon certaine vers cette liste : ne jamais convertir en grammes, ne jamais inventer d'équivalent. Garde la mention d'origine directement dans "nom" (ex. "Ail (2 gousses)"), mets "quantite" à 0 et "unite" à "g".

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
    const { httpStatus, body } = messageErreurIA(err);
    const prefixe = body.error === TEXTE_IA_CONFIGURATION ? '[IA][ALERTE]' : '[IA]';
    console.error(`${prefixe} structurer :`, err?.status, err?.error?.type, err?.message);
    remettreQuota(req.userId, POIDS_STRUCTURER);
    res.status(httpStatus).json(body);
  }
});

router.post('/description-commerciale', async (req, res) => {
  const { nom, ingredients, portions } = req.body;
  if (!nom) return res.status(400).json({ error: 'nom requis' });

  let quotaOk;
  try {
    const db = await getDb();
    quotaOk = await reserverQuota(db, req.userId, POIDS_DESCRIPTION_COMMERCIALE);
  } catch (err) {
    console.error('[IA] description-commerciale (réservation quota) :', err?.message);
    return res.status(503).json({ error: TEXTE_IA_INDISPONIBLE, code: 'ia_indisponible' });
  }
  if (!quotaOk) {
    return res.status(429).json(QUOTA_DEPASSE);
  }

  const ingList = (ingredients || []).map(i => i.nom).filter(Boolean).join(', ');

  const systemPrompt = `Tu es un serveur sympa qui décrit un plat à un client. Une phrase, deux maximum. Juste ce qu'il y a dans l'assiette et pourquoi c'est bon. Pas de poésie, pas de métaphores, pas d'envolées lyriques.

MOTS INTERDITS : fond en bouche, éclate en bouche, en plein soleil, tout équilibrer, vient tout, généreux, délicat, subtil, raffiné, savoureux, succulent, divin, exquis, incontournable, enrobe, basculer, grand gourmand, émulsion, symphonie, mariage, invitation, voyage, sublime, nappé, réalisé, élaboré, cuire, rôtir, préparer, fouetter, thermoplongeur, bain-marie, mijoter, dresser, disposer.

Retourne UNIQUEMENT ce JSON : { "description_commerciale": "string" }`;

  const userMsg = `Plat : "${nom}"${portions ? ` (${portions} portions)` : ''}.${ingList ? ` Il contient : ${ingList}.` : ''}

Exemples :
- Salade pastèque-feta : "Une salade pastèque-concombre-feta bien fraîche, avec une touche de menthe. Parfait pour l'été."
- Magret miel balsamique : "Du magret de canard avec une sauce miel-balsamique et une purée de patate douce. Simple et vraiment bon."
- Fondant chocolat : "Un fondant au chocolat avec le cœur qui coule, servi avec des framboises fraîches. Pour les amateurs de chocolat."
- Burger maison : "Un burger avec un steak maison, des légumes frais et notre sauce maison. Costaud et bien bon."
- Cromesquis foie gras : "Une bouchée croustillante avec du foie gras fondant et une touche de gelée de Sauternes. Parfait pour commencer."`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 256,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMsg }],
    });
    const text = message.content[0].text;
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return res.status(422).json({ error: 'Réponse IA invalide', raw: text });
    res.json(JSON.parse(jsonMatch[0]));
  } catch (err) {
    const { httpStatus, body } = messageErreurIA(err);
    const prefixe = body.error === TEXTE_IA_CONFIGURATION ? '[IA][ALERTE]' : '[IA]';
    console.error(`${prefixe} description-commerciale :`, err?.status, err?.error?.type, err?.message);
    remettreQuota(req.userId, POIDS_DESCRIPTION_COMMERCIALE);
    res.status(httpStatus).json(body);
  }
});

export default router;
