import { useState } from 'react';
import { Link } from 'react-router-dom';

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280' };

export default function Login({ onLogin }) {
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

  function fillDemo() { setEmail('demo@cloveria.fr'); setPassword('Demo1234!'); }

  const inputStyle = {
    width: '100%', padding: '0.65rem 0.9rem', border: '1px solid #E5E0D8',
    borderRadius: '8px', fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif",
    outline: 'none', color: T.text, background: '#fff', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#F8F6F1', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
      <div style={{ width: '100%', maxWidth: '400px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: T.text }}>CloverIA</div>
          <div style={{ color: T.gold, fontSize: '11px', fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', marginTop: '4px' }}>FicheTech</div>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '2.5rem' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: T.text, marginBottom: '0.25rem' }}>Connexion</h1>
          <p style={{ color: T.muted, fontSize: '0.875rem', marginBottom: '1.75rem' }}>Accédez à vos fiches techniques</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="chef@monrestaurant.fr" required autoFocus
                style={inputStyle} onFocus={e => e.target.style.borderColor = T.green} onBlur={e => e.target.style.borderColor = '#E5E0D8'} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontSize: '0.78rem', color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Mot de passe</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required
                style={inputStyle} onFocus={e => e.target.style.borderColor = T.green} onBlur={e => e.target.style.borderColor = '#E5E0D8'} />
            </div>

            {error && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '0.65rem 0.9rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991B1B' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} style={{
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

          {/* Demo shortcut */}
          <div style={{ marginTop: '1.25rem', padding: '0.875rem', background: 'rgba(201,168,76,0.08)', borderRadius: '8px', border: '1px solid rgba(201,168,76,0.25)', textAlign: 'center' }}>
            <div style={{ fontSize: '0.78rem', color: '#8B6914', fontWeight: 600, marginBottom: '6px' }}>Compte de démonstration</div>
            <button onClick={fillDemo} style={{ background: 'none', border: 'none', color: T.gold, cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, textDecoration: 'underline', fontFamily: "'DM Sans', sans-serif" }}>
              demo@cloveria.fr / Demo1234!
            </button>
          </div>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: T.muted }}>
            Pas encore de compte ?{' '}
            <Link to="/register" style={{ color: T.green, fontWeight: 600, textDecoration: 'none' }}>S'inscrire</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
