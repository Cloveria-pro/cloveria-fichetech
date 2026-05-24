import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { ItemModal } from './Organisation.jsx';
import { coutPortionHT, foodCostPct } from '../utils.js';
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
  const [agendaItems, setAgendaItems] = useState([]);
  const [cartes, setCartes] = useState([]);
  const [selectedCarteId, setSelectedCarteId] = useState(null);
  const [drawerItem, setDrawerItem] = useState(undefined);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    Promise.all([
      api.recettes.list(),
      api.parametres.get().catch(() => ({ foodCostCible: 30, tva: 10 })),
      api.historiquePrix.list().catch(() => []),
      api.agenda.list().catch(() => []),
      api.cartes.list().catch(() => []),
    ]).then(([recs, p, hist, agenda, crt]) => {
      setRecettes(recs);
      setParams(p);
      setHistorique(hist);
      setAgendaItems(agenda);
      setCartes(crt);
    }).finally(() => setLoading(false));
  }, []);

  const width = useWindowWidth();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;

  if (loading) return <p style={{ color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>Chargement...</p>;

  const cible = params.foodCostCible || 30;

  const avecPrix = recettes.filter(r => (r.prixVentePratiqueTTC || 0) > 0);
  const withFC = avecPrix.map(r => ({ ...r, fc: foodCostPct(r) })).filter(r => r.fc !== null);

  const recetteIdsInScope = selectedCarteId
    ? new Set(
        (cartes.find(c => c.id === selectedCarteId)?.sections || [])
          .flatMap(s => (s.plats || []).map(p => p.recetteId))
          .filter(Boolean)
      )
    : null;
  const withFCScope = recetteIdsInScope ? withFC.filter(r => recetteIdsInScope.has(r.id)) : withFC;
  const selectedCarte = selectedCarteId ? cartes.find(c => c.id === selectedCarteId) : null;

  const fcMoyen = withFCScope.length > 0
    ? withFCScope.reduce((s, r) => s + r.fc, 0) / withFCScope.length
    : null;

  const coutMatMoyen = recettes.length > 0
    ? recettes.reduce((s, r) => s + coutPortionHT(r), 0) / recettes.length
    : 0;

  const fichesCritiques = withFCScope.filter(r => r.fc > cible);
  const withFCScopeSorted = [...withFCScope].sort((a, b) => a.fc - b.fc);
  const meilleureFiche = withFCScopeSorted.length > 0 ? withFCScopeSorted[0] : null;

  const prixVenteMoyenTTC = avecPrix.length > 0
    ? avecPrix.reduce((s, r) => s + (r.prixVentePratiqueTTC || 0), 0) / avecPrix.length
    : null;

  const varCouts7j = varCoutsOverDays(historique, 7);
  const varCouts30j = varCoutsOverDays(historique, 30);

  const sansPrixCount = recettes.filter(r => !(r.prixVentePratiqueTTC > 0)).length;

  const synthesePhrase = (() => {
    if (fcMoyen === null) {
      return selectedCarte
        ? `Aucune fiche avec prix dans "${selectedCarte.nom}".`
        : 'Ajoutez des prix de vente pour analyser.';
    }
    if (fichesCritiques.length === 0) return 'Toutes les fiches sont sous contrôle.';
    if (fichesCritiques.length === 1) {
      const nom = fichesCritiques[0].nom;
      return `"${nom.length > 22 ? nom.slice(0, 20) + '…' : nom}" dépasse ${cible}%.`;
    }
    return `${fichesCritiques.length} fiches au-dessus de ${cible}% — à corriger.`;
  })();

  const ecartCible = fcMoyen !== null ? +(fcMoyen - cible).toFixed(1) : null;

  // ── Actions prioritaires ────────────────────────────────────────────────────
  const actionsJour = (() => {
    const actions = [];

    withFC
      .filter(r => r.fc > cible)
      .map(r => {
        const impactEuro = (r.fc - cible) / 100 * (r.prixVentePratiqueTTC || 0);
        return {
          nom: r.nom,
          probleme: `FC ${r.fc.toFixed(1)}% · cible ${cible}%`,
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

  const TYPE_COLORS_AG = { rappel: '#3B82F6', evenement: '#2D6A4F', note: '#C9A84C' };
  const TYPE_LABELS_AG = { rappel: 'Rappel', evenement: 'Événement', note: 'Note' };

  const agendaJ0J2 = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const j2 = new Date(today); j2.setDate(j2.getDate() + 2);
    return agendaItems
      .filter(it => it.type !== 'note' && it.date)
      .filter(it => { const d = new Date(it.date); d.setHours(0, 0, 0, 0); return d >= today && d <= j2; })
      .sort((a, b) => a.date.localeCompare(b.date) || (a.heure || '').localeCompare(b.heure || ''));
  })();

  const formatAgendaDate = (dateStr) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
    const diff = Math.round((d - today) / 86400000);
    if (diff === 0) return "Aujourd'hui";
    if (diff === 1) return 'Demain';
    return d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' });
  };

  async function handleAgendaSave(id, payload) {
    if (id) {
      const updated = await api.agenda.update(id, payload);
      setAgendaItems(prev => prev.map(i => i.id === id ? updated : i));
    }
  }

  const agendaWidget = (
    <div style={{ ...card, overflow: 'hidden' }}>
      <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid #F3EFE8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={metaStyle}>À venir · 3 jours</div>
        <Link to="/organisation" style={{ fontSize: '0.78rem', fontWeight: 600, color: T.green, textDecoration: 'none' }}
          onMouseEnter={e => e.currentTarget.style.opacity = '0.65'}
          onMouseLeave={e => e.currentTarget.style.opacity = '1'}
        >
          Voir tout →
        </Link>
      </div>
      {agendaJ0J2.length === 0 ? (
        <div style={{ padding: '1rem 1.5rem', fontSize: '0.82rem', color: T.muted }}>
          Rien dans les 3 prochains jours
        </div>
      ) : (
        <div>
          {agendaJ0J2.map((it, i) => (
            <div key={it.id} title={it.titre} onClick={() => setDrawerItem(it)} style={{
              display: 'flex', alignItems: 'flex-start', gap: '0.75rem',
              padding: '0.8rem 1.5rem',
              borderBottom: i < agendaJ0J2.length - 1 ? '1px solid #F9F7F4' : 'none',
              cursor: 'pointer',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
              onMouseLeave={e => e.currentTarget.style.background = ''}
            >
              <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: TYPE_COLORS_AG[it.type] || T.muted, flexShrink: 0, marginTop: '4px' }} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {it.titre}
                </div>
                <div style={{ fontSize: '0.72rem', color: T.muted, marginTop: '2px' }}>
                  {formatAgendaDate(it.date)}{it.heure ? ` · ${it.heure}` : ''}
                </div>
              </div>
              <div style={{
                fontSize: '0.65rem', fontWeight: 700, color: TYPE_COLORS_AG[it.type] || T.muted,
                background: `${TYPE_COLORS_AG[it.type]}18`, borderRadius: '4px',
                padding: '1px 6px', flexShrink: 0,
              }}>
                {TYPE_LABELS_AG[it.type]}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div style={{ maxWidth: '1040px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: '1.5rem', alignItems: 'start' }}>
        <div>

      {/* ── Bloc 1 — Hero card ─────────────────────────────────────────────── */}
      <div style={{ ...card, padding: '1.75rem 2.25rem', marginBottom: '1.5rem' }}>

        {/* En-tête : label + sélecteur de périmètre carte */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
          <div style={metaStyle}>Résumé du jour</div>
          {cartes.length > 0 && (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {[{ id: null, nom: 'Toutes' }, ...cartes].map(c => (
                <button key={c.id ?? '__all'} onClick={() => setSelectedCarteId(c.id ?? null)} style={{
                  fontSize: '0.68rem', fontWeight: 600, padding: '2px 9px', borderRadius: '20px',
                  border: 'none', cursor: 'pointer', transition: 'all 0.12s',
                  background: selectedCarteId === (c.id ?? null) ? T.green : '#F3EFE8',
                  color: selectedCarteId === (c.id ?? null) ? '#fff' : T.muted,
                }}>
                  {c.nom}
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'stretch', flexDirection: isMobile ? 'column' : 'row' }}>

          {/* Colonne gauche */}
          <div style={{ flex: '2 1 0', paddingRight: isMobile ? 0 : '2rem', paddingBottom: isMobile ? '1.25rem' : 0 }}>

            {fcMoyen !== null ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.3rem' }}>
                  <div style={{
                    fontFamily: "'Playfair Display', serif",
                    fontSize: '2.2rem', fontWeight: 700,
                    color: fcColor(fcMoyen, cible), lineHeight: 1,
                    letterSpacing: '-0.02em',
                  }}>
                    {fcMoyen.toFixed(1)}%
                  </div>
                  <div style={{
                    fontSize: '0.72rem', fontWeight: 700,
                    color: fcColor(fcMoyen, cible),
                    background: `${fcColor(fcMoyen, cible)}18`,
                    border: `1px solid ${fcColor(fcMoyen, cible)}35`,
                    borderRadius: '20px', padding: '3px 10px',
                  }}>
                    {fcLabel(fcMoyen, cible)}
                  </div>
                </div>
                <div style={{ fontSize: '0.78rem', color: T.muted, marginBottom: '1rem' }}>
                  Food cost moyen&nbsp;·&nbsp;
                  <span style={{ fontWeight: 700, color: ecartCible > 0 ? T.red : T.green }}>
                    {ecartCible > 0 ? '+' : ''}{ecartCible} pts
                  </span>
                  {' '}vs cible {cible}%
                  {selectedCarte && <span>&nbsp;· {selectedCarte.nom}</span>}
                </div>
              </>
            ) : (
              <>
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: '2.2rem', fontWeight: 700,
                  color: '#D1C4B0', lineHeight: 1, marginBottom: '0.3rem',
                }}>—</div>
                <div style={{ fontSize: '0.78rem', color: T.muted, marginBottom: '1rem' }}>
                  {selectedCarte
                    ? `Aucune fiche avec prix dans "${selectedCarte.nom}".`
                    : 'Ajoutez des prix de vente pour analyser.'}
                </div>
              </>
            )}

            <div style={{ height: '1px', background: '#EDE8DF', marginBottom: '0.875rem' }} />

            <div style={{ fontSize: '0.82rem', color: T.muted, lineHeight: 1.6, marginBottom: '0.875rem' }}>
              {synthesePhrase}
            </div>

            {fcMoyen === null ? (
              <Link to="/fiches-techniques" style={{ fontSize: '0.8rem', fontWeight: 700, color: T.green, textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.65'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Compléter les fiches →
              </Link>
            ) : fichesCritiques.length > 0 ? (
              <Link to="/fiches-techniques" style={{ fontSize: '0.8rem', fontWeight: 700, color: T.red, textDecoration: 'none' }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.65'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Corriger les fiches →
              </Link>
            ) : null}
          </div>

          {/* Séparateur */}
          {!isMobile && <div style={{ width: '1px', background: '#EDE8DF', flexShrink: 0 }} />}
          {isMobile && <div style={{ height: '1px', background: '#EDE8DF', margin: '0 0 1.25rem' }} />}

          {/* Colonne droite — stat tiles */}
          <div style={{ flex: '1 1 0', paddingLeft: isMobile ? 0 : '2rem', display: 'flex', flexDirection: 'column', gap: '0.6rem', justifyContent: 'center' }}>

            <div style={{
              padding: '0.6rem 0.875rem', borderRadius: '8px',
              background: fichesCritiques.length > 0 ? 'rgba(220,38,38,0.05)' : 'rgba(45,106,79,0.05)',
              borderLeft: `3px solid ${fichesCritiques.length > 0 ? T.red : T.green}`,
            }}>
              <div style={{ ...metaStyle, marginBottom: '3px' }}>Fiches critiques</div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
                <span style={{ fontSize: '1.2rem', fontWeight: 700, color: fichesCritiques.length > 0 ? T.red : T.green, lineHeight: 1 }}>
                  {fichesCritiques.length}
                </span>
                <span style={{ fontSize: '0.72rem', color: T.muted }}>
                  {fichesCritiques.length > 0 ? `> ${cible}%` : 'sous contrôle'}
                </span>
              </div>
            </div>

            {meilleureFiche && (
              <div style={{
                padding: '0.6rem 0.875rem', borderRadius: '8px',
                background: 'rgba(45,106,79,0.05)', borderLeft: `3px solid ${T.green}`,
              }}>
                <div style={{ ...metaStyle, marginBottom: '3px' }}>Plus rentable</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>
                    {meilleureFiche.nom}
                  </span>
                  <span style={{ fontSize: '0.82rem', fontWeight: 700, color: T.green, flexShrink: 0 }}>
                    {meilleureFiche.fc.toFixed(1)}%
                  </span>
                </div>
              </div>
            )}

            {varCouts7j !== null && (
              <div style={{
                padding: '0.6rem 0.875rem', borderRadius: '8px',
                background: varCouts7j > 2 ? 'rgba(220,38,38,0.05)' : varCouts7j < -2 ? 'rgba(45,106,79,0.05)' : '#FAFAF8',
                borderLeft: `3px solid ${varCouts7j > 2 ? T.red : varCouts7j < -2 ? T.green : '#E5E0D8'}`,
              }}>
                <div style={{ ...metaStyle, marginBottom: '3px' }}>Coûts / 7 j</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 700, color: varCouts7j > 2 ? T.red : varCouts7j < -2 ? T.green : T.text, lineHeight: 1 }}>
                  {varCouts7j > 0 ? '↑ +' : '↓ '}{varCouts7j.toFixed(1)}%
                </div>
              </div>
            )}

          </div>

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
          display: 'flex', alignItems: 'center', gap: '0.6rem',
        }}>
          <div style={metaStyle}>Actions prioritaires</div>
          {actionsJour.length > 0 && (
            <div style={{
              fontSize: '0.68rem', fontWeight: 700, color: '#fff',
              background: T.red, borderRadius: '20px', padding: '1px 7px', lineHeight: 1.6,
            }}>
              {actionsJour.length}
            </div>
          )}
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

          {isMobile && <div style={{ marginTop: '1rem' }}>{agendaWidget}</div>}

        </div>

        {!isMobile && (
          <div style={{ position: 'sticky', top: '2rem' }}>
            {agendaWidget}
          </div>
        )}

      </div>

      {drawerItem !== undefined && (
        <ItemModal
          item={drawerItem}
          onSave={handleAgendaSave}
          onClose={() => setDrawerItem(undefined)}
        />
      )}

    </div>
  );
}
