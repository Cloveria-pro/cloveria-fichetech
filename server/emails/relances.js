import { Resend } from 'resend';

console.log('[Relances] RESEND_API_KEY:', process.env.RESEND_API_KEY ? '***' : '(non défini)');

const resend = new Resend(process.env.RESEND_API_KEY);

const CHECKOUT_URL = 'https://app.cloveria-pro.fr/abonnement';

function layout(contenu) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>CloverIA FicheTech</title>
  <style>
    body { margin: 0; padding: 0; background: #F8F6F1; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; }
    .outer { width: 100%; background: #F8F6F1; padding: 40px 16px; box-sizing: border-box; }
    .card { max-width: 560px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08); }
    .header { background: #2D6A4F; padding: 32px 40px 28px; text-align: center; }
    .header-logo { display: block; width: 64px; height: 64px; border-radius: 12px; background: rgba(255,255,255,0.15); margin: 0 auto 14px; line-height: 64px; font-size: 32px; }
    .header-title { color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 0; opacity: 0.85; }
    .gold-bar { height: 4px; background: linear-gradient(90deg, #C9A84C 0%, #e8c96a 50%, #C9A84C 100%); }
    .body { padding: 40px; }
    .body h2 { font-size: 22px; font-weight: 800; color: #1C2B1E; margin: 0 0 20px; line-height: 1.3; }
    .body p { font-size: 15px; color: #374151; line-height: 1.75; margin: 0 0 16px; }
    .highlight { background: #F0F7F4; border-left: 4px solid #2D6A4F; border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 20px 0; }
    .highlight p { margin: 0; font-size: 14px; color: #1C2B1E; }
    .cta-wrap { text-align: center; margin: 32px 0 8px; }
    .cta { display: inline-block; padding: 16px 40px; background: #2D6A4F; color: #ffffff !important; text-decoration: none; border-radius: 10px; font-weight: 700; font-size: 15px; letter-spacing: 0.01em; }
    .price-badge { display: inline-block; background: #FFF8E8; border: 1px solid #C9A84C; color: #92670A; font-size: 13px; font-weight: 700; border-radius: 20px; padding: 4px 14px; margin-bottom: 24px; }
    .footer { background: #F8F6F1; padding: 20px 40px; text-align: center; border-top: 1px solid #E5E0D8; }
    .footer p { font-size: 11px; color: #9CA3AF; margin: 0; line-height: 1.6; }
    .footer a { color: #2D6A4F; text-decoration: none; }
  </style>
</head>
<body>
  <div class="outer">
    <div class="card">
      <div class="header">
        <div style="text-align:center;"><div style="background:white;border-radius:50%;width:110px;height:110px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px;"><img src="https://app.cloveria-pro.fr/logo.png" alt="CloverIA" style="width:90px;height:90px;object-fit:contain;"></div></div>
        <p class="header-title">CloverIA FicheTech</p>
      </div>
      <div class="gold-bar"></div>
      <div class="body">
        ${contenu}
      </div>
      <div class="footer">
        <p>
          Vous recevez cet email car vous avez un compte sur <a href="https://app.cloveria-pro.fr">app.cloveria-pro.fr</a><br />
          Une question ? <a href="mailto:contact@cloveria.fr">contact@cloveria.fr</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

const TEMPLATES = {
  9: {
    subject: 'Votre cuisine mérite le meilleur 🍀',
    html: (prenom) => layout(`
      <h2>${prenom ? `${prenom}, votre` : 'Votre'} aventure CloverIA continue !</h2>
      <p>Ça fait 9 jours que vous utilisez CloverIA FicheTech,vos fiches techniques prennent forme, vos food costs sont sous contrôle, votre cuisine s'optimise. On est vraiment fiers de vous accompagner.</p>
      <div class="highlight">
        <p>🍀 Il vous reste <strong>5 jours</strong> sur votre essai gratuit. On ne veut surtout pas que vous perdiez vos recettes, vos calculs et tout le travail accompli.</p>
      </div>
      <p>Pour continuer sans interruption et garder l'accès à toutes vos fiches, c'est simple :</p>
      <div style="text-align:center; margin: 8px 0 24px;">
        <span class="price-badge">39 € / mois · Sans engagement</span>
      </div>
      <div class="cta-wrap">
        <a href="${CHECKOUT_URL}" class="cta" style="color:#ffffff;">Continuer l'aventure →</a>
      </div>
    `),
  },
  12: {
    subject: 'Plus que 48h... on y tient 🍀',
    html: (prenom) => layout(`
      <h2>${prenom ? `${prenom}, il` : 'Il'} reste 48h sur votre essai</h2>
      <p>Vos recettes sont là. Vos calculs de food cost aussi. Tout ce que vous avez bâti pendant ces 12 jours vous attend, on voulait juste vous le rappeler avec douceur.</p>
      <div class="highlight">
        <p>🍀 Dans 48 heures, votre accès sera suspendu si aucun abonnement n'est activé. Vos données sont conservées, mais vous ne pourrez plus y accéder ni créer de nouvelles fiches.</p>
      </div>
      <p>Rejoindre CloverIA FicheTech, c'est investir dans votre rentabilité, pour le prix d'un repas par mois.</p>
      <div style="text-align:center; margin: 8px 0 24px;">
        <span class="price-badge">39 € / mois · Annulable à tout moment</span>
      </div>
      <div class="cta-wrap">
        <a href="${CHECKOUT_URL}" class="cta" style="color:#ffffff;">Je garde mon accès →</a>
      </div>
    `),
  },
  14: {
    subject: 'Vos fiches vous attendent 🍀',
    html: (prenom) => layout(`
      <h2>${prenom ? `${prenom}, votre` : 'Votre'} essai est terminé</h2>
      <p>Votre période d'essai gratuite de 14 jours est arrivée à son terme. Merci d'avoir pris le temps de découvrir CloverIA FicheTech, on espère que ça vous a été utile.</p>
      <div class="highlight">
        <p>🍀 Bonne nouvelle : <strong>toutes vos données sont sauvegardées</strong>. Vos fiches techniques, vos ingrédients, vos calculs, tout est là, intact, qui vous attend.</p>
      </div>
      <p>Dès que vous êtes prêt·e, vous pouvez reprendre exactement là où vous en étiez. Sans rien recommencer à zéro.</p>
      <div style="text-align:center; margin: 8px 0 24px;">
        <span class="price-badge">39 € / mois · Accès immédiat à la souscription</span>
      </div>
      <div class="cta-wrap">
        <a href="${CHECKOUT_URL}" class="cta" style="color:#ffffff;">Reprendre CloverIA →</a>
      </div>
    `),
  },
};

export async function envoyerRelance(user, jour) {
  const tpl = TEMPLATES[jour];
  if (!tpl) throw new Error(`Template inconnu pour le jour ${jour}`);

  if (!process.env.RESEND_API_KEY) {
    console.warn('[Relance] RESEND_API_KEY manquant,email non envoyé');
    return;
  }

  console.log(`[Relance] Envoi j${jour} à ${user.email}...`);
  await resend.emails.send({
    from: 'CloverIA <contact@cloveria.fr>',
    to: user.email,
    subject: tpl.subject,
    html: tpl.html(user.prenom),
  });
  console.log(`[Relance] j${jour} envoyé avec succès à ${user.email}`);
}
