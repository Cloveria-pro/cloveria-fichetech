import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { coutPortionTTC, calculerFoodCost } from '../utils.js';
import ImportFicheModal from '../components/ImportFicheModal.jsx';

const T = { green: '#2D6A4F', text: '#1A1A1A', muted: '#9CA3AF' };
const SECTIONS = ['Amuse-bouche', 'Entrée', 'Plat viande', 'Plat poisson', 'Plat végétarien', 'Dessert', 'Autre'];

function sectionFor(categorie) {
  const c = (categorie || '').trim();
  const exact = SECTIONS.find(s => s.toLowerCase() === c.toLowerCase());
  if (exact) return exact;
  const legacy = { plat: 'Plat viande', entree: 'Entrée', dessert: 'Dessert', 'amuse-bouche': 'Amuse-bouche' };
  return legacy[c.toLowerCase()] || 'Autre';
}

function fcBadge(pct, cible) {
  if (pct < cible) return { label: 'Rentable', color: '#16a34a', bg: '#DCFCE7' };
  if (pct < cible + 5) return { label: 'Acceptable', color: '#d97706', bg: '#FEF3C7' };
  return { label: 'À retravailler', color: '#dc2626', bg: '#FEE2E2' };
}

function Col({ label, value, color, italic }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
      <span style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: T.muted }}>
        {label}
      </span>
      <span style={{ fontSize: '13px', fontWeight: 600, color: color || T.text, fontStyle: italic ? 'italic' : 'normal' }}>
        {value}
      </span>
    </div>
  );
}

function TileFiche({ r, cible, onDelete, onDuplicate, onUpdateCategorie, navigate }) {
  const [hovered, setHovered] = useState(false);
  const [catEdit, setCatEdit] = useState(false);
  const cpTTC = coutPortionTTC(r);
  const pvTTC = r.prixVentePratiqueTTC || 0;
  const fc = calculerFoodCost(cpTTC, pvTTC);
  const badge = fc !== null ? fcBadge(fc, cible) : null;

  return (
    <div
      style={{
        display: 'flex', alignItems: 'center', gap: '0.75rem',
        padding: '0 1.5rem',
        height: '60px', minWidth: '680px',
        borderRadius: '50px',
        background: '#FFFFFF',
        border: `1px solid ${hovered ? T.green : '#E8E2D9'}`,
        boxShadow: hovered ? '0 4px 16px rgba(45,106,79,0.12)' : '0 1px 4px rgba(0,0,0,0.05)',
        cursor: 'pointer',
        transition: 'all 0.15s',
        marginBottom: '8px',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={() => navigate('/fiches-techniques/' + r.id)}
    >
      {/* Nom + badge catégorie */}
      <div style={{ flex: 1, minWidth: 0, paddingRight: '0.5rem' }}>
        <span style={{ fontSize: '15px', fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'block' }}>
          {r.nom}
        </span>
        {catEdit ? (
          <select
            autoFocus
            value={r.categorie || 'Autre'}
            onClick={e => e.stopPropagation()}
            onChange={e => { onUpdateCategorie(r.id, e.target.value); setCatEdit(false); }}
            onBlur={() => setCatEdit(false)}
            style={{ fontSize: '10px', padding: '1px 4px', border: '1px solid #2D6A4F', borderRadius: '4px', color: T.green, marginTop: '3px', fontFamily: "'DM Sans', sans-serif", outline: 'none' }}
          >
            {SECTIONS.map(s => <option key={s}>{s}</option>)}
          </select>
        ) : (
          <span
            onClick={e => { e.stopPropagation(); setCatEdit(true); }}
            title="Cliquer pour changer la catégorie"
            style={{ fontSize: '10px', fontWeight: 600, color: T.green, background: 'rgba(45,106,79,0.08)', padding: '1px 7px', borderRadius: '3px', display: 'inline-block', marginTop: '3px', cursor: 'pointer' }}
          >
            {r.categorie || 'Autre'}
          </span>
        )}
      </div>

      {/* Coût matière — 160px */}
      <div style={{ width: '160px', flexShrink: 0 }}>
        <Col label="Coût mat." value={cpTTC > 0 ? cpTTC.toFixed(2) + ' €/cvt' : '—'} />
      </div>

      {/* Prix de vente — 160px */}
      <div style={{ width: '160px', flexShrink: 0 }}>
        {pvTTC > 0
          ? <Col label="Prix de vente" value={pvTTC.toFixed(2) + ' € TTC'} />
          : <Col label="Prix de vente" value="non renseigné" color={T.muted} italic />
        }
      </div>

      {/* Marge — 100px */}
      <div style={{ width: '100px', flexShrink: 0 }}>
        {fc !== null
          ? <Col label="Food cost" value={fc.toFixed(1) + '%'} color={badge.color} />
          : <Col label="Food cost" value="—" color={T.muted} />
        }
      </div>

      {/* Badge — 130px */}
      <div style={{ width: '130px', flexShrink: 0, textAlign: 'center' }}>
        {badge ? (
          <span style={{ fontSize: '11px', fontWeight: 700, padding: '4px 12px', borderRadius: '99px', background: badge.bg, color: badge.color, whiteSpace: 'nowrap' }}>
            {badge.label}
          </span>
        ) : (
          <span style={{ fontSize: '11px', color: '#f97316', fontWeight: 600 }} title="Prix de vente non renseigné">⚠️</span>
        )}
      </div>

      {/* Dupliquer */}
      <button
        onClick={e => { e.stopPropagation(); onDuplicate(r); }}
        style={{ background: 'none', border: '1px solid #2D6A4F', borderRadius: '6px', cursor: 'pointer', color: '#2D6A4F', fontSize: '12px', padding: '3px 8px', flexShrink: 0, fontFamily: "'DM Sans', sans-serif", fontWeight: 600, transition: 'background 0.15s' }}
        onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.background = 'rgba(45,106,79,0.08)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
        title="Dupliquer"
      >⎘ Dupliquer</button>

      {/* Supprimer */}
      <button
        onClick={e => { e.stopPropagation(); if (!confirm('Supprimer cette fiche ?')) return; onDelete(r.id); }}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: hovered ? '#D1C4B0' : 'transparent', fontSize: '12px', padding: '4px 6px', flexShrink: 0, transition: 'color 0.15s' }}
        onMouseEnter={e => { e.stopPropagation(); e.currentTarget.style.color = '#ef4444'; }}
        onMouseLeave={e => { e.currentTarget.style.color = hovered ? '#D1C4B0' : 'transparent'; }}
        title="Supprimer"
      >✕</button>

      {/* Flèche */}
      <span style={{ color: hovered ? T.green : '#D1C4B0', fontSize: '16px', flexShrink: 0, lineHeight: 1, transition: 'color 0.15s', paddingLeft: '4px' }}>→</span>
    </div>
  );
}

