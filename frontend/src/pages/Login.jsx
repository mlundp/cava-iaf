import { useState } from 'react';
import { supabase } from '../lib/supabase';

const font = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif";

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
    }

    setLoading(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: '#f8fafc',
      fontFamily: font,
    }}>
      <div style={{
        width: '100%',
        maxWidth: 380,
        backgroundColor: '#fff',
        borderRadius: 12,
        padding: '36px 32px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 4px 24px rgba(0,0,0,0.06)',
        border: '1px solid rgba(0,0,0,0.06)',
      }}>
        <div style={{
          fontSize: 17,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
          color: '#0f172a',
          marginBottom: 6,
        }}>
          Cava
        </div>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 28, marginTop: 0 }}>
          Log ind for at fortsætte
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="email" style={{
              display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6,
            }}>
              E-mail
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="din@email.dk"
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                fontFamily: font,
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease',
                backgroundColor: '#fff',
              }}
            />
          </div>
          <div style={{ marginBottom: 22 }}>
            <label htmlFor="password" style={{
              display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6,
            }}>
              Adgangskode
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                display: 'block',
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                fontSize: 14,
                outline: 'none',
                fontFamily: font,
                boxSizing: 'border-box',
                transition: 'border-color 0.15s ease',
                backgroundColor: '#fff',
              }}
            />
          </div>
          {error && (
            <p style={{
              color: '#dc2626',
              fontSize: 13,
              margin: '0 0 16px',
              padding: '10px 12px',
              backgroundColor: '#fef2f2',
              borderRadius: 8,
              border: '1px solid #fecaca',
            }}>
              {error}
            </p>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px 0',
              border: 'none',
              borderRadius: 8,
              cursor: loading ? 'wait' : 'pointer',
              fontSize: 14,
              fontWeight: 600,
              backgroundColor: '#6366f1',
              color: '#fff',
              fontFamily: font,
              transition: 'background-color 0.15s ease',
              opacity: loading ? 0.7 : 1,
            }}
          >
            {loading ? 'Logger ind...' : 'Log ind'}
          </button>
        </form>
      </div>
    </div>
  );
}
