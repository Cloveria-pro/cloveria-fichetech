import { useState } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../api.js';

const T = { green: '#2D6A4F', text: '#1C2B1E', muted: '#6B7280' };

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await auth.forgotPassword(email.trim());
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #E5E0D8',
    borderRadius: '8px', fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif",
    outline: 'none', color: T.text, background: '#fff', boxSizing: 'border-box',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="CloverIA" style={{ width: '180px', height: 'auto', objectFit: 'contain' }} />
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '2.5rem' }}>
          {submitted ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2.5rem' }}>📬</span>
              </div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', fontWeight: 700, color: T.text, marginBottom: '0.75rem', textAlign: 'center' }}>
                Email envoyé
              </h1>
              <p style={{ color: T.muted, fontSize: '0.875rem', lineHeight: 1.65, textAlign: 'center', marginBottom: '1.75rem' }}>
                Si un compte existe pour <strong>{email}</strong>, vous recevrez un lien de réinitialisation valable <strong>1 heure</strong>.
              </p>
              <p style={{ color: T.muted, fontSize: '0.8rem', textAlign: 'center' }}>
                <Link to="/login" style={{ color: T.green, fontWeight: 600, textDecoration: 'none' }}>
                  Retour à la connexion
                </Link>
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', fontWeight: 700, color: T.text, marginBottom: '0.25rem' }}>
                Mot de passe oublié
              </h1>
              <p style={{ color: T.muted, fontSize: '0.875rem', marginBottom: '1.75rem' }}>
                Entrez votre email pour recevoir un lien de réinitialisation.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1.25rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    Email
                  </label>
                  <input
                    type="email" value={email} onChange={e => setEmail(e.target.value)}
                    placeholder="chef@monrestaurant.fr" required autoFocus
                    autoComplete="email"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = T.green}
                    onBlur={e => e.target.style.borderColor = '#E5E0D8'}
                  />
                </div>

                {error && (
                  <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '0.65rem 0.9rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991B1B' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading}
                  style={{
                    width: '100%', padding: '0.75rem', background: T.green, color: '#fff',
                    border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem',
                    cursor: loading ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
                    opacity: loading ? 0.8 : 1, minHeight: '44px',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1e4d38'; }}
                  onMouseLeave={e => e.currentTarget.style.background = T.green}
                >
                  {loading ? 'Envoi...' : 'Envoyer le lien'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: T.muted }}>
                <Link to="/login" style={{ color: T.green, fontWeight: 600, textDecoration: 'none' }}>
                  Retour à la connexion
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
