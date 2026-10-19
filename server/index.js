import './env.js';

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import multer from 'multer';
import { getDb } from './db.js';
import { envoyerRelance, envoyerLifecycle, envoyerPrevenanceEffacement } from './emails/relances.js';
import { statutPurge } from './lib/eligibilitePurge.js';
import { executerPurge, modePurge } from './lib/purgeComptes.js';
import recettesRouter from './routes/recettes.js';
import ingredientsRouter from './routes/ingredients.js';
import cartesRouter from './routes/cartes.js';
import parametresRouter from './routes/parametres.js';
import iaRouter from './routes/ia.js';
import authRouter from './routes/auth.js';
import aliasesRouter from './routes/aliases.js';
import historiquePrixRouter from './routes/historique_prix.js';
import sousRecettesRouter from './routes/sous_recettes.js';
import ventesRouter from './routes/ventes.js';
import documentsRouter from './routes/documents.js';
import agendaRouter from './routes/agenda.js';
import onboardingRouter from './routes/onboarding.js';
import stripeRouter, { stripeWebhook } from './routes/stripe.js';
import adminRouter from './routes/admin.js';
import { authMiddleware } from './middleware/auth.js';
import { checkAccess } from './middleware/checkAccess.js';

const app = express();
// Render (proxy interne) + Cloudflare : req.ip = adresse du visiteur. Vérifié par /api/diag-proxy (PROXY-1/2).
app.set('trust proxy', 2);
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
}));
app.post('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeWebhook);
app.use(express.json());

// ── Routes publiques ────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.use('/api/admin', adminRouter);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// TEMPORAIRE — PROXY-1, à supprimer
// Mesure le nombre de proxys devant le serveur : aucune adresse IP ni valeur d'en-tête renvoyée ou journalisée.
app.get('/api/diag-proxy', (req, res) => {
  const xff = req.headers['x-forwarded-for'];
  const xffEntries = xff ? String(xff).split(',').map(s => s.trim()).filter(Boolean).length : 0;
  const ip = String(req.ip || '').replace(/^::ffff:/, '');
  const ipIsPrivate = ip === '::1' || ip === '127.0.0.1' || ip.startsWith('10.') || ip.startsWith('192.168.') || /^172\.(1[6-9]|2\d|3[01])\./.test(ip);
  const present = nom => req.headers[nom] !== undefined;
  res.json({
    xff_entries: xffEntries,
    has_x_vercel_id: present('x-vercel-id'),
    has_x_vercel_forwarded_for: present('x-vercel-forwarded-for'),
    has_cf_connecting_ip: present('cf-connecting-ip'),
    has_x_real_ip: present('x-real-ip'),
    has_true_client_ip: present('true-client-ip'),
    has_forwarded: present('forwarded'),
    ip_is_private: ipIsPrivate,
    ip_equals_xff_first: xff ? ip === String(xff).split(',')[0].trim().replace(/^::ffff:/, '') : false,
  });
});


// ── Routes protégées ────────────────────────────────────────────────────────
app.use('/api', authMiddleware);
app.use('/api', checkAccess);
app.use('/api/stripe', stripeRouter);
app.use('/api/recettes', recettesRouter);
app.use('/api/ingredients', ingredientsRouter);
app.use('/api/cartes', cartesRouter);
app.use('/api/parametres', parametresRouter);
app.use('/api/ia', iaRouter);
app.use('/api/aliases', aliasesRouter);
app.use('/api/historique-prix', historiquePrixRouter);
app.use('/api/sous-recettes', sousRecettesRouter);
app.use('/api/ventes', ventesRouter);
app.use('/api/documents', documentsRouter);
app.use('/api/agenda', agendaRouter);
app.use('/api/onboarding', onboardingRouter);

// ── Middleware d'erreurs (toujours en dernier) ──────────────────────────────
app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);

  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'Ce fichier est trop volumineux (10 Mo maximum).' });
    }
    return res.status(400).json({ error: 'Format non supporté' });
  }
  if (err?.message === 'Format non supporté') {
    return res.status(400).json({ error: 'Format non supporté' });
  }

  const statut = err?.status || err?.statusCode;
  if (typeof statut === 'number' && statut >= 400 && statut <= 499) {
    return res.status(statut).json({ error: 'Requête invalide.' });
  }

  console.error('[Erreur non gérée]', err?.name, err?.code ?? err?.codeName ?? '', String(err?.name ?? '').startsWith('Mongo') ? '' : (err?.message ?? ''));
  res.status(500).json({ error: 'Une erreur est survenue. Réessayez dans un instant ou écrivez-nous à contact@cloveria.fr.' });
});

