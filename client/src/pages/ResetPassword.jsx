import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { auth } from '../api.js';

const T = { green: '#2D6A4F', text: '#1C2B1E', muted: '#6B7280' };

export default function ResetPassword() {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get('token');
    if (!t) setError('Lien invalide. Demandez un nouveau lien depuis la page de connexion.');
    else setToken(t);
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    if (password.length < 6) { setError('Mot de passe trop court (6 caractères minimum)'); return; }
    setLoading(true);
    try {
      await auth.resetPassword(token, password);
      setSuccess(true);
      setTimeout(() => navigate('/login', { state: { message: 'Mot de passe mis à jour. Connectez-vous.' } }), 2500);
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
          {success ? (
            <>
              <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
                <span style={{ fontSize: '2.5rem' }}>✅</span>
              </div>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', fontWeight: 700, color: T.text, textAlign: 'center', marginBottom: '0.75rem' }}>
                Mot de passe mis à jour
              </h1>
              <p style={{ color: T.muted, fontSize: '0.875rem', textAlign: 'center' }}>
                Redirection vers la connexion…
              </p>
            </>
          ) : (
            <>
              <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', fontWeight: 700, color: T.text, marginBottom: '0.25rem' }}>
                Nouveau mot de passe
              </h1>
              <p style={{ color: T.muted, fontSize: '0.875rem', marginBottom: '1.75rem' }}>
                Choisissez un mot de passe d'au moins 6 caractères.
              </p>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    Nouveau mot de passe
                  </label>
                  <input
                    type="password" value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="6 caractères minimum" required autoFocus
                    autoComplete="new-password"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = T.green}
                    onBlur={e => e.target.style.borderColor = '#E5E0D8'}
                    disabled={!!error && !token}
                  />
                </div>
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.78rem', color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                    Confirmer le mot de passe
                  </label>
                  <input
                    type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
                    placeholder="••••••••" required
                    autoComplete="new-password"
                    style={inputStyle}
                    onFocus={e => e.target.style.borderColor = T.green}
                    onBlur={e => e.target.style.borderColor = '#E5E0D8'}
                    disabled={!!error && !token}
                  />
                </div>

                {error && (
                  <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '0.65rem 0.9rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991B1B' }}>
                    {error}
                  </div>
                )}

                <button
                  type="submit" disabled={loading || (!token && !!error)}
                  style={{
                    width: '100%', padding: '0.75rem', background: T.green, color: '#fff',
                    border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem',
                    cursor: (loading || (!token && !!error)) ? 'default' : 'pointer',
                    fontFamily: "'DM Sans', sans-serif",
                    opacity: (loading || (!token && !!error)) ? 0.5 : 1, minHeight: '44px',
                  }}
                  onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1e4d38'; }}
                  onMouseLeave={e => e.currentTarget.style.background = T.green}
                >
                  {loading ? 'Validation...' : 'Valider le nouveau mot de passe'}
                </button>
              </form>

              <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: T.muted }}>
                <Link to="/forgot-password" style={{ color: T.green, fontWeight: 600, textDecoration: 'none' }}>
                  Demander un nouveau lien
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
