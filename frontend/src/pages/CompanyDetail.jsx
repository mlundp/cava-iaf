import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CompanyForm from '../components/CompanyForm';
import ContactForm from '../components/ContactForm';

const tabs = [
  { key: 'info', label: 'Info' },
  { key: 'kontakter', label: 'Kontakter' },
  { key: 'projekter', label: 'Projekter' },
  { key: 'logbog', label: 'Logbog' },
];

const statusColors = {
  hot: { bg: '#fee2e2', color: '#dc2626' },
  warm: { bg: '#fef3c7', color: '#d97706' },
  cold: { bg: '#dbeafe', color: '#2563eb' },
};

const typeLabels = { client: 'Klient', canvas: 'Canvas' };

const activityLabels = {
  called: 'Ringet',
  emailed: 'Emailet',
  met: 'Møde',
  no_answer: 'Intet svar',
  proposal_sent: 'Tilbud sendt',
  contract_signed: 'Kontrakt underskrevet',
  other: 'Andet',
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
    const load = async () => {
      setLoading(true);
      await fetchCompany();
      setLoading(false);
    };
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

  if (loading) return <p style={{ color: '#888' }}>Indlæser...</p>;
  if (!company) return <p style={{ color: '#888' }}>Virksomhed ikke fundet.</p>;

  const s = statusColors[company.status] || statusColors.warm;

  return (
    <div>
      <button
        onClick={() => navigate('/kontakter')}
        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#888', fontSize: 14, padding: 0, marginBottom: 16 }}
      >
        ← Tilbage til oversigt
      </button>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700 }}>{company.name}</h1>
          <div style={{ display: 'flex', gap: 8, marginTop: 8, alignItems: 'center' }}>
            <span style={{
              padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
              backgroundColor: company.type === 'client' ? '#e0e7ff' : '#f3f4f6',
              color: company.type === 'client' ? '#4338ca' : '#6b7280',
            }}>
              {typeLabels[company.type] || company.type}
            </span>
            <span style={{
              padding: '3px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600,
              backgroundColor: s.bg, color: s.color,
            }}>
              {company.status?.charAt(0).toUpperCase() + company.status?.slice(1)}
            </span>
          </div>
        </div>
        <button
          onClick={() => setShowEditCompany(true)}
          style={{
            backgroundColor: '#1a1a2e', color: '#fff', border: 'none',
            padding: '10px 20px', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600,
          }}
        >
          Rediger
        </button>
      </div>

      <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid #eee', marginBottom: 24 }}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding: '10px 20px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: activeTab === tab.key ? 700 : 400,
              color: activeTab === tab.key ? '#1a1a2e' : '#888',
              borderBottom: activeTab === tab.key ? '2px solid #1a1a2e' : '2px solid transparent',
              marginBottom: -2,
              transition: 'all 0.15s',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ backgroundColor: '#fff', borderRadius: 8, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        {activeTab === 'info' && <InfoTab company={company} />}
        {activeTab === 'kontakter' && (
          <KontakterTab
            contacts={contacts}
            onAdd={() => { setEditingContact(null); setShowContactForm(true); }}
            onEdit={(c) => { setEditingContact(c); setShowContactForm(true); }}
            onDelete={deleteContact}
          />
        )}
        {activeTab === 'projekter' && <ProjekterTab projects={projects} />}
        {activeTab === 'logbog' && <LogbogTab entries={logEntries} />}
      </div>

      {showEditCompany && (
        <CompanyForm
          company={company}
          onClose={() => setShowEditCompany(false)}
          onSaved={() => { setShowEditCompany(false); fetchCompany(); }}
        />
      )}

      {showContactForm && (
        <ContactForm
          companyId={id}
          contact={editingContact}
          onClose={() => { setShowContactForm(false); setEditingContact(null); }}
          onSaved={() => { setShowContactForm(false); setEditingContact(null); fetchContacts(); }}
        />
      )}
    </div>
  );
}

function InfoTab({ company }) {
  const fields = [
    { label: 'CVR-nummer', value: company.cvr_number },
    { label: 'Branche', value: company.industry },
    { label: 'Antal ansatte', value: company.employee_count },
    { label: 'Årlig omsætning', value: company.annual_revenue_cvr ? Number(company.annual_revenue_cvr).toLocaleString('da-DK') + ' kr.' : null },
    { label: 'Adresse', value: company.address },
    { label: 'Ejerskab', value: company.ownership },
    { label: 'Total faktureret', value: company.total_invoiced_dkk ? Number(company.total_invoiced_dkk).toLocaleString('da-DK') + ' kr.' : '0 kr.' },
    { label: 'Sidst faktureret', value: company.last_invoice_date ? new Date(company.last_invoice_date).toLocaleDateString('da-DK') : null },
    { label: 'Dinero kontakt-ID', value: company.dinero_contact_id },
  ];

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        {fields.map((f) => (
          <div key={f.label}>
            <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>{f.label}</div>
            <div style={{ fontSize: 15 }}>{f.value || '—'}</div>
          </div>
        ))}
      </div>
      {company.notes && (
        <div style={{ marginTop: 24 }}>
          <div style={{ fontSize: 12, color: '#888', fontWeight: 600, textTransform: 'uppercase', marginBottom: 4 }}>Noter</div>
          <div style={{ fontSize: 15, whiteSpace: 'pre-wrap' }}>{company.notes}</div>
        </div>
      )}
    </div>
  );
}

