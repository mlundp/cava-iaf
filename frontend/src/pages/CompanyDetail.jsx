import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CompanyForm from '../components/CompanyForm';
import ContactForm from '../components/ContactForm';
import Skeleton from '../components/Skeleton';
import { activityIcons, IconChat } from '../components/Icons';

const tabs = [
  { key: 'info', label: 'Info' },
  { key: 'kontakter', label: 'Kontakter' },
  { key: 'projekter', label: 'Projekter' },
  { key: 'logbog', label: 'Logbog' },
];

const statusColors = {
  hot: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  warm: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  cold: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
};

const typeStyles = {
  client: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Klient' },
  canvas: { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe', label: 'Canvas' },
};

const activityLabels = {
  called: 'Ringet op', emailed: 'Sendt mail', met: 'M\u00f8de', no_answer: 'Ingen svar',
  proposal_sent: 'Tilbud sendt', contract_signed: 'Aftale indg\u00e5et', other: 'Andet',
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

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('info');
  const [company, setCompany] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [projects, setProjects] = useState([]);
  const [logEntries, setLogEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const fetchCompany = async () => {
    const { data } = await supabase.from('companies').select('*').eq('id', id).single();
    setCompany(data);
  };
  const fetchContacts = async () => {
    const { data } = await supabase.from('contacts').select('*').eq('company_id', id).order('is_primary', { ascending: false });
    setContacts(data || []);
  };
  const fetchProjects = async () => {
    const { data } = await supabase.from('projects').select('*').eq('company_id', id).order('invoice_date', { ascending: false });
    setProjects(data || []);
  };
  const fetchLogEntries = async () => {
    const { data } = await supabase.from('log_entries').select('*, contacts(name)').eq('company_id', id).order('occurred_at', { ascending: false });
    setLogEntries(data || []);
  };

  useEffect(() => {
    const load = async () => { setLoading(true); await fetchCompany(); setLoading(false); };
    load();
  }, [id]);

  useEffect(() => {
    if (!company) return;
    if (activeTab === 'kontakter') fetchContacts();
    else if (activeTab === 'projekter') fetchProjects();
    else if (activeTab === 'logbog') fetchLogEntries();
  }, [activeTab, company]);

  const deleteContact = async (contactId) => {
    await supabase.from('contacts').delete().eq('id', contactId);
    fetchContacts();
  };

  if (loading) return <div style={{ padding: 20 }}><Skeleton rows={8} /></div>;
  if (!company) return <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>Virksomhed ikke fundet.</p>;

  const s = statusColors[company.status] || statusColors.warm;
  const ts = typeStyles[company.type] || typeStyles.canvas;

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 20, fontSize: 13 }}>
        <Link to="/kontakter" style={{ color: 'var(--text-faint)', textDecoration: 'none', fontWeight: 500, transition: 'color 0.15s ease' }}>
          Kontakter
        </Link>
        <span style={{ color: 'var(--text-placeholder)' }}>/</span>
        <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>{company.name}</span>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>{company.name}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, alignItems: 'center' }}>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, backgroundColor: ts.bg, color: ts.color, border: `1px solid ${ts.border}` }}>
              {ts.label}
            </span>
            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, backgroundColor: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
              {company.status?.charAt(0).toUpperCase() + company.status?.slice(1)}
            </span>
          </div>
        </div>
        <button onClick={() => setShowEditCompany(true)} style={secondaryBtnStyle}>Rediger</button>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 24 }}>
        {tabs.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} style={{
            padding: '10px 18px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit',
            fontWeight: activeTab === tab.key ? 600 : 500,
            color: activeTab === tab.key ? 'var(--accent)' : 'var(--text-faint)',
            borderBottom: activeTab === tab.key ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom: -1, transition: 'all 0.15s ease',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      <div style={cardStyle}>
        {activeTab === 'info' && <InfoTab company={company} />}
        {activeTab === 'kontakter' && (
          <KontakterTab contacts={contacts} onAdd={() => { setEditingContact(null); setShowContactForm(true); }} onEdit={(c) => { setEditingContact(c); setShowContactForm(true); }} onDelete={deleteContact} />
        )}
        {activeTab === 'projekter' && <ProjekterTab projects={projects} />}
        {activeTab === 'logbog' && <LogbogTab entries={logEntries} />}
      </div>

      {showEditCompany && <CompanyForm company={company} onClose={() => setShowEditCompany(false)} onSaved={() => { setShowEditCompany(false); fetchCompany(); }} />}
      {showContactForm && <ContactForm companyId={id} contact={editingContact} onClose={() => { setShowContactForm(false); setEditingContact(null); }} onSaved={() => { setShowContactForm(false); setEditingContact(null); fetchContacts(); }} />}
    </div>
  );
}

