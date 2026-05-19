import { useState, useRef, useEffect } from 'react';
import { api, authHeaders, API_URL } from '../api.js';
import { coutPortionHT } from '../utils.js';

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280' };

const QUADRANTS = {
  etoile:     { label: 'Étoiles',       icon: '⭐', desc: 'Populaire · Rentable',          color: '#2D6A4F', bg: '#F0FDF4', border: '#86EFAC' },
  vache:      { label: 'Vaches à lait', icon: '🐄', desc: 'Populaire · Peu rentable',       color: '#D97706', bg: '#FFFBEB', border: '#FCD34D' },
  enigme:     { label: 'Énigmes',       icon: '🔍', desc: 'Peu populaire · Rentable',       color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE' },
  poids_mort: { label: 'Poids morts',   icon: '💀', desc: 'Peu populaire · Peu rentable',   color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5' },
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
  const [step, setStep] = useState(1);
  const [reviewed, setReviewed] = useState(false);
  const [file, setFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);
  const [loading, setLoading] = useState(false);
  const [colonnes, setColonnes] = useState([]);
  const [matchings, setMatchings] = useState([]);
  const [recettes, setRecettes] = useState([]);
  const [resultats, setResultats] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    api.recettes.list().then(setRecettes).catch(() => {});
  }, []);

  function handleFile(f) {
    if (!f) return;
    const ok = f.name.match(/\.(csv|xlsx|xls)$/i);
    if (!ok) return alert('Format non supporté. Utilisez un fichier CSV ou Excel (.xlsx).');
    setFile(f);
    setColonnes([]);
    setReviewed(false);
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
        return {
          nomPOS: l.nomPOS,
          quantite: l.quantite || 1,
          prixVente: l.prixVente || null,
          date: l.date || null,
          service: l.service || null,
          recetteId: match?.recette.id || null,
          matchScore: match?.score || 0,
          ignore: false,
        };
      });
      setMatchings(m);
      setReviewed(false);
    } catch (err) {
      alert('Erreur lors de l\'analyse : ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function passerAuMatching() {
    setReviewed(true);
    setStep(2);
  }

  function validerEtCalculer() {
    const actifs = matchings.filter(m => !m.ignore && m.recetteId);
    if (actifs.length === 0) return alert('Associez au moins un plat à une fiche technique pour calculer.');
    const rows = actifs.map(m => {
      const rec = recettes.find(r => r.id === m.recetteId);
      const coutMat = rec ? coutPortionHT(rec) : 0;
      const pv = m.prixVente || rec?.prixVentePratiqueTTC || 0;
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
        quadrant: null,
      };
    });
    setResultats(computeQuadrant(rows));
    setStep(3);
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
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: T.text }}>
          Menu Engineering
        </h1>
        <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '4px' }}>
          Identifiez vos étoiles, vos vaches à lait, vos énigmes et vos poids morts pour piloter votre carte.
        </p>
      </div>

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
          {/* Dropzone */}
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
            <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls" style={{ display: 'none' }}
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
                <div style={{ color: T.muted, fontSize: '0.82rem', marginTop: '6px' }}>CSV ou Excel (.xlsx, .xls) · Max 5 Mo</div>
                <div style={{ color: T.gold, fontSize: '0.78rem', marginTop: '4px', fontWeight: 600 }}>ou cliquez pour parcourir</div>
              </>
            )}
          </div>

          {/* Info */}
          <div style={{ background: 'rgba(201,168,76,0.06)', border: '1px solid rgba(201,168,76,0.2)', borderRadius: '10px', padding: '0.875rem 1.25rem', fontSize: '0.8rem', color: '#78350F', lineHeight: 1.55 }}>
            <strong>Formats acceptés :</strong> export CSV ou Excel depuis votre caisse (Lightspeed, Zelty, Cashpad, L'Addition, Trivec…). Le fichier doit contenir au minimum une colonne avec les noms des plats et une colonne quantités vendues.
          </div>

          {/* Résultat analyse — colonnes détectées */}
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
                onClick={passerAuMatching}
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
                  display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '0.75rem', alignItems: 'center',
                  padding: '0.65rem 0.875rem', borderRadius: '8px',
                  background: m.ignore ? '#F5F3F0' : '#FAFAF8',
                  border: `1px solid ${m.ignore ? '#EBE7E0' : '#F3EFE8'}`,
                  opacity: m.ignore ? 0.55 : 1,
                  transition: 'opacity 0.15s',
                }}>
                  {/* POS name */}
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: T.text }}>{m.nomPOS}</div>
                    <div style={{ fontSize: '0.73rem', color: T.muted, marginTop: '1px' }}>
                      {m.quantite} vendu{m.quantite > 1 ? 's' : ''}
                      {m.prixVente ? ` · ${m.prixVente.toFixed(2)} €` : ''}
                    </div>
                  </div>

                  {/* Select fiche */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {m.recetteId && m.matchScore >= 0.8 && !m.ignore && (
                      <span style={{
                        fontSize: '0.65rem', fontWeight: 700, color: '#16a34a',
                        background: '#F0FDF4', border: '1px solid #86EFAC',
                        padding: '1px 6px', borderRadius: '99px', whiteSpace: 'nowrap', flexShrink: 0,
                      }}>✓ Match</span>
                    )}
                    <select
                      value={m.recetteId || ''}
                      onChange={e => setMatchings(prev => prev.map((x, j) => j === i ? { ...x, recetteId: e.target.value || null } : x))}
                      disabled={m.ignore}
                      style={{ ...inputSm, width: '100%' }}
                    >
                      <option value="">— Sélectionner une fiche —</option>
                      {recettes.map(r => <option key={r.id} value={r.id}>{r.nom}</option>)}
                    </select>
                  </div>

                  {/* Ignore toggle */}
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
    </div>
  );
}

