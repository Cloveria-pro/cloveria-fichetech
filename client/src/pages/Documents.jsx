import { useEffect, useState } from 'react';
import { api } from '../api.js';

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280', red: '#DC2626', bg: '#F8F6F1' };
const card = { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };
const selectStyle = { padding: '0.4rem 0.6rem', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.8rem', fontFamily: "'DM Sans', sans-serif", color: T.text, background: '#fff', outline: 'none' };
const badgeStyle = (color) => ({ display: 'inline-block', padding: '2px 8px', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 600, background: color === 'green' ? 'rgba(45,106,79,0.1)' : 'rgba(107,114,128,0.1)', color: color === 'green' ? T.green : T.muted });

const TABS = [
  { key: 'factures', label: 'Factures' },
  { key: 'fiches', label: 'Fiches techniques' },
  { key: 'ventes', label: 'Récaps de ventes' },
];

function fmt(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function EmptyState({ tab }) {
  const msgs = {
    factures: 'Aucune facture importée. Scannez une facture fournisseur via Menu Engineering.',
    fiches: 'Aucune fiche importée. Importez une fiche technique via Fiches Techniques.',
    ventes: 'Aucun récap de ventes importé. Importez un fichier de ventes via Menu Engineering.',
  };
  return (
    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: T.muted }}>
      <svg width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" style={{ margin: '0 auto 1rem', display: 'block', opacity: 0.4 }}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
      </svg>
      <p style={{ fontSize: '0.875rem' }}>{msgs[tab]}</p>
    </div>
  );
}

async function openFile(type, id) {
  try {
    const { base64, mimeType } = await api.documents.getFile(type, id);
    const bytes = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: mimeType || 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  } catch {
    alert('Impossible d\'ouvrir ce fichier.');
  }
}

