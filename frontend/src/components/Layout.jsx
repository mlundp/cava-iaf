import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const sidebarStyle = {
  width: 240,
  padding: '24px 16px',
  backgroundColor: '#1a1a2e',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
};

const logoStyle = {
  fontSize: 22,
  fontWeight: 700,
  marginBottom: 32,
  letterSpacing: 1,
};

const linkStyle = {
  display: 'block',
  padding: '10px 12px',
  borderRadius: 6,
  color: '#ccc',
  textDecoration: 'none',
  fontSize: 15,
  marginBottom: 2,
  transition: 'background 0.15s',
};

const activeLinkStyle = {
  ...linkStyle,
  backgroundColor: 'rgba(255,255,255,0.1)',
  color: '#fff',
  fontWeight: 600,
};

const mainStyle = {
  flex: 1,
  padding: '24px 32px',
  backgroundColor: '#f5f5f5',
  minHeight: '100vh',
  overflowY: 'auto',
};

export default function Layout({ session, children }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={sidebarStyle}>
        <div style={logoStyle}>Cava</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          <li>
            <NavLink
              to="/kontakter"
              style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}
            >
              Kontakter
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/logbog"
              style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}
            >
              Logbog
            </NavLink>
          </li>
          <li>
            <NavLink
              to="/medhjælperen"
              style={({ isActive }) => isActive ? activeLinkStyle : linkStyle}
            >
              Medhjælperen
            </NavLink>
          </li>
        </ul>
        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <p style={{ fontSize: 13, color: '#999', marginBottom: 8 }}>{session.user.email}</p>
          <button
            onClick={handleLogout}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: 'none',
              color: '#ccc',
              padding: '8px 16px',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 13,
              width: '100%',
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
