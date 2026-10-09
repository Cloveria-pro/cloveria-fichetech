import './env.js';

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import multer from 'multer';
import { getDb } from './db.js';
import { envoyerRelance, envoyerLifecycle } from './emails/relances.js';
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

  console.error('[Erreur non gérée]', err?.message);
  res.status(500).json({ error: 'Une erreur est survenue. Réessayez dans un instant ou écrivez-nous à contact@cloveria.fr.' });
});

// Journalise sans jamais arrêter le processus (évite qu'un rejet non géré ne coupe le service entier).
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason?.message || reason);
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
      console.log(`[Relance] ${typeof jour === 'number' ? `j${jour}` : jour} envoyé à ${user.email}`);
    } catch (err) {
      console.error(`[Relance] Erreur j${jour} pour ${user.email}:`, err.message);
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
      console.log(`[Lifecycle] ${emailKey} envoyé à ${user.email}`);
    } catch (err) {
      console.error(`[Lifecycle] Erreur ${emailKey} pour ${user.email}:`, err.message);
    }
  }
}

// ── Démarrage ────────────────────────────────────────────────────────────────
getDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur demarre sur le port ${PORT}`);
    });

    // Cron quotidien 9h00 : emails de relance essai + lifecycle
    cron.schedule('0 9 * * *', () => {
      sendTrialEmails().catch(err => console.error('[Cron relances]', err.message));
      sendLifecycleEmails().catch(err => console.error('[Cron lifecycle]', err.message));
    });
    console.log('Cron relances + lifecycle démarré (quotidien à 9h00)');
  })
  .catch(err => {
    console.error('[MongoDB] Connexion impossible:', err.message);
    process.exit(1);
  });
