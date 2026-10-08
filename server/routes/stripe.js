import express from 'express';
import Stripe from 'stripe';
import { getDb } from '../db.js';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// Statut Stripe (customer.subscription.*) -> statut interne. null = aucun changement (statut non mappé).
export function mapStripeSubscriptionStatus(stripeStatus) {
  if (stripeStatus === 'active' || stripeStatus === 'trialing') return 'active';
  if (stripeStatus === 'past_due') return 'past_due';
  if (stripeStatus === 'canceled' || stripeStatus === 'unpaid' || stripeStatus === 'incomplete_expired') return 'cancelled';
  return null;
}

// Décide si un événement doit être appliqué à cet utilisateur : jamais pour un compte lifetime,
// jamais si l'événement est plus ancien que le dernier déjà appliqué (rejeu/livraison en retard).
export function shouldApplyStripeEvent(user, eventCreated) {
  if (!user) return false;
  if (user.subscriptionStatus === 'lifetime') return false;
  if (user.stripeLastEventAt != null && eventCreated < user.stripeLastEventAt) return false;
  return true;
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
        if (user.subscriptionStatus === 'lifetime') console.error('[StripeWebhook] checkout.session.completed : compte lifetime, ignoré');
      } else {
        await col.replaceOne({ id: user.id }, {
          ...user,
          subscriptionStatus: 'active',
          stripeCustomerId: customerId || user.stripeCustomerId,
          stripeSubscriptionId: subscriptionId || user.stripeSubscriptionId,
          stripeLastEventAt: event.created,
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
        if (user.subscriptionStatus === 'lifetime') console.error('[StripeWebhook] customer.subscription.deleted : compte lifetime, ignoré');
      } else {
        await col.replaceOne({ id: user.id }, {
          ...user,
          subscriptionStatus: 'cancelled',
          stripeCustomerId: sub.customer || user.stripeCustomerId,
          stripeLastEventAt: event.created,
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
        if (user.subscriptionStatus === 'lifetime') console.error('[StripeWebhook] customer.subscription.updated : compte lifetime, ignoré');
      } else {
        const mapped = mapStripeSubscriptionStatus(sub.status);
        if (mapped) {
          await col.replaceOne({ id: user.id }, {
            ...user,
            subscriptionStatus: mapped,
            stripeCustomerId: sub.customer || user.stripeCustomerId,
            stripeLastEventAt: event.created,
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
        if (user.subscriptionStatus === 'lifetime') console.error('[StripeWebhook] invoice.payment_failed : compte lifetime, ignoré');
      } else {
        await col.replaceOne({ id: user.id }, { ...user, subscriptionStatus: 'past_due', stripeLastEventAt: event.created });
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
        if (user.subscriptionStatus === 'lifetime') console.error('[StripeWebhook] invoice.payment_succeeded : compte lifetime, ignoré');
      } else if (user.subscriptionStatus === 'past_due') {
        await col.replaceOne({ id: user.id }, { ...user, subscriptionStatus: 'active', stripeLastEventAt: event.created });
      }
    } else {
      console.error('[StripeWebhook] invoice.payment_succeeded : aucun utilisateur correspondant trouvé');
    }
  }

  res.json({ received: true });
}

// ── Route protégée : création session Checkout ────────────────────────────
router.post('/create-checkout-session', async (req, res) => {
  try {
    const stripe = getStripe();
    const db = await getDb();
    const user = await db.collection('users').findOne({ id: req.userId }, PROJ);
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });

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
    console.error('[Stripe] create-portal-session error:', err.message);
    res.status(500).json({ error: 'Impossible de créer la session du portail. Réessayez plus tard.' });
  }
});

export default router;
