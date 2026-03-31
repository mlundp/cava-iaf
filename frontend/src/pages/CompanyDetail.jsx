import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import CompanyForm from '../components/CompanyForm';
import ContactForm from '../components/ContactForm';
import Skeleton from '../components/Skeleton';
import { activityIcons, IconChat, IconPin, IconTrash, IconPaperclip } from '../components/Icons';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const tabs = [
  { key: 'info', label: 'Info' },
  { key: 'kontakter', label: 'Kontakter' },
  { key: 'projekter', label: 'Projekter' },
  { key: 'opslagstavlen', label: 'Opslagstavlen' },
];

const statusColors = {
  hot: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca' },
  warm: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  cold: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
};

const typeStyles = {
  client: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Kunde' },
  canvas: { bg: '#faf5ff', color: '#7c3aed', border: '#ddd6fe', label: 'Canvas' },
  former_client: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0', label: 'Tidl. kunde' },
};

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

export default function CompanyDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');
  const entryParam = searchParams.get('entry');
  const [activeTab, setActiveTab] = useState(tabs.some((t) => t.key === tabParam) ? tabParam : 'info');
  const [company, setCompany] = useState(null);
  const [contacts, setContacts] = useState([]);
  const [logEntries, setLogEntries] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEditCompany, setShowEditCompany] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState(null);

  const fetchCompany = async () => {
    const { data } = await supabase.from('companies').select('*').eq('id', id).single();
    setCompany(data);
  };
  const fetchContacts = async () => {
    let { data } = await supabase.from('contacts').select('*').eq('company_id', id).order('is_primary', { ascending: false }).order('sort_order', { ascending: true });
    if (!data) {
      // Fallback if sort_order column doesn't exist yet (migration not applied)
      ({ data } = await supabase.from('contacts').select('*').eq('company_id', id).order('is_primary', { ascending: false }));
    }
    setContacts(data || []);
  };
  const fetchLogEntries = async () => {
    try {
      const res = await fetch(`${API_URL}/api/companies/${id}/log`);
      const json = await res.json();
      setLogEntries(json.entries || []);
    } catch {
      setLogEntries([]);
    }
  };
  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects/company/${id}`);
      const json = await res.json();
      setProjects(json.projects || []);
    } catch {
      setProjects([]);
    }
  };

  useEffect(() => {
    const load = async () => { setLoading(true); await fetchCompany(); setLoading(false); };
    load();
  }, [id]);

  useEffect(() => {
    if (!company) return;
    if (activeTab === 'kontakter') fetchContacts();
    else if (activeTab === 'projekter') fetchProjects();
    else if (activeTab === 'opslagstavlen') fetchLogEntries();
  }, [activeTab, company]);

  const deleteContact = async (contactId) => {
    await supabase.from('contacts').delete().eq('id', contactId);
    fetchContacts();
  };

  const deleteCompany = async () => {
    if (!window.confirm('Er du sikker på, at du vil slette denne virksomhed? Dette kan ikke fortrydes.')) return;
    const { error } = await supabase.from('companies').delete().eq('id', id);
    if (error) {
      console.error('Kunne ikke slette virksomhed:', error.message);
      return;
    }
    navigate('/kontakter');
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
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowEditCompany(true)} style={secondaryBtnStyle}>Rediger</button>
          <button onClick={deleteCompany} style={deleteBtnStyle}>Slet</button>
        </div>
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
        {activeTab === 'info' && <InfoTab company={company} onCompanyUpdated={fetchCompany} />}
        {activeTab === 'kontakter' && (
          <KontakterTab contacts={contacts} company={company} onAdd={() => { setEditingContact(null); setShowContactForm(true); }} onDelete={deleteContact} onPrefill={(prefill) => { setEditingContact(prefill); setShowContactForm(true); }} onRefresh={fetchContacts} />
        )}
        {activeTab === 'projekter' && <ProjekterTab companyId={id} projects={projects} onRefresh={fetchProjects} />}
        {activeTab === 'opslagstavlen' && <OpslagstavlenTab companyId={id} entries={logEntries} onRefresh={fetchLogEntries} highlightEntryId={entryParam} />}
      </div>

      {showEditCompany && <CompanyForm company={company} onClose={() => setShowEditCompany(false)} onSaved={() => { setShowEditCompany(false); fetchCompany(); }} />}
      {showContactForm && <ContactForm companyId={id} contact={editingContact} onClose={() => { setShowContactForm(false); setEditingContact(null); }} onSaved={() => { setShowContactForm(false); setEditingContact(null); fetchContacts(); }} />}
    </div>
  );
}

function InfoTab({ company, onCompanyUpdated }) {
  const [syncing, setSyncing] = useState(false);
  const [syncMsg, setSyncMsg] = useState(null);

  const syncInvoices = async () => {
    setSyncing(true);
    setSyncMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/dinero/sync-invoices/${company.dinero_contact_id}`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Ukendt fejl');
      setSyncMsg('Opdateret');
      onCompanyUpdated();
    } catch (err) {
      setSyncMsg(`Fejl: ${err.message}`);
    } finally {
      setSyncing(false);
    }
  };

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
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {fields.map((f) => (
          <div key={f.label}>
            <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>{f.label}</div>
            <div style={{ fontSize: 14, color: f.value ? 'var(--text)' : 'var(--text-placeholder)', fontWeight: 500 }}>{f.value || '\u2014'}</div>
          </div>
        ))}
      </div>
      {company.dinero_contact_id && (
        <div style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={syncInvoices} disabled={syncing} style={{ ...secondaryBtnStyle, opacity: syncing ? 0.6 : 1 }}>
            {syncing ? 'Synkroniserer...' : 'Synkroniser fakturaer'}
          </button>
          {syncMsg && <span style={{ fontSize: 13, color: syncMsg.startsWith('Fejl') ? '#dc2626' : '#059669', fontWeight: 500 }}>{syncMsg}</span>}
        </div>
      )}
      {company.notes && (
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
          <div style={{ fontSize: 12, color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 5 }}>Noter</div>
          <div style={{ fontSize: 14, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{company.notes}</div>
        </div>
      )}
    </div>
  );
}

