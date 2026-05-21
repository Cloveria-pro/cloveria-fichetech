import express from 'express';
import Stripe from 'stripe';
import { getDb } from '../db.js';

const router = express.Router();
const PROJ = { projection: { _id: 0 } };

function getStripe() {
  return new Stripe(process.env.STRIPE_SECRET_KEY);
}

// ── Webhook public (monté avant authMiddleware dans index.js) ──────────────
export async function stripeWebhook(req, res) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  let event;

  if (webhookSecret) {
    const sig = req.headers['stripe-signature'];
    try {
      event = getStripe().webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err) {
      return res.status(400).json({ error: `Webhook: ${err.message}` });
    }
  } else {
    // Sans signature : utiliser le body JSON parsé
    event = req.body;
  }

  if (!event?.type) return res.status(400).json({ error: 'Événement invalide' });

  const db = await getDb();
  const col = db.collection('users');

  if (event.type === 'checkout.session.completed') {
    const session = event.data.object;
    const customerId = session.customer;
    const subscriptionId = session.subscription;
    const email = session.customer_email || session.customer_details?.email;
    const query = customerId ? { stripeCustomerId: customerId } : { email: email?.toLowerCase() };
    const user = await col.findOne(query, PROJ);
    if (user) {
      await col.replaceOne({ id: user.id }, {
        ...user,
        subscriptionStatus: 'active',
        stripeCustomerId: customerId || user.stripeCustomerId,
        stripeSubscriptionId: subscriptionId || user.stripeSubscriptionId,
      });
    }
  }

  if (event.type === 'customer.subscription.deleted') {
    const sub = event.data.object;
    const user = await col.findOne({ stripeCustomerId: sub.customer }, PROJ);
    if (user) {
      await col.replaceOne({ id: user.id }, { ...user, subscriptionStatus: 'cancelled' });
    }
  }

  if (event.type === 'invoice.payment_failed') {
    const invoice = event.data.object;
    const user = await col.findOne({ stripeCustomerId: invoice.customer }, PROJ);
    if (user) {
      await col.replaceOne({ id: user.id }, { ...user, subscriptionStatus: 'past_due' });
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
    });

    res.json({ url: session.url });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
