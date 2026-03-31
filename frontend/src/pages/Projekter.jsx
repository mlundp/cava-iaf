import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import Skeleton from '../components/Skeleton';
import { IconProjects } from '../components/Icons';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const statusLabels = {
  planlagt: 'Planlagt',
  tilbud: 'Tilbud',
  igangværende: 'Igangværende',
  afsluttet: 'Afsluttet',
};

const statusStyles = {
  planlagt: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  tilbud: { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
  igangværende: { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  afsluttet: { bg: '#f8fafc', color: '#64748b', border: '#e2e8f0' },
};

export default function Projekter() {
  const [projects, setProjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const navigate = useNavigate();

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/api/projects`);
      const data = await res.json();
      if (data.success) setProjects(data.projects || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchCompanies = async () => {
    const { data } = await supabase.from('companies').select('id, name').order('name');
    setCompanies(data || []);
  };

  useEffect(() => { fetchProjects(); fetchCompanies(); }, []);

  const filtered = projects.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    return true;
  });

  const formatDate = (d) => !d ? '\u2014' : new Date(d).toLocaleDateString('da-DK');
  const formatAmount = (a) => !a ? '\u2014' : Number(a).toLocaleString('da-DK') + ' kr.';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Projekter</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>{filtered.length} projekt{filtered.length !== 1 ? 'er' : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)} style={primaryBtnStyle}>+ Nyt projekt</button>
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 22 }}>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={selectStyle}>
          <option value="">Alle statusser</option>
          {Object.entries(statusLabels).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {loading ? (
        <div style={cardStyle}><div style={{ padding: 20 }}><Skeleton rows={6} /></div></div>
      ) : filtered.length === 0 ? (
        <div style={{ ...cardStyle, padding: 48, textAlign: 'center' }}>
          <div style={{ marginBottom: 12, color: 'var(--text-faint)' }}><IconProjects size={32} /></div>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: 0, fontWeight: 500 }}>Ingen projekter {statusFilter ? 'fundet' : 'endnu'}.</p>
          {!statusFilter && <p style={{ color: 'var(--text-faint)', fontSize: 13, margin: '6px 0 0' }}>Opret dit første projekt for at komme i gang.</p>}
        </div>
      ) : (
        <div style={cardStyle}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={thStyle}>Projekt nr.</th>
                <th style={thStyle}>Kunde</th>
                <th style={thStyle}>Navn</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Startdato</th>
                <th style={thStyle}>Deadline</th>
                <th style={{ ...thStyle, textAlign: 'right' }}>Beløb</th>
                <th style={thStyle}>Faktura nr.</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => {
                const ss = statusStyles[p.status] || statusStyles.planlagt;
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.1s ease' }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{p.project_number || '\u2014'}</td>
                    <td style={tdStyle}>
                      {p.companies?.name ? (
                        <span onClick={() => navigate(`/kontakter/${p.companies.id}`)} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>{p.companies.name}</span>
                      ) : '\u2014'}
                    </td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text)' }}>{p.name}</td>
                    <td style={tdStyle}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500, backgroundColor: ss.bg, color: ss.color, border: `1px solid ${ss.border}` }}>
                        {statusLabels[p.status] || p.status}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{formatDate(p.start_date)}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{formatDate(p.deadline)}</td>
                    <td style={{ ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: 'var(--text-secondary)', fontWeight: 500 }}>{formatAmount(p.amount_dkk)}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{p.dinero_invoice_number || '\u2014'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <ProjectFormModal companies={companies} onClose={() => setShowForm(false)} onSaved={() => { setShowForm(false); fetchProjects(); }} />
      )}
    </div>
  );
}

function ProjectFormModal({ companies, companyId, initial, onClose, onSaved }) {
  const isEdit = !!initial?.id;
  const [form, setForm] = useState({
    name: initial?.name || '',
    description: initial?.description || '',
    status: initial?.status || 'planlagt',
    start_date: initial?.start_date || '',
    deadline: initial?.deadline || '',
    amount_dkk: initial?.amount_dkk || '',
    dinero_invoice_number: initial?.dinero_invoice_number || '',
    dinero_invoice_guid: initial?.dinero_invoice_guid || '',
    company_id: companyId || initial?.company_id || '',
  });
  const [saving, setSaving] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim() || !form.company_id) return;
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || null,
        status: form.status,
        start_date: form.start_date || null,
        deadline: form.deadline || null,
        amount_dkk: form.amount_dkk ? Number(form.amount_dkk) : null,
        dinero_invoice_number: form.dinero_invoice_number.trim() || null,
        dinero_invoice_guid: form.dinero_invoice_guid.trim() || null,
      };
      let res;
      if (isEdit) {
        res = await fetch(`${API_URL}/api/projects/${initial.id}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`${API_URL}/api/projects/company/${form.company_id}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload),
        });
      }
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Ukendt fejl');
      onSaved();
    } catch (err) {
      alert(`Fejl: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{isEdit ? 'Rediger projekt' : 'Nyt projekt'}</h2>
          <button onClick={onClose} style={closeBtnStyle}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          {!companyId && (
            <label style={labelStyle}>Virksomhed *
              <select name="company_id" value={form.company_id} onChange={handleChange} style={inputStyle} required>
                <option value="">Vælg virksomhed...</option>
                {companies?.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <label style={labelStyle}>Navn *<input name="name" value={form.name} onChange={handleChange} style={inputStyle} required /></label>
            <label style={labelStyle}>Status
              <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
                <option value="planlagt">Planlagt</option>
                <option value="tilbud">Tilbud</option>
                <option value="igangværende">Igangværende</option>
                <option value="afsluttet">Afsluttet</option>
              </select>
            </label>
            <label style={labelStyle}>Startdato<input name="start_date" type="date" value={form.start_date} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Deadline<input name="deadline" type="date" value={form.deadline} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Beløb (DKK)<input name="amount_dkk" type="number" value={form.amount_dkk} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Dinero faktura nr.<input name="dinero_invoice_number" value={form.dinero_invoice_number} onChange={handleChange} style={inputStyle} /></label>
          </div>
          <label style={{ ...labelStyle, marginTop: 14 }}>Dinero faktura GUID<input name="dinero_invoice_guid" value={form.dinero_invoice_guid} onChange={handleChange} style={inputStyle} /></label>
          <label style={{ ...labelStyle, marginTop: 14 }}>Beskrivelse
            <textarea name="description" value={form.description} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={secondaryBtnStyle}>Annuller</button>
            <button type="submit" disabled={saving} style={{ ...primaryBtnStyle, opacity: saving ? 0.7 : 1 }}>{saving ? 'Gemmer...' : isEdit ? 'Gem' : 'Opret'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export { ProjectFormModal };

const primaryBtnStyle = { backgroundColor: 'var(--accent)', color: '#fff', border: 'none', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'background-color 0.15s ease' };
const secondaryBtnStyle = { backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '9px 18px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', transition: 'all 0.15s ease' };
const selectStyle = { padding: '9px 13px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, backgroundColor: 'var(--bg-input)', cursor: 'pointer', fontFamily: 'inherit', color: 'var(--text)', minWidth: 160 };
const cardStyle = { backgroundColor: 'var(--bg-card)', borderRadius: 12, overflow: 'hidden', boxShadow: 'var(--shadow-sm)', border: '1px solid var(--border-card)', transition: 'background-color 0.2s ease' };
const thStyle = { padding: '11px 16px', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--th-bg)', whiteSpace: 'nowrap' };
const tdStyle = { padding: '13px 16px', fontSize: 14 };
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.4))', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle = { backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg, 0 8px 30px rgba(0,0,0,0.12))', border: '1px solid var(--border-card)' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-faint)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const labelStyle = { display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', gap: 5, marginBottom: 14 };
const inputStyle = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: 'var(--text)', backgroundColor: 'var(--bg-input)' };
