import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';

const T = { green: '#2D6A4F', gold: '#C9A84C', orange: '#D97706', text: '#1C2B1E', muted: '#6B7280', red: '#DC2626' };
const CATEGORIES = ['Amuse-bouche', 'Entrée', 'Plat viande', 'Plat poisson', 'Plat végétarien', 'Dessert', 'Autre'];
const ACCEPTED = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
const MAX_SIZE = 10 * 1024 * 1024;

const inputStyle = {
  padding: '0.5rem 0.75rem', border: '1px solid #E5E0D8', borderRadius: '8px',
  fontSize: '0.875rem', width: '100%', fontFamily: "'DM Sans', sans-serif",
  outline: 'none', color: T.text, background: '#fff', boxSizing: 'border-box',
};
const labelStyle = {
  fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase',
  letterSpacing: '0.07em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px',
};

function norm(str) {
  return (str || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim();
}

function findMatch(nom, catalog) {
  const n = norm(nom);
  const exact = catalog.find(c => norm(c.nom) === n);
  if (exact) return { item: exact, type: 'exact' };
  const partial = catalog.find(c => { const cn = norm(c.nom); return cn.includes(n) || n.includes(cn); });
  if (partial) return { item: partial, type: 'partial' };
  return null;
}

function validateFile(f) {
  if (!ACCEPTED.includes(f.type)) return 'Format non supporté (JPEG, PNG, WebP ou PDF uniquement)';
  if (f.size > MAX_SIZE) return 'Fichier trop volumineux — 10 Mo maximum';
  return null;
}

function StepDot({ active, done }) {
  return (
    <div style={{
      width: active ? '22px' : '7px', height: '7px', borderRadius: '4px',
      background: done ? T.green : active ? T.green : '#D1C4B0',
      opacity: done ? 0.4 : 1,
      transition: 'all 0.2s',
    }} />
  );
}

function UncertainField({ label, uncertain, children }) {
  return (
    <div style={{ borderLeft: `3px solid ${uncertain ? T.orange : 'transparent'}`, paddingLeft: '8px' }}>
      <div style={{ ...labelStyle, color: uncertain ? T.orange : T.muted }}>
        {uncertain && <span title="Valeur incertaine — vérifiez">⚠️</span>}
        {label}
      </div>
      {children}
    </div>
  );
}

export default function ImportFicheModal({ onClose }) {
  const navigate = useNavigate();
  const fileRef = useRef();
  const [step, setStep] = useState(0);
  const [file, setFile] = useState(null);
  const [fileError, setFileError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);
  const [result, setResult] = useState(null);
  const [ficheForm, setFicheForm] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [ingChoices, setIngChoices] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.ingredients.list().catch(() => []).then(setCatalog);
  }, []);

  function handleFileSelect(f) {
    if (!f) return;
    const err = validateFile(f);
    setFileError(err);
    if (!err) { setFile(f); setApiError(null); }
  }

  function handleDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFileSelect(f);
  }

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setApiError(null);
    try {
      const fd = new FormData();
      fd.append('fiche', file);
      const data = await api.ia.analyserFiche(fd);
      setResult(data);
      setFicheForm({
        nom: data.nom || '',
        categorie: CATEGORIES.includes(data.categorie) ? data.categorie : 'Autre',
        portions: data.portions ?? 4,
        tempsPreparation: data.tempsPreparation ?? '',
        tempsCuisson: data.tempsCuisson ?? '',
      });
      const ings = data.ingredients || [];
      setIngChoices(ings.map(ing => {
        const match = findMatch(ing.nom, catalog);
        return {
          mode: ing.prixUnitaire !== null ? 'creer' : 'creer_sans_prix',
          selectedCatalogId: match?.item?.id || '',
          match,
        };
      }));
      setStep(1);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setSubmitting(true);
    setApiError(null);
    try {
      const ings = result.ingredients || [];
      const ficheIngs = [];

      for (let i = 0; i < ings.length; i++) {
        const ing = ings[i];
        const choice = ingChoices[i];

        if (choice.mode === 'associer') {
          const catItem = catalog.find(c => c.id === choice.selectedCatalogId);
          if (!catItem) continue;
          ficheIngs.push({
            nom: catItem.nom,
            quantite: ing.quantite || 0,
            unite: ing.unite || catItem.unite || 'g',
            prixUnitaire: catItem.prixUnitaire || 0,
            tva: 10,
          });
        } else if (choice.mode === 'creer') {
          await api.ingredients.create({ nom: ing.nom, prixUnitaire: ing.prixUnitaire || 0, unite: ing.unite || 'g' });
          ficheIngs.push({
            nom: ing.nom,
            quantite: ing.quantite || 0,
            unite: ing.unite || 'g',
            prixUnitaire: ing.prixUnitaire || 0,
            tva: 10,
          });
        } else {
          await api.ingredients.create({ nom: ing.nom, prixUnitaire: 0, unite: ing.unite || 'g' });
          ficheIngs.push({
            nom: ing.nom,
            quantite: ing.quantite || 0,
            unite: ing.unite || 'g',
            prixUnitaire: 0,
            tva: 10,
          });
        }
      }

      const newFiche = await api.recettes.create({
        nom: ficheForm.nom,
        categorie: ficheForm.categorie,
        portions: parseInt(ficheForm.portions) || 4,
        tempsPreparation: parseInt(ficheForm.tempsPreparation) || 0,
        tempsCuisson: parseInt(ficheForm.tempsCuisson) || 0,
        ingredients: ficheIngs,
        etapes: [],
        description: '',
        description_commerciale: '',
        allergenes: [],
      });

      onClose();
      navigate(`/fiches-techniques/${newFiche.id}`);
    } catch (err) {
      setApiError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function updateChoice(i, patch) {
    setIngChoices(prev => prev.map((c, idx) => idx === i ? { ...c, ...patch } : c));
  }

  const incertains = result?.incertains || [];
  const ings = result?.ingredients || [];

  const canCreate = ficheForm?.nom?.trim() &&
    ingChoices.every((c, i) => {
      if (c.mode === 'associer') return !!c.selectedCatalogId;
      return true;
    });

  const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(28,43,30,0.6)',
    zIndex: 500, display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '1rem', overflowY: 'auto',
  };
  const cardStyle = {
    background: '#fff', borderRadius: '16px',
    width: '100%', maxWidth: step === 2 ? '700px' : '520px',
    maxHeight: '90vh', overflowY: 'auto',
    boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
    fontFamily: "'DM Sans', sans-serif",
  };

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={cardStyle}>
        <div style={{ padding: '2rem 2.5rem' }}>

          {/* Progress dots + close */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.75rem' }}>
            <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <StepDot active={step === 0} done={step > 0} />
              <StepDot active={step === 1} done={step > 1} />
              <StepDot active={step === 2} done={false} />
            </div>
            <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#C4B9A8', fontSize: '18px', padding: '4px', lineHeight: 1 }}
              onMouseEnter={e => e.currentTarget.style.color = T.muted}
              onMouseLeave={e => e.currentTarget.style.color = '#C4B9A8'}
            >✕</button>
          </div>

          {/* ── Étape 0 — Upload ─────────────────────────────────────── */}
          {step === 0 && (
            <>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', fontWeight: 700, color: T.text, marginBottom: '0.4rem' }}>
                Importer une fiche technique
              </h2>
              <p style={{ color: T.muted, fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                Déposez une photo ou un PDF de votre fiche. L'IA extrait les informations automatiquement.
              </p>

              <div
                onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
                onDragEnter={e => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                style={{
                  border: `2px dashed ${isDragging ? T.green : file ? T.green : '#D1C4B0'}`,
                  borderRadius: '12px', padding: '2.25rem 1.5rem', textAlign: 'center',
                  cursor: 'pointer', transition: 'all 0.15s',
                  background: isDragging ? 'rgba(45,106,79,0.04)' : file ? 'rgba(45,106,79,0.03)' : '#FAFAF8',
                }}
              >
                {file ? (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>
                      {file.type === 'application/pdf' ? '📄' : '🖼️'}
                    </div>
                    <div style={{ fontWeight: 600, color: T.text, fontSize: '0.875rem' }}>{file.name}</div>
                    <div style={{ color: T.muted, fontSize: '0.75rem', marginTop: '4px' }}>
                      {(file.size / 1024 / 1024).toFixed(1)} Mo — cliquer pour changer
                    </div>
                  </>
                ) : (
                  <>
                    <div style={{ fontSize: '2rem', marginBottom: '0.75rem', opacity: 0.6 }}>📂</div>
                    <div style={{ fontWeight: 600, color: T.text, fontSize: '0.9rem', marginBottom: '0.35rem' }}>
                      Déposer un fichier ici
                    </div>
                    <div style={{ color: T.muted, fontSize: '0.78rem' }}>
                      ou cliquer pour sélectionner · JPEG, PNG, WebP, PDF · 10 Mo max
                    </div>
                  </>
                )}
                <input ref={fileRef} type="file" accept=".jpg,.jpeg,.png,.webp,.pdf"
                  style={{ display: 'none' }} onChange={e => handleFileSelect(e.target.files[0])} />
              </div>

              {fileError && <p style={{ color: T.red, fontSize: '0.8rem', marginTop: '0.6rem', margin: '0.6rem 0 0' }}>{fileError}</p>}
              {apiError && <p style={{ color: T.red, fontSize: '0.8rem', marginTop: '0.6rem' }}>{apiError}</p>}

              <button
                onClick={handleAnalyze}
                disabled={!file || !!fileError || loading}
                style={{
                  marginTop: '1.25rem', width: '100%', padding: '0.85rem',
                  background: file && !fileError && !loading ? T.green : '#D1C4B0',
                  color: '#fff', border: 'none', borderRadius: '10px',
                  fontSize: '0.9rem', fontWeight: 700, cursor: file && !fileError && !loading ? 'pointer' : 'not-allowed',
                  fontFamily: "'DM Sans', sans-serif", transition: 'background 0.15s',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                }}
                onMouseEnter={e => { if (file && !fileError && !loading) e.currentTarget.style.background = '#1e4d38'; }}
                onMouseLeave={e => { if (file && !fileError && !loading) e.currentTarget.style.background = T.green; }}
              >
                {loading && (
                  <span style={{ display: 'inline-block', width: '14px', height: '14px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                )}
                {loading ? "L'IA analyse votre fiche..." : 'Analyser avec l\'IA'}
              </button>
            </>
          )}

          {/* ── Étape 1 — Validation fiche ───────────────────────────── */}
          {step === 1 && ficheForm && (
            <>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', fontWeight: 700, color: T.text, marginBottom: '0.4rem' }}>
                Vérifiez les informations extraites
              </h2>
              <p style={{ color: T.muted, fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.75rem' }}>
                Les champs <span style={{ color: T.orange, fontWeight: 600 }}>surlignés ⚠️</span> sont à vérifier — l'IA n'était pas certaine.
              </p>

              <div style={{ display: 'grid', gap: '1rem' }}>
                {/* Nom */}
                <UncertainField label="Nom du plat" uncertain={incertains.includes('nom')}>
                  <input value={ficheForm.nom} onChange={e => setFicheForm(f => ({ ...f, nom: e.target.value }))}
                    placeholder="Nom du plat" style={{ ...inputStyle, borderColor: incertains.includes('nom') ? T.orange : '#E5E0D8' }} />
                </UncertainField>

                {/* Catégorie + Portions */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <UncertainField label="Catégorie" uncertain={incertains.includes('categorie')}>
                    <select value={ficheForm.categorie} onChange={e => setFicheForm(f => ({ ...f, categorie: e.target.value }))}
                      style={{ ...inputStyle, borderColor: incertains.includes('categorie') ? T.orange : '#E5E0D8' }}>
                      {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                    </select>
                  </UncertainField>
                  <UncertainField label="Portions" uncertain={incertains.includes('portions')}>
                    <input type="number" min="1" value={ficheForm.portions}
                      onChange={e => setFicheForm(f => ({ ...f, portions: e.target.value }))}
                      style={{ ...inputStyle, borderColor: incertains.includes('portions') ? T.orange : '#E5E0D8' }} />
                  </UncertainField>
                </div>

                {/* Temps */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <UncertainField label="Tps préparation (min)" uncertain={incertains.includes('tempsPreparation')}>
                    <input type="number" min="0" value={ficheForm.tempsPreparation}
                      onChange={e => setFicheForm(f => ({ ...f, tempsPreparation: e.target.value }))}
                      placeholder="minutes"
                      style={{ ...inputStyle, borderColor: incertains.includes('tempsPreparation') ? T.orange : '#E5E0D8' }} />
                  </UncertainField>
                  <UncertainField label="Tps cuisson (min)" uncertain={incertains.includes('tempsCuisson')}>
                    <input type="number" min="0" value={ficheForm.tempsCuisson}
                      onChange={e => setFicheForm(f => ({ ...f, tempsCuisson: e.target.value }))}
                      placeholder="minutes"
                      style={{ ...inputStyle, borderColor: incertains.includes('tempsCuisson') ? T.orange : '#E5E0D8' }} />
                  </UncertainField>
                </div>
              </div>

              {/* Résumé ingrédients */}
              <div style={{ marginTop: '1.25rem', padding: '0.75rem 1rem', background: '#F8F6F1', borderRadius: '8px', fontSize: '0.82rem', color: T.muted }}>
                {ings.length} ingrédient{ings.length !== 1 ? 's' : ''} détecté{ings.length !== 1 ? 's' : ''} — vous les validerez à l'étape suivante.
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setStep(0)} style={{ padding: '0.6rem 1.25rem', border: '1px solid #E5E0D8', borderRadius: '8px', background: '#fff', color: T.muted, cursor: 'pointer', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>
                  ← Retour
                </button>
                <button
                  onClick={() => setStep(2)}
                  disabled={!ficheForm.nom.trim()}
                  style={{
                    padding: '0.6rem 1.5rem', border: 'none', borderRadius: '8px',
                    background: ficheForm.nom.trim() ? T.green : '#D1C4B0', color: '#fff',
                    cursor: ficheForm.nom.trim() ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => { if (ficheForm.nom.trim()) e.currentTarget.style.background = '#1e4d38'; }}
                  onMouseLeave={e => { if (ficheForm.nom.trim()) e.currentTarget.style.background = T.green; }}
                >
                  Suivant — Ingrédients →
                </button>
              </div>
            </>
          )}

          {/* ── Étape 2 — Validation ingrédients ────────────────────── */}
          {step === 2 && (
            <>
              <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', fontWeight: 700, color: T.text, marginBottom: '0.4rem' }}>
                Validez les ingrédients
              </h2>
              <p style={{ color: T.muted, fontSize: '0.875rem', lineHeight: 1.6, marginBottom: '1.5rem' }}>
                Pour chaque ingrédient, choisissez comment l'intégrer. Aucun ingrédient n'est créé sans votre confirmation.
              </p>

              {ings.length === 0 && (
                <p style={{ color: T.muted, fontSize: '0.875rem', padding: '1rem', background: '#F8F6F1', borderRadius: '8px' }}>
                  Aucun ingrédient détecté dans le document.
                </p>
              )}

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.5rem' }}>
                {ings.map((ing, i) => {
                  const choice = ingChoices[i] || { mode: 'creer_sans_prix', selectedCatalogId: '' };
                  const match = choice.match;
                  const hasPrice = ing.prixUnitaire !== null && ing.prixUnitaire !== undefined;

                  return (
                    <div key={i} style={{
                      border: '1px solid #E8E2D9', borderRadius: '10px',
                      padding: '0.9rem 1.1rem', background: '#fff',
                    }}>
                      {/* Ingredient info */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 700, color: T.text, fontSize: '0.875rem' }}>{ing.nom}</span>
                        {(ing.quantite || ing.unite) && (
                          <span style={{ fontSize: '0.78rem', color: T.muted }}>
                            {ing.quantite} {ing.unite}
                          </span>
                        )}
                        {hasPrice && (
                          <span style={{ fontSize: '0.75rem', color: T.green, fontWeight: 600 }}>
                            {ing.prixUnitaire} €/{ing.unite}
                          </span>
                        )}
                        {ing.incertain && (
                          <span title="Valeur incertaine" style={{ fontSize: '0.7rem', color: T.orange, fontWeight: 700, padding: '1px 6px', background: '#FEF3C7', borderRadius: '4px' }}>⚠️ à vérifier</span>
                        )}
                        {match && (
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '1px 7px', borderRadius: '4px', background: match.type === 'exact' ? '#DCFCE7' : '#FEF9E7', color: match.type === 'exact' ? '#15803D' : '#92400E', border: `1px solid ${match.type === 'exact' ? '#86EFAC' : '#FDE68A'}` }}>
                            {match.type === 'exact' ? '✓ Déjà en base' : '≈ Similaire en base'}
                          </span>
                        )}
                      </div>

                      {/* Radio options */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>

                        {/* Option — Associer */}
                        <label style={{ display: 'flex', alignItems: 'flex-start', gap: '0.6rem', cursor: 'pointer' }}>
                          <input type="radio" name={`ing-${i}`} value="associer"
                            checked={choice.mode === 'associer'}
                            onChange={() => updateChoice(i, { mode: 'associer' })}
                            style={{ marginTop: '2px', accentColor: T.green }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: T.text }}>
                              Associer à un ingrédient existant
                            </span>
                            {match && (
                              <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: T.muted }}>
                                (suggestion : {match.item.nom})
                              </span>
                            )}
                            {choice.mode === 'associer' && (
                              <select
                                value={choice.selectedCatalogId}
                                onChange={e => updateChoice(i, { selectedCatalogId: e.target.value })}
                                style={{ ...inputStyle, marginTop: '0.4rem', fontSize: '0.8rem', borderColor: !choice.selectedCatalogId ? T.orange : '#E5E0D8' }}
                              >
                                <option value="">— Choisir un ingrédient —</option>
                                {catalog.map(c => (
                                  <option key={c.id} value={c.id}>
                                    {c.nom} — {c.prixUnitaire} €/{c.unite}
                                  </option>
                                ))}
                              </select>
                            )}
                          </div>
                        </label>

                        {/* Option — Créer avec prix (si prix détecté) */}
                        {hasPrice && (
                          <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                            <input type="radio" name={`ing-${i}`} value="creer"
                              checked={choice.mode === 'creer'}
                              onChange={() => updateChoice(i, { mode: 'creer' })}
                              style={{ accentColor: T.green }} />
                            <span style={{ fontSize: '0.82rem', fontWeight: 500, color: T.text }}>
                              Créer avec ce prix
                              <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: T.green, fontWeight: 600 }}>
                                {ing.prixUnitaire} €/{ing.unite}
                              </span>
                            </span>
                          </label>
                        )}

                        {/* Option — Créer sans prix */}
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', cursor: 'pointer' }}>
                          <input type="radio" name={`ing-${i}`} value="creer_sans_prix"
                            checked={choice.mode === 'creer_sans_prix'}
                            onChange={() => updateChoice(i, { mode: 'creer_sans_prix' })}
                            style={{ accentColor: T.green }} />
                          <span style={{ fontSize: '0.82rem', fontWeight: 500, color: T.text }}>
                            Créer sans prix
                            <span style={{ marginLeft: '6px', fontSize: '0.75rem', color: T.muted }}>à compléter plus tard</span>
                          </span>
                        </label>

                      </div>
                    </div>
                  );
                })}
              </div>

              {apiError && (
                <p style={{ color: T.red, fontSize: '0.8rem', marginBottom: '1rem', padding: '0.6rem 0.9rem', background: '#FEE2E2', borderRadius: '6px' }}>
                  {apiError}
                </p>
              )}

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <button onClick={() => setStep(1)} style={{ padding: '0.6rem 1.25rem', border: '1px solid #E5E0D8', borderRadius: '8px', background: '#fff', color: T.muted, cursor: 'pointer', fontSize: '0.875rem', fontFamily: "'DM Sans', sans-serif" }}>
                  ← Retour
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!canCreate || submitting}
                  style={{
                    padding: '0.6rem 1.5rem', border: 'none', borderRadius: '8px',
                    background: canCreate && !submitting ? T.green : '#D1C4B0', color: '#fff',
                    cursor: canCreate && !submitting ? 'pointer' : 'not-allowed',
                    fontSize: '0.875rem', fontWeight: 700, fontFamily: "'DM Sans', sans-serif",
                    transition: 'background 0.15s', display: 'flex', alignItems: 'center', gap: '8px',
                  }}
                  onMouseEnter={e => { if (canCreate && !submitting) e.currentTarget.style.background = '#1e4d38'; }}
                  onMouseLeave={e => { if (canCreate && !submitting) e.currentTarget.style.background = T.green; }}
                >
                  {submitting && (
                    <span style={{ display: 'inline-block', width: '13px', height: '13px', border: '2px solid rgba(255,255,255,0.4)', borderTopColor: '#fff', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
                  )}
                  {submitting ? 'Création en cours...' : 'Créer la fiche et les ingrédients'}
                </button>
              </div>
            </>
          )}

        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
