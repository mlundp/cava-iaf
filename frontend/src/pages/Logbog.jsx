import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LogEntryForm from '../components/LogEntryForm';

const activityLabels = {
  called: 'Ringet op',
  emailed: 'Sendt mail',
  met: 'Møde',
  no_answer: 'Ingen svar',
  proposal_sent: 'Tilbud sendt',
  contract_signed: 'Aftale indgået',
  other: 'Andet',
};

const activityColors = {
  called: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  emailed: { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' },
  met: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  no_answer: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
  proposal_sent: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  contract_signed: { bg: '#ecfdf5', color: '#047857', border: '#a7f3d0' },
  other: { bg: '#f8fafc', color: '#374151', border: '#e2e8f0' },
};

export default function Logbog() {
  const [entries, setEntries] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [activityFilter, setActivityFilter] = useState('');
  const [companyFilter, setCompanyFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const navigate = useNavigate();

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from('log_entries')
      .select('*, companies(id, name), contacts(name)')
      .order('occurred_at', { ascending: false });
    if (!error) setEntries(data || []);
    setLoading(false);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase
      .from('companies')
      .select('id, name')
      .order('name');
    setCompanies(data || []);
  };

  useEffect(() => {
    fetchEntries();
    fetchCompanies();
  }, []);

  const filtered = entries.filter((e) => {
    if (activityFilter && e.activity_type !== activityFilter) return false;
    if (companyFilter && e.company_id !== companyFilter) return false;
    if (dateFrom) {
      const entryDate = new Date(e.occurred_at).toISOString().slice(0, 10);
      if (entryDate < dateFrom) return false;
    }
    if (dateTo) {
      const entryDate = new Date(e.occurred_at).toISOString().slice(0, 10);
      if (entryDate > dateTo) return false;
    }
    return true;
  });

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })
      + ' kl. ' + d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  };

  const hasFilters = activityFilter || companyFilter || dateFrom || dateTo;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Logbog</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
            {filtered.length} indlæg{filtered.length !== 1 ? '' : ''}
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={primaryBtnStyle}>
          + Log aktivitet
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value)}
          style={selectStyle}
        >
          <option value="">Alle aktiviteter</option>
          {Object.entries(activityLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          style={{ ...selectStyle, minWidth: 180 }}
        >
          <option value="">Alle virksomheder</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Fra</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={dateInputStyle}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>Til</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={dateInputStyle}
          />
        </div>
        {hasFilters && (
          <button
            onClick={() => { setActivityFilter(''); setCompanyFilter(''); setDateFrom(''); setDateTo(''); }}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: '#ef4444', padding: '9px 6px',
              fontFamily: 'inherit', fontWeight: 500,
            }}
          >
            Ryd filtre
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Indlæser...</p>
      ) : filtered.length === 0 ? (
        <div style={{ ...cardStyle, padding: 40, textAlign: 'center' }}>
          <p style={{ color: '#94a3b8', fontSize: 14, margin: 0 }}>Ingen logindlæg fundet.</p>
        </div>
      ) : (
        <div style={cardStyle}>
          {filtered.map((entry, i) => {
            const ac = activityColors[entry.activity_type] || activityColors.other;
            return (
              <div
                key={entry.id}
                style={{
                  padding: '16px 20px',
                  borderBottom: i < filtered.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                        backgroundColor: ac.bg, color: ac.color, border: `1px solid ${ac.border}`,
                      }}>
                        {activityLabels[entry.activity_type] || entry.activity_type}
                      </span>
                      {entry.companies?.name && (
                        <span
                          onClick={() => navigate(`/kontakter/${entry.companies.id}`)}
                          style={{
                            fontSize: 14, fontWeight: 600, color: '#0f172a', cursor: 'pointer',
                            transition: 'color 0.15s ease',
                          }}
                        >
                          {entry.companies.name}
                        </span>
                      )}
                      {entry.contacts?.name && (
                        <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                          → {entry.contacts.name}
                        </span>
                      )}
                    </div>
                    {entry.notes && (
                      <p style={{ margin: '4px 0 0', fontSize: 14, color: '#334155', lineHeight: 1.6 }}>
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 24 }}>
                    <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 500 }}>{formatDateTime(entry.occurred_at)}</div>
                    <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 3 }}>{entry.logged_by}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <LogEntryForm
          onClose={() => setShowForm(false)}
          onSaved={() => { setShowForm(false); fetchEntries(); }}
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

const selectStyle = {
  padding: '9px 13px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  backgroundColor: '#fff',
  cursor: 'pointer',
  fontFamily: 'inherit',
  color: '#0f172a',
  minWidth: 160,
};

const dateInputStyle = {
  padding: '8px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
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
