import { useNavigate } from 'react-router-dom';

const T = { green: '#2D6A4F', text: '#1C2B1E', muted: '#6B7280', bg: '#F8F6F1' };

export default function AbonnementConfirme() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '440px', textAlign: 'center' }}>

        <div style={{ marginBottom: '2rem' }}>
          <img src="/logo.png" alt="CloverIA" style={{ width: '100px', height: 'auto', objectFit: 'contain', display: 'inline-block' }}
            onError={e => { e.currentTarget.style.display = 'none'; }} />
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 32px rgba(0,0,0,0.09)', border: '2px solid rgba(45,106,79,0.15)', padding: '2.5rem 2rem' }}>

          <div style={{ width: '64px', height: '64px', background: 'rgba(45,106,79,0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
            <span style={{ fontSize: '2rem', color: T.green }}>✓</span>
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, color: T.text, marginBottom: '0.75rem', lineHeight: 1.2 }}>
            Merci pour votre abonnement&nbsp;!
          </h1>

          <p style={{ color: T.muted, fontSize: '0.9375rem', lineHeight: 1.6, marginBottom: '2rem' }}>
            Votre accès est maintenant actif.
          </p>

          <button
            onClick={() => navigate('/')}
            style={{
              width: '100%', padding: '0.875rem',
              background: T.green, color: '#fff',
              border: 'none', borderRadius: '10px', fontWeight: 700,
              fontSize: '1rem', cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s',
              minHeight: '48px',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#1e4d38'; }}
            onMouseLeave={e => { e.currentTarget.style.background = T.green; }}
          >
            Accéder à mon espace →
          </button>
        </div>
      </div>
    </div>
  );
}
