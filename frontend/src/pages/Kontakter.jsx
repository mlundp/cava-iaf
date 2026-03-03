import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CompanyForm from '../components/CompanyForm';

const statusColors = {
  hot: { bg: '#fee2e2', color: '#dc2626', label: 'Hot' },
  warm: { bg: '#fef3c7', color: '#d97706', label: 'Warm' },
  cold: { bg: '#dbeafe', color: '#2563eb', label: 'Cold' },
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Kontakter</h1>
        <button
          onClick={() => setShowForm(true)}
          style={{
            backgroundColor: '#1a1a2e',
            color: '#fff',
            border: 'none',
            padding: '10px 20px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          + Tilføj virksomhed
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <input
          type="text"
          placeholder="Søg efter navn..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '10px 14px',
            border: '1px solid #ddd',
            borderRadius: 6,
            fontSize: 14,
            outline: 'none',
          }}
        />
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            border: '1px solid #ddd',
            borderRadius: 6,
            fontSize: 14,
            backgroundColor: '#fff',
            cursor: 'pointer',
            minWidth: 140,
          }}
        >
          <option value="">Alle typer</option>
          <option value="client">Klient</option>
          <option value="canvas">Canvas</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          style={{
            padding: '10px 14px',
            border: '1px solid #ddd',
            borderRadius: 6,
            fontSize: 14,
            backgroundColor: '#fff',
            cursor: 'pointer',
            minWidth: 140,
          }}
        >
          <option value="">Alle statusser</option>
          <option value="hot">Hot</option>
          <option value="warm">Warm</option>
          <option value="cold">Cold</option>
        </select>
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>Indlæser...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#888' }}>Ingen virksomheder fundet.</p>
      ) : (
        <div style={{ backgroundColor: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
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
                    borderBottom: '1px solid #f0f0f0',
                    cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafafa')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                >
                  <td style={tdStyle}>
                    <span style={{ fontWeight: 600 }}>{company.name}</span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '3px 10px',
                      borderRadius: 12,
                      fontSize: 12,
                      fontWeight: 600,
                      backgroundColor: company.type === 'client' ? '#e0e7ff' : '#f3f4f6',
                      color: company.type === 'client' ? '#4338ca' : '#6b7280',
                    }}>
                      {typeLabels[company.type] || company.type}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <div style={{ display: 'flex', gap: 4 }}>
                      {['hot', 'warm', 'cold'].map((st) => (
                        <button
                          key={st}
                          onClick={(e) => updateStatus(e, company.id, st)}
                          style={{
                            padding: '3px 10px',
                            borderRadius: 12,
                            fontSize: 12,
                            fontWeight: 600,
                            border: 'none',
                            cursor: 'pointer',
                            backgroundColor: company.status === st ? statusColors[st].bg : 'transparent',
                            color: company.status === st ? statusColors[st].color : '#ccc',
                            transition: 'all 0.15s',
                          }}
                        >
                          {statusColors[st].label}
                        </button>
                      ))}
                    </div>
                  </td>
                  <td style={tdStyle}>{formatDate(company.last_invoice_date)}</td>
                  <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
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

const thStyle = {
  padding: '12px 16px',
  fontSize: 13,
  fontWeight: 600,
  color: '#888',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
};

const tdStyle = {
  padding: '12px 16px',
  fontSize: 14,
};
