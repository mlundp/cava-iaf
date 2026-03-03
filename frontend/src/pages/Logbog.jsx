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
  called: { bg: '#dbeafe', color: '#2563eb' },
  emailed: { bg: '#e0e7ff', color: '#4338ca' },
  met: { bg: '#d1fae5', color: '#059669' },
  no_answer: { bg: '#f3f4f6', color: '#6b7280' },
  proposal_sent: { bg: '#fef3c7', color: '#d97706' },
  contract_signed: { bg: '#d1fae5', color: '#047857' },
  other: { bg: '#f3f4f6', color: '#374151' },
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

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>Logbog</h1>
        <button
          onClick={() => setShowForm(true)}
          style={{
            backgroundColor: '#1a1a2e', color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}
        >
          + Log aktivitet
        </button>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <select
          value={activityFilter}
          onChange={(e) => setActivityFilter(e.target.value)}
          style={filterSelectStyle}
        >
          <option value="">Alle aktiviteter</option>
          {Object.entries(activityLabels).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={companyFilter}
          onChange={(e) => setCompanyFilter(e.target.value)}
          style={{ ...filterSelectStyle, minWidth: 180 }}
        >
          <option value="">Alle virksomheder</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#888' }}>Fra</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            style={dateInputStyle}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 13, color: '#888' }}>Til</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            style={dateInputStyle}
          />
        </div>
        {(activityFilter || companyFilter || dateFrom || dateTo) && (
          <button
            onClick={() => { setActivityFilter(''); setCompanyFilter(''); setDateFrom(''); setDateTo(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#dc2626', padding: '10px 8px' }}
          >
            Ryd filtre
          </button>
        )}
      </div>

      {loading ? (
        <p style={{ color: '#888' }}>Indlæser...</p>
      ) : filtered.length === 0 ? (
        <p style={{ color: '#888' }}>Ingen logindlæg fundet.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          {filtered.map((entry) => {
            const ac = activityColors[entry.activity_type] || activityColors.other;
            return (
              <div
                key={entry.id}
                style={{
                  backgroundColor: '#fff',
                  padding: '16px 20px',
                  borderBottom: '1px solid #f0f0f0',
                  borderRadius: 0,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{
                        padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
                        backgroundColor: ac.bg, color: ac.color,
                      }}>
                        {activityLabels[entry.activity_type] || entry.activity_type}
                      </span>
                      {entry.companies?.name && (
                        <span
                          onClick={() => navigate(`/kontakter/${entry.companies.id}`)}
                          style={{ fontSize: 14, fontWeight: 600, color: '#1a1a2e', cursor: 'pointer' }}
                        >
                          {entry.companies.name}
                        </span>
                      )}
                      {entry.contacts?.name && (
                        <span style={{ fontSize: 13, color: '#6b7280' }}>
                          → {entry.contacts.name}
                        </span>
                      )}
                    </div>
                    {entry.notes && (
                      <p style={{ margin: '4px 0 0', fontSize: 14, color: '#444', lineHeight: 1.5 }}>
                        {entry.notes}
                      </p>
                    )}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 20 }}>
                    <div style={{ fontSize: 13, color: '#888' }}>{formatDateTime(entry.occurred_at)}</div>
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>{entry.logged_by}</div>
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

const filterSelectStyle = {
  padding: '10px 14px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
  backgroundColor: '#fff',
  cursor: 'pointer',
  minWidth: 160,
};

const dateInputStyle = {
  padding: '9px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
};
