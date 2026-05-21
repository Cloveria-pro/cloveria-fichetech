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

export default function CGU() {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img src="/logo.png" alt="CloverIA" style={{ width: '80px', height: 'auto', objectFit: 'contain', display: 'inline-block', marginBottom: '1rem' }}
            onError={e => { e.currentTarget.style.display = 'none'; }} />
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, color: T.text, marginBottom: '0.5rem' }}>
            Conditions Générales d'Utilisation
          </h1>
          <p style={{ color: T.muted, fontSize: '0.875rem' }}>Dernière mise à jour : mai 2025</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: '2.5rem' }}>

          <Section title="1. Objet du service">
            <p>CloverIA FicheTech (ci-après « le Service ») est une application SaaS éditée par Cloveria, destinée aux professionnels de la restauration. Elle permet la création et la gestion de fiches techniques, le calcul du food cost, l'import de factures fournisseurs et l'analyse des ventes.</p>
            <p style={{ marginTop: '0.5rem' }}>Les présentes Conditions Générales d'Utilisation (CGU) régissent l'accès au Service et son utilisation. En créant un compte, l'utilisateur accepte ces CGU sans réserve.</p>
          </Section>

          <Section title="2. Accès et inscription">
            <p>L'accès au Service est réservé aux professionnels (restaurateurs, chefs, gérants d'établissements de restauration). L'inscription nécessite la création d'un compte avec une adresse email valide et un mot de passe.</p>
            <p style={{ marginTop: '0.5rem' }}>Tout nouvel utilisateur bénéficie d'une période d'essai gratuite de 14 jours, sans engagement. À l'issue de cette période, un abonnement mensuel est requis pour continuer à accéder au Service. L'utilisateur est responsable de la confidentialité de ses identifiants.</p>
          </Section>

          <Section title="3. Utilisation du service">
            <p>L'utilisateur s'engage à utiliser le Service de manière licite et conformément à sa destination. Il est notamment interdit de :</p>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li>Tenter d'accéder de manière non autorisée au Service ou aux données d'autres utilisateurs</li>
              <li>Transmettre des contenus illicites, diffamatoires ou portant atteinte aux droits de tiers</li>
              <li>Utiliser le Service à des fins de revente ou de mise à disposition à des tiers sans accord préalable</li>
              <li>Automatiser l'accès au Service de manière abusive</li>
            </ul>
            <p style={{ marginTop: '0.5rem' }}>Cloveria se réserve le droit de suspendre tout compte en cas de violation de ces conditions.</p>
          </Section>

          <Section title="4. Données personnelles">
            <p>La collecte et le traitement des données personnelles dans le cadre du Service sont décrits dans notre <Link to="/politique-confidentialite" style={{ color: T.green, fontWeight: 600, textDecoration: 'none' }}>Politique de confidentialité</Link>. Conformément au RGPD, l'utilisateur dispose d'un droit d'accès, de rectification et de suppression de ses données.</p>
          </Section>

          <Section title="5. Propriété intellectuelle">
            <p>Le Service, son interface, ses algorithmes, ses bases de données et tout contenu fourni par Cloveria sont protégés par les droits de propriété intellectuelle. L'utilisateur bénéficie d'un droit d'usage personnel, non exclusif et non transférable.</p>
            <p style={{ marginTop: '0.5rem' }}>Les données saisies par l'utilisateur (fiches techniques, ingrédients, recettes) restent sa propriété. Cloveria n'exploite pas ces données à des fins commerciales sans consentement.</p>
          </Section>

          <Section title="6. Limitation de responsabilité">
            <p>Le Service est fourni « en l'état ». Cloveria s'engage à maintenir la disponibilité du Service mais ne peut garantir une disponibilité ininterrompue. En cas d'interruption, Cloveria ne saurait être tenu responsable des pertes commerciales éventuelles.</p>
            <p style={{ marginTop: '0.5rem' }}>Les calculs de food cost fournis par le Service sont indicatifs. L'utilisateur reste seul responsable de ses décisions commerciales et de la vérification des données saisies.</p>
          </Section>

          <Section title="7. Abonnement et résiliation">
            <p>L'abonnement est mensuel, sans engagement, facturé via Stripe. L'utilisateur peut résilier à tout moment depuis son espace ou en contactant <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a>. La résiliation prend effet à la fin de la période en cours.</p>
            <p style={{ marginTop: '0.5rem' }}>Cloveria se réserve le droit de modifier les tarifs avec un préavis de 30 jours par email.</p>
          </Section>

          <Section title="8. Droit applicable">
            <p>Les présentes CGU sont soumises au droit français. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut, les tribunaux compétents du ressort de Paris seront saisis.</p>
          </Section>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${T.border}`, textAlign: 'center', fontSize: '0.8rem', color: T.muted }}>
            Contact : <a href="mailto:contact@cloveria.fr" style={{ color: T.green, textDecoration: 'none', fontWeight: 600 }}>contact@cloveria.fr</a>
            {' '}·{' '}
            <Link to="/politique-confidentialite" style={{ color: T.green, textDecoration: 'none', fontWeight: 600 }}>Politique de confidentialité</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
