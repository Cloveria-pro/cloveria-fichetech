import { useState, useEffect, useRef } from 'react';
import { calculerCoutIngredient } from '../conversions.js';

const inputStyle = {
  padding: '0.45rem 0.7rem', border: '1px solid #E5E0D8', borderRadius: '6px',
  fontSize: '0.875rem', width: '100%', fontFamily: "'DM Sans', sans-serif",
  outline: 'none', color: '#1C2B1E',
};

const CONV = { g: 0.001, kg: 1, mg: 0.000001, ml: 0.001, cl: 0.01, L: 1, l: 1, piece: 1, pièce: 1, unite: 1 };

function computePrixUnitaireSR(sr) {
  const coutTotal = (sr.ingredients || []).reduce(
    (acc, i) => acc + calculerCoutIngredient(i.quantite, i.unite, i.prixUnitaire), 0
  );
  const qBase = (sr.quantiteProduite || 1) * (CONV[sr.unite] || 1);
  return qBase > 0 ? coutTotal / qBase : 0;
}

export default function IngredientAutocomplete({ value, onChange, catalog, sousRecettes = [] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef(null);

  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const catSuggestions = query.length > 0
    ? catalog.filter(c => c.nom.toLowerCase().includes(query.toLowerCase())).slice(0, 4)
    : [];

  const srSuggestions = query.length > 0
    ? sousRecettes.filter(sr => sr.nom.toLowerCase().includes(query.toLowerCase())).slice(0, 3)
    : [];

  const hasSuggestions = catSuggestions.length > 0 || srSuggestions.length > 0;

  function select(item) {
    const unite = item.unite === 'kg' ? 'g' : item.unite === 'L' ? 'ml' : item.unite;
    onChange({ nom: item.nom, prixUnitaire: item.prixUnitaire, unite });
    setQuery(item.nom);
    setOpen(false);
  }

  function selectSR(sr) {
    const prixUnitaire = parseFloat(computePrixUnitaireSR(sr).toFixed(5));
    onChange({ nom: sr.nom, prixUnitaire, unite: sr.unite });
    setQuery(sr.nom);
    setOpen(false);
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <input
        value={query}
        onChange={e => { setQuery(e.target.value); onChange({ nom: e.target.value }); setOpen(true); }}
        onFocus={() => setOpen(true)}
        style={inputStyle}
        placeholder="Nom ingrédient"
      />
      {open && hasSuggestions && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#fff', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #E5E0D8', marginTop: '2px', overflow: 'hidden' }}>
          {catSuggestions.map(item => (
            <div
              key={'cat-' + item.id}
              onMouseDown={() => select(item)}
              style={{ padding: '0.5rem 0.85rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F9F7F4' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8F6F1'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <span style={{ color: '#1C2B1E', fontWeight: 500 }}>{item.nom}</span>
              <span style={{ color: '#6B7280', fontSize: '0.75rem' }}>{item.prixUnitaire} EUR/{item.unite}</span>
            </div>
          ))}
          {srSuggestions.map(sr => {
            const pu = computePrixUnitaireSR(sr);
            return (
              <div
                key={'sr-' + sr.id}
                onMouseDown={() => selectSR(sr)}
                style={{ padding: '0.5rem 0.85rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F9F7F4', background: '#FFFBF5' }}
                onMouseEnter={e => e.currentTarget.style.background = '#FFF7ED'}
                onMouseLeave={e => e.currentTarget.style.background = '#FFFBF5'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '1px 5px', borderRadius: '3px', background: 'rgba(201,168,76,0.15)', color: '#8B6914', border: '1px solid rgba(201,168,76,0.3)', whiteSpace: 'nowrap' }}>Prépa.</span>
                  <span style={{ color: '#1C2B1E', fontWeight: 500 }}>{sr.nom}</span>
                </div>
                <span style={{ color: '#6B7280', fontSize: '0.75rem' }}>{pu.toFixed(4)} EUR/{sr.unite}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
