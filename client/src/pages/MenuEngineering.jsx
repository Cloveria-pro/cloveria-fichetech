import { useState, useRef, useEffect, useMemo } from 'react';
import { useWindowWidth } from '../hooks/useWindowWidth.js';
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
  etoile:     'Maintenez — valorisez la visibilité',
  vache:      'Retravaillez le coût ou augmentez le prix',
  enigme:     'Poussez sur la carte — meilleure position',
  poids_mort: 'Retirez ou reformulez complètement',
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
  rows.forEach(row => { if (row.margeUnitaire < 0) row.quadrant = 'poids_mort'; });
  const positifs = rows.filter(r => r.margeUnitaire >= 0);
  const categories = [...new Set(positifs.map(r => r.categorieMenu))];
  categories.forEach(cat => {
    const catRows = positifs.filter(r => r.categorieMenu === cat);
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

function aggregerRapports(rapports, debut, fin, cartesIds) {
  const all = cartesIds.includes('__all');
  const filtered = rapports.filter(r => {
    if (!all && r.cartesIds && r.cartesIds.length > 0) {
      if (!r.cartesIds.some(id => cartesIds.includes(id))) return false;
    }
    if (r.hasLineDates) {
      // Données journalières : inclusion par chevauchement
      if (debut && r.dateFin && r.dateFin < debut) return false;
      if (fin && r.dateDebut && r.dateDebut > fin) return false;
    } else {
      // Pas de détail journalier : le filtre doit couvrir entièrement la période du rapport
      // Si le rapport a des dates, on l'exclut dès que le filtre est plus fin que sa période
      if (r.dateDebut && r.dateFin) {
        if (debut && debut > r.dateDebut) return false;
        if (fin && fin < r.dateFin) return false;
      }
    }
    return true;
  });
  const byKey = {};
  filtered.forEach(r => {
    (r.lignes || []).forEach(l => {
      const key = l.recetteId || l.nomFiche || l.nomPOS;
      if (!byKey[key]) {
        byKey[key] = { ...l, quantite: 0, margeTotal: 0, dates: [], services: [], quadrant: null };
      }
      byKey[key].quantite += l.quantite || 0;
      byKey[key].margeTotal += l.margeTotal || 0;
      if (l.dates) byKey[key].dates.push(...l.dates);
      if (l.services) byKey[key].services.push(...l.services);
    });
  });
  return Object.values(byKey).map(r => ({
    ...r,
    dates: [...new Set(r.dates)],
    services: [...new Set(r.services)],
    margeUnitaire: r.quantite > 0 ? r.margeTotal / r.quantite : 0,
  }));
}

const card = { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };
const inputSm = { padding: '0.35rem 0.6rem', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", color: T.text, background: '#fff', outline: 'none' };
const labelStyle = { display: 'block', fontSize: '0.72rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' };

function CartesMultiSelect({ cartes, value, onChange }) {
  const allSelected = value.includes('__all');
  function toggle(id) {
    if (id === '__all') { onChange(['__all']); return; }
    const without = value.filter(v => v !== '__all');
    if (without.includes(id)) {
      const next = without.filter(v => v !== id);
      onChange(next.length === 0 ? ['__all'] : next);
    } else {
      onChange([...without, id]);
    }
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
      {[{ id: '__all', nom: 'Toutes les cartes' }, ...cartes].map(c => {
        const active = c.id === '__all' ? allSelected : !allSelected && value.includes(c.id);
        return (
          <button key={c.id} type="button" onClick={() => toggle(c.id)} style={{
            padding: '0.3rem 0.75rem', borderRadius: '99px',
            border: `1px solid ${active ? T.green : '#D6D0C8'}`,
            background: active ? T.green : '#fff',
            color: active ? '#fff' : T.muted,
            fontSize: '0.8rem', fontWeight: active ? 700 : 400,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
            transition: 'all 0.12s',
          }}>{c.nom}</button>
        );
      })}
    </div>
  );
}

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
  const [dateDebut, setDateDebut] = useState('');
  const [dateFin, setDateFin] = useState('');
  const [cartesSelectes, setCartesSelectes] = useState(['__all']);
  const [cartes, setCartes] = useState([]);
  const [rapportEnCours, setRapportEnCours] = useState(null);
  const [hasLineDates, setHasLineDates] = useState(null);
  const [manualDates, setManualDates] = useState(false);
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);
  const width = useWindowWidth();
  const isMobile = width < 768;

  useEffect(() => {
    api.recettes.list().then(setRecettes).catch(() => {});
    api.cartes.list().then(setCartes).catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'historique' || tab === 'analyse') {
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
      const hasDate = colonnesResult.some(c => c.type === 'date') || lignesResult.some(l => l.date);
      setHasLineDates(hasDate ? true : false);
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

  function handleModifier(rapport) {
    if (!rapport.matchings || rapport.matchings.length === 0) {
      alert("Ce rapport a été importé avant la mise à jour de l'outil. Il ne peut pas être modifié directement.\n\nVous pouvez le supprimer et le réimporter.");
      return;
    }
    setRapportEnCours(rapport);
    setMatchings(rapport.matchings);
    setColonnes([]);
    setFile(null);
    setDateDebut(rapport.dateDebut || '');
    setDateFin(rapport.dateFin || '');
    setCartesSelectes(rapport.cartesIds?.length > 0 ? rapport.cartesIds : ['__all']);
    setHasLineDates(rapport.hasLineDates ?? false);
    setManualDates(false);
    setStep(2);
    setTab('import');
  }

  async function handleSupprimer(id) {
    if (!window.confirm('Supprimer ce rapport ? Cette action est irréversible.')) return;
    try {
      await api.ventes.delete(id);
      setHistorique(prev => prev.filter(h => h.id !== id));
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  }

  async function validerEtCalculer() {
    const actifs = matchings.filter(m => !m.ignore && m.recetteId);
    if (actifs.length === 0) return alert('Associez au moins un plat à une fiche technique pour calculer.');
    if (!dateDebut || !dateFin) return alert('Veuillez renseigner les dates de début et de fin de la période.');

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
        dates: (hasLineDates === true || manualDates) ? m.dates : [],
        services,
        quadrant: null,
      };
    });

    const withQuadrant = computeQuadrant(rows);
    setResultats(withQuadrant);

    const periode = (() => {
      const allDates = actifs.filter(m => m.date).map(m => m.date).sort();
      if (allDates.length === 0) return 'Import du ' + new Date().toLocaleDateString('fr-FR');
      if (allDates.length === 1) return allDates[0];
      return `${allDates[0]} → ${allDates[allDates.length - 1]}`;
    })();

    const rapportData = {
      periode,
      lignes: withQuadrant,
      dateDebut: dateDebut || null,
      dateFin: dateFin || null,
      cartesIds: cartesSelectes.includes('__all') ? [] : cartesSelectes,
      matchings: actifs,
      hasLineDates: hasLineDates === true || manualDates,
      nomFichier: file?.name || rapportEnCours?.nomFichier || null,
    };

    try {
      if (rapportEnCours?.id) {
        await api.ventes.update(rapportEnCours.id, rapportData);
      } else {
        await api.ventes.create(rapportData);
      }
    } catch (err) {
      console.error('Erreur sauvegarde:', err);
    }

    setRapportEnCours(null);
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
        {[{ key: 'import', label: 'Nouvel import' }, { key: 'historique', label: 'Historique' }, { key: 'analyse', label: 'Analyse' }].map(t => (
          <button key={t.key} onClick={() => {
            if (t.key === 'import') {
              setStep(1); setFile(null); setColonnes([]); setMatchings([]);
              setResultats([]); setRapportEnCours(null); setHasLineDates(null);
              setDateDebut(''); setDateFin(''); setCartesSelectes(['__all']); setManualDates(false);
            }
            setTab(t.key);
          }} style={{
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
          onModifier={handleModifier}
          onSupprimer={handleSupprimer}
          cartes={cartes}
        />
      )}

      {/* ── TAB ANALYSE ── */}
      {tab === 'analyse' && (
        <AnalyseTab
          historique={historique}
          loading={histLoading}
          cartes={cartes}
        />
      )}

      {/* ── TAB IMPORT ── */}
      {tab === 'import' && (
        <>
          {/* Editing banner */}
          {rapportEnCours && (
            <div style={{ background: 'rgba(201,168,76,0.08)', border: '1px solid rgba(201,168,76,0.3)', borderRadius: '10px', padding: '0.75rem 1.25rem', marginBottom: '1.25rem', fontSize: '0.85rem', color: '#78350F', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1rem' }}>✏️</span>
              <span>Vous modifiez le rapport <strong>{rapportEnCours.periode || 'sans titre'}</strong>.</span>
              <button
                onClick={() => { setRapportEnCours(null); setStep(1); setColonnes([]); setMatchings([]); setFile(null); }}
                style={{ marginLeft: 'auto', padding: '0.3rem 0.875rem', background: 'none', border: '1px solid rgba(201,168,76,0.4)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.78rem', color: '#78350F', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
              >
                Annuler
              </button>
            </div>
          )}

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
                onClick={() => !loading && !isMobile && fileInputRef.current?.click()}
                style={{
                  ...card,
                  padding: '3rem 2rem', textAlign: 'center',
                  cursor: loading || isMobile ? 'default' : 'pointer',
                  border: `2px dashed ${dragOver ? T.green : file && colonnes.length === 0 ? T.gold : colonnes.length > 0 ? T.green : '#C9A84C'}`,
                  background: dragOver ? 'rgba(45,106,79,0.04)' : '#FAFAF8',
                  transition: 'all 0.15s',
                }}
              >
                <input ref={fileInputRef} type="file" accept=".csv,.xlsx,.xls,.pdf,.jpg,.jpeg,.png,.webp" style={{ display: 'none' }}
                  onChange={e => handleFile(e.target.files[0])} />
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }}
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
                    {!isMobile && <div style={{ color: T.gold, fontSize: '0.78rem', marginTop: '4px', fontWeight: 600 }}>ou cliquez pour parcourir</div>}
                  </>
                )}
              </div>
              {isMobile && !file && (
                <div style={{ display: 'flex', gap: '0.75rem' }}>
                  <button onClick={() => cameraInputRef.current?.click()} style={{ flex: 1, padding: '0.65rem 0.5rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    📷 Prendre une photo
                  </button>
                  <button onClick={() => fileInputRef.current?.click()} style={{ flex: 1, padding: '0.65rem 0.5rem', background: '#fff', color: T.text, border: '1px solid #E5E0D8', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                    📁 Choisir un fichier
                  </button>
                </div>
              )}

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

              {colonnes.length > 0 && (
                <div style={{ ...card, padding: '1.25rem' }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 700, color: T.text, marginBottom: '0.5rem' }}>
                    Granularité des données
                  </h3>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: hasLineDates === false ? '0.875rem' : 0 }}>
                    {[
                      { val: true,  label: '📅 Chaque ligne contient une date exploitable' },
                      { val: false, label: '📋 Données globales sur la période' },
                    ].map(({ val, label }) => {
                      const active = hasLineDates === val;
                      const disabled = val === true && hasLineDates === false;
                      return (
                        <button key={String(val)} type="button"
                          disabled={disabled}
                          onClick={() => !disabled && setHasLineDates(val)}
                          style={{
                            padding: '0.55rem 1.1rem', borderRadius: '8px',
                            border: `1.5px solid ${active ? T.green : disabled ? '#E5E0D8' : '#D6D0C8'}`,
                            background: active ? 'rgba(45,106,79,0.08)' : '#fff',
                            color: active ? T.green : disabled ? '#C5BDB0' : T.muted,
                            fontSize: '0.82rem', fontWeight: active ? 700 : 400,
                            cursor: disabled ? 'not-allowed' : 'pointer',
                            fontFamily: "'DM Sans', sans-serif",
                            transition: 'all 0.12s',
                            opacity: disabled ? 0.5 : 1,
                          }}>{label}</button>
                      );
                    })}
                  </div>
                  {hasLineDates === false && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                      <div style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.25)', borderRadius: '8px', padding: '0.65rem 0.9rem', fontSize: '0.8rem', color: '#92400E', lineHeight: 1.55 }}>
                        ⚠️ Ce rapport ne contient aucune date par ligne. Vous pouvez continuer en mode global, ou ajouter manuellement une date à chaque ligne pour activer l'analyse fine par sous-période.
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (manualDates) {
                            setManualDates(false);
                            setMatchings(prev => prev.map(m => ({ ...m, date: null })));
                          } else {
                            setManualDates(true);
                            if (dateDebut) setMatchings(prev => prev.map(m => ({ ...m, date: m.date || dateDebut })));
                          }
                        }}
                        style={{
                          alignSelf: 'flex-start', padding: '0.45rem 1rem',
                          background: manualDates ? 'rgba(45,106,79,0.08)' : '#fff',
                          border: `1.5px solid ${manualDates ? T.green : '#D6D0C8'}`,
                          borderRadius: '8px', color: manualDates ? T.green : T.muted,
                          fontSize: '0.82rem', fontWeight: manualDates ? 700 : 400,
                          cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.12s',
                        }}
                      >
                        {manualDates ? '✓ Saisie manuelle activée — cliquer pour annuler' : '✏️ Ajouter manuellement une date à chaque ligne'}
                      </button>
                      {manualDates && matchings.length > 0 && (
                        <div style={{ border: '1px solid #E8E2D9', borderRadius: '10px', overflow: 'hidden' }}>
                          <div style={{ background: '#F8F6F1', padding: '0.5rem 0.875rem', fontSize: '0.72rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E8E2D9' }}>
                            Date par plat — {matchings.filter(m => m.date).length}/{matchings.length} renseigné{matchings.filter(m => m.date).length !== 1 ? 's' : ''}
                          </div>
                          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
                            {matchings.map((m, i) => (
                              <div key={i} style={{
                                display: 'flex', alignItems: 'center', gap: '0.75rem',
                                padding: '0.5rem 0.875rem',
                                borderBottom: i < matchings.length - 1 ? '1px solid #F3EFE8' : 'none',
                                background: !m.date ? 'rgba(220,38,38,0.03)' : '#fff',
                              }}>
                                <span style={{ flex: 1, fontSize: '0.82rem', color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {m.nomPOS}
                                </span>
                                <input
                                  type="date"
                                  value={m.date || ''}
                                  onChange={e => setMatchings(prev => prev.map((x, j) => j === i ? { ...x, date: e.target.value || null } : x))}
                                  style={{ ...inputSm, flexShrink: 0, borderColor: !m.date ? '#FCA5A5' : '#E5E0D8' }}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {colonnes.length > 0 && (
                <div style={{ ...card, padding: '1.25rem' }}>
                  <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 700, color: T.text, marginBottom: '1rem' }}>
                    Période et carte concernée
                  </h3>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <label>
                      <span style={labelStyle}>Date de début *</span>
                      <input
                        type="date" value={dateDebut}
                        onChange={e => setDateDebut(e.target.value)}
                        style={{ ...inputSm, width: '100%', boxSizing: 'border-box' }}
                      />
                    </label>
                    <label>
                      <span style={labelStyle}>Date de fin *</span>
                      <input
                        type="date" value={dateFin}
                        onChange={e => setDateFin(e.target.value)}
                        style={{ ...inputSm, width: '100%', boxSizing: 'border-box' }}
                      />
                    </label>
                  </div>
                  <span style={labelStyle}>Carte(s) concernée(s)</span>
                  <CartesMultiSelect cartes={cartes} value={cartesSelectes} onChange={setCartesSelectes} />
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                {colonnes.length > 0 && (
                  <button
                    onClick={() => {
                      if (hasLineDates === null) return alert('Veuillez indiquer si le fichier contient une date par ligne.');
                      if (!dateDebut || !dateFin) return alert('Veuillez renseigner les dates de début et de fin de la période.');
                      if (manualDates && matchings.some(m => !m.date)) return alert('Veuillez renseigner une date pour chaque ligne de vente avant de continuer.');
                      setStep(2);
                    }}
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

                <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', margin: '0 -0.25rem' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', minWidth: isMobile ? '520px' : undefined }}>
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
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <button
                  onClick={() => {
                    if (rapportEnCours?.id) {
                      setRapportEnCours(null);
                      setTab('historique');
                    } else {
                      setStep(1);
                    }
                  }}
                  style={{ padding: '0.6rem 1.25rem', background: 'none', border: '1px solid #E5E0D8', borderRadius: '8px', cursor: 'pointer', color: T.muted, fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem' }}
                >
                  ← Retour
                </button>
                <button
                  onClick={validerEtCalculer}
                  style={{ padding: '0.6rem 2rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                  onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
                  onMouseLeave={e => e.currentTarget.style.background = T.green}
                >
                  {rapportEnCours?.id ? 'Mettre à jour →' : 'Valider et calculer →'}
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
function HistoriqueTab({ historique, loading, onRecharger, onModifier, onSupprimer, cartes }) {
  const [showAll, setShowAll] = useState(false);

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
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '3rem 2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
        <div style={{ fontWeight: 700, color: T.text, fontSize: '0.95rem' }}>Aucun import enregistré</div>
        <div style={{ color: T.muted, fontSize: '0.82rem', marginTop: '6px' }}>Vos analyses apparaîtront ici après le premier import.</div>
      </div>
    );
  }

  const visible = showAll ? historique : historique.slice(0, 5);
  const remaining = historique.length - 5;

  function carteNoms(cartesIds) {
    if (!cartesIds || cartesIds.length === 0) return null;
    const noms = cartesIds.map(id => cartes.find(c => c.id === id)?.nom).filter(Boolean);
    return noms.length > 0 ? noms.join(', ') : null;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      {visible.map((h, i) => {
        const lignes = h.lignes || [];
        const totalVentes = lignes.reduce((s, r) => s + (r.quantite || 0), 0);
        const totalMarge = lignes.reduce((s, r) => s + (r.margeTotal || 0), 0);
        const etoiles = lignes.filter(r => r.quadrant === 'etoile').length;
        const date = h.createdAt ? new Date(h.createdAt).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';
        const periodeLabel = h.dateDebut && h.dateFin ? `${h.dateDebut} → ${h.dateFin}` : null;
        const cartesLabel = carteNoms(h.cartesIds);
        return (
          <div key={i} style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1rem 1.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: '0.9rem', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {h.periode || 'Import sans titre'}
                </div>
                <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: '2px' }}>
                  {date} · {lignes.length} plat{lignes.length !== 1 ? 's' : ''} · {totalVentes} portion{totalVentes !== 1 ? 's' : ''} · {etoiles} étoile{etoiles !== 1 ? 's' : ''}
                </div>
                {(periodeLabel || cartesLabel || h.hasLineDates) && (
                  <div style={{ fontSize: '0.72rem', color: T.muted, marginTop: '3px', display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {periodeLabel && <span>📅 {periodeLabel}</span>}
                    {cartesLabel && <span>🗂 {cartesLabel}</span>}
                    {h.hasLineDates && (
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: T.green, background: 'rgba(45,106,79,0.08)', border: '1px solid rgba(45,106,79,0.2)', padding: '1px 6px', borderRadius: '99px' }}>
                        📅 Détail/jour
                      </span>
                    )}
                  </div>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '0.68rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Marge brute</div>
                  <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: totalMarge >= 0 ? T.green : '#DC2626' }}>
                    {totalMarge >= 0 ? '+' : ''}{totalMarge.toFixed(2)} €
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <button
                    onClick={() => onModifier(h)}
                    style={{ padding: '0.4rem 0.875rem', background: 'none', border: '1px solid #E5E0D8', borderRadius: '7px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, color: T.text, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = T.green; e.currentTarget.style.color = T.green; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = '#E5E0D8'; e.currentTarget.style.color = T.text; }}
                  >
                    ✏️ Modifier
                  </button>
                  <button
                    onClick={() => onRecharger(lignes)}
                    style={{ padding: '0.4rem 0.875rem', background: T.green, color: '#fff', border: 'none', borderRadius: '7px', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
                    onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
                    onMouseLeave={e => e.currentTarget.style.background = T.green}
                  >
                    Revoir →
                  </button>
                  <button
                    onClick={() => onSupprimer(h.id)}
                    style={{ padding: '0.4rem 0.6rem', background: 'none', border: '1px solid #FCA5A5', borderRadius: '7px', cursor: 'pointer', fontSize: '0.78rem', color: '#DC2626', fontFamily: "'DM Sans', sans-serif" }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                    title="Supprimer"
                  >
                    🗑
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
      {!showAll && remaining > 0 && (
        <button
          onClick={() => setShowAll(true)}
          style={{ alignSelf: 'center', padding: '0.5rem 1.5rem', background: 'none', border: '1px solid #E5E0D8', borderRadius: '8px', cursor: 'pointer', fontSize: '0.82rem', color: T.muted, fontFamily: "'DM Sans', sans-serif" }}
        >
          +{remaining} rapport{remaining !== 1 ? 's' : ''} plus ancien{remaining !== 1 ? 's' : ''}
        </button>
      )}
    </div>
  );
}

/* ── Analyse Tab ── */
function AnalyseTab({ historique, loading, cartes }) {
  const [pendingDebut, setPendingDebut] = useState('');
  const [pendingFin, setPendingFin] = useState('');
  const [pendingCartes, setPendingCartes] = useState(['__all']);
  const [appliedDebut, setAppliedDebut] = useState('');
  const [appliedFin, setAppliedFin] = useState('');
  const [appliedCartes, setAppliedCartes] = useState(['__all']);

  function appliquer() {
    setAppliedDebut(pendingDebut);
    setAppliedFin(pendingFin);
    setAppliedCartes(pendingCartes);
  }

  function reinitialiser() {
    setPendingDebut('');
    setPendingFin('');
    setPendingCartes(['__all']);
    setAppliedDebut('');
    setAppliedFin('');
    setAppliedCartes(['__all']);
  }

  const analyseResultats = useMemo(() => {
    const rows = aggregerRapports(historique, appliedDebut, appliedFin, appliedCartes);
    return computeQuadrant(rows.map(r => ({ ...r })));
  }, [historique, appliedDebut, appliedFin, appliedCartes]);

  const { nbRapports, rapportsSansDetails } = useMemo(() => {
    const all = appliedCartes.includes('__all');
    const inclus = historique.filter(r => {
      if (!all && r.cartesIds && r.cartesIds.length > 0) {
        if (!r.cartesIds.some(id => appliedCartes.includes(id))) return false;
      }
      if (r.hasLineDates) {
        if (appliedDebut && r.dateFin && r.dateFin < appliedDebut) return false;
        if (appliedFin && r.dateDebut && r.dateDebut > appliedFin) return false;
      } else {
        if (r.dateDebut && r.dateFin) {
          if (appliedDebut && appliedDebut > r.dateDebut) return false;
          if (appliedFin && appliedFin < r.dateFin) return false;
        }
      }
      return true;
    });
    const sansDetails = (appliedDebut || appliedFin)
      ? inclus.filter(r => !r.hasLineDates)
      : [];
    return { nbRapports: inclus.length, rapportsSansDetails: sansDetails };
  }, [historique, appliedDebut, appliedFin, appliedCartes]);

  const hasActiveFilter = !!(appliedDebut || appliedFin || !appliedCartes.includes('__all'));
  const pendingChanged = pendingDebut !== appliedDebut || pendingFin !== appliedFin
    || JSON.stringify(pendingCartes) !== JSON.stringify(appliedCartes);

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '3rem', color: T.muted }}>
        <span style={{ display: 'inline-block', width: '20px', height: '20px', border: '2px solid #E5E0D8', borderTopColor: T.green, borderRadius: '50%', animation: 'spin-me 0.7s linear infinite' }} />
        <div style={{ marginTop: '0.75rem', fontSize: '0.85rem' }}>Chargement…</div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Filtres */}
      <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.25rem' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 700, color: T.text, marginBottom: '1rem' }}>
          Filtres de l'analyse
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
          <label>
            <span style={labelStyle}>Date de début</span>
            <input
              type="date" value={pendingDebut}
              onChange={e => setPendingDebut(e.target.value)}
              style={{ ...inputSm, width: '100%', boxSizing: 'border-box' }}
            />
          </label>
          <label>
            <span style={labelStyle}>Date de fin</span>
            <input
              type="date" value={pendingFin}
              onChange={e => setPendingFin(e.target.value)}
              style={{ ...inputSm, width: '100%', boxSizing: 'border-box' }}
            />
          </label>
        </div>
        <span style={labelStyle}>Carte(s)</span>
        <CartesMultiSelect cartes={cartes} value={pendingCartes} onChange={setPendingCartes} />

        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <button
            onClick={appliquer}
            style={{
              padding: '0.55rem 1.25rem', background: T.green, color: '#fff',
              border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem',
              cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
            onMouseLeave={e => e.currentTarget.style.background = T.green}
          >
            Appliquer les filtres
          </button>
          {hasActiveFilter && (
            <button
              onClick={reinitialiser}
              style={{
                padding: '0.55rem 1rem', background: 'none',
                border: '1px solid #E5E0D8', borderRadius: '8px',
                fontSize: '0.85rem', cursor: 'pointer', color: T.muted,
                fontFamily: "'DM Sans', sans-serif",
              }}
            >
              Réinitialiser
            </button>
          )}
          {hasActiveFilter && (
            <span style={{ fontSize: '0.78rem', color: T.muted }}>
              {nbRapports} rapport{nbRapports !== 1 ? 's' : ''} · {analyseResultats.length} plat{analyseResultats.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {pendingChanged && (
          <p style={{ fontSize: '0.72rem', color: T.muted, marginTop: '0.625rem', marginBottom: 0 }}>
            Filtres modifiés — cliquez « Appliquer » pour recalculer.
          </p>
        )}
      </div>

      {rapportsSansDetails.length > 0 && (
        <div style={{ background: 'rgba(217,119,6,0.06)', border: '1px solid rgba(217,119,6,0.3)', borderRadius: '10px', padding: '0.875rem 1.25rem', fontSize: '0.82rem', color: '#78350F', lineHeight: 1.55, display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1rem', flexShrink: 0 }}>⚠️</span>
          <span>
            <strong>{rapportsSansDetails.length} rapport{rapportsSansDetails.length !== 1 ? 's' : ''} sans détail journalier</strong> inclus dans cette analyse.
            {' '}Données disponibles uniquement sur la période globale du rapport, pas par jour.
            {' '}L'analyse reflète les ventes totales de {rapportsSansDetails.length !== 1 ? 'ces rapports' : 'ce rapport'}, indépendamment du filtre de date choisi.
          </span>
        </div>
      )}

      {analyseResultats.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '3rem 2rem', textAlign: 'center' }}>
          <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📊</div>
          <div style={{ fontWeight: 700, color: T.text, fontSize: '0.95rem' }}>
            {hasActiveFilter ? 'Aucun rapport compatible avec ce filtre' : 'Aucun rapport disponible'}
          </div>
          <div style={{ color: T.muted, fontSize: '0.82rem', marginTop: '6px', maxWidth: '380px', margin: '6px auto 0', lineHeight: 1.65 }}>
            {hasActiveFilter
              ? 'Les rapports disponibles ne couvrent pas exactement cette période. Pour analyser une sous-période précise, importez un fichier avec une date par ligne (option "Oui" à l\'import).'
              : 'Vos analyses apparaîtront ici après le premier import.'}
          </div>
        </div>
      ) : (
        <ResultatsView resultats={analyseResultats} onBack={null} />
      )}
    </div>
  );
}

/* ── Résultats View ── */
function ResultatsView({ resultats, onBack }) {
  const [filterService, setFilterService] = useState('');
  const [filterCategorie, setFilterCategorie] = useState('');
  const [highlightedRow, setHighlightedRow] = useState(null);
  const rvWidth = useWindowWidth();
  const isMobile = rvWidth < 768;

  const services = useMemo(() => {
    const s = new Set();
    resultats.forEach(r => (r.services || []).forEach(sv => s.add(sv)));
    return [...s].sort();
  }, [resultats]);

  const categories = useMemo(() => [...new Set(resultats.map(r => r.categorieMenu))].sort(), [resultats]);

  const filtered = useMemo(() => {
    let rows = resultats.map(r => ({ ...r }));
    if (filterService) rows = rows.filter(r => (r.services || []).includes(filterService));
    if (filterCategorie) rows = rows.filter(r => r.categorieMenu === filterCategorie);
    return computeQuadrant(rows);
  }, [resultats, filterService, filterCategorie]);

  const totalVentes = filtered.reduce((s, r) => s + r.quantite, 0);
  const totalMarge = filtered.reduce((s, r) => s + r.margeTotal, 0);

  const top10Bar = useMemo(() => (
    [...filtered].sort((a, b) => b.quantite - a.quantite).slice(0, 10)
      .map(r => ({ name: r.nomFiche.length > 16 ? r.nomFiche.slice(0, 14) + '…' : r.nomFiche, ventes: r.quantite }))
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

  const hasLineData = lineData.length > 1;
  const sortedRows = useMemo(() => [...filtered].sort((a, b) => b.margeTotal - a.margeTotal), [filtered]);

  const bestEtoile = useMemo(() => [...filtered.filter(r => r.quadrant === 'etoile')].sort((a, b) => b.margeUnitaire - a.margeUnitaire)[0] ?? null, [filtered]);
  const bestVache = useMemo(() => [...filtered.filter(r => r.quadrant === 'vache')].sort((a, b) => b.quantite - a.quantite)[0] ?? null, [filtered]);
  const bestEnigme = useMemo(() => [...filtered.filter(r => r.quadrant === 'enigme')].sort((a, b) => b.margeUnitaire - a.margeUnitaire)[0] ?? null, [filtered]);
  const worstMort = useMemo(() => [...filtered.filter(r => r.quadrant === 'poids_mort')].sort((a, b) => a.margeUnitaire - b.margeUnitaire)[0] ?? null, [filtered]);

  function scrollToRow(rowId) {
    const el = document.getElementById(`trow-${rowId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedRow(rowId);
    setTimeout(() => setHighlightedRow(null), 2000);
  }

  const EXEC_CARDS = [
    { plat: bestEtoile,  label: 'À conserver',   icon: '⭐', color: '#2D6A4F', bg: '#F0FDF4', border: '#86EFAC',  sub: p => `+${p.margeUnitaire.toFixed(2)} €/u` },
    { plat: bestVache,   label: 'À retravailler', icon: '🐄', color: '#D97706', bg: '#FFFBEB', border: '#FCD34D',  sub: p => `${p.quantite} vendus` },
    { plat: bestEnigme,  label: 'À pousser',      icon: '🔍', color: '#3B82F6', bg: '#EFF6FF', border: '#BFDBFE',  sub: p => `+${p.margeUnitaire.toFixed(2)} €/u` },
    { plat: worstMort,   label: 'À sortir',       icon: '💀', color: '#DC2626', bg: '#FEF2F2', border: '#FCA5A5',  sub: p => `${p.margeUnitaire.toFixed(2)} €/u` },
  ].filter(c => c.plat !== null);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`
        @keyframes me-pulse { 0%,100%{background:transparent} 35%,65%{background:rgba(201,168,76,0.18)} }
        .me-row-pulse { animation: me-pulse 1.8s ease forwards; }
        .me-exec-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:0.875rem; }
        @media(max-width:860px){ .me-exec-grid{grid-template-columns:repeat(2,1fr);} }
        @media(max-width:480px){ .me-exec-grid{grid-template-columns:1fr 1fr;gap:0.5rem;} }
        .me-exec-card { border-radius:12px; padding:1rem 1.1rem; cursor:pointer; border-width:1px; border-style:solid; transition:box-shadow 0.15s,transform 0.12s; }
        .me-exec-card:hover { box-shadow:0 6px 20px rgba(0,0,0,0.1); transform:translateY(-2px); }
        .me-tbl-wrap { overflow-x:auto; -webkit-overflow-scrolling:touch; }
        .me-pill { padding:0.28rem 0.875rem; border-radius:99px; border:1px solid #D6D0C8; background:#fff; font-size:0.8rem; cursor:pointer; font-family:"DM Sans",sans-serif; transition:all 0.12s; }
        .me-pill:hover { border-color:#2D6A4F; color:#2D6A4F; }
        .me-pill-active { background:#2D6A4F!important; color:#fff!important; border-color:#2D6A4F!important; font-weight:700!important; }
      `}</style>

      {/* ── 1. Filtres pills ── */}
      {(categories.length > 1 || services.length > 0) && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          {categories.length > 1 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '4px', flexShrink: 0 }}>Catégorie</span>
              {['', ...categories].map(cat => (
                <button key={cat || '__all'} onClick={() => setFilterCategorie(cat)}
                  className={`me-pill${filterCategorie === cat ? ' me-pill-active' : ''}`}>
                  {cat || 'Tous'}
                </button>
              ))}
            </div>
          )}
          {services.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.68rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.06em', marginRight: '4px', flexShrink: 0 }}>Service</span>
              {['', ...services].map(svc => (
                <button key={svc || '__all'} onClick={() => setFilterService(svc)}
                  className={`me-pill${filterService === svc ? ' me-pill-active' : ''}`}>
                  {svc === '' ? 'Tous' : svc === 'midi' ? 'Midi' : 'Soir'}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── 2. Résumé exécutif ── */}
      {EXEC_CARDS.length === 0 ? (
        <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #E8E2D9', padding: '1.5rem', textAlign: 'center', color: T.muted, fontSize: '0.875rem' }}>
          Aucun résultat pour les filtres sélectionnés.
        </div>
      ) : (
        <div className="me-exec-grid">
          {EXEC_CARDS.map((c, i) => {
            const rowId = c.plat.recetteId || c.plat.nomFiche;
            return (
              <div key={i} className="me-exec-card"
                style={{ background: c.bg, borderColor: c.border }}
                onClick={() => scrollToRow(rowId)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.6rem' }}>
                  <span style={{ fontSize: '1.5rem', lineHeight: 1 }}>{c.icon}</span>
                  <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#fff', background: c.color, padding: '2px 8px', borderRadius: '99px', whiteSpace: 'nowrap' }}>
                    {c.label}
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.85rem', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: '3px' }}>
                  {c.plat.nomFiche}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: c.color }}>
                  {c.sub(c.plat)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Graphiques ── */}
      <div style={{ display: 'grid', gridTemplateColumns: hasLineData && !isMobile ? '1fr 1fr' : '1fr', gap: '1rem' }}>
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.25rem' }}>
          <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.9rem', fontWeight: 700, color: T.text, marginBottom: '1rem' }}>Top 10 — Volumes vendus</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={top10Bar} layout="vertical" margin={{ left: 0, right: 16, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE8" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: T.text }} width={100} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ fontSize: '0.78rem', borderRadius: '8px', border: '1px solid #E8E2D9' }} formatter={v => [v + ' portions', 'Ventes']} />
              <Bar dataKey="ventes" fill={T.green} radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        {hasLineData && (
          <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.25rem' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.9rem', fontWeight: 700, color: T.text, marginBottom: '1rem' }}>Évolution de la marge brute</div>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={lineData} margin={{ left: 0, right: 16, top: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE8" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: T.muted }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 10, fill: T.muted }} axisLine={false} tickLine={false} tickFormatter={v => v.toFixed(0) + '€'} />
                <Tooltip contentStyle={{ fontSize: '0.78rem', borderRadius: '8px', border: '1px solid #E8E2D9' }} formatter={v => [v.toFixed(2) + ' €', 'Marge']} />
                <Line type="monotone" dataKey="marge" stroke={T.gold} strokeWidth={2} dot={{ r: 3, fill: T.gold }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* ── 3. Matrice 2×2 ── */}
      <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', padding: '1.5rem 1.5rem 1.25rem' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: T.text, marginBottom: '1.25rem' }}>
          Matrice Menu Engineering
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.75rem' }}>
          {['enigme', 'etoile', 'poids_mort', 'vache'].map(key => {
            const q = QUADRANTS[key];
            const plats = filtered.filter(r => r.quadrant === key);
            return (
              <div key={key} style={{ background: q.bg, border: `2px solid ${q.border}`, borderRadius: '12px', padding: '1rem 1.1rem', minHeight: '120px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.88rem', color: q.color }}>{q.icon} {q.label}</div>
                    <div style={{ fontSize: '0.65rem', color: T.muted, marginTop: '1px', letterSpacing: '0.02em' }}>{q.desc}</div>
                  </div>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: q.color, lineHeight: 1, background: 'rgba(255,255,255,0.65)', borderRadius: '8px', padding: '0 8px' }}>
                    {plats.length}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {plats.map(p => (
                    <div key={p.recetteId || p.nomPOS} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', paddingBottom: '4px', borderBottom: `1px solid ${q.border}`, gap: '4px' }}>
                      <span style={{ color: T.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{p.nomFiche}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        {p.margeUnitaire < 0 && (
                          <span style={{ fontSize: '0.58rem', fontWeight: 700, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FCA5A5', padding: '1px 4px', borderRadius: '3px', whiteSpace: 'nowrap' }}>
                            Marge négative
                          </span>
                        )}
                        <span style={{ color: q.color, fontWeight: 700, fontSize: '0.78rem' }}>
                          {p.margeUnitaire >= 0 ? '+' : ''}{p.margeUnitaire.toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  ))}
                  {plats.length === 0 && (
                    <div style={{ fontSize: '0.75rem', color: '#C4B9A8', fontStyle: 'italic', paddingTop: '2px' }}>Aucun plat dans ce quadrant</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', paddingTop: '4px' }}>
          <div style={{ fontSize: '0.64rem', color: '#B0A898', textAlign: 'center' }}>← Peu populaire · Populaire →</div>
          <div style={{ fontSize: '0.64rem', color: '#B0A898', textAlign: 'center' }}>← Peu populaire · Populaire →</div>
        </div>
        <div style={{ textAlign: 'center', fontSize: '0.64rem', color: '#B0A898', marginTop: '2px' }}>Axe vertical : Rentabilité (haut = marge élevée)</div>
      </div>

      {/* ── 4. Tableau détaillé ── */}
      <div style={{ background: '#fff', borderRadius: '14px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '2px solid #EFE9DF', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: T.text, margin: 0 }}>Analyse détaillée</h3>
          <span style={{ fontSize: '0.75rem', color: T.muted }}>{filtered.length} plat{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div className="me-tbl-wrap">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#F5F2EC' }}>
                {['Plat', 'Catégorie', 'Ventes', 'Part', 'Prix TTC', 'Coût mat.', 'Marge/u', 'Marge tot.', 'Action recommandée'].map(h => (
                  <th key={h} style={{
                    padding: '10px 14px',
                    textAlign: ['Plat', 'Catégorie', 'Action recommandée'].includes(h) ? 'left' : 'right',
                    fontSize: '0.63rem', fontWeight: 800, textTransform: 'uppercase',
                    letterSpacing: '0.06em', color: '#8C7E6E',
                    borderBottom: '2px solid #E8E2D9', whiteSpace: 'nowrap',
                  }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sortedRows.map((r, i) => {
                const q = QUADRANTS[r.quadrant] || QUADRANTS.poids_mort;
                const part = totalVentes > 0 ? (r.quantite / totalVentes * 100).toFixed(1) : '—';
                const rowId = r.recetteId || r.nomFiche;
                const isNeg = r.margeUnitaire < 0;
                const isHl = highlightedRow === rowId;
                return (
                  <tr key={i} id={`trow-${rowId}`}
                    className={isHl ? 'me-row-pulse' : ''}
                    style={{ borderBottom: '1px solid #F3EDE4', transition: 'background 0.1s' }}
                    onMouseEnter={e => { if (!isHl) e.currentTarget.style.background = '#FAFAF8'; }}
                    onMouseLeave={e => { if (!isHl) e.currentTarget.style.background = ''; }}
                  >
                    <td style={{ padding: '11px 14px', fontWeight: 700, color: T.text, whiteSpace: 'nowrap' }}>
                      <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: q.color, marginRight: '8px', verticalAlign: 'middle', flexShrink: 0 }} />
                      {r.nomFiche}
                    </td>
                    <td style={{ padding: '11px 14px', color: T.muted, fontSize: '0.76rem' }}>{r.categorieMenu}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 600, color: T.text }}>{r.quantite}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', color: T.muted, fontSize: '0.78rem' }}>{part}%</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', color: T.text }}>{r.prixVente > 0 ? r.prixVente.toFixed(2) + ' €' : '—'}</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', color: '#DC2626' }}>{r.coutMat.toFixed(2)} €</td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: isNeg ? '#DC2626' : T.green }}>
                      {r.margeUnitaire >= 0 ? '+' : ''}{r.margeUnitaire.toFixed(2)} €
                    </td>
                    <td style={{ padding: '11px 14px', textAlign: 'right', fontWeight: 700, fontFamily: "'Playfair Display', serif", color: r.margeTotal >= 0 ? T.text : '#DC2626' }}>
                      {r.margeTotal >= 0 ? '+' : ''}{r.margeTotal.toFixed(2)} €
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {isNeg ? (
                        <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 700, color: '#fff', background: '#DC2626', whiteSpace: 'nowrap' }}>
                          ⚠ Urgent — vous perdez de l'argent à chaque vente
                        </span>
                      ) : (
                        <span style={{ display: 'inline-block', padding: '3px 9px', borderRadius: '5px', fontSize: '0.72rem', fontWeight: 600, color: q.color, background: q.bg, border: `1px solid ${q.border}`, whiteSpace: 'nowrap' }}>
                          {q.icon} {RECOMMANDATIONS[r.quadrant]}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* ── 5. Ligne totale ── */}
            <tfoot>
              <tr style={{ background: '#F5F2EC', borderTop: '2px solid #E8E2D9' }}>
                <td colSpan={2} style={{ padding: '10px 14px', fontWeight: 700, color: T.text, fontSize: '0.82rem' }}>
                  Total — {filtered.length} plat{filtered.length !== 1 ? 's' : ''}
                </td>
                <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: T.text }}>{totalVentes}</td>
                <td style={{ padding: '10px 14px', textAlign: 'right', color: T.muted, fontSize: '0.78rem' }}>100%</td>
                <td colSpan={3} />
                <td style={{ padding: '10px 14px', textAlign: 'right', fontFamily: "'Playfair Display', serif", fontWeight: 700, fontSize: '1rem', color: totalMarge >= 0 ? T.green : '#DC2626' }}>
                  {totalMarge >= 0 ? '+' : ''}{totalMarge.toFixed(2)} €
                </td>
                <td style={{ padding: '10px 14px' }}>
                  {totalMarge < 0 && (
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#DC2626', whiteSpace: 'nowrap' }}>
                      ⚠ Attention — votre carte perd de l'argent sur cette période
                    </span>
                  )}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Navigation ── */}
      {onBack !== null && (
        <div style={{ paddingBottom: '0.5rem' }}>
          <button onClick={onBack}
            style={{ padding: '0.6rem 1.25rem', background: 'none', border: '1px solid #E5E0D8', borderRadius: '8px', cursor: 'pointer', color: T.muted, fontFamily: "'DM Sans', sans-serif", fontSize: '0.875rem' }}>
            ← Modifier le matching
          </button>
        </div>
      )}
    </div>
  );
}
