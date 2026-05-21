import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useWindowWidth } from '../hooks/useWindowWidth.js';

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280' };
const BG_PHOTO = 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1920&q=80';

export default function Login({ onLogin }) {
  const width = useWindowWidth();
  const isMobile = width < 768;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erreur de connexion'); return; }
      onLogin(data.token, data.user);
    } catch {
      setError('Erreur réseau. Vérifiez que le serveur est démarré.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #E5E0D8',
    borderRadius: '8px', fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif",
    outline: 'none', color: T.text, background: '#fff', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex' }}>

      {/* ── Colonne gauche — photo pleine hauteur ── */}
      {!isMobile && (
        <div style={{ flex: 1, position: 'relative', overflow: 'hidden' }}>
          <div style={{
            position: 'absolute', inset: 0,
            backgroundImage: `url('${BG_PHOTO}')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }} />
          {/* Fondu vers la droite pour une transition douce */}
          <div style={{
            position: 'absolute', inset: 0,
            background: 'linear-gradient(to right, transparent 70%, #ffffff 100%)',
          }} />
        </div>
      )}

      {/* ── Colonne droite — formulaire ── */}
      <div style={{
        flex: 1,
        background: '#fff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: isMobile ? '2.5rem 1.5rem' : '3rem 4rem',
        minHeight: '100vh',
        minWidth: isMobile ? '100vw' : undefined,
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>

          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
            <img
              src="/logo.png"
              alt="CloverIA FicheTech"
              style={{ width: '220px', height: 'auto', objectFit: 'contain', display: 'inline-block' }}
            />
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: T.text, marginBottom: '0.25rem' }}>
            Connexion
          </h1>
          <p style={{ color: T.muted, fontSize: '0.875rem', marginBottom: '1.75rem' }}>
            Accédez à vos fiches techniques
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Email
              </label>
              <input
                type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="chef@monrestaurant.fr" required autoFocus
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = T.green}
                onBlur={e => e.target.style.borderColor = '#E5E0D8'}
              />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>
                Mot de passe
              </label>
              <input
                type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
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
                opacity: loading ? 0.8 : 1, transition: 'background 0.15s', minHeight: '44px',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1e4d38'; }}
              onMouseLeave={e => e.currentTarget.style.background = T.green}
            >
              {loading ? 'Connexion...' : 'Se connecter'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.75rem', fontSize: '0.875rem', color: T.muted }}>
            Pas encore de compte ?{' '}
            <Link to="/register" style={{ color: T.green, fontWeight: 600, textDecoration: 'none' }}>
              S'inscrire
            </Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: T.muted }}>
            <Link to="/cgu" style={{ color: T.muted, textDecoration: 'none' }}>CGU</Link>
            {' · '}
            <Link to="/politique-confidentialite" style={{ color: T.muted, textDecoration: 'none' }}>Confidentialité</Link>
          </p>
        </div>
      </div>

    </div>
  );
}
