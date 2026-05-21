import { useEffect, useState } from 'react';
import { api } from '../api.js';

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280', orange: '#D97706', red: '#DC2626' };
const card = { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };
const inputStyle = { padding: '0.45rem 0.7rem', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: T.text, width: '100%' };
const labelStyle = { fontSize: '0.78rem', color: T.muted, display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };

function fcColor(pct) { if (pct < 30) return T.green; if (pct <= 35) return T.orange; return T.red; }
function fcLabel(pct) { if (pct < 30) return 'Excellent'; if (pct <= 35) return 'Acceptable'; return 'A retravailler'; }

const TYPE_FC = {
  'Gastro': { thresholds: [28, 33], msgs: ['Excellent pour un gastro — marges très confortables', 'Acceptable pour un gastro', 'À surveiller pour un gastro'] },
  'Brasserie / traditionnel': { thresholds: [32, 36], msgs: ['Excellent pour une brasserie', 'Acceptable pour une brasserie', 'À surveiller pour une brasserie'] },
  'Fast-food / snacking': { thresholds: [32, 36], msgs: ['Excellent pour le snacking', 'Acceptable pour le snacking', 'À surveiller pour le snacking'] },
  'Traiteur': { thresholds: [32, 36], msgs: ['Excellent pour un traiteur', 'Acceptable pour un traiteur', 'À surveiller pour un traiteur'] },
  "Hôtel / restaurant d'hôtel": { thresholds: [30, 35], msgs: ["Excellent pour un hôtel-restaurant", "Acceptable pour un hôtel-restaurant", "À surveiller pour un hôtel-restaurant"] },
};

const IND_BG = { [T.green]: 'rgba(45,106,79,0.06)', [T.orange]: 'rgba(217,119,6,0.06)', [T.red]: 'rgba(220,38,38,0.06)' };
const IND_BORDER = { [T.green]: 'rgba(45,106,79,0.2)', [T.orange]: 'rgba(217,119,6,0.2)', [T.red]: 'rgba(220,38,38,0.2)' };

function getIndicator(cible, type) {
  const conf = TYPE_FC[type];
  if (!conf) {
    return {
      color: fcColor(cible),
      label: fcLabel(cible),
      msg: cible < 28 ? '— Marges très confortables, vérifiez la qualité.' : cible < 32 ? '— Zone idéale pour la restauration gastronomique.' : cible < 36 ? '— Acceptable, surveillez les matières premières.' : '— Trop élevé, révisez vos recettes ou vos prix.',
    };
  }
  const [t1, t2] = conf.thresholds;
  const idx = cible < t1 ? 0 : cible <= t2 ? 1 : 2;
  const colors = [T.green, T.orange, T.red];
  const labels = ['Excellent', 'Acceptable', 'À retravailler'];
  return { color: colors[idx], label: labels[idx], msg: '— ' + conf.msgs[idx] };
}

