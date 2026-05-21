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

function SubTitle({ children }) {
  return <p style={{ fontWeight: 600, color: T.text, marginTop: '1rem', marginBottom: '0.25rem' }}>{children}</p>;
}

export default function PolitiqueConfidentialite() {
  return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img src="/logo.png" alt="CloverIA" style={{ width: '80px', height: 'auto', objectFit: 'contain', display: 'inline-block', marginBottom: '1rem' }}
            onError={e => { e.currentTarget.style.display = 'none'; }} />
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, color: T.text, marginBottom: '0.5rem' }}>
            Politique de confidentialité
          </h1>
          <p style={{ color: T.muted, fontSize: '0.875rem' }}>Dernière mise à jour : mai 2025 — Conforme au RGPD</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: '2.5rem' }}>

          <Section title="1. Responsable du traitement">
            <p><strong>Cloveria</strong> — éditeur de CloverIA FicheTech<br />
            Contact DPO : <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a></p>
            <p style={{ marginTop: '0.5rem' }}>Cloveria traite vos données personnelles en qualité de responsable du traitement, dans le respect du Règlement Général sur la Protection des Données (RGPD — UE 2016/679) et de la loi Informatique et Libertés.</p>
          </Section>

          <Section title="2. Données collectées">
            <SubTitle>Données de compte</SubTitle>
            <p>Adresse email, mot de passe (haché), nom de l'établissement, prénom (optionnel), type d'établissement, rôle dans l'établissement.</p>

            <SubTitle>Données d'utilisation du service</SubTitle>
            <p>Fiches techniques, recettes, ingrédients et leurs prix, cartes de restaurant, données de ventes importées, factures fournisseurs (images/PDF traités puis supprimés du serveur après analyse).</p>

            <SubTitle>Données de navigation</SubTitle>
            <p>Logs serveur techniques (adresse IP, horodatage des requêtes), uniquement à des fins de sécurité et de stabilité. Aucun cookie de tracking tiers.</p>

            <SubTitle>Données de paiement</SubTitle>
            <p>CloverIA FicheTech ne stocke aucune donnée bancaire. Les paiements sont gérés exclusivement par <strong>Stripe</strong>, certifié PCI-DSS. Seul un identifiant client Stripe est conservé pour la gestion de l'abonnement.</p>
          </Section>

          <Section title="3. Finalités du traitement">
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li><strong>Fourniture du service</strong> — gestion du compte, accès aux fonctionnalités, calculs de food cost (base légale : exécution du contrat)</li>
              <li><strong>Gestion de l'abonnement</strong> — facturation, suivi de la période d'essai, emails de rappel (base légale : exécution du contrat)</li>
              <li><strong>Amélioration du service</strong> — analyse agrégée et anonymisée des usages (base légale : intérêt légitime)</li>
              <li><strong>Communications transactionnelles</strong> — emails relatifs au compte et à l'abonnement (base légale : exécution du contrat)</li>
              <li><strong>Sécurité</strong> — prévention des accès non autorisés et des fraudes (base légale : intérêt légitime)</li>
            </ul>
          </Section>

          <Section title="4. Durée de conservation">
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li><strong>Données de compte actif</strong> — conservées pendant toute la durée de l'abonnement</li>
              <li><strong>Données de compte inactif</strong> — supprimées 12 mois après la dernière connexion ou après la résiliation</li>
              <li><strong>Documents importés</strong> (factures, fichiers de ventes) — supprimés du stockage temporaire immédiatement après traitement par l'IA</li>
              <li><strong>Logs techniques</strong> — conservés 90 jours à des fins de sécurité</li>
              <li><strong>Données de facturation</strong> — conservées 10 ans conformément aux obligations comptables légales</li>
            </ul>
          </Section>

          <Section title="5. Sous-traitants et transferts de données">
            <p>Cloveria fait appel aux sous-traitants suivants, tous liés par des accords de traitement de données conformes au RGPD :</p>
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[
                { name: 'MongoDB Atlas', role: 'Hébergement de la base de données', loc: 'UE (AWS eu-west-1, Irlande)' },
                { name: 'Render', role: 'Hébergement du serveur applicatif', loc: 'UE (Francfort)' },
                { name: 'Vercel', role: 'Hébergement du frontend', loc: 'UE / États-Unis (clauses contractuelles types)' },
                { name: 'Anthropic (Claude)', role: 'Traitement IA — structuration de recettes, descriptions commerciales, analyse de documents', loc: 'États-Unis (clauses contractuelles types UE–US)' },
                { name: 'Stripe', role: 'Paiement et gestion des abonnements', loc: 'UE / États-Unis (certifié PCI-DSS)' },
              ].map(st => (
                <div key={st.name} style={{ padding: '0.75rem 1rem', background: '#F9F8F5', borderRadius: '8px', borderLeft: `3px solid ${T.green}` }}>
                  <p style={{ fontWeight: 600, color: T.text, marginBottom: '2px' }}>{st.name}</p>
                  <p style={{ color: '#374151', fontSize: '0.875rem' }}>{st.role}</p>
                  <p style={{ color: T.muted, fontSize: '0.8rem', marginTop: '2px' }}>Localisation : {st.loc}</p>
                </div>
              ))}
            </div>
            <p style={{ marginTop: '1rem' }}>Aucune donnée n'est vendue ni partagée avec des tiers à des fins publicitaires.</p>
          </Section>

          <Section title="6. Droits des utilisateurs">
            <p>Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :</p>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li><strong>Droit d'accès</strong> — obtenir une copie de vos données</li>
              <li><strong>Droit de rectification</strong> — corriger des données inexactes</li>
              <li><strong>Droit à l'effacement</strong> — demander la suppression de votre compte et de vos données</li>
              <li><strong>Droit à la portabilité</strong> — recevoir vos données dans un format structuré</li>
              <li><strong>Droit d'opposition</strong> — vous opposer à certains traitements basés sur l'intérêt légitime</li>
              <li><strong>Droit à la limitation</strong> — restreindre le traitement dans certains cas</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>Pour exercer vos droits, contactez-nous à <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a>. Nous répondrons dans un délai de 30 jours. Vous avez également le droit d'introduire une réclamation auprès de la <strong>CNIL</strong> (www.cnil.fr).</p>
          </Section>

          <Section title="7. Sécurité des données">
            <p>Cloveria met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données : chiffrement des mots de passe (bcrypt), transmission chiffrée (HTTPS/TLS), accès aux bases de données restreint par authentification, journalisation des accès.</p>
          </Section>

          <Section title="8. Modifications de la politique">
            <p>Cloveria se réserve le droit de modifier cette politique. En cas de modification substantielle, les utilisateurs seront informés par email avec un préavis de 30 jours.</p>
          </Section>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${T.border}`, textAlign: 'center', fontSize: '0.8rem', color: T.muted }}>
            Contact : <a href="mailto:contact@cloveria.fr" style={{ color: T.green, textDecoration: 'none', fontWeight: 600 }}>contact@cloveria.fr</a>
            {' '}·{' '}
            <Link to="/cgu" style={{ color: T.green, textDecoration: 'none', fontWeight: 600 }}>CGU</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
