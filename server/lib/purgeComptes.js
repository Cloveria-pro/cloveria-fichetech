import { statutPurge } from './eligibilitePurge.js';
import { effacerDonneesUtilisateur, COLLECTIONS_UTILISATEUR } from './effacerUtilisateur.js';

// Projection stricte pour la purge : jamais password_hash ni jetons. `email` n'est lu que pour
// l'exclusion du compte demo (eligibilitePurge.js), jamais journalisé.
const PROJECTION_PURGE = {
  projection: {
    _id: 0,
    id: 1,
    email: 1,
    subscriptionStatus: 1,
    betaAccess: 1,
    deleted: 1,
    disabled: 1,
    abonnementTermineLe: 1,
    trialEndDate: 1,
    stripeCustomerId: 1,
    pastDueSince: 1,
    prevenuEffacementLe: 1,
  },
};

const DIX_JOURS_MS = 10 * 24 * 60 * 60 * 1000;
const LIMITE_PAR_DEFAUT = 10;

// Mode de la tâche de purge, piloté par PURGE_MODE : 'reel' uniquement si la valeur est exactement
// 'reel' ; 'off' uniquement si exactement 'off' ; 'simulation' dans tous les autres cas (absente,
// mal orthographiée, etc.) — valeur par défaut la plus sûre.
export function modePurge(valeur = process.env.PURGE_MODE) {
  if (valeur === 'reel') return 'reel';
  if (valeur === 'off') return 'off';
  return 'simulation';
}

// Décision de purge pour un utilisateur, fonction pure (aucun accès base) : 'effacer' si
// statutPurge === 'effacer' ET une prévenance valide d'au moins 10 jours existe ; 'non-prevenu' si
// statutPurge === 'effacer' mais sans prévenance suffisante ; 'ignorer' sinon (y compris toutes les
// exclusions déjà appliquées par statutPurge : lifetime, betaAccess, demo, active, deleted, disabled,
// past_due en délai de grâce).
export function decisionPurge(user, maintenant = Date.now()) {
  if (statutPurge(user, maintenant) !== 'effacer') return 'ignorer';

  if (!user?.prevenuEffacementLe) return 'non-prevenu';
  const prevenuLe = new Date(user.prevenuEffacementLe).getTime();
  if (!Number.isFinite(prevenuLe)) return 'non-prevenu';
  if (maintenant - prevenuLe < DIX_JOURS_MS) return 'non-prevenu';

  return 'effacer';
}

// Exécute la tâche de purge selon le mode. 'off' : ne fait rien. 'simulation' : compte uniquement
// (aucune écriture). 'reel' : relit chaque candidat juste avant d'effacer (un réabonnement entre la
// sélection et l'effacement épargne le compte), limité à `limite` comptes par exécution ; un échec
// sur un compte est compté et n'arrête pas les suivants. Ne retourne et ne journalise jamais
// d'adresse e-mail, d'identifiant ni de nom d'établissement — uniquement des comptages.
export async function executerPurge(db, { mode, maintenant = Date.now(), limite = LIMITE_PAR_DEFAUT, effacer = effacerDonneesUtilisateur } = {}) {
  if (mode === 'off') {
    return { mode, aEffacer: 0, nonPrevenus: 0 };
  }

  const users = await db.collection('users')
    .find({ deleted: { $ne: true }, disabled: { $ne: true } }, PROJECTION_PURGE)
    .toArray();

  const candidats = [];
  let nonPrevenus = 0;
  for (const user of users) {
    const decision = decisionPurge(user, maintenant);
    if (decision === 'effacer') candidats.push(user);
    else if (decision === 'non-prevenu') nonPrevenus++;
  }
  const aTraiter = candidats.slice(0, limite);

  if (mode === 'simulation') {
    const comptagesCollections = {};
    for (const collection of COLLECTIONS_UTILISATEUR) comptagesCollections[collection] = 0;
    for (const user of aTraiter) {
      for (const collection of COLLECTIONS_UTILISATEUR) {
        comptagesCollections[collection] += await db.collection(collection).countDocuments({ user_id: user.id });
      }
    }
    return { mode, aEffacer: aTraiter.length, nonPrevenus, comptagesCollections };
  }

  // mode === 'reel'
  let effaces = 0;
  let epargnes = 0;
  let echecs = 0;
  for (const candidat of aTraiter) {
    try {
      const frais = await db.collection('users').findOne({ id: candidat.id }, PROJECTION_PURGE);
      if (!frais || decisionPurge(frais, maintenant) !== 'effacer') {
        epargnes++;
        continue;
      }
      await effacer(db, candidat.id);
      effaces++;
    } catch {
      echecs++;
    }
  }
  return { mode, effaces, epargnes, echecs, nonPrevenus };
}
