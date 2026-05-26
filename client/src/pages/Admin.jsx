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
  const [search, setSearch] = useState('');
  const [filterAccountStatus, setFilterAccountStatus] = useState('active');
  const [deleteMsg, setDeleteMsg] = useState('');

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

  function isTestAccount(email) {
    const lower = (email || '').toLowerCase();
    return ['test', 'beuce', 'chez'].some(m => lower.includes(m));
  }

  async function handleDisableToggle(u) {
    const action = u.disabled ? 'réactiver' : 'désactiver';
    if (!window.confirm(`${u.disabled ? '✓' : '⚠️'} ${action.charAt(0).toUpperCase() + action.slice(1)} le compte :\n${u.email}\n\n${u.disabled ? 'Le compte retrouvera accès à l\'application.' : 'Le compte ne pourra plus se connecter.'}`)) return;
    setDeleteMsg('');
    try {
      const res = await fetch(`${API_URL}/admin/users/${u.id}/disable`, {
        method: 'PATCH',
        headers: { 'X-Admin-Key': key },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setDeleteMsg(`✓ Compte ${data.disabled ? 'désactivé' : 'réactivé'} : ${data.email}`);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, disabled: data.disabled } : x));
    } catch (e) {
      setDeleteMsg(`✗ Erreur : ${e.message}`);
    }
  }

  async function handleDeleteUser(u) {
    const typed = window.prompt(`⚠️ SUPPRESSION DÉFINITIVE — action irréversible\n\nPour confirmer la suppression du compte :\n${u.email}\n\nTapez l'email exact du compte :`);
    if (typed !== u.email) { setDeleteMsg('Suppression annulée — email incorrect.'); return; }
    setDeleteMsg('');
    try {
      const res = await fetch(`${API_URL}/admin/users/${u.id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': key },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setDeleteMsg(`✓ Compte archivé : ${data.archived}`);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, deleted: true, deletedAt: new Date().toISOString(), disabled: true } : x));
    } catch (e) {
      setDeleteMsg(`✗ Erreur : ${e.message}`);
    }
  }

  async function handleRestoreUser(u) {
    if (!window.confirm(`↩ Restaurer le compte :\n${u.email}\n\nLe compte retrouvera un accès normal à l'application.`)) return;
    setDeleteMsg('');
    try {
      const res = await fetch(`${API_URL}/admin/users/${u.id}/restore`, {
        method: 'PATCH',
        headers: { 'X-Admin-Key': key },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setDeleteMsg(`✓ Compte restauré : ${data.restored}`);
      setUsers(prev => prev.map(x => x.id === u.id ? { ...x, deleted: false, deletedAt: null, disabled: false } : x));
    } catch (e) {
      setDeleteMsg(`✗ Erreur : ${e.message}`);
    }
  }

  async function handleDeleteOne(u) {
    if (!window.confirm(`⚠️ Action irréversible\n\nSupprimer définitivement le compte :\n${u.email}\n\nCette action ne peut pas être annulée.`)) return;
    setDeleteMsg('');
    try {
      const res = await fetch(`${API_URL}/admin/test-accounts/${u.id}`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': key },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setDeleteMsg(`✓ Compte supprimé : ${data.deleted}`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch (e) {
      setDeleteMsg(`✗ Erreur : ${e.message}`);
    }
  }

  async function handleDeleteAll() {
    const testAccounts = users.filter(u => isTestAccount(u.email));
    if (testAccounts.length === 0) { setDeleteMsg('Aucun compte test à supprimer.'); return; }
    const confirmation = window.prompt(
      `⚠️ SUPPRESSION IRRÉVERSIBLE DE TOUS LES COMPTES TEST\n\n${testAccounts.length} compte(s) seront supprimés définitivement :\n${testAccounts.map(u => u.email).join('\n')}\n\nTapez SUPPRIMER pour confirmer :`
    );
    if (confirmation !== 'SUPPRIMER') { setDeleteMsg('Suppression annulée.'); return; }
    setDeleteMsg('');
    try {
      const res = await fetch(`${API_URL}/admin/test-accounts`, {
        method: 'DELETE',
        headers: { 'X-Admin-Key': key },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setDeleteMsg(`✓ ${data.deleted} compte(s) supprimé(s) : ${data.emails.join(', ')}`);
      const deletedEmails = new Set(data.emails);
      setUsers(prev => prev.filter(x => !deletedEmails.has(x.email)));
    } catch (e) {
      setDeleteMsg(`✗ Erreur : ${e.message}`);
    }
  }

  function handleLogout() {
    sessionStorage.removeItem('adminKey');
    setKey('');
    setKeyInput('');
    setUsers([]);
    setError('');
  }

  const filtered = users.filter(u => {
    if (filterAccountStatus === 'active' && u.deleted) return false;
    if (filterAccountStatus === 'archived' && !u.deleted) return false;
    if (filterStatut !== 'all' && u.statutCommercial !== filterStatut) return false;
    if (filterVerified === 'yes' && !u.emailVerified) return false;
    if (filterVerified === 'no' && u.emailVerified) return false;
    if (filterSub === 'active' && u.subscriptionStatus !== 'active') return false;
    if (filterSub === 'trial' && u.subscriptionStatus !== 'trial') return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const emailMatch = (u.email || '').toLowerCase().includes(q);
      const etabMatch = (u.etablissement || '').toLowerCase().includes(q);
      if (!emailMatch && !etabMatch) return false;
    }
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

        {/* Recherche */}
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher par email ou établissement"
          style={{ ...inputBase, width: '100%', maxWidth: '420px', marginBottom: '0.75rem', padding: '0.6rem 0.9rem', fontSize: '0.84rem', cursor: 'text' }}
        />

        {/* Filtres */}
        <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          <select value={filterAccountStatus} onChange={e => setFilterAccountStatus(e.target.value)} style={{ ...inputBase, fontWeight: 600 }}>
            <option value="active">Non archivés</option>
            <option value="archived">Archivés</option>
            <option value="all">Tous</option>
          </select>
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
            <option value="active">Abonnement actif</option>
            <option value="trial">Essai</option>
          </select>
        </div>

        {users.some(u => isTestAccount(u.email)) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: '8px', padding: '0.65rem 1rem' }}>
            <span style={{ fontSize: '0.82rem', color: '#991B1B', flex: 1 }}>
              {users.filter(u => isTestAccount(u.email)).length} compte(s) test détecté(s)
            </span>
            <button
              onClick={handleDeleteAll}
              style={{ padding: '0.4rem 0.9rem', background: '#DC2626', color: '#fff', border: 'none', borderRadius: '6px', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}
            >
              🗑 Supprimer tous les comptes test
            </button>
          </div>
        )}

        {deleteMsg && (
          <p style={{ fontSize: '0.82rem', marginBottom: '0.75rem', color: deleteMsg.startsWith('✓') ? '#065F46' : '#991B1B', background: deleteMsg.startsWith('✓') ? '#D1FAE5' : '#FEE2E2', border: `1px solid ${deleteMsg.startsWith('✓') ? '#6EE7B7' : '#FCA5A5'}`, borderRadius: '7px', padding: '0.5rem 0.85rem' }}>
            {deleteMsg}
          </p>
        )}

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
                <th title="Connexion avec email/mot de passe" style={{ padding: '0.7rem 1rem', textAlign: 'left', fontWeight: 700, color: T.muted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', cursor: 'help' }}>
                  Dernière connexion
                </th>
                <th style={{ padding: '0.7rem 1rem', textAlign: 'left', fontWeight: 700, color: T.muted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>
                  1ère fiche
                </th>
                <th title="Dernier passage dans l'application" style={{ padding: '0.7rem 1rem', textAlign: 'left', fontWeight: 700, color: T.muted, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap', cursor: 'help' }}>
                  Dernière activité
                </th>
                <th style={{ padding: '0.7rem 1rem' }} />
              </tr>
            </thead>
            <tbody>
              {filtered.map((u, i) => {
                const daysLeft = trialDaysLeft(u.trialEndDate);
                const sStyle = STATUT_STYLE[u.statutCommercial] || STATUT_STYLE['lead'];
                const isArchived = u.deleted === true;
                const rowBg = isArchived ? '#F9F9F9' : i % 2 === 0 ? T.white : '#FAFAF9';
                return (
                  <tr key={u.id} style={{ borderBottom: `1px solid ${T.border}`, background: rowBg, opacity: isArchived ? 0.65 : 1 }}>
                    <td style={{ padding: '0.6rem 1rem', color: T.muted, fontWeight: 500, maxWidth: '220px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {u.email}
                      {isArchived && <span style={{ marginLeft: '6px', fontSize: '0.65rem', background: '#E5E7EB', color: '#6B7280', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>archivé</span>}
                      {!isArchived && u.disabled && <span style={{ marginLeft: '6px', fontSize: '0.65rem', background: '#F3F4F6', color: '#6B7280', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>désactivé</span>}
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
                    <td style={{ padding: '0.6rem 1rem', color: T.muted, whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {u.lastLoginAt ? formatDate(u.lastLoginAt) : 'Jamais'}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', color: T.muted, whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {formatDate(u.firstFicheAt)}
                    </td>
                    <td style={{ padding: '0.6rem 1rem', color: T.muted, whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {u.lastSeenAt ? formatDate(u.lastSeenAt) : '—'}
                    </td>
                    <td style={{ padding: '0.6rem 0.75rem', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
                        {isArchived ? (
                          <button
                            onClick={() => handleRestoreUser(u)}
                            title="Restaurer ce compte"
                            style={{ padding: '0.28rem 0.6rem', background: '#D1FAE5', color: '#065F46', border: '1px solid #6EE7B7', borderRadius: '5px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}
                          >
                            ↩ Restaurer
                          </button>
                        ) : (
                          <>
                            <button
                              onClick={() => handleDisableToggle(u)}
                              title={u.disabled ? 'Réactiver ce compte' : 'Désactiver ce compte'}
                              style={{ padding: '0.28rem 0.6rem', background: u.disabled ? '#D1FAE5' : '#FEF3C7', color: u.disabled ? '#065F46' : '#92400E', border: `1px solid ${u.disabled ? '#6EE7B7' : '#FCD34D'}`, borderRadius: '5px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              {u.disabled ? '↩ Réactiver' : '⊘ Désactiver'}
                            </button>
                            {isTestAccount(u.email) ? (
                              <button
                                onClick={() => handleDeleteOne(u)}
                                title="Supprimer ce compte test"
                                style={{ padding: '0.28rem 0.55rem', background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5', borderRadius: '5px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}
                              >
                                🗑
                              </button>
                            ) : (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                title="Archiver ce compte"
                                style={{ padding: '0.28rem 0.55rem', background: '#F9FAFB', color: '#6B7280', border: '1px solid #E5E7EB', borderRadius: '5px', fontWeight: 700, fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}
                              >
                                🗑
                              </button>
                            )}
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filtered.length === 0 && (
                <tr>
                  <td colSpan={13} style={{ padding: '2.5rem', textAlign: 'center', color: T.muted }}>
                    Aucun utilisateur correspondant aux filtres.
                  </td>
                </tr>
              )}
              {loading && (
                <tr>
                  <td colSpan={13} style={{ padding: '2.5rem', textAlign: 'center', color: T.muted }}>
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
