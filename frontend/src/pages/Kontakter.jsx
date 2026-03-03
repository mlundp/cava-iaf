import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CompanyForm from '../components/CompanyForm';

const statusColors = {
  hot: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Hot' },
  warm: { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'Warm' },
  cold: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe', label: 'Cold' },
};

const typeLabels = { client: 'Klient', canvas: 'Canvas' };

export default function Kontakter() {
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const fetchCompanies = async () => {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('created_at', { ascending: false });
    if (!error) setCompanies(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchCompanies();
  }, []);

  const updateStatus = async (e, id, newStatus) => {
    e.stopPropagation();
    const { error } = await supabase
      .from('companies')
      .update({ status: newStatus })
      .eq('id', id);
    if (!error) {
      setCompanies((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
    }
  };

  const filtered = companies.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter && c.type !== typeFilter) return false;
    if (statusFilter && c.status !== statusFilter) return false;
    return true;
  });

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    return new Date(dateStr).toLocaleDateString('da-DK');
  };

  const formatAmount = (amount) => {
    if (!amount) return '0 kr.';
    return Number(amount).toLocaleString('da-DK') + ' kr.';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Kontakter</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
            {filtered.length} virksomhed{filtered.length !== 1 ? 'er' : ''}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={primaryBtnStyle}>
          + Tilføj virksomhed
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <input
          type="text"
          placeholder="Søg efter navn..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, flex: 1 }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{ ...selectStyle, minWidth: 140 }}
        >
          <option value="">Alle typer</option>
          <option value="client">Klient</option>
          <option value="canvas">Canvas</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{ ...selectStyle, minWidth: 140 }}
        >
          <option value="">Alle statusser</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Indlæser...</p>
      ) : filtered.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>Ingen virksomheder fundet.</p>
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
              {filtered.map((company) => (
                <tr
                  key={company.id}
                  onClick={() => navigate(`/kontakter/${company.id}`)}
                  style={{
                    borderBottom: '1px solid #f1f5f9',
                    cursor: 'pointer',
                    transition: 'background-color 0.1s ease',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                >
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600, color: '#0f172a' }}>{company.name}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 20,
                      fontSize: 12,
                      fontWeight: 500,
                      backgroundColor: company.type === 'client' ? '#eef2ff' : '#f8fafc',
                      color: company.type === 'client' ? '#4338ca' : '#64748b',
                      border: company.type === 'client' ? '1px solid #c7d2fe' : '1px solid #e2e8f0',
                    }}>
                      {typeLabels[company.type] || company.type}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 3 }}>
                      {['hot', 'warm', 'cold'].map((st) => {
                        const sc = statusColors[st];
                        const isActive = company.status === st;
                        return (
                          <button
                            key={st}
                            onClick={(e) => updateStatus(e, company.id, st)}
                            style={{
                              padding: '3px 10px',
                              borderRadius: 20,
                              fontSize: 12,
                              fontWeight: 500,
                              border: isActive ? `1px solid ${sc.border}` : '1px solid transparent',
                              cursor: 'pointer',
                              backgroundColor: isActive ? sc.bg : 'transparent',
                              color: isActive ? sc.color : '#cbd5e1',
                              transition: 'all 0.15s ease',
                            }}
                          >
                            {sc.label}
                          </button>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ ...tdStyle, color: '#64748b' }}>{formatDate(company.last_invoice_date)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: '#334155', fontWeight: 500 }}>
                    {formatAmount(company.total_invoiced_dkk)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <CompanyForm
          onClose={() => setShowForm(false)}
          onSaved={() => {
            setShowForm(false);
            fetchCompanies();
          }}
        />
      )}
    </div>
  );
}

const primaryBtnStyle = {
  backgroundColor: '#6366f1',
  color: '#fff',
  border: 'none',
  padding: '9px 18px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
  transition: 'background-color 0.15s ease',
};

const inputStyle = {
  padding: '9px 13px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  backgroundColor: '#fff',
  transition: 'border-color 0.15s ease',
  color: '#0f172a',
};

const selectStyle = {
  padding: '9px 13px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  backgroundColor: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: '#0f172a',
};

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: 10,
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
  border: '1px solid rgba(0,0,0,0.06)',
};

const thStyle = {
  padding: '11px 16px',
  fontSize: 11,
  fontWeight: 600,
  color: '#94a3b8',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  textAlign: 'left',
  borderBottom: '1px solid #f1f5f9',
  backgroundColor: '#fafbfc',
};

const tdStyle = {
  padding: '13px 16px',
  fontSize: 14,
};
