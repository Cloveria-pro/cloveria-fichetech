import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const T = { green: '#2D6A4F', text: '#1C2B1E', muted: '#6B7280', bg: '#F8F6F1', border: '#E5E0D8' };

const FC_PRESETS = {
  'Gastro': 28,
  'Brasserie / traditionnel': 32,
  'Fast-food / snacking': 32,
  'Traiteur': 32,
  "Hôtel / restaurant d'hôtel": 30,
  'Autre': 30,
};

const TYPES_ETAB = ['Gastro', 'Brasserie / traditionnel', 'Fast-food / snacking', 'Traiteur', "Hôtel / restaurant d'hôtel", 'Autre'];
const ROLES = ['Chef', 'Gérant', 'Responsable cuisine', "Directeur d'établissement", 'Autre'];
const OBJECTIFS = ['Mieux gérer mes fiches techniques', 'Suivre mes coûts matière', 'Mieux piloter mes marges', 'Centraliser mes documents', 'Gagner du temps au quotidien'];
const NB_PLATS = ['Moins de 10', 'Entre 10 et 30', 'Entre 30 et 60', 'Plus de 60'];

function CardSelect({ options, value, onChange, multi = false }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(148px, 1fr))', gap: '0.5rem' }}>
      {options.map(opt => {
        const active = multi ? value.includes(opt) : value === opt;
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              padding: '0.65rem 0.5rem',
              borderRadius: '8px',
              border: `1.5px solid ${active ? T.green : T.border}`,
              background: active ? 'rgba(45,106,79,0.07)' : '#fff',
              color: active ? T.green : T.text,
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.82rem',
              fontWeight: active ? 600 : 400,
              cursor: 'pointer',
              textAlign: 'center',
              lineHeight: 1.35,
              transition: 'all 0.15s',
            }}
          >
            {active && <span style={{ marginRight: '4px' }}>✓</span>}
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function ProgressBar({ step }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginBottom: '2rem' }}>
      {[1, 2, 3, 4].map(i => (
        <div key={i} style={{
          width: i === step ? '28px' : '8px',
          height: '8px',
          borderRadius: '99px',
          background: i <= step ? T.green : '#DCE7E3',
          transition: 'all 0.3s ease',
        }} />
      ))}
    </div>
  );
}

function Logo({ size }) {
  return (
    <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
      <img
        src="/logo.png"
        alt="CloverIA"
        style={{ width: `${size}px`, height: 'auto', objectFit: 'contain', display: 'inline-block' }}
        onError={e => { e.currentTarget.style.display = 'none'; }}
      />
    </div>
  );
}

