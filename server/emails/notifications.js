import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM   = process.env.RESEND_FROM_EMAIL || 'CloverIA <contact@cloveria.fr>';
const TO     = process.env.INTERNAL_NOTIFICATION_EMAIL || 'contact@cloveria.fr';

function row(label, value) {
  if (!value) return '';
  return `<tr><td style="padding:6px 0;color:#6B7280;font-size:13px;width:160px">${label}</td><td style="padding:6px 0;color:#1C2B1E;font-size:13px;font-weight:600">${value}</td></tr>`;
}

function html(titre, lignes, mention) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:32px;background:#F8F6F1;font-family:Arial,sans-serif">
<div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.06)">
  <div style="background:#2D6A4F;padding:20px 28px">
    <p style="margin:0;color:#fff;font-size:16px;font-weight:700">${titre}</p>
  </div>
  <div style="padding:24px 28px">
    <table cellpadding="0" cellspacing="0" border="0" width="100%">${lignes}</table>
    <p style="margin:20px 0 0;font-size:13px;color:#6B7280;border-top:1px solid #E5E0D8;padding-top:16px">${mention}</p>
  </div>
</div>
</body></html>`;
}

async function envoyer(sujet, htmlBody) {
  if (!process.env.RESEND_API_KEY) {
    console.warn('[Notif] RESEND_API_KEY manquant, notification non envoyée');
    return;
  }
  await resend.emails.send({ from: FROM, to: TO, subject: sujet, html: htmlBody });
}

export function notifierNouveauClient({ email, etablissement, id }) {
  const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  const lignes = row('Email', email) + row('Établissement', etablissement) + row('ID utilisateur', id) + row('Date / heure', now);
  const body = html('[NOUVEAU CLIENT] CloverIA', lignes, 'Le client a terminé son inscription et est arrivé dans l\'application.');
  envoyer('[NOUVEAU CLIENT] CloverIA', body).catch(err => console.error('[Notif] Nouveau client:', err.message));
}

export function notifierSuppressionCompte({ email, etablissement, id }) {
  const now = new Date().toLocaleString('fr-FR', { timeZone: 'Europe/Paris' });
  const lignes = row('Email', email) + row('Établissement', etablissement) + row('ID utilisateur', id) + row('Date / heure', now);
  const body = html('[SUPPRESSION COMPTE] CloverIA', lignes, 'Le compte client a été supprimé.');
  envoyer('[SUPPRESSION COMPTE] CloverIA', body).catch(err => console.error('[Notif] Suppression compte:', err.message));
}
