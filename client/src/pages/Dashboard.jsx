import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { ItemModal } from './Organisation.jsx';
import { foodCostRecetteHT, prixVenteHT } from '../utils.js';
import { getAnecdoteDuJour } from '../data/anecdotes.js';
import { useWindowWidth } from '../hooks/useWindowWidth.js';

const T = { green: '#2D6A4F', orange: '#D97706', red: '#DC2626', text: '#1C2B1E', muted: '#6B7280' };
const card = { background: '#fff', borderRadius: '16px', boxShadow: '0 2px 16px rgba(0,0,0,0.07)' };

function fcColor(pct, cible) {
  if (pct < cible) return T.green;
  if (pct <= cible + 5) return T.orange;
  return T.red;
}
function fcLabel(pct, cible) {
  if (pct < cible) return 'Rentable';
  if (pct <= cible + 5) return 'Acceptable';
  return 'À retravailler';
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
  // Seul le chargement des fiches peut échouer ici (les autres appels ont leur propre catch).
  const [erreurChargement, setErreurChargement] = useState(false);
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
    }).catch(() => setErreurChargement(true))
      .finally(() => setLoading(false));
  }, []);

  const width = useWindowWidth();
  const isMobile = width < 768;
  // Tablette et téléphone : une seule colonne, l'agenda et l'anecdote passent sous la colonne principale.
  const uneColonne = width < 1024;

  if (loading) return <p style={{ color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>Chargement...</p>;

  const cible = params.foodCostCible || 30;

  const avecPrix = recettes.filter(r => (r.prixVentePratiqueTTC || 0) > 0);
  const withFC = avecPrix.map(r => ({ ...r, fc: foodCostRecetteHT(r, params.tva) })).filter(r => r.fc !== null);

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

  const fichesCritiques = withFCScope.filter(r => r.fc > cible);
  const withFCScopeSorted = [...withFCScope].sort((a, b) => a.fc - b.fc);
  const meilleureFiche = withFCScopeSorted.length > 0 ? withFCScopeSorted[0] : null;

  const prixVenteMoyenTTC = avecPrix.length > 0
    ? avecPrix.reduce((s, r) => s + (r.prixVentePratiqueTTC || 0), 0) / avecPrix.length
    : null;

  const sansPrixCount = recettes.filter(r => !(r.prixVentePratiqueTTC > 0)).length;

  const ecartCible = fcMoyen !== null ? +(fcMoyen - cible).toFixed(1) : null;

  // « Votre marge » : fiches du périmètre au-dessus de la cible, sur les fiches du périmètre avec un prix de vente.
  const nbDepassent = fichesCritiques.length;
  const phraseDepassement = nbDepassent === 0
    ? 'Toutes vos fiches sont sous votre cible'
    : `${nbDepassent} fiche${nbDepassent > 1 ? 's' : ''} sur ${withFCScope.length} ${nbDepassent > 1 ? 'dépassent' : 'dépasse'} votre cible`;
  const ecartAbs = ecartCible !== null ? Math.abs(ecartCible) : null;

  // ── À faire : fiches au-dessus de la cible (surcoût décroissant), puis fiches sans prix ; 3 lignes au plus ──
  const actionsJour = (() => {
    const actions = withFC
      .filter(r => r.fc > cible)
      .map(r => {
        const pvHT = prixVenteHT(r.prixVentePratiqueTTC, params.tva);
        const impactEuro = (r.fc - cible) / 100 * pvHT;
        return {
          nom: r.nom,
          detail: `Food cost ${r.fc.toFixed(1)}% pour une cible de ${cible}% · ${impactEuro.toFixed(2)} € HT de trop par couvert`,
          detailTitle: `Écart entre le coût matière réel HT par couvert (${(r.fc / 100 * pvHT).toFixed(2)} € HT) et le coût cible à ${cible}% du prix de vente HT (${(cible / 100 * pvHT).toFixed(2)} € HT)`,
          link: `/fiches-techniques/${r.id}`,
          dotColor: r.fc > cible + 5 ? T.red : T.orange,
          impactSort: impactEuro,
        };
      })
      .sort((a, b) => b.impactSort - a.impactSort);

    if (sansPrixCount > 0) {
      actions.push({
        nom: `${sansPrixCount} fiche${sansPrixCount > 1 ? 's' : ''} sans prix de vente`,
        detail: sansPrixCount > 1 ? 'Leur food cost ne peut pas être calculé.' : 'Son food cost ne peut pas être calculé.',
        link: '/fiches-techniques',
        dotColor: T.muted,
      });
    }

    return actions.slice(0, 3);
  })();

  const metaStyle = { fontSize: '0.65rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '3px' };
  const lienStyle = { fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none' };
  const survolLien = {
    onMouseEnter: e => { e.currentTarget.style.opacity = '0.65'; },
    onMouseLeave: e => { e.currentTarget.style.opacity = '1'; },
  };
  const repere = { flex: '1 1 140px', minWidth: 0 };
  const repereValeur = { fontSize: '1.25rem', fontWeight: 700, color: T.text, letterSpacing: '-0.01em', lineHeight: 1.2 };
  const repereUnite = { fontSize: '0.85rem', fontWeight: 400, color: T.muted };
  const repereSous = { marginTop: '0.3rem', fontSize: '0.75rem', color: T.muted };

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

  const anecdote = getAnecdoteDuJour();
  const anecdoteWidget = (
    <div style={{ ...card, padding: '0.85rem 1.25rem' }}>
      <div style={{ ...metaStyle, marginBottom: '0.45rem' }}>Anecdote du jour</div>
      <p style={{ fontSize: '0.78rem', color: T.muted, lineHeight: 1.6, fontStyle: 'italic', margin: 0 }}>
        {anecdote}
      </p>
    </div>
  );

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
        <div style={{ padding: '1.75rem 1.5rem', fontSize: '0.82rem', color: T.muted, textAlign: 'center', lineHeight: 1.6 }}>
          Rien de prévu<br />dans les 3 prochains jours
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

  // ── Carte « Votre marge » ──────────────────────────────────────────────────
  const carteMarge = (
    <div style={{ ...card, padding: isMobile ? '1.25rem 1.25rem' : '1.75rem 2.25rem', marginBottom: '1.5rem' }}>

      {/* En-tête : label + sélecteur de périmètre carte */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={metaStyle}>Votre marge</div>
        {cartes.length > 0 && (
          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
            {[{ id: null, nom: 'Toutes' }, ...cartes].map(c => {
              const isActive = selectedCarteId === (c.id ?? null);
              const label = c.id === null ? 'Toutes' : (c.nom.length > 14 ? c.nom.slice(0, 12) + '…' : c.nom);
              return (
                <button key={c.id ?? '__all'} title={c.nom} onClick={() => setSelectedCarteId(c.id ?? null)} style={{
                  fontSize: '0.68rem', fontWeight: 600, padding: '2px 9px', borderRadius: '20px',
                  border: `1px solid ${isActive ? T.green : 'transparent'}`,
                  cursor: 'pointer', transition: 'all 0.12s',
                  background: isActive ? T.green : '#F3EFE8',
                  color: isActive ? '#fff' : T.muted,
                }}>
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {fcMoyen === null ? (
        <>
          <div style={{ fontSize: '0.875rem', color: T.text, lineHeight: 1.6, marginBottom: '0.75rem', fontWeight: 500 }}>
            {selectedCarte
              ? `Aucune fiche avec prix dans "${selectedCarte.nom}".`
              : 'Ajoutez un prix de vente à vos fiches pour calculer leur food cost.'}
          </div>
          <Link to="/fiches-techniques" style={{ ...lienStyle, color: T.green }} {...survolLien}>
            Compléter les fiches →
          </Link>
        </>
      ) : (
        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', alignItems: isMobile ? 'flex-start' : 'center', gap: isMobile ? '1rem' : '2rem' }}>

          {/* Grand food cost moyen + badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0 }}>
            <div style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: '1.7rem', fontWeight: 700,
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

          {/* Trois lignes : dépassements, écart à la cible, lien */}
          <div style={{ minWidth: 0, ...(isMobile ? {} : { paddingLeft: '2rem', borderLeft: '1px solid #EDE8DF' }) }}>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: T.text, lineHeight: 1.4 }}>
              {phraseDepassement}
            </div>
            <div style={{ fontSize: '0.8rem', color: T.muted, marginTop: '0.3rem', lineHeight: 1.5 }}>
              Food cost moyen :&nbsp;
              {ecartCible === 0 ? (
                <span style={{ fontWeight: 700, color: T.green }}>pile sur votre cible</span>
              ) : (
                <>
                  <span style={{ fontWeight: 700, color: ecartCible > 0 ? T.red : T.green }}>
                    {ecartAbs} point{ecartAbs >= 2 ? 's' : ''}
                  </span>
                  {ecartCible > 0 ? ' au-dessus de' : ' sous'} votre cible
                </>
              )}
              {' '}de {cible}%
              {selectedCarte && <span>&nbsp;· {selectedCarte.nom}</span>}
            </div>
            {nbDepassent > 0 && (
              <Link to="/fiches-techniques" style={{ ...lienStyle, color: T.red, display: 'inline-block', marginTop: '0.6rem' }} {...survolLien}>
                Corriger les fiches →
              </Link>
            )}
          </div>

        </div>
      )}
    </div>
  );

  // ── Carte « À faire » (ignore le filtre de carte) ──────────────────────────
  const carteAFaire = (
    <div style={{
      ...card,
      borderLeft: `4px solid ${actionsJour.length > 0 ? T.red : T.green}`,
      borderRadius: '16px',
      marginBottom: '1.5rem',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: isMobile ? '1rem 1.25rem' : '1.1rem 1.75rem',
        borderBottom: '1px solid #F3EFE8',
        display: 'flex', alignItems: 'center', gap: '0.6rem',
      }}>
        <div style={metaStyle}>À faire</div>
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
        <div style={{ padding: isMobile ? '1rem 1.25rem' : '1.25rem 1.75rem', fontSize: '0.875rem', color: T.green, fontWeight: 600 }}>
          Tout est sous contrôle — aucune action urgente aujourd'hui
        </div>
      ) : (
        <div>
          {actionsJour.map((a, i) => (
            <div key={i} style={{
              display: 'grid',
              gridTemplateColumns: '1fr auto',
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
                  <div title={a.detailTitle} style={{ fontSize: '0.75rem', color: T.muted, marginTop: '2px', lineHeight: 1.45 }}>
                    {a.detail}
                  </div>
                </div>
              </div>
              <Link to={a.link} style={{
                fontSize: '0.82rem', fontWeight: 600, color: T.green,
                textDecoration: 'none', whiteSpace: 'nowrap',
              }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.65'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                Voir →
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Carte « Repères » : une ligne de trois éléments (passe à la ligne si la place manque) ──
  const carteReperes = (
    <div style={{ ...card, padding: isMobile ? '1.1rem 1.25rem' : '1.25rem 1.75rem' }}>
      <div style={metaStyle}>Repères</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem 2rem', marginTop: '0.6rem' }}>
        <div style={repere}>
          <div style={repereValeur}>
            {recettes.length}&nbsp;<span style={repereUnite}>fiche{recettes.length !== 1 ? 's' : ''}</span>
          </div>
          {sansPrixCount > 0 && (
            <div style={repereSous}>
              dont&nbsp;<span style={{ fontWeight: 600, color: T.orange }}>{sansPrixCount}</span>&nbsp;sans prix de vente
            </div>
          )}
        </div>
        {prixVenteMoyenTTC !== null && (
          <div style={repere}>
            <div style={repereValeur}>
              {prixVenteMoyenTTC.toFixed(2)}&nbsp;<span style={repereUnite}>EUR TTC</span>
            </div>
            <div style={repereSous}>prix de vente moyen</div>
          </div>
        )}
        {meilleureFiche && (
          <div style={repere}>
            <div title={meilleureFiche.nom} style={{ ...repereValeur, fontSize: '1rem', lineHeight: 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {meilleureFiche.nom}
            </div>
            <div style={repereSous}>la plus rentable, FC {meilleureFiche.fc.toFixed(1)}%</div>
          </div>
        )}
      </div>
    </div>
  );

  // ── Compte sans fiche : une seule carte d'accueil à la place des trois cartes ──
  const carteAccueil = (
    <div style={{ ...card, padding: isMobile ? '1.5rem 1.25rem' : '2rem 2.25rem' }}>
      <p style={{ fontSize: '0.95rem', color: T.text, lineHeight: 1.6, margin: '0 0 1.25rem' }}>
        Créez votre première fiche technique pour voir ici votre food cost et vos marges.
      </p>
      <Link to="/fiches-techniques/nouvelle" style={{
        display: 'inline-block', background: T.green, color: '#fff', textDecoration: 'none',
        padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600,
      }} {...survolLien}>
        + Nouvelle fiche
      </Link>
    </div>
  );

  const carteErreur = (
    <div style={{ ...card, padding: isMobile ? '1.25rem' : '1.5rem 2.25rem', fontSize: '0.9rem', fontWeight: 600, color: T.red }}>
      Impossible de charger vos données. Rechargez la page.
    </div>
  );

  return (
    <div style={{ maxWidth: '1040px', fontFamily: "'DM Sans', sans-serif" }}>
      <div style={{ display: 'grid', gridTemplateColumns: uneColonne ? 'minmax(0, 1fr)' : 'minmax(0, 1fr) 380px', gap: '1.5rem', alignItems: 'start' }}>
        <div style={{ minWidth: 0 }}>

          {erreurChargement ? carteErreur : recettes.length === 0 ? carteAccueil : (
            <>
              {carteMarge}
              {carteAFaire}
              {carteReperes}
            </>
          )}

          {uneColonne && (
            <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {agendaWidget}
              {anecdoteWidget}
            </div>
          )}

        </div>

        {!uneColonne && (
          <div style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {agendaWidget}
            {anecdoteWidget}
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