export default function Recettes() {
  const [recettes, setRecettes] = useState([]);
  const [cartes, setCartes] = useState([]);
  const [params, setParams] = useState({ foodCostCible: 30, tva: 10 });
  const [loading, setLoading] = useState(true);
  const [recherche, setRecherche] = useState('');
  const [carteFilter, setCarteFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sectionsOpen, setSectionsOpen] = useState({});
  const [showImport, setShowImport] = useState(false);
  const [duplicationToast, setDuplicationToast] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      api.recettes.list(),
      api.parametres.get().catch(() => ({ foodCostCible: 30, tva: 10 })),
      api.cartes.list().catch(() => []),
    ]).then(([data, p, c]) => { setRecettes(data); setParams(p); setCartes(c); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  function supprimer(id) {
    api.recettes.delete(id).then(() => setRecettes(prev => prev.filter(r => r.id !== id)));
  }

  function dupliquer(r) {
    const { id, createdAt, updatedAt, ...rest } = r;
    api.recettes.create({ ...rest, nom: `${r.nom} (copie)`, prixVentePratiqueTTC: null })
      .then(newFiche => {
        setRecettes(prev => [...prev, newFiche]);
        setDuplicationToast('Fiche dupliquée ✓');
        setTimeout(() => setDuplicationToast(''), 3000);
      });
  }

  function updateCategorie(id, newCat) {
    const r = recettes.find(x => x.id === id);
    if (!r) return;
    api.recettes.update(id, { ...r, categorie: newCat })
      .then(() => setRecettes(prev => prev.map(x => x.id === id ? { ...x, categorie: newCat } : x)));
  }

  function toggleSection(name) {
    setSectionsOpen(prev => ({ ...prev, [name]: !(prev[name] ?? true) }));
  }

  function getStatus(r) {
    const cpTTC = coutPortionTTC(r);
    const pvTTC = r.prixVentePratiqueTTC || 0;
    const fc = calculerFoodCost(cpTTC, pvTTC);
    if (fc === null) return 'sans-prix';
    if (fc < params.foodCostCible) return 'Rentable';
    if (fc < params.foodCostCible + 5) return 'Acceptable';
    return 'À retravailler';
  }

  // Filtre par carte : récupère les IDs de recettes dans la carte sélectionnée
  const carteRecettesIds = carteFilter
    ? new Set((cartes.find(c => c.id === carteFilter)?.sections || []).flatMap(s => (s.plats || []).map(p => p.recetteId)))
    : null;

  const filtrees = recettes.filter(r => {
    const matchRecherche = !recherche || r.nom.toLowerCase().includes(recherche.toLowerCase()) || (r.categorie || '').toLowerCase().includes(recherche.toLowerCase());
    const matchCarte = !carteFilter || carteRecettesIds?.has(r.id);
    const matchStatus = !statusFilter || getStatus(r) === statusFilter;
    return matchRecherche && matchCarte && matchStatus;
  });

  const grouped = Object.fromEntries(SECTIONS.map(s => [s, []]));
  filtrees.forEach(r => grouped[sectionFor(r.categorie)].push(r));
  const sectionsActives = SECTIONS.filter(s => grouped[s].length > 0);

  const selectStyle = { padding: '0.5rem 0.75rem', border: '1px solid #E5E0D8', borderRadius: '8px', fontSize: '0.875rem', background: '#fff', outline: 'none', color: T.text, fontFamily: "'DM Sans', sans-serif", cursor: 'pointer' };

  if (loading) return <p style={{ color: T.muted }}>Chargement...</p>;

  return (
    <div>
      {showImport && <ImportFicheModal onClose={() => setShowImport(false)} />}
      {duplicationToast && (
        <div style={{ position: 'fixed', bottom: '2rem', right: '2rem', background: '#2D6A4F', color: '#fff', padding: '0.75rem 1.5rem', borderRadius: '8px', fontWeight: 600, fontSize: '0.9rem', boxShadow: '0 4px 16px rgba(0,0,0,0.2)', zIndex: 500, fontFamily: "'DM Sans', sans-serif" }}>
          {duplicationToast}
        </div>
      )}
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: T.text }}>
            Fiches techniques
          </h1>
          <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '2px' }}>
            {filtrees.length} fiche{filtrees.length !== 1 ? 's' : ''}
            {carteFilter && <span style={{ marginLeft: '6px', fontSize: '0.78rem', color: T.green, fontWeight: 600 }}>· filtrées par carte</span>}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
          {cartes.length > 0 && (
            <select
              value={carteFilter}
              onChange={e => setCarteFilter(e.target.value)}
              style={selectStyle}
            >
              <option value="">Toutes les cartes</option>
              {cartes.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
            </select>
          )}
          <input
            type="search"
            placeholder="Rechercher une fiche..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
            style={{ ...selectStyle, width: '220px', cursor: 'text' }}
          />
          <button
            onClick={() => navigate('/fiches-techniques/nouvelle')}
            style={{ padding: '0.65rem 1.5rem', background: T.green, color: '#fff', borderRadius: '8px', fontWeight: 700, fontSize: '0.95rem', fontFamily: "'DM Sans', sans-serif", border: 'none', cursor: 'pointer', whiteSpace: 'nowrap' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
            onMouseLeave={e => e.currentTarget.style.background = T.green}
          >+ Nouvelle fiche</button>
        </div>
      </div>

      {/* Bloc import fiche IA */}
      <div
        onClick={() => setShowImport(true)}
        style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem 1.25rem', marginBottom: '1.25rem', background: 'linear-gradient(135deg, rgba(45,106,79,0.05) 0%, rgba(45,106,79,0.02) 100%)', border: '1.5px solid rgba(45,106,79,0.18)', borderRadius: '12px', cursor: 'pointer', transition: 'border-color 0.15s' }}
        onMouseEnter={e => { e.currentTarget.style.borderColor = T.green; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(45,106,79,0.09) 0%, rgba(45,106,79,0.04) 100%)'; }}
        onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(45,106,79,0.18)'; e.currentTarget.style.background = 'linear-gradient(135deg, rgba(45,106,79,0.05) 0%, rgba(45,106,79,0.02) 100%)'; }}
      >
        <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: T.green, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.25rem' }}>📄</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: T.text }}>Importer une fiche technique</span>
            <span style={{ fontSize: '0.65rem', background: 'rgba(201,168,76,0.15)', color: '#8B6914', border: '1px solid rgba(201,168,76,0.3)', padding: '1px 6px', borderRadius: '4px', fontWeight: 700, letterSpacing: '0.04em' }}>IA</span>
          </div>
          <p style={{ margin: 0, fontSize: '0.78rem', color: T.muted }}>Scannez une fiche papier ou PDF — l'IA extrait les ingrédients, les quantités et les étapes automatiquement</p>
        </div>
        <span style={{ color: T.green, fontSize: '1.1rem', flexShrink: 0, fontWeight: 700 }}>→</span>
      </div>

      {/* Filtre par statut */}
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {[
          { value: '', label: 'Tous', color: T.muted, bg: '#F8F6F1', border: '#E5E0D8' },
          { value: 'Rentable', label: 'Rentable', color: '#16a34a', bg: '#DCFCE7', border: '#86EFAC' },
          { value: 'Acceptable', label: 'Acceptable', color: '#d97706', bg: '#FEF3C7', border: '#FCD34D' },
          { value: 'À retravailler', label: 'À retravailler', color: '#dc2626', bg: '#FEE2E2', border: '#FCA5A5' },
          { value: 'sans-prix', label: 'Sans prix', color: T.muted, bg: '#F1F5F9', border: '#CBD5E1' },
        ].map(opt => {
          const active = statusFilter === opt.value;
          return (
            <button
              key={opt.value}
              onClick={() => setStatusFilter(opt.value)}
              style={{
                padding: '0.3rem 0.9rem', borderRadius: '99px', fontSize: '0.78rem', fontWeight: active ? 700 : 500,
                cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                background: active ? opt.bg : '#fff',
                color: active ? opt.color : T.muted,
                border: `1px solid ${active ? opt.border : '#E5E0D8'}`,
                transition: 'all 0.12s',
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {filtrees.length === 0 && (
        <p style={{ color: T.muted }}>
          {recettes.length === 0 ? 'Aucune fiche. ' : 'Aucun résultat. '}
          {!carteFilter && (
            <button onClick={() => navigate('/fiches-techniques/nouvelle')} style={{ background: 'none', border: 'none', color: T.green, fontWeight: 600, cursor: 'pointer', fontSize: 'inherit', padding: 0 }}>
              Créer une fiche
            </button>
          )}
        </p>
      )}

      {/* Sections (accordion) */}
      {sectionsActives.map(sectionName => {
        const fiches = grouped[sectionName];
        const isOpen = sectionsOpen[sectionName] ?? true;
        return (
          <div key={sectionName} style={{ marginBottom: '0.5rem' }}>
            {/* En-tête cliquable */}
            <div
              onClick={() => toggleSection(sectionName)}
              style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', paddingTop: '16px', paddingBottom: '8px', marginBottom: isOpen ? '0.75rem' : '0.25rem', cursor: 'pointer', userSelect: 'none' }}
            >
              <div style={{ flex: 1, height: '2px', background: '#2D6A4F', opacity: 0.3, borderRadius: '1px' }} />
              <span style={{ fontSize: '16px', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase', color: '#2D6A4F', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: '10px' }}>
                {sectionName} ({fiches.length})
                <span style={{ fontSize: '11px', display: 'inline-block', transform: isOpen ? 'rotate(0deg)' : 'rotate(-90deg)', transition: 'transform 0.2s', color: '#2D6A4F', opacity: 0.7 }}>▼</span>
              </span>
              <div style={{ flex: 1, height: '2px', background: '#2D6A4F', opacity: 0.3, borderRadius: '1px' }} />
            </div>

            {/* Tuiles */}
            {isOpen && (
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                {fiches.map(r => (
                  <TileFiche
                    key={r.id}
                    r={r}
                    cible={params.foodCostCible}
                    onDelete={supprimer}
                    onDuplicate={dupliquer}
                    onUpdateCategorie={updateCategorie}
                    navigate={navigate}
                  />
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
