import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';

const T = { green: '#2D6A4F', text: '#1C2B1E', muted: '#6B7280', bg: '#F8F6F1' };

const FEATURES = [
  'Fiches techniques illimitées',
  'Calcul food cost en temps réel',
  'Import factures fournisseurs par IA',
  'Création de fiches par description libre',
  'Cartes de restaurant avec KPIs',
  'Menu Engineering avec analyse ventes',
  'Export PDF fiches + allergènes',
  'Support inclus',
];

export default function Abonnement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubscribe() {
    setLoading(true);
    setError('');
    try {
      const { url } = await api.stripe.createCheckoutSession();
      window.location.href = url;
    } catch (err) {
      if (err.message !== 'trial_expired') {
        setError('Une erreur est survenue. Veuillez réessayer.');
      }
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '440px' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <img src="/logo.png" alt="CloverIA" style={{ width: '100px', height: 'auto', objectFit: 'contain', display: 'inline-block' }}
            onError={e => { e.currentTarget.style.display = 'none'; }} />
        </div>

        {/* Titre */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, color: T.text, marginBottom: '0.75rem', lineHeight: 1.2 }}>
            Votre période d'essai est terminée
          </h1>
          <p style={{ color: T.muted, fontSize: '0.9375rem', lineHeight: 1.6 }}>
            Abonnez-vous pour continuer à utiliser CloverIA FicheTech et accéder à toutes vos données.
          </p>
        </div>

        {/* Pricing card */}
        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 4px 32px rgba(0,0,0,0.09)', border: '2px solid rgba(45,106,79,0.15)', overflow: 'hidden' }}>

          {/* Header tarif */}
          <div style={{ background: T.green, padding: '1.75rem 2rem 1.5rem', textAlign: 'center' }}>
            <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
              Abonnement mensuel
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: '4px' }}>
              <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '3.5rem', fontWeight: 800, color: '#fff', lineHeight: 1 }}>39</span>
              <span style={{ color: 'rgba(255,255,255,0.85)', fontSize: '1.1rem', fontWeight: 600, paddingBottom: '8px' }}>&euro;/mois</span>
            </div>
            <div style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.8rem', marginTop: '6px' }}>Sans engagement &mdash; annulable à tout moment</div>
          </div>

          {/* Features */}
          <div style={{ padding: '1.5rem 2rem' }}>
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {FEATURES.map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.875rem', color: T.text }}>
                  <span style={{ color: T.green, fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>

            {error && (
              <div style={{ marginTop: '1rem', padding: '0.65rem 0.9rem', background: '#FEE2E2', border: '1px solid #FCA5A5', borderRadius: '8px', fontSize: '0.875rem', color: '#991B1B' }}>
                {error}
              </div>
            )}

            <button
              onClick={handleSubscribe}
              disabled={loading}
              style={{
                marginTop: '1.25rem', width: '100%', padding: '0.875rem',
                background: loading ? '#4a8a6a' : T.green, color: '#fff',
                border: 'none', borderRadius: '10px', fontWeight: 700,
                fontSize: '1rem', cursor: loading ? 'default' : 'pointer',
                fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s',
                minHeight: '48px',
              }}
              onMouseEnter={e => { if (!loading) e.currentTarget.style.background = '#1e4d38'; }}
              onMouseLeave={e => { if (!loading) e.currentTarget.style.background = T.green; }}
            >
              {loading ? 'Redirection vers le paiement...' : "S'abonner pour 39 €/mois"}
            </button>
          </div>
        </div>

        {/* Contact */}
        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.8rem', color: T.muted }}>
          Une question ?{' '}
          <a href="mailto:contact@cloveria.fr" style={{ color: T.green, fontWeight: 600, textDecoration: 'none' }}>contact@cloveria.fr</a>
        </p>
        <p style={{ textAlign: 'center', marginTop: '0.75rem', fontSize: '0.75rem', color: T.muted }}>
          <Link to="/cgu" target="_blank" rel="noopener noreferrer" style={{ color: T.muted, textDecoration: 'none' }}>CGU</Link>
          {' · '}
          <Link to="/politique-confidentialite" target="_blank" rel="noopener noreferrer" style={{ color: T.muted, textDecoration: 'none' }}>Politique de confidentialité</Link>
          {' · '}
          <Link to="/mentions-legales" target="_blank" rel="noopener noreferrer" style={{ color: T.muted, textDecoration: 'none' }}>Mentions légales</Link>
        </p>
      </div>
    </div>
  );
}
