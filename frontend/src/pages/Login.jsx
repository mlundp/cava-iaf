import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg)', fontFamily: 'var(--font)', transition: 'background-color 0.2s ease' }}>
      <div style={{ width: '100%', maxWidth: 380, backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: '36px 32px', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-card)' }}>
        <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: 1.5, textTransform: 'uppercase', color: 'var(--text)', marginBottom: 6 }}>Cava</div>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28, marginTop: 0 }}>Log ind for at forts\u00e6tte</p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="email" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>E-mail</label>
            <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="din@email.dk"
              style={{ display: 'block', width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box', transition: 'border-color 0.15s ease', backgroundColor: 'var(--bg-input)', color: 'var(--text)' }} />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label htmlFor="password" style={{ display: 'block', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 6 }}>Adgangskode</label>
            <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
              style={{ display: 'block', width: '100%', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'var(--font)', boxSizing: 'border-box', transition: 'border-color 0.15s ease', backgroundColor: 'var(--bg-input)', color: 'var(--text)' }} />
          </div>
          {error && <p style={{ color: '#dc2626', fontSize: 13, margin: '0 0 16px', padding: '10px 12px', backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', padding: '11px 0', border: 'none', borderRadius: 8, cursor: loading ? 'wait' : 'pointer', fontSize: 14, fontWeight: 600, backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'var(--font)', transition: 'background-color 0.15s ease', opacity: loading ? 0.7 : 1 }}>
            {loading ? 'Logger ind...' : 'Log ind'}
          </button>
        </form>
      </div>
    </div>
  );
}
