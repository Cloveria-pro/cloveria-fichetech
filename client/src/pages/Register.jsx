import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280' };

export default function Register({ onLogin }) {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirm: '', etablissement: '' });
  const [cguAccepted, setCguAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirm) { setError('Les mots de passe ne correspondent pas'); return; }
    if (form.password.length < 6) { setError('Mot de passe trop court (6 caractères minimum)'); return; }
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password, etablissement: form.etablissement }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Erreur lors de l\'inscription'); return; }
      onLogin(data.token, data.user);
      navigate('/onboarding');
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
  const labelStyle = { display: 'block', fontSize: '0.78rem', color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' };

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
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: T.text, marginBottom: '0.25rem' }}>Créer un compte</h1>
          <p style={{ color: T.muted, fontSize: '0.875rem', marginBottom: '1.75rem' }}>Votre espace de fiches techniques professionnel</p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Nom de l'établissement</label>
              <input value={form.etablissement} onChange={set('etablissement')} placeholder="Restaurant Chez Moi" required
                style={inputStyle} onFocus={e => e.target.style.borderColor = T.green} onBlur={e => e.target.style.borderColor = '#E5E0D8'} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Email</label>
              <input type="email" value={form.email} onChange={set('email')} placeholder="chef@monrestaurant.fr" required
                style={inputStyle} onFocus={e => e.target.style.borderColor = T.green} onBlur={e => e.target.style.borderColor = '#E5E0D8'} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Mot de passe</label>
              <input type="password" value={form.password} onChange={set('password')} placeholder="6 caractères minimum" required
                style={inputStyle} onFocus={e => e.target.style.borderColor = T.green} onBlur={e => e.target.style.borderColor = '#E5E0D8'} />
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={labelStyle}>Confirmer le mot de passe</label>
              <input type="password" value={form.confirm} onChange={set('confirm')} placeholder="••••••••" required
                style={inputStyle} onFocus={e => e.target.style.borderColor = T.green} onBlur={e => e.target.style.borderColor = '#E5E0D8'} />
            </div>

            <label style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '1.25rem', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={cguAccepted}
                onChange={e => setCguAccepted(e.target.checked)}
                style={{ marginTop: '3px', width: '16px', height: '16px', flexShrink: 0, accentColor: T.green, cursor: 'pointer' }}
              />
              <span style={{ fontSize: '0.8rem', color: T.muted, lineHeight: 1.5 }}>
                J'accepte les{' '}
                <a href="/cgu" target="_blank" rel="noopener noreferrer" style={{ color: T.green, fontWeight: 600, textDecoration: 'none' }}>CGU</a>
                {' '}et la{' '}
                <a href="/politique-confidentialite" target="_blank" rel="noopener noreferrer" style={{ color: T.green, fontWeight: 600, textDecoration: 'none' }}>Politique de confidentialité</a>
              </span>
            </label>

            {error && (
              <div style={{ background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '0.65rem 0.9rem', marginBottom: '1.25rem', fontSize: '0.875rem', color: '#991B1B' }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !cguAccepted} style={{
              width: '100%', padding: '0.75rem', background: T.green, color: '#fff',
              border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem',
              cursor: (loading || !cguAccepted) ? 'default' : 'pointer', fontFamily: "'DM Sans', sans-serif",
              opacity: (loading || !cguAccepted) ? 0.45 : 1, transition: 'background 0.15s, opacity 0.15s', minHeight: '44px',
            }}
              onMouseEnter={e => { if (!loading && cguAccepted) e.currentTarget.style.background = '#1e4d38'; }}
              onMouseLeave={e => e.currentTarget.style.background = T.green}
            >
              {loading ? 'Création du compte...' : 'Créer mon compte'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: T.muted }}>
            Déjà un compte ?{' '}
            <Link to="/login" style={{ color: T.green, fontWeight: 600, textDecoration: 'none' }}>Se connecter</Link>
          </p>
          <p style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.75rem', color: T.muted }}>
            <a href="/cgu" target="_blank" rel="noopener noreferrer" style={{ color: T.muted, textDecoration: 'none' }}>CGU</a>
            {' · '}
            <a href="/politique-confidentialite" target="_blank" rel="noopener noreferrer" style={{ color: T.muted, textDecoration: 'none' }}>Politique de confidentialité</a>
            {' · '}
            <a href="/mentions-legales" target="_blank" rel="noopener noreferrer" style={{ color: T.muted, textDecoration: 'none' }}>Mentions légales</a>
          </p>
        </div>
      </div>
    </div>
  );
}
