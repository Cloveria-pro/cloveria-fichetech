import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { startTour } from '../utils/onboardingTour.js';

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280' };

const CARDS = [
  {
    title: 'Paramètres',
    desc: 'Définissez votre food cost cible et votre TVA pour des calculs précis.',
    to: '/parametres',
    icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z',
  },
  {
    title: 'Ingrédients',
    desc: 'Créez votre base d\'ingrédients avec les prix unitaires pour calculer les coûts.',
    to: '/ingredients',
    icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4',
  },
  {
    title: 'Créer une fiche',
    desc: 'Décrivez un plat en langage naturel, l\'IA génère la fiche technique complète.',
    to: '/fiches-techniques/nouvelle',
    icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z',
  },
];

const FAQ = [
  {
    q: "C'est quoi le food cost ?",
    a: "Le food cost est le ratio coût matière / prix de vente, exprimé en pourcentage. Sous votre seuil cible, le plat est rentable.",
  },
  {
    q: "Comment fonctionne le rendement matière ?",
    a: "C'est la part utilisable d'un ingrédient après épluchage ou parage (ex. 75 % pour une carotte). Le coût est recalculé sur le poids brut nécessaire.",
  },
  {
    q: "À quoi servent les sous-recettes ?",
    a: "À décrire une préparation de base (fond, sauce, pâte sablée) et la réutiliser comme ingrédient dans plusieurs fiches techniques.",
  },
  {
    q: "Comment scanner une facture ?",
    a: "Dans Ingrédients, cliquez \"Scanner une facture\", chargez votre document — l'IA extrait automatiquement les produits et leurs prix.",
  },
  {
    q: "Comment générer une description commerciale ?",
    a: "Dans une fiche technique, cliquez \"Générer\" dans la section description — l'IA rédige 2–3 phrases en langage naturel pour la carte.",
  },
  {
    q: "Comment exporter les allergènes ?",
    a: "Dans une carte, cliquez \"Export Allergènes\" pour générer un tableau réglementaire (14 allergènes) prêt à imprimer ou afficher.",
  },
];

function SvgIcon({ d }) {
  return (
    <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      {d.split(' M').map((part, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" d={i === 0 ? part : 'M' + part} />
      ))}
    </svg>
  );
}

export default function Aide() {
  const [openIdx, setOpenIdx] = useState(null);
  const navigate = useNavigate();

  function reopenDemo() {
    localStorage.removeItem('onboarding_done');
    startTour();
  }

  return (
    <div style={{ maxWidth: '720px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: T.text }}>
            Aide
          </h1>
          <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '4px' }}>
            Tout ce qu'il faut pour démarrer et aller plus loin.
          </p>
        </div>
        <button
          onClick={reopenDemo}
          style={{ padding: '0.55rem 1.25rem', background: 'transparent', color: T.green, border: '1.5px solid #2D6A4F', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(45,106,79,0.06)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          🎯 Revoir la démonstration
        </button>
      </div>

      {/* Bloc 1 — Pour démarrer */}
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ fontSize: '0.7rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          Pour démarrer
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {CARDS.map(card => (
            <button
              key={card.to}
              onClick={() => navigate(card.to)}
              style={{
                background: '#fff', border: '1px solid #E8E2D9', borderRadius: '12px',
                padding: '1.25rem', textAlign: 'left', cursor: 'pointer',
                fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
                boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = T.green; e.currentTarget.style.boxShadow = '0 4px 16px rgba(45,106,79,0.1)'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = '#E8E2D9'; e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.04)'; }}
            >
              <div style={{ color: T.green, marginBottom: '0.6rem' }}>
                <SvgIcon d={card.icon} />
              </div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: T.text, marginBottom: '0.35rem' }}>
                {card.title}
              </div>
              <div style={{ fontSize: '0.8rem', color: T.muted, lineHeight: 1.5 }}>
                {card.desc}
              </div>
              <div style={{ marginTop: '0.75rem', fontSize: '0.78rem', fontWeight: 600, color: T.green }}>
                Ouvrir →
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Bloc 2 — FAQ */}
      <div>
        <h2 style={{ fontSize: '0.7rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '1rem' }}>
          Questions fréquentes
        </h2>
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E2D9', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
          {FAQ.map((item, i) => {
            const isOpen = openIdx === i;
            return (
              <div key={i} style={{ borderBottom: i < FAQ.length - 1 ? '1px solid #F3EFE8' : 'none' }}>
                <button
                  onClick={() => setOpenIdx(isOpen ? null : i)}
                  style={{
                    width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '1rem 1.25rem', background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: "'DM Sans', sans-serif", textAlign: 'left',
                  }}
                >
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: T.text }}>{item.q}</span>
                  <span style={{
                    fontSize: '11px', color: T.muted, flexShrink: 0, marginLeft: '1rem',
                    display: 'inline-block', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s',
                  }}>▼</span>
                </button>
                {isOpen && (
                  <div style={{ padding: '0 1.25rem 1rem', fontSize: '0.85rem', color: T.muted, lineHeight: 1.65 }}>
                    {item.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