// Journalise sans jamais arrêter le processus (évite qu'un rejet non géré ne coupe le service entier).
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', ...(reason !== null && typeof reason === 'object' ? [reason.name, reason.code ?? reason.codeName ?? '', String(reason.name ?? '').startsWith('Mongo') ? '' : (reason.message ?? '')] : [typeof reason]));
});

// ── Emails de relance essai ─────────────────────────────────────────────────
async function sendTrialEmails() {
  const db = await getDb();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const users = await db.collection('users')
    .find({ subscriptionStatus: { $nin: ['active'] }, email: { $exists: true } }, { projection: { _id: 0 } })
    .toArray();

  for (const user of users) {
    if (!user.trialEndDate || !user.email) continue;

    const trialEnd = new Date(user.trialEndDate);
    const trialStart = new Date(trialEnd.getFullYear(), trialEnd.getMonth(), trialEnd.getDate() - 14);
    const msElapsed = today - trialStart;
    const daysElapsed = Math.round(msElapsed / (1000 * 60 * 60 * 24));
    const emailsEnvoyes = user.emailsEnvoyes || [];

    const trialEndDate = new Date(trialEnd.getFullYear(), trialEnd.getMonth(), trialEnd.getDate());
    const daysAfterTrial = Math.round((today - trialEndDate) / (1000 * 60 * 60 * 24));

    let jour = null;
    if (daysElapsed === 14 && !emailsEnvoyes.includes('j14')) jour = 14;
    else if (daysElapsed === 12 && !emailsEnvoyes.includes('j12')) jour = 12;
    else if (daysElapsed === 9 && !emailsEnvoyes.includes('j9')) jour = 9;
    else if (daysAfterTrial === 40 && !emailsEnvoyes.includes('post40')) jour = 'post40';
    else if (daysAfterTrial === 15 && !emailsEnvoyes.includes('post15')) jour = 'post15';
    else if (daysAfterTrial === 7 && !emailsEnvoyes.includes('post7')) jour = 'post7';
    else if (daysAfterTrial === 2 && !emailsEnvoyes.includes('post2')) jour = 'post2';

    if (!jour) continue;

    try {
      await envoyerRelance(user, jour);
      await db.collection('users').updateOne(
        { id: user.id },
        { $push: { emailsEnvoyes: typeof jour === 'number' ? `j${jour}` : jour } }
      );
      console.log(`[Relance] ${typeof jour === 'number' ? `j${jour}` : jour} envoyé (utilisateur ${user.id})`);
    } catch (err) {
      console.error(`[Relance] Erreur j${jour} (utilisateur ${user.id}) :`, err?.name, err?.code ?? err?.codeName ?? '');
    }
  }
}

// ── Emails lifecycle (onboarding + activation) ──────────────────────────────
async function sendLifecycleEmails() {
  const db = await getDb();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const users = await db.collection('users')
    .find({ emailVerified: true, deleted: { $ne: true }, disabled: { $ne: true }, email: { $exists: true } }, { projection: { _id: 0 } })
    .toArray();

  for (const user of users) {
    if (!user.email || !user.created_at) continue;

    const lifecycleEmailsSent = user.lifecycleEmailsSent || [];
    const createdAt = new Date(new Date(user.created_at).toDateString());
    const daysElapsed = Math.round((today - createdAt) / (1000 * 60 * 60 * 24));

    let emailKey = null;

    // Email 1 — J+4 : onboarding terminé, aucune fiche créée
    if (daysElapsed === 4 && user.onboardingComplete && !lifecycleEmailsSent.includes('lifecycle_j4')) {
      const nbFiches = await db.collection('recettes').countDocuments({ user_id: user.id, _source: { $ne: 'example' } });
      if (nbFiches === 0) emailKey = 'lifecycle_j4';
    }

    // Email 2 — J+8 : aucune fiche créée (onboarding peu importe)
    if (!emailKey && daysElapsed === 8 && !lifecycleEmailsSent.includes('lifecycle_j8')) {
      const nbFiches = await db.collection('recettes').countDocuments({ user_id: user.id, _source: { $ne: 'example' } });
      if (nbFiches === 0) emailKey = 'lifecycle_j8';
    }

    // Email 3 — J+4 après vérif email : onboarding non terminé
    if (!emailKey && user.emailVerifiedAt && !user.onboardingComplete && !lifecycleEmailsSent.includes('lifecycle_onboarding_j4')) {
      const verifiedAt = new Date(new Date(user.emailVerifiedAt).toDateString());
      const daysVerified = Math.round((today - verifiedAt) / (1000 * 60 * 60 * 24));
      if (daysVerified === 4) emailKey = 'lifecycle_onboarding_j4';
    }

    if (!emailKey) continue;

    try {
      await envoyerLifecycle(user, emailKey);
      await db.collection('users').updateOne(
        { id: user.id },
        { $push: { lifecycleEmailsSent: emailKey } }
      );
      console.log(`[Lifecycle] ${emailKey} envoyé (utilisateur ${user.id})`);
    } catch (err) {
      console.error(`[Lifecycle] Erreur ${emailKey} (utilisateur ${user.id}) :`, err?.name, err?.code ?? err?.codeName ?? '');
    }
  }
}

