import { useState, useEffect } from 'react';
import { api } from '../api.js';
import { useWindowWidth } from '../hooks/useWindowWidth.js';

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280', red: '#DC2626', bg: '#F8F6F1' };
const card = { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };
const inputSm = { padding: '0.5rem 0.75rem', border: '1px solid #E5E0D8', borderRadius: '8px', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", color: T.text, background: '#fff', outline: 'none', width: '100%', boxSizing: 'border-box' };

const TYPE_COLORS = { rappel: '#3B82F6', evenement: '#2D6A4F', note: '#C9A84C' };
const TYPE_LABELS = { rappel: 'Rappel', evenement: 'Événement', note: 'Note' };
const STATUT_LABELS = { a_faire: 'À faire', fait: 'Fait', reporte: 'Reporté' };
const STATUT_COLORS = { a_faire: T.muted, fait: T.green, reporte: '#D97706' };
const CAT_LABELS = { fournisseur: 'Fournisseur', production: 'Production', service: 'Service', administratif: 'Administratif', autre: 'Autre' };
const CATEGORIES = Object.entries(CAT_LABELS);
const TYPES = Object.entries(TYPE_LABELS);

function today() { return new Date().toISOString().slice(0, 10); }

function formatGroupDate(dateStr) {
  if (!dateStr) return 'Sans date';
  const t = today();
  const d = new Date(dateStr + 'T00:00:00');
  const diff = Math.round((new Date(dateStr) - new Date(t)) / 86400000);
  const dayMonth = d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  if (diff === 0) return `Aujourd'hui · ${dayMonth}`;
  if (diff === 1) return `Demain · ${dayMonth}`;
  if (diff === -1) return `Hier · ${dayMonth}`;
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

/* ── Mini-calendrier ── */
function MiniCalendar({ items, selectedDay, onDayClick }) {
  const [viewDate, setViewDate] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const firstDayOfWeek = (new Date(year, month, 1).getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = today();
  const datesWithItems = new Set(items.flatMap(i => {
    if (!i.date) return [];
    if (i.type === 'evenement' && i.dateFin && i.dateFin > i.date) {
      const days = [];
      const cur = new Date(i.date + 'T00:00:00');
      const end = new Date(i.dateFin + 'T00:00:00');
      while (cur <= end) {
        days.push(cur.toISOString().slice(0, 10));
        cur.setDate(cur.getDate() + 1);
      }
      return days;
    }
    return [i.date.slice(0, 10)];
  }));
  const monthLabel = new Date(year, month, 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  const btnNav = { background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: '1.1rem', padding: '2px 8px', borderRadius: '4px', lineHeight: 1 };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.875rem' }}>
        <button style={btnNav} onClick={() => setViewDate(new Date(year, month - 1, 1))}>‹</button>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color: T.text, textTransform: 'capitalize' }}>{monthLabel}</span>
        <button style={btnNav} onClick={() => setViewDate(new Date(year, month + 1, 1))}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: '0.6rem', fontWeight: 700, color: T.muted, paddingBottom: '5px' }}>{d}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => <div key={`e${i}`} />)}
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const day = i + 1;
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDay;
          const hasDot = datesWithItems.has(dateStr);
          return (
            <button key={day} onClick={() => onDayClick(isSelected ? null : dateStr)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              height: '28px', borderRadius: '6px', border: 'none', cursor: 'pointer', padding: 0,
              background: isSelected ? T.green : isToday ? 'rgba(45,106,79,0.1)' : 'transparent',
              color: isSelected ? '#fff' : isToday ? T.green : T.text,
              fontSize: '0.75rem', fontWeight: isSelected || isToday ? 700 : 400,
              fontFamily: "'DM Sans', sans-serif", position: 'relative',
            }}>
              {day}
              {hasDot && (
                <span style={{ width: '3px', height: '3px', borderRadius: '50%', background: isSelected ? 'rgba(255,255,255,0.7)' : T.green, position: 'absolute', bottom: '3px' }} />
              )}
            </button>
          );
        })}
      </div>
      {selectedDay && (
        <button onClick={() => onDayClick(null)} style={{ marginTop: '0.75rem', width: '100%', padding: '0.35rem', background: 'none', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.75rem', color: T.muted, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
          Voir tout
        </button>
      )}
    </div>
  );
}

