import './env.js';

import express from 'express';
import cors from 'cors';
import cron from 'node-cron';
import nodemailer from 'nodemailer';
import { getDb } from './db.js';
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

// ── Emails essai ────────────────────────────────────────────────────────────
function createTransporter() {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return null;
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  });
}

function emailHtml(title, body, ctaText, ctaUrl) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
    body{font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;background:#F8F6F1;margin:0;padding:0}
    .wrap{max-width:560px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.07)}
    .header{background:#2D6A4F;padding:28px 32px;text-align:center}
    .header h1{color:#fff;font-size:22px;margin:0;letter-spacing:-0.02em}
    .body{padding:32px}
    .body p{color:#374151;font-size:15px;line-height:1.7;margin:0 0 16px}
    .cta{display:block;width:fit-content;margin:24px auto 0;padding:14px 32px;background:#2D6A4F;color:#fff!important;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px}
    .footer{padding:16px 32px;text-align:center;font-size:12px;color:#9CA3AF;border-top:1px solid #F3F4F6}
  </style></head><body>
    <div class="wrap">
      <div class="header"><h1>CloverIA FicheTech</h1></div>
      <div class="body">
        <p><strong>${title}</strong></p>
        ${body}
        <a href="${ctaUrl}" class="cta">${ctaText}</a>
      </div>
      <div class="footer">CloverIA &mdash; Vous recevez cet email car vous avez un compte sur app.cloveria-pro.fr</div>
    </div>
  </body></html>`;
}

const EMAIL_TEMPLATES = {
  j9: {
    subject: 'Votre essai CloverIA se termine dans 5 jours',
    html: (prenom) => emailHtml(
      `${prenom ? `${prenom}, votre` : 'Votre'} essai gratuit se termine dans 5 jours`,
      `<p>Vous utilisez CloverIA FicheTech depuis 9 jours. Votre période d'essai gratuite se termine dans <strong>5 jours</strong>.</p>
       <p>Pour continuer à créer vos fiches techniques et suivre vos coûts sans interruption, abonnez-vous dès maintenant pour <strong>39&euro;/mois</strong>.</p>`,
      "S'abonner maintenant",
      'https://app.cloveria-pro.fr/abonnement'
    ),
  },
  j12: {
    subject: 'Plus que 2 jours pour vous abonner à CloverIA',
    html: (prenom) => emailHtml(
      `Plus que 2 jours`,
      `<p>${prenom ? `${prenom}, il` : 'Il'} ne vous reste plus que <strong>2 jours</strong> sur votre essai gratuit.</p>
       <p>Ne perdez pas vos fiches techniques et votre suivi des coûts. Abonnez-vous pour <strong>39&euro;/mois</strong> et continuez sans interruption.</p>`,
      "S'abonner avant expiration",
      'https://app.cloveria-pro.fr/abonnement'
    ),
  },
  j14: {
    subject: "Dernier jour de votre essai gratuit CloverIA",
    html: (prenom) => emailHtml(
      `Dernier jour`,
      `<p>C'est aujourd'hui le dernier jour de votre essai gratuit${prenom ? `, ${prenom}` : ''}.</p>
       <p>Après aujourd'hui, votre accès sera suspendu. Abonnez-vous pour <strong>39&euro;/mois</strong> pour garder l'accès à vos fiches et à tous vos données.</p>`,
      "S'abonner maintenant",
      'https://app.cloveria-pro.fr/abonnement'
    ),
  },
};

async function sendTrialEmails() {
  const transporter = createTransporter();
  if (!transporter) return;

  const db = await getDb();
  const now = new Date();
  const users = await db.collection('users')
    .find({ subscriptionStatus: 'trial' }, { projection: { _id: 0 } })
    .toArray();

  for (const user of users) {
    if (!user.trialStartDate || !user.email) continue;

    const msElapsed = now - new Date(user.trialStartDate);
    const daysElapsed = Math.floor(msElapsed / (1000 * 60 * 60 * 24));
    const emailsEnvoyes = user.emailsEnvoyes || [];

    let emailKey = null;
    if (daysElapsed >= 14 && !emailsEnvoyes.includes('j14')) emailKey = 'j14';
    else if (daysElapsed >= 12 && !emailsEnvoyes.includes('j12')) emailKey = 'j12';
    else if (daysElapsed >= 9 && !emailsEnvoyes.includes('j9')) emailKey = 'j9';

    if (!emailKey) continue;

    const tpl = EMAIL_TEMPLATES[emailKey];
    try {
      await transporter.sendMail({
        from: `CloverIA <${process.env.EMAIL_USER}>`,
        to: user.email,
        subject: tpl.subject,
        html: tpl.html(user.prenom),
      });
      const updated = { ...user, emailsEnvoyes: [...emailsEnvoyes, emailKey] };
      await db.collection('users').replaceOne({ id: user.id }, updated);
      console.log(`Email ${emailKey} envoyé à ${user.email}`);
    } catch (err) {
      console.error(`Erreur email ${emailKey} pour ${user.email}:`, err.message);
    }
  }
}

// ── Démarrage ────────────────────────────────────────────────────────────────
getDb()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Serveur demarre sur le port ${PORT}`);
    });

    // Cron toutes les heures : emails essai J+9, J+12, J+14
    cron.schedule('0 * * * *', () => {
      sendTrialEmails().catch(err => console.error('[Cron emails]', err.message));
    });
    console.log('Cron emails essai demarré (toutes les heures)');
  })
  .catch(err => {
    console.error('[MongoDB] Connexion impossible:', err.message);
    process.exit(1);
  });
