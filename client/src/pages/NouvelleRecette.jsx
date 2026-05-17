import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { api } from '../api.js';
import { coutIng } from '../utils.js';
import EtapesEditor from '../components/EtapesEditor.jsx';
import IngredientAutocomplete from '../components/IngredientAutocomplete.jsx';

const UNITES = ['g', 'kg', 'ml', 'L', 'piece', 'c.s.', 'c.c.', 'botte', 'tranche'];
const ALLERGENES_LIST = ['gluten', 'lait', 'oeufs', 'arachides', 'poisson', 'crustaces', 'soja', 'fruits_a_coque'];
const CATEGORIES = ['Amuse-bouche', 'Entrée', 'Plat viande', 'Plat poisson', 'Plat végétarien', 'Dessert', 'Autre'];
const TVA_OPTIONS = [
  { value: 5.5, label: '5.5%' },
  { value: 10, label: '10%' },
  { value: 20, label: '20%' },
];

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280' };
const card = { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };
const inputStyle = { padding: '0.45rem 0.7rem', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.875rem', width: '100%', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: T.text };
const labelStyle = { fontSize: '0.78rem', color: T.muted, display: 'block', marginBottom: '5px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' };

const defaultForm = {
  nom: '', categorie: 'Plat viande', portions: 4,
  tempsPreparation: 15, tempsCuisson: 30, description: '',
  allergenes: [], ingredients: [{ nom: '', quantite: 0, unite: 'g', prixUnitaire: 0, tva: 10 }],
  etapes: [],
};

export default function NouvelleRecette() {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [iaDescription, setIaDescription] = useState('');
  const [iaLoading, setIaLoading] = useState(false);
  const [catalog, setCatalog] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    api.ingredients.list().catch(() => []).then(setCatalog);
  }, []);

  function setField(field, value) {
    setForm(f => ({ ...f, [field]: value }));
  }

  function updateIngredient(idx, field, value) {
    const ingredients = [...form.ingredients];
    ingredients[idx] = { ...ingredients[idx], [field]: field === 'nom' || field === 'unite' ? value : parseFloat(value) || 0 };
    setForm(f => ({ ...f, ingredients }));
  }

  function updateIngredientFields(idx, fields) {
    const ingredients = [...form.ingredients];
    const current = ingredients[idx];
    ingredients[idx] = {
      ...current,
      ...(fields.nom !== undefined ? { nom: fields.nom } : {}),
      ...(fields.prixUnitaire !== undefined ? { prixUnitaire: fields.prixUnitaire } : {}),
      ...(fields.unite !== undefined ? { unite: fields.unite } : {}),
    };
    setForm(f => ({ ...f, ingredients }));
  }

  function ajouterIngredient() {
    setForm(f => ({ ...f, ingredients: [...f.ingredients, { nom: '', quantite: 0, unite: 'g', prixUnitaire: 0, tva: 10 }] }));
  }

  function supprimerIngredient(idx) {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));
  }

  function toggleAllergene(a) {
    const list = form.allergenes;
    setField('allergenes', list.includes(a) ? list.filter(x => x !== a) : [...list, a]);
  }

  async function structurerAvecIA() {
    if (!iaDescription.trim()) return;
    setIaLoading(true);
    try {
      const data = await api.ia.structurer(iaDescription);
      setForm(f => ({
        ...f,
        nom: data.nom || f.nom,
        categorie: CATEGORIES.includes(data.categorie) ? data.categorie : f.categorie,
        portions: parseInt(data.portions) || f.portions,
        tempsPreparation: parseInt(data.tempsPreparation) || f.tempsPreparation,
        tempsCuisson: parseInt(data.tempsCuisson) || f.tempsCuisson,
        description: data.description || f.description,
        allergenes: Array.isArray(data.allergenes) ? data.allergenes : f.allergenes,
        ingredients: Array.isArray(data.ingredients) && data.ingredients.length > 0
          ? data.ingredients.map(i => ({ nom: i.nom || '', quantite: parseFloat(i.quantite) || 0, unite: UNITES.includes(i.unite) ? i.unite : 'g', prixUnitaire: parseFloat(i.prixUnitaire) || 0, tva: i.tva ?? 10 }))
          : f.ingredients,
        etapes: Array.isArray(data.etapes) ? data.etapes : (data.etapes ? [data.etapes] : f.etapes),
      }));
    } catch {
      alert("Erreur lors de l'appel à l'IA.");
    } finally {
      setIaLoading(false);
    }
  }

  function sauvegarder(e) {
    e.preventDefault();
    if (!form.nom.trim()) return alert('Le nom est obligatoire.');
    setSaving(true);
    const payload = {
      ...form,
      etapes: Array.isArray(form.etapes) ? form.etapes.filter(Boolean) : [],
    };
    api.recettes.create(payload)
      .then(data => navigate('/fiches-techniques/' + data.id))
      .catch(() => { setSaving(false); alert('Erreur lors de la sauvegarde.'); });
  }

  const cout = form.ingredients.reduce((acc, i) => acc + coutIng(i), 0);
  const coutPortion = form.portions > 0 ? cout / form.portions : 0;

  const btnPrimary = { padding: '0.55rem 1.5rem', borderRadius: '8px', border: 'none', background: T.green, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" };
  const btnOutline = { fontSize: '0.82rem', color: T.green, background: 'none', border: '1px solid #2D6A4F', borderRadius: '6px', padding: '0.35rem 0.9rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 };

  return (
    <form onSubmit={sauvegarder} style={{ maxWidth: '820px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <Link to="/" style={{ color: T.muted, textDecoration: 'none', fontSize: '0.875rem', flexShrink: 0 }}>← Retour</Link>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: T.text, flex: 1 }}>
          Nouvelle fiche technique
        </h1>
        <button type="submit" disabled={saving} style={btnPrimary}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#1e4d38'; }}
          onMouseLeave={e => e.currentTarget.style.background = T.green}
        >
          {saving ? 'Sauvegarde...' : 'Creer la fiche'}
        </button>
      </div>

      {/* Zone IA */}
      <div style={{ ...card, padding: '1.5rem', marginBottom: '1rem', border: '1px solid #d1fae5' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: T.green, marginBottom: '0.75rem' }}>
          Decrire votre recette
        </h3>
        <textarea
          value={iaDescription}
          onChange={e => setIaDescription(e.target.value)}
          disabled={iaLoading}
          rows={4}
          style={{ ...inputStyle, minHeight: '110px', resize: 'vertical', marginBottom: '0.75rem' }}
          placeholder="Decrivez votre recette librement : nom du plat, ingredients, technique de cuisson, nombre de couverts..."
        />
        <button
          type="button"
          onClick={structurerAvecIA}
          disabled={iaLoading || !iaDescription.trim()}
          style={{ ...btnPrimary, display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: iaLoading || !iaDescription.trim() ? 0.7 : 1 }}
          onMouseEnter={e => { if (!iaLoading && iaDescription.trim()) e.currentTarget.style.background = '#1e4d38'; }}
          onMouseLeave={e => e.currentTarget.style.background = T.green}
        >
          {iaLoading ? (
            <>
              <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
              L'IA structure votre recette...
            </>
          ) : '✨ Structurer avec l\'IA'}
        </button>
      </div>

      {/* Separateur */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', margin: '1.5rem 0', color: T.muted, fontSize: '0.82rem' }}>
        <div style={{ flex: 1, height: '1px', background: '#E5E0D8' }} />
        <span>— ou creer manuellement —</span>
        <div style={{ flex: 1, height: '1px', background: '#E5E0D8' }} />
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Informations */}
      <div style={{ ...card, padding: '1.5rem', marginBottom: '1rem' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: T.text, marginBottom: '1.25rem' }}>Informations generales</h3>
        <div style={{ marginBottom: '1rem' }}>
          <label style={labelStyle}>Nom de la recette *</label>
          <input value={form.nom} onChange={e => setField('nom', e.target.value)}
            style={{ ...inputStyle, fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 600 }}
            placeholder="Ex: Tarte Tatin, Blanquette de veau..." required />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
          <div>
            <label style={labelStyle}>Categorie</label>
            <select value={form.categorie} onChange={e => setField('categorie', e.target.value)} style={inputStyle}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={labelStyle}>Portions</label>
            <input type="number" min="1" value={form.portions} onChange={e => setField('portions', parseInt(e.target.value) || 1)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Prep (min)</label>
            <input type="number" min="0" value={form.tempsPreparation} onChange={e => setField('tempsPreparation', parseInt(e.target.value) || 0)} style={inputStyle} />
          </div>
          <div>
            <label style={labelStyle}>Cuisson (min)</label>
            <input type="number" min="0" value={form.tempsCuisson} onChange={e => setField('tempsCuisson', parseInt(e.target.value) || 0)} style={inputStyle} />
          </div>
        </div>
        <div>
          <label style={labelStyle}>Description</label>
          <textarea value={form.description} onChange={e => setField('description', e.target.value)}
            style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }}
            placeholder="Decrivez brievement la recette..." />
        </div>
      </div>

      {/* Ingredients */}
      <div style={{ ...card, padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: T.text }}>Ingredients</h3>
          <button type="button" onClick={ajouterIngredient} style={btnOutline}>+ Ajouter</button>
        </div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #F3EFE8' }}>
              {['Ingredient', 'Qte', 'Unite', 'Prix/unite (EUR)', 'TVA', 'Cout', ''].map(h => (
                <th key={h} style={{ padding: '0.5rem 0.75rem', color: T.muted, fontWeight: 600, textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {form.ingredients.map((ing, idx) => (
              <tr key={idx} style={{ borderBottom: '1px solid #F9F7F4' }}>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <IngredientAutocomplete
                    value={ing.nom}
                    catalog={catalog}
                    onChange={fields => updateIngredientFields(idx, fields)}
                  />
                </td>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <input type="number" value={ing.quantite} onChange={e => updateIngredient(idx, 'quantite', e.target.value)} style={{ ...inputStyle, width: '80px' }} />
                </td>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <select value={ing.unite} onChange={e => updateIngredient(idx, 'unite', e.target.value)} style={inputStyle}>
                    {UNITES.map(u => <option key={u}>{u}</option>)}
                  </select>
                </td>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <input type="number" step="0.001" value={ing.prixUnitaire} onChange={e => updateIngredient(idx, 'prixUnitaire', e.target.value)} style={{ ...inputStyle, width: '90px' }} />
                    {ing.prixUnitaire === 0 && ing.nom.trim() && (
                      <span title="Prix manquant — allez dans Ingrédients pour l'ajouter" style={{ cursor: 'help', flexShrink: 0 }}>⚠️</span>
                    )}
                  </div>
                </td>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <select value={ing.tva ?? 10} onChange={e => updateIngredient(idx, 'tva', e.target.value)} style={{ ...inputStyle, width: '80px' }}>
                    {TVA_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </td>
                <td style={{ padding: '0.5rem 0.75rem', fontWeight: 600, color: ing.prixUnitaire === 0 ? T.muted : T.green }}>
                  {ing.prixUnitaire === 0 ? '—' : coutIng(ing).toFixed(2) + ' EUR'}
                </td>
                <td style={{ padding: '0.5rem 0.75rem' }}>
                  <button type="button" onClick={() => supprimerIngredient(idx)} style={{ background: 'none', border: 'none', color: '#D1C4B0', cursor: 'pointer', fontSize: '1rem' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseLeave={e => e.currentTarget.style.color = '#D1C4B0'}
                  >x</button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: '2px solid #F3EFE8' }}>
              <td colSpan={5} style={{ padding: '0.75rem 0.75rem', textAlign: 'right', color: T.muted, fontSize: '0.85rem', fontWeight: 600 }}>Total matieres</td>
              <td style={{ padding: '0.75rem 0.75rem', fontWeight: 700, color: T.green }}>{cout.toFixed(2)} EUR</td>
              <td></td>
            </tr>
            <tr>
              <td colSpan={5} style={{ padding: '0.25rem 0.75rem', textAlign: 'right', color: T.muted, fontSize: '0.85rem', fontWeight: 600 }}>Cout / portion</td>
              <td style={{ padding: '0.25rem 0.75rem', fontWeight: 700, fontSize: '1.1rem', color: T.green }}>{coutPortion.toFixed(2)} EUR</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Etapes */}
      <div style={{ ...card, padding: '1.5rem', marginBottom: '1rem' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: T.text, marginBottom: '1rem' }}>Etapes de preparation</h3>
        <EtapesEditor etapes={form.etapes} onChange={etapes => setField('etapes', etapes)} />
      </div>

      {/* Allergenes */}
      <div style={{ ...card, padding: '1.5rem' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: T.text, marginBottom: '1rem' }}>Allergenes</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {ALLERGENES_LIST.map(a => {
            const actif = form.allergenes.includes(a);
            return (
              <span
                key={a}
                onClick={() => toggleAllergene(a)}
                style={{
                  padding: '0.35rem 0.9rem', borderRadius: '20px', fontSize: '0.8rem',
                  background: actif ? '#FEF9EC' : '#F9F7F4',
                  color: actif ? '#92400e' : T.muted,
                  border: actif ? '1px solid #F6E8B8' : '1px solid #EDE8DF',
                  cursor: 'pointer', fontWeight: actif ? 600 : 400, transition: 'all 0.1s',
                }}
              >{a}</span>
            );
          })}
        </div>
      </div>
    </form>
  );
}