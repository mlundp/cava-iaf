import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CompanyForm from '../components/CompanyForm';
import Skeleton from '../components/Skeleton';
import { IconContacts } from '../components/Icons';

const statusColors = {
  hot: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Hot' },
  warm: { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'Warm' },
  cold: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Cold' },
};

const typeStyles = {
  client: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Klient' },
  canvas: { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe', label: 'Canvas' },
};

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export default function Kontakter() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const navigate = useNavigate();

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setCompanies(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchCompanies(); }, []);

  const handleDineroSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch(`${API_URL}/api/dinero/sync`);
      const result = await res.json();
      if (!result.success) {
        alert('Synkronisering fejlede: ' + (result.error || 'Ukendt fejl'));
      } else {
        await fetchCompanies();
      }
    } catch (err) {
      alert('Kunne ikke forbinde til serveren: ' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  const updateStatus = async (e, id, newStatus) => {
    e.stopPropagation();
    const { error } = await supabase.from('companies').update({ status: newStatus }).eq('id', id);
    if (!error) {
      setCompanies((prev) => prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c)));
    }
  };

  const filtered = companies.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && c.type !== typeFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  const formatDate = (dateStr) => !dateStr ? '\u2014' : new Date(dateStr).toLocaleDateString('da-DK');
  const formatAmount = (amount) => !amount ? '0 kr.' : Number(amount).toLocaleString('da-DK') + ' kr.';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Kontakter</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>
            {filtered.length} virksomhed{filtered.length !== 1 ? 'er' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={handleDineroSync}
            disabled={syncing}
            style={{ ...secondaryBtnStyle, opacity: syncing ? 0.7 : 1, cursor: syncing ? 'wait' : 'pointer' }}
          >
            {syncing ? 'Synkroniserer...' : 'Synkroniser Dinero'}
          </button>
          <button onClick={() => setShowForm(true)} style={primaryBtnStyle}>
            + Tilf\u00f8j virksomhed
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <input type="text" placeholder="S\u00f8g efter navn..." value={search} onChange={(e) => setSearch(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={{ ...selectStyle, minWidth: 140 }}>
          <option value="">Alle typer</option>
          <option value="client">Klient</option>
          <option value="canvas">Canvas</option>
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ ...selectStyle, minWidth: 140 }}>
          <option value="">Alle statusser</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </select>
      </div>

      {loading ? (
        <div style={cardStyle}><div style={{ padding: 20 }}><Skeleton rows={6} /></div></div>
      ) : filtered.length === 0 ? (
        <div style={{ ...cardStyle, padding: 48, textAlign: 'center' }}>
          <div style={{ marginBottom: 12, color: 'var(--text-faint)' }}><IconContacts size={32} /></div>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: 0, fontWeight: 500 }}>
            Ingen virksomheder {search || typeFilter || statusFilter ? 'fundet' : 'endnu'}.
          </p>
          {!search && !typeFilter && !statusFilter && (
            <p style={{ color: 'var(--text-faint)', fontSize: 13, margin: '6px 0 0' }}>
              Tilf\u00f8j din f\u00f8rste virksomhed for at komme i gang.
            </p>
          )}
        </div>
      ) : (
        <div style={cardStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Navn</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Sidst aktiv</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Total faktureret</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((company) => {
                const ts = typeStyles[company.type] || typeStyles.canvas;
                return (
                  <tr
                    key={company.id}
                    onClick={() => navigate(`/kontakter/${company.id}`)}
                    style={{ borderBottom: '1px solid var(--border-subtle)', cursor: 'pointer', transition: 'background-color 0.1s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                  >
                    <td style={tdStyle}><span style={{ fontWeight: 600, color: 'var(--text)' }}>{company.name}</span></td>
                    <td style={tdStyle}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, backgroundColor: ts.bg, color: ts.color, border: `1px solid ${ts.border}` }}>
                        {ts.label}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <div style={{ display: 'flex', gap: 3 }}>
                        {['hot', 'warm', 'cold'].map((st) => {
                          const sc = statusColors[st];
                          const isActive = company.status === st;
                          return (
                            <button key={st} onClick={(e) => updateStatus(e, company.id, st)} style={{
                              padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, fontFamily: 'inherit',
                              border: isActive ? `1px solid ${sc.border}` : '1px solid transparent', cursor: 'pointer',
                              backgroundColor: isActive ? sc.bg : 'transparent', color: isActive ? sc.color : 'var(--text-placeholder)',
                              transition: 'all 0.15s ease',
                            }}>
                              {sc.label}
                            </button>
                          );
                        })}
                      </div>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{formatDate(company.last_invoice_date)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      {formatAmount(company.total_invoiced_dkk)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <CompanyForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchCompanies(); }} />
      )}
    </div>
  );
}

const secondaryBtnStyle = { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s ease' };
const primaryBtnStyle = { backgroundColor: 'var(--accent)', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'background-color 0.15s ease' };
const inputStyle = { padding: '9px 13px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', backgroundColor: 'var(--bg-input)', color: 'var(--text)', transition: 'border-color 0.15s ease' };
const selectStyle = { padding: '9px 13px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, backgroundColor: 'var(--bg-input)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)' };
const cardStyle = { backgroundColor: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-card)', transition: 'background-color 0.2s ease' };
const thStyle = { padding: '11px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--th-bg)' };
const tdStyle = { padding: '13px 16px', fontSize: 14 };
