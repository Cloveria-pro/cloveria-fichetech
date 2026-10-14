import { Link } from 'react-router-dom';
import { useWindowWidth } from '../hooks/useWindowWidth.js';

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
  { name: 'MongoDB Atlas', role: 'Hébergement de la base de données', loc: 'UE (AWS Paris, France)' },
  { name: 'Render', role: 'Hébergement du serveur applicatif', loc: 'UE (Francfort, Allemagne)' },
  { name: 'Vercel', role: 'Hébergement du frontend', loc: 'UE / États-Unis' },
  { name: 'Anthropic (Claude)', role: 'Traitement IA — structuration de recettes, descriptions commerciales, analyse de documents', loc: 'États-Unis' },
  { name: 'Stripe', role: 'Paiement et gestion des abonnements', loc: 'UE / États-Unis — certifié PCI-DSS' },
  { name: 'Resend', role: "Envoi des e-mails (confirmation de compte, relances, notifications)", loc: 'États-Unis' },
  { name: 'Google Fonts', role: "Affichage des polices de caractères (votre adresse IP est transmise à Google lors du chargement)", loc: 'Service fourni par Google' },
];

export default function PolitiqueConfidentialite() {
  const width = useWindowWidth();
  const isMobile = width < 600;
  const cardPad = isMobile ? '1.25rem' : '2.5rem';

  return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '760px', margin: '0 auto' }}>

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <img src="/logo.png" alt="CloverIA" style={{ width: '80px', height: 'auto', objectFit: 'contain', display: 'inline-block', marginBottom: '1rem' }}
            onError={e => { e.currentTarget.style.display = 'none'; }} />
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: isMobile ? '1.4rem' : '1.75rem', fontWeight: 700, color: T.text, marginBottom: '0.5rem' }}>
            Politique de confidentialité
          </h1>
          <p style={{ color: T.muted, fontSize: '0.875rem' }}>Dernière mise à jour : octobre 2026 — Conforme au RGPD (UE 2016/679)</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.06)', padding: cardPad }}>

          <Section title="1. Identité de l'éditeur">
            <p><strong>CloverIA FicheTech</strong><br />
            Email : <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a></p>
            <p style={{ marginTop: '0.5rem' }}>En l'absence de structure juridique formalisée à ce stade, CloverIA FicheTech est édité à titre individuel. Pour toute demande d'identification, contactez <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a>.</p>
          </Section>

          <Section title="2. Responsable du traitement">
            <p>CloverIA FicheTech traite vos données personnelles en qualité de responsable du traitement, dans le respect du Règlement Général sur la Protection des Données (RGPD — UE 2016/679) et de la loi Informatique et Libertés modifiée.</p>
            <p style={{ marginTop: '0.5rem' }}>Contact : <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a></p>
          </Section>

          <Section title="3. Données collectées">
            <SubTitle>Données de compte</SubTitle>
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem', marginTop: '0.25rem' }}>
              <li><strong>Email</strong> — <span style={{ color: '#DC2626', fontSize: '0.78rem', fontWeight: 600 }}>obligatoire</span> (nécessaire à la connexion)</li>
              <li><strong>Mot de passe</strong> (haché via bcrypt, non lisible) — <span style={{ color: '#DC2626', fontSize: '0.78rem', fontWeight: 600 }}>obligatoire</span></li>
              <li><strong>Nom de l'établissement</strong> — <span style={{ color: '#DC2626', fontSize: '0.78rem', fontWeight: 600 }}>obligatoire</span> (nécessaire à la personnalisation du service)</li>
              <li><strong>Prénom</strong> — <span style={{ color: '#6B7280', fontSize: '0.78rem', fontWeight: 600 }}>facultatif</span> (améliore la personnalisation des emails)</li>
              <li><strong>Type d'établissement</strong> — <span style={{ color: '#6B7280', fontSize: '0.78rem', fontWeight: 600 }}>facultatif</span> (améliore les recommandations food cost)</li>
              <li><strong>Rôle dans l'établissement</strong> — <span style={{ color: '#6B7280', fontSize: '0.78rem', fontWeight: 600 }}>facultatif</span> (améliore l'expérience d'utilisation)</li>
            </ul>

            <SubTitle>Données d'utilisation du service</SubTitle>
            <p>Fiches techniques, recettes, ingrédients et leurs prix, cartes de restaurant, données de ventes importées et documents importés (factures fournisseurs, fiches, fichiers de ventes). Les documents importés sont envoyés à Anthropic pour analyse, puis conservés dans votre espace afin que vous puissiez les retrouver ; vous pouvez les supprimer à tout moment depuis l'application, et ils sont supprimés avec votre compte.</p>

            <SubTitle>Données de navigation</SubTitle>
            <p>Nos hébergeurs (Vercel, Render) peuvent enregistrer des journaux techniques (adresse IP, horodatage des requêtes) à des fins de sécurité et de stabilité du service. Leur durée de conservation est fixée par ces prestataires.</p>

            <SubTitle>Données de paiement</SubTitle>
            <p>CloverIA FicheTech ne stocke aucune donnée bancaire. Les paiements sont gérés exclusivement par <strong>Stripe</strong>, certifié PCI-DSS niveau 1. Seul un identifiant client Stripe est conservé pour la gestion de l'abonnement.</p>
          </Section>

          <Section title="4. Finalités du traitement">
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li><strong>Fourniture du service</strong> — gestion du compte, accès aux fonctionnalités, calculs de food cost (base légale : exécution du contrat)</li>
              <li><strong>Gestion de l'abonnement</strong> — facturation, suivi de la période d'essai, emails de rappel (base légale : exécution du contrat)</li>
              <li><strong>Communications transactionnelles</strong> — emails relatifs au compte et à l'abonnement (base légale : exécution du contrat)</li>
              <li><strong>Sécurité</strong> — prévention des accès non autorisés et des fraudes (base légale : intérêt légitime)</li>
            </ul>
          </Section>

          <Section title="5. Sous-traitants">
            <p>CloverIA FicheTech fait appel aux sous-traitants suivants pour l'exploitation du service :</p>
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
            <p style={{ marginTop: '0.75rem' }}>Certains de nos prestataires sont établis hors de l'Union Européenne. Ces transferts sont encadrés par les clauses contractuelles types approuvées par la Commission européenne (Vercel, Anthropic, Resend) ou par l'adhésion au Data Privacy Framework UE-États-Unis (Stripe, Resend). Render et MongoDB Atlas hébergent vos données dans l'Union européenne.</p>
          </Section>

          <Section title="6. Durée de conservation">
            <ul style={{ paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <li><strong>Données de compte actif</strong> — conservées pendant toute la durée de l'abonnement</li>
              <li><strong>Données de compte inactif</strong> — supprimées 60 jours après la fin de l'abonnement ou de la période d'essai ; un e-mail vous prévient avant l'effacement</li>
              <li><strong>Documents importés</strong> (factures, fiches, fichiers de ventes) — conservés dans votre espace jusqu'à leur suppression par vos soins ou jusqu'à la suppression de votre compte</li>
              <li><strong>Données de facturation</strong> — les factures émises par CloverIA sont conservées 10 ans conformément aux obligations comptables légales (article L123-22 du Code de commerce)</li>
            </ul>
          </Section>

          <Section title="7. Droits des utilisateurs">
            <p>Conformément au RGPD, vous disposez des droits suivants sur vos données personnelles :</p>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li><strong>Droit d'accès</strong> — obtenir une copie de vos données : sur demande à contact@cloveria.fr, nous vous la transmettons</li>
              <li><strong>Droit de rectification</strong> — corriger des données inexactes ou incomplètes</li>
              <li><strong>Droit à l'effacement</strong> — vous pouvez supprimer vous-même votre compte et vos données depuis l'application (page « Paramètres », rubrique « Zone dangereuse », bouton « Supprimer mon compte ») ; l'effacement est immédiat et définitif. Les factures émises sont conservées 10 ans (voir section 6)</li>
              <li><strong>Droit à la portabilité</strong> — sur demande à contact@cloveria.fr, nous vous transmettons vos données dans un format structuré et lisible par machine</li>
              <li><strong>Droit d'opposition</strong> — vous opposer à certains traitements basés sur l'intérêt légitime</li>
              <li><strong>Droit à la limitation</strong> — restreindre le traitement dans certains cas prévus par le RGPD</li>
            </ul>
          </Section>

          <Section title="8. Sécurité des données">
            <p>CloverIA FicheTech met en œuvre des mesures techniques et organisationnelles appropriées pour protéger vos données :</p>
            <ul style={{ paddingLeft: '1.25rem', marginTop: '0.5rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li>Chiffrement des mots de passe (bcrypt, salé)</li>
              <li>Transmission chiffrée (HTTPS/TLS sur l'ensemble des communications)</li>
              <li>Accès aux bases de données restreint par authentification</li>
              <li>Tokens d'authentification avec expiration (7 jours)</li>
            </ul>
          </Section>

          <Section title="9. Cookies et traceurs">
            <p>CloverIA FicheTech n'utilise aucun cookie publicitaire ni traceur à des fins publicitaires ou de mesure d'audience. La connexion repose sur un jeton stocké dans le stockage local de votre navigateur (localStorage), valable 7 jours. Stripe peut déposer des cookies techniques sur sa propre page de paiement, strictement nécessaires à la sécurisation des transactions. Aucun bandeau de consentement n'est requis pour ces éléments strictement nécessaires.</p>
          </Section>

          <Section title="10. Exercice de vos droits">
            <p>Pour exercer vos droits, envoyez un email à <a href="mailto:contact@cloveria.fr" style={{ color: T.green, fontWeight: 600 }}>contact@cloveria.fr</a> avec pour objet <strong>« Demande RGPD »</strong>, en précisant la nature de votre demande. Nous pouvons vous demander un justificatif d'identité en cas de doute raisonnable sur votre identité. Nous répondons dans un délai maximum de 30 jours. En cas de litige, vous pouvez saisir la CNIL sur <a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer" style={{ color: T.green }}>www.cnil.fr</a>.</p>
          </Section>

          <Section title="11. Modifications de la politique">
            <p>CloverIA FicheTech se réserve le droit de modifier cette politique à tout moment. En cas de modification substantielle affectant vos droits, vous serez informé par email avec un préavis de 30 jours. La version en vigueur est celle publiée sur cette page, avec la date de dernière mise à jour indiquée en en-tête.</p>
          </Section>

          <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: `1px solid ${T.border}`, textAlign: 'center', fontSize: '0.8rem', color: T.muted }}>
            Contact : <a href="mailto:contact@cloveria.fr" style={{ color: T.green, textDecoration: 'none', fontWeight: 600 }}>contact@cloveria.fr</a>
            {' '}·{' '}
            <Link to="/cgu" style={{ color: T.green, textDecoration: 'none', fontWeight: 600 }}>CGU</Link>
            {' '}·{' '}
            <Link to="/mentions-legales" style={{ color: T.green, textDecoration: 'none', fontWeight: 600 }}>Mentions légales</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
