import { useEffect, useState } from 'react';
import { api } from '../api.js';

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280', orange: '#D97706', red: '#DC2626' };
const card = { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };
const inputStyle = { padding: '0.45rem 0.7rem', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: T.text, width: '100%' };
const labelStyle = { fontSize: '0.78rem', color: T.muted, display: 'block', marginBottom: '6px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };

function fcColor(pct) { if (pct < 30) return T.green; if (pct <= 35) return T.orange; return T.red; }
function fcLabel(pct) { if (pct < 30) return 'Excellent'; if (pct <= 35) return 'Acceptable'; return 'A retravailler'; }

export default function Parametres() {
  const [form, setForm] = useState({ etablissement: '', foodCostCible: 30, tva: 10 });
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/parametres').then(r => r.json()).then(data => { setForm(data); setLoading(false); });
  }, []);

  function sauvegarder(e) {
    e.preventDefault();
    fetch('/api/parametres', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then(() => { setSaved(true); setTimeout(() => setSaved(false), 3000); });
  }

  async function exportData(fetcher, filename, type) {
    try {
      const data = await fetcher();
      const blob = new Blob([data], { type });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = filename; a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Erreur lors de l\'export'); }
  }

  function exportIngredients() {
    return exportData(async () => {
      const data = await api.ingredients.list();
      const header = 'nom,unite,prix,fournisseur,tva,rendement\n';
      const rows = data.map(i =>
        [i.nom, i.unite ?? '', i.prixUnitaire ?? 0, i.fournisseur ?? '', i.tva ?? '', i.rendement ?? '']
          .map(v => `"${String(v).replace(/"/g, '""')}"`)
          .join(',')
      ).join('\n');
      return header + rows;
    }, 'ingredients.csv', 'text/csv;charset=utf-8;');
  }

  function exportFiches() {
    return exportData(
      async () => JSON.stringify(await api.recettes.list(), null, 2),
      'fiches-techniques.json', 'application/json'
    );
  }

  function exportVentes() {
    return exportData(
      async () => JSON.stringify(await api.ventes.list(), null, 2),
      'ventes-imports.json', 'application/json'
    );
  }

  const cible = form.foodCostCible;

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
                color: fcColor(cible),
                pointerEvents: 'none',
                whiteSpace: 'nowrap',
                lineHeight: 1,
              }}>{cible}%</span>
              <input
                type="range" min="20" max="50" step="1"
                value={cible}
                onChange={e => setForm(f => ({ ...f, foodCostCible: parseInt(e.target.value) }))}
                style={{ width: '100%', accentColor: fcColor(cible), cursor: 'pointer', display: 'block' }}
              />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: T.muted, marginTop: '4px' }}>
              <span>20%</span><span>30%</span><span>40%</span><span>50%</span>
            </div>

            {/* Indicateur visuel */}
            <div style={{ marginTop: '1rem', padding: '0.875rem 1rem', borderRadius: '8px', background: cible < 30 ? 'rgba(45,106,79,0.06)' : cible <= 35 ? 'rgba(217,119,6,0.06)' : 'rgba(220,38,38,0.06)', border: '1px solid ' + (cible < 30 ? 'rgba(45,106,79,0.2)' : cible <= 35 ? 'rgba(217,119,6,0.2)' : 'rgba(220,38,38,0.2)') }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: fcColor(cible), flexShrink: 0 }} />
                <div>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: fcColor(cible) }}>{fcLabel(cible)}</span>
                  <span style={{ fontSize: '0.78rem', color: T.muted, marginLeft: '8px' }}>
                    {cible < 28 ? '— Marges très confortables, vérifiez la qualité.' : cible < 32 ? '— Zone idéale pour la restauration gastronomique.' : cible < 36 ? '— Acceptable, surveillez les matières premières.' : '— Trop élevé, révisez vos recettes ou vos prix.'}
                  </span>
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

      {/* Mes données */}
      <div style={{ ...card, padding: '1.5rem', marginTop: '1rem' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: T.text, marginBottom: '0.4rem' }}>Mes données</h3>
        <p style={{ fontSize: '0.82rem', color: T.muted, marginBottom: '1.25rem', marginTop: 0 }}>
          Exportez vos données pour les sauvegarder ou les utiliser dans un autre outil.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {[
            { label: 'Ingrédients', desc: 'nom, unité, prix, fournisseur, TVA, rendement', ext: 'CSV', fn: exportIngredients },
            { label: 'Fiches techniques', desc: 'toutes les recettes complètes', ext: 'JSON', fn: exportFiches },
            { label: 'Ventes importées', desc: 'tous les imports enregistrés', ext: 'JSON', fn: exportVentes },
          ].map(({ label, desc, ext, fn }) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.875rem 1rem', background: '#FAFAF8', borderRadius: '8px', border: '1px solid #F3EFE8', gap: '1rem', flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: T.text }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: '2px' }}>{desc}</div>
              </div>
              <button
                type="button"
                onClick={fn}
                style={{ flexShrink: 0, padding: '0.45rem 1rem', background: '#fff', color: T.green, border: '1px solid #2D6A4F', borderRadius: '7px', fontWeight: 600, fontSize: '0.82rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap', transition: 'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.background = T.green; e.currentTarget.style.color = '#fff'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = T.green; }}
              >
                ↓ Export {ext}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}