function InfoTab({ company }) {
  const fields = [
    { label: 'CVR-nummer', value: company.cvr_number },
    { label: 'Branche', value: company.industry },
    { label: 'Antal ansatte', value: company.employee_count },
    { label: '\u00c5rlig oms\u00e6tning', value: company.annual_revenue_cvr ? Number(company.annual_revenue_cvr).toLocaleString('da-DK') + ' kr.' : null },
    { label: 'Adresse', value: company.address },
    { label: 'Ejerskab', value: company.ownership },
    { label: 'Total faktureret', value: company.total_invoiced_dkk ? Number(company.total_invoiced_dkk).toLocaleString('da-DK') + ' kr.' : '0 kr.' },
    { label: 'Sidst faktureret', value: company.last_invoice_date ? new Date(company.last_invoice_date).toLocaleDateString('da-DK') : null },
    { label: 'Dinero kontakt-ID', value: company.dinero_contact_id },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {fields.map((f) => (
          <div key={f.label}>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{f.label}</div>
            <div style={{ fontSize: 14, color: f.value ? 'var(--text)' : 'var(--text-placeholder)', fontWeight: 500 }}>{f.value || '\u2014'}</div>
          </div>
        ))}
      </div>
      {company.notes && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Noter</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{company.notes}</div>
        </div>
      )}
    </div>
  );
}

function KontakterTab({ contacts, onAdd, onEdit, onDelete }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Kontaktpersoner</h3>
        <button onClick={onAdd} style={primaryBtnSmallStyle}>+ Tilf\u00f8j kontakt</button>
      </div>
      {contacts.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>Ingen kontaktpersoner endnu.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th style={detailThStyle}>Navn</th><th style={detailThStyle}>Titel</th><th style={detailThStyle}>Email</th>
              <th style={detailThStyle}>Telefon</th><th style={detailThStyle}>Prim\u00e6r</th><th style={detailThStyle}></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.1s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
              >
                <td style={{ ...detailTdStyle, fontWeight: 600, color: 'var(--text)' }}>{c.name}</td>
                <td style={{ ...detailTdStyle, color: 'var(--text-muted)' }}>{c.title || '\u2014'}</td>
                <td style={detailTdStyle}>{c.email ? <a href={`mailto:${c.email}`} style={{ color: 'var(--accent)', textDecoration: 'none' }}>{c.email}</a> : '\u2014'}</td>
                <td style={{ ...detailTdStyle, color: 'var(--text-muted)' }}>{c.phone || '\u2014'}</td>
                <td style={detailTdStyle}>
                  {c.is_primary
                    ? <span style={{ fontSize: 12, fontWeight: 500, color: '#059669', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: 20, border: '1px solid #a7f3d0' }}>Ja</span>
                    : <span style={{ color: 'var(--text-placeholder)', fontSize: 13 }}>Nej</span>}
                </td>
                <td style={{ ...detailTdStyle, textAlign: 'right' }}>
                  <button onClick={() => onEdit(c)} style={actionBtnStyle}>Rediger</button>
                  <button onClick={() => onDelete(c.id)} style={{ ...actionBtnStyle, color: '#ef4444', marginLeft: 10 }}>Slet</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function ProjekterTab({ projects }) {
  return (
    <div>
      <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Projekter</h3>
      {projects.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>Ingen projekter endnu.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr><th style={detailThStyle}>Projekt</th><th style={detailThStyle}>Bel\u00f8b</th><th style={detailThStyle}>Fakturadato</th><th style={detailThStyle}>Beskrivelse</th></tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.1s ease' }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
              >
                <td style={{ ...detailTdStyle, fontWeight: 600, color: 'var(--text)' }}>{p.name || '\u2014'}</td>
                <td style={{ ...detailTdStyle, fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)', fontWeight: 500 }}>{p.amount_dkk ? Number(p.amount_dkk).toLocaleString('da-DK') + ' kr.' : '\u2014'}</td>
                <td style={{ ...detailTdStyle, color: 'var(--text-muted)' }}>{p.invoice_date ? new Date(p.invoice_date).toLocaleDateString('da-DK') : '\u2014'}</td>
                <td style={{ ...detailTdStyle, color: 'var(--text-muted)' }}>{p.description || '\u2014'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

function LogbogTab({ entries }) {
  return (
    <div>
      <h3 style={{ margin: '0 0 18px', fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Aktivitetslog</h3>
      {entries.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>Ingen logindl\u00e6g endnu.</p>
      ) : (
        <div>
          {entries.map((entry) => {
            const ac = activityColors[entry.activity_type] || activityColors.other;
            const Icon = activityIcons[entry.activity_type] || IconChat;
            return (
              <div key={entry.id} style={{ padding: '14px 0', borderBottom: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 5 }}>
                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, backgroundColor: ac.bg, color: ac.color, border: `1px solid ${ac.border}`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Icon size={13} color={ac.color} />
                    {activityLabels[entry.activity_type] || entry.activity_type}
                  </span>
                  <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>
                    {new Date(entry.occurred_at).toLocaleDateString('da-DK')} \u2014 {entry.logged_by}
                  </span>
                  {entry.contacts?.name && <span style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 500 }}>\u2192 {entry.contacts.name}</span>}
                </div>
                {entry.notes && <p style={{ margin: '4px 0 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{entry.notes}</p>}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const cardStyle = { backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 24, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-card)', transition: 'background-color 0.2s ease' };
const secondaryBtnStyle = { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s ease' };
const primaryBtnSmallStyle = { backgroundColor: 'var(--accent)', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'background-color 0.15s ease' };
const detailThStyle = { padding: '10px 14px', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', borderBottom: '1px solid var(--border-subtle)' };
const detailTdStyle = { padding: '12px 14px', fontSize: 14, color: 'var(--text-secondary)' };
const actionBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--accent)', fontWeight: 500, padding: 0, fontFamily: 'inherit', transition: 'color 0.15s ease' };
