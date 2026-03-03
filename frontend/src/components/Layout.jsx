import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";

const sidebarStyle = {
  width: 220,
  padding: '20px 12px',
  backgroundColor: '#0f172a',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  fontFamily: font,
};

const logoStyle = {
  fontSize: 17,
  fontWeight: 700,
  letterSpacing: 1.5,
  textTransform: 'uppercase',
  color: '#e2e8f0',
  padding: '0 12px',
  marginBottom: 28,
};

const navSectionLabel = {
  fontSize: 11,
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: 1,
  color: '#475569',
  padding: '0 12px',
  marginBottom: 6,
  marginTop: 4,
};

const linkBase = {
  display: 'flex',
  alignItems: 'center',
  padding: '9px 12px',
  borderRadius: 7,
  color: '#94a3b8',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 500,
  marginBottom: 1,
  transition: 'all 0.15s ease',
};

const linkActive = {
  ...linkBase,
  backgroundColor: 'rgba(99, 102, 241, 0.15)',
  color: '#c7d2fe',
  fontWeight: 600,
};

const mainStyle = {
  flex: 1,
  padding: '28px 36px',
  backgroundColor: '#fafbfc',
  minHeight: '100vh',
  overflowY: 'auto',
  fontFamily: font,
};

export default function Layout({ session, children }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={sidebarStyle}>
        <div style={logoStyle}>Cava</div>
        <div style={navSectionLabel}>Menu</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <NavLink
              to="/kontakter"
              style={({ isActive }) => isActive ? linkActive : linkBase}
            >
              Kontakter
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/logbog"
              style={({ isActive }) => isActive ? linkActive : linkBase}
            >
              Logbog
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/medhjælperen"
              style={({ isActive }) => isActive ? linkActive : linkBase}
            >
              Medhjælperen
            </NavLink>
          </li>
        </ul>
        <div style={{ marginTop: 'auto', padding: '16px 12px 4px', borderTop: '1px solid #1e293b' }}>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.user.email}
          </p>
          <button
            onClick={handleLogout}
            style={{
              background: 'transparent',
              border: '1px solid #1e293b',
              color: '#94a3b8',
              padding: '7px 0',
              borderRadius: 7,
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 500,
              width: '100%',
              fontFamily: font,
              transition: 'all 0.15s ease',
            }}
          >
            Log ud
          </button>
        </div>
      </nav>
      <main style={mainStyle}>{children}</main>
    </div>
  );
}
