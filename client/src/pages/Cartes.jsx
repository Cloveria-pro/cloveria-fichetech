import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useWindowWidth } from '../hooks/useWindowWidth.js';
import { coutIng } from '../utils.js';

const T = { green: '#2D6A4F', gold: '#C9A84C', text: '#1C2B1E', muted: '#6B7280', red: '#DC2626' };
const card = { background: '#fff', borderRadius: '12px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' };
const inputStyle = { padding: '0.45rem 0.7rem', border: '1px solid #E5E0D8', borderRadius: '6px', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif", outline: 'none', color: T.text, width: '100%' };

const SECTIONS_DEFAULT = ['Amuse-bouche', 'Entrées', 'Plats', 'Desserts'];
const SAISONS = ['Printemps 2026', 'Été 2026', 'Automne 2026', 'Hiver 2026', 'Toute l\'année'];
const CATEGORIES = ['Amuse-bouche', 'Entrée', 'Plat', 'Dessert', 'Boisson', 'Snack'];

function coutMat(r) { return (r.ingredients || []).reduce((s, i) => s + coutIng(i), 0); }
function coutPortion(r) { return r.portions > 0 ? coutMat(r) / r.portions : 0; }
function fcPct(cp, pv) { return pv > 0 ? (cp / pv * 100).toFixed(1) : null; }
function fcColor(pct) { if (pct < 30) return T.green; if (pct <= 35) return '#D97706'; return T.red; }

function relDate(iso) {
  const d = Math.floor((Date.now() - new Date(iso)) / 86400000);
  if (d === 0) return "Aujourd'hui"; if (d === 1) return 'Hier';
  if (d < 7) return `Il y a ${d}j`; return `Il y a ${Math.floor(d/7)}sem`;
}

// ─── Vue liste ────────────────────────────────────────────────────────────────
function ListeCartes({ cartes, onNew, onOpen, onDelete }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.8rem', fontWeight: 700, color: T.text }}>Cartes</h1>
          <p style={{ color: T.muted, fontSize: '0.875rem', marginTop: '2px' }}>{cartes.length} carte{cartes.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={onNew} style={{ padding: '0.55rem 1.25rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}
          onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
          onMouseLeave={e => e.currentTarget.style.background = T.green}
        >+ Nouvelle carte</button>
      </div>

      {cartes.length === 0 && <p style={{ color: T.muted }}>Aucune carte. Créez-en une !</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
        {cartes.map(carte => {
          const nb = (carte.sections || []).reduce((s, sec) => s + (sec.plats || []).length, 0);
          return (
            <div key={carte.id} style={{ ...card, padding: '1.5rem', cursor: 'pointer', transition: 'box-shadow 0.15s, transform 0.15s' }}
              onClick={() => onOpen(carte)}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 8px 24px rgba(45,106,79,0.12)'; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)'; e.currentTarget.style.transform = ''; }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: T.gold, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '6px' }}>{carte.saison}</div>
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
          );
        })}
      </div>
    </div>
  );
}

// ─── Éditeur de carte ─────────────────────────────────────────────────────────
function EditeurCarte({ carte, recettes, onSave, onBack }) {
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
  const width = useWindowWidth();
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
    const prixVente = recette.prixVente || parseFloat((cp / 0.30).toFixed(2));
    setForm(f => ({
      ...f,
      sections: f.sections.map(s =>
        s.titre === sectionTitre
          ? { ...s, plats: [...s.plats, { recetteId: recette.id, nom: recette.nom, prixVente }] }
          : s
      ),
    }));
  }

  function removePlat(sectionTitre, recetteId) {
    setForm(f => ({
      ...f,
      sections: f.sections.map(s =>
        s.titre === sectionTitre ? { ...s, plats: s.plats.filter(p => p.recetteId !== recetteId) } : s
      ),
    }));
  }

  function updatePrix(sectionTitre, recetteId, prix) {
    setForm(f => ({
      ...f,
      sections: f.sections.map(s =>
        s.titre === sectionTitre
          ? { ...s, plats: s.plats.map(p => p.recetteId === recetteId ? { ...p, prixVente: parseFloat(prix) || 0 } : p) }
          : s
      ),
    }));
  }

  function ajouterSection() {
    if (!nouvSection.trim()) return;
    setForm(f => ({ ...f, sections: [...f.sections, { titre: nouvSection.trim(), plats: [] }] }));
    setNouvSection(''); setShowAddSection(false);
  }

  function supprimerSection(titre) {
    if (!confirm(`Supprimer la section "${titre}" ?`)) return;
    setForm(f => ({ ...f, sections: f.sections.filter(s => s.titre !== titre) }));
  }

  async function sauvegarder() {
    if (!form.nom.trim()) return alert('Le nom est obligatoire.');
    setSaving(true);
    const method = carte ? 'PUT' : 'POST';
    const url = carte ? '/api/cartes/' + carte.id : '/api/cartes';
    const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const saved = await res.json();
    onSave(saved, !carte);
    setSaving(false);
  }

  const inputSm = { ...inputStyle, padding: '0.35rem 0.6rem', fontSize: '0.82rem' };

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button onClick={onBack} style={{ background: 'none', border: 'none', color: T.muted, cursor: 'pointer', fontSize: '0.875rem' }}>← Retour</button>
        <div style={{ flex: 1, display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
          <input value={form.nom} onChange={e => setForm(f => ({ ...f, nom: e.target.value }))}
            placeholder="Nom de la carte..." style={{ ...inputStyle, fontFamily: "'Playfair Display', serif", fontSize: '1.1rem', fontWeight: 700, flex: 1 }} />
          <select value={form.saison} onChange={e => setForm(f => ({ ...f, saison: e.target.value }))} style={{ ...inputStyle, width: 'auto' }}>
            {SAISONS.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <button onClick={sauvegarder} disabled={saving} style={{ padding: '0.55rem 1.5rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontFamily: "'DM Sans', sans-serif", whiteSpace: 'nowrap' }}
          onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#1e4d38'; }}
          onMouseLeave={e => e.currentTarget.style.background = T.green}
        >{saving ? 'Sauvegarde...' : 'Sauvegarder'}</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '320px 1fr', gap: '1.25rem', alignItems: 'start' }}>
        {/* Panneau gauche : fiches disponibles */}
        <div style={{ ...card, padding: '1.25rem', position: 'sticky', top: '1rem' }}>
          <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.95rem', fontWeight: 700, color: T.text, marginBottom: '0.875rem' }}>Fiches techniques</h3>
          <input type="search" placeholder="Rechercher..." value={search} onChange={e => setSearch(e.target.value)} style={{ ...inputSm, marginBottom: '0.5rem' }} />
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)} style={{ ...inputSm, marginBottom: '0.875rem' }}>
            <option value="">Toutes catégories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '60vh', overflowY: 'auto' }}>
            {filteredRec.map(r => {
              const deja = platsIds.includes(r.id);
              const cp = coutPortion(r);
              return (
                <div key={r.id} style={{ padding: '0.6rem 0.75rem', borderRadius: '8px', background: deja ? 'rgba(45,106,79,0.06)' : '#FAFAF8', border: '1px solid ' + (deja ? 'rgba(45,106,79,0.2)' : '#F3EFE8'), opacity: deja ? 0.6 : 1 }}>
                  <Link to={'/fiches-techniques/' + r.id} style={{ fontFamily: "'Playfair Display', serif", fontSize: '0.82rem', fontWeight: 600, color: T.text, marginBottom: '2px', lineHeight: 1.3, textDecoration: 'none', display: 'block' }}
                    onMouseEnter={e => e.currentTarget.style.color = T.green} onMouseLeave={e => e.currentTarget.style.color = T.text}>{r.nom}</Link>
                  <div style={{ fontSize: '0.72rem', color: T.muted, marginBottom: '6px' }}>{r.categorie} · {cp.toFixed(2)} EUR/p</div>
                  {!deja && (
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {form.sections.map(s => (
                        <button key={s.titre} onClick={() => addToSection(r, s.titre)}
                          style={{ fontSize: '0.68rem', padding: '2px 8px', borderRadius: '99px', border: '1px solid ' + T.gold, background: 'rgba(201,168,76,0.08)', color: '#8B6914', cursor: 'pointer', fontFamily: "'DM Sans', sans-serif" }}>
                          + {s.titre}
                        </button>
                      ))}
                    </div>
                  )}
                  {deja && <span style={{ fontSize: '0.68rem', color: T.green, fontWeight: 600 }}>✓ Dans la carte</span>}
                </div>
              );
            })}
          </div>
        </div>

        {/* Panneau droit : carte en construction */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {form.sections.map(section => (
            <div key={section.titre} style={{ ...card, padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
                <h3 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1rem', fontWeight: 700, color: T.text, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: T.gold, display: 'inline-block' }} />
                  {section.titre}
                  <span style={{ fontFamily: "'DM Sans', sans-serif", fontSize: '0.75rem', color: T.muted, fontWeight: 400 }}>({section.plats.length} plat{section.plats.length !== 1 ? 's' : ''})</span>
                </h3>
                <button onClick={() => supprimerSection(section.titre)} style={{ background: 'none', border: 'none', color: '#D1C4B0', cursor: 'pointer', fontSize: '0.85rem' }}
                  onMouseEnter={e => e.currentTarget.style.color = T.red}
                  onMouseLeave={e => e.currentTarget.style.color = '#D1C4B0'}
                >Supprimer section</button>
              </div>
              {section.plats.length === 0 && (
                <p style={{ color: '#C5BDB0', fontSize: '0.82rem', fontStyle: 'italic', padding: '0.5rem 0' }}>Cliquez sur une fiche à gauche pour l'ajouter ici.</p>
              )}
              {section.plats.map(plat => {
                const rec = recettes.find(r => r.id === plat.recetteId);
                const cp = rec ? coutPortion(rec) : 0;
                const fc = fcPct(cp, plat.prixVente);
                return (
                  <div key={plat.recetteId} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.6rem 0.75rem', borderRadius: '8px', background: '#FAFAF8', marginBottom: '4px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <Link to={'/fiches-techniques/' + plat.recetteId} style={{ fontFamily: "'Playfair Display', serif", fontWeight: 600, fontSize: '0.875rem', color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', textDecoration: 'none', display: 'block' }}
                        onMouseEnter={e => e.currentTarget.style.color = T.green} onMouseLeave={e => e.currentTarget.style.color = T.text}>{plat.nom}</Link>
                      <div style={{ fontSize: '0.72rem', color: T.muted, marginTop: '2px' }}>Coût mat. : {cp.toFixed(2)} EUR/p</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                      <input type="number" step="0.5" value={plat.prixVente}
                        onChange={e => updatePrix(section.titre, plat.recetteId, e.target.value)}
                        style={{ ...inputStyle, width: '80px', textAlign: 'right' }} />
                      <span style={{ fontSize: '0.78rem', color: T.muted }}>EUR</span>
                    </div>
                    {fc && <span style={{ fontSize: '0.78rem', fontWeight: 700, color: fcColor(parseFloat(fc)), minWidth: '36px', textAlign: 'right' }}>{fc}%</span>}
                    <button onClick={() => removePlat(section.titre, plat.recetteId)} style={{ background: 'none', border: 'none', color: '#D1C4B0', cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = T.red}
                      onMouseLeave={e => e.currentTarget.style.color = '#D1C4B0'}
                    >✕</button>
                  </div>
                );
              })}
            </div>
          ))}

          {/* Ajouter une section */}
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
  const [vue, setVue] = useState('liste');
  const [carteActive, setCarteActive] = useState(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/cartes').then(r => r.json()),
      fetch('/api/recettes').then(r => r.json()),
    ]).then(([c, r]) => { setCartes(c); setRecettes(r); });
  }, []);

  function handleSave(saved, isNew) {
    if (isNew) setCartes(prev => [...prev, saved]);
    else setCartes(prev => prev.map(c => c.id === saved.id ? saved : c));
    setVue('liste');
    setCarteActive(null);
  }

  function handleDelete(id) {
    if (!confirm('Supprimer cette carte ?')) return;
    fetch('/api/cartes/' + id, { method: 'DELETE' }).then(() =>
      setCartes(prev => prev.filter(c => c.id !== id))
    );
  }

  if (vue === 'liste') return (
    <ListeCartes
      cartes={cartes}
      onNew={() => { setCarteActive(null); setVue('edit'); }}
      onOpen={c => { setCarteActive(c); setVue('edit'); }}
      onDelete={handleDelete}
    />
  );

  return (
    <EditeurCarte
      key={carteActive?.id || 'new'}
      carte={carteActive}
      recettes={recettes}
      onSave={handleSave}
      onBack={() => { setVue('liste'); setCarteActive(null); }}
    />
  );
}