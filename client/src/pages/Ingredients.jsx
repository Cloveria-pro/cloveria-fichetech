import { useEffect, useState, useRef } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { api, API_URL, authHeaders } from '../api.js';

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

const EMPTY = { nom: '', categorie: 'épicerie', unite: 'kg', prixUnitaire: '', tva: 10, fournisseur: '', fournisseurs: [] };

/* ─── Modal historique des prix ─────────────────────────────────────────── */
function HistoriqueModal({ item, onClose }) {
  const [data, setData] = useState([]);

  useEffect(() => {
    api.historiquePrix.list(item.nom).then(setData).catch(() => {});
  }, [item.nom]);

  const last = data[data.length - 1];

  function varSince(isoDate) {
    if (!last) return null;
    const ref = [...data].find(d => d.date >= isoDate);
    if (!ref) return null;
    return (last.prix - ref.prix) / ref.prix * 100;
  }

  const today = new Date().toISOString().slice(0, 10);
  const m1 = new Date(); m1.setMonth(m1.getMonth() - 1);
  const m3 = new Date(); m3.setMonth(m3.getMonth() - 3);
  const m6 = new Date(); m6.setMonth(m6.getMonth() - 6);

  const stats = [
    { label: 'vs précédent', val: data.length >= 2 ? (last.prix - data[data.length - 2].prix) / data[data.length - 2].prix * 100 : null },
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
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: T.muted }} />
                <YAxis tick={{ fontSize: 10, fill: T.muted }} domain={['auto', 'auto']} width={48} />
                <Tooltip formatter={(v, n, p) => [`${v.toFixed(2)} EUR/${p.payload.unite}`, 'Prix']} />
                <Line type="monotone" dataKey="prix" stroke={T.green} strokeWidth={2} dot={{ r: 3, fill: T.green }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem', fontSize: '0.82rem' }}>
              <thead>
                <tr>
                  {['Date', 'Prix', 'Fournisseur'].map(h => (
                    <th key={h} style={{ textAlign: h === 'Prix' ? 'right' : 'left', padding: '4px 8px', color: T.muted, fontWeight: 600, fontSize: '0.68rem', textTransform: 'uppercase', borderBottom: '1px solid #F3EFE8' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data].reverse().map((d, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F9F7F4' }}>
                    <td style={{ padding: '4px 8px', color: T.muted }}>{d.date}</td>
                    <td style={{ padding: '4px 8px', textAlign: 'right', fontWeight: 700, color: T.green }}>{d.prix.toFixed(2)} EUR/{d.unite}</td>
                    <td style={{ padding: '4px 8px', color: T.muted }}>{d.fournisseur || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>
    </div>
  );
}

export default function Ingredients() {
  const [items, setItems] = useState([]);
  const [undoStack, setUndoStack] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [catFilter, setCatFilter] = useState('');
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
    ]).then(([ings, recs]) => {
      setItems(ings);
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

  const filtered = items
    .filter(i =>
      i.nom.toLowerCase().includes(recherche.toLowerCase()) &&
      (catFilter === '' || i.categorie === catFilter)
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

  const thStyle = { padding: '0.6rem 1rem', color: T.muted, fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid #F3EFE8', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: T.text, borderBottom: '1px solid #F9F7F4' };
  const btnSm = { padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" };

  return (
    <div>
      {histItem && <HistoriqueModal item={histItem} onClose={() => setHistItem(null)} />}

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
            onClick={() => { setShowAdd(true); setEditId(null); }}
            style={{ padding: '0.55rem 1.25rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
            onMouseLeave={e => e.currentTarget.style.background = T.green}
          >+ Ajouter</button>
        </div>
      </div>

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
                      <span style={{ color: T.muted, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>EUR / {editForm.unite}</span>
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
                    <span style={{ color: T.muted, fontSize: '0.8rem', marginLeft: '4px' }}>EUR / {item.unite}</span>
                  </td>
                  <td style={{ ...tdStyle, color: T.muted, fontSize: '0.82rem' }}>
                    {item.fournisseur || <span style={{ color: '#D1C4B0' }}>—</span>}
                  </td>
                  <td style={{ ...tdStyle, color: T.muted, fontSize: '0.82rem' }}>
                    {(item.tva ?? 10) + '%'}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', alignItems: 'center' }}>
                      <button
                        onClick={() => setHistItem(item)}
                        style={{ ...btnSm, border: '1px solid #E5E0D8', background: '#fff', color: T.muted, fontSize: '0.75rem' }}
                        title="Historique des prix"
                      >Hist.</button>
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
              <tr><td colSpan={7} style={{ ...tdStyle, textAlign: 'center', color: T.muted, padding: '2rem' }}>Aucun ingrédient trouvé</td></tr>
            )}
          </tbody>
          {/* Formulaire ajout */}
          {showAdd && (
            <tfoot>
              {dupWarning && (
                <tr style={{ background: '#FFF7ED', borderTop: '2px solid #FED7AA' }}>
                  <td colSpan={7} style={{ padding: '0.75rem 1rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.85rem', color: '#92400e', flex: 1 }}>
                        ⚠️ Un ingrédient similaire existe déjà : <strong>{dupWarning.nom}</strong> ({dupWarning.prixUnitaire} EUR/{dupWarning.unite}
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
              {showNomSuggestions && nomSuggestions.length > 0 && (
                <tr style={{ background: '#FFFBF5', borderTop: '1px solid #F3EFE8' }}>
                  <td colSpan={7} style={{ padding: '0.5rem 1rem' }}>
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
                    <span style={{ color: T.muted, fontSize: '0.8rem', whiteSpace: 'nowrap' }}>EUR / {addForm.unite}</span>
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

      <ImportFacture items={items} setItems={setItems} />
    </div>
  );
}

/* ─── Import Facture IA ──────────────────────────────────────────────────── */
function ImportFacture({ items, setItems }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [selected, setSelected] = useState([]);
  const [toast, setToast] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [aliases, setAliases] = useState([]);
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
    try {
      const res = await fetch(`${API_URL}/ia/analyser-facture`, { method: 'POST', headers: { ...authHeaders() }, body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
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

    for (const p of toImport) {
      if (p._action === 'associate' && p._associateId) {
        const existant = items.find(i => i.id === p._associateId);
        if (existant) {
          const updated = await api.ingredients.update(existant.id, { ...existant, prixUnitaire: p.prix_unitaire });
          setItems(prev => prev.map(i => i.id === existant.id ? updated : i));
          if (existant.nom.toLowerCase() !== p.nom.toLowerCase()) {
            newAliases.push({ from: p.nom, to: existant.nom });
          }
        }
      } else {
        const item = await api.ingredients.create({ nom: p.nom, categorie: 'épicerie', unite: p.unite || 'kg', prixUnitaire: p.prix_unitaire });
        setItems(prev => [...prev, item]);
      }
      count++;
    }

    for (const a of newAliases) {
      await api.aliases.create(a);
    }
    if (newAliases.length > 0) setAliases(prev => [...prev, ...newAliases]);

    setToast(`${count} ingrédient${count > 1 ? 's' : ''} importé${count > 1 ? 's' : ''} ✓`);
    setTimeout(() => setToast(''), 3500);
    setResults(null); setFile(null); setSelected([]);
  }

  const dropZoneStyle = {
    border: `2px dashed ${dragOver ? '#2D6A4F' : '#C9A84C'}`,
    borderRadius: '12px', padding: '2rem', textAlign: 'center',
    background: dragOver ? 'rgba(45,106,79,0.05)' : 'rgba(201,168,76,0.04)',
    cursor: 'pointer', transition: 'all 0.15s',
  };

  return (
    <div style={{ marginTop: '2.5rem' }}>
      {toast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: '#2D6A4F', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 500 }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
        <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.2rem', fontWeight: 700, color: T.text }}>Importer une facture</h2>
        <span style={{ fontSize: '0.72rem', background: 'rgba(201,168,76,0.12)', color: '#8B6914', border: '1px solid rgba(201,168,76,0.3)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>IA</span>
        {aliases.length > 0 && <span style={{ fontSize: '0.72rem', color: T.muted }}>{aliases.length} alias mémorisé{aliases.length > 1 ? 's' : ''}</span>}
      </div>
      <p style={{ color: T.muted, fontSize: '0.875rem', marginBottom: '1.25rem' }}>
        Déposez votre facture fournisseur — l'IA détecte les produits, vous choisissez de créer ou d'associer à un ingrédient existant.
      </p>

      {!results && (
        <>
          <div style={dropZoneStyle}
            onClick={() => fileRef.current?.click()}
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
          >
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>📄</div>
            <div style={{ fontWeight: 600, color: T.text, marginBottom: '4px' }}>{file ? file.name : 'Glissez une facture ici'}</div>
            <div style={{ fontSize: '0.8rem', color: T.muted }}>ou cliquez pour choisir — JPG, PNG, PDF · max 10 Mo</div>
            <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,application/pdf" style={{ display: 'none' }} onChange={e => handleFile(e.target.files[0])} />
          </div>
          {file && (
            <button onClick={analyser} disabled={loading} style={{ marginTop: '1rem', width: '100%', padding: '0.7rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: loading ? 'default' : 'pointer', fontSize: '0.9rem', fontFamily: "'DM Sans', sans-serif", opacity: loading ? 0.8 : 1 }}>
              {loading ? '⏳ Analyse en cours...' : 'Analyser la facture'}
            </button>
          )}
        </>
      )}

      {results && (
        <div style={{ background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid #F3EFE8', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <span style={{ fontWeight: 600, color: T.text }}>{results.length} produit{results.length !== 1 ? 's' : ''} détecté{results.length !== 1 ? 's' : ''}</span>
              <span style={{ fontSize: '0.75rem', color: T.muted, marginLeft: '12px' }}>Choisissez l'action pour chaque produit avant d'importer</span>
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
                              <option key={it.id} value={it.id}>{it.nom} ({it.prixUnitaire} EUR/{it.unite})</option>
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