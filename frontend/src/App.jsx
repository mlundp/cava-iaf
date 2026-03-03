import { useEffect, useState } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Layout from './components/Layout';
import Login from './pages/Login';
import Kontakter from './pages/Kontakter';
import CompanyDetail from './pages/CompanyDetail';
import Logbog from './pages/Logbog';
import Medhjælperen from './pages/Medhjælperen';

export default function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  if (loading) return null;

  if (!session) return <Login />;

  return (
    <Layout session={session}>
      <Routes>
        <Route path="/kontakter" element={<Kontakter />} />
        <Route path="/kontakter/:id" element={<CompanyDetail />} />
        <Route path="/logbog" element={<Logbog />} />
        <Route path="/medhjælperen" element={<Medhjælperen />} />
        <Route path="*" element={<Navigate to="/kontakter" replace />} />
      </Routes>
    </Layout>
  );
}
