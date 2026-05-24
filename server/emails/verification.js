import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const APP_URL = process.env.APP_URL || 'https://app.cloveria-pro.fr';

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
    .header-title { color: #ffffff; font-size: 13px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; margin: 0; opacity: 0.85; }
    .gold-bar { height: 4px; background: linear-gradient(90deg, #C9A84C 0%, #e8c96a 50%, #C9A84C 100%); }
    .body { padding: 40px; }
    .body h2 { font-size: 22px; font-weight: 800; color: #1C2B1E; margin: 0 0 20px; line-height: 1.3; }
    .body p { font-size: 15px; color: #374151; line-height: 1.75; margin: 0 0 16px; }
    .highlight { background: #F0F7F4; border-left: 4px solid #2D6A4F; border-radius: 0 8px 8px 0; padding: 14px 18px; margin: 20px 0; }
    .highlight p { margin: 0; font-size: 14px; color: #1C2B1E; }
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
          Vous recevez cet email car vous venez de créer un compte sur <a href="https://app.cloveria-pro.fr">app.cloveria-pro.fr</a><br />
          Une question ? <a href="mailto:contact@cloveria.fr">contact@cloveria.fr</a>
        </p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

export async function envoyerConfirmationEmail(email, token) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Verification] RESEND_API_KEY manquant, email non envoyé');
    return;
  }

  const url = `${APP_URL}/verify-email?token=${token}`;

  const html = layout(`
    <h2>Confirmez votre adresse email</h2>
    <p>Votre compte CloverIA FicheTech a bien été créé. Pour finaliser votre inscription et accéder à votre espace, confirmez votre adresse email en cliquant ci-dessous.</p>
    <div class="highlight">
      <p>🍀 Ce lien est valable <strong>24 heures</strong>. Si vous n'avez pas créé de compte CloverIA, ignorez simplement cet email.</p>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center" style="padding:28px 0 16px;"><a href="${url}" target="_blank" style="background-color:#2D6A4F;color:#ffffff !important;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:16px;display:inline-block;mso-padding-alt:0;font-family:Arial,sans-serif;">Confirmer mon adresse email →</a></td></tr></table>
    <p style="font-size:12px;color:#9CA3AF;text-align:center;margin-top:4px;">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br /><span style="color:#2D6A4F;word-break:break-all;">${url}</span></p>
  `);

  console.log(`[Verification] Envoi confirmation à ${email}...`);
  await resend.emails.send({
    from: 'CloverIA <contact@cloveria.fr>',
    to: email,
    subject: 'Confirmez votre adresse email — CloverIA FicheTech',
    html,
  });
  console.log(`[Verification] Confirmation envoyée à ${email}`);
}
