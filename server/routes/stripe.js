import express from 'express';
import Stripe from 'stripe';
import { getDb } from '../db.js';
import { envoyerPastDue } from '../emails/relances.js';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Convertit un horodatage d'événement Stripe (secondes Unix) en ISO8601.
function isoDepuisEventStripe(eventCreated) {
  return new Date(eventCreated * 1000).toISOString();
}

// Statut Stripe (customer.subscription.*) -> statut interne. null = aucun changement (statut non mappé).
export function mapStripeSubscriptionStatus(stripeStatus) {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active';
  if (stripeStatus === 'past_due') return 'past_due';
  if (stripeStatus === 'canceled' || stripeStatus === 'unpaid' || stripeStatus === 'incomplete_expired') return 'cancelled';
  return null;
}

// Décide si un événement doit être appliqué à cet utilisateur : jamais pour un compte supprimé,
// jamais pour un compte lifetime, jamais si l'événement est plus ancien que le dernier déjà
// appliqué (rejeu/livraison en retard).
export function shouldApplyStripeEvent(user, eventCreated) {
  if (!user) return false;
  if (user.deleted) return false;
  if (user.subscriptionStatus === 'lifetime') return false;
  if (user.stripeLastEventAt != null && eventCreated < user.stripeLastEventAt) return false;
  return true;
}

// Annule immédiatement l'abonnement Stripe d'un utilisateur. Ne fait rien si aucun abonnement
// n'est associé. Relit d'abord l'abonnement : introuvable (resource_missing) ou déjà 'canceled'
// est traité comme un succès, sans appeler cancel. Toute autre erreur est relancée (stripe_cancel_failed)
// sans jamais exposer err.message au client ; seul le code/type est journalisé, jamais de donnée personnelle.
export async function annulerAbonnementStripe(user, stripe = getStripe()) {
  if (!user?.stripeSubscriptionId) return;

  const estResourceMissing = (err) => err?.code === 'resource_missing' || err?.raw?.code === 'resource_missing';

  let subscription;
  try {
    subscription = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
  } catch (err) {
    if (estResourceMissing(err)) return;
    console.error('[Stripe] annulerAbonnementStripe (retrieve) : échec', err?.code || err?.type || 'erreur inconnue');
    throw new Error('stripe_cancel_failed');
  }

  if (subscription.status === 'canceled') return;

  try {
    await stripe.subscriptions.cancel(user.stripeSubscriptionId);
  } catch (err) {
    // Filet de sécurité : si l'abonnement a été annulé entre le retrieve et le cancel, on le traite comme un succès.
    const dejaAnnule = estResourceMissing(err) || /already.*cancel|no such subscription/i.test(err?.message || '');
    if (dejaAnnule) return;
    console.error('[Stripe] annulerAbonnementStripe (cancel) : échec', err?.code || err?.type || 'erreur inconnue');
    throw new Error('stripe_cancel_failed');
  }
}

// Champs à écrire pour un passage en 'past_due' : conserve la date du premier échec de l'épisode
// (ne la réinitialise pas si un épisode est déjà en cours), et indique s'il s'agit du premier échec.
export function champsPastDue(user, maintenant = new Date()) {
  const premierEpisode = !user?.pastDueSince;
  return {
    subscriptionStatus: 'past_due',
    pastDueSince: user?.pastDueSince || maintenant.toISOString(),
    premierEpisode,
  };
}

// Recherche l'utilisateur dans cet ordre : identifiant explicite (client_reference_id / metadata.userId),
// puis stripeCustomerId, puis (si fourni) email en dernier recours.
async function findUser(col, { userId, customerId, email } = {}) {
  if (userId) {
    const user = await col.findOne({ id: userId }, PROJ);
    if (user) return user;
  }
  if (customerId) {
    const user = await col.findOne({ stripeCustomerId: customerId }, PROJ);
    if (user) return user;
  }
  if (email) {
    const user = await col.findOne({ email: email.toLowerCase() }, PROJ);
    if (user) return user;
  }
  return null;
}

