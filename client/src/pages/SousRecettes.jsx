import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { coutIng } from '../utils.js';
import IngredientAutocomplete from '../components/IngredientAutocomplete.jsx';

const UNITES_SR = ['g', 'ml', 'piece'];
const UNITES_ING = ['g', 'kg', 'ml', 'L', 'piece', 'c.s.', 'c.c.', 'botte', 'tranche'];
const CONV = { g: 0.001, kg: 1, mg: 0.000001, ml: 0.001, cl: 0.01, L: 1, l: 1, piece: 1, pièce: 1, unite: 1 };

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280' };
const card = { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };
const inputStyle = { padding: '0.45rem 0.7rem', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.875rem', width: '100%', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: T.text };
const labelStyle = { fontSize: '0.78rem', color: T.muted, display: 'block', marginBottom: '5px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' };

function computeCoutTotal(ingredients) {
  return (ingredients || []).reduce((acc, i) => acc + coutIng(i), 0);
}

function computeCoutUnitaire(coutTotal, quantiteProduite, unite) {
  const qBase = (parseFloat(quantiteProduite) || 1) * (CONV[unite] || 1);
  return qBase > 0 ? coutTotal / qBase : 0;
}

const EMPTY_ING = { nom: '', quantite: 0, unite: 'g', prixUnitaire: 0, tva: 10 };
const EMPTY_FORM = { nom: '', quantiteProduite: 1000, unite: 'g', ingredients: [] };

export default function SousRecettes() {
  const [items, setItems] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [editForm, setEditForm] = useState(null);
  const [editId, setEditId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.sousRecettes.list(),
      api.ingredients.list().catch(() => []),
    ]).then(([srs, cats]) => {
      setItems(srs);
      setCatalog(cats);
    }).finally(() => setLoading(false));
  }, []);

  function startCreate() {
    setEditForm({ ...EMPTY_FORM, ingredients: [] });
    setEditId(null);
  }

  function startEdit(sr) {
    setEditForm({ ...sr });
    setEditId(sr.id);
  }

  function cancel() {
    setEditForm(null);
    setEditId(null);
  }

  function updateIng(idx, fields) {
    setEditForm(f => {
      const ings = [...f.ingredients];
      ings[idx] = { ...ings[idx], ...fields };
      return { ...f, ingredients: ings };
    });
  }

  function addIng() {
    setEditForm(f => ({ ...f, ingredients: [...f.ingredients, { ...EMPTY_ING }] }));
  }

  function removeIng(idx) {
    setEditForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));
  }

  async function save() {
    if (!editForm.nom.trim()) return;
    const data = { ...editForm, quantiteProduite: parseFloat(editForm.quantiteProduite) || 0 };
    if (editId) {
      const updated = await api.sousRecettes.update(editId, data);
      setItems(prev => prev.map(i => i.id === updated.id ? updated : i));
    } else {
      const created = await api.sousRecettes.create(data);
      setItems(prev => [...prev, created]);
    }
    cancel();
  }

  async function supprimer(id) {
    if (!confirm('Supprimer cette sous-recette ?')) return;
    await api.sousRecettes.delete(id);
    setItems(prev => prev.filter(i => i.id !== id));
  }

  const formCoutTotal = editForm ? computeCoutTotal(editForm.ingredients) : 0;
  const formCoutUnitaire = editForm
    ? computeCoutUnitaire(formCoutTotal, editForm.quantiteProduite, editForm.unite)
    : 0;

  const thStyle = { padding: '0.6rem 1rem', color: T.muted, fontWeight: 600, fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.06em', textAlign: 'left', borderBottom: '1px solid #F3EFE8', whiteSpace: 'nowrap' };
  const tdStyle = { padding: '0.65rem 1rem', fontSize: '0.875rem', color: T.text, borderBottom: '1px solid #F9F7F4' };
  const btnSm = { padding: '0.3rem 0.8rem', borderRadius: '6px', fontSize: '0.8rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" };

  if (loading) return <p style={{ color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>Chargement...</p>;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: T.text }}>Sous-recettes</h1>
          <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '2px' }}>
            {items.length} préparation{items.length !== 1 ? 's' : ''} — réutilisables comme ingrédient dans vos fiches
          </p>
        </div>
        {editForm === null && (
          <button
            onClick={startCreate}
            style={{ padding: '0.55rem 1.25rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
            onMouseLeave={e => e.currentTarget.style.background = T.green}
          >+ Créer</button>
        )}
      </div>

      {/* Formulaire création / édition */}
      {editForm !== null && (
        <div style={{ ...card, padding: '1.5rem', marginBottom: '1.5rem', border: '2px solid rgba(45,106,79,0.2)' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: T.text, marginBottom: '1.25rem' }}>
            {editId ? `Modifier — ${editForm.nom || '…'}` : 'Nouvelle sous-recette'}
          </h3>

          {/* Nom + quantité produite + unité */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1.25rem' }}>
            <div>
              <label style={labelStyle}>Nom</label>
              <input
                value={editForm.nom}
                onChange={e => setEditForm(f => ({ ...f, nom: e.target.value }))}
                placeholder="ex: Fond de veau, Sauce béarnaise, Pâte sablée…"
                style={inputStyle}
                autoFocus
              />
            </div>
            <div>
              <label style={labelStyle}>Quantité produite</label>
              <input
                type="number" min="0" step="1"
                value={editForm.quantiteProduite}
                onChange={e => setEditForm(f => ({ ...f, quantiteProduite: e.target.value }))}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Unité</label>
              <select value={editForm.unite} onChange={e => setEditForm(f => ({ ...f, unite: e.target.value }))} style={inputStyle}>
                {UNITES_SR.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          </div>

          {/* Tableau ingrédients */}
          <div style={{ border: '1px solid #F3EFE8', borderRadius: '8px', overflow: 'visible', marginBottom: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.75rem 1rem', borderBottom: '1px solid #F3EFE8', background: '#FAFAF8' }}>
              <span style={{ fontSize: '0.78rem', color: T.muted, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ingrédients</span>
              <button
                onClick={addIng}
                style={{ ...btnSm, border: '1px solid #2D6A4F', color: T.green, background: 'none', fontWeight: 500 }}
              >+ Ajouter</button>
            </div>
            {editForm.ingredients.length === 0 ? (
              <p style={{ padding: '1rem', color: T.muted, fontSize: '0.875rem', fontStyle: 'italic', margin: 0 }}>
                Aucun ingrédient — cliquez sur "Ajouter" pour commencer.
              </p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #F3EFE8' }}>
                    {['Ingrédient', 'Quantité', 'Unité', 'Prix/unité', 'Coût', ''].map(h => (
                      <th key={h} style={{ padding: '0.5rem 0.75rem', color: T.muted, fontWeight: 600, textAlign: 'left', fontSize: '0.72rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {editForm.ingredients.map((ing, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #F9F7F4' }}>
                      <td style={{ padding: '0.5rem 0.75rem', minWidth: '160px' }}>
                        <IngredientAutocomplete
                          value={ing.nom}
                          catalog={catalog}
                          onChange={fields => updateIng(idx, {
                            nom: fields.nom !== undefined ? fields.nom : ing.nom,
                            ...(fields.prixUnitaire !== undefined ? {
                              prixUnitaire: fields.prixUnitaire,
                              unite: fields.unite !== undefined ? fields.unite : ing.unite,
                            } : {}),
                          })}
                        />
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input
                          type="number" step="0.001" min="0"
                          value={ing.quantite}
                          onChange={e => updateIng(idx, { quantite: parseFloat(e.target.value) || 0 })}
                          style={{ ...inputStyle, width: '80px' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <select value={ing.unite} onChange={e => updateIng(idx, { unite: e.target.value })} style={{ ...inputStyle, width: 'auto' }}>
                          {UNITES_ING.map(u => <option key={u} value={u}>{u}</option>)}
                        </select>
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <input
                          type="number" step="0.001" min="0"
                          value={ing.prixUnitaire || ''}
                          placeholder="Prix/unité"
                          onChange={e => updateIng(idx, { prixUnitaire: parseFloat(e.target.value) || 0 })}
                          style={{ ...inputStyle, width: '90px' }}
                        />
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: T.green }}>
                        {coutIng(ing).toFixed(3)} EUR
                      </td>
                      <td style={{ padding: '0.5rem 0.75rem' }}>
                        <button
                          onClick={() => removeIng(idx)}
                          style={{ background: 'none', border: 'none', color: '#D1C4B0', cursor: 'pointer', fontSize: '1rem', padding: '2px 6px' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                          onMouseLeave={e => e.currentTarget.style.color = '#D1C4B0'}
                        >✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Récapitulatif coûts */}
          {editForm.ingredients.length > 0 && (
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
              <div style={{ background: '#F8F6F1', borderRadius: '8px', padding: '0.75rem 1rem', minWidth: '140px' }}>
                <div style={{ fontSize: '0.65rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>Coût total</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: T.green }}>{formCoutTotal.toFixed(3)} EUR</div>
              </div>
              <div style={{ background: '#F8F6F1', borderRadius: '8px', padding: '0.75rem 1rem', minWidth: '160px' }}>
                <div style={{ fontSize: '0.65rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                  Coût unitaire
                </div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: T.text }}>
                  {formCoutUnitaire.toFixed(5)} EUR/{editForm.unite}
                </div>
              </div>
              <div style={{ background: '#F8F6F1', borderRadius: '8px', padding: '0.75rem 1rem', minWidth: '140px' }}>
                <div style={{ fontSize: '0.65rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '3px' }}>
                  Pour {editForm.quantiteProduite} {editForm.unite}
                </div>
                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: T.muted }}>
                  {editForm.ingredients.length} ingrédient{editForm.ingredients.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button onClick={cancel} style={{ ...btnSm, border: '1px solid #E5E0D8', background: '#fff', color: T.text }}>Annuler</button>
            <button
              onClick={save}
              disabled={!editForm.nom.trim()}
              style={{ ...btnSm, border: 'none', background: editForm.nom.trim() ? T.green : '#D1C4B0', color: '#fff', fontWeight: 600 }}
              onMouseEnter={e => { if (editForm.nom.trim()) e.currentTarget.style.background = '#1e4d38'; }}
              onMouseLeave={e => { if (editForm.nom.trim()) e.currentTarget.style.background = T.green; }}
            >Sauvegarder</button>
          </div>
        </div>
      )}

      {/* Tableau des sous-recettes */}
      <div style={{ ...card, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead style={{ background: '#FAFAF8' }}>
            <tr>
              <th style={thStyle}>Nom</th>
              <th style={thStyle}>Quantité produite</th>
              <th style={thStyle}>Ingrédients</th>
              <th style={thStyle}>Coût total</th>
              <th style={thStyle}>Coût unitaire</th>
              <th style={{ ...thStyle, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={6} style={{ ...tdStyle, textAlign: 'center', color: T.muted, padding: '2.5rem', fontStyle: 'italic' }}>
                  Aucune sous-recette. Créez des préparations de base réutilisables dans vos fiches techniques.
                </td>
              </tr>
            )}
            {items.map(sr => {
              const ct = computeCoutTotal(sr.ingredients);
              const cu = computeCoutUnitaire(ct, sr.quantiteProduite, sr.unite);
              return (
                <tr key={sr.id}
                  style={{ borderBottom: '1px solid #F9F7F4' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAF8'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ ...tdStyle, fontWeight: 600 }}>{sr.nom}</td>
                  <td style={{ ...tdStyle, color: T.muted }}>{sr.quantiteProduite} {sr.unite}</td>
                  <td style={{ ...tdStyle, color: T.muted }}>
                    {(sr.ingredients || []).length} ingrédient{(sr.ingredients || []).length !== 1 ? 's' : ''}
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 700, color: T.green }}>{ct.toFixed(2)}</span>
                    <span style={{ color: T.muted, fontSize: '0.8rem', marginLeft: '4px' }}>EUR</span>
                  </td>
                  <td style={{ ...tdStyle, color: T.muted, fontSize: '0.82rem' }}>
                    {cu.toFixed(5)} EUR/{sr.unite}
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
                      <button
                        onClick={() => startEdit(sr)}
                        style={{ ...btnSm, border: '1px solid #E5E0D8', background: '#fff', color: T.text }}
                      >Modifier</button>
                      <button
                        onClick={() => supprimer(sr.id)}
                        style={{ background: 'none', border: 'none', color: '#D1C4B0', cursor: 'pointer', fontSize: '1rem', padding: '2px 6px', borderRadius: '4px' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                        onMouseLeave={e => e.currentTarget.style.color = '#D1C4B0'}
                      >✕</button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {items.length === 0 && editForm === null && (
        <button
          onClick={startCreate}
          style={{ marginTop: '0.75rem', background: 'none', border: '1px dashed #C9A84C', color: T.muted, borderRadius: '8px', padding: '0.5rem 1.25rem', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}
        >+ Créer une première sous-recette</button>
      )}
    </div>
  );
}
