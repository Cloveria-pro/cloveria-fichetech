import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../api.js';
import { coutIng, coutPortionHT, coutPortionTTC, calculerFoodCost } from '../utils.js';
import EtapesEditor from '../components/EtapesEditor.jsx';
import IngredientAutocomplete from '../components/IngredientAutocomplete.jsx';

const UNITES = ['g', 'kg', 'ml', 'L', 'piece', 'c.s.', 'c.c.', 'botte', 'tranche'];
const ALLERGENES_LIST = ['gluten', 'lait', 'oeufs', 'arachides', 'poisson', 'crustaces', 'soja', 'fruits_a_coque'];
const CHART_COLORS = ['#2D6A4F','#C9A84C','#4F86C6','#E05C5C','#7B5EA7','#E09F3E','#8DB580','#6E9EBF','#E8A87C','#B8B0A4'];
const TVA_OPTIONS = [
  { value: 5.5, label: '5.5% — Alim. bruts' },
  { value: 10, label: '10% — Restauration' },
  { value: 20, label: '20% — Alcool/Luxe' },
];

const T = { green: '#2D6A4F', gold: '#C9A84C', bg: '#F8F6F1', text: '#1C2B1E', muted: '#6B7280' };
const card = { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };
const inputStyle = { padding: '0.45rem 0.7rem', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.875rem', width: '100%', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: T.text };
const labelStyle = { fontSize: '0.78rem', color: T.muted, display: 'block', marginBottom: '5px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' };

function buildDonutSVG(ingredients) {
  const items = ingredients.filter(i => coutIng(i) > 0);
  if (items.length < 2) return '';
  const total = items.reduce((a, i) => a + coutIng(i), 0);
  const cx = 100, cy = 100, r = 80, ir = 44;
  let angle = -Math.PI / 2;
  const paths = items.map((ing, idx) => {
    const val = coutIng(ing);
    const sweep = (val / total) * 2 * Math.PI;
    const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
    angle += sweep;
    const x2 = cx + r * Math.cos(angle), y2 = cy + r * Math.sin(angle);
    const ix1 = cx + ir * Math.cos(angle), iy1 = cy + ir * Math.sin(angle);
    const ix2 = cx + ir * Math.cos(angle - sweep), iy2 = cy + ir * Math.sin(angle - sweep);
    const large = sweep > Math.PI ? 1 : 0;
    const color = CHART_COLORS[idx % CHART_COLORS.length];
    const pct = (val / total * 100).toFixed(1);
    return { path: `M${x1.toFixed(1)},${y1.toFixed(1)} A${r},${r} 0 ${large} 1 ${x2.toFixed(1)},${y2.toFixed(1)} L${ix1.toFixed(1)},${iy1.toFixed(1)} A${ir},${ir} 0 ${large} 0 ${ix2.toFixed(1)},${iy2.toFixed(1)} Z`, color, nom: ing.nom, pct };
  });
  const svgPaths = paths.map(p => `<path d="${p.path}" fill="${p.color}" />`).join('');
  const legend = paths.map(p => `<div style="display:flex;align-items:center;gap:6px;margin-bottom:5px"><div style="width:10px;height:10px;border-radius:2px;background:${p.color};flex-shrink:0"></div><span style="font-size:0.75rem;color:#374151">${p.nom} — <strong>${p.pct}%</strong></span></div>`).join('');
  return `<div style="display:flex;gap:20px;align-items:center"><svg width="200" height="200" viewBox="0 0 200 200">${svgPaths}</svg><div style="flex:1">${legend}</div></div>`;
}

export default function FicheTechnique() {
  console.log('[FicheTechnique] render');
  const { id } = useParams();
  const navigate = useNavigate();
  const [recette, setRecette] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [form, setForm] = useState(null);
  const [catEdit, setCatEdit] = useState(false);
  const [loading, setLoading] = useState(true);
  const [couverts, setCouverts] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [parametres, setParametres] = useState({ foodCostCible: 30, tva: 10, etablissement: 'Restaurant CloverIA' });
  const [cartes, setCartes] = useState([]);
  const [selectedCarteId, setSelectedCarteId] = useState('');
  const [selectedSection, setSelectedSection] = useState('');
  const [showCarteAdd, setShowCarteAdd] = useState(false);

  useEffect(() => {
    Promise.all([
      api.recettes.get(id),
      api.parametres.get().catch(() => ({ foodCostCible: 30, tva: 10 })),
      api.ingredients.list().catch(() => []),
      api.cartes.list().catch(() => []),
    ]).then(([data, params, cats, cartesData]) => {
      setCartes(cartesData);
      console.log('[FicheTechnique] data loaded:', data);
      const etapes = Array.isArray(data.etapes) ? data.etapes
        : typeof data.etapes === 'string' ? data.etapes.split('\n').map(s => s.trim()).filter(Boolean)
        : [];
      const normalized = { ...data, etapes };
      setRecette(normalized);
      setForm(normalized);
      setCouverts(data.portions || 4);
      setParametres(params);
      setCatalog(cats);
      setLoading(false);
    }).catch((err) => { console.error('[FicheTechnique] load error:', err); setLoading(false); navigate('/fiches-techniques'); });
  }, [id, navigate]);

  function sauvegarder() {
    api.recettes.update(id, form)
      .then(data => { setRecette(data); setForm(data); setEditMode(false); });
  }

  function updateIngredient(idx, fields) {
    const ingredients = [...form.ingredients];
    ingredients[idx] = { ...ingredients[idx], ...fields };
    setForm(f => ({ ...f, ingredients }));
  }

  function ajouterIngredient() {
    setForm(f => ({ ...f, ingredients: [...(f.ingredients || []), { nom: '', quantite: 0, unite: 'g', prixUnitaire: 0, tva: parametres.tva }] }));
  }

  function supprimerIngredient(idx) {
    setForm(f => ({ ...f, ingredients: f.ingredients.filter((_, i) => i !== idx) }));
  }

  function toggleAllergene(a) {
    const list = form.allergenes || [];
    setForm(f => ({ ...f, allergenes: list.includes(a) ? list.filter(x => x !== a) : [...list, a] }));
  }

  function savePrixVentePratiqueTTC(currentForm) {
    api.recettes.update(id, currentForm).then(data => setRecette(data));
  }

  function retirerDeCarte(carte, sectionTitre) {
    const updatedCarte = {
      ...carte,
      sections: carte.sections.map(s =>
        s.titre === sectionTitre ? { ...s, plats: s.plats.filter(p => p.recetteId !== id) } : s
      ),
    };
    api.cartes.update(carte.id, updatedCarte).then(saved => setCartes(prev => prev.map(c => c.id === saved.id ? saved : c)));
  }

  function ajouterACarte() {
    const carte = cartes.find(c => c.id === selectedCarteId);
    if (!carte || !selectedSection) return;
    const cp = form.portions > 0 ? (form.ingredients || []).reduce((acc, i) => acc + coutIng(i), 0) / form.portions : 0;
    const prixVente = recette.prixVente || parseFloat((cp / 0.30).toFixed(2));
    const updatedCarte = {
      ...carte,
      sections: carte.sections.map(s =>
        s.titre === selectedSection
          ? { ...s, plats: [...s.plats, { recetteId: id, nom: recette.nom, prixVente }] }
          : s
      ),
    };
    api.cartes.update(selectedCarteId, updatedCarte).then(saved => {
      setCartes(prev => prev.map(c => c.id === saved.id ? saved : c));
      setSelectedCarteId('');
      setSelectedSection('');
      setShowCarteAdd(false);
    });
  }

  async function exportPDF() {
    const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
    const scaleFactor = (form.portions || 1) > 0 ? couverts / form.portions : 1;
    const scaledIngredients = (form.ingredients || []).map(i => ({ ...i, quantite: i.quantite * scaleFactor }));
    const coutTotal = scaledIngredients.reduce((acc, i) => acc + coutIng(i), 0);
    const coutPort = couverts > 0 ? coutTotal / couverts : 0;
    const pv = recette.prixVente || 0;
    const pvTTCActuel = pv * (1 + parametres.tva / 100);
    const fc = pvTTCActuel > 0 ? (coutPort / pvTTCActuel * 100).toFixed(1) : null;
    const pvHT = coutPort > 0 ? (coutPort / (parametres.foodCostCible / 100)).toFixed(2) : null;
    const pvTTC = pvHT ? (parseFloat(pvHT) * (1 + parametres.tva / 100)).toFixed(2) : null;
    const coeffVal = coutPort > 0 && pv > 0 ? (pv / coutPort).toFixed(2) : null;
    const fcColor = !fc ? '#6B7280' : parseFloat(fc) < 30 ? '#16a34a' : parseFloat(fc) < 35 ? '#d97706' : '#dc2626';

    const ingRows = scaledIngredients.map(i => {
      const ingTva = i.tva ?? parametres.tva;
      return '<tr><td>' + i.nom + '</td><td style="text-align:right">' + (Number.isInteger(i.quantite) ? i.quantite : i.quantite.toFixed(1)) + '</td><td>' + i.unite + '</td><td style="text-align:right">' + i.prixUnitaire + ' EUR</td><td style="text-align:right">' + ingTva + '%</td><td style="text-align:right;font-weight:700;color:#2D6A4F">' + coutIng(i).toFixed(2) + ' EUR</td></tr>';
    }).join('');

    const etapesHtml = (recette.etapes || []).map((e, idx) =>
      '<div style="display:flex;gap:18px;align-items:flex-start;margin-bottom:14px"><div style="font-family:Georgia,serif;font-size:2rem;font-weight:700;color:#C9A84C;line-height:1;min-width:32px;text-align:center">' + (idx + 1) + '</div><p style="margin:0;line-height:1.7;color:#374151;font-size:0.9rem;padding-top:6px">' + e + '</p></div>'
    ).join('');

    const allergenesBadges = (recette.allergenes || []).map(a =>
      '<span style="display:inline-block;background:#FEF9EC;color:#92400e;border:1px solid #F6E8B8;padding:3px 10px;border-radius:4px;font-size:0.8rem;font-weight:600;margin:3px">' + a + '</span>'
    ).join('');

    const financeCards = [
      { label: 'Food cost', value: fc ? fc + '%' : '—', color: fcColor },
      { label: 'PV suggéré HT', value: pvHT ? pvHT + ' €' : '—', color: '#2D6A4F' },
      { label: 'PV TTC (' + parametres.tva + '%)', value: pvTTC ? pvTTC + ' €' : '—', color: '#1C2B1E' },
      { label: 'Coefficient', value: coeffVal ? '×' + coeffVal : '—', color: '#1C2B1E' },
    ].map(c =>
      '<div style="background:#F8F6F1;border-radius:8px;padding:12px 16px;flex:1"><div style="font-size:0.68rem;color:#6B7280;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:4px">' + c.label + '</div><div style="font-family:Georgia,serif;font-size:1.3rem;font-weight:700;color:' + c.color + '">' + c.value + '</div></div>'
    ).join('');

    const donutSVG = buildDonutSVG(recette.ingredients || []);
    const portionLabel = couverts !== form.portions ? ' — ajusté pour ' + couverts + ' couverts' : '';

    const html = '<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Fiche — ' + recette.nom + '</title><style>'
      + '@page{size:A4;margin:18mm 15mm}'
      + 'body{font-family:"Helvetica Neue",Arial,sans-serif;color:#1C2B1E;background:#fff;margin:0;font-size:13px}'
      + 'table{width:100%;border-collapse:collapse;font-size:0.85rem}'
      + 'th{background:#FAFAF8;padding:8px 10px;text-align:left;font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.05em;color:#6B7280;border-bottom:2px solid #F3EFE8}'
      + 'td{padding:7px 10px;border-bottom:1px solid #F9F7F4}'
      + '.section{margin-bottom:20px}.section-title{font-family:Georgia,serif;font-size:1rem;font-weight:700;color:#1C2B1E;margin-bottom:10px;border-bottom:1px solid #F3EFE8;padding-bottom:6px}'
      + '.total-row td{border-top:2px solid #F3EFE8;font-weight:700;padding-top:10px}'
      + '@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}'
      + '</style></head><body>'
      + '<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #2D6A4F">'
      + '<div><div style="font-size:0.7rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#2D6A4F;margin-bottom:4px">CloverIA FicheTech</div><h1 style="font-family:Georgia,serif;font-size:1.6rem;line-height:1.2;margin:0 0 6px">' + recette.nom + '</h1><span style="display:inline-block;font-size:0.7rem;font-weight:700;text-transform:uppercase;color:#2D6A4F;background:rgba(45,106,79,0.08);padding:3px 8px;border-radius:4px">' + (recette.categorie || '') + '</span>' + (portionLabel ? '<span style="margin-left:8px;font-size:0.75rem;color:#C9A84C;font-weight:600">' + portionLabel + '</span>' : '') + '</div>'
      + '<div style="text-align:right"><div style="font-weight:600;color:#1C2B1E;font-size:0.9rem">' + parametres.etablissement + '</div><div style="font-size:0.8rem;color:#6B7280;margin-top:2px">' + date + '</div><div style="margin-top:8px;font-size:0.78rem;color:#6B7280">' + (form.tempsPreparation || 0) + ' min prép. · ' + (form.tempsCuisson || 0) + ' min cuisson · ' + couverts + ' couvert' + (couverts > 1 ? 's' : '') + (couverts !== form.portions ? ' (base ' + form.portions + ')' : '') + '</div></div>'
      + '</div>'
      + '<div class="section"><div class="section-title">Ingrédients' + portionLabel + '</div>'
      + '<table><thead><tr><th>Ingrédient</th><th style="text-align:right">Quantité</th><th>Unité</th><th style="text-align:right">Prix/unité</th><th style="text-align:right">TVA</th><th style="text-align:right">Coût</th></tr></thead>'
      + '<tbody>' + ingRows + '</tbody>'
      + '<tfoot><tr class="total-row"><td colspan="5" style="text-align:right;color:#6B7280">Coût total matières</td><td style="text-align:right;color:#2D6A4F;font-size:1rem">' + coutTotal.toFixed(2) + ' EUR</td></tr>'
      + '<tr><td colspan="5" style="text-align:right;color:#6B7280">Coût par couvert</td><td style="text-align:right;color:#2D6A4F;font-family:Georgia,serif;font-size:1.1rem;font-weight:700">' + coutPort.toFixed(2) + ' EUR</td></tr></tfoot>'
      + '</table></div>'
      + '<div class="section"><div class="section-title">Analyse financière</div><div style="display:flex;gap:10px">' + financeCards + '</div></div>'
      + (donutSVG ? '<div class="section"><div class="section-title">Répartition des coûts</div>' + donutSVG + '</div>' : '')
      + (allergenesBadges ? '<div class="section"><div class="section-title">Allergènes</div><div>' + allergenesBadges + '</div></div>' : '')
      + ((recette.etapes || []).length > 0 ? '<div class="section"><div class="section-title">Étapes de préparation</div>' + etapesHtml + '</div>' : '')
      + '<div style="position:fixed;bottom:12mm;left:15mm;right:15mm;border-top:1px solid #E5E0D8;padding-top:6px;display:flex;justify-content:space-between;font-size:0.68rem;color:#9CA3AF"><span>Document confidentiel — ' + (parametres.etablissement || 'Restaurant CloverIA') + '</span><span>CloverIA FicheTech · ' + date + '</span></div>'
      + '</body></html>';

    const win = window.open('', '_blank', 'width=900,height=700');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
  }

  if (loading) return <p style={{ color: T.muted }}>Chargement...</p>;
  if (!recette) return null;

  const scaleFactor = form.portions > 0 ? couverts / form.portions : 1;
  const ingData = (form.ingredients || []).map(ing => {
    const cat = catalog.find(c => c.nom.toLowerCase() === (ing.nom || '').toLowerCase());
    const ingTva = ing.tva ?? cat?.tva ?? 10;
    const coutHT = coutIng(ing) * scaleFactor;
    const coutTTC = coutHT * (1 + ingTva / 100);
    return { ...ing, ingTva, coutHT, coutTTC, catUnite: cat?.unite };
  });
  const totalHTScaled = ingData.reduce((a, i) => a + i.coutHT, 0);
  const totalTTCScaled = ingData.reduce((a, i) => a + i.coutTTC, 0);
  const cout = (form.ingredients || []).reduce((acc, i) => acc + coutIng(i), 0);
  const coutPortion = form.portions > 0 ? cout / form.portions : 0;
  const coutScaled = totalHTScaled;
  const prixVente = form.prixVente || 0;
  const prixVenteTTC = prixVente * (1 + parametres.tva / 100);
  const foodCost = prixVenteTTC > 0 ? (coutPortion / prixVenteTTC * 100) : 0;
  const pvHTSuggere = coutPortion > 0 ? (coutPortion / (parametres.foodCostCible / 100)) : 0;
  const pvTTC = pvHTSuggere * (1 + parametres.tva / 100);
  const coeff = coutPortion > 0 && prixVente > 0 ? prixVente / coutPortion : 0;
  const fcColor = foodCost === 0 ? T.muted : foodCost < 30 ? '#16a34a' : foodCost < 35 ? '#d97706' : '#dc2626';

  const prixVentePratiqueTTCVal = form.prixVentePratiqueTTC || 0;
  const prixVentePratiqueHT = prixVentePratiqueTTCVal > 0 ? prixVentePratiqueTTCVal / (1 + parametres.tva / 100) : 0;
  const coutPortionTTCCalc = couverts > 0 ? totalTTCScaled / couverts : 0;
  const fcCible = parametres.foodCostCible || 30;
  const tauxCout2Raw = calculerFoodCost(coutPortionTTCCalc, prixVentePratiqueTTCVal);
  const tauxCout2 = tauxCout2Raw ?? 0;
  const fcColor2 = tauxCout2 === 0 ? T.muted : tauxCout2 < fcCible ? '#16a34a' : tauxCout2 < fcCible + 5 ? '#d97706' : '#dc2626';
  const statusLabel = tauxCout2 === 0 ? '' : tauxCout2 < fcCible ? 'Rentable' : tauxCout2 < fcCible + 5 ? 'Limite' : 'Insuffisant';
  const statusBg = tauxCout2 === 0 ? '#F9F7F4' : tauxCout2 < fcCible ? '#DCFCE7' : tauxCout2 < fcCible + 5 ? '#FEF9EC' : '#FEE2E2';
  const statusColor = tauxCout2 === 0 ? T.muted : tauxCout2 < fcCible ? '#16a34a' : tauxCout2 < fcCible + 5 ? '#92400e' : '#dc2626';
  const coeff2 = coutPortion > 0 && prixVentePratiqueHT > 0 ? prixVentePratiqueHT / coutPortion : 0;
  const margeBrute = prixVentePratiqueTTCVal > 0 ? prixVentePratiqueTTCVal - coutPortionTTCCalc : 0;

  const donutData = (form.ingredients || [])
    .map((i, idx) => ({ name: i.nom || `#${idx + 1}`, value: parseFloat(coutIng(i).toFixed(4)), color: CHART_COLORS[idx % CHART_COLORS.length] }))
    .filter(d => d.value > 0);

  const cartesContenant = cartes.flatMap(carte =>
    (carte.sections || []).flatMap(section =>
      section.plats.filter(p => p.recetteId === id).map(() => ({ carte, section }))
    )
  );

  const sectionsDisponibles = selectedCarteId
    ? (cartes.find(c => c.id === selectedCarteId)?.sections || []).filter(s => !s.plats.find(p => p.recetteId === id))
    : [];

  const btnPrimary = { padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: T.green, color: '#fff', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" };
  const btnSecondary = { padding: '0.5rem 1.25rem', borderRadius: '8px', border: '1px solid #E5E0D8', background: '#fff', color: T.text, cursor: 'pointer', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" };
  const btnOutline = { fontSize: '0.82rem', color: T.green, background: 'none', border: '1px solid #2D6A4F', borderRadius: '6px', padding: '0.35rem 0.9rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", fontWeight: 500 };

  return (
    <div style={{ maxWidth: '860px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', marginBottom: '2rem' }}>
        <Link to="/fiches-techniques" style={{ color: T.muted, textDecoration: 'none', fontSize: '0.875rem', marginTop: '6px', flexShrink: 0 }}>← Retour</Link>
        <div style={{ flex: 1 }}>
          {editMode
            ? <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))} style={{ ...inputStyle, fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700 }} />
            : <h1 data-font-playfair style={{ fontSize: '1.8rem', fontWeight: 700, color: T.text, lineHeight: 1.2 }}>{recette.nom}</h1>
          }
          {catEdit && !editMode ? (
            <select
              autoFocus
              value={recette.categorie || 'Autre'}
              onChange={e => {
                const newCat = e.target.value;
                const updated = { ...recette, categorie: newCat };
                api.recettes.update(id, updated).then(data => { setRecette(data); setForm(data); setCatEdit(false); });
              }}
              onBlur={() => setCatEdit(false)}
              style={{ fontSize: '0.75rem', padding: '3px 8px', border: '1px solid #2D6A4F', borderRadius: '4px', color: T.green, background: '#fff', fontFamily: "'DM Sans', sans-serif", outline: 'none', marginTop: '8px', display: 'inline-block' }}
            >
              {['Amuse-bouche', 'Entrée', 'Plat viande', 'Plat poisson', 'Plat végétarien', 'Dessert', 'Autre'].map(c => <option key={c}>{c}</option>)}
            </select>
          ) : (
            <span
              onClick={() => !editMode && setCatEdit(true)}
              title={editMode ? undefined : 'Cliquer pour changer la catégorie'}
              style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: T.green, background: 'rgba(45,106,79,0.08)', padding: '3px 8px', borderRadius: '4px', display: 'inline-block', marginTop: '8px', cursor: editMode ? 'default' : 'pointer' }}
            >
              {recette.categorie || 'Non classé'}
            </span>
          )}
          {/* Badges cartes */}
          {!editMode && (
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginTop: '7px', alignItems: 'center' }}>
              {cartesContenant.map(({ carte, section }) => (
                <span key={carte.id + section.titre} style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.72rem', fontWeight: 600, padding: '2px 4px 2px 8px', borderRadius: '99px', background: 'rgba(201,168,76,0.1)', color: '#8B6914', border: '1px solid rgba(201,168,76,0.3)' }}>
                  {carte.nom}
                  <span style={{ color: '#A07828', fontWeight: 400, fontSize: '0.68rem' }}>&nbsp;{section.titre}</span>
                  <button onClick={() => retirerDeCarte(carte, section.titre)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#B45309', fontSize: '0.85rem', padding: '0 3px', lineHeight: 1 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#dc2626'} onMouseLeave={e => e.currentTarget.style.color = '#B45309'}
                  >×</button>
                </span>
              ))}
              {!showCarteAdd ? (
                <button onClick={() => setShowCarteAdd(true)} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '99px', border: '1px dashed rgba(201,168,76,0.5)', background: 'transparent', color: '#C9A84C', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                  + Carte
                </button>
              ) : (
                <div style={{ display: 'inline-flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap' }}>
                  <select value={selectedCarteId} onChange={e => { setSelectedCarteId(e.target.value); setSelectedSection(''); }}
                    style={{ fontSize: '0.75rem', padding: '2px 4px', border: '1px solid #E5E0D8', borderRadius: '4px', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}>
                    <option value="">Carte…</option>
                    {cartes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                  {selectedCarteId && (
                    <select value={selectedSection} onChange={e => setSelectedSection(e.target.value)}
                      style={{ fontSize: '0.75rem', padding: '2px 4px', border: '1px solid #E5E0D8', borderRadius: '4px', outline: 'none', fontFamily: "'DM Sans', sans-serif" }}>
                      <option value="">Section…</option>
                      {sectionsDisponibles.map(s => <option key={s.titre} value={s.titre}>{s.titre}</option>)}
                    </select>
                  )}
                  {selectedCarteId && selectedSection && (
                    <button onClick={ajouterACarte} style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: T.green, color: '#fff', border: 'none', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>OK</button>
                  )}
                  <button onClick={() => { setShowCarteAdd(false); setSelectedCarteId(''); setSelectedSection(''); }}
                    style={{ fontSize: '0.72rem', padding: '2px 6px', borderRadius: '4px', background: 'none', border: '1px solid #E5E0D8', cursor: 'pointer', color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>✕</button>
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
          <button onClick={exportPDF} style={{ ...btnSecondary, color: T.gold, borderColor: '#C9A84C' }}
            onMouseEnter={e => e.currentTarget.style.background = '#FFFBF0'} onMouseLeave={e => e.currentTarget.style.background = '#fff'}>↓ PDF</button>
          {editMode ? (
            <>
              <button onClick={() => { setForm(recette); setEditMode(false); }} style={btnSecondary}>Annuler</button>
              <button onClick={sauvegarder} style={btnPrimary}
                onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'} onMouseLeave={e => e.currentTarget.style.background = T.green}>Sauvegarder</button>
            </>
          ) : (
            <button onClick={() => setEditMode(true)} style={{ ...btnSecondary, color: T.green, borderColor: '#2D6A4F' }}>Modifier</button>
          )}
        </div>
      </div>

      {/* Stats rapides + Couverts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
        {[
          { label: 'Temps prep', value: (form.tempsPreparation || 0) + ' min' },
          { label: 'Temps cuisson', value: (form.tempsCuisson || 0) + ' min' },
          { label: 'Portions recette', value: form.portions || '—' },
        ].map(({ label, value }) => (
          <div key={label} style={{ ...card, padding: '1rem 1.25rem' }}>
            <div style={{ fontSize: '0.72rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600, marginBottom: '4px' }}>{label}</div>
            <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, color: T.text }}>{value}</div>
          </div>
        ))}
        <div style={{ ...card, padding: '1rem 1.25rem', border: '2px solid rgba(201,168,76,0.35)' }}>
          <div style={{ fontSize: '0.72rem', color: T.gold, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '4px' }}>Couverts</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button onClick={() => setCouverts(c => Math.max(1, c - 1))} style={{ width: '26px', height: '26px', border: '1px solid #E5E0D8', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text, flexShrink: 0 }}>−</button>
            <input type="number" min="1" value={couverts} onChange={e => setCouverts(Math.max(1, parseInt(e.target.value) || 1))}
              style={{ ...inputStyle, width: '52px', textAlign: 'center', fontFamily: "'Playfair Display', serif", fontSize: '1.4rem', fontWeight: 700, padding: '0' }} />
            <button onClick={() => setCouverts(c => c + 1)} style={{ width: '26px', height: '26px', border: '1px solid #E5E0D8', borderRadius: '4px', background: '#fff', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.text, flexShrink: 0 }}>+</button>
          </div>
        </div>
      </div>

      {/* Informations */}
      <div style={{ ...card, padding: '1.5rem', marginBottom: '1rem' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: T.text, marginBottom: '1.25rem' }}>Informations générales</h3>
        {editMode && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>Catégorie</label>
              <select value={form.categorie || 'Autre'} onChange={e => setForm(f => ({ ...f, categorie: e.target.value }))} style={inputStyle}>
                {['Amuse-bouche', 'Entrée', 'Plat viande', 'Plat poisson', 'Plat végétarien', 'Dessert', 'Autre'].map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            {[
              { label: 'Nb. de portions', field: 'portions', type: 'number' },
              { label: 'Prép (min)', field: 'tempsPreparation', type: 'number' },
              { label: 'Cuisson (min)', field: 'tempsCuisson', type: 'number' },
              { label: 'Prix vente HT (EUR)', field: 'prixVente', type: 'number', step: '0.01' },
            ].map(({ label, field, type, step }) => (
              <div key={field}>
                <label style={labelStyle}>{label}</label>
                <input type={type || 'text'} step={step} value={form[field] || ''} onChange={e => setForm(f => ({ ...f, [field]: type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value }))} style={inputStyle} />
              </div>
            ))}
          </div>
        )}
        <div>
          <label style={labelStyle}>Description</label>
          {editMode
            ? <textarea value={form.description || ''} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} style={{ ...inputStyle, minHeight: '80px', resize: 'vertical' }} />
            : <p style={{ color: '#374151', lineHeight: 1.6, fontSize: '0.9rem' }}>{recette.description || '—'}</p>}
        </div>
      </div>

      {/* Ingrédients */}
      <div style={{ ...card, padding: '1.5rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: T.text }}>Ingrédients</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            {scaleFactor !== 1 && <span style={{ fontSize: '0.78rem', color: T.gold, fontWeight: 600 }}>×{scaleFactor.toFixed(2)} ({couverts} couverts)</span>}
            {editMode && <button onClick={ajouterIngredient} style={btnOutline}>+ Ajouter</button>}
          </div>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem', minWidth: '600px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #F3EFE8' }}>
                {['Ingrédient', 'Quantité', 'Unité', 'Prix/unité', 'TVA', 'Coût HT', 'Coût TTC'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.75rem', color: T.muted, fontWeight: 600, textAlign: 'left', fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                ))}
                {editMode && <th></th>}
              </tr>
            </thead>
            <tbody>
              {ingData.map((ing, idx) => {
                const qteScaled = ing.quantite * scaleFactor;
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #F9F7F4' }}>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      {editMode
                        ? <IngredientAutocomplete value={ing.nom} catalog={catalog} onChange={fields => updateIngredient(idx, { nom: fields.nom !== undefined ? fields.nom : ing.nom, ...(fields.prixUnitaire !== undefined ? { prixUnitaire: fields.prixUnitaire } : {}), ...(fields.unite !== undefined ? { unite: fields.unite } : {}) })} />
                        : <span style={{ fontWeight: 500 }}>{ing.nom}</span>}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      {editMode
                        ? <input type="number" step="0.001" min="0" value={ing.quantite} onChange={e => updateIngredient(idx, { quantite: parseFloat(e.target.value) || 0 })} style={{ ...inputStyle, width: '80px' }} />
                        : <span style={{ color: scaleFactor !== 1 ? T.gold : T.text, fontWeight: scaleFactor !== 1 ? 600 : 400 }}>{Number.isInteger(qteScaled) ? qteScaled : qteScaled.toFixed(1)}</span>}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      {editMode
                        ? <select value={ing.unite} onChange={e => updateIngredient(idx, { unite: e.target.value })} style={inputStyle}>{UNITES.map(u => <option key={u}>{u}</option>)}</select>
                        : <span style={{ color: T.muted }}>{ing.unite}</span>}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem' }}>
                      {editMode ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                          <input type="number" step="0.001" value={ing.prixUnitaire} onChange={e => updateIngredient(idx, { prixUnitaire: parseFloat(e.target.value) || 0 })} style={{ ...inputStyle, width: '80px' }} />
                          {ing.prixUnitaire === 0 && ing.nom && (
                            <span title="Prix manquant — allez dans Ingrédients pour l'ajouter" style={{ cursor: 'help' }}>⚠️</span>
                          )}
                        </div>
                      ) : (
                        <span style={{ color: T.muted }}>
                          {ing.prixUnitaire === 0 && ing.nom
                            ? <>{ing.prixUnitaire} EUR <span title="Prix manquant — allez dans Ingrédients pour l'ajouter" style={{ cursor: 'help' }}>⚠️</span></>
                            : ing.catUnite
                              ? <>{ing.prixUnitaire} EUR&nbsp;/&nbsp;{ing.catUnite}</>
                              : ing.nom
                                ? <>{ing.prixUnitaire} EUR&nbsp;/&nbsp;{ing.unite} <span title="Ingrédient absent de la base — prix saisi manuellement" style={{ cursor: 'help' }}>⚠️</span></>
                                : <>{ing.prixUnitaire} EUR</>
                          }
                        </span>
                      )}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', color: T.muted, fontSize: '0.82rem' }}>{ing.ingTva}%</td>
                    <td style={{ padding: '0.6rem 0.75rem', color: ing.prixUnitaire === 0 ? T.muted : T.text }}>
                      {ing.coutHT.toFixed(2) + ' EUR'}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', fontWeight: 600, color: ing.prixUnitaire === 0 ? T.muted : T.green }}>
                      {ing.coutTTC.toFixed(2) + ' EUR'}
                    </td>
                    {editMode && (
                      <td style={{ padding: '0.6rem 0.75rem' }}>
                        <button onClick={() => supprimerIngredient(idx)} style={{ background: 'none', border: 'none', color: '#D1C4B0', cursor: 'pointer', fontSize: '1rem' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#ef4444'} onMouseLeave={e => e.currentTarget.style.color = '#D1C4B0'}>✕</button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: '2px solid #F3EFE8' }}>
                <td colSpan={editMode ? 5 : 4} style={{ padding: '0.75rem 0.75rem', textAlign: 'right', color: T.muted, fontSize: '0.85rem', fontWeight: 600 }}>
                  Total coût matière HT {couverts !== form.portions ? `(${couverts} couverts)` : ''}
                </td>
                <td style={{ padding: '0.75rem 0.75rem', color: T.text, fontWeight: 600 }}>{totalHTScaled.toFixed(2)} EUR</td>
                <td style={{ padding: '0.75rem 0.75rem', fontWeight: 700, color: T.green }}>{totalTTCScaled.toFixed(2)} EUR</td>
                {editMode && <td></td>}
              </tr>
              <tr>
                <td colSpan={editMode ? 5 : 4} style={{ padding: '0.25rem 0.75rem', textAlign: 'right', color: T.muted, fontSize: '0.85rem', fontWeight: 600 }}>Coût par couvert (HT)</td>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 700, fontSize: '1.05rem', color: T.text }}>{coutPortion.toFixed(2)} EUR</td>
                <td style={{ padding: '0.25rem 0.75rem', fontWeight: 700, fontSize: '1.05rem', color: T.green }}>{(totalTTCScaled / couverts).toFixed(2)} EUR</td>
                {editMode && <td></td>}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Analyse financière */}
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid #F3EFE8', paddingTop: '1.25rem' }}>
          <h4 style={{ fontSize: '0.78rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.875rem' }}>Analyse financière</h4>

          {/* Prix de vente pratiqué — toujours éditable */}
          <div style={{ background: 'linear-gradient(135deg, #F8F6F1 0%, #F3EFE8 100%)', borderRadius: '10px', padding: '1rem 1.25rem', marginBottom: '0.875rem', border: '1px solid #EDE8DF', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Prix de vente pratiqué TTC (€)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <input
                  type="number" step="0.01" min="0"
                  value={prixVentePratiqueTTCVal || ''}
                  onChange={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setForm(f => ({ ...f, prixVentePratiqueTTC: val }));
                  }}
                  onBlur={e => {
                    const val = parseFloat(e.target.value) || 0;
                    setForm(f => {
                      const updated = { ...f, prixVentePratiqueTTC: val };
                      savePrixVentePratiqueTTC(updated);
                      return updated;
                    });
                  }}
                  style={{ ...inputStyle, width: '130px', fontSize: '1.2rem', fontWeight: 700, padding: '0.4rem 0.6rem' }}
                  placeholder="0.00"
                />
                <span style={{ color: T.muted, fontWeight: 600, fontSize: '0.9rem' }}>EUR TTC</span>
              </div>
            </div>
            {statusLabel && (
              <span style={{ padding: '0.45rem 1.1rem', borderRadius: '20px', fontSize: '0.82rem', fontWeight: 700, background: statusBg, color: statusColor, border: `1px solid ${statusColor}33` }}>
                {statusLabel}
              </span>
            )}
          </div>

          {/* Métriques temps réel */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.75rem', marginBottom: '0.75rem' }}>
            <div style={{ background: '#F8F6F1', borderRadius: '8px', padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Taux de coût matière</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: prixVentePratiqueTTCVal > 0 ? fcColor2 : T.muted }}>
                {prixVentePratiqueTTCVal > 0 ? tauxCout2.toFixed(1) + '%' : '—'}
              </div>
              <div style={{ fontSize: '0.68rem', color: T.muted, marginTop: '3px' }}>coût TTC / PV TTC × 100</div>
            </div>
            <div style={{ background: '#F8F6F1', borderRadius: '8px', padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Coefficient multiplicateur</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: T.text }}>
                {coeff2 > 0 ? '×' + coeff2.toFixed(2) : '—'}
              </div>
              <div style={{ fontSize: '0.68rem', color: T.muted, marginTop: '3px' }}>PV HT / coût HT par couvert</div>
            </div>
            <div style={{ background: '#F8F6F1', borderRadius: '8px', padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Marge brute par couvert</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: margeBrute > 0 ? T.green : margeBrute < 0 ? '#dc2626' : T.muted }}>
                {prixVentePratiqueTTCVal > 0 ? margeBrute.toFixed(2) + ' €' : '—'}
              </div>
              <div style={{ fontSize: '0.68rem', color: T.muted, marginTop: '3px' }}>PV TTC − coût TTC/couvert</div>
            </div>
          </div>

          {/* Prix suggérés */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.75rem' }}>
            <div style={{ background: '#F8F6F1', borderRadius: '8px', padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Prix de vente suggéré HT (objectif {parametres.foodCostCible}%)</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: T.green }}>
                {pvHTSuggere > 0 ? pvHTSuggere.toFixed(2) + ' €' : '—'}
              </div>
            </div>
            <div style={{ background: '#F8F6F1', borderRadius: '8px', padding: '0.875rem 1rem' }}>
              <div style={{ fontSize: '0.68rem', color: T.muted, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Prix de vente suggéré TTC (TVA {parametres.tva}%)</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 700, color: T.text }}>
                {pvTTC > 0 ? pvTTC.toFixed(2) + ' €' : '—'}
              </div>
            </div>
          </div>
        </div>

        {/* Donut */}
        {donutData.length >= 2 && (
          <div style={{ marginTop: '1.5rem', borderTop: '1px solid #F3EFE8', paddingTop: '1.25rem' }}>
            <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 700, color: T.text, marginBottom: '0.75rem' }}>Répartition des coûts</h4>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={donutData} cx="50%" cy="50%" innerRadius={65} outerRadius={105} paddingAngle={2} dataKey="value">
                  {donutData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                </Pie>
                <Tooltip formatter={(val, name) => [`${val.toFixed(2)} EUR (${cout > 0 ? (val / cout * 100).toFixed(1) : 0}%)`, name]} />
                <Legend formatter={(val, entry) => `${val} — ${cout > 0 ? (entry.payload.value / cout * 100).toFixed(1) : 0}%`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Étapes */}
      <div style={{ ...card, padding: '1.5rem', marginBottom: '1rem' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: T.text, marginBottom: '1.25rem' }}>Étapes de préparation</h3>
        {editMode ? (
          <EtapesEditor
            etapes={form.etapes || []}
            onChange={etapes => setForm(f => ({ ...f, etapes }))}
          />
        ) : (
          <>
            {(recette.etapes || []).length === 0 && (
              <p style={{ color: T.muted, fontSize: '0.875rem', fontStyle: 'italic' }}>Aucune étape. Cliquez sur Modifier pour en ajouter.</p>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {(recette.etapes || []).map((etape, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                  <div style={{ flexShrink: 0, fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: T.gold, lineHeight: 1, width: '36px', textAlign: 'center' }}>{idx + 1}</div>
                  <p style={{ flex: 1, color: '#374151', lineHeight: 1.65, fontSize: '0.9rem', margin: '0', paddingTop: '4px' }}>{etape}</p>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Allergènes */}
      <div style={{ ...card, padding: '1.5rem' }}>
        <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: T.text, marginBottom: '1rem' }}>Allergènes</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
          {ALLERGENES_LIST.map(a => {
            const actif = (form.allergenes || []).includes(a);
            return (
              <span key={a} onClick={() => editMode && toggleAllergene(a)} style={{ padding: '0.35rem 0.9rem', borderRadius: '20px', fontSize: '0.8rem', background: actif ? '#FEF9EC' : '#F9F7F4', color: actif ? '#92400e' : T.muted, border: actif ? '1px solid #F6E8B8' : '1px solid #EDE8DF', cursor: editMode ? 'pointer' : 'default', fontWeight: actif ? 600 : 400, transition: 'all 0.1s' }}>{a}</span>
            );
          })}
        </div>
      </div>
    </div>
  );
}