function SortableContactCard({ contact, editingId, editForm, saving, onStartEdit, onCancelEdit, onSaveEdit, onEditChange, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: contact.id });
  const style = {
    ...contactCardStyle,
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  const c = contact;

  return (
    <div ref={setNodeRef} style={style}>
      <div style={{ display: 'flex', gap: 12 }}>
        <div {...attributes} {...listeners} style={dragHandleStyle} title="Træk for at ændre rækkefølge">&#x2807;</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingId === c.id ? (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <label style={contactEditLabelStyle}>Navn *<input name="name" value={editForm.name} onChange={onEditChange} style={contactEditInputStyle} /></label>
                <label style={contactEditLabelStyle}>Titel<input name="title" value={editForm.title} onChange={onEditChange} style={contactEditInputStyle} /></label>
                <label style={contactEditLabelStyle}>Email<input name="email" type="email" value={editForm.email} onChange={onEditChange} style={contactEditInputStyle} /></label>
                <label style={contactEditLabelStyle}>Telefon<input name="phone" value={editForm.phone} onChange={onEditChange} style={contactEditInputStyle} /></label>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 13, cursor: 'pointer', color: 'var(--text-secondary)', fontWeight: 500 }}>
                <input name="is_primary" type="checkbox" checked={editForm.is_primary} onChange={onEditChange} style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }} />
                Primær kontakt
              </label>
              <label style={{ ...contactEditLabelStyle, marginTop: 14 }}>Noter
                <textarea name="notes" value={editForm.notes} onChange={onEditChange} rows={2} style={{ ...contactEditInputStyle, resize: 'vertical' }} />
              </label>
              <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
                <button onClick={onCancelEdit} style={{ ...secondaryBtnStyle, padding: '6px 14px', fontSize: 12 }}>Annuller</button>
                <button onClick={() => onSaveEdit(c.id)} disabled={saving} style={{ ...primaryBtnSmallStyle, opacity: saving ? 0.7 : 1 }}>{saving ? 'Gemmer...' : 'Gem'}</button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
                  {c.title && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.title}</span>}
                  {c.is_primary && (
                    <span style={{ fontSize: 11, fontWeight: 500, color: '#059669', backgroundColor: '#ecfdf5', padding: '2px 8px', borderRadius: 20, border: '1px solid #a7f3d0' }}>Primær</span>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button onClick={() => onStartEdit(c)} style={actionBtnStyle}>Rediger</button>
                  <button onClick={() => onDelete(c.id)} style={{ ...actionBtnStyle, color: '#ef4444' }}>Slet</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 20, marginTop: 8 }}>
                {c.email && (
                  <a href={`mailto:${c.email}`} style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none' }}>{c.email}</a>
                )}
                {c.phone && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{c.phone}</span>}
              </div>
              {c.notes && <div style={{ marginTop: 6, fontSize: 13, color: 'var(--text-faint)', lineHeight: 1.4 }}>{c.notes}</div>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function KontakterTab({ contacts, company, onAdd, onDelete, onPrefill, onRefresh }) {
  const [fetchingDinero, setFetchingDinero] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [orderedContacts, setOrderedContacts] = useState(contacts);

  useEffect(() => { setOrderedContacts(contacts); }, [contacts]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const fetchFromDinero = async () => {
    setFetchingDinero(true);
    try {
      const res = await fetch(`${API_URL}/api/dinero/contacts/${company.dinero_contact_id}`);
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Ukendt fejl');
      onPrefill({ name: data.Name || '', email: data.Email || '', phone: data.Phone || '', _prefill: true });
    } catch (err) {
      alert(`Kunne ikke hente kontakt: ${err.message}`);
    } finally {
      setFetchingDinero(false);
    }
  };

  const startEdit = (c) => {
    setEditingId(c.id);
    setEditForm({ name: c.name || '', title: c.title || '', email: c.email || '', phone: c.phone || '', is_primary: c.is_primary || false, notes: c.notes || '' });
  };

  const cancelEdit = () => { setEditingId(null); setEditForm({}); };

  const saveEdit = async (contactId) => {
    if (!editForm.name.trim()) return;
    setSaving(true);
    const payload = { name: editForm.name.trim(), title: editForm.title.trim() || null, email: editForm.email.trim() || null, phone: editForm.phone.trim() || null, is_primary: editForm.is_primary, notes: editForm.notes.trim() || null };
    await supabase.from('contacts').update(payload).eq('id', contactId);
    setSaving(false);
    setEditingId(null);
    onRefresh();
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = orderedContacts.findIndex((c) => c.id === active.id);
    const newIndex = orderedContacts.findIndex((c) => c.id === over.id);
    const reordered = arrayMove(orderedContacts, oldIndex, newIndex);

    // Ensure primary contacts stay first: move all primary to the top
    const primary = reordered.filter((c) => c.is_primary);
    const nonPrimary = reordered.filter((c) => !c.is_primary);
    const final = [...primary, ...nonPrimary];

    setOrderedContacts(final);

    // Persist sort_order to Supabase
    const updates = final.map((c, i) => supabase.from('contacts').update({ sort_order: i }).eq('id', c.id));
    await Promise.all(updates);
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Kontaktpersoner</h3>
        <div style={{ display: 'flex', gap: 8 }}>
          {company?.dinero_contact_id && (
            <button onClick={fetchFromDinero} disabled={fetchingDinero} style={{ ...secondaryBtnStyle, opacity: fetchingDinero ? 0.6 : 1, padding: '7px 14px', fontSize: 13 }}>
              {fetchingDinero ? 'Henter...' : 'Hent fra Dinero'}
            </button>
          )}
          <button onClick={onAdd} style={primaryBtnSmallStyle}>+ Tilføj kontakt</button>
        </div>
      </div>
      {orderedContacts.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>Ingen kontaktpersoner endnu.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={orderedContacts.map((c) => c.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {orderedContacts.map((c) => (
                <SortableContactCard
                  key={c.id}
                  contact={c}
                  editingId={editingId}
                  editForm={editForm}
                  saving={saving}
                  onStartEdit={startEdit}
                  onCancelEdit={cancelEdit}
                  onSaveEdit={saveEdit}
                  onEditChange={handleEditChange}
                  onDelete={onDelete}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}

const activityTypeOptions = [
  { value: 'met', label: 'Møde' },
  { value: 'called', label: 'Opkald' },
  { value: 'emailed', label: 'Email' },
  { value: 'no_answer', label: 'Intet svar' },
  { value: 'proposal_sent', label: 'Tilbud sendt' },
  { value: 'contract_signed', label: 'Kontrakt underskrevet' },
  { value: 'other', label: 'Andet' },
];

function LogEntryForm({ companyId, initial, onDone, onCancel }) {
  const [form, setForm] = useState({
    activity_type: initial?.activity_type || 'other',
    notes: initial?.notes || '',
    occurred_at: initial?.occurred_at ? initial.occurred_at.slice(0, 10) : new Date().toISOString().slice(0, 10),
  });
  const [files, setFiles] = useState([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isEdit = !!initial?.id;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    let attachments = initial?.attachments || [];
    if (files.length > 0) {
      setUploading(true);
      console.log('[LogEntry] Files selected for upload:', files.map(f => f.name));
      for (const file of files) {
        const path = `${companyId}/${Date.now()}-${file.name}`;
        console.log('[LogEntry] Uploading file:', file.name, 'to path:', path);
        const { data: uploadData, error: uploadError } = await supabase.storage.from('attachments').upload(path, file);
        console.log('[LogEntry] Upload result:', { uploadData, uploadError: uploadError?.message });
        if (uploadError) {
          console.error('[LogEntry] Upload failed for', file.name, ':', uploadError.message);
          alert(`Upload fejl for ${file.name}: ${uploadError.message}`);
          continue;
        }
        const { data: urlData } = supabase.storage.from('attachments').getPublicUrl(path);
        console.log('[LogEntry] Public URL:', urlData.publicUrl);
        attachments = [...attachments, { url: urlData.publicUrl, filename: file.name }];
      }
      setUploading(false);
    }

    console.log('[LogEntry] Final payload attachments:', attachments);

    try {
      if (isEdit) {
        const res = await fetch(`${API_URL}/api/companies/${companyId}/log/${initial.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activity_type: form.activity_type, notes: form.notes.trim() || null, occurred_at: new Date().toISOString(), attachments }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Ukendt fejl');
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        const res = await fetch(`${API_URL}/api/companies/${companyId}/log`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ activity_type: form.activity_type, notes: form.notes.trim() || null, occurred_at: form.occurred_at, attachments, logged_by: user?.email || null }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.error || 'Ukendt fejl');
      }
      onDone();
    } catch (err) {
      alert(`Fejl: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ ...logCardStyle, marginBottom: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <label style={contactEditLabelStyle}>
          Type
          <select value={form.activity_type} onChange={(e) => setForm((p) => ({ ...p, activity_type: e.target.value }))} style={contactEditInputStyle}>
            {activityTypeOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </label>
        <label style={contactEditLabelStyle}>
          Dato
          <input type="date" value={form.occurred_at} onChange={(e) => setForm((p) => ({ ...p, occurred_at: e.target.value }))} style={contactEditInputStyle} />
        </label>
      </div>
      <label style={{ ...contactEditLabelStyle, marginTop: 14 }}>
        Noter
        <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} style={{ ...contactEditInputStyle, resize: 'vertical' }} />
      </label>
      <label style={{ ...contactEditLabelStyle, marginTop: 14 }}>
        Vedhæftninger
        <input type="file" multiple onChange={(e) => setFiles(Array.from(e.target.files))} style={{ fontSize: 13, color: 'var(--text-secondary)' }} />
      </label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button type="button" onClick={onCancel} style={{ ...secondaryBtnStyle, padding: '6px 14px', fontSize: 12 }}>Annuller</button>
        <button type="submit" disabled={saving || uploading} style={{ ...primaryBtnSmallStyle, opacity: (saving || uploading) ? 0.7 : 1 }}>
          {uploading ? 'Uploader...' : saving ? 'Gemmer...' : isEdit ? 'Gem' : 'Opret'}
        </button>
      </div>
    </form>
  );
}

function LogEntryModal({ entry, companyId, onClose, onRefresh }) {
  const [editing, setEditing] = useState(false);
  const ac = activityColors[entry.activity_type] || activityColors.other;
  const Icon = activityIcons[entry.activity_type] || IconChat;
  const atts = entry.attachments || [];

  const isImage = (filename) => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(filename);

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={logModalStyle} onClick={(e) => e.stopPropagation()}>
        {editing ? (
          <LogEntryForm companyId={companyId} initial={entry} onDone={() => { setEditing(false); onRefresh(); onClose(); }} onCancel={() => { setEditing(false); onClose(); }} />
        ) : (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 13, fontWeight: 500, backgroundColor: ac.bg, color: ac.color, border: `1px solid ${ac.border}`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                  <Icon size={14} color={ac.color} />
                  {activityLabels[entry.activity_type] || entry.activity_type}
                </span>
                {entry.pinned && <IconPin size={14} color="var(--accent)" />}
              </div>
              <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-faint)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Dato</div>
                <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{new Date(entry.occurred_at).toLocaleDateString('da-DK')}</div>
              </div>
              {entry.logged_by && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Logget af</div>
                  <div style={{ fontSize: 14, color: 'var(--text)', fontWeight: 500 }}>{entry.logged_by}</div>
                </div>
              )}
            </div>

            {entry.notes && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Noter</div>
                <p style={{ margin: 0, fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{entry.notes}</p>
              </div>
            )}

            {atts.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Vedhæftninger</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {atts.map((att, i) => (
                    <div key={i}>
                      {isImage(att.filename) && (
                        <a href={att.url} target="_blank" rel="noopener noreferrer">
                          <img src={att.url} alt={att.filename} style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid var(--border-subtle)', marginBottom: 4, display: 'block' }} />
                        </a>
                      )}
                      <a href={att.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 13, color: 'var(--accent)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <IconPaperclip size={13} color="var(--accent)" />
                        {att.filename}
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: 16, borderTop: '1px solid var(--border-subtle)' }}>
              <button onClick={() => setEditing(true)} style={{ ...secondaryBtnStyle, padding: '7px 16px', fontSize: 13 }}>Rediger</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function OpslagstavlenTab({ companyId, entries, onRefresh, highlightEntryId }) {
  const [showForm, setShowForm] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [highlightedId, setHighlightedId] = useState(highlightEntryId || null);

  // Auto-open modal for the highlighted entry once entries load
  useEffect(() => {
    if (highlightEntryId && entries.length > 0 && !selectedEntry) {
      const target = entries.find((e) => e.id === highlightEntryId);
      if (target) {
        setSelectedEntry(target);
        // Scroll to the entry card
        setTimeout(() => {
          const el = document.getElementById(`log-entry-${highlightEntryId}`);
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
        // Fade out highlight after 2 seconds
        setTimeout(() => setHighlightedId(null), 2000);
      }
    }
  }, [highlightEntryId, entries]);

  const deleteEntry = async (e, entryId) => {
    e.stopPropagation();
    if (!window.confirm('Slet denne note?')) return;
    try {
      const res = await fetch(`${API_URL}/api/companies/${companyId}/log/${entryId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Ukendt fejl');
      onRefresh();
    } catch (err) {
      alert(`Fejl: ${err.message}`);
    }
  };

  const togglePin = async (e, entry) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_URL}/api/companies/${companyId}/log/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pinned: !entry.pinned }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Ukendt fejl');
      onRefresh();
    } catch (err) {
      alert(`Fejl: ${err.message}`);
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Opslagstavlen</h3>
        <button onClick={() => setShowForm(!showForm)} style={primaryBtnSmallStyle}>
          {showForm ? 'Annuller' : '+ Ny note'}
        </button>
      </div>

      {showForm && (
        <LogEntryForm companyId={companyId} onDone={() => { setShowForm(false); onRefresh(); }} onCancel={() => setShowForm(false)} />
      )}

      {entries.length === 0 ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>Ingen noter endnu.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {entries.map((entry) => {
            const ac = activityColors[entry.activity_type] || activityColors.other;
            const Icon = activityIcons[entry.activity_type] || IconChat;
            const atts = entry.attachments || [];

            return (
              <div key={entry.id} id={`log-entry-${entry.id}`} onClick={() => setSelectedEntry(entry)} style={{ ...logCardStyle, cursor: 'pointer', transition: 'box-shadow 0.15s ease, border-color 0.15s ease, background-color 0.5s ease', ...(highlightedId === entry.id ? { borderColor: 'var(--accent)', boxShadow: '0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent)' } : {}) }} onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)'; }} onMouseLeave={(e) => { e.currentTarget.style.boxShadow = highlightedId === entry.id ? '0 0 0 2px color-mix(in srgb, var(--accent) 25%, transparent)' : '0 1px 3px rgba(0,0,0,0.06)'; }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
                    {entry.pinned && <IconPin size={14} color="var(--accent)" />}
                    <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, backgroundColor: ac.bg, color: ac.color, border: `1px solid ${ac.border}`, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                      <Icon size={13} color={ac.color} />
                      {activityLabels[entry.activity_type] || entry.activity_type}
                    </span>
                    <span style={{ fontSize: 13, color: 'var(--text-faint)' }}>
                      {new Date(entry.occurred_at).toLocaleDateString('da-DK')}
                    </span>
                    {entry.logged_by && <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{entry.logged_by}</span>}
                    {atts.length > 0 && (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', display: 'inline-flex', alignItems: 'center', gap: 3 }}>
                        <IconPaperclip size={12} color="var(--text-muted)" /> {atts.length}
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
                    <button onClick={(e) => togglePin(e, entry)} style={{ ...logIconBtnStyle, color: entry.pinned ? 'var(--accent)' : 'var(--text-placeholder)' }} title={entry.pinned ? 'Fjern fastgørelse' : 'Fastgør'}>
                      <IconPin size={14} />
                    </button>
                    <button onClick={(e) => deleteEntry(e, entry.id)} style={{ ...logIconBtnStyle, color: '#ef4444' }} title="Slet">
                      <IconTrash size={14} />
                    </button>
                  </div>
                </div>
                {entry.notes && <p style={{ margin: '6px 0 0', fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.5, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{entry.notes}</p>}
              </div>
            );
          })}
        </div>
      )}

      {selectedEntry && (
        <LogEntryModal entry={selectedEntry} companyId={companyId} onClose={() => setSelectedEntry(null)} onRefresh={onRefresh} />
      )}
    </div>
  );
}

const projectStatusLabels = { planlagt: 'Planlagt', tilbud: 'Tilbud', igangværende: 'Igangværende', afsluttet: 'Afsluttet' };
const projectStatusStyles = {
  planlagt: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  tilbud: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  igangværende: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  afsluttet: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
};

function ProjekterTab({ companyId, projects, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [editingProject, setEditingProject] = useState(null);
  const [syncingId, setSyncingId] = useState(null);
  const [syncResult, setSyncResult] = useState({});

  const deleteProject = async (projectId) => {
    if (!window.confirm('Slet dette projekt?')) return;
    try {
      const res = await fetch(`${API_URL}/api/projects/${projectId}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Ukendt fejl');
      onRefresh();
    } catch (err) {
      alert(`Fejl: ${err.message}`);
    }
  };

  const syncDinero = async (project) => {
    setSyncingId(project.id);
    try {
      const res = await fetch(`${API_URL}/api/projects/${project.id}/sync-dinero`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Ukendt fejl');
      setSyncResult((prev) => ({ ...prev, [project.id]: { status: data.status, amount: data.amount } }));
    } catch (err) {
      alert(`Fejl: ${err.message}`);
    } finally {
      setSyncingId(null);
    }
  };

  const formatDate = (d) => !d ? '\u2014' : new Date(d).toLocaleDateString('da-DK');
  const formatAmount = (a) => a == null || a === '' ? '\u2014' : Number(a).toLocaleString('da-DK') + ' kr.';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>Projekter</h3>
        <button onClick={() => { setEditingProject(null); setShowForm(true); }} style={primaryBtnSmallStyle}>+ Nyt projekt</button>
      </div>

      {showForm && (
        <ProjectInlineForm companyId={companyId} initial={null} onDone={() => { setShowForm(false); onRefresh(); }} onCancel={() => setShowForm(false)} />
      )}

      {projects.length === 0 && !showForm ? (
        <p style={{ color: 'var(--text-faint)', fontSize: 14 }}>Ingen projekter endnu.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {projects.map((p) => {
            const ss = projectStatusStyles[p.status] || projectStatusStyles.planlagt;
            const sr = syncResult[p.id];
            const brutto = (Number(p.amount_dkk) || 0) - (Number(p.cost_dkk) || 0);
            const sale = Number(p.amount_dkk) || 0;
            const daekning = sale > 0 ? Math.round(brutto / sale * 100) : null;

            if (editingProject === p.id) {
              return <ProjectInlineForm key={p.id} companyId={companyId} initial={p} onDone={() => { setEditingProject(null); onRefresh(); }} onCancel={() => setEditingProject(null)} />;
            }

            return (
              <div key={p.id} style={projectCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{p.project_number}</span>
                      <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>{p.name}</span>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, backgroundColor: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                        {projectStatusLabels[p.status] || p.status}
                      </span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap' }}>
                      {p.start_date && <span>Projekt start: {cdFormatMonthYear(p.start_date)}</span>}
                      {p.deadline && <span>Projekt slut: {cdFormatMonthYear(p.deadline)}</span>}
                      {p.booking_year && <span>Bogføring: {p.booking_year}</span>}
                      {p.invoice_date && <span>Faktura sendt: {formatDate(p.invoice_date)}</span>}
                      {p.dinero_invoice_number && <span>Faktura: {p.dinero_invoice_number}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 13, color: 'var(--text-muted)', flexWrap: 'wrap', marginTop: 4 }}>
                      {p.amount_dkk != null && <span>Salg: {formatAmount(p.amount_dkk)}</span>}
                      {p.cost_dkk != null && <span>Omk.: {formatAmount(p.cost_dkk)}</span>}
                      <span>Bruttofort.: {formatAmount(brutto)}</span>
                      <span>Dækningsgrad: {daekning != null ? `${daekning}%` : '\u2014'}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: 'var(--text-faint)', marginTop: 4 }}>
                      <span>Faktureret: <strong style={{ color: p.invoiced ? '#059669' : 'var(--text-muted)' }}>{p.invoiced ? 'Ja' : 'Nej'}</strong></span>
                      <span>Omk. betalt: <strong style={{ color: p.cost_paid ? '#059669' : 'var(--text-muted)' }}>{p.cost_paid ? 'Ja' : 'Nej'}</strong></span>
                      <span>Kunde betalt: <strong style={{ color: p.client_paid ? '#059669' : 'var(--text-muted)' }}>{p.client_paid ? 'Ja' : 'Nej'}</strong></span>
                    </div>
                    {sr && (
                      <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text-muted)' }}>
                        Dinero status: <strong>{sr.status}</strong>{sr.amount != null ? ` — ${Number(sr.amount).toLocaleString('da-DK')} kr.` : ''}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    {p.dinero_invoice_guid && (
                      <button onClick={() => syncDinero(p)} disabled={syncingId === p.id} style={{ ...actionBtnStyle, fontSize: 12 }}>
                        {syncingId === p.id ? 'Syncer...' : 'Sync Dinero'}
                      </button>
                    )}
                    <button onClick={() => setEditingProject(p.id)} style={actionBtnStyle}>Rediger</button>
                    <button onClick={() => deleteProject(p.id)} style={{ ...actionBtnStyle, color: '#ef4444' }}>Slet</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const CD_MONTHS = ['Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'December'];
const CD_YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i);

function cdParseMonthYear(dateStr) {
  if (!dateStr) return { month: '', year: '' };
  const d = new Date(dateStr);
  return { month: String(d.getMonth()), year: String(d.getFullYear()) };
}

function cdFormatMonthYear(dateStr) {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return `${CD_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function ProjectInlineForm({ companyId, initial, onDone, onCancel }) {
  const isEdit = !!initial?.id;
  const startParsed = cdParseMonthYear(initial?.start_date);
  const deadlineParsed = cdParseMonthYear(initial?.deadline);
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    status: initial?.status || 'planlagt',
    start_month: startParsed.month,
    start_year: startParsed.year,
    deadline_month: deadlineParsed.month,
    deadline_year: deadlineParsed.year,
    amount_dkk: initial?.amount_dkk || '',
    cost_dkk: initial?.cost_dkk || '',
    dinero_invoice_number: initial?.dinero_invoice_number || '',
    dinero_invoice_guid: initial?.dinero_invoice_guid || '',
    invoice_date: initial?.invoice_date || '',
    booking_year: initial?.booking_year || '',
    invoiced: initial?.invoiced || false,
    cost_paid: initial?.cost_paid || false,
    client_paid: initial?.client_paid || false,
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }));
  };

  const buildDate = (month, year) => {
    if (month === '' || year === '') return null;
    return `${year}-${String(Number(month) + 1).padStart(2, '0')}-01`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    setSaving(true);
    const payload = {
      name: form.name.trim(),
      description: form.description.trim() || null,
      status: form.status,
      start_date: buildDate(form.start_month, form.start_year),
      deadline: buildDate(form.deadline_month, form.deadline_year),
      amount_dkk: form.amount_dkk ? Number(form.amount_dkk) : null,
      cost_dkk: form.cost_dkk ? Number(form.cost_dkk) : null,
      dinero_invoice_number: form.dinero_invoice_number.trim() || null,
      dinero_invoice_guid: form.dinero_invoice_guid.trim() || null,
      invoice_date: form.invoice_date || null,
      booking_year: form.booking_year ? Number(form.booking_year) : null,
      invoiced: form.invoiced,
      cost_paid: form.cost_paid,
      client_paid: form.client_paid,
    };
    try {
      let res;
      if (isEdit) {
        res = await fetch(`${API_URL}/api/projects/${initial.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      } else {
        res = await fetch(`${API_URL}/api/projects/company/${companyId}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Ukendt fejl');
      onDone();
    } catch (err) {
      alert(`Fejl: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ ...projectCardStyle, marginBottom: 4 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        <label style={contactEditLabelStyle}>Beskrivelse (navn) *<input name="name" value={form.name} onChange={handleChange} style={contactEditInputStyle} required /></label>
        <label style={contactEditLabelStyle}>Status
          <select name="status" value={form.status} onChange={handleChange} style={contactEditInputStyle}>
            <option value="planlagt">Planlagt</option>
            <option value="tilbud">Tilbud</option>
            <option value="igangværende">Igangværende</option>
            <option value="afsluttet">Afsluttet</option>
          </select>
        </label>
        <div style={contactEditLabelStyle}>Projekt start
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={form.start_month} onChange={(e) => setForm((p) => ({ ...p, start_month: e.target.value }))} style={{ ...contactEditInputStyle, flex: 1 }}>
              <option value="">Måned</option>
              {CD_MONTHS.map((m, i) => <option key={i} value={String(i)}>{m}</option>)}
            </select>
            <select value={form.start_year} onChange={(e) => setForm((p) => ({ ...p, start_year: e.target.value }))} style={{ ...contactEditInputStyle, width: 90 }}>
              <option value="">År</option>
              {CD_YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
        </div>
        <div style={contactEditLabelStyle}>Projekt slut
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={form.deadline_month} onChange={(e) => setForm((p) => ({ ...p, deadline_month: e.target.value }))} style={{ ...contactEditInputStyle, flex: 1 }}>
              <option value="">Måned</option>
              {CD_MONTHS.map((m, i) => <option key={i} value={String(i)}>{m}</option>)}
            </select>
            <select value={form.deadline_year} onChange={(e) => setForm((p) => ({ ...p, deadline_year: e.target.value }))} style={{ ...contactEditInputStyle, width: 90 }}>
              <option value="">År</option>
              {CD_YEARS.map((y) => <option key={y} value={String(y)}>{y}</option>)}
            </select>
          </div>
        </div>
        <label style={contactEditLabelStyle}>Salg ex moms (DKK)<input name="amount_dkk" type="number" value={form.amount_dkk} onChange={handleChange} style={contactEditInputStyle} /></label>
        <label style={contactEditLabelStyle}>Omkostninger ex moms (DKK)<input name="cost_dkk" type="number" value={form.cost_dkk} onChange={handleChange} style={contactEditInputStyle} /></label>
        <label style={contactEditLabelStyle}>Faktura sendt<input name="invoice_date" type="date" value={form.invoice_date} onChange={handleChange} style={contactEditInputStyle} /></label>
        <label style={contactEditLabelStyle}>Bogføring år<input name="booking_year" type="number" min="2000" max="2099" value={form.booking_year} onChange={handleChange} style={contactEditInputStyle} placeholder="2026" /></label>
        <label style={contactEditLabelStyle}>Dinero faktura nr.<input name="dinero_invoice_number" value={form.dinero_invoice_number} onChange={handleChange} style={contactEditInputStyle} /></label>
        <label style={contactEditLabelStyle}>Dinero faktura GUID<input name="dinero_invoice_guid" value={form.dinero_invoice_guid} onChange={handleChange} style={contactEditInputStyle} /></label>
      </div>
      <div style={{ display: 'flex', gap: 24, marginTop: 14 }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input name="invoiced" type="checkbox" checked={form.invoiced} onChange={handleChange} style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }} />
          Faktureret
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input name="cost_paid" type="checkbox" checked={form.cost_paid} onChange={handleChange} style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }} />
          Omkostning betalt
        </label>
        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <input name="client_paid" type="checkbox" checked={form.client_paid} onChange={handleChange} style={{ width: 15, height: 15, accentColor: 'var(--accent)', cursor: 'pointer' }} />
          Kunde betalt
        </label>
      </div>
      <label style={{ ...contactEditLabelStyle, marginTop: 14 }}>Beskrivelse (noter)
        <textarea name="description" value={form.description} onChange={handleChange} rows={2} style={{ ...contactEditInputStyle, resize: 'vertical' }} />
      </label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 14 }}>
        <button type="button" onClick={onCancel} style={{ ...secondaryBtnStyle, padding: '6px 14px', fontSize: 12 }}>Annuller</button>
        <button type="submit" disabled={saving} style={{ ...primaryBtnSmallStyle, opacity: saving ? 0.7 : 1 }}>{saving ? 'Gemmer...' : isEdit ? 'Gem' : 'Opret'}</button>
      </div>
    </form>
  );
}

const projectCardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };

const cardStyle = { backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 24, boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-card)', transition: 'background-color 0.2s ease' };
const secondaryBtnStyle = { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s ease' };
const deleteBtnStyle = { backgroundColor: 'var(--bg-card)', color: '#dc2626', border: '1px solid #fecaca', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s ease' };
const primaryBtnSmallStyle = { backgroundColor: 'var(--accent)', color: '#fff', border: 'none', padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'background-color 0.15s ease' };
const logCardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' };
const logIconBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', padding: '4px 6px', fontFamily: 'inherit', lineHeight: 1, borderRadius: 6, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.15s ease' };
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.4))', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const logModalStyle = { backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg, 0 8px 30px rgba(0,0,0,0.12))', border: '1px solid var(--border-card)' };
const actionBtnStyle = { background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'var(--accent)', fontWeight: 500, padding: 0, fontFamily: 'inherit', transition: 'color 0.15s ease' };
const contactCardStyle = { backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', transition: 'box-shadow 0.15s ease, opacity 0.15s ease' };
const dragHandleStyle = { cursor: 'grab', color: 'var(--text-placeholder)', fontSize: 18, lineHeight: '1', display: 'flex', alignItems: 'center', userSelect: 'none', padding: '0 2px', flexShrink: 0 };
const contactEditLabelStyle = { display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', gap: 5 };
const contactEditInputStyle = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: 'var(--text)', backgroundColor: 'var(--bg-input)' };
