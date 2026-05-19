import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280' };

function Dot({ active }) {
  return (
    <div style={{
      width: active ? '20px' : '6px',
      height: '6px',
      borderRadius: '3px',
      background: active ? T.green : '#D1C4B0',
      transition: 'all 0.2s',
    }} />
  );
}

export default function OnboardingModal({ onClose }) {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  function dismiss() {
    localStorage.setItem('onboarding_done', '1');
    onClose();
  }

  function goTo(path) {
    dismiss();
    navigate(path);
  }

  const btnPrimary = {
    display: 'block', width: '100%', padding: '0.75rem 1.25rem',
    background: T.green, color: '#fff', border: 'none', borderRadius: '10px',
    fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif", textAlign: 'center',
    transition: 'background 0.15s',
  };
  const btnSecondary = {
    background: 'none', border: '1px solid #E5E0D8', borderRadius: '10px',
    padding: '0.6rem 1.25rem', fontSize: '0.85rem', fontWeight: 500,
    color: T.muted, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
    transition: 'border-color 0.15s',
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(28,43,30,0.55)',
      zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '1rem',
    }}>
      <div style={{
        background: '#fff', borderRadius: '16px', padding: '2.5rem',
        maxWidth: '480px', width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        fontFamily: "'DM Sans', sans-serif",
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img src="/logo.png" alt="CloverIA FicheTech" style={{ width: '140px', height: 'auto', objectFit: 'contain', display: 'inline-block' }} />
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '2rem' }}>
          {[0, 1, 2].map(i => <Dot key={i} active={i === step} />)}
        </div>

        {/* Step 1 */}
        {step === 0 && (
          <>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
              Étape 1 sur 3
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.45rem', fontWeight: 700, color: T.text, marginBottom: '0.75rem', lineHeight: 1.25 }}>
              Votre restaurant, vos règles
            </h2>
            <p style={{ fontSize: '0.9rem', color: T.muted, lineHeight: 1.6, marginBottom: '2rem' }}>
              Définissez votre food cost cible et votre TVA. Tout le reste se calcule automatiquement.
            </p>
            <button
              style={btnPrimary}
              onClick={() => goTo('/parametres')}
              onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
              onMouseLeave={e => e.currentTarget.style.background = T.green}
            >
              Configurer maintenant →
            </button>
            <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              <button style={btnSecondary} onClick={() => setStep(1)}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.green}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E0D8'}
              >Suivant</button>
            </div>
          </>
        )}

        {/* Step 2 */}
        {step === 1 && (
          <>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
              Étape 2 sur 3
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.45rem', fontWeight: 700, color: T.text, marginBottom: '0.75rem', lineHeight: 1.25 }}>
              Vos ingrédients, votre base
            </h2>
            <p style={{ fontSize: '0.9rem', color: T.muted, lineHeight: 1.6, marginBottom: '1.75rem' }}>
              Sans ingrédients, les food costs restent à zéro.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <button
                onClick={() => goTo('/ingredients')}
                style={{
                  padding: '1rem', border: '1.5px solid #E5E0D8', borderRadius: '12px',
                  background: '#FAFAF8', cursor: 'pointer', textAlign: 'left',
                  fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.gold; e.currentTarget.style.background = '#FFF9F0'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E0D8'; e.currentTarget.style.background = '#FAFAF8'; }}
              >
                <div style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>✨</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: T.text }}>Scanner une facture</div>
                <div style={{ fontSize: '0.75rem', color: T.gold, fontWeight: 600, marginTop: '2px' }}>Powered by IA</div>
              </button>
              <button
                onClick={() => goTo('/ingredients')}
                style={{
                  padding: '1rem', border: '1.5px solid #E5E0D8', borderRadius: '12px',
                  background: '#FAFAF8', cursor: 'pointer', textAlign: 'left',
                  fontFamily: "'DM Sans', sans-serif", transition: 'border-color 0.15s, background 0.15s',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = T.green; e.currentTarget.style.background = '#F0FAF5'; }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E0D8'; e.currentTarget.style.background = '#FAFAF8'; }}
              >
                <div style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>📋</div>
                <div style={{ fontSize: '0.85rem', fontWeight: 700, color: T.text }}>Ajouter manuellement</div>
                <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: '2px' }}>Saisie directe</div>
              </button>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button style={btnSecondary} onClick={() => setStep(2)}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.green}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E0D8'}
              >Suivant</button>
            </div>
          </>
        )}

        {/* Step 3 */}
        {step === 2 && (
          <>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.gold, textTransform: 'uppercase', letterSpacing: '0.12em', marginBottom: '0.5rem' }}>
              Étape 3 sur 3
            </div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.45rem', fontWeight: 700, color: T.text, marginBottom: '0.75rem', lineHeight: 1.25 }}>
              Votre première fiche en 30 secondes
            </h2>
            <p style={{ fontSize: '0.9rem', color: T.muted, lineHeight: 1.6, marginBottom: '2rem' }}>
              Décrivez votre plat en langage naturel, l'IA fait le reste.
            </p>
            <button
              style={btnPrimary}
              onClick={() => goTo('/fiches-techniques/nouvelle')}
              onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
              onMouseLeave={e => e.currentTarget.style.background = T.green}
            >
              Créer avec l'IA →
            </button>
            <div style={{ marginTop: '0.75rem', textAlign: 'center' }}>
              <button style={btnSecondary} onClick={dismiss}
                onMouseEnter={e => e.currentTarget.style.borderColor = T.green}
                onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E0D8'}
              >Terminer</button>
            </div>
          </>
        )}

        {/* Passer */}
        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <button
            onClick={dismiss}
            style={{ background: 'none', border: 'none', color: '#C4B9A8', fontSize: '0.78rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", padding: '4px 8px' }}
            onMouseEnter={e => e.currentTarget.style.color = T.muted}
            onMouseLeave={e => e.currentTarget.style.color = '#C4B9A8'}
          >
            Passer
          </button>
        </div>

      </div>
    </div>
  );
}
