import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, rectSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useWindowWidth } from '../hooks/useWindowWidth.js';
import { coutIng } from '../utils.js';
import { api } from '../api.js';
import html2pdf from 'html2pdf.js';

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280', red: '#DC2626' };
const card = { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };
const inputStyle = { padding: '0.45rem 0.7rem', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: T.text, width: '100%' };

const SECTIONS_DEFAULT = ['Amuse-bouche', 'Entrées', 'Plats', 'Desserts'];
const SAISONS = ['Printemps 2026', 'Été 2026', 'Automne 2026', 'Hiver 2026', "Toute l'année"];
const CATEGORIES = ['Amuse-bouche', 'Entrée', 'Plat', 'Dessert', 'Boisson', 'Snack'];

const ALLERGENES_14 = [
  { code: 'G',   key: 'gluten',        label: 'Gluten' },
  { code: 'C',   key: 'crustaces',     label: 'Crustacés' },
  { code: 'O',   key: 'oeufs',         label: 'Œufs' },
  { code: 'P',   key: 'poisson',       label: 'Poisson' },
  { code: 'A',   key: 'arachides',     label: 'Arachides' },
  { code: 'So',  key: 'soja',          label: 'Soja' },
  { code: 'L',   key: 'lait',          label: 'Lait' },
  { code: 'FN',  key: 'fruits_a_coque',label: 'Fruits à coque' },
  { code: 'Ce',  key: 'celeri',        label: 'Céleri' },
  { code: 'Mo',  key: 'moutarde',      label: 'Moutarde' },
  { code: 'Se',  key: 'sesame',        label: 'Sésame' },
  { code: 'Su',  key: 'sulfites',      label: 'Sulfites' },
  { code: 'Lu',  key: 'lupin',         label: 'Lupin' },
  { code: 'Mol', key: 'mollusques',    label: 'Mollusques' },
];

function coutMat(r) { return (r.ingredients || []).reduce((s, i) => s + coutIng(i), 0); }
function coutPortion(r) { return r.portions > 0 ? coutMat(r) / r.portions : 0; }
function fcNum(cp, pv) { return pv > 0 ? cp / pv * 100 : null; }
function fcColor(pct) { if (pct < 30) return T.green; if (pct <= 35) return '#D97706'; return T.red; }
function fcBadge(fc) {
  if (fc === null) return null;
  if (fc < 25)  return { icon: '⭐', label: 'Excellent',      color: '#16a34a', bg: '#DCFCE7' };
  if (fc <= 30) return { icon: '✅', label: 'Rentable',       color: '#2D6A4F', bg: '#D1FAE5' };
  if (fc <= 35) return { icon: '⚠️', label: 'Acceptable',    color: '#D97706', bg: '#FEF3C7' };
  return         { icon: '🔴', label: 'À retravailler', color: '#DC2626', bg: '#FEE2E2' };
}
function relDate(iso) {
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return "Aujourd'hui"; if (d === 1) return 'Hier';
  if (d < 7) return `Il y a ${d}j`; return `Il y a ${Math.floor(d / 7)}sem`;
}

// ─── Sortable carte card ──────────────────────────────────────────────────────
function SortableCarteCard({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }}>
      {children({ dragHandleProps: { ...attributes, ...listeners } })}
    </div>
  );
}

