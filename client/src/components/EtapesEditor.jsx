import { useState } from 'react';
import { DndContext, PointerSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280' };
const inputStyle = { padding: '0.45rem 0.7rem', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.875rem', width: '100%', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: T.text };

function SortableEtape({ id, index, value, onChange, onDelete }) {
  const [handleHovered, setHandleHovered] = useState(false);
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.45 : 1, display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}
    >
      <button
        type="button"
        {...attributes}
        {...listeners}
        onMouseEnter={() => setHandleHovered(true)}
        onMouseLeave={() => setHandleHovered(false)}
        style={{ background: 'none', border: 'none', cursor: 'grab', color: handleHovered ? '#9CA3AF' : '#D1C4B0', fontSize: '1.2rem', padding: '7px 3px', marginTop: '3px', flexShrink: 0, transition: 'color 0.15s', userSelect: 'none', lineHeight: 1 }}
        title="Glisser pour réordonner"
      >⠿</button>
      <div style={{ flexShrink: 0, fontFamily: "'Playfair Display', serif", fontSize: '2rem', fontWeight: 700, color: T.gold, lineHeight: 1, width: '36px', textAlign: 'center', marginTop: '4px' }}>
        {index + 1}
      </div>
      <textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{ ...inputStyle, minHeight: '70px', resize: 'vertical', flex: 1 }}
        placeholder={`Étape ${index + 1}...`}
      />
      <button
        type="button"
        onClick={onDelete}
        style={{ background: 'none', border: 'none', color: '#D1C4B0', cursor: 'pointer', fontSize: '1rem', padding: '6px', marginTop: '4px', flexShrink: 0 }}
        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
        onMouseLeave={e => e.currentTarget.style.color = '#D1C4B0'}
      >✕</button>
    </div>
  );
}

function InsertGap({ visible, onInsert }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div
      style={{ height: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <button
        type="button"
        onClick={onInsert}
        style={{
          opacity: hovered ? 1 : 0,
          transition: 'opacity 0.15s',
          background: '#fff',
          border: '1px solid #2D6A4F',
          borderRadius: '50%',
          width: '22px',
          height: '22px',
          cursor: 'pointer',
          color: T.green,
          fontSize: '1rem',
          padding: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: "'DM Sans', sans-serif",
          fontWeight: 700,
          lineHeight: 1,
        }}
        title="Insérer une étape ici"
      >+</button>
    </div>
  );
}

export default function EtapesEditor({ etapes, onChange }) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const ids = etapes.map((_, i) => String(i));

  function handleDragEnd({ active, over }) {
    if (over && active.id !== over.id) {
      onChange(arrayMove(etapes, parseInt(active.id), parseInt(over.id)));
    }
  }

  function update(idx, val) {
    const next = [...etapes];
    next[idx] = val;
    onChange(next);
  }

  function remove(idx) {
    onChange(etapes.filter((_, i) => i !== idx));
  }

  function insertAfter(idx) {
    const next = [...etapes];
    next.splice(idx + 1, 0, '');
    onChange(next);
  }

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div>
          {etapes.map((etape, idx) => (
            <div key={idx}>
              <SortableEtape
                id={String(idx)}
                index={idx}
                value={etape}
                onChange={val => update(idx, val)}
                onDelete={() => remove(idx)}
              />
              {idx < etapes.length - 1 && (
                <InsertGap onInsert={() => insertAfter(idx)} />
              )}
            </div>
          ))}
        </div>
      </SortableContext>
      <button
        type="button"
        onClick={() => onChange([...etapes, ''])}
        style={{
          marginTop: etapes.length > 0 ? '1rem' : '0',
          display: 'flex', alignItems: 'center', gap: '0.5rem',
          padding: '0.6rem 1.25rem', borderRadius: '8px', border: 'none',
          background: '#2D6A4F', color: '#fff', cursor: 'pointer',
          fontWeight: 600, fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif",
        }}
        onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
        onMouseLeave={e => e.currentTarget.style.background = '#2D6A4F'}
      >
        + Ajouter une étape
      </button>
    </DndContext>
  );
}
