import { Link } from 'react-router-dom';

const T = { green: '#2D6A4F', text: '#1C2B1E', muted: '#6B7280', bg: '#F8F6F1', border: '#E5E0D8' };

function Section({ title, children }) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.125rem', fontWeight: 700, color: T.text, marginBottom: '0.75rem', paddingBottom: '0.5rem', borderBottom: `1px solid ${T.border}` }}>
        {title}
      </h2>
      <div style={{ fontSize: '0.9rem', color: '#374151', lineHeight: 1.75 }}>
        {children}
      </div>
    </section>
  );
}

export default function MentionsLegales() {
  const isMobile = false;
  const cardPad = '2.5rem';

  return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img src="/logo.png" alt="CloverIA" style={{ width: '80px', height: 'auto', objectFit: 'contain', display: 'inline-block', marginBottom: '1rem' }}
            onError={e => { e.currentTarget.style.display = 'none'; }} />
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? '1.4rem' : '1.75rem', fontWeight: 700, color: T.text, marginBottom: '0.5rem' }}>
            Mentions légales
          </h1>
          <p style={{ color: T.muted, fontSize: '0.875rem' }}>Dernière mise à jour : mai 2026</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: cardPad }}>

          <Section title="Éditeur du site">
            <p>Le site CloverIA FicheTech est édité à titre individuel par :</p>
            <ul style={{ marginTop: '0.75rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li><strong>Nom :</strong> Sébastien Mifsud</li>
              <li><strong>Adresse :</strong> 5 square du Nozeroy, 78310 Maurepas, France</li>
              <li><strong>Email :</strong> <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a></li>
              <li><strong>SIRET :</strong> en cours d'immatriculation</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>En l'absence de structure juridique formalisée à ce stade, le service est proposé à titre individuel dans le cadre d'une activité professionnelle en cours de création.</p>
          </Section>

          <Section title="Directeur de la publication">
            <p>Le directeur de la publication est <strong>Sébastien Mifsud</strong>, joignable à l'adresse <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a>.</p>
          </Section>

          <Section title="Hébergement">
            <p><strong>Backend (API et base de données) :</strong></p>
            <ul style={{ marginTop: '0.35rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><strong>Société :</strong> Render Services, Inc.</li>
              <li><strong>Adresse :</strong> 525 Brannan St, Suite 300, San Francisco, CA 94107, États-Unis</li>
              <li><strong>Site :</strong> <a href="https://render.com" target="_blank" rel="noopener noreferrer" style={{ color: T.green }}>render.com</a></li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}><strong>Frontend (interface utilisateur) :</strong></p>
            <ul style={{ marginTop: '0.35rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              <li><strong>Société :</strong> Vercel Inc.</li>
              <li><strong>Adresse :</strong> 340 S Lemon Ave #4133, Walnut, CA 91789, États-Unis</li>
              <li><strong>Site :</strong> <a href="https://vercel.com" target="_blank" rel="noopener noreferrer" style={{ color: T.green }}>vercel.com</a></li>
            </ul>
          </Section>

          <Section title="Propriété intellectuelle">
            <p>L'ensemble du contenu de ce site (interface, code, textes, visuels) est protégé par le droit d'auteur et demeure la propriété exclusive de Sébastien Mifsud, sauf mention contraire.</p>
            <p style={{ marginTop: '0.5rem' }}>Toute reproduction, diffusion ou utilisation sans autorisation écrite préalable est interdite.</p>
          </Section>

          <Section title="Données personnelles">
            <p>Pour toute information relative au traitement de vos données personnelles, consultez notre{' '}
              <Link to="/politique-confidentialite" style={{ color: T.green, fontWeight: 600, textDecoration: 'none' }}>Politique de confidentialité</Link>.
            </p>
          </Section>

          <Section title="Contact">
            <p>Pour toute question relative au fonctionnement du site ou aux présentes mentions légales :</p>
            <p style={{ marginTop: '0.5rem' }}>
              <a href="mailto:contact@cloveria.fr" style={{ color: T.green, fontWeight: 600, textDecoration: 'none' }}>contact@cloveria.fr</a>
            </p>
          </Section>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${T.border}`, textAlign: 'center', fontSize: '0.8rem', color: T.muted }}>
            <Link to="/cgu" style={{ color: T.green, textDecoration: 'none', fontWeight: 600 }}>CGU</Link>
            {' '}·{' '}
            <Link to="/politique-confidentialite" style={{ color: T.green, textDecoration: 'none', fontWeight: 600 }}>Politique de confidentialité</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
