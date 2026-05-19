import { useState, useRef, useEffect, useMemo } from 'react';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../api.js';
import { coutPortionHT } from '../utils.js';

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280' };

const QUADRANTS = {
  etoile:     { label: 'Étoiles',       icon: '⭐', desc: 'Populaire · Rentable',        color: '#2D6A4F', bg: '#F0FDF4', border: '#86EFAC' },
  vache:      { label: 'Vaches à lait', icon: '🐄', desc: 'Populaire · Peu rentable',     color: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
  enigme:     { label: 'Énigmes',       icon: '🔍', desc: 'Peu populaire · Rentable',     color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  poids_mort: { label: 'Poids morts',   icon: '💀', desc: 'Peu populaire · Peu rentable', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
};

const RECOMMANDATIONS = {
  etoile:     'Maintenez et valorisez',
  vache:      'Retravaillez le coût ou le prix',
  enigme:     'Améliorez la mise en avant',
  poids_mort: 'À retirer ou reformuler',
};

const COLUMN_TYPES = [
  { value: 'nom_plat',      label: 'Nom du plat' },
  { value: 'quantite',      label: 'Quantité vendue' },
  { value: 'prix_unitaire', label: 'Prix unitaire TTC' },
  { value: 'date',          label: 'Date' },
  { value: 'service',       label: 'Service (midi/soir)' },
  { value: 'inconnu',       label: 'Ignorer cette colonne' },
];

function normalize(s) {
  return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();
}

function findBestMatch(nomPOS, recettes) {
  const n = normalize(nomPOS);
  const exact = recettes.find(r => normalize(r.nom) === n);
  if (exact) return { recette: exact, score: 1 };
  const starts = recettes.find(r => normalize(r.nom).startsWith(n) || n.startsWith(normalize(r.nom)));
  if (starts) return { recette: starts, score: 0.8 };
  const contains = recettes.find(r => normalize(r.nom).includes(n) || n.includes(normalize(r.nom)));
  if (contains) return { recette: contains, score: 0.6 };
  return null;
}

function computeQuadrant(rows) {
  const categories = [...new Set(rows.map(r => r.categorieMenu))];
  categories.forEach(cat => {
    const catRows = rows.filter(r => r.categorieMenu === cat);
    const avgQty = catRows.reduce((s, r) => s + r.quantite, 0) / catRows.length;
    const avgMarge = catRows.reduce((s, r) => s + r.margeUnitaire, 0) / catRows.length;
    catRows.forEach(row => {
      const populaire = row.quantite >= avgQty * 0.7;
      const rentable = row.margeUnitaire >= avgMarge;
      if (populaire && rentable)  row.quadrant = 'etoile';
      else if (populaire)         row.quadrant = 'vache';
      else if (rentable)          row.quadrant = 'enigme';
      else                        row.quadrant = 'poids_mort';
    });
  });
  return rows;
}

const card = { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };
const inputSm = { padding: '0.35rem 0.6rem', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", color: T.text, background: '#fff', outline: 'none' };

export default function MenuEngineering() {
  const [tab, setTab] = useState('import');
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [colonnes, setColonnes] = useState([]);
  const [matchings, setMatchings] = useState([]);
  const [recettes, setRecettes] = useState([]);
  const [resultats, setResultats] = useState([]);
  const [historique, setHistorique] = useState([]);
  const [histLoading, setHistLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.recettes.list().then(setRecettes).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'historique') {
      setHistLoading(true);
      api.ventes.list().then(setHistorique).catch(() => {}).finally(() => setHistLoading(false));
    }
  }, [tab]);

  function handleFile(f) {
    if (!f) return;
    const ok = f.name.match(/\.(csv|xlsx|xls|pdf|jpg|jpeg|png|webp)$/i);
    if (!ok) return alert('Format non supporté. Utilisez CSV, Excel, PDF ou image (JPG, PNG).');
    setFile(f);
    setColonnes([]);
  }

  async function analyser() {
    if (!file || loading) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('ventes', file);
      const result = await api.ia.analyserVentes(formData);
      const colonnesResult = result.colonnes || [];
      const lignesResult = result.lignes || [];
      setColonnes(colonnesResult);
      const m = lignesResult.map(l => {
        const match = findBestMatch(l.nomPOS, recettes);
        const prixVenteIA = l.prixVente > 0 ? l.prixVente : null;
        const prixVente = prixVenteIA ?? (match?.recette.prixVentePratiqueTTC > 0 ? match.recette.prixVentePratiqueTTC : null);
        return {
          nomPOS: l.nomPOS,
          quantite: l.quantite || 1,
          prixVenteIA,
          prixVente,
          date: l.date || null,
          service: l.service || null,
          recetteId: match?.recette.id || null,
          matchScore: match?.score || 0,
          ignore: false,
        };
      });
      setMatchings(m);
    } catch (err) {
      alert('Erreur lors de l\'analyse : ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function validerEtCalculer() {
    const actifs = matchings.filter(m => !m.ignore && m.recetteId);
    if (actifs.length === 0) return alert('Associez au moins un plat à une fiche technique pour calculer.');

    // Aggregate by recetteId
    const byRecette = {};
    actifs.forEach(m => {
      if (!byRecette[m.recetteId]) {
        byRecette[m.recetteId] = { ...m, quantite: 0, dates: [], services: [] };
      }
      byRecette[m.recetteId].quantite += m.quantite;
      if (m.date) byRecette[m.recetteId].dates.push(m.date);
      if (m.service) byRecette[m.recetteId].services.push(m.service);
    });

    const rows = Object.values(byRecette).map(m => {
      const rec = recettes.find(r => r.id === m.recetteId);
      const coutMat = rec ? coutPortionHT(rec) : 0;
      const pv = m.prixVente || rec?.prixVentePratiqueTTC || 0;
      const services = [...new Set(m.services)];
      return {
        nomPOS: m.nomPOS,
        nomFiche: rec?.nom || m.nomPOS,
        categorieMenu: rec?.categorie || 'Autre',
        quantite: m.quantite,
        prixVente: pv,
        coutMat,
        margeUnitaire: pv - coutMat,
        margeTotal: (pv - coutMat) * m.quantite,
        recetteId: m.recetteId,
        dates: m.dates,
        services,
        quadrant: null,
      };
    });

    const withQuadrant = computeQuadrant(rows);
    setResultats(withQuadrant);

    // Save to historique
    const periode = (() => {
      const allDates = actifs.filter(m => m.date).map(m => m.date).sort();
      if (allDates.length === 0) return 'Import du ' + new Date().toLocaleDateString('fr-FR');
      if (allDates.length === 1) return allDates[0];
      return `${allDates[0]} → ${allDates[allDates.length - 1]}`;
    })();
    api.ventes.create({ periode, lignes: withQuadrant }).catch(() => {});

    setStep(3);
  }

  function rechargerImport(lignes) {
    setResultats(lignes);
    setStep(3);
    setTab('import');
  }

  const STEPS = [
    { n: 1, label: 'Import & analyse IA' },
    { n: 2, label: 'Matching plats' },
    { n: 3, label: 'Résultats' },
  ];

  return (
    <div style={{ maxWidth: '960px', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes spin-me { to { transform: rotate(360deg); } }`}</style>

      {/* Header */}
      <div style={{ marginBottom: '1.75rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: T.text }}>
          Menu Engineering
        </h1>
        <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '4px' }}>
          Identifiez vos étoiles, vos vaches à lait, vos énigmes et vos poids morts pour piloter votre carte.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '4px', marginBottom: '1.75rem', background: '#fff', border: '1px solid #E8E2D9', borderRadius: '10px', padding: '4px', width: 'fit-content' }}>
        {[{ key: 'import', label: 'Nouvel import' }, { key: 'historique', label: 'Historique' }].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding: '0.45rem 1.25rem', borderRadius: '7px', border: 'none', cursor: 'pointer',
            background: tab === t.key ? T.green : 'transparent',
            color: tab === t.key ? '#fff' : T.muted,
            fontSize: '0.85rem', fontWeight: tab === t.key ? 700 : 400,
            fontFamily: "'DM Sans', sans-serif", transition: 'all 0.15s',
          }}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── TAB HISTORIQUE ── */}
      {tab === 'historique' && (
        <HistoriqueTab
          historique={historique}
          loading={histLoading}
          onRecharger={rechargerImport}
        />
      )}

      {/* ── TAB IMPORT ── */}
      {tab === 'import' && (
        <>
          {/* Stepper */}
          <div style={{ display: 'flex', marginBottom: '2.5rem', background: '#fff', borderRadius: '10px', border: '1px solid #E8E2D9', overflow: 'hidden' }}>
            {STEPS.map(({ n, label }, i) => (
              <div key={n} style={{
                flex: 1, padding: '0.875rem 1rem', textAlign: 'center',
                background: step === n ? T.green : step > n ? 'rgba(45,106,79,0.06)' : '#fff',
                borderRight: i < 2 ? '1px solid #E8E2D9' : 'none',
              }}>
                <div style={{ fontSize: '0.62rem', fontWeight: 700, color: step === n ? 'rgba(255,255,255,0.75)' : step > n ? T.green : T.muted, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  Étape {n}
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: step === n ? '#fff' : step > n ? T.green : T.text, marginTop: '2px' }}>
                  {step > n ? '✓ ' : ''}{label}
                </div>
              </div>
            ))}
          </div>

          {/* ── ÉTAPE 1 : Import ── */}
          {step === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                onClick={() => !loading && fileInputRef.current?.click()}
                style={{
                  ...card,
                  padding: '3rem 2rem', textAlign: 'center',
                  cursor: loading ? 'default' : 'pointer',
                  border: `2px dashed ${dragOver ? T.green : file && colonnes.length === 0 ? T.gold : colonnes.length > 0 ? T.green : '#C9A84C'}`,
                  background: dragOver ? 'rgba(45,106,79,0.04)' : '#FAFAF8',
                  transition: 'all 0.15s',
                }}
              >
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])} />
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>{colonnes.length > 0 ? '✅' : '📊'}</div>
                {file ? (
                  <>
                    <div style={{ fontWeight: 700, color: colonnes.length > 0 ? T.green : T.text, fontSize: '0.95rem' }}>{file.name}</div>
                    <div style={{ color: T.muted, fontSize: '0.78rem', marginTop: '4px' }}>
                      {(file.size / 1024).toFixed(1)} Ko
                      {colonnes.length === 0 && ' · Cliquer pour changer'}
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, color: T.text, fontSize: '0.95rem' }}>Déposez votre export de ventes ici</div>
                    <div style={{ color: T.muted, fontSize: '0.82rem', marginTop: '6px' }}>CSV, Excel, PDF, JPG, PNG · Max 10 Mo</div>
                    <div style={{ color: T.gold, fontSize: '0.78rem', marginTop: '4px', fontWeight: 600 }}>ou cliquez pour parcourir</div>
                  </>
                )}
              </div>

              <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '0.875rem 1.25rem', fontSize: '0.8rem', color: '#78350F', lineHeight: 1.55 }}>
                <strong>Formats acceptés :</strong> export CSV ou Excel depuis votre caisse (Lightspeed, Zelty, Cashpad, L'Addition, Trivec…), ou PDF / image de rapport de ventes. Le fichier doit contenir au minimum les noms des plats et les quantités vendues.
              </div>

              {colonnes.length > 0 && (
                <div style={{ ...card, padding: '1.25rem' }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 700, color: T.text, marginBottom: '0.875rem' }}>
                    Colonnes détectées — vérifiez l'interprétation
                  </h3>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.625rem' }}>
                    {colonnes.map((col, i) => (
                      <div key={i} style={{
                        display: 'flex', alignItems: 'center', gap: '6px',
                        background: col.incertain ? 'rgba(217,119,6,0.06)' : 'rgba(45,106,79,0.06)',
                        border: `1px solid ${col.incertain ? 'rgba(217,119,6,0.25)' : 'rgba(45,106,79,0.2)'}`,
                        borderRadius: '7px', padding: '7px 10px',
                      }}>
                        <span style={{ fontSize: '0.8rem', fontWeight: 600, color: T.text }}>{col.nom}</span>
                        <span style={{ fontSize: '0.7rem', color: T.muted }}>→</span>
                        <select
                          value={col.type}
                          onChange={e => setColonnes(prev => prev.map((c, j) => j === i ? { ...c, type: e.target.value, incertain: false } : c))}
                          style={{ ...inputSm }}
                        >
                          {COLUMN_TYPES.map(ct => <option key={ct.value} value={ct.value}>{ct.label}</option>)}
                        </select>
                        {col.incertain && (
                          <span style={{ fontSize: '0.68rem', color: '#D97706', fontWeight: 700, background: 'rgba(217,119,6,0.1)', padding: '1px 5px', borderRadius: '3px' }}>⚠</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <p style={{ fontSize: '0.78rem', color: T.muted, marginTop: '0.875rem', marginBottom: 0 }}>
                    {matchings.length} ligne{matchings.length !== 1 ? 's' : ''} de vente détectée{matchings.length !== 1 ? 's' : ''}.
                    Corrigez les colonnes incertaines si nécessaire, puis continuez.
                  </p>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                {colonnes.length > 0 && (
                  <button
                    onClick={() => setStep(2)}
                    style={{ padding: '0.65rem 1.75rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
                    onMouseLeave={e => e.currentTarget.style.background = T.green}
                  >
                    Continuer → Matching
                  </button>
                )}
                {colonnes.length === 0 && (
                  <button
                    onClick={analyser}
                    disabled={!file || loading}
                    style={{
                      padding: '0.65rem 2rem', background: file && !loading ? T.green : '#C5BDB0',
                      color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700,
                      fontSize: '0.875rem', cursor: file && !loading ? 'pointer' : 'default',
                      fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', gap: '8px',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => { if (file && !loading) e.currentTarget.style.background = '#1e4d38'; }}
                    onMouseLeave={e => { if (file && !loading) e.currentTarget.style.background = T.green; }}
                  >
                    {loading ? (
                      <>
                        <span style={{ width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.35)', borderTopColor: '#fff', borderRadius: '50%', display: 'inline-block', animation: 'spin-me 0.7s linear infinite' }} />
                        L'IA analyse vos ventes...
                      </>
                    ) : '✨ Analyser avec l\'IA'}
                  </button>
                )}
              </div>
            </div>
          )}

          {/* ── ÉTAPE 2 : Matching ── */}
          {step === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {recettes.length === 0 && (
                <div style={{ background: 'rgba(220,38,38,0.06)', border: '1px solid rgba(220,38,38,0.2)', borderRadius: '10px', padding: '1rem 1.25rem', fontSize: '0.85rem', color: '#991B1B' }}>
                  Aucune fiche technique trouvée. Créez des fiches techniques avant d'utiliser le Menu Engineering.
                </div>
              )}

              <div style={{ ...card, padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '1rem' }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 700, color: T.text, margin: 0 }}>
                    Association POS → Fiches techniques
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: T.muted }}>
                    {matchings.filter(m => !m.ignore && m.recetteId).length} / {matchings.filter(m => !m.ignore).length} associé{matchings.filter(m => !m.ignore && m.recetteId).length !== 1 ? 's' : ''}
                  </span>
                </div>

                {matchings.length === 0 && (
                  <p style={{ color: T.muted, fontSize: '0.85rem' }}>Aucune ligne détectée.</p>
                )}

                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {matchings.map((m, i) => (
                    <div key={i} style={{
                      display: 'grid', gridTemplateColumns: '1.8fr auto 1.8fr auto', gap: '0.75rem', alignItems: 'center',
                      padding: '0.65rem 0.875rem', borderRadius: '8px',
                      background: m.ignore ? '#F5F3F0' : '#FAFAF8',
                      border: `1px solid ${m.ignore ? '#EBE7E0' : '#F3EFE8'}`,
                      opacity: m.ignore ? 0.55 : 1,
                      transition: 'opacity 0.15s',
                    }}>
                      {/* Nom POS */}
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nomPOS}</div>
                        <div style={{ display: 'flex', gap: '0.625rem', marginTop: '6px' }}>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Qté vendue</span>
                            <input
                              type="number" min="0" step="1"
                              value={m.quantite}
                              disabled={m.ignore}
                              onChange={e => setMatchings(prev => prev.map((x, j) => j === i ? { ...x, quantite: Math.max(0, parseInt(e.target.value) || 0) } : x))}
                              style={{ ...inputSm, width: '70px', textAlign: 'right' }}
                            />
                          </label>
                          <label style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '0.62rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                              Prix TTC {m.prixVenteIA ? '(IA)' : m.recetteId ? '(fiche)' : ''}
                            </span>
                            <input
                              type="number" min="0" step="0.01"
                              value={m.prixVente ?? ''}
                              placeholder="—"
                              disabled={m.ignore}
                              onChange={e => setMatchings(prev => prev.map((x, j) => j === i ? { ...x, prixVente: e.target.value === '' ? null : parseFloat(e.target.value) || null } : x))}
                              style={{ ...inputSm, width: '80px', textAlign: 'right' }}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Match badge */}
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        {m.recetteId && m.matchScore >= 0.8 && !m.ignore ? (
                          <span style={{ fontSize: '0.65rem', fontWeight: 700, color: '#16a34a', background: '#F0FDF4', border: '1px solid #86EFAC', padding: '2px 7px', borderRadius: '99px', whiteSpace: 'nowrap' }}>✓ Match</span>
                        ) : (
                          <span style={{ fontSize: '0.65rem', color: T.muted, padding: '2px 7px', whiteSpace: 'nowrap' }}>→</span>
                        )}
                      </div>

                      {/* Fiche select */}
                      <select
                        value={m.recetteId || ''}
                        onChange={e => setMatchings(prev => prev.map((x, j) => {
                          if (j !== i) return x;
                          const newId = e.target.value || null;
                          const rec = recettes.find(r => r.id === newId);
                          const prixVente = x.prixVenteIA ?? (rec?.prixVentePratiqueTTC > 0 ? rec.prixVentePratiqueTTC : null);
                          return { ...x, recetteId: newId, prixVente };
                        }))}
                        disabled={m.ignore}
                        style={{ ...inputSm, width: '100%' }}
                      >
                        <option value="">— Sélectionner une fiche —</option>
                        {recettes.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                      </select>

                      {/* Ignore button */}
                      <button
                        onClick={() => setMatchings(prev => prev.map((x, j) => j === i ? { ...x, ignore: !x.ignore } : x))}
                        style={{
                          padding: '0.3rem 0.75rem', background: 'none',
                          border: `1px solid ${m.ignore ? 'rgba(45,106,79,0.3)' : '#E5E0D8'}`,
                          borderRadius: '6px', cursor: 'pointer', fontSize: '0.75rem',
                          color: m.ignore ? T.green : T.muted,
                          fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
                          fontWeight: m.ignore ? 600 : 400,
                        }}
                      >
                        {m.ignore ? '↺ Réactiver' : 'Ignorer'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button onClick={() => setStep(1)} style={{ padding: '0.6rem 1.25rem', background: 'none', border: '1px solid #E5E0D8', borderRadius: '8px', cursor: 'pointer', color: T.muted, fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem' }}>
                  ← Retour
                </button>
                <button
                  onClick={validerEtCalculer}
                  style={{ padding: '0.6rem 2rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
                  onMouseLeave={e => e.currentTarget.style.background = T.green}
                >
                  Valider et calculer →
                </button>
              </div>
            </div>
          )}

          {/* ── ÉTAPE 3 : Résultats ── */}
          {step === 3 && (
            <ResultatsView resultats={resultats} onBack={() => setStep(2)} />
          )}
        </>
      )}
    </div>
  );
}

/* ── Historique Tab ── */
function HistoriqueTab({ historique, loading, onRecharger }) {
  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: T.muted }}>
        <span style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #E5E0D8', borderTopColor: T.green, borderRadius: '50%', animation: 'spin-me 0.7s linear infinite' }} />
        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>Chargement…</div>
      </div>
    );
  }

  if (historique.length === 0) {
    return (
      <div style={{ ...card, padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
        <div style={{ fontWeight: 700, color: T.text, fontSize: '0.95rem' }}>Aucun import enregistré</div>
        <div style={{ color: T.muted, fontSize: '0.82rem', marginTop: '6px' }}>Vos analyses apparaîtront ici après le premier import.</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {historique.map((h, i) => {
        const lignes = h.lignes || [];
        const totalVentes = lignes.reduce((s, r) => s + (r.quantite || 0), 0);
        const totalMarge = lignes.reduce((s, r) => s + (r.margeTotal || 0), 0);
        const etoiles = lignes.filter(r => r.quadrant === 'etoile').length;
        const date = h.createdAt ? new Date(h.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
        return (
          <div key={i} style={{ ...card, padding: '1rem 1.25rem', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: '0.9rem', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {h.periode || 'Import sans titre'}
              </div>
              <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: '2px' }}>
                {date} · {lignes.length} plat{lignes.length !== 1 ? 's' : ''} · {totalVentes} portion{totalVentes !== 1 ? 's' : ''} · {etoiles} étoile{etoiles !== 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.68rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Marge brute</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: totalMarge >= 0 ? T.green : '#DC2626' }}>
                  {totalMarge >= 0 ? '+' : ''}{totalMarge.toFixed(2)} €
                </div>
              </div>
              <button
                onClick={() => onRecharger(lignes)}
                style={{ padding: '0.45rem 1rem', background: T.green, color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
                onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
                onMouseLeave={e => e.currentTarget.style.background = T.green}
              >
                Revoir →
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Résultats View ── */
function ResultatsView({ resultats, onBack }) {
  const [filterService, setFilterService] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [filterPeriode, setFilterPeriode] = useState('');

  const services = useMemo(() => {
    const s = new Set();
    resultats.forEach(r => (r.services || []).forEach(sv => s.add(sv)));
    return [...s].sort();
  }, [resultats]);

  const categories = useMemo(() => [...new Set(resultats.map(r => r.categorieMenu))].sort(), [resultats]);

  const periodes = useMemo(() => {
    const s = new Set();
    resultats.forEach(r => (r.dates || []).forEach(d => s.add(d)));
    return [...s].sort();
  }, [resultats]);

  const filtered = useMemo(() => {
    let rows = resultats.map(r => ({ ...r }));
    if (filterService) rows = rows.filter(r => (r.services || []).includes(filterService));
    if (filterCategorie) rows = rows.filter(r => r.categorieMenu === filterCategorie);
    if (filterPeriode) rows = rows.filter(r => (r.dates || []).includes(filterPeriode));
    return computeQuadrant(rows);
  }, [resultats, filterService, filterCategorie, filterPeriode]);

  const totalVentes = filtered.reduce((s, r) => s + r.quantite, 0);
  const totalMarge = filtered.reduce((s, r) => s + r.margeTotal, 0);

  const top10Bar = useMemo(() => (
    [...filtered].sort((a, b) => b.quantite - a.quantite).slice(0, 10).map(r => ({ name: r.nomFiche.length > 16 ? r.nomFiche.slice(0, 14) + '…' : r.nomFiche, ventes: r.quantite }))
  ), [filtered]);

  const lineData = useMemo(() => {
    const byDate = {};
    filtered.forEach(r => {
      (r.dates || []).forEach(d => {
        if (!byDate[d]) byDate[d] = { date: d, marge: 0, ventes: 0 };
        byDate[d].marge += r.margeUnitaire * (r.quantite / Math.max(r.dates?.length || 1, 1));
        byDate[d].ventes += r.quantite / Math.max(r.dates?.length || 1, 1);
      });
    });
    return Object.values(byDate).sort((a, b) => a.date.localeCompare(b.date));
  }, [filtered]);

  const hasFilters = filterService || filterCategorie || filterPeriode;
  const hasLineData = lineData.length > 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Filter bar */}
      {(services.length > 0 || categories.length > 1 || periodes.length > 0) && (
        <div style={{ background: '#fff', borderRadius: '10px', border: '1px solid #E8E2D9', padding: '0.875rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', flexShrink: 0 }}>Filtres</span>
          {services.length > 0 && (
            <select value={filterService} onChange={e => setFilterService(e.target.value)} style={{ ...inputSm }}>
              <option value="">Tous les services</option>
              {services.map(s => <option key={s} value={s}>{s === 'midi' ? 'Midi' : 'Soir'}</option>)}
            </select>
          )}
          {categories.length > 1 && (
            <select value={filterCategorie} onChange={e => setFilterCategorie(e.target.value)} style={{ ...inputSm }}>
              <option value="">Toutes les catégories</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          )}
          {periodes.length > 0 && (
            <select value={filterPeriode} onChange={e => setFilterPeriode(e.target.value)} style={{ ...inputSm }}>
              <option value="">Toute la période</option>
              {periodes.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          )}
          {hasFilters && (
            <button onClick={() => { setFilterService(''); setFilterCategorie(''); setFilterPeriode(''); }}
              style={{ fontSize: '0.75rem', color: T.muted, background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: '4px', fontFamily: "'DM Sans', sans-serif" }}>
              ✕ Effacer
            </button>
          )}
        </div>
      )}

      {/* KPI cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem' }}>
        {[
          { label: 'Plats analysés', value: filtered.length, color: T.text },
          { label: 'Portions vendues', value: totalVentes, color: T.text },
          { label: 'Marge brute totale', value: totalMarge.toFixed(2) + ' €', color: totalMarge >= 0 ? T.green : '#DC2626' },
          { label: 'Étoiles', value: filtered.filter(r => r.quadrant === 'etoile').length, color: T.green },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #E8E2D9', padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: hasLineData ? '1fr 1fr' : '1fr', gap: '1rem' }}>
        {/* Bar chart — top 10 par volume */}
        <div style={{ ...card, padding: '1.25rem' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.9rem', fontWeight: 700, color: T.text, marginBottom: '1rem' }}>Top 10 — Volumes vendus</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top10Bar} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE8" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: T.text }} width={100} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ fontSize: '0.78rem', borderRadius: '8px', border: '1px solid #E8E2D9' }}
                formatter={(v) => [v + ' portions', 'Ventes']}
              />
              <Bar dataKey="ventes" fill={T.green} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Line chart — évolution temporelle */}
        {hasLineData && (
          <div style={{ ...card, padding: '1.25rem' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.9rem', fontWeight: 700, color: T.text, marginBottom: '1rem' }}>Évolution de la marge brute</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE8" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: T.muted }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(0) + '€'} />
                <Tooltip
                  contentStyle={{ fontSize: '0.78rem', borderRadius: '8px', border: '1px solid #E8E2D9' }}
                  formatter={(v) => [v.toFixed(2) + ' €', 'Marge']}
                />
                <Line type="monotone" dataKey="marge" stroke={T.gold} strokeWidth={2} dot={{ r: 3, fill: T.gold }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Matrice 2×2 */}
      <div style={{ ...card, padding: '1.5rem' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: T.text, marginBottom: '1.25rem' }}>
          Matrice Menu Engineering
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
          {['enigme', 'etoile', 'poids_mort', 'vache'].map(key => {
            const q = QUADRANTS[key];
            const plats = filtered.filter(r => r.quadrant === key);
            return (
              <div key={key} style={{ background: q.bg, border: `1px solid ${q.border}`, borderRadius: '10px', padding: '1rem', minHeight: '130px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: '0.88rem', color: q.color }}>{q.icon} {q.label}</div>
                    <div style={{ fontSize: '0.68rem', color: T.muted, marginTop: '2px' }}>{q.desc}</div>
                  </div>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.6rem', fontWeight: 700, color: q.color, lineHeight: 1 }}>{plats.length}</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {plats.map(p => (
                    <div key={p.recetteId || p.nomPOS} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: '0.82rem', borderBottom: '1px solid rgba(0,0,0,0.04)', paddingBottom: '3px' }}>
                      <span style={{ color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>{p.nomFiche}</span>
                      <span style={{ color: q.color, fontWeight: 700, flexShrink: 0 }}>
                        {p.margeUnitaire >= 0 ? '+' : ''}{p.margeUnitaire.toFixed(2)} €/u
                      </span>
                    </div>
                  ))}
                  {plats.length === 0 && (
                    <div style={{ fontSize: '0.78rem', color: '#C4B9A8', fontStyle: 'italic' }}>Aucun plat dans ce quadrant</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', fontSize: '0.68rem', color: '#9CA3AF', textAlign: 'center', paddingTop: '4px' }}>
          <div>← Peu populaire · Populaire →</div>
          <div>← Peu populaire · Populaire →</div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'center', fontSize: '0.68rem', color: '#9CA3AF', marginTop: '2px' }}>
          Axe vertical : Rentabilité (haut = marge élevée)
        </div>
      </div>

      {/* Tableau détaillé */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid #F3EFE8' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: T.text, margin: 0 }}>
            Analyse détaillée
          </h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#FAFAF8' }}>
                {['Plat', 'Catégorie', 'Ventes', 'Part', 'Prix vente', 'Coût mat.', 'Marge/u', 'Marge tot.', 'Recommandation'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', textAlign: h === 'Plat' || h === 'Catégorie' || h === 'Recommandation' ? 'left' : 'right', fontSize: '0.66rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', color: T.muted, borderBottom: '2px solid #F3EFE8', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...filtered].sort((a, b) => b.margeTotal - a.margeTotal).map((r, i) => {
                const q = QUADRANTS[r.quadrant] || QUADRANTS.poids_mort;
                const part = totalVentes > 0 ? (r.quantite / totalVentes * 100).toFixed(1) : '—';
                return (
                  <tr key={i}
                    style={{ borderBottom: '1px solid #F9F7F4', transition: 'background 0.1s' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                    onMouseLeave={e => e.currentTarget.style.background = ''}
                  >
                    <td style={{ padding: '9px 12px', fontWeight: 600, color: T.text }}>{r.nomFiche}</td>
                    <td style={{ padding: '9px 12px', color: T.muted, fontSize: '0.78rem' }}>{r.categorieMenu}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: T.text }}>{r.quantite}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: T.muted }}>{part}%</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right' }}>{r.prixVente > 0 ? r.prixVente.toFixed(2) + ' €' : '—'}</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', color: '#DC2626' }}>{r.coutMat.toFixed(2)} €</td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontWeight: 700, color: r.margeUnitaire >= 0 ? T.green : '#DC2626' }}>
                      {r.margeUnitaire >= 0 ? '+' : ''}{r.margeUnitaire.toFixed(2)} €
                    </td>
                    <td style={{ padding: '9px 12px', textAlign: 'right', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: T.text }}>
                      {r.margeTotal >= 0 ? '+' : ''}{r.margeTotal.toFixed(2)} €
                    </td>
                    <td style={{ padding: '9px 12px' }}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap', color: q.color, background: q.bg, border: `1px solid ${q.border}` }}>
                        {q.icon} {RECOMMANDATIONS[r.quadrant]}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <button onClick={onBack}
          style={{ padding: '0.6rem 1.25rem', background: 'none', border: '1px solid #E5E0D8', borderRadius: '8px', cursor: 'pointer', color: T.muted, fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem' }}>
          ← Modifier le matching
        </button>
        <div style={{ fontSize: '0.8rem', color: T.muted }}>
          {filtered.length} plat{filtered.length > 1 ? 's' : ''} · marge brute totale :{' '}
          <strong style={{ color: totalMarge >= 0 ? T.green : '#DC2626' }}>{totalMarge.toFixed(2)} €</strong>
        </div>
      </div>
    </div>
  );
}