// ── Webhook public (monté avant authMiddleware dans index.js) ──────────────
export async function stripeWebhook(req, res) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(500).json({ error: 'Webhook non configuré' });
  }

  const sig = req.headers['stripe-signature'];
  let event;
  try {
    event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    return res.status(400).json({ error: `Webhook: ${err.message}` });
  }

  if (!event?.type) return res.status(400).json({ error: 'Événement invalide' });

  const db = await getDb();
  const col = db.collection('users');

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const email = session.customer_email || session.customer_details?.email;
    const user = await findUser(col, { userId: session.client_reference_id, customerId, email });
    if (user) {
      if (!shouldApplyStripeEvent(user, event.created)) {
        if (user.deleted) console.log('[StripeWebhook] checkout.session.completed : compte supprimé, ignoré');
        else if (user.subscriptionStatus === 'lifetime') console.error('[StripeWebhook] checkout.session.completed : compte lifetime, ignoré');
      } else {
        await col.replaceOne({ id: user.id }, {
          ...user,
          subscriptionStatus: 'active',
          stripeCustomerId: customerId || user.stripeCustomerId,
          stripeSubscriptionId: subscriptionId || user.stripeSubscriptionId,
          stripeLastEventAt: event.created,
          pastDueSince: null,
          abonnementTermineLe: null,
          prevenuEffacementLe: null,
        });
      }
    } else {
      console.error('[StripeWebhook] checkout.session.completed : aucun utilisateur correspondant trouvé');
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const user = await findUser(col, { userId: sub.metadata?.userId, customerId: sub.customer });
    if (user) {
      if (!shouldApplyStripeEvent(user, event.created)) {
        if (user.deleted) console.log('[StripeWebhook] customer.subscription.deleted : compte supprimé, ignoré');
        else if (user.subscriptionStatus === 'lifetime') console.error('[StripeWebhook] customer.subscription.deleted : compte lifetime, ignoré');
      } else {
        await col.replaceOne({ id: user.id }, {
          ...user,
          subscriptionStatus: 'cancelled',
          stripeCustomerId: sub.customer || user.stripeCustomerId,
          stripeLastEventAt: event.created,
          abonnementTermineLe: user.abonnementTermineLe || isoDepuisEventStripe(event.created),
        });
      }
    } else {
      console.error('[StripeWebhook] customer.subscription.deleted : aucun utilisateur correspondant trouvé');
    }
  }

  if (event.type === 'customer.subscription.updated') {
    const sub = event.data.object;
    const user = await findUser(col, { userId: sub.metadata?.userId, customerId: sub.customer });
    if (user) {
      if (!shouldApplyStripeEvent(user, event.created)) {
        if (user.deleted) console.log('[StripeWebhook] customer.subscription.updated : compte supprimé, ignoré');
        else if (user.subscriptionStatus === 'lifetime') console.error('[StripeWebhook] customer.subscription.updated : compte lifetime, ignoré');
      } else {
        const mapped = mapStripeSubscriptionStatus(sub.status);
        if (mapped === 'past_due') {
          const { subscriptionStatus, pastDueSince, premierEpisode } = champsPastDue(user);
          await col.replaceOne({ id: user.id }, {
            ...user,
            subscriptionStatus,
            pastDueSince,
            stripeCustomerId: sub.customer || user.stripeCustomerId,
            stripeLastEventAt: event.created,
          });
          if (premierEpisode) {
            envoyerPastDue({ ...user, pastDueSince }).catch(() => {
              console.error('[StripeWebhook] envoi e-mail past_due : échec (customer.subscription.updated)');
            });
          }
        } else if (mapped) {
          await col.replaceOne({ id: user.id }, {
            ...user,
            subscriptionStatus: mapped,
            stripeCustomerId: sub.customer || user.stripeCustomerId,
            stripeLastEventAt: event.created,
            ...(mapped === 'active' ? { pastDueSince: null, abonnementTermineLe: null, prevenuEffacementLe: null } : {}),
            ...(mapped === 'cancelled' ? { abonnementTermineLe: user.abonnementTermineLe || isoDepuisEventStripe(event.created) } : {}),
          });
        }
      }
    } else {
      console.error('[StripeWebhook] customer.subscription.updated : aucun utilisateur correspondant trouvé');
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const user = await findUser(col, { customerId: invoice.customer });
    if (user) {
      if (!shouldApplyStripeEvent(user, event.created)) {
        if (user.deleted) console.log('[StripeWebhook] invoice.payment_failed : compte supprimé, ignoré');
        else if (user.subscriptionStatus === 'lifetime') console.error('[StripeWebhook] invoice.payment_failed : compte lifetime, ignoré');
      } else {
        const { subscriptionStatus, pastDueSince, premierEpisode } = champsPastDue(user);
        await col.replaceOne({ id: user.id }, { ...user, subscriptionStatus, pastDueSince, stripeLastEventAt: event.created });
        if (premierEpisode) {
          envoyerPastDue({ ...user, pastDueSince }).catch(() => {
            console.error('[StripeWebhook] envoi e-mail past_due : échec (invoice.payment_failed)');
          });
        }
      }
    } else {
      console.error('[StripeWebhook] invoice.payment_failed : aucun utilisateur correspondant trouvé');
    }
  }

  if (event.type === 'invoice.payment_succeeded') {
    const invoice = event.data.object;
    const user = await findUser(col, { customerId: invoice.customer });
    if (user) {
      if (!shouldApplyStripeEvent(user, event.created)) {
        if (user.deleted) console.log('[StripeWebhook] invoice.payment_succeeded : compte supprimé, ignoré');
        else if (user.subscriptionStatus === 'lifetime') console.error('[StripeWebhook] invoice.payment_succeeded : compte lifetime, ignoré');
      } else if (user.subscriptionStatus === 'past_due') {
        await col.replaceOne({ id: user.id }, {
          ...user,
          subscriptionStatus: 'active',
          stripeLastEventAt: event.created,
          pastDueSince: null,
          abonnementTermineLe: null,
          prevenuEffacementLe: null,
        });
      }
    } else {
      console.error('[StripeWebhook] invoice.payment_succeeded : aucun utilisateur correspondant trouvé');
    }
  }

  res.json({ received: true });
}

