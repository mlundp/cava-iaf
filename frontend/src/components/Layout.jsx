import { NavLink } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export default function Layout({ session, children }) {
  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <nav style={{ width: 240, padding: 20, borderRight: '1px solid #ddd' }}>
        <h2>Cava</h2>
        <ul style={{ listStyle: 'none', padding: 0 }}>
          <li>
            <NavLink to="/kontakter">Kontakter</NavLink>
          </li>
          <li>
            <NavLink to="/logbog">Logbog</NavLink>
          </li>
          <li>
            <NavLink to="/medhjælperen">Medhjælperen</NavLink>
          </li>
        </ul>
        <div style={{ marginTop: 'auto', paddingTop: 20 }}>
          <p style={{ fontSize: 14, color: '#666' }}>{session.user.email}</p>
          <button onClick={handleLogout}>Log ud</button>
        </div>
      </nav>
      <main style={{ flex: 1, padding: 20 }}>{children}</main>
    </div>
  );
}
