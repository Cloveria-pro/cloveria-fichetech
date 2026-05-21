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
            <p><strong>CloverIA FicheTech</strong> est un logiciel en ligne (SaaS) édité par CloverIA, destiné aux professionnels de la restauration. Il permet la création et la gestion de fiches techniques culinaires, le calcul automatique du food cost, l'import et l'analyse de factures fournisseurs, ainsi que le suivi des ventes et l'analyse de la rentabilité des cartes.</p>
            <p style={{ marginTop: '0.5rem' }}>Les présentes Conditions Générales d'Utilisation (CGU) définissent les droits et obligations de CloverIA et de l'utilisateur dans le cadre de l'accès au Service. En créant un compte, l'utilisateur reconnaît avoir lu et accepté ces CGU sans réserve.</p>
          </Section>

          <Section title="2. Création de compte et conditions d'accès">
            <p>L'accès au Service nécessite la création d'un compte avec une adresse email valide et un mot de passe. L'inscription est ouverte à toute personne exerçant une activité professionnelle dans le secteur de la restauration.</p>
            <p style={{ marginTop: '0.5rem' }}>L'utilisateur s'engage à fournir des informations exactes lors de l'inscription et à les maintenir à jour. Il est seul responsable de la confidentialité de ses identifiants. Tout accès au Service à partir du compte d'un utilisateur est présumé effectué par cet utilisateur.</p>
            <p style={{ marginTop: '0.5rem' }}>Un seul compte par utilisateur est autorisé. Le partage de compte entre plusieurs personnes est interdit.</p>
          </Section>

          <Section title="3. Période d'essai gratuite">
            <p>Tout nouvel utilisateur bénéficie d'une <strong>période d'essai gratuite de 14 jours</strong>, sans engagement et sans nécessité de renseigner des coordonnées bancaires. L'ensemble des fonctionnalités du Service est accessible durant cette période.</p>
            <p style={{ marginTop: '0.5rem' }}>À l'issue des 14 jours, l'accès au Service est suspendu automatiquement si aucun abonnement n'a été souscrit. Les données saisies durant l'essai sont conservées pendant 30 jours supplémentaires, le temps pour l'utilisateur de souscrire s'il le souhaite.</p>
          </Section>

          <Section title="4. Abonnement">
            <p>L'abonnement CloverIA FicheTech est proposé au tarif de <strong>39 € TTC par mois</strong>, sans engagement de durée.</p>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li><strong>Reconduction automatique</strong> — l'abonnement est renouvelé automatiquement chaque mois à la date anniversaire de la souscription.</li>
              <li><strong>Sans engagement</strong> — l'utilisateur peut résilier à tout moment, sans frais ni pénalité.</li>
              <li><strong>Accès immédiat</strong> — l'accès au Service est activé dès la confirmation du paiement.</li>
            </ul>
            <p style={{ marginTop: '0.5rem' }}>CloverIA se réserve le droit de modifier les tarifs. Toute modification est notifiée par email avec un préavis de 30 jours. L'utilisateur peut résilier avant l'entrée en vigueur du nouveau tarif s'il ne souhaite pas le accepter.</p>
          </Section>

          <Section title="5. Paiement">
            <p>Les paiements sont traités par <strong>Stripe</strong>, prestataire de paiement certifié PCI-DSS niveau 1. CloverIA ne stocke aucune donnée bancaire (numéro de carte, CVV, IBAN).</p>
            <p style={{ marginTop: '0.5rem' }}>En cas d'échec de paiement lors du renouvellement mensuel, l'utilisateur est notifié par email. L'accès au Service peut être suspendu après un délai de grâce de 7 jours si le paiement n'est pas régularisé.</p>
          </Section>

          <Section title="6. Résiliation">
            <p>L'utilisateur peut résilier son abonnement à tout moment, <strong>sans frais ni préavis</strong>, en contactant CloverIA à <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a>.</p>
            <p style={{ marginTop: '0.5rem' }}>La résiliation prend effet à la fin de la période mensuelle en cours. L'utilisateur conserve l'accès au Service jusqu'à cette date. Aucun remboursement au prorata n'est effectué pour la période restante.</p>
            <p style={{ marginTop: '0.5rem' }}>Après résiliation, les données de l'utilisateur sont conservées 12 mois avant suppression définitive, sauf demande d'effacement anticipé conformément au RGPD.</p>
          </Section>

          <Section title="7. Obligations de l'utilisateur">
            <p>En utilisant le Service, l'utilisateur s'engage à :</p>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
              <li>Utiliser le Service à des fins professionnelles et licites uniquement</li>
              <li>Ne pas partager son accès avec des tiers (un abonnement = un utilisateur)</li>
              <li>Saisir des données exactes et ne pas importer de contenus illicites, frauduleux ou portant atteinte aux droits de tiers</li>
              <li>Ne pas tenter de contourner les mesures de sécurité ou d'accéder aux données d'autres utilisateurs</li>
              <li>Ne pas automatiser l'accès au Service de manière abusive ou disproportionnée</li>
              <li>Ne pas revendre, sous-licencier ou mettre à disposition l'accès au Service à des tiers sans accord préalable de CloverIA</li>
            </ul>
          </Section>

          <Section title="8. Disponibilité du service">
            <p>CloverIA s'engage à maintenir le Service accessible dans la mesure du possible (<em>best effort</em>). Aucune garantie de disponibilité ininterrompue n'est donnée.</p>
            <p style={{ marginTop: '0.5rem' }}>Des interruptions peuvent survenir pour des raisons de maintenance, de mise à jour ou d'incidents techniques. CloverIA s'efforcera de prévenir les utilisateurs en cas d'interruption planifiée significative.</p>
            <p style={{ marginTop: '0.5rem' }}>Les calculs de food cost et les analyses générés par le Service sont fournis à titre indicatif. L'utilisateur reste seul responsable de ses décisions commerciales et de la vérification des données saisies.</p>
          </Section>

          <Section title="9. Propriété intellectuelle">
            <p><strong>Plateforme</strong> — CloverIA FicheTech, son interface, ses algorithmes, son code source, ses bases de données et l'ensemble du contenu fourni par CloverIA (hors données utilisateur) sont la propriété exclusive de CloverIA et protégés par le droit de la propriété intellectuelle. L'utilisateur bénéficie d'un droit d'usage personnel, non exclusif, non transférable et non sous-licenciable.</p>
            <p style={{ marginTop: '0.5rem' }}><strong>Données utilisateur</strong> — Les données saisies par l'utilisateur (fiches techniques, ingrédients, recettes, prix) restent sa propriété exclusive. CloverIA n'exploite pas ces données à des fins commerciales et ne les partage pas avec des tiers sans consentement explicite. En souscrivant au Service, l'utilisateur concède à CloverIA une licence limitée de traitement de ces données, strictement nécessaire à la fourniture du Service.</p>
          </Section>

          <Section title="10. Limitation de responsabilité">
            <p>Dans les limites autorisées par la loi française, la responsabilité de CloverIA est limitée aux dommages directs et prévisibles résultant d'une faute prouvée de sa part. CloverIA ne saurait être tenu responsable :</p>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li>Des pertes commerciales, de chiffre d'affaires ou de données résultant d'une interruption de service</li>
              <li>Des erreurs dans les calculs de food cost dues à des données incorrectes saisies par l'utilisateur</li>
              <li>Des dommages indirects, consécutifs ou immatériels</li>
              <li>Des faits résultant d'un cas de force majeure ou du fait d'un tiers</li>
            </ul>
          </Section>

          <Section title="11. Suspension et résiliation de compte">
            <p>CloverIA se réserve le droit de suspendre ou de résilier l'accès d'un utilisateur, sans préavis, en cas de :</p>
            <ul style={{ marginTop: '0.5rem', paddingLeft: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <li>Violation des présentes CGU</li>
              <li>Usage frauduleux ou abusif du Service</li>
              <li>Non-paiement après dépassement du délai de grâce</li>
              <li>Fourniture d'informations manifestement fausses lors de l'inscription</li>
            </ul>
            <p style={{ marginTop: '0.5rem' }}>En cas de résiliation pour manquement, aucun remboursement n'est dû. L'utilisateur peut contester la décision en contactant <a href="mailto:contact@cloveria.fr" style={{ color: T.green }}>contact@cloveria.fr</a>.</p>
          </Section>

          <Section title="12. Données personnelles">
            <p>Le traitement des données personnelles dans le cadre du Service est décrit dans la <Link to="/politique-confidentialite" style={{ color: T.green, fontWeight: 600, textDecoration: 'none' }}>Politique de confidentialité</Link>. Conformément au RGPD, l'utilisateur dispose de droits d'accès, de rectification, d'effacement et de portabilité sur ses données.</p>
          </Section>

          <Section title="13. Droit applicable et juridiction compétente">
            <p>Les présentes CGU sont soumises au <strong>droit français</strong>. En cas de litige relatif à leur interprétation ou à leur exécution, les parties s'engagent à rechercher une solution amiable avant tout recours judiciaire.</p>
            <p style={{ marginTop: '0.5rem' }}>À défaut de résolution amiable dans un délai de 30 jours à compter de la notification du litige, les <strong>tribunaux compétents du ressort de Paris</strong> seront seuls compétents, nonobstant pluralité de défendeurs ou appel en garantie.</p>
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
