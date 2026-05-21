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

          <Section title="Article 1 — Objet">
            <p>CloverIA FicheTech est un logiciel en ligne (SaaS) de gestion de fiches techniques, de calcul de food cost et de pilotage de rentabilité, destiné aux professionnels de la restauration.</p>
            <p style={{ marginTop: '0.5rem' }}>Les présentes Conditions Générales d'Utilisation (CGU) définissent les droits et obligations de l'éditeur et de l'utilisateur dans le cadre de l'accès au service. En créant un compte, l'utilisateur reconnaît avoir lu et accepté ces CGU sans réserve.</p>
          </Section>

          <Section title="Article 2 — Accès et inscription">
            <p>L'accès au service nécessite la création d'un compte avec une adresse email valide et un mot de passe. L'inscription est ouverte à toute personne exerçant une activité professionnelle dans le secteur de la restauration.</p>
            <p style={{ marginTop: '0.5rem' }}>L'utilisateur garantit l'exactitude des informations fournies lors de l'inscription et s'engage à les maintenir à jour. Un seul compte est autorisé par établissement. L'utilisateur est seul responsable de la confidentialité de ses identifiants.</p>
          </Section>

          <Section title="Article 3 — Période d'essai">
            <p>Tout nouvel utilisateur bénéficie d'une <strong>période d'essai gratuite de 14 jours</strong> dès l'inscription, sans nécessité de renseigner une carte bancaire. L'ensemble des fonctionnalités du service est accessible durant cette période, sans aucun engagement.</p>
            <p style={{ marginTop: '0.5rem' }}>À l'issue des 14 jours, l'accès au service est suspendu automatiquement si aucun abonnement n'a été souscrit. Les données saisies sont conservées 30 jours supplémentaires.</p>
          </Section>

          <Section title="Article 4 — Abonnement et paiement">
            <p>L'abonnement CloverIA FicheTech est proposé au tarif de <strong>39 € TTC par mois</strong>, sans engagement de durée.</p>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li><strong>Sans engagement</strong> — l'utilisateur peut résilier à tout moment, sans frais ni pénalité.</li>
              <li><strong>Reconduction mensuelle automatique</strong> — l'abonnement est renouvelé chaque mois à la date anniversaire de la souscription.</li>
              <li><strong>Accès immédiat</strong> — l'accès est activé dès la confirmation du paiement.</li>
              <li><strong>Facture</strong> — une facture est disponible sur demande à <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a>.</li>
            </ul>
            <p style={{ marginTop: '0.5rem' }}>Le paiement est traité de manière sécurisée par <strong>Stripe</strong>, certifié PCI-DSS niveau 1. CloverIA FicheTech ne stocke aucune donnée bancaire. En cas d'échec de paiement, l'utilisateur est notifié par email et dispose d'un délai de 7 jours pour régulariser avant suspension du service.</p>
            <p style={{ marginTop: '0.5rem' }}>L'éditeur se réserve le droit de modifier les tarifs avec un préavis de 30 jours par email. L'utilisateur peut résilier avant l'entrée en vigueur du nouveau tarif s'il ne souhaite pas l'accepter.</p>
          </Section>

          <Section title="Article 5 — Résiliation">
            <p>L'utilisateur peut résilier son abonnement à tout moment, <strong>sans frais ni préavis</strong>, depuis son compte ou par email à <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a>.</p>
            <p style={{ marginTop: '0.5rem' }}>La résiliation prend effet à la fin de la période mensuelle en cours. L'utilisateur conserve l'accès au service jusqu'à cette date. Aucun remboursement au prorata n'est effectué pour la période restante.</p>
            <p style={{ marginTop: '0.5rem' }}>Après résiliation, les données de l'utilisateur sont conservées 12 mois avant suppression définitive, sauf demande d'effacement anticipé conformément au RGPD.</p>
          </Section>

          <Section title="Article 6 — Obligations de l'utilisateur">
            <p>L'utilisateur s'engage à utiliser le service de manière <strong>strictement professionnelle et personnelle</strong>. Il est notamment interdit de :</p>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>Partager ses identifiants de connexion avec des tiers</li>
              <li>Utiliser le service à des fins illicites ou contraires à l'ordre public</li>
              <li>Tenter d'accéder aux données d'autres utilisateurs ou de contourner les mesures de sécurité</li>
              <li>Revendre ou mettre à disposition l'accès au service sans accord préalable de l'éditeur</li>
            </ul>
            <p style={{ marginTop: '0.5rem' }}>L'utilisateur est responsable de l'exactitude des données qu'il saisit dans le service.</p>
          </Section>

          <Section title="Article 7 — Disponibilité du service">
            <p>L'éditeur s'engage à maintenir le service disponible dans la mesure du possible. Des interruptions peuvent survenir pour des raisons de maintenance, de mise à jour ou d'incidents techniques. Aucune garantie de disponibilité à 100 % n'est donnée.</p>
            <p style={{ marginTop: '0.5rem' }}>En cas d'interruption planifiée significative, l'éditeur s'efforcera d'en informer les utilisateurs par email avec un préavis raisonnable.</p>
          </Section>

          <Section title="Article 8 — Propriété intellectuelle">
            <p><strong>Plateforme</strong> — CloverIA FicheTech, son interface, ses algorithmes, son code source et ses bases de données restent la propriété exclusive de l'éditeur. L'utilisateur bénéficie d'un droit d'usage personnel, non exclusif et non transférable.</p>
            <p style={{ marginTop: '0.5rem' }}><strong>Données utilisateur</strong> — L'utilisateur reste propriétaire de l'ensemble de ses données (recettes, ingrédients, fiches techniques, cartes). L'éditeur ne les exploite pas à des fins commerciales et ne les partage pas avec des tiers sans consentement explicite.</p>
          </Section>

          <Section title="Article 9 — Limitation de responsabilité">
            <p>CloverIA FicheTech ne peut être tenu responsable des décisions commerciales prises sur la base des calculs fournis par le service. Les calculs de food cost sont <strong>indicatifs</strong> : l'utilisateur reste seul responsable de leur vérification et de l'exactitude des données saisies.</p>
            <p style={{ marginTop: '0.5rem' }}>Dans les limites autorisées par la loi, la responsabilité de l'éditeur est limitée aux dommages directs résultant d'une faute prouvée de sa part. Il ne saurait être tenu responsable des pertes commerciales, de chiffre d'affaires ou de données résultant d'une interruption de service, ni de tout dommage indirect ou consécutif.</p>
          </Section>

          <Section title="Article 10 — Suspension et résiliation par l'éditeur">
            <p>L'éditeur se réserve le droit de suspendre ou résilier l'accès d'un utilisateur en cas de violation des présentes CGU, d'usage frauduleux ou abusif du service, ou de non-paiement après expiration du délai de grâce.</p>
            <p style={{ marginTop: '0.5rem' }}>Sauf urgence (fraude, atteinte à la sécurité), l'utilisateur est notifié préalablement par email et dispose d'un délai raisonnable pour régulariser sa situation. L'utilisateur peut contester la décision en contactant <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a>.</p>
          </Section>

          <Section title="Article 11 — Modifications des CGU">
            <p>L'éditeur peut modifier les présentes CGU à tout moment. Toute modification substantielle est notifiée par email avec un <strong>préavis de 30 jours</strong>. La poursuite de l'utilisation du service après ce délai vaut acceptation des nouvelles conditions.</p>
            <p style={{ marginTop: '0.5rem' }}>L'utilisateur qui n'accepte pas les nouvelles conditions peut résilier son abonnement avant l'entrée en vigueur des modifications, sans frais.</p>
          </Section>

          <Section title="Article 12 — Droit applicable">
            <p>Les présentes CGU sont soumises au <strong>droit français</strong>. En cas de litige, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire. À défaut d'accord, tout litige relève de la compétence exclusive des <strong>tribunaux français</strong>.</p>
            <p style={{ marginTop: '0.5rem' }}>Pour toute question relative à ces CGU : <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a>.</p>
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
