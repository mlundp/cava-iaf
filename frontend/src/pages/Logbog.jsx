import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import LogEntryForm from '../components/LogEntryForm';
import Skeleton from '../components/Skeleton';
import { activityIcons, IconChat, IconLog } from '../components/Icons';

const activityLabels = {
  called: 'Ringet op', emailed: 'Sendt mail', met: 'Møde', no_answer: 'Ingen svar',
  proposal_sent: 'Tilbud sendt', contract_signed: 'Aftale indgået', other: 'Andet',
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
    const { data, error } = await supabase.from('log_entries').select('*, companies(id, name), contacts(name)').order('occurred_at', { ascending: false });
    if (!error) setEntries(data || []);
    setLoading(false);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name').order('name');
    setCompanies(data || []);
  };

  useEffect(() => { fetchEntries(); fetchCompanies(); }, []);

  const filtered = entries.filter((e) => {
    if (activityFilter && e.activity_type !== activityFilter) return false;
    if (companyFilter && e.company_id !== companyFilter) return false;
    if (dateFrom) { const d = new Date(e.occurred_at).toISOString().slice(0, 10); if (d < dateFrom) return false; }
    if (dateTo) { const d = new Date(e.occurred_at).toISOString().slice(0, 10); if (d > dateTo) return false; }
    return true;
  });

  const formatDateTime = (dateStr) => {
    if (!dateStr) return '\u2014';
    const d = new Date(dateStr);
    return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' }) + ' kl. ' + d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  };

  const hasFilters = activityFilter || companyFilter || dateFrom || dateTo;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Logbog</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>{filtered.length} indlæg</p>
        </div>
        <button onClick={() => setShowForm(true)} style={primaryBtnStyle}>+ Log aktivitet</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
        <select value={activityFilter} onChange={(e) => setActivityFilter(e.target.value)} style={selectStyle}>
          <option value="">Alle aktiviteter</option>
          {Object.entries(activityLabels).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </select>
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} style={{ ...selectStyle, minWidth: 180 }}>
          <option value="">Alle virksomheder</option>
          {companies.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 500 }}>Fra</span>
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} style={dateInputStyle} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 500 }}>Til</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} style={dateInputStyle} />
        </div>
        {hasFilters && (
          <button onClick={() => { setActivityFilter(''); setCompanyFilter(''); setDateFrom(''); setDateTo(''); }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, color: '#ef4444', padding: '9px 6px', fontFamily: 'inherit', fontWeight: 500 }}>
            Ryd filtre
          </button>
        )}
      </div>

      {loading ? (
        <div style={cardStyle}><div style={{ padding: 20 }}><Skeleton rows={6} /></div></div>
      ) : filtered.length === 0 ? (
        <div style={{ ...cardStyle, padding: 48, textAlign: 'center' }}>
          <div style={{ marginBottom: 12, color: 'var(--text-faint)' }}><IconLog size={32} /></div>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: 0, fontWeight: 500 }}>
            Ingen aktiviteter {hasFilters ? 'fundet' : 'endnu'}.
          </p>
          {!hasFilters && <p style={{ color: 'var(--text-faint)', fontSize: 13, margin: '6px 0 0' }}>Log din første aktivitet for at komme i gang.</p>}
        </div>
      ) : (
        <div style={cardStyle}>
          {filtered.map((entry, i) => {
            const ac = activityColors[entry.activity_type] || activityColors.other;
            const Icon = activityIcons[entry.activity_type] || IconChat;
            return (
              <div key={entry.id} onClick={() => { if (entry.company_id) navigate(`/kontakter/${entry.company_id}?tab=opslagstavlen&entry=${entry.id}`); }} style={{ padding: '16px 20px', borderBottom: i < filtered.length - 1 ? '1px solid var(--border-subtle)' : 'none', transition: 'background-color 0.1s ease', cursor: 'pointer' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, backgroundColor: ac.bg, color: ac.color, border: `1px solid ${ac.border}`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                        <Icon size={13} color={ac.color} />
                        {activityLabels[entry.activity_type] || entry.activity_type}
                      </span>
                      {entry.companies?.name && (
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                          {entry.companies.name}
                        </span>
                      )}
                      {entry.contacts?.name && <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>\u2192 {entry.contacts.name}</span>}
                    </div>
                    {entry.notes && <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{entry.notes}</p>}
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, marginLeft: 24 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 500 }}>{formatDateTime(entry.occurred_at)}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-placeholder)', marginTop: 3 }}>{entry.logged_by}</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && <LogEntryForm onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchEntries(); }} />}
    </div>
  );
}

const primaryBtnStyle = { backgroundColor: 'var(--accent)', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'background-color 0.15s ease' };
const selectStyle = { padding: '9px 13px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, backgroundColor: 'var(--bg-input)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)', minWidth: 160 };
const dateInputStyle = { padding: '8px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', backgroundColor: 'var(--bg-input)' };
const cardStyle = { backgroundColor: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-card)', transition: 'background-color 0.2s ease' };