export default function Onboarding({ onComplete }) {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState({
    prenom: '',
    etablissement: '',
    typeEtablissement: '',
    role: '',
    objectifs: [],
    nbPlats: '',
    foodCostCible: 30,
  });

  function selectType(type) {
    setData(d => ({ ...d, typeEtablissement: type, foodCostCible: FC_PRESETS[type] ?? 30 }));
  }

  function toggleObjectif(obj) {
    setData(d => ({
      ...d,
      objectifs: d.objectifs.includes(obj)
        ? d.objectifs.filter(o => o !== obj)
        : [...d.objectifs, obj],
    }));
  }

  async function finish() {
    setSaving(true);
    try {
      await api.profil.update({ ...data, onboardingComplete: true });
      onComplete();
      navigate('/');
    } catch {
      setSaving(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '0.65rem 0.9rem',
    border: `1px solid ${T.border}`, borderRadius: '8px',
    fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif",
    outline: 'none', color: T.text, background: '#fff',
    boxSizing: 'border-box', transition: 'border-color 0.15s',
  };
  const labelStyle = {
    display: 'block', fontSize: '0.78rem', color: T.muted,
    fontWeight: 600, textTransform: 'uppercase',
    letterSpacing: '0.05em', marginBottom: '6px',
  };
  const btnStyle = (disabled = false) => ({
    width: '100%', padding: '0.8rem',
    background: T.green, color: '#fff',
    border: 'none', borderRadius: '8px',
    fontWeight: 700, fontSize: '0.95rem',
    cursor: disabled ? 'default' : 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    marginTop: '1.75rem', minHeight: '44px',
    transition: 'background 0.15s',
    opacity: disabled ? 0.75 : 1,
  });
  const subTitle = {
    fontFamily: "'Playfair Display', serif",
    fontSize: '1rem', fontWeight: 600,
    color: T.text, marginBottom: '0.75rem', marginTop: '1.5rem',
  };

  return (
    <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1rem' }}>
      <div style={{ width: '100%', maxWidth: '480px', background: '#fff', borderRadius: '20px', boxShadow: '0 4px 32px rgba(0,0,0,0.08)', padding: '2.5rem 2rem' }}>

        <Logo size={step === 4 ? 120 : 80} />
        <ProgressBar step={step} />

        {/* ── Écran 1 : Votre établissement ── */}
        {step === 1 && (
          <>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: T.text, marginBottom: '1.5rem', lineHeight: 1.25 }}>
              Bienvenue, parlons de vous.
            </h1>
            <div style={{ marginBottom: '1rem' }}>
              <label style={labelStyle}>Votre prénom</label>
              <input
                value={data.prenom}
                onChange={e => setData(d => ({ ...d, prenom: e.target.value }))}
                placeholder="Ex : Marie"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = T.green}
                onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>
            <div>
              <label style={labelStyle}>Nom de l'établissement</label>
              <input
                value={data.etablissement}
                onChange={e => setData(d => ({ ...d, etablissement: e.target.value }))}
                placeholder="Ex : Bistrot du Marché"
                style={inputStyle}
                onFocus={e => e.target.style.borderColor = T.green}
                onBlur={e => e.target.style.borderColor = T.border}
              />
            </div>
            <button
              style={btnStyle()}
              onClick={() => setStep(2)}
              onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
              onMouseLeave={e => e.currentTarget.style.background = T.green}
            >Continuer →</button>
          </>
        )}

        {/* ── Écran 2 : Votre profil ── */}
        {step === 2 && (
          <>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: T.text, marginBottom: '1.25rem', lineHeight: 1.25 }}>
              Quel type d'établissement ?
            </h1>
            <CardSelect options={TYPES_ETAB} value={data.typeEtablissement} onChange={selectType} />
            <p style={subTitle}>Quel est votre rôle ?</p>
            <CardSelect options={ROLES} value={data.role} onChange={role => setData(d => ({ ...d, role }))} />
            <button
              style={btnStyle()}
              onClick={() => setStep(3)}
              onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
              onMouseLeave={e => e.currentTarget.style.background = T.green}
            >Continuer →</button>
          </>
        )}

        {/* ── Écran 3 : Vos objectifs ── */}
        {step === 3 && (
          <>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: T.text, marginBottom: '1.25rem', lineHeight: 1.25 }}>
              Qu'est-ce qui vous amène ?
            </h1>
            <CardSelect options={OBJECTIFS} value={data.objectifs} onChange={toggleObjectif} multi />
            <p style={subTitle}>Combien de plats gérez-vous environ ?</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
              {NB_PLATS.map(opt => (
                <label key={opt} style={{
                  display: 'flex', alignItems: 'center', gap: '0.75rem',
                  padding: '0.65rem 0.875rem', borderRadius: '8px',
                  border: `1.5px solid ${data.nbPlats === opt ? T.green : T.border}`,
                  background: data.nbPlats === opt ? 'rgba(45,106,79,0.07)' : '#fff',
                  cursor: 'pointer', transition: 'all 0.1s',
                }}>
                  <input
                    type="radio" name="nbPlats" value={opt}
                    checked={data.nbPlats === opt}
                    onChange={() => setData(d => ({ ...d, nbPlats: opt }))}
                    style={{ accentColor: T.green, flexShrink: 0 }}
                  />
                  <span style={{ fontSize: '0.875rem', color: T.text, fontWeight: data.nbPlats === opt ? 600 : 400 }}>{opt}</span>
                </label>
              ))}
            </div>
            <button
              style={btnStyle()}
              onClick={() => setStep(4)}
              onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
              onMouseLeave={e => e.currentTarget.style.background = T.green}
            >Continuer →</button>
          </>
        )}

        {/* ── Écran 4 : Confirmation ── */}
        {step === 4 && (
          <>
            <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, color: T.text, textAlign: 'center', marginBottom: '1rem', lineHeight: 1.2 }}>
              Votre espace est prêt.
            </h1>
            <p style={{ textAlign: 'center', color: T.muted, fontSize: '0.9rem', lineHeight: 1.75 }}>
              Tout est configuré. Vous pouvez commencer à créer vos fiches et suivre vos marges.
            </p>
            <button
              style={btnStyle(saving)}
              onClick={finish}
              disabled={saving}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#1e4d38'; }}
              onMouseLeave={e => { e.currentTarget.style.background = T.green; }}
            >
              {saving ? 'Enregistrement...' : 'Accéder à mon espace →'}
            </button>
          </>
        )}

      </div>
    </div>
  );
}