function KontakterTab({ contacts, onAdd, onEdit, onDelete }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 16 }}>Kontaktpersoner</h3>
        <button
          onClick={onAdd}
          style={{
            backgroundColor: '#1a1a2e', color: '#fff', border: 'none',
            padding: '8px 16px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600,
          }}
        >
          + Tilføj kontakt
        </button>
      </div>
      {contacts.length === 0 ? (
        <p style={{ color: '#888' }}>Ingen kontaktpersoner endnu.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={detailThStyle}>Navn</th>
              <th style={detailThStyle}>Titel</th>
              <th style={detailThStyle}>Email</th>
              <th style={detailThStyle}>Telefon</th>
              <th style={detailThStyle}>Primær</th>
              <th style={detailThStyle}></th>
            </tr>
          </thead>
          <tbody>
            {contacts.map((c) => (
              <tr key={c.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={detailTdStyle}>{c.name}</td>
                <td style={detailTdStyle}>{c.title || '—'}</td>
                <td style={detailTdStyle}>{c.email ? <a href={`mailto:${c.email}`} style={{ color: '#2563eb' }}>{c.email}</a> : '—'}</td>
                <td style={detailTdStyle}>{c.phone || '—'}</td>
                <td style={detailTdStyle}>{c.is_primary ? 'Ja' : 'Nej'}</td>
                <td style={{ ...detailTdStyle, textAlign: 'right' }}>
                  <button onClick={() => onEdit(c)} style={actionBtnStyle}>Rediger</button>
                  <button onClick={() => onDelete(c.id)} style={{ ...actionBtnStyle, color: '#dc2626', marginLeft: 8 }}>Slet</button>
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
      <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Projekter</h3>
      {projects.length === 0 ? (
        <p style={{ color: '#888' }}>Ingen projekter endnu.</p>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
              <th style={detailThStyle}>Projekt</th>
              <th style={detailThStyle}>Beløb</th>
              <th style={detailThStyle}>Fakturadato</th>
              <th style={detailThStyle}>Beskrivelse</th>
            </tr>
          </thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={detailTdStyle}>{p.name || '—'}</td>
                <td style={detailTdStyle}>{p.amount_dkk ? Number(p.amount_dkk).toLocaleString('da-DK') + ' kr.' : '—'}</td>
                <td style={detailTdStyle}>{p.invoice_date ? new Date(p.invoice_date).toLocaleDateString('da-DK') : '—'}</td>
                <td style={detailTdStyle}>{p.description || '—'}</td>
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
      <h3 style={{ margin: '0 0 16px', fontSize: 16 }}>Aktivitetslog</h3>
      {entries.length === 0 ? (
        <p style={{ color: '#888' }}>Ingen logindlæg endnu.</p>
      ) : (
        <div>
          {entries.map((entry) => (
            <div key={entry.id} style={{ padding: '12px 0', borderBottom: '1px solid #f0f0f0' }}>
              <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 4 }}>
                <span style={{
                  padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                  backgroundColor: '#f3f4f6', color: '#374151',
                }}>
                  {activityLabels[entry.activity_type] || entry.activity_type}
                </span>
                <span style={{ fontSize: 13, color: '#888' }}>
                  {new Date(entry.occurred_at).toLocaleDateString('da-DK')} — {entry.logged_by}
                </span>
                {entry.contacts?.name && (
                  <span style={{ fontSize: 13, color: '#6b7280' }}>→ {entry.contacts.name}</span>
                )}
              </div>
              {entry.notes && <p style={{ margin: '4px 0 0', fontSize: 14, color: '#444' }}>{entry.notes}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const detailThStyle = {
  padding: '10px 12px',
  fontSize: 12,
  fontWeight: 600,
  color: '#888',
  textTransform: 'uppercase',
};

const detailTdStyle = {
  padding: '10px 12px',
  fontSize: 14,
};

const actionBtnStyle = {
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  fontSize: 13,
  color: '#2563eb',
  padding: 0,
};
