import express from 'express';
import bcrypt from 'bcryptjs';
import { getDb } from '../db.js';
import { notifierSuppressionCompte } from '../emails/notifications.js';
import { annulerAbonnementStripe } from './stripe.js';
import { effacerDonneesUtilisateur } from '../lib/effacerUtilisateur.js';

const router = express.Router();

function adminAuth(req, res, next) {
  const key = req.headers['x-admin-key'];
  if (!key || !process.env.ADMIN_SECRET || key !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'Accès non autorisé' });
  }
  next();
}

const SAFE_PROJECTION = {
  projection: {
    _id: 0,
    password_hash: 0,
    emailVerificationToken: 0,
    emailVerificationExpiry: 0,
    emailVerificationSentAt: 0,
    stripeCustomerId: 0,
    stripeSubscriptionId: 0,
  },
};

// Compte test : uniquement les adresses sebastienmifsud+test<chiffres>@gmail.com (correspondance exacte).
const TEST_ACCOUNT_REGEX = /^sebastienmifsud\+test\d*@gmail\.com$/;

function isTestAccount(email) {
  return TEST_ACCOUNT_REGEX.test((email || '').toLowerCase().trim());
}

// Compte payant (ou passé par Stripe) : jamais supprimé par les routes « comptes test ».
function estComptePayant(u) {
  return ['active', 'lifetime', 'past_due'].includes(u.subscriptionStatus) || !!u.stripeCustomerId;
}

const TEST_PROJECTION = { projection: { _id: 0, id: 1, email: 1, subscriptionStatus: 1, stripeCustomerId: 1, stripeSubscriptionId: 1 } };

function computeStatut(u, nbFiches) {
  if (u.subscriptionStatus === 'active') return 'client engagé';
  if (u.subscriptionStatus === 'lifetime') return 'client engagé';
  if (u.email === 'demo@cloveria.fr') return 'activé';
  if (!u.emailVerified) return 'lead';
  if (nbFiches > 0) return 'activé';
  return 'à relancer';
}

