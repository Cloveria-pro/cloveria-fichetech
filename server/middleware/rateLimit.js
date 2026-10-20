// Limiteur de tentatives en mémoire (un seul serveur Render). Clé = req.ip, qui est l'adresse du
// visiteur grâce à `trust proxy` (index.js) ; x-forwarded-for n'est jamais lu ici.
// Ne journalise rien : l'adresse n'existe que comme clé de cette Map, en mémoire.

const MESSAGE_429 = 'Trop de tentatives, réessayez dans quelques minutes';
const TAILLE_MAX = 10000;

// max : nombre de tentatives comptées autorisées par fenêtre.
// Chaque tentative est réservée dès l'entrée (de façon synchrone, avant next()) : des requêtes
// parallèles ne peuvent pas toutes passer le contrôle. compterSi(statut) décide, à la fin de la
// réponse, si la tentative reste comptée ; sinon elle est rendue. Une connexion coupée avant la
// fin de la réponse reste comptée. Une réponse 429 du limiteur n'est jamais comptée.
export function creerLimiteur({ max = 10, fenetreMs = 15 * 60 * 1000, compterSi = () => true } = {}) {
  const compteurs = new Map(); // clé → { compte, fin }

  function purgerExpirees(maintenant) {
    for (const [cle, entree] of compteurs) {
      if (entree.fin <= maintenant) compteurs.delete(cle);
    }
  }

  const minuterie = setInterval(() => purgerExpirees(Date.now()), Math.min(fenetreMs, 60 * 1000));
  minuterie.unref?.();

  return function limiteur(req, res, next) {
    const cle = req.ip;
    const maintenant = Date.now();
    let entree = compteurs.get(cle);

    if (entree && entree.fin > maintenant && entree.compte >= max) {
      res.set('Retry-After', String(Math.max(1, Math.ceil((entree.fin - maintenant) / 1000))));
      return res.status(429).json({ error: MESSAGE_429 });
    }

    // Réservation immédiate de la tentative.
    if (!entree || entree.fin <= maintenant) {
      if (compteurs.size >= TAILLE_MAX) purgerExpirees(maintenant);
      if (compteurs.size >= TAILLE_MAX) compteurs.delete(compteurs.keys().next().value); // la plus ancienne
      entree = { compte: 0, fin: maintenant + fenetreMs };
      compteurs.set(cle, entree);
    }
    entree.compte += 1;
    const reservee = entree;

    // Fin de réponse : la tentative est rendue si elle ne doit pas compter (ex. connexion réussie),
    // seulement si l'entrée réservée est toujours celle de la Map (pas recréée après expiration).
    res.on('finish', () => {
      if (compterSi(res.statusCode)) return;
      if (compteurs.get(cle) === reservee && reservee.compte > 0) reservee.compte -= 1;
    });

    next();
  };
}
