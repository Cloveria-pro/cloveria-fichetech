import { useState } from 'react';
import { Routes, Route, NavLink, Link, Navigate } from 'react-router-dom';
import Dashboard from './pages/Dashboard.jsx';
import Recettes from './pages/Recettes.jsx';
import FicheTechnique from './pages/FicheTechnique.jsx';
import NouvelleRecette from './pages/NouvelleRecette.jsx';
import Ingredients from './pages/Ingredients.jsx';
import SousRecettes from './pages/SousRecettes.jsx';
import Cartes from './pages/Cartes.jsx';
import Parametres from './pages/Parametres.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import { useWindowWidth } from './hooks/useWindowWidth.js';

const SIDEBAR_W = '224px';

const NAV_ITEMS = [
  { label: 'Dashboard', to: '/', end: true, icon: 'M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z' },
  { label: 'Fiches Techniques', to: '/fiches-techniques', end: false, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
  { label: 'Sous-recettes', to: '/sous-recettes', end: false, icon: 'M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z' },
  { label: 'Ingrédients', to: '/ingredients', end: false, icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
  { label: 'Cartes', to: '/cartes', end: false, icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { label: 'Paramètres', to: '/parametres', end: true, icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' },
];

function SvgIcon({ d }) {
  return (
    <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24" style={{ flexShrink: 0 }}>
      {d.split(' M').map((part, i) => (
        <path key={i} strokeLinecap="round" strokeLinejoin="round" d={i === 0 ? part : 'M' + part} />
      ))}
    </svg>
  );
}

function HamburgerIcon({ open }) {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      {open ? (
        <>
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </>
      ) : (
        <>
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </>
      )}
    </svg>
  );
}

export default function App() {
  const width = useWindowWidth();
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [user, setUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  function handleLogin(newToken, newUser) {
    localStorage.setItem('token', newToken);
    localStorage.setItem('user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  }

  function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  }

  // Auth pages (no sidebar)
  if (!token) {
    return (
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        <Route path="/register" element={<Register onLogin={handleLogin} />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    );
  }

  const sidebarStyle = isMobile
    ? {
        position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
        background: '#1C2B1E', display: 'flex', flexDirection: 'column',
        zIndex: 200, overflowY: 'auto',
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.25s ease',
        boxShadow: sidebarOpen ? '4px 0 20px rgba(0,0,0,0.3)' : 'none',
      }
    : {
        position: 'fixed', top: 0, left: 0, bottom: 0, width: SIDEBAR_W,
        background: '#1C2B1E', display: 'flex', flexDirection: 'column',
        zIndex: 100, overflowY: 'auto',
      };

  const mainStyle = {
    marginLeft: isMobile ? 0 : SIDEBAR_W,
    flex: 1,
    padding: isMobile ? '1rem' : isTablet ? '1.75rem' : '2.5rem',
    background: '#F8F6F1',
    minHeight: '100vh',
    paddingTop: isMobile ? '4rem' : isTablet ? '1.75rem' : '2.5rem',
  };

  function closeSidebar() { setSidebarOpen(false); }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div onClick={closeSidebar} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 199 }} />
      )}

      {/* Sidebar */}
      <aside style={sidebarStyle}>
        <div style={{ padding: '1.5rem 1.5rem 2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%', gap: '8px' }}>
            <img src="/logo.png" alt="CloverIA" style={{ height: '200px', width: 'auto', objectFit: 'contain', display: 'block' }}
              onError={e => { e.currentTarget.style.display = 'none'; }} />
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontFamily: "'Playfair Display', serif", color: '#fff', fontSize: '20px', fontWeight: 700, lineHeight: 1.1 }}>CloverIA</div>
              <div style={{ color: '#C9A84C', fontSize: '11px', fontWeight: 600, letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: '3px' }}>FicheTech</div>
            </div>
          </div>
          {isMobile && (
            <button onClick={closeSidebar} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', padding: '4px', position: 'absolute', top: '12px', right: '12px' }}>
              <HamburgerIcon open={true} />
            </button>
          )}
        </div>

        <nav style={{ flex: 1, padding: '0 0.75rem' }}>
          {NAV_ITEMS.map(({ label, to, end, icon }) => (
            <NavLink key={label} to={to} end={end} onClick={isMobile ? closeSidebar : undefined}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '10px',
                padding: '0.6rem 0.75rem', borderRadius: '8px', marginBottom: '2px',
                color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
                background: isActive ? 'rgba(201,168,76,0.15)' : 'transparent',
                borderLeft: isActive ? '3px solid #C9A84C' : '3px solid transparent',
                textDecoration: 'none', fontSize: '0.875rem', fontWeight: isActive ? 600 : 400,
                transition: 'all 0.15s', minHeight: '44px',
              })}
            >
              <SvgIcon d={icon} />{label}
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: '0 0.75rem 1rem' }}>
          <Link to="/fiches-techniques/nouvelle" onClick={isMobile ? closeSidebar : undefined} style={{ display: 'block', textAlign: 'center', padding: '0.65rem 1rem', background: '#2D6A4F', color: '#fff', borderRadius: '8px', textDecoration: 'none', fontSize: '0.85rem', fontWeight: 600, transition: 'background 0.15s', minHeight: '44px', lineHeight: '1.5' }}
            onMouseEnter={e => e.currentTarget.style.background = '#1e4d38'}
            onMouseLeave={e => e.currentTarget.style.background = '#2D6A4F'}
          >+ Nouvelle fiche</Link>
        </div>

        {/* User info + logout */}
        <div style={{ padding: '1rem 0.75rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          {user && (
            <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.45)', marginBottom: '8px', paddingLeft: '4px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.etablissement || user.email}
            </div>
          )}
          <button onClick={handleLogout} style={{
            width: '100%', padding: '0.6rem 0.75rem', background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
            color: 'rgba(255,255,255,0.6)', cursor: 'pointer', fontSize: '0.85rem',
            fontFamily: "'DM Sans', sans-serif", fontWeight: 500, textAlign: 'left',
            display: 'flex', alignItems: 'center', gap: '8px', minHeight: '44px',
            transition: 'background 0.15s',
          }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
          >
            <svg width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.8" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Déconnexion
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      {isMobile && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, height: '56px', background: '#1C2B1E', zIndex: 150, display: 'flex', alignItems: 'center', padding: '0 1rem', gap: '1rem' }}>
          <button onClick={() => setSidebarOpen(true)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: '8px', minWidth: '44px', minHeight: '44px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <HamburgerIcon open={false} />
          </button>
          <div>
            <div style={{ fontFamily: "'Playfair Display', serif", color: '#fff', fontSize: '18px', fontWeight: 700, lineHeight: 1 }}>CloverIA</div>
            <div style={{ color: '#C9A84C', fontSize: '10px', fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase' }}>FicheTech</div>
          </div>
        </div>
      )}

      <main style={mainStyle}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/fiches-techniques" element={<Recettes />} />
          <Route path="/fiches-techniques/nouvelle" element={<NouvelleRecette />} />
          <Route path="/fiches-techniques/:id" element={<FicheTechnique />} />
          <Route path="/nouvelle" element={<NouvelleRecette />} />
          <Route path="/sous-recettes" element={<SousRecettes />} />
          <Route path="/ingredients" element={<Ingredients />} />
          <Route path="/cartes" element={<Cartes />} />
          <Route path="/parametres" element={<Parametres />} />
          <Route path="/login" element={<Navigate to="/" replace />} />
          <Route path="/register" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
