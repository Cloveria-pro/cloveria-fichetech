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
        <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 0 12px;"><div style="background:white;border-radius:50%;width:110px;height:110px;display:inline-flex;align-items:center;justify-content:center;"><img src="https://app.cloveria-pro.fr/logo.png" alt="CloverIA" style="width:90px;height:90px;object-fit:contain;"></div></td></tr></table>
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
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 0;"><a href="https://app.cloveria-pro.fr/abonnement" target="_blank" style="background-color:#2D6A4F;color:#ffffff !important;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;mso-padding-alt:0;font-family:Arial,sans-serif;">Continuer l'aventure →</a></td></tr></table>
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
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 0;"><a href="https://app.cloveria-pro.fr/abonnement" target="_blank" style="background-color:#2D6A4F;color:#ffffff !important;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;mso-padding-alt:0;font-family:Arial,sans-serif;">Je garde mon accès →</a></td></tr></table>
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
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 0;"><a href="https://app.cloveria-pro.fr/abonnement" target="_blank" style="background-color:#2D6A4F;color:#ffffff !important;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;mso-padding-alt:0;font-family:Arial,sans-serif;">Reprendre CloverIA →</a></td></tr></table>
    `),
  },

  post2: {
    subject: 'Vos fiches vous attendent 🍀',
    html: (prenom) => layout(`
      <h2>${prenom ? `${prenom}, tout` : 'Tout'} est encore là pour vous</h2>
      <p>Votre essai s'est terminé il y a 2 jours. On voulait juste vous dire : pas de pression, pas d'urgence. Votre travail est en sécurité.</p>
      <div class="highlight">
        <p>🍀 Toutes vos fiches techniques, vos ingrédients et vos calculs sont sauvegardés. Vous pouvez reprendre exactement là où vous en étiez, à tout moment.</p>
      </div>
      <p>Si vous avez envie de continuer à piloter vos coûts et à construire votre cuisine de manière rentable, on est là. Sans engagement, 39 € par mois.</p>
      <div style="text-align:center; margin: 8px 0 24px;">
        <span class="price-badge">39 € / mois · Sans engagement</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 0;"><a href="https://app.cloveria-pro.fr/abonnement" target="_blank" style="background-color:#2D6A4F;color:#ffffff !important;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;mso-padding-alt:0;font-family:Arial,sans-serif;">Reprendre où j'en étais →</a></td></tr></table>
    `),
  },

  post7: {
    subject: 'Une semaine sans CloverIA 🍀',
    html: (prenom) => layout(`
      <h2>${prenom ? `${prenom}, une` : 'Une'} semaine s'est passée</h2>
      <p>Ça fait 7 jours que vous n'avez plus accès à vos fiches. On se demandait si vous aviez eu le temps de recalculer vos marges à la main, de vérifier vos food costs, de suivre vos coûts matière sur chaque plat.</p>
      <div class="highlight">
        <p>🍀 Avec CloverIA, tout ça se fait en quelques clics. Vos recettes sont déjà là, vos ingrédients aussi. Il suffit de réactiver votre accès pour reprendre le contrôle.</p>
      </div>
      <p>Chaque semaine sans suivi, ce sont des marges qui glissent sans qu'on le voit. On pense que vous méritez mieux que ça.</p>
      <div style="text-align:center; margin: 8px 0 24px;">
        <span class="price-badge">39 € / mois · Annulable à tout moment</span>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 0;"><a href="https://app.cloveria-pro.fr/abonnement" target="_blank" style="background-color:#2D6A4F;color:#ffffff !important;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;mso-padding-alt:0;font-family:Arial,sans-serif;">Je reviens →</a></td></tr></table>
    `),
  },

  post15: {
    subject: 'On pense encore à vous 🍀',
    html: (prenom) => layout(`
      <h2>Un message de Sébastien</h2>
      <p>${prenom ? `${prenom}, je` : 'Je'} voulais vous écrire directement, sans discours commercial. CloverIA FicheTech, c'est un projet que je construis pour aider les restaurateurs à mieux piloter leur cuisine. Et vous en faites partie.</p>
      <div class="highlight">
        <p>🍀 Vos données sont toujours là, intactes. Si la période n'était pas la bonne, si vous avez eu d'autres priorités, c'est tout à fait normal. La porte reste ouverte.</p>
      </div>
      <p>Si vous avez des questions, des retours, ou simplement envie de discuter, répondez directement à cet email. Je lis tout personnellement.</p>
      <p>Et si vous êtes prêt·e à reprendre, c'est toujours 39 € par mois, sans engagement.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 0;"><a href="https://app.cloveria-pro.fr/abonnement" target="_blank" style="background-color:#2D6A4F;color:#ffffff !important;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;mso-padding-alt:0;font-family:Arial,sans-serif;">Reprendre CloverIA →</a></td></tr></table>
    `),
  },

  post40: {
    subject: 'On ne vous oublie pas 🍀',
    html: (prenom) => layout(`
      <h2>De Sébastien, 40 jours plus tard</h2>
      <p>${prenom ? `${prenom}, je` : 'Je'} ne voulais pas vous laisser partir sans vous écrire une dernière fois. Ce n'est pas un email automatique de relance. C'est juste moi, qui pense à toutes les personnes qui ont essayé CloverIA et qui sont passées à autre chose.</p>
      <div class="highlight">
        <p>🍀 Depuis votre essai, j'ai continué à améliorer la plateforme : l'import de factures par IA, le menu engineering, les fiches allergènes. CloverIA est plus solide qu'avant.</p>
      </div>
      <p>Si le moment est mieux maintenant, vos données sont encore là. Si ce n'est pas le bon moment, c'est très bien aussi. Dans tous les cas, merci d'avoir essayé.</p>
      <p style="color:#6B7280;font-size:14px;">Sébastien, fondateur de CloverIA</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:24px 0;"><a href="https://app.cloveria-pro.fr/abonnement" target="_blank" style="background-color:#2D6A4F;color:#ffffff !important;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;mso-padding-alt:0;font-family:Arial,sans-serif;">Voir ce qui a changé →</a></td></tr></table>
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
