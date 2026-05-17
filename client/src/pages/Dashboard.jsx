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
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const navigate = useNavigate();
  const width = useWindowWidth();

  async function charger() {
    const [data, p] = await Promise.all([
      api.recettes.list(),
      api.parametres.get().catch(() => ({ foodCostCible: 30, tva: 10 })),
    ]);
    setRecettes(data);
    setParams(p);
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