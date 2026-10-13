import { delaiDeGraceActif } from '../middleware/checkAccess.js';

const SOIXANTE_JOURS = 60;
const QUARANTE_CINQ_JOURS = 45;

// Date de référence de la fin d'abonnement/essai pour un utilisateur, ou null si aucune ne s'applique :
// abonnementTermineLe si posé par le webhook Stripe (S11) ; sinon trialEndDate, mais seulement pour un
// essai jamais converti (aucun stripeCustomerId) encore au statut 'trial'.
export function dateFinReference(user) {
  if (user?.abonnementTermineLe) return user.abonnementTermineLe;
  if (user?.subscriptionStatus === 'trial' && !user?.stripeCustomerId && user?.trialEndDate) {
    return user.trialEndDate;
  }
  return null;
}

// Nombre entier de jours écoulés depuis la date de référence, ou null si celle-ci est absente/invalide.
export function joursDepuisFin(user, maintenant = Date.now()) {
  const reference = dateFinReference(user);
  if (!reference) return null;
  const depuis = new Date(reference).getTime();
  if (!Number.isFinite(depuis)) return null;
  const JOUR_MS = 24 * 60 * 60 * 1000;
  return Math.floor((maintenant - depuis) / JOUR_MS);
}

// Est-ce un compte jamais concerné par l'effacement automatique, quel que soit son ancienneté ?
function estExclu(user) {
  if (!user) return true;
  if (user.subscriptionStatus === 'lifetime') return true;
  if (user.betaAccess === true) return true;
  if (user.email === 'demo@cloveria.fr' || user.id === 'demo') return true;
  if (user.subscriptionStatus === 'active') return true;
  if (user.deleted === true) return true;
  if (user.disabled === true) return true;
  if (user.subscriptionStatus === 'past_due' && delaiDeGraceActif(user)) return true;
  return false;
}

// Statut de purge automatique d'un utilisateur : 'exclu' (jamais concerné, ou pas de date de référence),
// 'attente' (date de référence connue, moins de 45 jours, ou déjà prévenu), 'prevenir' (45 à 59 jours
// inclus, jamais prévenu) ou 'effacer' (60 jours ou plus). N'effectue aucune écriture ni accès base.
export function statutPurge(user, maintenant = Date.now()) {
  if (estExclu(user)) return 'exclu';

  const jours = joursDepuisFin(user, maintenant);
  if (jours === null) return 'exclu';

  if (jours >= SOIXANTE_JOURS) return 'effacer';
  if (jours >= QUARANTE_CINQ_JOURS) {
    return user.prevenuEffacementLe ? 'attente' : 'prevenir';
  }
  return 'attente';
}