// Statuts Stripe d'un abonnement existant qui autorisent un nouvel abonnement : résilié, jamais activé,
// en attente de premier paiement, ou unpaid (Stripe ne tente plus aucun paiement ; traduit en
// 'cancelled' par mapStripeSubscriptionStatus).
const STATUTS_AUTORISANT_NOUVEL_ABONNEMENT = ['canceled', 'incomplete_expired', 'incomplete', 'unpaid'];

// Décide, sans base ni Stripe, si un nouvel abonnement peut être créé alors que le compte a déjà un
// stripeSubscriptionId. statutStripe = statut lu chez Stripe, ou null si l'abonnement est introuvable
// (resource_missing). Tout autre statut (active, trialing, past_due, paused, inconnu…) → refusé.
export function peutCreerNouvelAbonnement(statutStripe) {
  if (statutStripe === null) return true;
  return STATUTS_AUTORISANT_NOUVEL_ABONNEMENT.includes(statutStripe);
}

const estAbonnementIntrouvable = (err) => err?.code === 'resource_missing' || err?.raw?.code === 'resource_missing';

// ── Route protégée : création session Checkout ────────────────────────────
router.post('/create-checkout-session', async (req, res) => {
  try {
    const stripe = getStripe();
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: req.userId }, PROJ);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

    // Garde contre le double abonnement (DOUBLE-ABO-2).
    if (user.subscriptionStatus === 'lifetime') {
      return res.status(409).json({ code: 'compte_a_vie', error: 'Votre compte bénéficie d’un accès à vie : aucun abonnement n’est nécessaire.' });
    }
    if (user.stripeSubscriptionId) {
      let statutStripe;
      try {
        const abonnement = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
        statutStripe = abonnement?.status;
      } catch (err) {
        if (!estAbonnementIntrouvable(err)) {
          console.error('[Stripe] create-checkout-session (retrieve) : échec', err?.code || err?.type || 'erreur inconnue');
          return res.status(503).json({ code: 'stripe_indisponible', error: 'Le paiement est momentanément indisponible. Réessayez dans quelques minutes.' });
        }
        statutStripe = null;
      }
      if (!peutCreerNouvelAbonnement(statutStripe)) {
        console.log('[Stripe] create-checkout-session : abonnement existant, statut', String(statutStripe));
        return res.status(409).json({ code: 'abonnement_deja_actif', error: 'Vous avez déjà un abonnement. Vous pouvez le gérer depuis Paramètres.' });
      }
    }

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: user.email,
      line_items: [{ price: process.env.STRIPE_PRICE_ID, quantity: 1 }],
      success_url: 'https://app.cloveria-pro.fr/abonnement-confirme',
      cancel_url: 'https://app.cloveria-pro.fr/abonnement',
      client_reference_id: user.id,
      subscription_data: { metadata: { userId: user.id } },
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Route protégée : portail client Stripe (gestion abonnement) ───────────
router.post('/create-portal-session', async (req, res) => {
  try {
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: req.userId }, PROJ);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    if (!user.stripeCustomerId) {
      return res.status(400).json({ error: 'Aucun abonnement Stripe associé à ce compte.' });
    }

    const stripe = getStripe();
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: `${process.env.APP_URL || 'https://app.cloveria-pro.fr'}/parametres`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[Stripe] create-portal-session error:', err?.type || err?.name, err?.code ?? '');
    res.status(500).json({ error: 'Impossible de créer la session du portail. Réessayez plus tard.' });
  }
});

export default router;