function FacturesTab({ docs, onDelete }) {
  const [filtFournisseur, setFiltFournisseur] = useState('');
  const [filtMois, setFiltMois] = useState('');
  const [filtCategorie, setFiltCategorie] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [periodeDebut, setPeriodeDebut] = useState('');
  const [periodeFin, setPeriodeFin] = useState('');
  const [appliedDebut, setAppliedDebut] = useState('');
  const [appliedFin, setAppliedFin] = useState('');

  const fournisseurs = [...new Set(docs.map(d => d.fournisseur).filter(Boolean))].sort();
  const mois = [...new Set(docs.map(d => d.moisFacture ? `${d.moisFacture}/${d.anneeFacture}` : null).filter(Boolean))].sort();
  const categories = [...new Set(docs.map(d => d.categorieAchat).filter(Boolean))].sort();
  const hasActivePeriod = !!(appliedDebut || appliedFin);

  const filtered = docs.filter(d => {
    if (filtFournisseur && d.fournisseur !== filtFournisseur) return false;
    if (filtMois && `${d.moisFacture}/${d.anneeFacture}` !== filtMois) return false;
    if (filtCategorie && d.categorieAchat !== filtCategorie) return false;
    if (appliedDebut || appliedFin) {
      const docDate = d.dateImport ? d.dateImport.slice(0, 10) : null;
      if (appliedDebut && (!docDate || docDate < appliedDebut)) return false;
      if (appliedFin && (!docDate || docDate > appliedFin)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) => {
    if (sortOrder === 'fournisseur') return (a.fournisseur || '').localeCompare(b.fournisseur || '', 'fr');
    if (sortOrder === 'asc') return (a.dateImport || '').localeCompare(b.dateImport || '');
    return (b.dateImport || '').localeCompare(a.dateImport || '');
  });

  function appliquer() { setAppliedDebut(periodeDebut); setAppliedFin(periodeFin); }
  function reinitialiser() { setPeriodeDebut(''); setPeriodeFin(''); setAppliedDebut(''); setAppliedFin(''); }

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <select style={selectStyle} value={filtFournisseur} onChange={e => setFiltFournisseur(e.target.value)}>
          <option value="">Tous les fournisseurs</option>
          {fournisseurs.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <select style={selectStyle} value={filtMois} onChange={e => setFiltMois(e.target.value)}>
          <option value="">Tous les mois</option>
          {mois.map(m => <option key={m} value={m}>{m}</option>)}
        </select>
        <select style={selectStyle} value={filtCategorie} onChange={e => setFiltCategorie(e.target.value)}>
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={selectStyle} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
          <option value="desc">Plus récent d'abord</option>
          <option value="asc">Plus ancien d'abord</option>
          <option value="fournisseur">Fournisseur A→Z</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.78rem', color: T.muted, fontWeight: 600 }}>Période :</span>
        <input type="date" value={periodeDebut} onChange={e => setPeriodeDebut(e.target.value)} style={selectStyle} />
        <span style={{ fontSize: '0.78rem', color: T.muted }}>au</span>
        <input type="date" value={periodeFin} onChange={e => setPeriodeFin(e.target.value)} style={selectStyle} />
        <button onClick={appliquer} style={{ padding: '0.4rem 0.875rem', background: T.green, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Appliquer</button>
        {hasActivePeriod && <button onClick={reinitialiser} style={{ padding: '0.4rem 0.75rem', background: 'none', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.8rem', color: T.muted, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Réinitialiser</button>}
      </div>
      {sorted.length === 0 ? <EmptyState tab="factures" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sorted.map(doc => (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: '#FAFAF8', borderRadius: '8px', border: '1px solid #F3EFE8', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nomFichier}</div>
                <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: '3px', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {doc.fournisseur && <span>{doc.fournisseur}</span>}
                  {doc.dateFacture && <span>Facture : {doc.dateFacture}</span>}
                  {doc.moisFacture && <span>{doc.moisFacture}/{doc.anneeFacture}</span>}
                  {doc.categorieAchat && <span>{doc.categorieAchat}</span>}
                  <span>Import : {fmt(doc.dateImport)}</span>
                </div>
              </div>
              <span style={badgeStyle('green')}>{doc.statut || 'validé'}</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button onClick={() => openFile('factures', doc.id)} style={btnStyle(T.green)}>Voir</button>
                <button onClick={() => onDelete('factures', doc.id)} style={btnStyle(T.red)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function FichesTab({ docs, onDelete }) {
  const [filtCategorie, setFiltCategorie] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [periodeDebut, setPeriodeDebut] = useState('');
  const [periodeFin, setPeriodeFin] = useState('');
  const [appliedDebut, setAppliedDebut] = useState('');
  const [appliedFin, setAppliedFin] = useState('');

  const categories = [...new Set(docs.map(d => d.categoriePlat).filter(Boolean))].sort();
  const hasActivePeriod = !!(appliedDebut || appliedFin);

  const filtered = docs.filter(d => {
    if (filtCategorie && d.categoriePlat !== filtCategorie) return false;
    if (appliedDebut || appliedFin) {
      const docDate = d.dateImport ? d.dateImport.slice(0, 10) : null;
      if (appliedDebut && (!docDate || docDate < appliedDebut)) return false;
      if (appliedFin && (!docDate || docDate > appliedFin)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) =>
    sortOrder === 'asc'
      ? (a.dateImport || '').localeCompare(b.dateImport || '')
      : (b.dateImport || '').localeCompare(a.dateImport || '')
  );

  function appliquer() { setAppliedDebut(periodeDebut); setAppliedFin(periodeFin); }
  function reinitialiser() { setPeriodeDebut(''); setPeriodeFin(''); setAppliedDebut(''); setAppliedFin(''); }

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <select style={selectStyle} value={filtCategorie} onChange={e => setFiltCategorie(e.target.value)}>
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select style={selectStyle} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
          <option value="desc">Plus récent d'abord</option>
          <option value="asc">Plus ancien d'abord</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.78rem', color: T.muted, fontWeight: 600 }}>Période :</span>
        <input type="date" value={periodeDebut} onChange={e => setPeriodeDebut(e.target.value)} style={selectStyle} />
        <span style={{ fontSize: '0.78rem', color: T.muted }}>au</span>
        <input type="date" value={periodeFin} onChange={e => setPeriodeFin(e.target.value)} style={selectStyle} />
        <button onClick={appliquer} style={{ padding: '0.4rem 0.875rem', background: T.green, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Appliquer</button>
        {hasActivePeriod && <button onClick={reinitialiser} style={{ padding: '0.4rem 0.75rem', background: 'none', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.8rem', color: T.muted, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Réinitialiser</button>}
      </div>
      {sorted.length === 0 ? <EmptyState tab="fiches" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sorted.map(doc => (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: '#FAFAF8', borderRadius: '8px', border: '1px solid #F3EFE8', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nomFichier}</div>
                <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: '3px', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {doc.nomPlat && <span>{doc.nomPlat}</span>}
                  {doc.categoriePlat && <span>{doc.categoriePlat}</span>}
                  <span>Import : {fmt(doc.dateImport)}</span>
                </div>
              </div>
              <span style={badgeStyle('green')}>{doc.statut || 'validé'}</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button onClick={() => openFile('fiches', doc.id)} style={btnStyle(T.green)}>Voir</button>
                <button onClick={() => onDelete('fiches', doc.id)} style={btnStyle(T.red)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function VentesTab({ docs, onDelete }) {
  const [sortOrder, setSortOrder] = useState('desc');
  const [periodeDebut, setPeriodeDebut] = useState('');
  const [periodeFin, setPeriodeFin] = useState('');
  const [appliedDebut, setAppliedDebut] = useState('');
  const [appliedFin, setAppliedFin] = useState('');

  const hasActivePeriod = !!(appliedDebut || appliedFin);

  const filtered = docs.filter(d => {
    if (appliedDebut || appliedFin) {
      const docDate = d.dateImport ? d.dateImport.slice(0, 10) : null;
      if (appliedDebut && (!docDate || docDate < appliedDebut)) return false;
      if (appliedFin && (!docDate || docDate > appliedFin)) return false;
    }
    return true;
  });

  const sorted = [...filtered].sort((a, b) =>
    sortOrder === 'asc'
      ? (a.dateImport || '').localeCompare(b.dateImport || '')
      : (b.dateImport || '').localeCompare(a.dateImport || '')
  );

  function appliquer() { setAppliedDebut(periodeDebut); setAppliedFin(periodeFin); }
  function reinitialiser() { setPeriodeDebut(''); setPeriodeFin(''); setAppliedDebut(''); setAppliedFin(''); }

  return (
    <>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
        <select style={selectStyle} value={sortOrder} onChange={e => setSortOrder(e.target.value)}>
          <option value="desc">Plus récent d'abord</option>
          <option value="asc">Plus ancien d'abord</option>
        </select>
      </div>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '1rem' }}>
        <span style={{ fontSize: '0.78rem', color: T.muted, fontWeight: 600 }}>Période :</span>
        <input type="date" value={periodeDebut} onChange={e => setPeriodeDebut(e.target.value)} style={selectStyle} />
        <span style={{ fontSize: '0.78rem', color: T.muted }}>au</span>
        <input type="date" value={periodeFin} onChange={e => setPeriodeFin(e.target.value)} style={selectStyle} />
        <button onClick={appliquer} style={{ padding: '0.4rem 0.875rem', background: T.green, color: '#fff', border: 'none', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Appliquer</button>
        {hasActivePeriod && <button onClick={reinitialiser} style={{ padding: '0.4rem 0.75rem', background: 'none', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.8rem', color: T.muted, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>Réinitialiser</button>}
      </div>
      {sorted.length === 0 ? <EmptyState tab="ventes" /> : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {sorted.map(doc => (
            <div key={doc.id} style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '0.875rem 1rem', background: '#FAFAF8', borderRadius: '8px', border: '1px solid #F3EFE8', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: '0.875rem', color: T.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.nomFichier}</div>
                <div style={{ fontSize: '0.75rem', color: T.muted, marginTop: '3px', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                  {doc.lignesCount != null && <span>{doc.lignesCount} lignes</span>}
                  <span>Import : {fmt(doc.dateImport)}</span>
                </div>
              </div>
              <span style={badgeStyle('green')}>{doc.statut || 'validé'}</span>
              <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                <button onClick={() => openFile('ventes', doc.id)} style={btnStyle(T.green)}>Voir</button>
                <button onClick={() => onDelete('ventes', doc.id)} style={btnStyle(T.red)}>Supprimer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function btnStyle(color) {
  return {
    padding: '0.35rem 0.85rem',
    background: '#fff',
    color,
    border: `1px solid ${color}`,
    borderRadius: '6px',
    fontWeight: 600,
    fontSize: '0.78rem',
    cursor: 'pointer',
    fontFamily: "'DM Sans', sans-serif",
    whiteSpace: 'nowrap',
  };
}

export default function Documents() {
  const [activeTab, setActiveTab] = useState('factures');
  const [data, setData] = useState({ factures: [], fiches: [], ventes: [] });
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.documents.list('factures'),
      api.documents.list('fiches'),
      api.documents.list('ventes'),
    ]).then(([factures, fiches, ventes]) => {
      setData({ factures, fiches, ventes });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  async function handleDelete(type, id) {
    if (!window.confirm('Supprimer ce document définitivement ?')) return;
    setDeleting(id);
    try {
      await api.documents.delete(type, id);
      setData(prev => ({ ...prev, [type]: prev[type].filter(d => d.id !== id) }));
    } catch {
      alert('Erreur lors de la suppression.');
    } finally {
      setDeleting(null);
    }
  }

  const counts = { factures: data.factures.length, fiches: data.fiches.length, ventes: data.ventes.length };

  return (
    <div style={{ maxWidth: '860px' }}>
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: T.text }}>Documents</h1>
        <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '2px' }}>Bibliothèque des fichiers importés et validés</p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '0', marginBottom: '1.5rem', borderBottom: '2px solid #E5E0D8' }}>
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '0.65rem 1.25rem',
              background: 'none',
              border: 'none',
              borderBottom: activeTab === tab.key ? `2px solid ${T.green}` : '2px solid transparent',
              marginBottom: '-2px',
              fontFamily: "'DM Sans', sans-serif",
              fontSize: '0.875rem',
              fontWeight: activeTab === tab.key ? 700 : 400,
              color: activeTab === tab.key ? T.green : T.muted,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
            }}
          >
            {tab.label}
            {counts[tab.key] > 0 && (
              <span style={{ background: activeTab === tab.key ? T.green : '#E5E0D8', color: activeTab === tab.key ? '#fff' : T.muted, borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700, padding: '1px 6px', minWidth: '18px', textAlign: 'center' }}>
                {counts[tab.key]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div style={{ ...card, padding: '1.5rem' }}>
        {loading ? (
          <p style={{ color: T.muted, fontSize: '0.875rem' }}>Chargement...</p>
        ) : activeTab === 'factures' ? (
          <FacturesTab docs={data.factures} onDelete={handleDelete} />
        ) : activeTab === 'fiches' ? (
          <FichesTab docs={data.fiches} onDelete={handleDelete} />
        ) : (
          <VentesTab docs={data.ventes} onDelete={handleDelete} />
        )}
      </div>

      {deleting && (
        <div style={{ position: 'fixed', bottom: '1.5rem', right: '1.5rem', background: '#1C2B1E', color: '#fff', padding: '0.75rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 500 }}>
          Suppression en cours...
        </div>
      )}
    </div>
  );
}
