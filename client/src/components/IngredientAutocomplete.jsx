import { useState, useEffect, useRef } from 'react';

const inputStyle = {
  padding: '0.45rem 0.7rem', border: '1px solid #E5E0D8', borderRadius: '6px',
  fontSize: '0.875rem', width: '100%', fontFamily: "'DM Sans', sans-serif",
  outline: 'none', color: '#1C2B1E',
};

export default function IngredientAutocomplete({ value, onChange, catalog }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const ref = useRef(null);

  useEffect(() => { setQuery(value); }, [value]);
  useEffect(() => {
    const h = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const suggestions = query.length > 0
    ? catalog.filter(c => c.nom.toLowerCase().includes(query.toLowerCase())).slice(0, 6)
    : [];

  function select(item) {
    const unite = item.unite === 'kg' ? 'g' : item.unite === 'L' ? 'ml' : item.unite;
    onChange({ nom: item.nom, prixUnitaire: item.prixUnitaire, unite });
    setQuery(item.nom);
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
      {open && suggestions.length > 0 && (
        <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200, background: '#fff', borderRadius: '8px', boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #E5E0D8', marginTop: '2px', overflow: 'hidden' }}>
          {suggestions.map(item => (
            <div
              key={item.id}
              onMouseDown={() => select(item)}
              style={{ padding: '0.5rem 0.85rem', cursor: 'pointer', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #F9F7F4' }}
              onMouseEnter={e => e.currentTarget.style.background = '#F8F6F1'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}
            >
              <span style={{ color: '#1C2B1E', fontWeight: 500 }}>{item.nom}</span>
              <span style={{ color: '#6B7280', fontSize: '0.75rem' }}>{item.prixUnitaire} EUR/{item.unite}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
