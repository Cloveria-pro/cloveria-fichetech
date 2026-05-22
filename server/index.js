import './env.js';

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import { getDb } from './db.js';
import { envoyerRelance } from './emails/relances.js';
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
import stripeRouter, { stripeWebhook } from './routes/stripe.js';
import { authMiddleware } from './middleware/auth.js';
import { checkAccess } from './middleware/checkAccess.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : '*',
  credentials: true,
}));
app.use(express.json());

// ── Routes publiques ────────────────────────────────────────────────────────
app.use('/api/auth', authRouter);
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
app.post('/api/stripe/webhook', stripeWebhook);

// ── Route de test emails (temporaire) ───────────────────────────────────────
app.get('/api/test-email', async (req, res) => {
  const fakeUser = { email: 'contact@cloveria.fr', prenom: 'Sébastien' };
  const results = [];
  for (const jour of [9, 12, 14]) {
    try {
      await envoyerRelance(fakeUser, jour);
      results.push({ jour, status: 'ok' });
    } catch (err) {
      results.push({ jour, status: 'error', message: err.message });
    }
  }
  res.json({ results });
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

// ── Emails de relance essai ─────────────────────────────────────────────────
async function sendTrialEmails() {
  const db = await getDb();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const users = await db.collection('users')
    .find({ subscriptionStatus: { $nin: ['active'] }, email: { $exists: true } }, { projection: { _id: 0 } })
    .toArray();

  for (const user of users) {
    if (!user.trialEndsAt || !user.email) continue;

    const trialEnd = new Date(user.trialEndsAt);
    const trialStart = new Date(trialEnd.getFullYear(), trialEnd.getMonth(), trialEnd.getDate() - 14);
    const msElapsed = today - trialStart;
    const daysElapsed = Math.round(msElapsed / (1000 * 60 * 60 * 24));
    const emailsEnvoyes = user.emailsEnvoyes || [];

    let jour = null;
    if (daysElapsed === 14 && !emailsEnvoyes.includes('j14')) jour = 14;
    else if (daysElapsed === 12 && !emailsEnvoyes.includes('j12')) jour = 12;
    else if (daysElapsed === 9 && !emailsEnvoyes.includes('j9')) jour = 9;

    if (!jour) continue;

    try {
      await envoyerRelance(user, jour);
      await db.collection('users').updateOne(
        { id: user.id },
        { $push: { emailsEnvoyes: `j${jour}` } }
      );
      console.log(`[Relance] j${jour} envoyé à ${user.email}`);
    } catch (err) {
      console.error(`[Relance] Erreur j${jour} pour ${user.email}:`, err.message);
    }
  }
}

// ── Démarrage ────────────────────────────────────────────────────────────────
getDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur demarre sur le port ${PORT}`);
    });

    // Cron quotidien 9h00 : emails de relance essai J+9, J+12, J+14
    cron.schedule('0 9 * * *', () => {
      sendTrialEmails().catch(err => console.error('[Cron relances]', err.message));
    });
    console.log('Cron relances essai démarré (quotidien à 9h00)');
  })
  .catch(err => {
    console.error('[MongoDB] Connexion impossible:', err.message);
    process.exit(1);
  });