// ── E-mail de prévenance avant effacement automatique (Sprint S11) ──────────
// Par défaut (PREVENANCE_EFFACEMENT_ACTIVE absente ou différente de 'true') : mode simulation,
// compte uniquement les comptes au statut 'prevenir', aucun envoi, aucune donnée personnelle journalisée.
// Limite : 50 comptes par exécution. S11 ne déclenche jamais d'effacement (statut 'effacer' ignoré ici).
const PREVENANCE_LIMITE = 50;

async function sendPrevenanceEffacement() {
  const db = await getDb();
  const actif = process.env.PREVENANCE_EFFACEMENT_ACTIVE === 'true';

  const users = await db.collection('users')
    .find({ deleted: { $ne: true }, disabled: { $ne: true } }, { projection: { _id: 0 } })
    .toArray();

  const aPrevenir = users.filter(u => statutPurge(u) === 'prevenir').slice(0, PREVENANCE_LIMITE);

  if (!actif) {
    console.log(`[PrevenanceEffacement] (simulation) comptes au statut 'prevenir' : ${aPrevenir.length}`);
    return;
  }

  let envoyes = 0;
  let echecs = 0;
  for (const user of aPrevenir) {
    const maintenant = new Date().toISOString();
    const reservation = await db.collection('users').updateOne(
      { id: user.id, prevenuEffacementLe: null },
      { $set: { prevenuEffacementLe: maintenant } }
    );
    if (reservation.modifiedCount !== 1) continue;

    try {
      await envoyerPrevenanceEffacement(user);
      envoyes++;
    } catch {
      await db.collection('users').updateOne({ id: user.id }, { $set: { prevenuEffacementLe: null } });
      echecs++;
    }
  }
  console.log(`[PrevenanceEffacement] prévenus : ${envoyes}, échecs : ${echecs}`);
}

// ── Effacement automatique des comptes résiliés ou d'essai non converti (Sprint S12) ───────
// Mode piloté par PURGE_MODE ('reel' uniquement si exact, 'off' si exact, 'simulation' sinon —
// y compris absente ou mal orthographiée, valeur par défaut la plus sûre). Journalisation en
// comptages uniquement, jamais d'adresse e-mail, d'identifiant ni de nom d'établissement.
async function runPurgeComptes() {
  const db = await getDb();
  const mode = modePurge();
  const resultat = await executerPurge(db, { mode });
  console.log('[PurgeComptes]', JSON.stringify(resultat));
}

// ── Démarrage ────────────────────────────────────────────────────────────────
getDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur demarre sur le port ${PORT}`);
    });

    console.log('[PurgeComptes] mode au démarrage :', modePurge());

    // Cron quotidien 9h00 : emails de relance essai + lifecycle + prévenance effacement
    cron.schedule('0 9 * * *', () => {
      sendTrialEmails().catch(err => console.error('[Cron relances]', err?.name, err?.code ?? err?.codeName ?? ''));
      sendLifecycleEmails().catch(err => console.error('[Cron lifecycle]', err?.name, err?.code ?? err?.codeName ?? ''));
      sendPrevenanceEffacement().catch(err => console.error('[Cron prévenance effacement]', err?.name, err?.code ?? err?.codeName ?? ''));
    });
    console.log('Cron relances + lifecycle démarré (quotidien à 9h00)');

    // Cron quotidien 10h00 : effacement automatique (décalé pour ne pas chevaucher le cron de 9h)
    cron.schedule('0 10 * * *', () => {
      runPurgeComptes().catch(err => console.error('[Cron purge comptes]', err?.name, err?.code ?? err?.codeName ?? ''));
    });
    console.log('Cron purge comptes démarré (quotidien à 10h00)');
  })
  .catch(err => {
    console.error('[MongoDB] Connexion impossible:', err?.name, err?.code ?? err?.codeName ?? '');
    process.exit(1);
  });
