import { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, API_URL, authHeaders } from '../api.js';
import { calculerCoutIngredient } from '../conversions.js';

function norm(s) { return (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim(); }

function baseUnit(unite) {
  if (['kg', 'g', 'mg'].includes(unite)) return 'kg';
  if (['L', 'l', 'ml', 'cl', 'c.c.', 'c.s.', 'càc', 'càs'].includes(unite)) return 'L';
  return unite;
}

const CATEGORIES = ['viande', 'poisson', 'légume', 'produit laitier', 'épice', 'condiment', 'épicerie', 'épicerie fine', 'fruit', 'autre'];
const UNITES = ['kg', 'L', 'piece', 'g', 'ml', 'botte', 'c.s.', 'c.c.'];
const TVA_OPTIONS = [
  { value: 5.5, label: '5,5%' },
  { value: 10, label: '10%' },
  { value: 20, label: '20%' },
];

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280', red: '#DC2626' };
const card = { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };
const inputStyle = { padding: '0.4rem 0.6rem', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: T.text, width: '100%' };
const BADGE_COLORS = {
  'viande': ['#FEE2E2','#991B1B'], 'poisson': ['#DBEAFE','#1E40AF'], 'légume': ['#DCFCE7','#166534'],
  'produit laitier': ['#FEF3C7','#92400E'], 'épice': ['#F3E8FF','#6B21A8'], 'condiment': ['#FFE4E6','#9F1239'],
  'épicerie': ['#F0FDF4','#14532D'], 'épicerie fine': ['#FDF4FF','#701A75'], 'fruit': ['#FFF7ED','#9A3412'], 'autre': ['#F1F5F9','#334155'],
};

function Badge({ cat }) {
  const [bg, color] = BADGE_COLORS[cat] || ['#F1F5F9','#334155'];
  return <span style={{ fontSize: '0.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '99px', background: bg, color }}>{cat}</span>;
}

const EMPTY = { nom: '', categorie: 'épicerie', unite: 'kg', prixUnitaire: '', tva: 10, fournisseur: '', fournisseurs: [], rendement: 100 };

/* ─── Modal historique des prix ─────────────────────────────────────────── */
function HistoriqueModal({ item, onClose, recettes, params }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.historiquePrix.list(item.nom).then(d => setData(d.filter(e => e.prix > 0))).catch(() => {});
  }, [item.nom]);

  async function supprimerEntree(entry) {
    if (!confirm('Supprimer cette entrée de prix ?')) return;
    try {
      await api.historiquePrix.delete(entry.nom, entry.date);
      setData(prev => prev.filter(d => !(d.nom === entry.nom && d.date === entry.date)));
    } catch { alert('Erreur lors de la suppression'); }
  }

  const last = data[data.length - 1];

  function varSince(isoDate) {
    if (!last) return null;
    const ref = [...data].find(d => d.date >= isoDate);
    if (!ref || ref.prix === 0) return null;
    return (last.prix - ref.prix) / ref.prix * 100;
  }

  const today = new Date().toISOString().slice(0, 10);
  const m1 = new Date(); m1.setMonth(m1.getMonth() - 1);
  const m3 = new Date(); m3.setMonth(m3.getMonth() - 3);
  const m6 = new Date(); m6.setMonth(m6.getMonth() - 6);

  const stats = [
    { label: 'vs précédent', val: data.length >= 2 && data[data.length - 2].prix > 0 ? (last.prix - data[data.length - 2].prix) / data[data.length - 2].prix * 100 : null },
    { label: '1 mois', val: varSince(m1.toISOString().slice(0, 10)) },
    { label: '3 mois', val: varSince(m3.toISOString().slice(0, 10)) },
    { label: '6 mois', val: varSince(m6.toISOString().slice(0, 10)) },
  ].filter(s => s.val !== null);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: '16px', padding: '1.5rem', maxWidth: '580px', width: '92%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: T.text }}>Historique — {item.nom}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: '1.2rem', lineHeight: 1 }}>✕</button>
        </div>

        {data.length === 0 ? (
          <p style={{ color: T.muted, fontSize: '0.875rem', fontStyle: 'italic', padding: '1rem 0' }}>
            Aucun historique. Les variations seront enregistrées à chaque modification de prix.
          </p>
        ) : (
          <>
            {stats.length > 0 && (
              <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                {stats.map(({ label, val }) => (
                  <div key={label} style={{ background: val <= 0 ? '#DCFCE7' : '#FEE2E2', borderRadius: '8px', padding: '0.5rem 0.875rem', textAlign: 'center', minWidth: '80px' }}>
                    <div style={{ fontSize: '0.65rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: '2px' }}>{label}</div>
                    <div style={{ fontSize: '1rem', fontWeight: 700, color: val <= 0 ? '#16a34a' : '#dc2626' }}>
                      {val <= 0 ? '▼' : '▲'} {Math.abs(val).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            )}
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={data} margin={{ top: 4, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3EFE8" />
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.muted }} tickFormatter={v => {
                  const d = new Date(v);
                  return isNaN(d) ? v : `${d.getDate()}/${d.getMonth()+1} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}:${String(d.getSeconds()).padStart(2,'0')}`;
                }} />
                <YAxis tick={{ fontSize: 10, fill: T.muted }} domain={['auto', 'auto']} width={48} />
                <Tooltip formatter={(v, n, p) => [`${v.toFixed(2)} EUR/${p.payload.unite}`, 'Prix']} />
                <Line type="monotone" dataKey="prix" stroke={T.green} strokeWidth={2} dot={{ r: 3, fill: T.green }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  {['Date', 'Prix', 'Fournisseur', ''].map(h => (
                    <th key={h} style={{ textAlign: h === 'Prix' ? 'right' : 'left', padding: '4px 8px', color: T.muted, fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #F3EFE8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F9F7F4' }}>
                    <td style={{ padding: '4px 8px', color: T.muted }}>{d.date.length > 10 ? d.date.slice(0, 19).replace('T', ' ') : d.date}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: T.green }}>{d.prix.toFixed(2)} EUR/{d.unite}</td>
                    <td style={{ padding: '4px 8px', color: T.muted }}>{d.fournisseur || '—'}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right' }}>
                      <button onClick={() => supprimerEntree(d)}
                        style={{ padding: '2px 8px', fontSize: '0.72rem', background: 'none', border: '1px solid #FECACA', color: '#DC2626', cursor: 'pointer', borderRadius: '4px', fontFamily: "'DM Sans', sans-serif", fontWeight: 600 }}
                        onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                        onMouseLeave={e => e.currentTarget.style.background = 'none'}
                      >Supprimer</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ── Impact sur les fiches techniques ── */}
        {(() => {
          const norm = s => (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
          const tva = params?.tva ?? 10;
          const cible = params?.foodCostCible ?? 30;
          const impacted = (recettes || []).filter(r =>
            (r.ingredients || []).some(ing => norm(ing.nom) === norm(item.nom))
          );
          if (impacted.length === 0) return null;

          // Détecter hausse récente depuis l'historique chargé
          const prixPrecedent = data.length >= 2 ? data[data.length - 2].prix : null;
          const prixActuel = data.length >= 1 ? data[data.length - 1].prix : null;
          const hausse = prixPrecedent && prixActuel && prixActuel > prixPrecedent;

          return (
            <div style={{ marginTop: '1.25rem', paddingTop: '1.25rem', borderTop: '1px solid #F3EFE8' }}>
              <div style={{ fontSize: '0.72rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>
                Impact sur vos fiches
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {impacted.map(r => {
                  const ing = (r.ingredients || []).find(i => norm(i.nom) === norm(item.nom));
                  if (!ing) return null;
                  const portions = r.portions || 1;
                  const totalTTC = (r.ingredients || []).reduce((acc, i) =>
                    acc + calculerCoutIngredient(i.quantite, i.unite, i.prixUnitaire) * (1 + (i.tva ?? tva) / 100), 0
                  );
                  const coutPortionTTC = totalTTC / portions;
                  const pv = r.prixVentePratiqueTTC || 0;
                  const fc = pv > 0 ? (coutPortionTTC / pv * 100) : null;
                  const perteMarge = hausse && prixPrecedent && prixActuel
                    ? (calculerCoutIngredient(ing.quantite, ing.unite, prixActuel) - calculerCoutIngredient(ing.quantite, ing.unite, prixPrecedent)) / portions
                    : null;
                  const fcColor = !fc ? T.muted : fc < cible ? '#16a34a' : fc <= cible + 5 ? '#d97706' : '#dc2626';
                  return (
                    <div key={r.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.5rem 0.75rem', background: '#FAFAF8', borderRadius: '6px', border: '1px solid #F3EFE8', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 600, color: T.text, fontSize: '0.85rem', flex: 1 }}>{r.nom}</span>
                      <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexShrink: 0 }}>
                        <span style={{ fontSize: '0.78rem', color: T.muted }}>{coutPortionTTC.toFixed(2)} EUR/couvert</span>
                        {fc !== null && (
                          <span style={{ fontSize: '0.78rem', fontWeight: 700, color: fcColor }}>FC {fc.toFixed(1)}%</span>
                        )}
                        {perteMarge !== null && perteMarge > 0 && (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#dc2626', background: '#FEE2E2', padding: '1px 6px', borderRadius: '4px', border: '1px solid #FECACA', whiteSpace: 'nowrap' }}>
                            −{perteMarge.toFixed(3)} EUR/couvert
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}
      </div>
    </div>
  );
}

/* ─── Comparaison fournisseurs ───────────────────────────────────────────── */
function computeComparaisonCatalog(ingredients) {
  const byNom = {};
  ingredients.forEach(ing => {
    const key = (ing.nom || '').toLowerCase().trim();
    if (!key) return;
    if (!byNom[key]) byNom[key] = { nom: ing.nom, rows: [] };
    byNom[key].rows.push(ing);
  });
  return Object.values(byNom)
    .filter(g => {
      const fournisseurs = new Set(g.rows.map(r => (r.fournisseur || '—').toLowerCase().trim()));
      return fournisseurs.size >= 2;
    })
    .map(g => {
      const minPrix = Math.min(...g.rows.map(r => r.prixUnitaire));
      return {
        nom: g.nom,
        rows: g.rows
          .slice()
          .sort((a, b) => a.prixUnitaire - b.prixUnitaire)
          .map(r => ({ ...r, isBest: r.prixUnitaire === minPrix })),
      };
    })
    .sort((a, b) => a.nom.localeCompare(b.nom));
}

function ComparaisonFournisseurs({ items, onClose }) {
  const comparaison = computeComparaisonCatalog(items);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: T.text }}>Comparaison fournisseurs</h1>
          <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '2px' }}>Ingrédients présents plusieurs fois avec des fournisseurs différents</p>
        </div>
        <button onClick={onClose} style={{ padding: '0.5rem 1.25rem', border: '1px solid #E5E0D8', background: '#fff', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", color: T.text }}>
          ← Retour au catalogue
        </button>
      </div>
      {comparaison.length === 0 ? (
        <div style={{ ...card, padding: '2rem', textAlign: 'center' }}>
          <p style={{ color: T.muted, fontSize: '0.875rem' }}>
            Aucune comparaison disponible. Pour comparer les fournisseurs, créez plusieurs entrées avec le même nom d'ingrédient mais des fournisseurs différents.
          </p>
        </div>
      ) : (
        comparaison.map(({ nom, rows }) => (
          <div key={nom} style={{ ...card, padding: '1.25rem', marginBottom: '1rem' }}>
            <div style={{ fontFamily: "'Playfair Display', serif", fontWeight: 700, color: T.text, fontSize: '1rem', marginBottom: '0.75rem' }}>{nom}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #F3EFE8' }}>
                  {['Fournisseur', 'Prix actuel', 'Unité', ''].map(h => (
                    <th key={h} style={{ padding: '4px 8px', color: T.muted, fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', textAlign: h === 'Prix actuel' ? 'right' : 'left', borderBottom: '1px solid #F3EFE8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(r => (
                  <tr key={r.id} style={{ borderBottom: '1px solid #F9F7F4', background: r.isBest ? 'rgba(45,106,79,0.04)' : 'transparent' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 500, color: T.text }}>{r.fournisseur || <span style={{ color: '#D1C4B0' }}>—</span>}</td>
                    <td style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 700, color: r.isBest ? T.green : T.text }}>
                      {r.prixUnitaire.toFixed(2)} EUR HT
                    </td>
                    <td style={{ padding: '6px 8px', color: T.muted }}>{r.unite}</td>
                    <td style={{ padding: '6px 8px' }}>
                      {r.isBest && (
                        <span style={{ fontSize: '0.68rem', fontWeight: 700, padding: '2px 7px', borderRadius: '99px', background: 'rgba(45,106,79,0.1)', color: T.green, border: '1px solid rgba(45,106,79,0.25)', whiteSpace: 'nowrap' }}>
                          Meilleur prix
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      )}
    </div>
  );
}

export default function Ingredients() {
  const [items, setItems] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [ficheFilter, setFicheFilter] = useState('');
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(EMPTY);
  const [sortField, setSortField] = useState('nom');
  const [sortDir, setSortDir] = useState('asc');
  const [missingFromCatalog, setMissingFromCatalog] = useState([]);
  const [showNomSuggestions, setShowNomSuggestions] = useState(false);
  const [histItem, setHistItem] = useState(null);
  const [dupWarning, setDupWarning] = useState(null);
  const [showComparaison, setShowComparaison] = useState(false);
  const [recettes, setRecettes] = useState([]);
  const [params, setParams] = useState({ foodCostCible: 30, tva: 10 });
  const autoSaveTimer = useRef(null);
  const latestEdit = useRef({ id: null, form: {} });

  function handleSort(field) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  }

  useEffect(() => {
    Promise.all([
      api.ingredients.list(),
      api.recettes.list().catch(() => []),
      api.parametres.get().catch(() => ({ foodCostCible: 30, tva: 10 })),
    ]).then(([ings, recs, prms]) => {
      setItems(ings);
      setRecettes(recs);
      setParams(prms);
      const catalogNorms = new Set(ings.map(i => i.nom.toLowerCase()));
      const missing = new Set();
      recs.forEach(r => (r.ingredients || []).forEach(i => {
        if (i.nom?.trim() && !catalogNorms.has(i.nom.toLowerCase())) missing.add(i.nom.trim());
      }));
      setMissingFromCatalog([...missing].sort());
    });
  }, []);

  function pushUndo(snapshot) {
    setUndoStack(prev => [...prev.slice(-9), snapshot]);
  }

  function undo() {
    if (undoStack.length === 0) return;
    const prev = undoStack[undoStack.length - 1];
    setUndoStack(s => s.slice(0, -1));
    setItems(prev);
    setEditId(null); setEditForm({});
    clearTimeout(autoSaveTimer.current);
  }

  const ficheFilterNorms = ficheFilter
    ? new Set((recettes.find(r => r.id === ficheFilter)?.ingredients || []).map(fi => norm(fi.nom)))
    : null;

  const filtered = items
    .filter(i =>
      i.nom.toLowerCase().includes(recherche.toLowerCase()) &&
      (catFilter === '' || i.categorie === catFilter) &&
      (!ficheFilterNorms || ficheFilterNorms.has(norm(i.nom)))
    )
    .sort((a, b) => {
      const av = sortField === 'prixUnitaire' ? a.prixUnitaire : (a[sortField] || '').toLowerCase();
      const bv = sortField === 'prixUnitaire' ? b.prixUnitaire : (b[sortField] || '').toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

  function startEdit(item) {
    clearTimeout(autoSaveTimer.current);
    const form = {
      nom: item.nom, categorie: item.categorie, unite: item.unite,
      prixUnitaire: item.prixUnitaire, tva: item.tva ?? 10,
      fournisseur: item.fournisseur || '',
      fournisseurs: item.fournisseurs || [],
      rendement: item.rendement ?? 100,
    };
    setEditId(item.id);
    setEditForm(form);
    latestEdit.current = { id: item.id, form };
  }

  function cancelEdit() {
    clearTimeout(autoSaveTimer.current);
    setEditId(null); setEditForm({});
  }

  function updateEditForm(updater) {
    setEditForm(prev => {
      const newForm = typeof updater === 'function' ? updater(prev) : { ...prev, ...updater };
      latestEdit.current = { id: latestEdit.current.id, form: newForm };
      clearTimeout(autoSaveTimer.current);
      autoSaveTimer.current = setTimeout(() => {
        const { id, form } = latestEdit.current;
        if (!id) return;
        api.ingredients.update(id, { ...form, prixUnitaire: parseFloat(form.prixUnitaire) || 0, tva: parseFloat(form.tva) || 10 })
          .then(updated => {
            setItems(prev2 => {
              pushUndo(prev2);
              return prev2.map(i => i.id === id ? updated : i);
            });
          });
      }, 800);
      return newForm;
    });
  }

  function saveEdit(id) {
    clearTimeout(autoSaveTimer.current);
    api.ingredients.update(id, { ...editForm, prixUnitaire: parseFloat(editForm.prixUnitaire) || 0, tva: parseFloat(editForm.tva) || 10 })
      .then(updated => {
        pushUndo(items);
        setItems(prev => prev.map(i => i.id === id ? updated : i));
        cancelEdit();
      });
  }

  function supprimer(id) {
    if (!confirm('Supprimer cet ingrédient ?')) return;
    pushUndo(items);
    api.ingredients.delete(id).then(() => setItems(prev => prev.filter(i => i.id !== id)));
  }

  function ajouter(forceCreate = false) {
    if (!addForm.nom.trim()) return;
    if (!forceCreate) {
      const similar = items.find(i => i.nom.toLowerCase() === addForm.nom.toLowerCase().trim());
      if (similar) { setDupWarning(similar); return; }
    }
    setDupWarning(null);
    api.ingredients.create({ ...addForm, prixUnitaire: parseFloat(addForm.prixUnitaire) || 0, tva: parseFloat(addForm.tva) || 10 })
      .then(item => {
        pushUndo(items);
        setItems(prev => [...prev, item]);
        setMissingFromCatalog(prev => prev.filter(n => n.toLowerCase() !== addForm.nom.toLowerCase()));
        setAddForm(EMPTY);
        setShowAdd(false);
      });
  }

  function updateDuplicate() {
    if (!dupWarning) return;
    const updatedData = {
      ...dupWarning,
      ...(addForm.prixUnitaire ? { prixUnitaire: parseFloat(addForm.prixUnitaire) || 0 } : {}),
      ...(addForm.fournisseur ? { fournisseur: addForm.fournisseur } : {}),
    };
    api.ingredients.update(dupWarning.id, updatedData).then(updated => {
      pushUndo(items);
      setItems(prev => prev.map(i => i.id === dupWarning.id ? updated : i));
      setDupWarning(null);
      setAddForm(EMPTY);
      setShowAdd(false);
    });
  }

  const nomSuggestions = missingFromCatalog.filter(n =>
    addForm.nom.length === 0 || n.toLowerCase().includes(addForm.nom.toLowerCase())
  ).slice(0, 8);

  const catalogSimilar = (showNomSuggestions && addForm.nom.trim().length >= 2 && !dupWarning)
    ? items.filter(i => i.nom.toLowerCase().includes(addForm.nom.toLowerCase().trim())).slice(0, 4)
    : [];

  const thStyle = { padding: '0.6rem 1rem', color: T.muted, fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid #F3EFE8', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: T.text, borderBottom: '1px solid #F9F7F4' };
  const btnSm = { padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" };

  return (
    <div>
      {histItem && <HistoriqueModal item={histItem} onClose={() => setHistItem(null)} recettes={recettes} params={params} />}

      {showComparaison ? (
        <ComparaisonFournisseurs items={items} onClose={() => setShowComparaison(false)} />
      ) : (<>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: T.text }}>Ingrédients</h1>
          <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '2px' }}>{items.length} ingrédient{items.length !== 1 ? 's' : ''} dans le catalogue</p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          {undoStack.length > 0 && (
            <button onClick={undo} style={{ ...btnSm, border: '1px solid #E5E0D8', background: '#fff', color: T.text, display: 'flex', alignItems: 'center', gap: '4px' }}>
              ↩ Annuler
            </button>
          )}
          <button
            onClick={() => setShowComparaison(c => !c)}
            style={{ padding: '0.55rem 1.25rem', background: showComparaison ? T.gold : '#fff', color: showComparaison ? '#fff' : T.muted, border: '1px solid #E5E0D8', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          >⚖️ Fournisseurs</button>
          <button
            onClick={() => { setShowAdd(true); setEditId(null); }}
            style={{ padding: '0.55rem 1.25rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
            onMouseLeave={e => e.currentTarget.style.background = T.green}
          >+ Ajouter</button>
        </div>
      </div>

      <ImportFacture items={items} setItems={setItems} />

      {/* Filtres */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
        <input
          type="search" placeholder="Rechercher un ingrédient..."
          value={recherche} onChange={e => setRecherche(e.target.value)}
          style={{ ...inputStyle, width: '260px' }}
        />
        <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
          style={{ ...inputStyle, width: 'auto', cursor: 'pointer' }}>
          <option value="">Toutes les catégories</option>
          {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {recettes.length > 0 && (
          <select value={ficheFilter} onChange={e => setFicheFilter(e.target.value)}
            style={{ ...inputStyle, width: 'auto', cursor: 'pointer', borderColor: ficheFilter ? '#2D6A4F' : '#E5E0D8' }}>
            <option value="">Toutes les fiches</option>
            {[...recettes].sort((a, b) => a.nom.localeCompare(b.nom)).map(r => (
              <option key={r.id} value={r.id}>{r.nom}</option>
            ))}
          </select>
        )}
      </div>

      {/* Tableau */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#FAFAF8' }}>
            <tr>
              {[
                { label: 'Nom', field: 'nom' },
                { label: 'Catégorie', field: 'categorie' },
                { label: 'Unité', field: 'unite' },
                { label: 'Prix unitaire', field: 'prixUnitaire' },
                { label: 'Fournisseur', field: 'fournisseur' },
              ].map(({ label, field }) => (
                <th key={field} style={{ ...thStyle, cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort(field)}>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                    {label}
                    {sortField === field && (
                      <span style={{ color: T.green, fontSize: '0.85rem', lineHeight: 1 }}>{sortDir === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </span>
                </th>
              ))}
              <th style={thStyle}>TVA</th>
              <th style={thStyle}>Rendement matière (%)</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              editId === item.id ? (
                <tr key={item.id} style={{ background: 'rgba(45,106,79,0.03)' }}>
                  <td style={tdStyle}><input value={editForm.nom} onChange={e => updateEditForm(f => ({ ...f, nom: e.target.value }))} style={inputStyle} /></td>
                  <td style={tdStyle}>
                    <select value={editForm.categorie} onChange={e => updateEditForm(f => ({ ...f, categorie: e.target.value }))} style={inputStyle}>
                      {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <select value={editForm.unite} onChange={e => updateEditForm(f => ({ ...f, unite: e.target.value }))} style={inputStyle}>
                      {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" step="0.01" value={editForm.prixUnitaire} onChange={e => updateEditForm(f => ({ ...f, prixUnitaire: e.target.value }))} style={{ ...inputStyle, width: '90px' }} />
                      <span style={{ color: T.muted, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>EUR HT / {baseUnit(editForm.unite)}</span>
                    </div>
                  </td>
                  <td style={tdStyle}>
                    <input
                      placeholder="ex: Metro"
                      value={editForm.fournisseur}
                      onChange={e => updateEditForm(f => ({ ...f, fournisseur: e.target.value }))}
                      style={{ ...inputStyle, width: '110px' }}
                    />
                  </td>
                  <td style={tdStyle}>
                    <select value={editForm.tva ?? 10} onChange={e => updateEditForm(f => ({ ...f, tva: parseFloat(e.target.value) }))} style={{ ...inputStyle, width: '70px' }}>
                      {TVA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <input type="number" min="1" max="100" step="1" value={editForm.rendement ?? 100}
                        onChange={e => updateEditForm(f => ({ ...f, rendement: parseFloat(e.target.value) || 100 }))}
                        style={{ ...inputStyle, width: '60px' }} />
                      <span style={{ color: T.muted, fontSize: '0.8rem' }}>%</span>
                    </div>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button onClick={cancelEdit} style={{ ...btnSm, border: '1px solid #E5E0D8', background: '#fff' }}>Annuler</button>
                      <button onClick={() => saveEdit(item.id)} style={{ ...btnSm, border: 'none', background: T.green, color: '#fff', fontWeight: 600 }}>Sauver</button>
                    </div>
                  </td>
                </tr>
              ) : (
                <tr key={item.id} onClick={() => startEdit(item)} style={{ cursor: 'pointer', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={tdStyle}><span style={{ fontWeight: 500 }}>{item.nom}</span></td>
                  <td style={tdStyle}><Badge cat={item.categorie} /></td>
                  <td style={{ ...tdStyle, color: T.muted }}>{item.unite}</td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 700, color: T.green }}>{item.prixUnitaire.toFixed(2)}</span>
                    <span style={{ color: T.muted, fontSize: '0.8rem', marginLeft: '4px' }}>EUR HT / {baseUnit(item.unite)}</span>
                  </td>
                  <td style={{ ...tdStyle, color: T.muted, fontSize: '0.82rem' }}>
                    {item.fournisseur || <span style={{ color: '#D1C4B0' }}>—</span>}
                  </td>
                  <td style={{ ...tdStyle, color: T.muted, fontSize: '0.82rem' }}>
                    {(item.tva ?? 10) + '%'}
                  </td>
                  <td style={{ ...tdStyle, fontSize: '0.82rem' }}>
                    {(item.rendement ?? 100) < 100
                      ? <span style={{ fontWeight: 600, color: '#d97706' }}>{item.rendement}%</span>
                      : <span style={{ color: '#D1C4B0' }}>—</span>
                    }
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        onClick={() => setHistItem(item)}
                        style={{ ...btnSm, border: '1px solid #E5E0D8', background: '#fff', color: T.muted, fontSize: '0.75rem' }}
                        title="Historique des prix"
                      >📈 Prix</button>
                      <button onClick={() => supprimer(item.id)} style={{ background: 'none', border: 'none', color: '#D1C4B0', cursor: 'pointer', fontSize: '1rem', padding: '2px 6px', borderRadius: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                        onMouseLeave={e => e.currentTarget.style.color = '#D1C4B0'}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              )
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={8} style={{ ...tdStyle, textAlign: 'center', color: T.muted, padding: '2rem' }}>Aucun ingrédient trouvé</td></tr>
            )}
          </tbody>
          {/* Formulaire ajout */}
          {showAdd && (
            <tfoot>
              {dupWarning && (
                <tr style={{ background: '#FFF7ED', borderTop: '2px solid #FED7AA' }}>
                  <td colSpan={8} style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', color: '#92400e', flex: 1 }}>
                        ⚠️ Un ingrédient similaire existe déjà : <strong>{dupWarning.nom}</strong> ({dupWarning.prixUnitaire} EUR HT/{dupWarning.unite}
                        {dupWarning.fournisseur ? ` · ${dupWarning.fournisseur}` : ''}).
                        Mettre à jour son prix plutôt que créer un doublon ?
                      </span>
                      <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                        <button onClick={updateDuplicate} style={{ ...btnSm, border: 'none', background: '#d97706', color: '#fff', fontWeight: 600 }}>
                          Mettre à jour
                        </button>
                        <button onClick={() => { setDupWarning(null); ajouter(true); }} style={{ ...btnSm, border: '1px solid #E5E0D8', background: '#fff' }}>
                          Créer quand même
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              )}
              {catalogSimilar.length > 0 && (
                <tr style={{ background: '#F0FDF4', borderTop: '1px solid #BBF7D0' }}>
                  <td colSpan={8} style={{ padding: '0.5rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', color: '#166534', fontWeight: 600, whiteSpace: 'nowrap' }}>Déjà dans le catalogue :</span>
                      {catalogSimilar.map(it => (
                        <button key={it.id} type="button"
                          onMouseDown={() => { startEdit(it); setShowAdd(false); setDupWarning(null); }}
                          style={{ padding: '2px 8px', borderRadius: '4px', background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC', fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                        >
                          {it.nom} · {it.prixUnitaire} EUR HT/{it.unite}{it.fournisseur ? ` · ${it.fournisseur}` : ''} — Sélectionner
                        </button>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              {showNomSuggestions && nomSuggestions.length > 0 && (
                <tr style={{ background: '#FFFBF5', borderTop: '1px solid #F3EFE8' }}>
                  <td colSpan={8} style={{ padding: '0.5rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.72rem', color: '#9CA3AF', whiteSpace: 'nowrap' }}>Utilisé dans des fiches :</span>
                      {nomSuggestions.map(name => (
                        <button key={name} type="button"
                          onMouseDown={() => { setAddForm(f => ({ ...f, nom: name })); setShowNomSuggestions(false); }}
                          style={{ padding: '2px 8px', borderRadius: '4px', background: '#FFF7ED', color: '#9A3412', border: '1px solid #FED7AA', fontSize: '0.72rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
                        >⚠️ {name}</button>
                      ))}
                    </div>
                  </td>
                </tr>
              )}
              <tr style={{ background: 'rgba(45,106,79,0.04)', borderTop: '2px solid #E5E0D8' }}>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <input placeholder="Nom *" value={addForm.nom}
                    onChange={e => { setAddForm(f => ({ ...f, nom: e.target.value })); setShowNomSuggestions(true); setDupWarning(null); }}
                    onFocus={() => setShowNomSuggestions(true)}
                    onBlur={() => setTimeout(() => setShowNomSuggestions(false), 150)}
                    style={inputStyle} autoFocus />
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <select value={addForm.categorie} onChange={e => setAddForm(f => ({ ...f, categorie: e.target.value }))} style={inputStyle}>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <select value={addForm.unite} onChange={e => setAddForm(f => ({ ...f, unite: e.target.value }))} style={inputStyle}>
                    {UNITES.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="number" step="0.01" placeholder="0.00" value={addForm.prixUnitaire}
                      onChange={e => setAddForm(f => ({ ...f, prixUnitaire: e.target.value }))} style={{ ...inputStyle, width: '90px' }} />
                    <span style={{ color: T.muted, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>EUR HT / {baseUnit(addForm.unite)}</span>
                  </div>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <input placeholder="Fournisseur" value={addForm.fournisseur}
                    onChange={e => setAddForm(f => ({ ...f, fournisseur: e.target.value }))} style={{ ...inputStyle, width: '110px' }} />
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <select value={addForm.tva ?? 10} onChange={e => setAddForm(f => ({ ...f, tva: parseFloat(e.target.value) }))} style={{ ...inputStyle, width: '70px' }}>
                    {TVA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td style={{ padding: '0.75rem 1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <input type="number" min="1" max="100" step="1" placeholder="100"
                      value={addForm.rendement === 100 ? '' : (addForm.rendement ?? '')}
                      onChange={e => setAddForm(f => ({ ...f, rendement: parseFloat(e.target.value) || 100 }))}
                      style={{ ...inputStyle, width: '60px' }} />
                    <span style={{ color: T.muted, fontSize: '0.8rem' }}>%</span>
                  </div>
                </td>
                <td style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>
                  <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                    <button onClick={() => setShowAdd(false)} style={{ ...btnSm, border: '1px solid #E5E0D8', background: '#fff' }}>Annuler</button>
                    <button onClick={ajouter} style={{ ...btnSm, border: 'none', background: T.green, color: '#fff', fontWeight: 600 }}>Ajouter</button>
                  </div>
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>

      {!showAdd && (
        <button onClick={() => { setShowAdd(true); setEditId(null); }} style={{ marginTop: '0.75rem', background: 'none', border: '1px dashed #C9A84C', color: T.muted, borderRadius: '8px', padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}>
          + Ajouter un ingrédient
        </button>
      )}
      </>)}
    </div>
  );
}

/* ─── Import Facture IA ──────────────────────────────────────────────────── */
function ImportFacture({ items, setItems }) {
  const [file, setFile] = useState(null);
  const [fournisseur, setFournisseur] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState([]);
  const [toast, setToast] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [aliases, setAliases] = useState([]);
  const [impactReport, setImpactReport] = useState(null);
  const fileRef = useRef(null);

  const UNITES_IA = ['kg', 'L', 'piece', 'g', 'ml', 'botte', 'c.s.', 'c.c.'];
  const inStyle = { border: '1px solid #E5E0D8', borderRadius: '4px', padding: '0.3rem 0.5rem', fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", outline: 'none' };

  useEffect(() => {
    api.aliases.list().then(setAliases).catch(() => {});
  }, []);

  function resolveAlias(nom) {
    const n = nom.toLowerCase();
    const alias = aliases.find(a => a.from.toLowerCase() === n);
    return alias ? alias.to : nom;
  }

  function handleFile(f) {
    if (!f) return;
    if (f.size > 10 * 1024 * 1024) { alert('Fichier trop volumineux (max 10 Mo)'); return; }
    setFile(f); setResults(null); setSelected([]);
  }

  async function analyser() {
    if (!file) return;
    setLoading(true);
    const fd = new FormData();
    fd.append('facture', file);
    if (fournisseur.trim()) fd.append('fournisseur', fournisseur.trim());
    try {
      const res = await fetch(`${API_URL}/ia/analyser-facture`, { method: 'POST', headers: { ...authHeaders() }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      if (!fournisseur.trim() && data.fournisseur) {
        setFournisseur(data.fournisseur);
      }
      const produits = (data.produits || []).map((p, i) => {
        const resolvedNom = resolveAlias(p.nom);
        const match = items.find(it => it.nom.toLowerCase() === resolvedNom.toLowerCase());
        return {
          ...p,
          _id: i,
          _action: match ? 'associate' : 'create',
          _associateId: match?.id || null,
        };
      });
      setResults(produits);
      setSelected(produits.map(p => p._id));
    } catch (err) {
      alert('Erreur : ' + err.message);
    } finally {
      setLoading(false);
    }
  }

  function updateResult(id, field, value) {
    const strFields = ['nom', 'unite', '_action', '_associateId'];
    setResults(prev => prev.map(p =>
      p._id === id ? { ...p, [field]: strFields.includes(field) ? value : parseFloat(value) || 0 } : p
    ));
  }

  function toggleSelect(id) {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  }

  async function importer() {
    const toImport = results.filter(p => selected.includes(p._id));
    let count = 0;
    const newAliases = [];
    const updatedIngredients = [];

    const fournisseurImport = fournisseur.trim() || null;
    for (const p of toImport) {
      if (p._action === 'associate' && p._associateId) {
        const existant = items.find(i => i.id === p._associateId);
        if (existant) {
          const oldPrix = existant.prixUnitaire;
          const newPrix = p.prix_unitaire;
          const updatedData = { ...existant, prixUnitaire: newPrix };
          if (fournisseurImport) updatedData.fournisseur = fournisseurImport;
          const updated = await api.ingredients.update(existant.id, updatedData);
          setItems(prev => prev.map(i => i.id === existant.id ? updated : i));
          if (existant.nom.toLowerCase() !== p.nom.toLowerCase()) {
            newAliases.push({ from: p.nom, to: existant.nom });
          }
          if (oldPrix !== newPrix) {
            updatedIngredients.push({ id: existant.id, nom: existant.nom, oldPrix, newPrix, unite: existant.unite });
          }
        }
      } else {
        const item = await api.ingredients.create({ nom: p.nom, categorie: 'épicerie', unite: p.unite || 'kg', prixUnitaire: p.prix_unitaire, ...(fournisseurImport ? { fournisseur: fournisseurImport } : {}) });
        setItems(prev => [...prev, item]);
      }
      count++;
    }

    for (const a of newAliases) {
      await api.aliases.create(a);
    }
    if (newAliases.length > 0) setAliases(prev => [...prev, ...newAliases]);

    if (updatedIngredients.length > 0) {
      try {
        const [recettes, params] = await Promise.all([
          api.recettes.list(),
          api.parametres.get().catch(() => ({ foodCostCible: 30, tva: 10 })),
        ]);
        const updatedNoms = new Set(updatedIngredients.map(u => u.nom.toLowerCase()));
        const impacted = recettes.filter(r =>
          (r.ingredients || []).some(ing => updatedNoms.has((ing.nom || '').toLowerCase()))
        );
        const tva = params.tva || 10;
        const cible = params.foodCostCible || 30;
        const report = impacted.map(r => {
          const portions = r.portions || 1;
          const calc = (prixFn) => (r.ingredients || []).reduce((acc, ing) => {
            const upd = updatedIngredients.find(u => u.nom.toLowerCase() === (ing.nom || '').toLowerCase());
            return acc + ing.quantite * (upd ? prixFn(upd) : ing.prixUnitaire);
          }, 0);
          const oldCout = calc(u => u.oldPrix);
          const newCout = calc(u => u.newPrix);
          const oldCoutPortion = oldCout / portions;
          const newCoutPortion = newCout / portions;
          const pv = r.prixVentePratiqueTTC || 0;
          const oldFC = pv > 0 ? (oldCoutPortion * (1 + tva / 100) / pv * 100) : null;
          const newFC = pv > 0 ? (newCoutPortion * (1 + tva / 100) / pv * 100) : null;
          const pvSuggere = newCoutPortion > 0 ? parseFloat((newCoutPortion * (1 + tva / 100) / (cible / 100)).toFixed(2)) : null;
          return { recette: r, pv, oldCoutPortion, newCoutPortion, oldFC, newFC, pvSuggere, cible, exceedsCible: newFC !== null && newFC > cible };
        });
        setImpactReport({ report, updatedIngredients });
      } catch (e) {
        console.error('Impact report error:', e);
      }
    }

    setToast(`${count} ingrédient${count > 1 ? 's' : ''} importé${count > 1 ? 's' : ''} ✓`);
    setTimeout(() => setToast(''), 3500);
    setResults(null); setFile(null); setSelected([]); setFournisseur('');
  }

  async function appliquerPrixSuggere(item) {
    await api.recettes.update(item.recette.id, { ...item.recette, prixVentePratiqueTTC: item.pvSuggere });
    setImpactReport(prev => ({
      ...prev,
      report: prev.report.map(r => r.recette.id === item.recette.id ? { ...r, applied: true } : r),
    }));
  }

  const dropZoneStyle = {
    border: `2px dashed ${dragOver ? '#2D6A4F' : '#C9A84C'}`,
    borderRadius: '12px', padding: '2rem', textAlign: 'center',
    background: dragOver ? 'rgba(45,106,79,0.05)' : 'rgba(201,168,76,0.04)',
    cursor: 'pointer', transition: 'all 0.15s',
  };

  return (
    <div style={{ marginTop: '2.5rem', marginBottom: '2.5rem' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: '#2D6A4F', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 500 }}>
          {toast}
        </div>
      )}

      {impactReport && impactReport.report.length > 0 && (
        <div style={{ marginBottom: '2rem', ...card, padding: '1.5rem', border: '1px solid #FED7AA' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <div>
              <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: T.text }}>
                Impact sur les fiches techniques
              </h3>
              <p style={{ fontSize: '0.8rem', color: T.muted, marginTop: '2px' }}>
                {impactReport.updatedIngredients.map(u => `${u.nom} : ${u.oldPrix.toFixed(2)} → ${u.newPrix.toFixed(2)} EUR/${u.unite}`).join(' · ')}
              </p>
            </div>
            <button onClick={() => setImpactReport(null)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: '1.1rem' }}>✕</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F3EFE8' }}>
                {['Fiche', 'Ancien food cost', 'Nouveau food cost', 'PV actuel', 'PV suggéré', ''].map(h => (
                  <th key={h} style={{ padding: '4px 8px', color: T.muted, fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {impactReport.report.map(item => {
                const fcColor = !item.newFC ? T.muted : item.newFC < item.cible ? '#16a34a' : item.newFC < item.cible + 5 ? '#d97706' : '#dc2626';
                return (
                  <tr key={item.recette.id} style={{ borderBottom: '1px solid #F9F7F4', background: item.exceedsCible ? 'rgba(220,38,38,0.03)' : 'transparent' }}>
                    <td style={{ padding: '6px 8px', fontWeight: 600, color: T.text }}>{item.recette.nom}</td>
                    <td style={{ padding: '6px 8px', color: T.muted }}>{item.oldFC !== null ? item.oldFC.toFixed(1) + '%' : '—'}</td>
                    <td style={{ padding: '6px 8px', fontWeight: 700, color: fcColor }}>{item.newFC !== null ? item.newFC.toFixed(1) + '%' : '—'}</td>
                    <td style={{ padding: '6px 8px', color: T.muted }}>{item.pv > 0 ? item.pv.toFixed(2) + ' €' : '—'}</td>
                    <td style={{ padding: '6px 8px', fontWeight: 600, color: item.exceedsCible ? '#d97706' : T.muted }}>
                      {item.pvSuggere ? item.pvSuggere.toFixed(2) + ' €' : '—'}
                    </td>
                    <td style={{ padding: '6px 8px' }}>
                      {item.exceedsCible && item.pvSuggere && !item.applied && (
                        <button onClick={() => appliquerPrixSuggere(item)}
                          style={{ padding: '2px 10px', fontSize: '0.75rem', background: '#d97706', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 600, whiteSpace: 'nowrap' }}>
                          Appliquer
                        </button>
                      )}
                      {item.applied && <span style={{ fontSize: '0.75rem', color: T.green, fontWeight: 600 }}>✓ Appliqué</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {!results && (
        <>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', background: 'linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.02) 100%)', border: `1.5px solid ${dragOver ? '#C9A84C' : 'rgba(201,168,76,0.25)'}`, borderRadius: '12px', cursor: 'pointer', transition: 'all 0.15s' }}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = '#C9A84C'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,168,76,0.1) 0%, rgba(201,168,76,0.04) 100%)'; }}
            onMouseLeave={e => { if (!dragOver) { e.currentTarget.style.borderColor = 'rgba(201,168,76,0.25)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(201,168,76,0.06) 0%, rgba(201,168,76,0.02) 100%)'; } }}
          >
            <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: '#C9A84C', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.25rem' }}>📄</div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                <span style={{ fontWeight: 700, fontSize: '0.9rem', color: T.text }}>Importer une facture fournisseur</span>
                <span style={{ fontSize: '0.65rem', background: 'rgba(201,168,76,0.15)', color: '#8B6914', border: '1px solid rgba(201,168,76,0.3)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.04em' }}>IA</span>
                {aliases.length > 0 && <span style={{ fontSize: '0.7rem', color: T.muted, flexShrink: 0 }}>{aliases.length} alias</span>}
              </div>
              <p style={{ margin: 0, fontSize: '0.78rem', color: T.muted }}>Glissez ou cliquez — JPG, PNG, PDF · l'IA met à jour vos prix automatiquement</p>
            </div>
            <span style={{ color: '#C9A84C', fontSize: '1.1rem', flexShrink: 0, fontWeight: 700 }}>→</span>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          </div>
          {file && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.5rem 1rem', background: '#F8F6F1', borderRadius: '8px', border: '1px solid #E5E0D8' }}>
                <span style={{ fontSize: '0.82rem', color: T.text, flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>📎 {file.name}</span>
                <button onClick={() => setFile(null)} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: '0.9rem', padding: '2px', flexShrink: 0, lineHeight: 1 }}>✕</button>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ flex: 1, position: 'relative' }}>
                  <input
                    type="text"
                    placeholder="Fournisseur (optionnel — l'IA le détectera si vide)"
                    value={fournisseur}
                    onChange={e => setFournisseur(e.target.value)}
                    style={{ ...inStyle, width: '100%', paddingLeft: '0.75rem', fontSize: '0.85rem' }}
                  />
                </div>
                <button onClick={analyser} disabled={loading} style={{ padding: '0.4rem 1.25rem', background: T.green, color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 600, cursor: loading ? 'default' : 'pointer', fontSize: '0.82rem', fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.8 : 1, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {loading ? '⏳ Analyse...' : 'Analyser'}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {results && (
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F3EFE8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 600, color: T.text }}>{results.length} produit{results.length !== 1 ? 's' : ''} détecté{results.length !== 1 ? 's' : ''}</span>
              {fournisseur && (
                <span style={{ marginLeft: '10px', fontSize: '0.75rem', fontWeight: 600, color: T.green, background: 'rgba(45,106,79,0.08)', padding: '2px 8px', borderRadius: '4px', border: '1px solid rgba(45,106,79,0.2)' }}>
                  {fournisseur}
                </span>
              )}
              <span style={{ fontSize: '0.75rem', color: T.muted, marginLeft: '10px' }}>Choisissez l'action pour chaque produit avant d'importer</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={() => { setResults(null); setFile(null); }} style={{ padding: '0.35rem 0.85rem', border: '1px solid #E5E0D8', background: '#fff', borderRadius: '6px', cursor: 'pointer', fontSize: '0.82rem' }}>Annuler</button>
              <button onClick={importer} disabled={selected.length === 0} style={{ padding: '0.35rem 0.85rem', border: 'none', background: T.green, color: '#fff', borderRadius: '6px', cursor: selected.length === 0 ? 'default' : 'pointer', fontSize: '0.82rem', fontWeight: 600, opacity: selected.length === 0 ? 0.5 : 1 }}>
                Valider ({selected.length})
              </button>
            </div>
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', minWidth: '700px' }}>
              <thead style={{ background: '#FAFAF8' }}>
                <tr>
                  <th style={{ padding: '0.6rem 1rem', width: '40px' }}>
                    <input type="checkbox" checked={selected.length === results.length} onChange={() => setSelected(selected.length === results.length ? [] : results.map(p => p._id))} />
                  </th>
                  {['Nom facture', 'Qté', 'Unité', 'Prix/unité', 'Action'].map(h => (
                    <th key={h} style={{ padding: '0.6rem 1rem', textAlign: 'left', color: T.muted, fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.map(p => (
                  <tr key={p._id} style={{ borderBottom: '1px solid #F9F7F4', background: selected.includes(p._id) ? '#fff' : '#FAFAF8' }}>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <input type="checkbox" checked={selected.includes(p._id)} onChange={() => toggleSelect(p._id)} />
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <input value={p.nom} onChange={e => updateResult(p._id, 'nom', e.target.value)} style={{ ...inStyle, width: '140px' }} />
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <input type="number" value={p.quantite} onChange={e => updateResult(p._id, 'quantite', e.target.value)} style={{ ...inStyle, width: '60px' }} />
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <select value={p.unite} onChange={e => updateResult(p._id, 'unite', e.target.value)} style={inStyle}>
                        {UNITES_IA.map(u => <option key={u}>{u}</option>)}
                      </select>
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <input type="number" step="0.01" value={p.prix_unitaire} onChange={e => updateResult(p._id, 'prix_unitaire', e.target.value)} style={{ ...inStyle, width: '80px' }} />
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <select
                          value={p._action}
                          onChange={e => {
                            const action = e.target.value;
                            const match = items.find(it => it.nom.toLowerCase() === p.nom.toLowerCase());
                            updateResult(p._id, '_action', action);
                            if (action === 'associate' && !p._associateId) {
                              updateResult(p._id, '_associateId', match?.id || items[0]?.id || null);
                            }
                          }}
                          style={{ ...inStyle, fontWeight: 600, color: p._action === 'associate' ? '#d97706' : '#16a34a', background: p._action === 'associate' ? '#FFFBF0' : '#F0FDF4' }}
                        >
                          <option value="create">➕ Créer comme nouveau</option>
                          <option value="associate">🔗 Associer à un existant</option>
                        </select>
                        {p._action === 'associate' && (
                          <select
                            value={p._associateId || ''}
                            onChange={e => updateResult(p._id, '_associateId', e.target.value)}
                            style={{ ...inStyle, fontSize: '0.78rem' }}
                          >
                            <option value="">— Choisir l'ingrédient —</option>
                            {[...items].sort((a, b) => a.nom.localeCompare(b.nom)).map(it => (
                              <option key={it.id} value={it.id}>{it.nom} ({it.prixUnitaire} EUR HT/{it.unite})</option>
                            ))}
                          </select>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}