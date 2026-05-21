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

const SOUS_TRAITANTS = [
  { name: 'MongoDB Atlas', role: 'Hébergement de la base de données', loc: 'UE (AWS eu-west-1, Irlande)' },
  { name: 'Render', role: 'Hébergement du serveur applicatif', loc: 'UE (Francfort) / USA selon plan' },
  { name: 'Vercel', role: 'Hébergement du frontend', loc: 'UE / États-Unis' },
  { name: 'Anthropic (Claude)', role: 'Traitement IA — structuration de recettes, descriptions commerciales, analyse de documents', loc: 'États-Unis' },
  { name: 'Stripe', role: 'Paiement et gestion des abonnements', loc: 'UE / États-Unis — certifié PCI-DSS' },
];

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
          <p style={{ color: T.muted, fontSize: '0.875rem' }}>Dernière mise à jour : mai 2025 — Conforme au RGPD (UE 2016/679)</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: '2.5rem' }}>

          <Section title="1. Identité de l'éditeur">
            <p><strong>CloverIA</strong><br />
            Éditeur individuel<br />
            Email : <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a></p>
            <p style={{ marginTop: '0.5rem' }}>Pour toute demande d'identification complémentaire, contactez-nous à <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a>.</p>
          </Section>

          <Section title="2. Responsable du traitement">
            <p>CloverIA traite vos données personnelles en qualité de responsable du traitement, dans le respect du Règlement Général sur la Protection des Données (RGPD — UE 2016/679) et de la loi Informatique et Libertés modifiée.</p>
            <p style={{ marginTop: '0.5rem' }}>Contact : <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a></p>
          </Section>

          <Section title="3. Données collectées">
            <SubTitle>Données de compte</SubTitle>
            <p>Adresse email, mot de passe (haché via bcrypt, non lisible), nom de l'établissement, prénom (optionnel), type d'établissement, rôle dans l'établissement.</p>

            <SubTitle>Données d'utilisation du service</SubTitle>
            <p>Fiches techniques, recettes, ingrédients et leurs prix, cartes de restaurant, données de ventes importées, factures fournisseurs (images/PDF traités puis supprimés du serveur après analyse par l'IA).</p>

            <SubTitle>Données de navigation</SubTitle>
            <p>Logs serveur techniques (adresse IP, horodatage des requêtes), uniquement à des fins de sécurité et de stabilité du service. Aucun cookie publicitaire ni outil de tracking comportemental.</p>

            <SubTitle>Données de paiement</SubTitle>
            <p>CloverIA ne stocke aucune donnée bancaire. Les paiements sont gérés exclusivement par <strong>Stripe</strong>, certifié PCI-DSS niveau 1. Seul un identifiant client Stripe est conservé pour la gestion de l'abonnement.</p>
          </Section>

          <Section title="4. Finalités du traitement">
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li><strong>Fourniture du service</strong> — gestion du compte, accès aux fonctionnalités, calculs de food cost (base légale : exécution du contrat)</li>
              <li><strong>Gestion de l'abonnement</strong> — facturation, suivi de la période d'essai, emails de rappel (base légale : exécution du contrat)</li>
              <li><strong>Amélioration du service</strong> — analyse agrégée et anonymisée des usages (base légale : intérêt légitime)</li>
              <li><strong>Communications transactionnelles</strong> — emails relatifs au compte et à l'abonnement (base légale : exécution du contrat)</li>
              <li><strong>Sécurité</strong> — prévention des accès non autorisés et des fraudes (base légale : intérêt légitime)</li>
            </ul>
          </Section>

          <Section title="5. Durée de conservation">
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li><strong>Données de compte actif</strong> — conservées pendant toute la durée de l'abonnement</li>
              <li><strong>Données de compte inactif</strong> — supprimées 12 mois après la dernière connexion ou après la résiliation</li>
              <li><strong>Documents importés</strong> (factures, fichiers de ventes) — supprimés du stockage temporaire immédiatement après traitement par l'IA</li>
              <li><strong>Logs techniques</strong> — conservés 90 jours à des fins de sécurité</li>
              <li><strong>Données de facturation</strong> — conservées 10 ans conformément aux obligations comptables légales (article L123-22 du Code de commerce)</li>
            </ul>
          </Section>

          <Section title="6. Sous-traitants">
            <p>CloverIA fait appel aux sous-traitants suivants pour l'exploitation du service :</p>
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {SOUS_TRAITANTS.map(st => (
                <div key={st.name} style={{ padding: '0.75rem 1rem', background: '#F9F8F5', borderRadius: '8px', borderLeft: `3px solid ${T.green}` }}>
                  <p style={{ fontWeight: 600, color: T.text, marginBottom: '2px' }}>{st.name}</p>
                  <p style={{ color: '#374151', fontSize: '0.875rem' }}>{st.role}</p>
                  <p style={{ color: T.muted, fontSize: '0.8rem', marginTop: '2px' }}>Localisation : {st.loc}</p>
                </div>
              ))}
            </div>
            <p style={{ marginTop: '1rem' }}>Aucune donnée n'est vendue ni partagée avec des tiers à des fins publicitaires ou commerciales.</p>
          </Section>

          <Section title="7. Transferts hors Union Européenne">
            <p>Certains sous-traitants sont établis aux États-Unis. Les transferts de données vers ces pays sont encadrés par les mécanismes suivants :</p>
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {[
                { name: 'Anthropic (Claude AI)', mechanism: 'Data Privacy Framework UE–USA (DPF)', detail: 'Anthropic est certifié DPF. Les données traitées sont les contenus soumis à l'IA (descriptions de recettes, documents analysés).' },
                { name: 'Render', mechanism: 'Clauses Contractuelles Types (CCT) de la Commission européenne', detail: 'Hébergement du serveur applicatif. Les données peuvent transiter via des infrastructures US selon le plan souscrit.' },
                { name: 'Vercel', mechanism: 'Clauses Contractuelles Types (CCT) de la Commission européenne', detail: 'Hébergement et distribution du frontend. Aucune donnée utilisateur personnelle n'est stockée par Vercel.' },
                { name: 'Stripe', mechanism: 'Data Privacy Framework UE–USA (DPF)', detail: 'Stripe est certifié DPF. Seules les données nécessaires au paiement et à la gestion de l'abonnement sont transmises.' },
              ].map(t => (
                <div key={t.name} style={{ padding: '0.75rem 1rem', background: '#F9F8F5', borderRadius: '8px', borderLeft: `3px solid ${T.muted}` }}>
                  <p style={{ fontWeight: 600, color: T.text, marginBottom: '2px' }}>{t.name}</p>
                  <p style={{ color: T.green, fontSize: '0.8rem', fontWeight: 600 }}>{t.mechanism}</p>
                  <p style={{ color: '#374151', fontSize: '0.85rem', marginTop: '2px' }}>{t.detail}</p>
                </div>
              ))}
            </div>
            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: T.muted }}>
              Pour plus d'informations sur le Data Privacy Framework :{' '}
              <a href="https://www.dataprivacyframework.gov" target="_blank" rel="noopener noreferrer" style={{ color: T.green }}>dataprivacyframework.gov</a>.
            </p>
          </Section>

          <Section title="8. Cookies et traceurs">
            <p>CloverIA FicheTech n'utilise <strong>aucun cookie publicitaire ni aucun outil de tracking tiers</strong> (Google Analytics, Facebook Pixel, etc.).</p>
            <SubTitle>Cookies utilisés</SubTitle>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li><strong>Token d'authentification</strong> — stocké en localStorage, nécessaire au maintien de la session. Aucune expiration automatique côté navigateur.</li>
              <li><strong>Cookies Stripe</strong> — lors du parcours de paiement uniquement, Stripe peut déposer des cookies techniques strictement nécessaires à la sécurisation de la transaction et à la prévention de la fraude. Ces cookies sont soumis à la politique de confidentialité de Stripe.</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>Aucun bandeau de consentement aux cookies n'est affiché car aucun cookie non-essentiel n'est utilisé.</p>
          </Section>

          <Section title="9. Droits des utilisateurs">
            <p>Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :</p>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li><strong>Droit d'accès</strong> — obtenir une copie de l'ensemble de vos données</li>
              <li><strong>Droit de rectification</strong> — corriger des données inexactes ou incomplètes</li>
              <li><strong>Droit à l'effacement</strong> — demander la suppression de votre compte et de vos données</li>
              <li><strong>Droit à la portabilité</strong> — recevoir vos données dans un format structuré et lisible par machine</li>
              <li><strong>Droit d'opposition</strong> — vous opposer à certains traitements basés sur l'intérêt légitime</li>
              <li><strong>Droit à la limitation</strong> — restreindre le traitement dans certains cas prévus par le RGPD</li>
            </ul>
            <p style={{ marginTop: '0.75rem' }}>Vous pouvez également introduire une réclamation auprès de la <strong>CNIL</strong> : <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: T.green }}>www.cnil.fr</a>.</p>
          </Section>

          <Section title="10. Exercice de vos droits — procédure">
            <p>Pour exercer l'un de vos droits, suivez la procédure suivante :</p>
            <ol style={{ paddingLeft: '1.25rem', marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>Envoyez un email à <a href="mailto:contact@cloveria.fr" style={{ color: T.green, fontWeight: 600 }}>contact@cloveria.fr</a></li>
              <li>Indiquez comme objet : <strong>« Demande RGPD »</strong></li>
              <li>Précisez la nature de votre demande (accès, rectification, effacement, portabilité, opposition, limitation)</li>
              <li>Joignez une preuve d'identité (copie de pièce d'identité ou tout document permettant de vous identifier)</li>
            </ol>
            <p style={{ marginTop: '0.75rem' }}>Nous nous engageons à vous répondre dans un délai de <strong>30 jours</strong> à compter de la réception de votre demande complète. En cas de demande complexe, ce délai peut être prolongé de deux mois supplémentaires, avec information préalable.</p>
          </Section>

          <Section title="11. Sécurité des données">
            <p>CloverIA met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :</p>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li>Chiffrement des mots de passe (bcrypt, salé)</li>
              <li>Transmission chiffrée (HTTPS/TLS sur l'ensemble des communications)</li>
              <li>Accès aux bases de données restreint par authentification et liste blanche d'IP</li>
              <li>Tokens JWT avec expiration (7 jours)</li>
              <li>Journalisation des accès serveur</li>
            </ul>
          </Section>

          <Section title="12. Modifications de la politique">
            <p>CloverIA se réserve le droit de modifier cette politique à tout moment. En cas de modification substantielle affectant vos droits, vous serez informé par email avec un préavis de 30 jours. La version en vigueur est celle publiée sur cette page, avec la date de dernière mise à jour indiquée en en-tête.</p>
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