router.get('/users', adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const users = await db.collection('users')
      .find({}, SAFE_PROJECTION)
      .sort({ created_at: -1 })
      .toArray();

    const enriched = await Promise.all(users.map(async (u) => {
      const realFilter = { user_id: u.id, _source: { $ne: 'example' } };
      const [nbFiches, nbIngredients, nbCartes, firstFiche] = await Promise.all([
        db.collection('recettes').countDocuments(realFilter),
        db.collection('ingredients').countDocuments(realFilter),
        db.collection('cartes').countDocuments(realFilter),
        db.collection('recettes').findOne(realFilter, { sort: { created_at: 1 }, projection: { _id: 0, created_at: 1 } }),
      ]);

      return {
        id: u.id,
        email: u.email,
        etablissement: u.etablissement || '',
        createdAt: u.created_at || null,
        emailVerified: u.emailVerified === true,
        onboardingComplete: u.onboardingComplete === true,
        subscriptionStatus: u.subscriptionStatus || null,
        trialEndDate: u.trialEndDate || null,
        plan: u.plan || null,
        nbFiches,
        nbIngredients,
        nbCartes,
        prenom: u.prenom || '',
        typeEtablissement: u.typeEtablissement || '',
        role: u.role || '',
        objectifs: u.objectifs || [],
        nbPlats: u.nbPlats || '',
        sourceDecouverte: u.sourceDecouverte || '',
        examplePackChoice: u.examplePackChoice || null,
        disabled: u.disabled === true,
        deleted: u.deleted === true,
        deletedAt: u.deletedAt || null,
        lastLoginAt: u.lastLoginAt || null,
        lastSeenAt: u.lastSeenAt || null,
        firstFicheAt: firstFiche?.created_at || null,
        statutCommercial: computeStatut(u, nbFiches),
      };
    }));

    res.json(enriched);
  } catch (err) {
    console.error('[Admin] GET /users error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

router.post('/reset-user-password', adminAuth, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'email et password requis' });
    if (password.length < 8) return res.status(400).json({ error: 'Mot de passe trop court (8 caractères minimum)' });
    const db = await getDb();
    const hash = await bcrypt.hash(password, 10);
    const result = await db.collection('users').updateOne(
      { email: email.toLowerCase().trim() },
      { $set: { password_hash: hash, updated_at: new Date().toISOString() } }
    );
    if (result.matchedCount === 0) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/disable', adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: req.params.id }, { projection: { _id: 0, id: 1, email: 1, disabled: 1 } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const newState = !user.disabled;
    await db.collection('users').updateOne(
      { id: user.id },
      { $set: { disabled: newState, disabledAt: newState ? new Date().toISOString() : null, updated_at: new Date().toISOString() } }
    );
    res.json({ success: true, disabled: newState, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: req.params.id }, { projection: { _id: 0, id: 1, email: 1, etablissement: 1, deleted: 1, stripeSubscriptionId: 1, stripeCustomerId: 1 } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const abonnementStripe = !!(user.stripeSubscriptionId || user.stripeCustomerId);

    try {
      await annulerAbonnementStripe(user);
    } catch {
      console.error('[Admin] annulation Stripe à la suppression : échec');
      return res.status(503).json({ error: "Impossible d'annuler l'abonnement Stripe. Le compte n'a pas été supprimé." });
    }

    try {
      await effacerDonneesUtilisateur(db, user.id);
    } catch (err) {
      console.error('[Admin] effacement des données à la suppression : échec', err?.collection || 'inconnue');
      return res.status(503).json({ error: "L'effacement des données n'a pas abouti. Le compte n'a pas été entièrement supprimé." });
    }

    notifierSuppressionCompte({ abonnementStripe });
    res.json({ success: true, archived: user.email, erased: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/lifetime', adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: req.params.id }, { projection: { _id: 0, id: 1, email: 1 } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    await db.collection('users').updateOne(
      { id: user.id },
      { $set: { subscriptionStatus: 'lifetime', trialEndDate: null, updated_at: new Date().toISOString() } }
    );
    res.json({ success: true, email: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/remove-lifetime', adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: req.params.id }, { projection: { _id: 0, id: 1, email: 1, created_at: 1 } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    const base = user.created_at ? new Date(user.created_at) : new Date();
    const trialEndDate = new Date(base.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString();
    await db.collection('users').updateOne(
      { id: user.id },
      { $set: { subscriptionStatus: 'trial', trialEndDate, updated_at: new Date().toISOString() } }
    );
    res.json({ success: true, email: user.email, trialEndDate });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/users/:id/restore', adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: req.params.id }, { projection: { _id: 0, id: 1, email: 1 } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    await db.collection('users').updateOne(
      { id: user.id },
      {
        $unset: { deleted: '', deletedAt: '' },
        $set: { disabled: false, updated_at: new Date().toISOString() },
      }
    );
    res.json({ success: true, restored: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/test-accounts/:id', adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: req.params.id }, TEST_PROJECTION);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (!isTestAccount(user.email)) return res.status(403).json({ error: 'Compte non autorisé à la suppression — email ne correspond pas à un compte test' });
    if (estComptePayant(user)) return res.status(403).json({ error: 'Compte payant : utiliser la suppression normale' });

    try {
      await annulerAbonnementStripe(user);
    } catch {
      console.error('[Admin] annulation Stripe (compte test) : échec');
      return res.status(503).json({ error: "Impossible d'annuler l'abonnement Stripe. Le compte n'a pas été supprimé." });
    }

    try {
      await effacerDonneesUtilisateur(db, user.id);
    } catch (err) {
      console.error('[Admin] effacement des données (compte test) : échec', err?.collection || 'inconnue');
      return res.status(503).json({ error: "L'effacement des données n'a pas abouti. Le compte n'a pas été entièrement supprimé." });
    }

    res.json({ success: true, deleted: user.email });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/test-accounts', adminAuth, async (req, res) => {
  try {
    const db = await getDb();
    const all = await db.collection('users').find({}, TEST_PROJECTION).toArray();
    const targets = all.filter(u => isTestAccount(u.email));
    if (targets.length === 0) return res.json({ success: true, deleted: 0, emails: [], skipped: [], failed: 0 });

    const emails = [];
    const skipped = [];
    let failed = 0;
    for (const user of targets) {
      if (estComptePayant(user)) {
        skipped.push(user.email);
        continue;
      }
      try {
        await annulerAbonnementStripe(user);
        await effacerDonneesUtilisateur(db, user.id);
        emails.push(user.email);
      } catch {
        failed++;
      }
    }
    console.log(`[Admin] suppression comptes test : supprimés ${emails.length}, ignorés ${skipped.length}, échecs ${failed}`);
    res.json({ success: true, deleted: emails.length, emails, skipped, failed });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
