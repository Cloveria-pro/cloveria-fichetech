import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { coutPortionHT, foodCostPct } from '../utils.js';
import OnboardingModal from '../components/OnboardingModal.jsx';
import { useWindowWidth } from '../hooks/useWindowWidth.js';

const T = { green: '#2D6A4F', orange: '#D97706', red: '#DC2626', text: '#1C2B1E', muted: '#6B7280' };
const card = { background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' };

function fcColor(pct, cible) {
  if (pct < cible) return T.green;
  if (pct <= cible + 5) return T.orange;
  return T.red;
}
function fcLabel(pct, cible) {
  if (pct < cible) return 'Excellent';
  if (pct <= cible + 5) return 'Attention';
  return 'Critique';
}

function varCoutsOverDays(historique, days) {
  const histByNom = {};
  historique.forEach(h => { if (!histByNom[h.nom]) histByNom[h.nom] = []; histByNom[h.nom].push(h); });
  const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  const variations = [];
  Object.values(histByNom).forEach(entries => {
    const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
    const last = sorted[sorted.length - 1];
    const ref = sorted.find(e => new Date(e.date) >= cutoff);
    if (!ref || !last || ref === last || ref.prix === 0) return;
    variations.push((last.prix - ref.prix) / ref.prix * 100);
  });
  if (variations.length === 0) return null;
  return variations.reduce((s, v) => s + v, 0) / variations.length;
}

export default function Dashboard() {
  const [recettes, setRecettes] = useState([]);
  const [params, setParams] = useState({ foodCostCible: 30, tva: 10 });
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [ingredientsCount, setIngredientsCount] = useState(null);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    Promise.all([
      api.recettes.list(),
      api.parametres.get().catch(() => ({ foodCostCible: 30, tva: 10 })),
      api.historiquePrix.list().catch(() => []),
      api.ingredients.list().catch(() => []),
    ]).then(([recs, p, hist, ings]) => {
      setRecettes(recs);
      setParams(p);
      setHistorique(hist);
      setIngredientsCount(ings.length);
      if (!localStorage.getItem('onboarding_done') && recs.length === 0 && ings.length === 0) {
        setShowOnboarding(true);
      }
    }).finally(() => setLoading(false));
  }, []);

  const width = useWindowWidth();
  const isMobile = width < 768;

  if (loading) return <p style={{ color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>Chargement...</p>;

  const cible = params.foodCostCible || 30;

  const avecPrix = recettes.filter(r => (r.prixVentePratiqueTTC || 0) > 0);
  const withFC = avecPrix.map(r => ({ ...r, fc: foodCostPct(r) })).filter(r => r.fc !== null);
  const fcMoyen = withFC.length > 0
    ? withFC.reduce((s, r) => s + r.fc, 0) / withFC.length
    : null;

  const coutMatMoyen = recettes.length > 0
    ? recettes.reduce((s, r) => s + coutPortionHT(r), 0) / recettes.length
    : 0;

  const fichesCritiques = withFC.filter(r => r.fc > cible);
  const withFCSorted = [...withFC].sort((a, b) => a.fc - b.fc);
  const meilleureFiche = withFCSorted.length > 0 ? withFCSorted[0] : null;
  const fichePlusProblem = withFCSorted.length > 0 ? withFCSorted[withFCSorted.length - 1] : null;

  const prixVenteMoyenTTC = avecPrix.length > 0
    ? avecPrix.reduce((s, r) => s + (r.prixVentePratiqueTTC || 0), 0) / avecPrix.length
    : null;

  const varCouts7j = varCoutsOverDays(historique, 7);
  const varCouts30j = varCoutsOverDays(historique, 30);

  const sansPrixCount = recettes.filter(r => !(r.prixVentePratiqueTTC > 0)).length;

  const synthesePhrase = (() => {
    if (fcMoyen === null) return 'Ajoutez vos prix de vente pour analyser votre situation.';
    if (fichesCritiques.length === 0) return 'Toutes vos fiches sont sous contrôle — bien géré.';
    if (fichesCritiques.length === 1) return `"${fichesCritiques[0].nom}" dépasse votre seuil cible de ${cible}%.`;
    return `${fichesCritiques.length} fiches dépassent votre seuil cible de ${cible}%.`;
  })();

  // ── Actions prioritaires ────────────────────────────────────────────────────
  const actionsJour = (() => {
    const actions = [];

    withFC
      .filter(r => r.fc > cible)
      .map(r => {
        const impactEuro = (r.fc - cible) / 100 * (r.prixVentePratiqueTTC || 0);
        return {
          nom: r.nom,
          probleme: `food cost à ${r.fc.toFixed(1)}% — cible ${cible}%`,
          impactLabel: `coûte ${impactEuro.toFixed(2)} € de trop/couvert`,
          link: `/fiches-techniques/${r.id}`,
          dotColor: r.fc > cible + 5 ? T.red : T.orange,
          impactSort: impactEuro,
        };
      })
      .sort((a, b) => b.impactSort - a.impactSort)
      .forEach(a => actions.push(a));

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
        nom,
        probleme: `hausse +${pct.toFixed(0)}% sur 30 j`,
        impactLabel: `${impacted.length} fiche${impacted.length > 1 ? 's' : ''} impactée${impacted.length > 1 ? 's' : ''}`,
        link: '/ingredients',
        dotColor: T.orange,
        impactSort: pct * impacted.length,
      });
    });

    if (sansPrixCount > 0) {
      actions.push({
        nom: `${sansPrixCount} fiche${sansPrixCount > 1 ? 's' : ''} sans prix`,
        probleme: 'prix de vente manquant',
        impactLabel: 'food cost non calculable',
        link: '/fiches-techniques',
        dotColor: T.muted,
        impactSort: -1,
      });
    }

    return actions.sort((a, b) => b.impactSort - a.impactSort).slice(0, 3);
  })();

  const metaStyle = { fontSize: '0.65rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' };

  return (
    <div style={{ maxWidth: '760px', fontFamily: "'DM Sans', sans-serif" }}>
      {showOnboarding && <OnboardingModal onClose={() => setShowOnboarding(false)} />}

      {/* ── Bloc 1 — Hero card ─────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '2rem 0 2rem 2.5rem', marginBottom: '1.5rem', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'stretch', flexDirection: isMobile ? 'column' : 'row' }}>

          {/* Colonne gauche */}
          <div style={{ flex: '2 1 0', paddingRight: isMobile ? 0 : '2rem', paddingBottom: isMobile ? '1.25rem' : 0 }}>
            <div style={metaStyle}>Situation du jour</div>

            {fcMoyen !== null ? (
              <>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '3rem', fontWeight: 700,
                  color: fcColor(fcMoyen, cible), lineHeight: 1.05,
                  letterSpacing: '-0.02em', marginTop: '0.5rem',
                }}>
                  {fcMoyen.toFixed(1)}%
                </div>
                <div style={{
                  fontSize: '0.875rem', fontWeight: 700,
                  color: fcColor(fcMoyen, cible), marginTop: '0.35rem', marginBottom: '0.75rem',
                }}>
                  {fcLabel(fcMoyen, cible)}
                </div>
              </>
            ) : (
              <>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '3rem', fontWeight: 700,
                  color: '#D1C4B0', lineHeight: 1.05, marginTop: '0.5rem',
                }}>—</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: T.muted, marginTop: '0.35rem', marginBottom: '0.75rem' }}>
                  Non calculable
                </div>
              </>
            )}

            <div style={{ fontSize: '0.82rem', color: T.muted, lineHeight: 1.6 }}>
              {synthesePhrase}
            </div>
          </div>

          {/* Séparateur */}
          {!isMobile && <div style={{ width: '1px', background: '#EDE8DF', flexShrink: 0 }} />}
          {isMobile && <div style={{ height: '1px', background: '#EDE8DF' }} />}

          {/* Colonne droite */}
          <div style={{ flex: '1 1 0', paddingLeft: isMobile ? 0 : '2rem', paddingTop: isMobile ? '1.25rem' : 0, display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center' }}>

            {varCouts7j !== null && (
              <div>
                <div style={metaStyle}>Coûts / 7 j</div>
                <div style={{ fontSize: '0.9rem', fontWeight: 700, color: varCouts7j > 2 ? T.red : varCouts7j < -2 ? T.green : T.text }}>
                  {varCouts7j > 0 ? '↑ +' : '↓ '}{varCouts7j.toFixed(1)}%
                </div>
              </div>
            )}

            <div>
              <div style={metaStyle}>Fiches critiques</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: fichesCritiques.length > 0 ? T.red : T.green }}>
                {fichesCritiques.length}
              </div>
            </div>

            {meilleureFiche && (
              <div>
                <div style={metaStyle}>Plus rentable</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.green, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {meilleureFiche.nom}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: T.green, flexShrink: 0 }}>
                    {meilleureFiche.fc.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {fichePlusProblem && fichePlusProblem.fc > cible && (
              <div>
                <div style={metaStyle}>À surveiller</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: T.red, flexShrink: 0 }} />
                  <span style={{ fontSize: '0.8rem', color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {fichePlusProblem.nom}
                  </span>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: T.red, flexShrink: 0 }}>
                    {fichePlusProblem.fc.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

          </div>

          {/* Champ de trèfles — desktop uniquement */}
          {!isMobile && (
            <div style={{ flexShrink: 0, width: '260px', height: '100%', overflow: 'hidden', borderRadius: '0 16px 16px 0', position: 'relative' }}>
              <img
                src="/clover.png"
                alt=""
                style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'brightness(1.05) saturate(1.1)' }}
              />
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to right, white 0%, transparent 40%)',
                boxShadow: 'inset 8px 0 16px rgba(255,255,255,0.6)',
                pointerEvents: 'none',
              }} />
            </div>
          )}

        </div>
      </div>

      {/* ── Bloc 2 — Actions prioritaires ──────────────────────────────────── */}
      <div style={{
        ...card,
        borderLeft: `4px solid ${actionsJour.length > 0 ? T.red : T.green}`,
        borderRadius: '16px',
        marginBottom: '1.5rem',
        overflow: 'hidden',
      }}>
        <div style={{
          padding: '1.1rem 1.75rem',
          borderBottom: '1px solid #F3EFE8',
        }}>
          <div style={metaStyle}>Actions prioritaires</div>
        </div>

        {actionsJour.length === 0 ? (
          <div style={{ padding: '1.25rem 1.75rem', fontSize: '0.875rem', color: T.green, fontWeight: 600 }}>
            Tout est sous contrôle — aucune action urgente aujourd'hui
          </div>
        ) : (
          <div>
            {actionsJour.map((a, i) => (
              <div key={i} style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? '1fr auto' : '1fr auto auto',
                alignItems: 'center',
                gap: isMobile ? '0.75rem' : '1.25rem',
                padding: isMobile ? '0.75rem 1.25rem' : '0.9rem 1.75rem',
                borderBottom: i < actionsJour.length - 1 ? '1px solid #F9F7F4' : 'none',
              }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.7rem', minWidth: 0 }}>
                  <div style={{
                    width: '7px', height: '7px', borderRadius: '50%',
                    background: a.dotColor, flexShrink: 0, marginTop: '5px',
                  }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.nom}
                    </div>
                    <div style={{ fontSize: '0.73rem', color: T.muted, marginTop: '1px' }}>
                      {a.probleme}
                    </div>
                  </div>
                </div>
                {!isMobile && (
                  <div style={{ fontSize: '0.78rem', color: a.dotColor, fontWeight: 600, whiteSpace: 'nowrap' }}>
                    {a.impactLabel}
                  </div>
                )}
                <Link to={a.link} style={{
                  fontSize: '0.82rem', fontWeight: 600, color: T.green,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                }}
                  onMouseEnter={e => e.currentTarget.style.opacity = '0.65'}
                  onMouseLeave={e => e.currentTarget.style.opacity = '1'}
                >
                  Ouvrir →
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Bloc 3 — 2 mini cartes ─────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem' }}>

        <div style={{ ...card, padding: '1.25rem 1.5rem' }}>
          <div style={metaStyle}>Coût matière moyen</div>
          <div style={{ marginTop: '0.4rem', fontSize: '1.5rem', fontWeight: 700, color: T.text, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            {coutMatMoyen.toFixed(2)}&nbsp;<span style={{ fontSize: '0.85rem', fontWeight: 400, color: T.muted }}>EUR / portion</span>
          </div>
          {varCouts30j !== null && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: varCouts30j > 2 ? T.red : varCouts30j < -2 ? T.green : T.muted }}>
              {varCouts30j > 0 ? '↑ +' : '↓ '}{varCouts30j.toFixed(1)}% sur 30 j
            </div>
          )}
          {varCouts30j === null && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: T.muted }}>Pas de données historiques</div>
          )}
        </div>

        <div style={{ ...card, padding: '1.25rem 1.5rem' }}>
          <div style={metaStyle}>Fiches actives</div>
          <div style={{ marginTop: '0.4rem', fontSize: '1.5rem', fontWeight: 700, color: T.text, letterSpacing: '-0.01em', lineHeight: 1.1 }}>
            {recettes.length}&nbsp;<span style={{ fontSize: '0.85rem', fontWeight: 400, color: T.muted }}>fiche{recettes.length !== 1 ? 's' : ''}</span>
          </div>
          {prixVenteMoyenTTC !== null && (
            <div style={{ marginTop: '0.5rem', fontSize: '0.78rem', color: T.muted }}>
              PV moyen TTC&nbsp;<span style={{ fontWeight: 600, color: T.text }}>{prixVenteMoyenTTC.toFixed(2)} EUR</span>
            </div>
          )}
          {sansPrixCount > 0 && (
            <div style={{ marginTop: '0.25rem', fontSize: '0.78rem', color: T.muted }}>
              dont&nbsp;<span style={{ fontWeight: 600, color: T.orange }}>{sansPrixCount}</span>&nbsp;sans prix de vente
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
