import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { coutPortionHT, foodCostPct } from '../utils.js';

const T = { green: '#2D6A4F', orange: '#D97706', red: '#DC2626', text: '#1C2B1E', muted: '#6B7280' };

function fcColor(pct) {
  if (pct < 30) return T.green;
  if (pct <= 35) return T.orange;
  return T.red;
}
function fcLabel(pct) {
  if (pct < 30) return 'Excellent';
  if (pct <= 35) return 'Attention';
  return 'Critique';
}

export default function Dashboard() {
  const [recettes, setRecettes] = useState([]);
  const [params, setParams] = useState({ foodCostCible: 30, tva: 10 });
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.recettes.list(),
      api.parametres.get().catch(() => ({ foodCostCible: 30, tva: 10 })),
      api.historiquePrix.list().catch(() => []),
    ]).then(([recs, p, hist]) => {
      setRecettes(recs);
      setParams(p);
      setHistorique(hist);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <p style={{ color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>Chargement...</p>;

  const cible = params.foodCostCible || 30;

  // Food cost moyen — uniquement les fiches avec prix de vente
  const avecPrix = recettes.filter(r => (r.prixVentePratiqueTTC || 0) > 0);
  const withFC = avecPrix.map(r => ({ ...r, fc: foodCostPct(r) })).filter(r => r.fc !== null);
  const fcMoyen = withFC.length > 0
    ? withFC.reduce((s, r) => s + r.fc, 0) / withFC.length
    : null;

  // Coût matière moyen par portion (toutes fiches)
  const coutMatMoyen = recettes.length > 0
    ? recettes.reduce((s, r) => s + coutPortionHT(r), 0) / recettes.length
    : 0;

  // ── Zone 2 : actions du jour ──────────────────────────────────────────────
  const actionsJour = (() => {
    const actions = [];

    // Type 1 — fiches FC > cible, triées par impact €/couvert
    withFC
      .filter(r => r.fc > cible)
      .map(r => ({
        label: `"${r.nom}" — food cost à ${r.fc.toFixed(1)}% (cible : ${cible}%)`,
        link: `/fiches-techniques/${r.id}`,
        impact: (r.fc - cible) * (r.prixVentePratiqueTTC || 0) / 100,
      }))
      .sort((a, b) => b.impact - a.impact)
      .forEach(a => actions.push(a));

    // Type 2 — hausses de prix > 5% sur 30 jours impactant des fiches
    const histByNom = {};
    historique.forEach(h => { if (!histByNom[h.nom]) histByNom[h.nom] = []; histByNom[h.nom].push(h); });
    const m1ago = new Date(); m1ago.setMonth(m1ago.getMonth() - 1);
    Object.entries(histByNom).forEach(([nom, entries]) => {
      const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
      const last = sorted[sorted.length - 1];
      const ref = sorted.find(e => new Date(e.date) >= m1ago);
      if (!ref || !last || ref === last || ref.prix === 0) return;
      const pct = (last.prix - ref.prix) / ref.prix * 100;
      if (pct <= 5) return;
      const impacted = recettes.filter(r =>
        (r.ingredients || []).some(ing => (ing.nom || '').toLowerCase() === nom.toLowerCase())
      );
      if (impacted.length === 0) return;
      actions.push({
        label: `${nom} en hausse de +${pct.toFixed(0)}% — ${impacted.length} fiche${impacted.length > 1 ? 's' : ''} impactée${impacted.length > 1 ? 's' : ''}`,
        link: '/ingredients',
        impact: pct * impacted.length,
      });
    });

    // Type 3 — fiches sans prix de vente
    const sansPrix = recettes.filter(r => !(r.prixVentePratiqueTTC > 0));
    if (sansPrix.length > 0) {
      actions.push({
        label: `${sansPrix.length} fiche${sansPrix.length > 1 ? 's' : ''} sans prix de vente`,
        link: '/fiches-techniques',
        impact: -1,
      });
    }

    return actions.sort((a, b) => b.impact - a.impact).slice(0, 3);
  })();

  // ── Zone 3 : métriques discrètes ─────────────────────────────────────────
  const varCouts30j = (() => {
    const histByNom = {};
    historique.forEach(h => { if (!histByNom[h.nom]) histByNom[h.nom] = []; histByNom[h.nom].push(h); });
    const d30ago = new Date(); d30ago.setDate(d30ago.getDate() - 30);
    const variations = [];
    Object.values(histByNom).forEach(entries => {
      const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
      const last = sorted[sorted.length - 1];
      const ref = sorted.find(e => new Date(e.date) >= d30ago);
      if (!ref || !last || ref === last || ref.prix === 0) return;
      variations.push((last.prix - ref.prix) / ref.prix * 100);
    });
    if (variations.length === 0) return null;
    return variations.reduce((s, v) => s + v, 0) / variations.length;
  })();

  const sansPrixCount = recettes.filter(r => !(r.prixVentePratiqueTTC > 0)).length;

  return (
    <div style={{ maxWidth: '680px', fontFamily: "'DM Sans', sans-serif" }}>

      {/* ── Zone 1 — Food cost dominant ─────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingBottom: '3rem',
        marginBottom: '3rem',
        borderBottom: '1px solid #EDE8DF',
      }}>
        <div>
          {fcMoyen !== null ? (
            <>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '5.5rem',
                fontWeight: 700,
                color: fcColor(fcMoyen),
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}>
                {fcMoyen.toFixed(1)}%
              </div>
              <div style={{
                marginTop: '0.6rem',
                fontSize: '1rem',
                fontWeight: 700,
                color: fcColor(fcMoyen),
                letterSpacing: '0.01em',
              }}>
                {fcLabel(fcMoyen)}
              </div>
              <div style={{ marginTop: '0.2rem', fontSize: '0.75rem', color: T.muted }}>
                food cost moyen
              </div>
            </>
          ) : (
            <>
              <div style={{
                fontFamily: "'Playfair Display', serif",
                fontSize: '5.5rem',
                fontWeight: 700,
                color: '#D1C4B0',
                lineHeight: 1,
              }}>—</div>
              <div style={{ marginTop: '0.6rem', fontSize: '0.85rem', color: T.muted }}>
                Aucune fiche avec prix de vente
              </div>
            </>
          )}
        </div>

        <div style={{ textAlign: 'right', paddingTop: '0.75rem' }}>
          <div style={{ fontSize: '0.85rem', color: T.muted, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 600, color: T.text }}>{recettes.length}</span>
            {' '}fiche{recettes.length !== 1 ? 's' : ''} active{recettes.length !== 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: '0.85rem', color: T.muted, lineHeight: 1.6 }}>
            <span style={{ fontWeight: 600, color: T.text }}>{coutMatMoyen.toFixed(2)} EUR</span>
            {' '}/ portion moyen
          </div>
        </div>
      </div>

      {/* ── Zone 2 — À traiter aujourd'hui ──────────────────────────────── */}
      <div style={{ marginBottom: '3.5rem' }}>
        <div style={{
          fontSize: '0.68rem',
          fontWeight: 700,
          color: T.muted,
          textTransform: 'uppercase',
          letterSpacing: '0.1em',
          marginBottom: '1.5rem',
        }}>
          À traiter aujourd'hui
        </div>

        {actionsJour.length === 0 ? (
          <div style={{ fontSize: '0.9rem', fontWeight: 600, color: T.green }}>
            ✓ Aucune urgence aujourd'hui
          </div>
        ) : (
          <div>
            {actionsJour.map((a, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '1.5rem',
                  padding: '0.875rem 0',
                  borderBottom: i < actionsJour.length - 1 ? '1px solid #EDE8DF' : 'none',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flex: 1, minWidth: 0 }}>
                  <div style={{
                    width: '7px', height: '7px',
                    borderRadius: '50%',
                    background: T.red,
                    flexShrink: 0,
                  }} />
                  <span style={{ fontSize: '0.9rem', color: T.text, lineHeight: 1.4 }}>
                    {a.label}
                  </span>
                </div>
                <Link
                  to={a.link}
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    color: T.green,
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Ouvrir →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Zone 3 — Métriques discrètes ─────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '2.5rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.8rem', color: T.muted }}>
          Variation coûts / 30 j :{' '}
          {varCouts30j !== null ? (
            <span style={{ fontWeight: 600, color: varCouts30j > 2 ? T.red : varCouts30j < -2 ? T.green : T.text }}>
              {varCouts30j > 0 ? '+' : ''}{varCouts30j.toFixed(1)}%
            </span>
          ) : (
            <span style={{ fontWeight: 600, color: T.text }}>—</span>
          )}
        </div>
        <div style={{ fontSize: '0.8rem', color: T.muted }}>
          Fiches sans prix :{' '}
          <span style={{ fontWeight: 600, color: sansPrixCount > 0 ? T.text : T.green }}>
            {sansPrixCount}
          </span>
        </div>
      </div>

    </div>
  );
}