/* ── Modal create/edit ── */
export function ItemModal({ item, onSave, onClose }) {
  const isNew = !item?.id;
  const [form, setForm] = useState({
    type: item?.type || 'rappel',
    titre: item?.titre || '',
    description: item?.description || '',
    date: item?.date || '',
    dateFin: item?.dateFin || '',
    heure: item?.heure || '',
    categorie: item?.categorie || '',
    statut: item?.statut || 'a_faire',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function set(field) { return e => setForm(f => ({ ...f, [field]: e.target.value })); }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.titre.trim()) { setError('Le titre est obligatoire.'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        type: form.type,
        categorie: form.categorie || null,
        titre: form.titre.trim(),
        description: form.description.trim() || null,
        date: form.date || null,
        dateFin: form.type === 'evenement' ? (form.dateFin || null) : null,
        heure: form.heure || null,
        statut: form.type === 'rappel' ? (form.statut || 'a_faire') : null,
      };
      await onSave(item?.id || null, payload);
      onClose();
    } catch (err) {
      setError(err.message || 'Erreur lors de la sauvegarde.');
      setSaving(false);
    }
  }

  const labelStyle = { display: 'block', fontSize: '0.72rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '5px' };
  const sectionStyle = { marginBottom: '1rem' };

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 8px 40px rgba(0,0,0,0.18)', width: '100%', maxWidth: '460px', maxHeight: '90vh', overflowY: 'auto', padding: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, color: T.text, margin: 0 }}>
            {isNew ? 'Nouvel élément' : 'Modifier'}
          </h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.muted, fontSize: '1.3rem', padding: '2px 6px' }}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Type</label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              {TYPES.map(([val, label]) => (
                <button key={val} type="button" onClick={() => setForm(f => ({ ...f, type: val }))} style={{
                  flex: 1, padding: '0.5rem 0.25rem', borderRadius: '8px', border: `1.5px solid ${form.type === val ? TYPE_COLORS[val] : '#E5E0D8'}`,
                  background: form.type === val ? `${TYPE_COLORS[val]}12` : '#fff',
                  color: form.type === val ? TYPE_COLORS[val] : T.muted,
                  fontSize: '0.8rem', fontWeight: form.type === val ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                }}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Titre */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Titre *</label>
            <input value={form.titre} onChange={set('titre')} placeholder="Nom de l'élément" style={inputSm} autoFocus />
          </div>

          {/* Date + heure */}
          <div style={{ display: 'grid', gridTemplateColumns: form.type === 'evenement' ? '1fr 1fr 1fr' : '1fr 1fr', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={labelStyle}>{form.type === 'note' ? 'Date (optionnelle)' : 'Date'}</label>
              <input type="date" value={form.date} onChange={set('date')} style={inputSm} />
            </div>
            {form.type === 'evenement' && (
              <div>
                <label style={labelStyle}>Date de fin</label>
                <input type="date" value={form.dateFin} onChange={set('dateFin')} min={form.date} style={inputSm} />
              </div>
            )}
            <div>
              <label style={labelStyle}>Heure</label>
              <input type="time" value={form.heure} onChange={set('heure')} style={inputSm} />
            </div>
          </div>

          {/* Statut (rappel uniquement) */}
          {form.type === 'rappel' && (
            <div style={sectionStyle}>
              <label style={labelStyle}>Statut</label>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                {Object.entries(STATUT_LABELS).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setForm(f => ({ ...f, statut: val }))} style={{
                    flex: 1, padding: '0.45rem 0.25rem', borderRadius: '8px',
                    border: `1.5px solid ${form.statut === val ? STATUT_COLORS[val] : '#E5E0D8'}`,
                    background: form.statut === val ? `${STATUT_COLORS[val]}15` : '#fff',
                    color: form.statut === val ? STATUT_COLORS[val] : T.muted,
                    fontSize: '0.78rem', fontWeight: form.statut === val ? 700 : 400, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif",
                  }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Catégorie */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Catégorie (optionnelle)</label>
            <select value={form.categorie} onChange={set('categorie')} style={{ ...inputSm, appearance: 'none' }}>
              <option value="">Sans catégorie</option>
              {CATEGORIES.map(([val, label]) => <option key={val} value={val}>{label}</option>)}
            </select>
          </div>

          {/* Description */}
          <div style={sectionStyle}>
            <label style={labelStyle}>Note / description</label>
            <textarea value={form.description} onChange={set('description')} placeholder="Informations complémentaires…" rows={3} style={{ ...inputSm, resize: 'vertical', minHeight: '72px' }} />
          </div>

          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '8px', padding: '0.6rem 0.875rem', fontSize: '0.82rem', color: '#991B1B', marginBottom: '1rem' }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button type="button" onClick={onClose} style={{ padding: '0.6rem 1.25rem', background: 'none', border: '1px solid #E5E0D8', borderRadius: '8px', cursor: 'pointer', fontSize: '0.875rem', color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>
              Annuler
            </button>
            <button type="submit" disabled={saving} style={{ padding: '0.6rem 1.75rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.6 : 1, fontFamily: "'DM Sans', sans-serif" }}>
              {saving ? 'Enregistrement…' : isNew ? 'Ajouter' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Item card ── */
function ItemCard({ item, onEdit, onDelete, onToggleStatut }) {
  const typeColor = TYPE_COLORS[item.type] || T.muted;
  const isPast = item.date && item.date < today() && item.type === 'rappel' && item.statut !== 'fait';

  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: '0.875rem', padding: '0.875rem 1rem',
      background: isPast ? 'rgba(220,38,38,0.04)' : `${typeColor}09`,
      borderRadius: '8px', border: `1px solid ${isPast ? 'rgba(220,38,38,0.18)' : `${typeColor}20`}`,
      transition: 'border-color 0.12s',
    }}>
      {/* Dot / checkbox for rappel */}
      {item.type === 'rappel' ? (
        <button onClick={() => onToggleStatut(item)} title={item.statut === 'fait' ? 'Marquer À faire' : 'Marquer Fait'} style={{
          width: '18px', height: '18px', borderRadius: '50%', flexShrink: 0, marginTop: '2px',
          border: `2px solid ${item.statut === 'fait' ? T.green : '#D6D0C8'}`,
          background: item.statut === 'fait' ? T.green : 'transparent',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {item.statut === 'fait' && <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M2 5l2.5 2.5L8 3" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>}
        </button>
      ) : (
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: typeColor, flexShrink: 0, marginTop: '5px' }} />
      )}

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: '0.875rem', color: item.statut === 'fait' ? T.muted : T.text, textDecoration: item.statut === 'fait' ? 'line-through' : 'none', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {item.titre}
        </div>
        <div style={{ display: 'flex', gap: '0.625rem', flexWrap: 'wrap', marginTop: '3px', alignItems: 'center' }}>
          {item.heure && <span style={{ fontSize: '0.72rem', color: T.muted }}>{item.heure}</span>}
          {item.dateFin && item.dateFin !== item.date && (
            <span style={{ fontSize: '0.72rem', color: T.muted }}>→ {formatDate(item.dateFin)}</span>
          )}
          <span style={{ fontSize: '0.68rem', fontWeight: 700, color: typeColor, background: `${typeColor}12`, padding: '1px 7px', borderRadius: '99px' }}>
            {TYPE_LABELS[item.type]}
          </span>
          {item.categorie && (
            <span style={{ fontSize: '0.68rem', color: T.muted, background: '#F3EFE8', padding: '1px 7px', borderRadius: '99px' }}>
              {CAT_LABELS[item.categorie] || item.categorie}
            </span>
          )}
          {item.type === 'rappel' && item.statut !== 'fait' && (
            <span style={{ fontSize: '0.68rem', fontWeight: 700, color: STATUT_COLORS[item.statut] || T.muted }}>
              {STATUT_LABELS[item.statut] || item.statut}
            </span>
          )}
        </div>
        {item.description && (
          <div style={{ fontSize: '0.78rem', color: T.muted, marginTop: '4px', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
            {item.description}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
        <button onClick={() => onEdit(item)} style={{ padding: '0.3rem 0.6rem', background: 'none', border: '1px solid #E5E0D8', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', color: T.muted, fontFamily: "'DM Sans', sans-serif" }}>
          ✏️
        </button>
        <button onClick={() => onDelete(item.id)} style={{ padding: '0.3rem 0.6rem', background: 'none', border: '1px solid rgba(220,38,38,0.25)', borderRadius: '6px', cursor: 'pointer', fontSize: '0.72rem', color: T.red, fontFamily: "'DM Sans', sans-serif" }}>
          ✕
        </button>
      </div>
    </div>
  );
}

/* ── Page principale ── */
export default function Organisation() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState(undefined); // undefined=closed, null=new, object=edit
  const [filterType, setFilterType] = useState('');
  const [selectedDay, setSelectedDay] = useState(null);
  const width = useWindowWidth();
  const isMobile = width < 768;

  useEffect(() => {
    api.agenda.list().then(setItems).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleSave(id, payload) {
    if (id) {
      const updated = await api.agenda.update(id, payload);
      setItems(prev => prev.map(i => i.id === id ? updated : i));
    } else {
      const created = await api.agenda.create(payload);
      setItems(prev => [created, ...prev].sort((a, b) => {
        if (!a.date && !b.date) return 0;
        if (!a.date) return 1;
        if (!b.date) return -1;
        return a.date.localeCompare(b.date);
      }));
    }
  }

  async function handleDelete(id) {
    if (!window.confirm('Supprimer cet élément définitivement ?')) return;
    try {
      await api.agenda.delete(id);
      setItems(prev => prev.filter(i => i.id !== id));
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  }

  async function handleToggleStatut(item) {
    const nextStatut = item.statut === 'fait' ? 'a_faire' : 'fait';
    try {
      const updated = await api.agenda.update(item.id, { ...item, statut: nextStatut });
      setItems(prev => prev.map(i => i.id === item.id ? updated : i));
    } catch (err) {
      alert('Erreur : ' + err.message);
    }
  }

  // Notes sans date → colonne droite (respecte filterType, pas selectedDay)
  const undatedNotes = items.filter(i =>
    i.type === 'note' && !i.date && (!filterType || filterType === 'note')
  );

  // Colonne principale : tout sauf notes sans date
  const filteredMain = items.filter(i => {
    if (i.type === 'note' && !i.date) return false;
    if (filterType && i.type !== filterType) return false;
    if (selectedDay) {
      const start = i.date?.slice(0, 10);
      if (!start) return false;
      const end = (i.type === 'evenement' && i.dateFin && i.dateFin > i.date) ? i.dateFin.slice(0, 10) : start;
      if (selectedDay < start || selectedDay > end) return false;
    }
    return true;
  });

  const sortedMain = [
    ...filteredMain.filter(i => i.date).sort((a, b) => a.date.localeCompare(b.date)),
    ...filteredMain.filter(i => !i.date),
  ];

  const groups = sortedMain.reduce((acc, item) => {
    const key = item.date ? item.date.slice(0, 10) : '__nodate';
    if (!acc.length || acc[acc.length - 1].key !== key) {
      acc.push({ key, items: [item] });
    } else {
      acc[acc.length - 1].items.push(item);
    }
    return acc;
  }, []);

  const metaStyle = { fontSize: '0.65rem', fontWeight: 700, color: T.muted, textTransform: 'uppercase', letterSpacing: '0.1em' };

  return (
    <div style={{ maxWidth: '900px', fontFamily: "'DM Sans', sans-serif" }}>
      <style>{`@keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.75rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: T.text, margin: 0 }}>Organisation</h1>
          <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '4px', margin: '4px 0 0' }}>Rappels, événements et notes du chef.</p>
        </div>
        <button onClick={() => setEditingItem(null)} style={{ padding: '0.65rem 1.5rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
          onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
          onMouseLeave={e => e.currentTarget.style.background = T.green}
        >
          + Ajouter
        </button>
      </div>

      {/* Filter pills */}
      <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
        {[{ val: '', label: 'Tout' }, ...TYPES.map(([val, label]) => ({ val, label }))].map(({ val, label }) => (
          <button key={val || 'all'} onClick={() => setFilterType(val)} style={{
            padding: '0.3rem 0.875rem', borderRadius: '99px',
            border: `1px solid ${filterType === val ? T.green : '#D6D0C8'}`,
            background: filterType === val ? T.green : '#fff',
            color: filterType === val ? '#fff' : T.muted,
            fontSize: '0.8rem', fontWeight: filterType === val ? 700 : 400,
            cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", transition: 'all 0.12s',
          }}>{label}</button>
        ))}
      </div>

      {/* Layout */}
      <div style={{ display: isMobile ? 'flex' : 'grid', flexDirection: 'column', gridTemplateColumns: '1fr 280px', gap: '1.25rem', alignItems: 'start' }}>

        {/* Liste */}
        <div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: T.muted }}>
              <div style={{ width: '20px', height: '20px', border: '2px solid #E5E0D8', borderTopColor: T.green, borderRadius: '50%', animation: 'spin 0.7s linear infinite', margin: '0 auto 0.75rem' }} />
              <div style={{ fontSize: '0.85rem' }}>Chargement…</div>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : groups.length === 0 ? (
            <div style={{ ...card, padding: '3rem 2rem', textAlign: 'center' }}>
              <div style={{ fontSize: '2rem', marginBottom: '0.75rem' }}>📋</div>
              <div style={{ fontWeight: 700, color: T.text, fontSize: '0.95rem', marginBottom: '0.5rem' }}>
                {filterType || selectedDay ? 'Aucun élément pour ce filtre' : 'Aucun élément pour l\'instant'}
              </div>
              <div style={{ color: T.muted, fontSize: '0.82rem' }}>
                {filterType || selectedDay
                  ? 'Modifiez les filtres ou ajoutez un nouvel élément.'
                  : undatedNotes.length > 0
                    ? 'Vos notes libres sont affichées dans la colonne de droite.'
                    : 'Cliquez sur « + Ajouter » pour créer votre premier rappel, événement ou note.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
              {groups.map(({ key, items: groupItems }) => (
                <div key={key} style={{ animation: 'fadeIn 0.2s ease' }}>
                  <div style={{ ...metaStyle, marginBottom: '0.625rem', paddingLeft: '2px', textTransform: 'none', fontSize: '0.78rem', letterSpacing: '0' }}>
                    {key === '__nodate' ? 'Sans date' : formatGroupDate(key)}
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    {groupItems.map(item => (
                      <ItemCard key={item.id} item={item} onEdit={setEditingItem} onDelete={handleDelete} onToggleStatut={handleToggleStatut} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Colonne droite desktop */}
        {!isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'sticky', top: '2rem' }}>
            <div style={{ ...card, padding: '1.25rem' }}>
              <div style={{ ...metaStyle, marginBottom: '0.875rem' }}>Calendrier</div>
              <MiniCalendar items={items} selectedDay={selectedDay} onDayClick={setSelectedDay} />
            </div>
            {undatedNotes.length > 0 && (
              <div style={{ ...card, padding: '1.25rem' }}>
                <div style={{ ...metaStyle, marginBottom: '0.875rem' }}>Notes libres</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {undatedNotes.map(item => (
                    <ItemCard key={item.id} item={item} onEdit={setEditingItem} onDelete={handleDelete} onToggleStatut={handleToggleStatut} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Colonne droite mobile */}
        {isMobile && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ ...card, padding: '1.25rem' }}>
              <div style={{ ...metaStyle, marginBottom: '0.875rem' }}>Calendrier</div>
              <MiniCalendar items={items} selectedDay={selectedDay} onDayClick={setSelectedDay} />
            </div>
            {undatedNotes.length > 0 && (
              <div style={{ ...card, padding: '1.25rem' }}>
                <div style={{ ...metaStyle, marginBottom: '0.875rem' }}>Notes libres</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {undatedNotes.map(item => (
                    <ItemCard key={item.id} item={item} onEdit={setEditingItem} onDelete={handleDelete} onToggleStatut={handleToggleStatut} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {editingItem !== undefined && (
        <ItemModal
          item={editingItem || null}
          onSave={handleSave}
          onClose={() => setEditingItem(undefined)}
        />
      )}
    </div>
  );
}