export default function Parametres() {
  const [form, setForm] = useState({ etablissement: '', foodCostCible: 30, tva: 10 });
  const [profil, setProfil] = useState(null);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch('/api/parametres').then(r => r.json()),
      api.profil.get().catch(() => null),
    ]).then(([params, p]) => {
      setForm(params);
      setProfil(p);
      setLoading(false);
    });
  }, []);

  function sauvegarder(e) {
    e.preventDefault();
    fetch('/api/parametres', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then(() => { setSaved(true); setTimeout(() => setSaved(false), 3000); });
  }

  const cible = form.foodCostCible;
  const indicator = getIndicator(cible, profil?.typeEtablissement);

  if (loading) return <p style={{ color: T.muted }}>Chargement...</p>;

  return (
    <div style={{ maxWidth: '620px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: T.text }}>Paramètres</h1>
        <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '2px' }}>Configuration de l'établissement et des calculs</p>
      </div>

      <form onSubmit={sauvegarder} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* Etablissement */}
        <div style={{ ...card, padding: '1.5rem' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: T.text, marginBottom: '1.25rem' }}>Établissement</h3>
          <div>
            <label style={labelStyle}>Nom de l'établissement</label>
            <input
              value={form.etablissement}
              onChange={e => setForm(f => ({ ...f, etablissement: e.target.value }))}
              style={inputStyle}
              placeholder="Ex: Restaurant La Bonne Table"
            />
            <p style={{ fontSize: '0.75rem', color: T.muted, marginTop: '6px' }}>Apparaît sur les fiches techniques imprimées.</p>
          </div>
        </div>

        {/* Food cost */}
        <div style={{ ...card, padding: '1.5rem' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: T.text, marginBottom: '1.25rem' }}>Food Cost cible</h3>
          <div>
            <label style={labelStyle}>Objectif food cost</label>
            <div style={{ position: 'relative', paddingTop: '2.75rem' }}>
              <span style={{
                position: 'absolute',
                top: 0,
                left: `${((cible - 20) / (50 - 20)) * 100}%`,
                transform: 'translateX(-50%)',
                fontFamily: "'Playfair Display', serif",
                fontSize: '1.8rem',
                fontWeight: 700,
                color: indicator.color,
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}>{cible}%</span>
              <input
                type="range" min="20" max="50" step="1"
                value={cible}
                onChange={e => setForm(f => ({ ...f, foodCostCible: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: indicator.color, cursor: 'pointer', display: 'block' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: T.muted, marginTop: '4px' }}>
              <span>20%</span><span>30%</span><span>40%</span><span>50%</span>
            </div>

            {/* Indicateur visuel */}
            <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', borderRadius: '8px', background: IND_BG[indicator.color], border: '1px solid ' + IND_BORDER[indicator.color] }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: indicator.color, flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: indicator.color }}>{indicator.label}</span>
                  <span style={{ fontSize: '0.78rem', color: T.muted, marginLeft: '8px' }}>{indicator.msg}</span>
                </div>
              </div>
            </div>

            <p style={{ fontSize: '0.75rem', color: T.muted, marginTop: '0.75rem' }}>
              Utilisé pour calculer le prix de vente suggéré : Prix = Coût matière ÷ {cible / 100}
            </p>

            {/* Exemple live */}
            <div style={{ marginTop: '0.75rem', padding: '0.75rem 1rem', borderRadius: '8px', background: '#FAFAF8', border: '1px solid #F3EFE8', fontSize: '0.82rem', color: T.muted }}>
              <strong style={{ color: T.text }}>Exemple :</strong> Coût matière 4.50 EUR/portion → Prix suggéré{' '}
              <strong style={{ color: T.green }}>{(4.5 / (cible / 100)).toFixed(2)} EUR</strong>
            </div>
          </div>
        </div>

        {/* TVA */}
        <div style={{ ...card, padding: '1.5rem' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: T.text, marginBottom: '1.25rem' }}>TVA par défaut</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[
              { value: 10, label: '10% — Restauration sur place', desc: 'Repas consommés dans l\'établissement.' },
              { value: 20, label: '20% — Vente à emporter / livraison', desc: 'Plats froids à emporter et livraisons.' },
              { value: 5.5, label: '5.5% — Produits alimentaires bruts', desc: 'Ingrédients et matières premières.' },
            ].map(opt => (
              <label key={opt.value} style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', padding: '0.875rem', borderRadius: '8px', background: form.tva === opt.value ? 'rgba(45,106,79,0.06)' : '#FAFAF8', border: '1px solid ' + (form.tva === opt.value ? 'rgba(45,106,79,0.25)' : '#F3EFE8'), cursor: 'pointer', transition: 'all 0.1s' }}>
                <input type="radio" name="tva" value={opt.value} checked={form.tva === opt.value} onChange={() => setForm(f => ({ ...f, tva: opt.value }))} style={{ marginTop: '2px', accentColor: T.green }} />
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.875rem', color: T.text }}>{opt.label}</div>
                  <div style={{ fontSize: '0.78rem', color: T.muted, marginTop: '2px' }}>{opt.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Bouton */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'flex-end' }}>
          {saved && (
            <span style={{ fontSize: '0.875rem', color: T.green, fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.green, display: 'inline-block' }} />
              Paramètres sauvegardés
            </span>
          )}
          <button type="submit" style={{ padding: '0.6rem 2rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
            onMouseLeave={e => e.currentTarget.style.background = T.green}
          >Sauvegarder</button>
        </div>
      </form>

    </div>
  );
}