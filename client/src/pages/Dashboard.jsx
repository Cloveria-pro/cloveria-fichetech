import { useEffect, useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api.js';
import { ItemModal } from './Organisation.jsx';
import { foodCostRecetteHT, prixVenteHT, normaliserTexte, baseUnit, formatHeure } from '../utils.js';
import { getAnecdoteDuJour } from '../data/anecdotes.js';
import { useWindowWidth } from '../hooks/useWindowWidth.js';

// Fenêtre d'historique de la page Ingrédients, chargée seulement au premier clic (la page Ingrédients reste un chunk séparé).
const HistoriqueModal = lazy(() => import('./Ingredients.jsx').then(m => ({ default: m.HistoriqueModal })));

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
  // Ingrédient dont la fenêtre d'historique est ouverte (« Prix qui bougent »).
  const [histItem, setHistItem] = useState(null);
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

  // ── Prix qui bougent : 30 derniers jours, historique regroupé par nom normalisé (majuscules et accents ignorés) ──
  // Référence = prix en vigueur à J-30 (dernière entrée avant la fenêtre), sinon première entrée de la fenêtre.
  // « Nouveau » : pas de référence, unité de base différente ou prix de référence nul. 5 lignes au plus, les plus récentes d'abord.
  const prixQuiBougent = (() => {
    const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 30);
    const parNom = new Map();
    historique.forEach(h => {
      const date = new Date(h.date);
      const cle = normaliserTexte(h.nom);
      // Comme la fenêtre d'historique : les prix à 0 (ou absents) sont ignorés.
      if (isNaN(date) || !cle || !(h.prix > 0)) return;
      if (!parNom.has(cle)) parNom.set(cle, []);
      parNom.get(cle).push({ ...h, date });
    });
    const lignes = [];
    parNom.forEach((entrees, cle) => {
      entrees.sort((a, b) => a.date - b.date);
      const last = entrees[entrees.length - 1];
      if (last.date < cutoff) return;
      const avant = entrees.filter(e => e.date < cutoff);
      const dansFenetre = entrees.filter(e => e.date >= cutoff);
      const ref = avant.length > 0 ? avant[avant.length - 1] : dansFenetre.length >= 2 ? dansFenetre[0] : null;
      const nouveau = !ref || baseUnit(ref.unite) !== baseUnit(last.unite) || !(ref.prix > 0);
      if (!nouveau && last.prix === ref.prix) return;
      const nbFiches = recettes.filter(r => (r.ingredients || []).some(i => normaliserTexte(i.nom) === cle)).length;
      if (nbFiches === 0) return;
      lignes.push({
        nom: last.nom,
        unite: baseUnit(last.unite),
        prix: last.prix,
        ancienPrix: nouveau ? null : ref.prix,
        variation: nouveau ? null : (last.prix - ref.prix) / ref.prix * 100,
        nbFiches,
        date: last.date,
      });
    });
    return lignes.sort((a, b) => b.date - a.date).slice(0, 5);
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

  // Événement sur plusieurs jours (même règle qu'Organisation.jsx) : sa période va jusqu'à dateFin.
  const surPlusieursJours = it => it.type === 'evenement' && it.dateFin && it.dateFin > it.date;

  const agendaJ0J2 = (() => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const j2 = new Date(today); j2.setDate(j2.getDate() + 2);
    return agendaItems
      // Tous les types datés (notes comprises) ; un élément « fait » n'est plus à venir.
      .filter(it => it.date && it.statut !== 'fait')
      // Période de l'élément (début → fin) qui touche la fenêtre aujourd'hui → aujourd'hui + 2.
      .filter(it => {
        const debut = new Date(it.date); debut.setHours(0, 0, 0, 0);
        const fin = new Date(surPlusieursJours(it) ? it.dateFin : it.date); fin.setHours(0, 0, 0, 0);
        return debut <= j2 && fin >= today;
      })
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

  // Ligne de date d'un élément. Événement sur plusieurs jours déjà commencé : « Jusqu'au 14 nov. », sans heure
  // (elle désignerait le début) ; sinon affichage habituel, suivi de l'heure après « · ».
  const dateAgenda = it => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const debut = new Date(it.date); debut.setHours(0, 0, 0, 0);
    if (surPlusieursJours(it) && debut < today) {
      const fin = new Date(it.dateFin); fin.setHours(0, 0, 0, 0);
      return `Jusqu'au ${fin.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}`;
    }
    return formatAgendaDate(it.date) + (it.heure ? ` · ${formatHeure(it.heure)}` : '');
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

  // Chaque ligne est un bouton (clavier) qui ouvre la fenêtre d'historique de l'ingrédient.
  const prixWidget = (
    <div style={{ ...card, overflow: 'hidden' }}>
      <style>{'.dash-prix:hover { background: #FAFAF8; } .dash-prix:focus-visible { outline: 2px solid #2D6A4F; outline-offset: -2px; }'}</style>
      <div style={{ padding: '1.1rem 1.5rem', borderBottom: '1px solid #F3EFE8', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={metaStyle}>Prix qui bougent</div>
        <div style={metaStyle}>30 jours</div>
      </div>
      {prixQuiBougent.length === 0 ? (
        <div style={{ padding: '1.75rem 1.5rem', fontSize: '0.82rem', color: T.muted, textAlign: 'center', lineHeight: 1.6 }}>
          Aucun prix n'a changé ces 30 derniers jours.
        </div>
      ) : (
        <div>
          {prixQuiBougent.map((p, i) => {
            const hausse = p.variation !== null && p.variation > 0;
            const pastille = p.variation === null
              ? { texte: 'Nouveau', couleur: T.muted, fond: '#F3EFE8' }
              : hausse
                ? { texte: `▲ ${p.variation.toFixed(1)}%`, couleur: T.red, fond: 'rgba(220,38,38,0.08)' }
                : { texte: `▼ ${Math.abs(p.variation).toFixed(1)}%`, couleur: T.green, fond: 'rgba(45,106,79,0.08)' };
            return (
              <button key={p.nom} type="button" className="dash-prix" onClick={() => setHistItem({ nom: p.nom, unite: p.unite, prixUnitaire: p.prix })} style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%',
                padding: '0.8rem 1.5rem', background: 'none', border: 'none',
                borderBottom: i < prixQuiBougent.length - 1 ? '1px solid #F9F7F4' : 'none',
                cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {p.nom}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: T.muted, marginTop: '2px' }}>
                    {p.ancienPrix !== null ? `${p.ancienPrix.toFixed(2)} → ` : ''}{p.prix.toFixed(2)} € / {p.unite} · {p.nbFiches} fiche{p.nbFiches > 1 ? 's' : ''}
                  </div>
                </div>
                <span title={p.variation === null ? "Premier prix enregistré : pas encore d'ancien prix à comparer" : undefined} style={{
                  fontSize: '0.7rem', fontWeight: 700, color: pastille.couleur, background: pastille.fond,
                  borderRadius: '20px', padding: '2px 8px', flexShrink: 0, whiteSpace: 'nowrap',
                }}>
                  {pastille.texte}
                </span>
              </button>
            );
          })}
        </div>
      )}
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
                  {dateAgenda(it)}
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
              {prixWidget}
              {agendaWidget}
              {anecdoteWidget}
            </div>
          )}

        </div>

        {!uneColonne && (
          <div style={{ position: 'sticky', top: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {prixWidget}
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

      {histItem && (
        <Suspense fallback={null}>
          <HistoriqueModal item={histItem} onClose={() => setHistItem(null)} recettes={recettes} params={params} />
        </Suspense>
      )}

    </div>
  );
}