// ─── Vue liste ────────────────────────────────────────────────────────────────
function ListeCartes({ cartes, onNew, onOpen, onDelete }) {
  const [search, setSearch] = useState('');
  const [localCartes, setLocalCartes] = useState(() =>
    [...cartes].sort((a, b) => (a.ordre ?? Infinity) - (b.ordre ?? Infinity))
  );
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    setLocalCartes([...cartes].sort((a, b) => (a.ordre ?? Infinity) - (b.ordre ?? Infinity)));
  }, [cartes]);

  const filtered = search
    ? localCartes.filter(c => c.nom.toLowerCase().includes(search.toLowerCase()))
    : localCartes;

  function handleDragEnd(event) {
    if (search) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setLocalCartes(prev => {
      const oi = prev.findIndex(c => c.id === active.id);
      const ni = prev.findIndex(c => c.id === over.id);
      const next = arrayMove(prev, oi, ni);
      next.forEach((c, i) => {
        if ((c.ordre ?? -1) !== i) {
          api.cartes.update(c.id, { ...c, ordre: i }).catch(() => {});
        }
      });
      return next.map((c, i) => ({ ...c, ordre: i }));
    });
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: T.text }}>Cartes</h1>
          <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '2px' }}>{localCartes.length} carte{localCartes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={onNew} style={{ padding: '0.55rem 1.25rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
          onMouseLeave={e => e.currentTarget.style.background = T.green}
        >+ Nouvelle carte</button>
      </div>

      <input
        type="search"
        placeholder="Rechercher une carte..."
        value={search}
        onChange={e => setSearch(e.target.value)}
        style={{ ...inputStyle, marginBottom: '1.5rem', maxWidth: '320px' }}
      />

      {localCartes.length === 0 && <p style={{ color: T.muted }}>Aucune carte. Créez-en une !</p>}
      {filtered.length === 0 && localCartes.length > 0 && (
        <p style={{ color: T.muted }}>Aucune carte ne correspond à votre recherche.</p>
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={filtered.map(c => c.id)} strategy={rectSortingStrategy}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
            {filtered.map(carte => {
              const nb = (carte.sections || []).reduce((s, sec) => s + (sec.plats || []).length, 0);
              return (
                <SortableCarteCard key={carte.id} id={carte.id}>
                  {({ dragHandleProps }) => (
                    <div style={{ ...card, padding: '1.5rem', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
                      onClick={() => onOpen(carte)}
                      onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(45,106,79,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
                      onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = ''; }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                            {!search && (
                              <span {...dragHandleProps} onClick={e => e.stopPropagation()} style={{ cursor: 'grab', color: '#C5BDB0', fontSize: '1rem', lineHeight: 1, flexShrink: 0 }} title="Glisser pour réordonner">⠿</span>
                            )}
                            <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.gold, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{carte.saison}</div>
                          </div>
                          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.15rem', fontWeight: 700, color: T.text }}>{carte.nom}</h2>
                        </div>
                        <button onClick={e => { e.stopPropagation(); onDelete(carte.id); }} style={{ background: 'none', border: 'none', color: '#D1C4B0', cursor: 'pointer', fontSize: '1rem', padding: '2px 6px' }}
                          onMouseEnter={e => e.currentTarget.style.color = T.red}
                          onMouseLeave={e => e.currentTarget.style.color = '#D1C4B0'}
                        >✕</button>
                      </div>
                      <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', fontSize: '0.8rem', color: T.muted }}>
                        <span>{(carte.sections || []).length} sections</span>
                        <span>·</span>
                        <span>{nb} plat{nb !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>{relDate(carte.createdAt)}</span>
                      </div>
                      <div style={{ marginTop: '0.75rem', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {(carte.sections || []).map(s => (
                          <span key={s.titre} style={{ fontSize: '0.7rem', background: '#F3EFE8', color: T.muted, padding: '2px 8px', borderRadius: '4px' }}>{s.titre}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </SortableCarteCard>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

async function downloadPDF(htmlString, filename, landscape = false) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlString, 'text/html');
  doc.body.querySelectorAll('*').forEach(el => {
    if (el.style.position === 'fixed') {
      el.style.position = 'static';
      el.style.removeProperty('bottom');
      el.style.removeProperty('top');
      el.style.removeProperty('left');
      el.style.removeProperty('right');
      el.style.marginTop = '16px';
    }
  });
  const styleText = [...doc.querySelectorAll('style')]
    .map(s => s.textContent.replace(/@page[^}]*\{[^}]*\}/g, ''))
    .join('\n');
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `position:absolute;top:-9999px;left:0;background:white;width:${landscape ? '277' : '180'}mm;`;
  if (styleText) {
    const styleEl = document.createElement('style');
    styleEl.textContent = styleText;
    wrapper.appendChild(styleEl);
  }
  const content = document.createElement('div');
  content.innerHTML = doc.body.innerHTML;
  wrapper.appendChild(content);
  document.body.appendChild(wrapper);
  try {
    const url = await html2pdf().set({
      margin: landscape ? [8, 8, 8, 8] : [18, 14, 18, 14],
      filename,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false },
      jsPDF: { unit: 'mm', format: 'a4', orientation: landscape ? 'landscape' : 'portrait' },
    }).from(content).output('bloburl');
    window.open(url, '_blank');
  } finally {
    document.body.removeChild(wrapper);
  }
}

// ─── Description editor inline ───────────────────────────────────────────────
function DescriptionEditor({ recette, onSaved }) {
  const [value, setValue] = useState(recette?.description_commerciale || '');
  const [iaLoading, setIaLoading] = useState(false);
  const debounceRef = useRef(null);
  const taRef = useRef(null);

  useEffect(() => {
    setValue(recette?.description_commerciale || '');
  }, [recette?.id]);

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto';
      taRef.current.style.height = taRef.current.scrollHeight + 'px';
    }
  }, [value]);

  function handleChange(e) {
    const val = e.target.value;
    setValue(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      api.recettes.update(recette.id, { ...recette, description_commerciale: val })
        .then(updated => onSaved?.(updated))
        .catch(() => {});
    }, 500);
  }

  async function handleGenerate(e) {
    e.stopPropagation();
    if (!recette) return;
    setIaLoading(true);
    try {
      const result = await api.ia.descriptionCommerciale({
        nom: recette.nom,
        description: recette.description,
        categorie: recette.categorie,
        ingredients: recette.ingredients,
      });
      const desc = result.description_commerciale || result.description || result.text || '';
      setValue(desc);
      const updated = await api.recettes.update(recette.id, { ...recette, description_commerciale: desc });
      onSaved?.(updated);
    } catch {}
    finally { setIaLoading(false); }
  }

  if (!recette) return null;

  return (
    <div style={{ marginTop: '5px', display: 'flex', gap: '5px', alignItems: 'flex-start' }} onClick={e => e.stopPropagation()}>
      <textarea
        ref={taRef}
        value={value}
        onChange={handleChange}
        placeholder="Description commerciale..."
        rows={1}
        style={{
          flex: 1, resize: 'none', overflow: 'hidden',
          padding: '4px 7px', border: '1px solid #E5E0D8', borderRadius: '6px',
          fontSize: '0.78rem', fontFamily: "'DM Sans', sans-serif", color: T.text,
          lineHeight: 1.45, fontStyle: 'italic', outline: 'none', background: 'transparent',
        }}
      />
      <button
        onClick={handleGenerate}
        disabled={iaLoading}
        title="Générer avec l'IA"
        style={{
          flexShrink: 0, padding: '4px 7px',
          background: iaLoading ? '#9CA3AF' : T.green,
          color: '#fff', border: 'none', borderRadius: '6px',
          fontSize: '0.68rem', fontWeight: 600,
          cursor: iaLoading ? 'default' : 'pointer',
          fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap',
        }}
      >{iaLoading ? '...' : '✨ IA'}</button>
    </div>
  );
}

// ─── Vue consultant ───────────────────────────────────────────────────────────
function VueCarte({ carte, recettes, parametres, onEdit, onBack, onAutoSave }) {
  // showAllergenesMenu removed — buttons are now direct
  const [closedSections, setClosedSections] = useState(new Set());
  const [pdfLoading, setPdfLoading] = useState(false);
  const [localSections, setLocalSections] = useState(carte?.sections || []);
  const [localRecettes, setLocalRecettes] = useState(recettes);
  const autoSaveTimerVC = useRef(null);

  useEffect(() => { setLocalRecettes(recettes); }, [recettes]);
  const width = useWindowWidth();
  const isMobile = width < 900;
  const date = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const etablissement = parametres?.etablissement || 'Restaurant';
  const fcCible = parametres?.foodCostCible || 30;

  useEffect(() => { setLocalSections(carte?.sections || []); }, [carte?.id]);

  function toggleSection(titre) {
    setClosedSections(prev => {
      const next = new Set(prev);
      if (next.has(titre)) next.delete(titre); else next.add(titre);
      return next;
    });
  }

  function updatePrixVente(sectionTitre, recetteId, prix) {
    const updated = localSections.map(s =>
      s.titre === sectionTitre
        ? { ...s, plats: s.plats.map(p => p.recetteId === recetteId ? { ...p, prixVente: parseFloat(prix) || 0 } : p) }
        : s
    );
    setLocalSections(updated);
    const prixNum = parseFloat(prix) || 0;
    api.recettes.updatePrix(recetteId, prixNum).catch(() => {});
    clearTimeout(autoSaveTimerVC.current);
    autoSaveTimerVC.current = setTimeout(() => {
      api.cartes.update(carte.id, { ...carte, sections: updated })
        .then(saved => onAutoSave?.(saved)).catch(() => {});
    }, 500);
  }

  const allSectionsWithData = localSections.map(section => ({
    ...section,
    platsData: section.plats.map(plat => {
      const rec = localRecettes.find(r => r.id === plat.recetteId);
      const cp = rec ? coutPortion(rec) : 0;
      const fc = fcNum(cp, plat.prixVente);
      return { ...plat, rec, cp, fc };
    }),
  }));

  const allPlatsData = allSectionsWithData.flatMap(s => s.platsData);
  const nbTotal = allPlatsData.length;
  const platsWithFC = allPlatsData.filter(p => p.fc !== null);
  const globalFC = platsWithFC.length > 0 ? platsWithFC.reduce((s, p) => s + p.fc, 0) / platsWithFC.length : null;

  const fcBySection = allSectionsWithData.map(s => {
    const withFC = s.platsData.filter(p => p.fc !== null);
    return {
      titre: s.titre,
      count: s.plats.length,
      avgFC: withFC.length > 0 ? withFC.reduce((sum, p) => sum + p.fc, 0) / withFC.length : null,
    };
  });

  // ── Recommendations ──
  const recos = [];

  if (globalFC !== null) {
    if (globalFC > 35) recos.push({ type: 'danger',  msg: `🔴 Food cost global trop élevé (${globalFC.toFixed(1)}%) — votre seuil cible est dépassé` });
    else if (globalFC < 25) recos.push({ type: 'success', msg: `⭐ Excellente rentabilité globale — food cost à ${globalFC.toFixed(1)}%` });
  }
  if (nbTotal > 30) recos.push({ type: 'warning', msg: `⚠️ Carte trop longue (${nbTotal} plats) — au-delà de 30 plats la gestion des stocks devient complexe` });

  localSections.forEach(section => {
    const nb = section.plats.length;
    if (nb > 8) recos.push({ type: 'warning', msg: `⚠️ Trop de choix en ${section.titre} (${nb} plats) — au-delà de 8 le client est indécis` });
    if (nb === 1) recos.push({ type: 'info', msg: `⚠️ ${section.titre} trop légère (${nb} plat) — proposez au moins 2-3 options` });
    const pvs = section.plats.map(p => p.prixVente).filter(v => v > 0);
    if (pvs.length >= 2) {
      const min = Math.min(...pvs), max = Math.max(...pvs);
      if (max > min * 3) recos.push({ type: 'warning', msg: `⚠️ Écart de prix trop grand en ${section.titre} (${min.toFixed(0)} € → ${max.toFixed(0)} €) — risque de déséquilibre perçu` });
    }
  });

  const allRecs = allPlatsData.map(p => p.rec).filter(Boolean);
  if (nbTotal > 0) {
    if (!allRecs.some(r => (r.categorie || '').toLowerCase().includes('végét')))
      recos.push({ type: 'info', msg: `⚠️ Aucune option végétarienne — 30% des convives en cherchent une` });
    if (!allRecs.some(r => (r.categorie || '').toLowerCase().includes('poisson')))
      recos.push({ type: 'info', msg: `⚠️ Aucun plat poisson — pensez à l'équilibre viande/poisson` });
    const hasDessert = allRecs.some(r => (r.categorie || '').toLowerCase() === 'dessert') ||
      localSections.some(s => s.titre.toLowerCase().includes('dessert') && s.plats.length > 0);
    if (!hasDessert) recos.push({ type: 'info', msg: `⚠️ Pas de dessert — le dessert augmente le ticket moyen de 20%` });
  }

  const incomplets = allPlatsData.filter(p => p.prixVente <= 0 || (p.rec && (p.rec.ingredients || []).length > 0 && p.cp === 0)).length;
  if (incomplets > 0) recos.push({ type: 'warning', msg: `⚠️ ${incomplets} plat${incomplets > 1 ? 's ont' : ' a'} des coûts incomplets — renseignez les prix des ingrédients` });

  // ── Export Format A (serveurs — tableau paysage) ──
  async function exportAllergenesA() {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const headers = ALLERGENES_14.map(a =>
        `<th style="background:#2D6A4F;color:#fff;padding:3px 1px;font-size:6.5px;white-space:nowrap;text-align:center">${a.code}</th>`
      ).join('');
      const rows = allSectionsWithData.flatMap(s => [
        `<tr><td colspan="15" style="background:#F3EFE8;font-weight:700;font-style:italic;padding:4px 8px;font-size:8px;border:1px solid #ccc">${s.titre}</td></tr>`,
        ...s.platsData.map(p => {
          const cells = ALLERGENES_14.map(a =>
            `<td style="text-align:center;border:1px solid #ddd;color:#dc2626;font-weight:700;font-size:9px">${(p.rec?.allergenes || []).includes(a.key) ? '●' : ''}</td>`
          ).join('');
          return `<tr><td style="padding:3px 6px;font-size:8px;border:1px solid #ddd;max-width:160px">${p.nom}</td>${cells}</tr>`;
        }),
      ]).join('');
      const footer = ALLERGENES_14.map(a => `${a.code} = ${a.label}`).join(' · ');
      const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Allergènes serveurs — ${carte.nom}</title>
<style>body{font-family:Arial,sans-serif;font-size:8px;margin:0}table{width:100%;border-collapse:collapse}</style>
</head><body>
<div style="margin-bottom:6px;font-size:9px;font-weight:600">${etablissement} · ${carte.nom} · ${date}</div>
<table><thead><tr><th style="background:#2D6A4F;color:#fff;text-align:left;padding:4px 8px;font-size:8px;min-width:140px">Plat</th>${headers}</tr></thead><tbody>${rows}</tbody></table>
<div style="margin-top:6px;font-size:6.5px;color:#666;line-height:1.8">${footer}</div>
</body></html>`;
      await downloadPDF(html, `allergenes-serveurs-${(carte.nom || 'carte').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`, true);
    } finally {
      setPdfLoading(false);
    }
  }

  // ── Export Format B (clients — élégant par catégorie) ──
  async function exportAllergenesB() {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const labelMap = Object.fromEntries(ALLERGENES_14.map(a => [a.key, a.label]));
      const sections = allSectionsWithData
        .filter(s => s.plats.length > 0)
        .map(s => {
          const plats = s.platsData.map(p => {
            const allergs = (p.rec?.allergenes || []).map(k => labelMap[k] || k).join(', ');
            return `<div style="padding:10px 0;border-bottom:1px solid #F3EFE8">
              <div style="font-family:Georgia,serif;font-size:1rem;font-weight:700;color:#1C2B1E">${p.nom}${p.prixVente > 0 ? `<span style="float:right;font-weight:400;font-size:0.9rem">${p.prixVente.toFixed(2)} €</span>` : ''}</div>
              ${(p.rec?.description_commerciale || p.rec?.description) ? `<div style="font-size:0.82rem;color:#6B7280;margin:2px 0 4px;line-height:1.4;font-style:italic">${p.rec.description_commerciale || p.rec.description}</div>` : ''}
              <div style="font-size:0.78rem;color:#9A3412"><em>${allergs ? `Contient : ${allergs}` : 'Aucun allergène majeur déclaré'}</em></div>
            </div>`;
          }).join('');
          return `<div style="margin-bottom:24px"><h2 style="font-family:Georgia,serif;font-size:1.05rem;font-weight:700;color:#1C2B1E;border-bottom:2px solid #2D6A4F;padding-bottom:6px;margin-bottom:0">${s.titre}</h2>${plats}</div>`;
        }).join('');
      const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Allergènes clients — ${carte.nom}</title>
<style>body{font-family:"Helvetica Neue",Arial,sans-serif;color:#1C2B1E;font-size:12px;margin:0}</style>
</head><body>
<div style="text-align:center;margin-bottom:24px;padding-bottom:14px;border-bottom:2px solid #2D6A4F">
  <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#2D6A4F;margin-bottom:3px">${etablissement}</div>
  <h1 style="font-family:Georgia,serif;font-size:1.5rem;margin:0 0 3px">${carte.nom}</h1>
  <div style="font-size:0.75rem;color:#6B7280">Information allergènes · ${date}</div>
</div>
${sections}
<div style="margin-top:24px;border-top:1px solid #E5E0D8;padding-top:5px;font-size:0.6rem;color:#9CA3AF;text-align:center">
  Document d'information sur les allergènes réglementaires (Règlement UE n°1169/2011) · ${etablissement}
</div>
</body></html>`;
      await downloadPDF(html, `allergenes-clients-${(carte.nom || 'carte').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  }

  // ── Export Argumentation (A4 par catégorie — nom + description commerciale) ──
  async function exportArgumentation() {
    if (pdfLoading) return;
    setPdfLoading(true);
    try {
      const sections = allSectionsWithData
        .filter(s => s.plats.length > 0)
        .map(s => {
          const plats = s.platsData.map(p => {
            const desc = p.rec?.description_commerciale || p.rec?.description || '';
            return `<div style="padding:12px 0;border-bottom:1px solid #F3EFE8">
              <div style="font-family:Georgia,serif;font-size:1.05rem;font-weight:700;color:#1C2B1E;margin-bottom:4px">${p.nom}${p.prixVente > 0 ? `<span style="float:right;font-weight:400;font-size:0.9rem;color:#6B7280">${p.prixVente.toFixed(2)} €</span>` : ''}</div>
              ${desc ? `<div style="font-size:0.88rem;color:#374151;line-height:1.6;font-style:italic">${desc}</div>` : '<div style="font-size:0.82rem;color:#9CA3AF;font-style:italic">— Description à renseigner —</div>'}
            </div>`;
          }).join('');
          return `<div style="margin-bottom:28px">
            <h2 style="font-family:Georgia,serif;font-size:1.1rem;font-weight:700;color:#2D6A4F;border-bottom:2px solid #2D6A4F;padding-bottom:6px;margin-bottom:0;text-transform:uppercase;letter-spacing:0.04em">${s.titre}</h2>
            ${plats}
          </div>`;
        }).join('');
      const html = `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><title>Argumentation — ${carte.nom}</title>
<style>body{font-family:"Helvetica Neue",Arial,sans-serif;color:#1C2B1E;font-size:12px;margin:0}</style>
</head><body>
<div style="text-align:center;margin-bottom:28px;padding-bottom:14px;border-bottom:2px solid #2D6A4F">
  <div style="font-size:0.65rem;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;color:#2D6A4F;margin-bottom:3px">${etablissement}</div>
  <h1 style="font-family:Georgia,serif;font-size:1.6rem;margin:0 0 3px">${carte.nom}</h1>
  <div style="font-size:0.75rem;color:#6B7280">Argumentation de vente · ${date}</div>
</div>
${sections}
<div style="margin-top:24px;border-top:1px solid #E5E0D8;padding-top:5px;font-size:0.6rem;color:#9CA3AF;text-align:center">
  Document usage interne — ${etablissement} · ${date}
</div>
</body></html>`;
      await downloadPDF(html, `argumentation-${(carte.nom || 'carte').replace(/[^a-z0-9]/gi, '-').toLowerCase()}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  }

  return (
    <div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: '0.875rem', flexShrink: 0 }}>← Cartes</button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: T.gold, textTransform: 'uppercase', letterSpacing: '0.1em' }}>{carte.saison}</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.5rem', fontWeight: 700, color: T.text, margin: 0, lineHeight: 1.2 }}>{carte.nom}</h1>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexShrink: 0 }}>
          <button onClick={exportAllergenesA} disabled={pdfLoading}
            style={{ padding: '0.45rem 0.9rem', border: '1px solid #E5E0D8', background: '#fff', borderRadius: '8px', cursor: pdfLoading ? 'default' : 'pointer', fontSize: '0.82rem', color: T.muted, fontFamily: "'DM Sans', sans-serif", opacity: pdfLoading ? 0.7 : 1 }}>
            {pdfLoading ? '⏳ PDF...' : 'Allergènes'}
          </button>
          <button onClick={exportArgumentation} disabled={pdfLoading}
            style={{ padding: '0.45rem 0.9rem', border: '1px solid #E5E0D8', background: '#fff', borderRadius: '8px', cursor: pdfLoading ? 'default' : 'pointer', fontSize: '0.82rem', color: T.muted, fontFamily: "'DM Sans', sans-serif", opacity: pdfLoading ? 0.7 : 1 }}>
            {pdfLoading ? '⏳ PDF...' : 'Argumentation'}
          </button>
          <button onClick={onEdit}
            style={{ padding: '0.45rem 1.1rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
            onMouseLeave={e => e.currentTarget.style.background = T.green}
          >Modifier</button>
        </div>
      </div>

      {/* Two-column layout */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '3fr 2fr', gap: '1.5rem', alignItems: 'start' }}>

        {/* ── Left: menu visuel ── */}
        <div>
          {allSectionsWithData.filter(s => s.plats.length > 0).length === 0 ? (
            <div style={{ ...card, padding: '2rem', textAlign: 'center' }}>
              <p style={{ color: T.muted, margin: 0 }}>Carte vide — cliquez sur "Modifier" pour ajouter des plats.</p>
            </div>
          ) : (
            allSectionsWithData.filter(s => s.plats.length > 0).map(section => {
              const isOpen = !closedSections.has(section.titre);
              return (
              <div key={section.titre} style={{ marginBottom: '1.5rem' }}>
                <div onClick={() => toggleSection(section.titre)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: isOpen ? '0.875rem' : 0, paddingBottom: '0.5rem', borderBottom: '2px solid #F3EFE8', cursor: 'pointer', userSelect: 'none' }}>
                  <span style={{ fontSize: '0.65rem', color: T.muted, display: 'inline-block', transition: 'transform 0.15s', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
                  <span style={{ width: '9px', height: '9px', borderRadius: '50%', background: T.gold, display: 'inline-block', flexShrink: 0 }} />
                  <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.05rem', fontWeight: 700, color: T.text, margin: 0, flex: 1 }}>{section.titre}</h2>
                  <span style={{ fontSize: '0.72rem', color: T.muted }}>{section.plats.length} plat{section.plats.length !== 1 ? 's' : ''}</span>
                </div>
                {isOpen && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {section.platsData.map(plat => {
                      const badge = plat.fc !== null ? fcBadge(plat.fc) : null;
                      return (
                        <div key={plat.recetteId} style={{ display: 'flex', alignItems: 'flex-start', gap: '1rem', padding: '0.875rem 1rem', background: '#FAFAF8', borderRadius: '10px', border: '1px solid #F3EFE8' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Link to={'/fiches-techniques/' + plat.recetteId}
                              style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.975rem', fontWeight: 700, color: T.text, textDecoration: 'none', lineHeight: 1.3, display: 'block' }}
                              onMouseEnter={e => e.currentTarget.style.color = T.green}
                              onMouseLeave={e => e.currentTarget.style.color = T.text}
                            >{plat.nom}</Link>
                            <DescriptionEditor
                              recette={plat.rec}
                              onSaved={updated => setLocalRecettes(prev => prev.map(r => r.id === updated.id ? updated : r))}
                            />
                            {badge && (
                              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', marginTop: '5px', fontSize: '0.68rem', fontWeight: 600, padding: '1px 7px', borderRadius: '99px', background: badge.bg, color: badge.color }}>
                                {badge.icon} {badge.label} {plat.fc !== null ? `— ${plat.fc.toFixed(1)}%` : ''}
                              </span>
                            )}
                          </div>
                          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px', paddingTop: '2px' }}>
                            <span style={{ fontSize: '0.62rem', color: T.muted, fontWeight: 500, letterSpacing: '0.04em', textTransform: 'uppercase' }}>Prix TTC</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input type="number" step="0.5" min="0" value={plat.prixVente || ''}
                                onChange={e => updatePrixVente(section.titre, plat.recetteId, e.target.value)}
                                onClick={e => e.stopPropagation()}
                                style={{ width: '72px', padding: '0.3rem 0.5rem', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.9rem', fontFamily: "'Playfair Display', serif", fontWeight: 700, color: T.text, textAlign: 'right', outline: 'none' }} />
                              <span style={{ fontSize: '0.85rem', color: T.muted }}>€</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>

        {/* ── Right: dashboard consultant ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>

          {/* Stats globales */}
          <div style={{ ...card, padding: '1.25rem' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 700, color: T.text, marginBottom: '0.875rem' }}>Tableau de bord</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem', marginBottom: '1rem' }}>
              <div style={{ background: '#F8F6F1', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.62rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '3px' }}>Food cost global</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 700, color: globalFC !== null ? fcColor(globalFC) : T.muted }}>
                  {globalFC !== null ? globalFC.toFixed(1) + '%' : '—'}
                </div>
                {globalFC !== null && <div style={{ fontSize: '0.62rem', color: T.muted, marginTop: '2px' }}>cible {fcCible}%</div>}
              </div>
              <div style={{ background: '#F8F6F1', borderRadius: '8px', padding: '0.75rem' }}>
                <div style={{ fontSize: '0.62rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '3px' }}>Total plats</div>
                <div style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.3rem', fontWeight: 700, color: T.text }}>{nbTotal}</div>
                <div style={{ fontSize: '0.62rem', color: T.muted, marginTop: '2px' }}>{(carte.sections || []).length} sections</div>
              </div>
            </div>

            {/* FC par section */}
            {fcBySection.filter(s => s.count > 0).length > 0 && (
              <div>
                <div style={{ fontSize: '0.65rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700, marginBottom: '0.5rem' }}>Food cost par section</div>
                {fcBySection.filter(s => s.count > 0).map(s => (
                  <div key={s.titre} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '5px 0', borderBottom: '1px solid #F9F7F4', fontSize: '0.82rem' }}>
                    <span style={{ color: T.text }}>{s.titre}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: T.muted }}>{s.count} plat{s.count !== 1 ? 's' : ''}</span>
                      <span style={{ fontWeight: 700, color: s.avgFC !== null ? fcColor(s.avgFC) : T.muted, minWidth: '40px', textAlign: 'right' }}>
                        {s.avgFC !== null ? s.avgFC.toFixed(1) + '%' : '—'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommandations */}
          <div style={{ ...card, padding: '1.25rem' }}>
            <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 700, color: T.text, marginBottom: '0.875rem' }}>Analyse & Recommandations</h3>
            {recos.length === 0 ? (
              <p style={{ color: '#16a34a', fontSize: '0.85rem', margin: 0 }}>✅ Aucune alerte — votre carte est bien équilibrée.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                {recos.map((r, i) => (
                  <div key={i} style={{
                    padding: '0.55rem 0.875rem',
                    borderRadius: '7px',
                    fontSize: '0.8rem',
                    lineHeight: 1.45,
                    background: r.type === 'danger' ? '#FEF2F2' : r.type === 'success' ? '#F0FDF4' : r.type === 'info' ? '#EFF6FF' : '#FFFBEB',
                    color:      r.type === 'danger' ? '#991B1B' : r.type === 'success' ? '#14532D' : r.type === 'info' ? '#1E40AF' : '#78350F',
                    borderLeft: `3px solid ${r.type === 'danger' ? '#DC2626' : r.type === 'success' ? '#16a34a' : r.type === 'info' ? '#3B82F6' : '#D97706'}`,
                  }}>{r.msg}</div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Sortable section wrapper ─────────────────────────────────────────────────
function SortableSection({ id, children }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  return (
    <div ref={setNodeRef} style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1 }}>
      {children({ dragProps: { ...attributes, ...listeners } })}
    </div>
  );
}

// ─── Éditeur de carte ─────────────────────────────────────────────────────────
function EditeurCarte({ carte, recettes, onSave, onBack, onAutoSave }) {
  const [form, setForm] = useState(carte || {
    nom: '', saison: SAISONS[0],
    sections: SECTIONS_DEFAULT.map(t => ({ titre: t, plats: [] })),
  });

  useEffect(() => {
    setForm(carte || {
      nom: '', saison: SAISONS[0],
      sections: SECTIONS_DEFAULT.map(t => ({ titre: t, plats: [] })),
    });
  }, [carte?.id]);

  const [catFilter, setCatFilter] = useState('');
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [closedSections, setClosedSections] = useState(new Set());

  function toggleSection(titre) {
    setClosedSections(prev => {
      const next = new Set(prev);
      if (next.has(titre)) next.delete(titre); else next.add(titre);
      return next;
    });
  }

  const width = useWindowWidth();
  const autoSaveTimer = useRef(null);
  const latestForm = useRef(form);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  function setFormAndSave(updater, debounce = false) {
    setForm(prev => {
      const newForm = typeof updater === 'function' ? updater(prev) : updater;
      latestForm.current = newForm;
      if (carte?.id) {
        clearTimeout(autoSaveTimer.current);
        if (debounce) {
          autoSaveTimer.current = setTimeout(() => {
            api.cartes.update(carte.id, latestForm.current).then(saved => onAutoSave?.(saved)).catch(() => {});
          }, 500);
        } else {
          api.cartes.update(carte.id, newForm).then(saved => onAutoSave?.(saved)).catch(() => {});
        }
      }
      return newForm;
    });
  }

  const isMobile = width < 768;
  const [nouvSection, setNouvSection] = useState('');
  const [showAddSection, setShowAddSection] = useState(false);

  const filteredRec = recettes.filter(r =>
    r.nom.toLowerCase().includes(search.toLowerCase()) &&
    (catFilter === '' || (r.categorie || '').toLowerCase() === catFilter.toLowerCase())
  );

  const platsIds = form.sections.flatMap(s => s.plats.map(p => p.recetteId));

  function addToSection(recette, sectionTitre) {
    const cp = coutPortion(recette);
    const prixVente = recette.prixVentePratiqueTTC || recette.prixVente || parseFloat((cp / 0.30).toFixed(2));
    setFormAndSave(f => ({
      ...f,
      sections: f.sections.map(s =>
        s.titre === sectionTitre
          ? { ...s, plats: [...s.plats, { recetteId: recette.id, nom: recette.nom, prixVente }] }
          : s
      ),
    }));
  }

  function removePlat(sectionTitre, recetteId) {
    setFormAndSave(f => ({
      ...f,
      sections: f.sections.map(s =>
        s.titre === sectionTitre ? { ...s, plats: s.plats.filter(p => p.recetteId !== recetteId) } : s
      ),
    }));
  }

  function updatePrix(sectionTitre, recetteId, prix) {
    setFormAndSave(f => ({
      ...f,
      sections: f.sections.map(s =>
        s.titre === sectionTitre
          ? { ...s, plats: s.plats.map(p => p.recetteId === recetteId ? { ...p, prixVente: parseFloat(prix) || 0 } : p) }
          : s
      ),
    }), true);
  }

  function ajouterSection() {
    if (!nouvSection.trim()) return;
    setFormAndSave(f => ({ ...f, sections: [...f.sections, { titre: nouvSection.trim(), plats: [] }] }));
    setNouvSection(''); setShowAddSection(false);
  }

  function supprimerSection(titre) {
    if (!confirm(`Supprimer la section "${titre}" ?`)) return;
    setFormAndSave(f => ({ ...f, sections: f.sections.filter(s => s.titre !== titre) }));
  }

  function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setFormAndSave(f => {
      const oi = f.sections.findIndex(s => s.titre === active.id);
      const ni = f.sections.findIndex(s => s.titre === over.id);
      return { ...f, sections: arrayMove(f.sections, oi, ni) };
    });
  }

  async function sauvegarder() {
    if (!form.nom.trim()) return alert('Le nom est obligatoire.');
    setSaving(true);
    try {
      const saved = carte
        ? await api.cartes.update(carte.id, form)
        : await api.cartes.create(form);
      onSave(saved, !carte);
    } finally {
      setSaving(false);
    }
  }

  const inputSm = { ...inputStyle, padding: '0.35rem 0.6rem', fontSize: '0.82rem' };
  const fcPct = (cp, pv) => pv > 0 ? (cp / pv * 100).toFixed(1) : null;

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: '0.875rem' }}>← Retour</button>
        <div style={{ flex: 1 }}>
          <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            placeholder="Nom de la carte..." style={{ ...inputStyle, fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700 }} />
        </div>
        <button onClick={sauvegarder} disabled={saving} style={{ padding: '0.55rem 1.5rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#1e4d38'; }}
          onMouseLeave={e => e.currentTarget.style.background = T.green}
        >{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '300px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Panneau gauche : fiches disponibles */}
        <div style={{ ...card, padding: '1.25rem', position: 'sticky', top: '1rem' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 700, color: T.text, marginBottom: '0.875rem' }}>Fiches techniques</h3>
          <input type="search" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputSm, marginBottom: '0.5rem' }} />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...inputSm, marginBottom: '0.875rem' }}>
            <option value="">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '60vh', overflowY: 'auto' }}>
            {filteredRec.filter(r => !platsIds.includes(r.id)).map(r => {
              const cp = coutPortion(r);
              return (
                <div key={r.id} style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', background: '#FAFAF8', border: '1px solid #F3EFE8' }}>
                  <Link to={'/fiches-techniques/' + r.id} style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.82rem', fontWeight: 600, color: T.text, marginBottom: '2px', lineHeight: 1.3, textDecoration: 'none', display: 'block' }}
                    onMouseEnter={e => e.currentTarget.style.color = T.green} onMouseLeave={e => e.currentTarget.style.color = T.text}>{r.nom}</Link>
                  <div style={{ fontSize: '0.72rem', color: T.muted, marginBottom: '6px' }}>{r.categorie} · {cp.toFixed(2)} EUR/p</div>
                  <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {form.sections.map(s => (
                      <button key={s.titre} onClick={() => addToSection(r, s.titre)}
                        style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '99px', border: '1px solid ' + T.gold, background: 'rgba(201,168,76,0.08)', color: '#8B6914', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                        + {s.titre}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {filteredRec.filter(r => !platsIds.includes(r.id)).length === 0 && (
              <p style={{ color: T.muted, fontSize: '0.82rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>
                Toutes les fiches sont déjà dans la carte.
              </p>
            )}
          </div>
        </div>

        {/* Panneau droit : carte en construction */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={form.sections.map(s => s.titre)} strategy={verticalListSortingStrategy}>
          {form.sections.map(section => {
            const isOpen = !closedSections.has(section.titre);
            const sectionCoutMoyen = section.plats.length > 0
              ? section.plats.reduce((s, p) => {
                  const rec = recettes.find(r => r.id === p.recetteId);
                  return s + (rec ? coutPortion(rec) : 0);
                }, 0) / section.plats.length
              : 0;
            return (
              <SortableSection key={section.titre} id={section.titre}>
                {({ dragProps }) => (
              <div style={{ ...card, padding: '1.25rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: isOpen ? '0.875rem' : 0 }}>
                  <h3 onClick={() => toggleSection(section.titre)} style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: '8px', margin: 0, flex: 1, cursor: 'pointer', userSelect: 'none' }}>
                    <span {...dragProps} onClick={e => e.stopPropagation()} style={{ cursor: 'grab', color: '#C5BDB0', fontSize: '1rem', padding: '0 2px', lineHeight: 1 }} title="Glisser pour réordonner">⠿</span>
                    <span style={{ fontSize: '0.65rem', color: T.muted, display: 'inline-block', transition: 'transform 0.15s', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)' }}>▼</span>
                    <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.gold, display: 'inline-block', flexShrink: 0 }} />
                    {section.titre}
                    <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: T.muted, fontWeight: 400 }}>
                      {section.plats.length} fiche{section.plats.length !== 1 ? 's' : ''}
                      {sectionCoutMoyen > 0 && ` · moy. ${sectionCoutMoyen.toFixed(2)} EUR/p`}
                    </span>
                  </h3>
                  <button onClick={e => { e.stopPropagation(); supprimerSection(section.titre); }}
                    style={{ background: 'none', border: 'none', color: '#D1C4B0', cursor: 'pointer', fontSize: '0.85rem' }}
                    onMouseEnter={e => e.currentTarget.style.color = T.red}
                    onMouseLeave={e => e.currentTarget.style.color = '#D1C4B0'}
                  >Supprimer section</button>
                </div>
                {isOpen && (
                  <>
                    {section.plats.length === 0 && (
                      <p style={{ color: '#C5BDB0', fontSize: '0.82rem', fontStyle: 'italic', padding: '0.5rem 0' }}>Cliquez sur une fiche à gauche pour l'ajouter ici.</p>
                    )}
                    {section.plats.map(plat => {
                      const rec = recettes.find(r => r.id === plat.recetteId);
                      const cp = rec ? coutPortion(rec) : 0;
                      const fc = fcPct(cp, plat.prixVente);
                      return (
                        <div key={plat.recetteId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '8px', background: '#FAFAF8', marginBottom: '4px', border: '1px solid #F3EFE8' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <Link to={'/fiches-techniques/' + plat.recetteId}
                              style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: '0.875rem', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: 'none', display: 'block' }}
                              onClick={e => e.stopPropagation()}
                              onMouseEnter={e => e.currentTarget.style.color = T.green} onMouseLeave={e => e.currentTarget.style.color = T.text}>{plat.nom}</Link>
                            <div style={{ fontSize: '0.72rem', color: T.muted, marginTop: '2px' }}>Coût mat. : {cp.toFixed(2)} EUR/p</div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                            <span style={{ fontSize: '0.72rem', color: T.muted }}>PV</span>
                            <input type="number" step="0.5" value={plat.prixVente}
                              onChange={e => updatePrix(section.titre, plat.recetteId, e.target.value)}
                              onClick={e => e.stopPropagation()}
                              style={{ ...inputStyle, width: '80px', textAlign: 'right' }} />
                            <span style={{ fontSize: '0.78rem', color: T.muted }}>€</span>
                          </div>
                          {fc && (
                            <div style={{ textAlign: 'center', flexShrink: 0, minWidth: '48px' }}>
                              <div style={{ fontSize: '0.6rem', color: T.muted, textTransform: 'uppercase', letterSpacing: '0.04em' }}>FC</div>
                              <span style={{ fontSize: '0.82rem', fontWeight: 700, color: fcColor(parseFloat(fc)) }}>{fc}%</span>
                            </div>
                          )}
                          <button onClick={() => removePlat(section.titre, plat.recetteId)}
                            style={{ background: 'none', border: 'none', color: '#D1C4B0', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}
                            onMouseEnter={e => e.currentTarget.style.color = T.red}
                            onMouseLeave={e => e.currentTarget.style.color = '#D1C4B0'}
                          >✕</button>
                        </div>
                      );
                    })}
                  </>
                )}
              </div>
                )}
              </SortableSection>
            );
          })}
            </SortableContext>
          </DndContext>

          {showAddSection ? (
            <div style={{ ...card, padding: '1rem', display: 'flex', gap: '0.5rem' }}>
              <input value={nouvSection} onChange={e => setNouvSection(e.target.value)}
                placeholder="Nom de la section..." style={inputStyle} autoFocus
                onKeyDown={e => e.key === 'Enter' && ajouterSection()} />
              <button onClick={ajouterSection} style={{ padding: '0.4rem 1rem', background: T.green, color: '#fff', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, whiteSpace: 'nowrap' }}>Ajouter</button>
              <button onClick={() => setShowAddSection(false)} style={{ padding: '0.4rem 0.8rem', background: '#fff', border: '1px solid #E5E0D8', borderRadius: '6px', cursor: 'pointer' }}>Annuler</button>
            </div>
          ) : (
            <button onClick={() => setShowAddSection(true)} style={{ background: 'none', border: '1px dashed #C9A84C', color: T.muted, borderRadius: '8px', padding: '0.65rem', cursor: 'pointer', fontSize: '0.85rem', width: '100%' }}>
              + Ajouter une section
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Composant principal ──────────────────────────────────────────────────────
export default function Cartes() {
  const [cartes, setCartes] = useState([]);
  const [recettes, setRecettes] = useState([]);
  const [parametres, setParametres] = useState({ foodCostCible: 30, tva: 10, etablissement: 'Mon Restaurant' });
  const [vue, setVue] = useState('liste');
  const [carteActive, setCarteActive] = useState(null);
  const [editKey, setEditKey] = useState(0);

  useEffect(() => {
    Promise.all([
      api.cartes.list().catch(() => []),
      api.recettes.list().catch(() => []),
      api.parametres.get().catch(() => ({ foodCostCible: 30, tva: 10, etablissement: 'Mon Restaurant' })),
    ]).then(([c, r, p]) => { setCartes(c); setRecettes(r); setParametres(p); });
  }, []);

  function handleSave(saved, isNew) {
    if (isNew) setCartes(prev => [...prev, saved]);
    else setCartes(prev => prev.map(c => c.id === saved.id ? saved : c));
    setCarteActive(saved);
    setVue('vue');
  }

  function handleAutoSave(saved) {
    setCartes(prev => prev.map(c => c.id === saved.id ? saved : c));
    setCarteActive(saved);
    setEditKey(k => k + 1);
  }

  function handleDelete(id) {
    if (!confirm('Supprimer cette carte ?')) return;
    api.cartes.delete(id).then(() => setCartes(prev => prev.filter(c => c.id !== id)));
  }

  if (vue === 'liste') return (
    <ListeCartes
      cartes={cartes}
      onNew={() => { setCarteActive(null); setVue('edit'); }}
      onOpen={c => { setCarteActive(c); setVue('vue'); }}
      onDelete={handleDelete}
    />
  );

  if (vue === 'vue') return (
    <VueCarte
      carte={carteActive}
      recettes={recettes}
      parametres={parametres}
      onEdit={() => setVue('edit')}
      onBack={() => { setCarteActive(null); setVue('liste'); }}
      onAutoSave={handleAutoSave}
    />
  );

  return (
    <EditeurCarte
      key={`${carteActive?.id || 'new'}-${editKey}`}
      carte={carteActive}
      recettes={recettes}
      onSave={handleSave}
      onBack={() => carteActive ? setVue('vue') : setVue('liste')}
      onAutoSave={handleAutoSave}
    />
  );
}
