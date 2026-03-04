import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useTheme } from '../lib/theme';
import { IconContacts, IconLog, IconAI, IconSun, IconMoon } from './Icons';

const navItems = [
  { to: '/kontakter', label: 'Kontakter', Icon: IconContacts },
  { to: '/logbog', label: 'Logbog', Icon: IconLog },
  { to: '/medhjælperen', label: 'Medhjælperen', Icon: IconAI },
];

export default function Layout({ session, children }) {
  const { dark, toggle } = useTheme();

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={sidebarStyle}>
        <div style={logoStyle}>Cava</div>
        <div style={navSectionLabel}>Menu</div>
        <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
          {navItems.map(({ to, label, Icon }) => (
            <li key={to}>
              <NavLink
                to={to}
                style={({ isActive }) => ({
                  ...linkBase,
                  ...(isActive ? linkActiveExtra : {}),
                })}
              >
                <Icon size={18} />
                <span>{label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
        <div style={{ marginTop: 'auto', padding: '16px 12px 4px', borderTop: '1px solid #1e293b' }}>
          <button
            onClick={toggle}
            style={themeToggleStyle}
            title={dark ? 'Skift til lys tilstand' : 'Skift til mørk tilstand'}
          >
            {dark ? <IconSun size={16} /> : <IconMoon size={16} />}
            <span>{dark ? 'Lys tilstand' : 'Mørk tilstand'}</span>
          </button>
          <p style={{ fontSize: 12, color: '#64748b', marginBottom: 10, marginTop: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {session.user.email}
          </p>
          <button onClick={handleLogout} style={logoutBtnStyle}>
            Log ud
          </button>
        </div>
      </nav>
      <main style={mainStyle}>{children}</main>
    </div>
  );
}

const sidebarStyle = {
  width: 220,
  padding: '20px 12px',
  backgroundColor: '#0f172a',
  color: '#fff',
  display: 'flex',
  flexDirection: 'column',
  minHeight: '100vh',
  fontFamily: 'var(--font)',
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
  gap: 10,
  padding: '9px 12px',
  borderRadius: 7,
  color: '#94a3b8',
  textDecoration: 'none',
  fontSize: 14,
  fontWeight: 500,
  marginBottom: 1,
  transition: 'all 0.15s ease',
  borderLeft: '3px solid transparent',
};

const linkActiveExtra = {
  backgroundColor: 'rgba(99, 102, 241, 0.15)',
  color: '#c7d2fe',
  fontWeight: 600,
  borderLeft: '3px solid #6366f1',
};

const mainStyle = {
  flex: 1,
  padding: '28px 36px',
  backgroundColor: 'var(--bg)',
  minHeight: '100vh',
  overflowY: 'auto',
  fontFamily: 'var(--font)',
  color: 'var(--text)',
  transition: 'background-color 0.2s ease, color 0.2s ease',
};

const themeToggleStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  width: '100%',
  padding: '8px 12px',
  background: 'transparent',
  border: '1px solid #1e293b',
  borderRadius: 7,
  color: '#94a3b8',
  fontSize: 13,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'var(--font)',
  transition: 'all 0.15s ease',
};

const logoutBtnStyle = {
  background: 'transparent',
  border: '1px solid #1e293b',
  color: '#94a3b8',
  padding: '7px 0',
  borderRadius: 7,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 500,
  width: '100%',
  fontFamily: 'var(--font)',
  transition: 'all 0.15s ease',
};
