import { useState, useEffect } from 'react';
import { API_URL } from '../api.js';

const T = {
  green: '#2D6A4F',
  text: '#1C2B1E',
  muted: '#6B7280',
  bg: '#F8F6F1',
  border: '#E5E0D8',
  white: '#ffffff',
};

const STATUT_STYLE = {
  'lead':          { background: '#F3F4F6', color: '#6B7280' },
  'activé':        { background: '#D1FAE5', color: '#065F46' },
  'à relancer':    { background: '#FEF3C7', color: '#92400E' },
  'client engagé': { background: '#DCFCE7', color: '#166534', fontWeight: 700 },
};

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function trialDaysLeft(trialEndDate) {
  if (!trialEndDate) return null;
  return Math.ceil((new Date(trialEndDate) - new Date()) / 86400000);
}

export default function Admin() {
  const [key, setKey] = useState(() => sessionStorage.getItem('adminKey') || '');
  const [keyInput, setKeyInput] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [filterStatut, setFilterStatut] = useState('all');
  const [filterVerified, setFilterVerified] = useState('all');
  const [filterSub, setFilterSub] = useState('all');

  useEffect(() => {
    if (key) fetchUsers(key);
  }, [key]);

  async function fetchUsers(k) {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: { 'X-Admin-Key': k },
      });
      if (res.status === 401) {
        sessionStorage.removeItem('adminKey');
        setKey('');
        setError('Clé invalide ou manquante.');
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setUsers(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function handleKeySubmit(e) {
    e.preventDefault();
    if (!keyInput.trim()) return;
    sessionStorage.setItem('adminKey', keyInput.trim());
    setKey(keyInput.trim());
  }

  function handleLogout() {
    sessionStorage.removeItem('adminKey');
    setKey('');
    setKeyInput('');
    setUsers([]);
    setError('');
  }

  const filtered = users.filter(u => {
    if (filterStatut !== 'all' && u.statutCommercial !== filterStatut) return false;
    if (filterVerified === 'yes' && !u.emailVerified) return false;
    if (filterVerified === 'no' && u.emailVerified) return false;
    if (filterSub === 'active' && u.subscriptionStatus !== 'active') return false;
    if (filterSub === 'trial' && u.subscriptionStatus !== 'trial') return false;
    return true;
  });

  const inputBase = {
    padding: '0.6rem 0.85rem', border: `1px solid ${T.border}`, borderRadius: '7px',
    fontSize: '0.82rem', background: T.white, color: T.text, fontFamily: 'inherit',
    cursor: 'pointer', outline: 'none',
  };

  if (!key) {
    return (
      <div style={{ minHeight: '100vh', background: T.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem' }}>
        <div style={{ background: T.white, borderRadius: '14px', boxShadow: '0 4px 24px rgba(0,0,0,0.08)', padding: '2.5rem', width: '100%', maxWidth: '360px' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: T.text, margin: '0 0 4px' }}>Admin CRM</h1>
          <p style={{ fontSize: '0.82rem', color: T.muted, margin: '0 0 1.75rem' }}>CloverIA — accès interne</p>
          <form onSubmit={handleKeySubmit}>
            <input
              type="password"
              value={keyInput}
              onChange={e => setKeyInput(e.target.value)}
              placeholder="Clé d'accès admin"
              autoFocus
              style={{ ...inputBase, width: '100%', boxSizing: 'border-box', marginBottom: '0.85rem', padding: '0.7rem 0.9rem', fontSize: '0.9rem' }}
            />
            {error && <p style={{ color: '#DC2626', fontSize: '0.8rem', margin: '0 0 0.85rem' }}>{error}</p>}
            <button type="submit" style={{ width: '100%', padding: '0.72rem', background: T.green, color: '#fff', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'inherit' }}>
              Accéder
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: T.bg, padding: '2rem 2.5rem' }}>
      <div style={{ maxWidth: '1440px', margin: '0 auto' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 800, color: T.text, margin: 0 }}>CRM Admin — CloverIA</h1>
            <p style={{ fontSize: '0.8rem', color: T.muted, margin: '4px 0 0' }}>
              {loading ? 'Chargement…' : `${filtered.length} / ${users.length} utilisateurs`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button onClick={() => fetchUsers(key)} style={{ ...inputBase, background: T.white }}>↺ Actualiser</button>
            <button onClick={handleLogout} style={{ ...inputBase, background: T.white }}>Déconnexion</button>
          </div>
        </div>

        {/* Filtres */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <select value={filterStatut} onChange={e => setFilterStatut(e.target.value)} style={inputBase}>
            <option value="all">Tous statuts</option>
            <option value="lead">Lead</option>
            <option value="activé">Activé</option>
            <option value="à relancer">À relancer</option>
            <option value="client engagé">Client engagé</option>
          </select>
          <select value={filterVerified} onChange={e => setFilterVerified(e.target.value)} style={inputBase}>
            <option value="all">Email — tous</option>
            <option value="yes">Email vérifié</option>
            <option value="no">Email non vérifié</option>
          </select>
          <select value={filterSub} onChange={e => setFilterSub(e.target.value)} style={inputBase}>
            <option value="all">Abonnement — tous</option>
            <option value="active">Actif</option>
            <option value="trial">Essai</option>
          </select>
        </div>

        {error && <p style={{ color: '#DC2626', fontSize: '0.85rem', marginBottom: '1rem' }}>{error}</p>}

        {/* Tableau */}
        <div style={{ background: T.white, borderRadius: '12px', border: `1px solid ${T.border}`, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ borderBottom: `2px solid ${T.border}`, background: '#FAFAF9' }}>
                {['Email', 'Établissement', 'Inscription', 'Email vérifié', 'Onboarding', 'Fiches / Cartes*', 'Abonnement', 'Statut commercial', 'Essai'].map(h => (
                  <th key={h} style={{ padding: '0.7rem 1rem', textAlign: 'left', fontWeight: 700, color: T.muted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const daysLeft = trialDaysLeft(u.trialEndDate);
                const sStyle = STATUT_STYLE[u.statutCommercial] || STATUT_STYLE['lead'];
                return (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${T.border}`, background: i % 2 === 0 ? T.white : '#FAFAF9' }}>
                    <td style={{ padding: '0.6rem 1rem', color: T.text, fontWeight: 500, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', color: T.text, maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.etablissement || '—'}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', color: T.muted, whiteSpace: 'nowrap' }}>
                      {formatDate(u.createdAt)}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                      <span style={{ color: u.emailVerified ? '#059669' : '#DC2626', fontWeight: 700, fontSize: '0.9rem' }}>
                        {u.emailVerified ? '✓' : '✗'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem', textAlign: 'center' }}>
                      <span style={{ color: u.onboardingComplete ? '#059669' : '#DC2626', fontWeight: 700, fontSize: '0.9rem' }}>
                        {u.onboardingComplete ? '✓' : '✗'}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem', color: T.text, whiteSpace: 'nowrap' }}>
                      {u.nbFiches} fiche{u.nbFiches !== 1 ? 's' : ''} · {u.nbCartes} carte{u.nbCartes !== 1 ? 's' : ''}
                      {u.examplePackChoice === 'example' && (
                        <span style={{ marginLeft: '6px', fontSize: '0.68rem', color: T.muted, background: '#F3F4F6', padding: '1px 5px', borderRadius: '4px' }}>+ex</span>
                      )}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', color: T.muted, whiteSpace: 'nowrap' }}>
                      {u.subscriptionStatus || '—'}
                    </td>
                    <td style={{ padding: '0.6rem 1rem' }}>
                      <span style={{ ...sStyle, padding: '2px 9px', borderRadius: '20px', fontSize: '0.71rem', fontWeight: 600, whiteSpace: 'nowrap', display: 'inline-block' }}>
                        {u.statutCommercial}
                      </span>
                    </td>
                    <td style={{ padding: '0.6rem 1rem', color: T.muted, whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {u.subscriptionStatus === 'trial' && daysLeft !== null
                        ? daysLeft > 0 ? `${daysLeft}j restants` : 'Expiré'
                        : '—'}
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: T.muted }}>
                    Aucun utilisateur correspondant aux filtres.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={9} style={{ padding: '2.5rem', textAlign: 'center', color: T.muted }}>
                    Chargement…
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <p style={{ fontSize: '0.72rem', color: T.muted, marginTop: '0.6rem' }}>
          * Compteurs hors contenu d&apos;exemple injecté à l&apos;onboarding. Le badge <strong>+ex</strong> indique que le pack d&apos;exemple a été appliqué.
        </p>
      </div>
    </div>
  );
}
