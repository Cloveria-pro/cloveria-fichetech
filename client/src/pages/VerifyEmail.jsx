import { useEffect, useState } from 'react';
import { auth } from '../api.js';

const T = {
  green: '#2D6A4F',
  greenLight: '#F0F7F4',
  gold: '#C9A84C',
  text: '#1C2B1E',
  muted: '#6B7280',
  border: '#E5E0D8',
  bg: '#F8F6F1',
};

export default function VerifyEmail({ userEmail, onVerified }) {
  const displayEmail = userEmail || sessionStorage.getItem('pendingVerificationEmail');
  const [status, setStatus] = useState('idle'); // idle | verifying | success | error
  const [errorMsg, setErrorMsg] = useState('');
  const [resending, setResending] = useState(false);
  const [resendMsg, setResendMsg] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setStatus('verifying');
      auth.verifyEmail(token)
        .then(() => {
          sessionStorage.removeItem('pendingVerificationEmail');
          setStatus('success');
        })
        .catch((e) => { setStatus('error'); setErrorMsg(e.message); });
    }
  }, []);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const id = setTimeout(() => setResendCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [resendCooldown]);

  async function handleResend() {
    setResending(true);
    setResendMsg('');
    try {
      await auth.resendVerification();
      setResendMsg('Email renvoyé ! Vérifiez votre boîte de réception.');
      setResendCooldown(60);
    } catch (e) {
      const match = e.message.match(/(\d+) secondes/);
      if (match) setResendCooldown(parseInt(match[1], 10));
      setResendMsg(e.message);
    } finally {
      setResending(false);
    }
  }

  const card = {
    background: '#fff',
    borderRadius: '16px',
    boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
    overflow: 'hidden',
    maxWidth: '480px',
    width: '100%',
    margin: '0 auto',
  };

  const body = { padding: '2.5rem 2.5rem 2rem' };

  const btn = {
    display: 'block',
    width: '100%',
    padding: '0.85rem',
    background: T.green,
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontWeight: 700,
    fontSize: '0.95rem',
    cursor: 'pointer',
    marginTop: '1.5rem',
    fontFamily: 'inherit',
  };

  const btnOutline = {
    ...btn,
    background: 'transparent',
    color: T.green,
    border: `1.5px solid ${T.green}`,
    marginTop: '0.75rem',
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
      <div style={card}>
        <div style={{ background: T.green, padding: '1.75rem 2.5rem', textAlign: 'center' }}>
          <div style={{ background: 'white', borderRadius: '50%', width: '64px', height: '64px', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: '0.75rem' }}>
            <img src="https://app.cloveria-pro.fr/logo.png" alt="CloverIA" style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
          </div>
          <p style={{ color: 'rgba(255,255,255,0.85)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', margin: 0 }}>
            CloverIA FicheTech
          </p>
        </div>
        <div style={{ height: '4px', background: `linear-gradient(90deg, ${T.gold} 0%, #e8c96a 50%, ${T.gold} 100%)` }} />

        <div style={body}>
          {status === 'idle' && (
            <>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: T.text, margin: '0 0 0.75rem' }}>
                Confirmez votre adresse email
              </h2>
              <p style={{ fontSize: '0.9rem', color: T.muted, lineHeight: 1.7, margin: '0 0 1rem' }}>
                Un email de confirmation a été envoyé à <strong style={{ color: T.text }}>{displayEmail}</strong>.
                Cliquez sur le lien dans cet email pour accéder à votre espace CloverIA.
              </p>
              <div style={{ background: T.greenLight, borderLeft: `4px solid ${T.green}`, borderRadius: '0 8px 8px 0', padding: '0.85rem 1rem', fontSize: '0.82rem', color: T.text, lineHeight: 1.6 }}>
                Vérifiez aussi vos spams si vous ne le trouvez pas.
              </div>
              <button
                style={resendCooldown > 0 || resending ? { ...btnOutline, opacity: 0.5, cursor: 'not-allowed' } : btnOutline}
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
              >
                {resending ? 'Envoi en cours…' : resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : 'Renvoyer l\'email de confirmation'}
              </button>
              {resendMsg && (
                <p style={{ fontSize: '0.82rem', color: T.muted, textAlign: 'center', marginTop: '0.75rem', lineHeight: 1.5 }}>
                  {resendMsg}
                </p>
              )}
            </>
          )}

          {status === 'verifying' && (
            <p style={{ fontSize: '0.95rem', color: T.muted, textAlign: 'center', padding: '1rem 0' }}>
              Vérification en cours…
            </p>
          )}

          {status === 'success' && (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.25rem' }}>
                <span style={{ fontSize: '2.5rem' }}>✓</span>
              </div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: T.text, margin: '0 0 0.75rem', textAlign: 'center' }}>
                Email confirmé !
              </h2>
              <p style={{ fontSize: '0.9rem', color: T.muted, lineHeight: 1.7, margin: '0 0 0.5rem', textAlign: 'center' }}>
                Votre adresse email a bien été vérifiée. Vous pouvez maintenant accéder à votre espace.
              </p>
              <button style={btn} onClick={onVerified}>
                Accéder à CloverIA →
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, color: '#DC2626', margin: '0 0 0.75rem' }}>
                Lien invalide ou expiré
              </h2>
              <p style={{ fontSize: '0.9rem', color: T.muted, lineHeight: 1.7, margin: '0 0 1rem' }}>
                {errorMsg || 'Ce lien de confirmation n\'est plus valide.'}
              </p>
              <button
                style={resendCooldown > 0 || resending ? { ...btn, opacity: 0.5, cursor: 'not-allowed' } : btn}
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
              >
                {resending ? 'Envoi en cours…' : resendCooldown > 0 ? `Renvoyer dans ${resendCooldown}s` : 'Recevoir un nouveau lien'}
              </button>
              {resendMsg && (
                <p style={{ fontSize: '0.82rem', color: T.muted, textAlign: 'center', marginTop: '0.75rem', lineHeight: 1.5 }}>
                  {resendMsg}
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
