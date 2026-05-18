import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useWindowWidth } from '../hooks/useWindowWidth.js';
import { api } from '../api.js';
import { coutPortionHT, coutPortionTTC, foodCostPct } from '../utils.js';

const T = { green: '#2D6A4F', orange: '#D97706', red: '#DC2626', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280', bg: '#F8F6F1' };
const card = { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };

function foodCost(r) { return foodCostPct(r); }
function fcColor(pct) {
  if (pct < 30) return T.green;
  if (pct <= 35) return T.orange;
  return T.red;
}
function fcBg(pct) {
  if (pct < 30) return 'rgba(45,106,79,0.08)';
  if (pct <= 35) return 'rgba(217,119,6,0.08)';
  return 'rgba(220,38,38,0.08)';
}
function fcLabel(pct) {
  if (pct < 30) return 'Excellent';
  if (pct <= 35) return 'Acceptable';
  return 'A retravailler';
}
function relativeDate(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const d = Math.floor(diff / 86400000);
  if (d === 0) return "Aujourd'hui";
  if (d === 1) return 'Hier';
  if (d < 7) return `Il y a ${d} jours`;
  const w = Math.floor(d / 7);
  if (w < 5) return `Il y a ${w} semaine${w > 1 ? 's' : ''}`;
  const m = Math.floor(d / 30);
  if (m < 12) return `Il y a ${m} mois`;
  return `Il y a ${Math.floor(d / 365)} an${Math.floor(d / 365) > 1 ? 's' : ''}`;
}

function FcBar({ pct }) {
  const color = fcColor(pct);
  return (
    <div style={{ marginTop: '8px', background: '#F3EFE8', borderRadius: '99px', height: '6px', overflow: 'hidden' }}>
      <div style={{ width: Math.min(pct, 100) + '%', height: '100%', background: color, borderRadius: '99px', transition: 'width 0.6s ease' }} />
    </div>
  );
}

export default function Dashboard() {
  const [recettes, setRecettes] = useState([]);
  const [params, setParams] = useState({ foodCostCible: 30, tva: 10 });
  const [ingredients, setIngredients] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const width = useWindowWidth();

  async function charger() {
    const [data, p, ings, hist] = await Promise.all([
      api.recettes.list(),
      api.parametres.get().catch(() => ({ foodCostCible: 30, tva: 10 })),
      api.ingredients.list().catch(() => []),
      api.historiquePrix.list().catch(() => []),
    ]);
    setRecettes(data);
    setParams(p);
    setIngredients(ings);
    setHistorique(hist);
  }

  useEffect(() => {
    charger().finally(() => setLoading(false));
  }, []);

  async function actualiser() {
    setRefreshing(true);
    await charger().catch(() => {});
    setRefreshing(false);
  }

  if (loading) return <p style={{ color: T.muted }}>Chargement...</p>;

  const cible = params.foodCostCible || 30;
  const avecPrix = recettes.filter(r => (r.prixVentePratiqueTTC || 0) > 0);
  const foodCosts = avecPrix.map(r => ({ ...r, fc: foodCost(r), cp: coutPortionHT(r), cpTTC: coutPortionTTC(r) }));
  const fcMoyen = foodCosts.length > 0
    ? foodCosts.reduce((s, r) => s + r.fc, 0) / foodCosts.length
    : null;

  const sorted = [...foodCosts].sort((a, b) => a.fc - b.fc);
  const meilleures = sorted.slice(0, 2);
  const aretravailler = sorted.filter(r => r.fc >= cible).slice(-2).reverse();

  const recentes = [...recettes]
    .sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt))
    .slice(0, 5);

  const coutMatMoyen = foodCosts.length > 0
    ? foodCosts.reduce((s, r) => s + r.cp, 0) / foodCosts.length
    : 0;

  const today = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  const alertes = (() => {
    const now = new Date();
    const m1ago = new Date(now); m1ago.setMonth(m1ago.getMonth() - 1);
    const d30ago = new Date(now); d30ago.setDate(d30ago.getDate() - 30);
    const histByNom = {};
    historique.forEach(h => { if (!histByNom[h.nom]) histByNom[h.nom] = []; histByNom[h.nom].push(h); });
    const prixHausses = [];
    Object.entries(histByNom).forEach(([nom, entries]) => {
      const sorted = [...entries].sort((a, b) => new Date(a.date) - new Date(b.date));
      const last = sorted[sorted.length - 1];
      const ref = sorted.find(e => new Date(e.date) >= m1ago);
      if (ref && last && ref !== last) {
        const pct = (last.prix - ref.prix) / ref.prix * 100;
        if (pct > 5) prixHausses.push({ nom, pct, from: ref.prix, to: last.prix, unite: last.unite });
      }
    });
    const lastHistDate = {};
    historique.forEach(h => { if (!lastHistDate[h.nom] || h.date > lastHistDate[h.nom]) lastHistDate[h.nom] = h.date; });
    const staleIngs = ingredients.filter(ing => {
      if (ing.prixUnitaire === 0) return false;
      const last = lastHistDate[ing.nom];
      return !last || new Date(last) < d30ago;
    }).slice(0, 6);
    const fcCritiques = foodCosts.filter(r => r.fc > cible + 5);
    return { prixHausses, staleIngs, fcCritiques };
  })();
  const nbAlertes = alertes.prixHausses.length + alertes.staleIngs.length + alertes.fcCritiques.length;

  return (
    <div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: T.text }}>
            Tableau de bord
          </h1>
          <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '2px', textTransform: 'capitalize' }}>{today}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <button
            onClick={actualiser}
            disabled={refreshing}
            style={{ padding: '0.45rem 1rem', border: '1px solid #E5E0D8', borderRadius: '8px', background: '#fff', color: T.muted, cursor: 'pointer', fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '5px' }}
            onMouseEnter={e => e.currentTarget.style.borderColor = T.green}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#E5E0D8'}
          >
            <span style={{ display: 'inline-block', animation: refreshing ? 'spin 0.7s linear infinite' : 'none' }}>↺</span>
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </button>
          <Link to="/fiches-techniques" style={{ color: T.green, fontSize: '0.875rem', textDecoration: 'none', fontWeight: 600 }}>
            Voir toutes les fiches →
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: width < 640 ? '1fr' : width < 1024 ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Food cost moyen */}
        <div style={{ ...card, padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.5rem' }}>
            Food Cost moyen
          </div>
          {fcMoyen !== null ? (
            <>
              <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: fcColor(fcMoyen), lineHeight: 1 }}>
                {fcMoyen.toFixed(1)}%
              </div>
              <div style={{ marginTop: '6px', display: 'inline-flex', alignItems: 'center', gap: '5px', background: fcBg(fcMoyen), padding: '3px 8px', borderRadius: '99px' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: fcColor(fcMoyen), display: 'inline-block' }} />
                <span style={{ fontSize: '0.72rem', fontWeight: 600, color: fcColor(fcMoyen) }}>{fcLabel(fcMoyen)}</span>
              </div>
              <FcBar pct={fcMoyen} />
              <div style={{ marginTop: '6px', fontSize: '0.72rem', color: '#B8B0A4', display: 'flex', justifyContent: 'space-between' }}>
                <span>0%</span><span style={{ color: T.green }}>30%</span><span style={{ color: T.red }}>35%</span><span>50%</span>
              </div>
            </>
          ) : <span style={{ color: T.muted, fontSize: '0.85rem' }}>Aucune donnee</span>}
        </div>

        {/* Nombre de fiches */}
        <div
          onClick={() => navigate('/fiches-techniques')}
          style={{ ...card, padding: '1.25rem 1.5rem', cursor: 'pointer', transition: 'box-shadow 0.15s' }}
          onMouseEnter={e => e.currentTarget.style.boxShadow = '0 8px 24px rgba(45,106,79,0.12)'}
          onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'}
        >
          <div style={{ fontSize: '0.72rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.5rem' }}>
            Fiches techniques
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: T.text, lineHeight: 1 }}>
            {recettes.length}
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: T.green, fontWeight: 600 }}>
            Voir toutes →
          </div>
        </div>

        {/* Coût matière moyen */}
        <div style={{ ...card, padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.5rem' }}>
            Cout mat. moyen
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: T.text, lineHeight: 1 }}>
            {coutMatMoyen.toFixed(2)}<span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', fontWeight: 400, color: T.muted, marginLeft: '4px' }}>EUR</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: T.muted }}>
            par portion
          </div>
        </div>

        {/* Prix de vente moyen suggere */}
        <div style={{ ...card, padding: '1.25rem 1.5rem' }}>
          <div style={{ fontSize: '0.72rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, marginBottom: '0.5rem' }}>
            Prix vente moyen
          </div>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: T.text, lineHeight: 1 }}>
            {avecPrix.length > 0
              ? (avecPrix.reduce((s, r) => s + (r.prixVentePratiqueTTC || 0), 0) / avecPrix.length).toFixed(2)
              : '—'}
            <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '1rem', fontWeight: 400, color: T.muted, marginLeft: '4px' }}>EUR</span>
          </div>
          <div style={{ marginTop: '8px', fontSize: '0.8rem', color: T.muted }}>
            pratiqué TTC ({avecPrix.length} fiches)
          </div>
        </div>
      </div>

      {/* Analyse food cost */}
      <div style={{ display: 'grid', gridTemplateColumns: width < 640 ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1.5rem' }}>

        {/* Meilleures marges */}
        <div style={{ ...card, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.green }} />
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: T.text }}>
              Fiches les plus rentables
            </h3>
          </div>
          {meilleures.map(r => (
            <div
              key={r.id}
              onClick={() => navigate('/fiches-techniques/' + r.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '8px', background: 'rgba(45,106,79,0.05)', marginBottom: '0.5rem', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(45,106,79,0.1)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(45,106,79,0.05)'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, color: T.text, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nom}</div>
                <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: '2px' }}>
                  {r.cpTTC.toFixed(2)} EUR/couvert TTC · vente {r.prixVentePratiqueTTC.toFixed(2)} EUR TTC
                </div>
                <FcBar pct={r.fc} />
              </div>
              <div style={{ marginLeft: '1rem', textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.2rem', color: T.green }}>{r.fc.toFixed(1)}%</div>
                <div style={{ fontSize: '0.68rem', color: T.green, fontWeight: 600 }}>Excellent</div>
              </div>
            </div>
          ))}
        </div>

        {/* A retravailler */}
        <div style={{ ...card, padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.red }} />
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: T.text }}>
              Fiches a retravailler
            </h3>
          </div>
          {aretravailler.map(r => (
            <div
              key={r.id}
              onClick={() => navigate('/fiches-techniques/' + r.id)}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem', borderRadius: '8px', background: 'rgba(220,38,38,0.04)', marginBottom: '0.5rem', cursor: 'pointer', transition: 'background 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(220,38,38,0.08)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(220,38,38,0.04)'}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, color: T.text, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nom}</div>
                <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: '2px' }}>
                  Suggere : {(r.cpTTC / (cible / 100)).toFixed(2)} EUR TTC · Actuel : {r.prixVentePratiqueTTC.toFixed(2)} EUR TTC
                </div>
                <FcBar pct={r.fc} />
              </div>
              <div style={{ marginLeft: '1rem', textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1.2rem', color: fcColor(r.fc) }}>{r.fc.toFixed(1)}%</div>
                <div style={{ fontSize: '0.68rem', color: fcColor(r.fc), fontWeight: 600 }}>{fcLabel(r.fc)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Alertes prix */}
      {nbAlertes > 0 && (
        <div style={{ ...card, padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '3px solid #D97706' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem' }}>
            <span style={{ fontSize: '1rem' }}>⚠️</span>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: T.text }}>Alertes prix</h3>
            <span style={{ background: '#FEF9EC', color: '#92400E', fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: '99px', border: '1px solid #F6E8B8' }}>{nbAlertes}</span>
          </div>
          {alertes.prixHausses.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Hausses &gt;5% (30 derniers jours)</div>
              {alertes.prixHausses.map(h => (
                <div key={h.nom} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.75rem', background: '#FEF9EC', borderRadius: '6px', marginBottom: '4px', border: '1px solid #F6E8B8' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: T.text }}>{h.nom}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#DC2626' }}>▲ {h.pct.toFixed(1)}% ({h.from.toFixed(2)} → {h.to.toFixed(2)} EUR/{h.unite})</span>
                </div>
              ))}
            </div>
          )}
          {alertes.fcCritiques.length > 0 && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.72rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Food cost critique (&gt;{cible + 5}%)</div>
              {alertes.fcCritiques.map(r => (
                <div key={r.id} onClick={() => navigate('/fiches-techniques/' + r.id)}
                  style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0.75rem', background: '#FEE2E2', borderRadius: '6px', marginBottom: '4px', cursor: 'pointer', border: '1px solid #FECACA' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: T.text }}>{r.nom}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#DC2626' }}>{r.fc.toFixed(1)}%</span>
                </div>
              ))}
            </div>
          )}
          {alertes.staleIngs.length > 0 && (
            <div>
              <div style={{ fontSize: '0.72rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Prix non mis à jour depuis 30+ jours</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {alertes.staleIngs.map(ing => (
                  <span key={ing.id} onClick={() => navigate('/ingredients')} style={{ fontSize: '0.78rem', padding: '3px 8px', background: '#F1F5F9', borderRadius: '4px', color: T.muted, border: '1px solid #E5E0D8', cursor: 'pointer' }}>
                    {ing.nom}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Recentes */}
      <div style={{ ...card, padding: '1.5rem' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: T.text, marginBottom: '1.25rem' }}>
          Derniers mouvements
        </h3>
        <div>
          {recentes.map((r, idx) => {
            const fc = foodCost(r);
            const cp = coutPortionHT(r);
            return (
              <div
                key={r.id}
                onClick={() => navigate('/fiches-techniques/' + r.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '1rem',
                  padding: '0.75rem 0', cursor: 'pointer',
                  borderBottom: idx < recentes.length - 1 ? '1px solid #F3EFE8' : 'none',
                  transition: 'opacity 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.opacity = '0.7'}
                onMouseLeave={e => e.currentTarget.style.opacity = '1'}
              >
                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: fc !== null ? fcBg(fc) : '#F3EFE8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 700, color: fc !== null ? fcColor(fc) : T.muted }}>
                    {r.categorie ? r.categorie.slice(0, 2).toUpperCase() : '--'}
                  </span>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, color: T.text, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.nom}</div>
                  <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: '1px' }}>
                    {r.categorie} · {r.portions} portions · {cp.toFixed(2)} EUR/portion
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  {fc !== null && (
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: fcColor(fc) }}>{fc.toFixed(1)}%</div>
                  )}
                  <div style={{ fontSize: '0.72rem', color: '#B8B0A4' }}>{relativeDate(r.updatedAt || r.createdAt)}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}