function ResultatsView({ resultats, onBack }) {
  const totalVentes = resultats.reduce((s, r) => s + r.quantite, 0);
  const totalMarge = resultats.reduce((s, r) => s + r.margeTotal, 0);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontFamily: "'DM Sans', sans-serif" }}>

      {/* Résumé global */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.875rem' }}>
        {[
          { label: 'Plats analysés', value: resultats.length, color: T.text },
          { label: 'Portions vendues', value: totalVentes, color: T.text },
          { label: 'Marge brute totale', value: totalMarge.toFixed(2) + ' €', color: totalMarge >= 0 ? T.green : '#DC2626' },
          { label: 'Étoiles', value: resultats.filter(r => r.quadrant === 'etoile').length, color: T.green },
        ].map(s => (
          <div key={s.label} style={{ background: '#fff', borderRadius: '10px', border: '1px solid #E8E2D9', padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '4px' }}>{s.label}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Matrice 2×2 */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.5rem' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: T.text, marginBottom: '1.25rem' }}>
          Matrice Menu Engineering
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
          {/* Top row: peu populaire / populaire → rentable */}
          {['enigme', 'etoile', 'poids_mort', 'vache'].map(key => {
            const q = QUADRANTS[key];
            const plats = resultats.filter(r => r.quadrant === key);
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
              {[...resultats].sort((a, b) => b.margeTotal - a.margeTotal).map((r, i) => {
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
                      <span style={{
                        display: 'inline-block', padding: '2px 8px', borderRadius: '4px',
                        fontSize: '0.72rem', fontWeight: 600, whiteSpace: 'nowrap',
                        color: q.color, background: q.bg, border: `1px solid ${q.border}`,
                      }}>
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
          {resultats.length} plat{resultats.length > 1 ? 's' : ''} · marge brute totale :{' '}
          <strong style={{ color: totalMarge >= 0 ? T.green : '#DC2626' }}>{totalMarge.toFixed(2)} €</strong>
        </div>
      </div>
    </div>
  );
}
