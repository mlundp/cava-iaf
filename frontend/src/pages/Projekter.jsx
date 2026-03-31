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

const CURRENT_YEAR = new Date().getFullYear();

const MONTHS = ['Januar', 'Februar', 'Marts', 'April', 'Maj', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'December'];
const YEARS = Array.from({ length: 11 }, (_, i) => 2020 + i);

function parseMonthYear(dateStr) {
  if (!dateStr) return { month: '', year: '' };
  const d = new Date(dateStr);
  return { month: String(d.getMonth()), year: String(d.getFullYear()) };
}

function formatMonthYear(dateStr) {
  if (!dateStr) return '\u2014';
  const d = new Date(dateStr);
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function MonthYearPicker({ label, month, year, onMonthChange, onYearChange, style }) {
  return (
    <div style={{ ...style }}>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 5 }}>{label}</div>
      <div style={{ display: 'flex', gap: 6 }}>
        <select value={month} onChange={onMonthChange} style={{ ...pickerSelectStyle, flex: 1 }}>
          <option value="">Måned</option>
          {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
        </select>
        <select value={year} onChange={onYearChange} style={{ ...pickerSelectStyle, width: 90 }}>
          <option value="">År</option>
          {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>
    </div>
  );
}

function calcBrutto(p) {
  const sale = Number(p.amount_dkk) || 0;
  const cost = Number(p.cost_dkk) || 0;
  return sale - cost;
}

function calcDaekning(p) {
  const sale = Number(p.amount_dkk) || 0;
  if (sale === 0) return null;
  return Math.round(calcBrutto(p) / sale * 100);
}

function rowBgColor(p) {
  if (!p.booking_year) return '';
  if (p.booking_year === CURRENT_YEAR) return 'rgba(34, 197, 94, 0.08)';
  if (p.booking_year < CURRENT_YEAR) return 'rgba(236, 72, 153, 0.08)';
  return '';
}

export default function Projekter() {
  const [projects, setProjects] = useState([]);
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [sortCol, setSortCol] = useState('project_number');
  const [sortDir, setSortDir] = useState('desc');
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

  const sorted = [...filtered].sort((a, b) => {
    let cmp = 0;
    switch (sortCol) {
      case 'project_number': cmp = (a.project_number || '').localeCompare(b.project_number || ''); break;
      case 'company': cmp = (a.companies?.name || '').localeCompare(b.companies?.name || '', 'da'); break;
      case 'booking_year': cmp = (a.booking_year || 0) - (b.booking_year || 0); break;
      case 'invoice_date': cmp = (a.invoice_date || '').localeCompare(b.invoice_date || ''); break;
      case 'dinero_invoice_number': cmp = (a.dinero_invoice_number || '').localeCompare(b.dinero_invoice_number || ''); break;
      case 'name': cmp = (a.name || '').localeCompare(b.name || '', 'da'); break;
      case 'amount_dkk': cmp = (Number(a.amount_dkk) || 0) - (Number(b.amount_dkk) || 0); break;
      case 'cost_dkk': cmp = (Number(a.cost_dkk) || 0) - (Number(b.cost_dkk) || 0); break;
      case 'brutto': cmp = calcBrutto(a) - calcBrutto(b); break;
      case 'daekning': cmp = (calcDaekning(a) ?? -Infinity) - (calcDaekning(b) ?? -Infinity); break;
      case 'invoiced': cmp = (a.invoiced ? 1 : 0) - (b.invoiced ? 1 : 0); break;
      case 'cost_paid': cmp = (a.cost_paid ? 1 : 0) - (b.cost_paid ? 1 : 0); break;
      case 'client_paid': cmp = (a.client_paid ? 1 : 0) - (b.client_paid ? 1 : 0); break;
      default: break;
    }
    return sortDir === 'asc' ? cmp : -cmp;
  });

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortCol(col);
      const defaultDesc = ['amount_dkk', 'cost_dkk', 'brutto', 'daekning', 'booking_year', 'invoice_date', 'project_number'];
      setSortDir(defaultDesc.includes(col) ? 'desc' : 'asc');
    }
  };

  const sortArrow = (col) => {
    if (sortCol !== col) return '';
    return sortDir === 'asc' ? ' ↑' : ' ↓';
  };

  const formatDate = (d) => !d ? '\u2014' : new Date(d).toLocaleDateString('da-DK');
  const formatAmount = (a) => a == null || a === '' ? '\u2014' : Number(a).toLocaleString('da-DK') + ' kr.';
  const formatBool = (v) => v ? 'Ja' : 'Nej';

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: 'var(--text)' }}>Projekter</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: 'var(--text-faint)' }}>{sorted.length} projekt{sorted.length !== 1 ? 'er' : ''}</p>
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
      ) : sorted.length === 0 ? (
        <div style={{ ...cardStyle, padding: 48, textAlign: 'center' }}>
          <div style={{ marginBottom: 12, color: 'var(--text-faint)' }}><IconProjects size={32} /></div>
          <p style={{ color: 'var(--text-muted)', fontSize: 15, margin: 0, fontWeight: 500 }}>Ingen projekter {statusFilter ? 'fundet' : 'endnu'}.</p>
          {!statusFilter && <p style={{ color: 'var(--text-faint)', fontSize: 13, margin: '6px 0 0' }}>Opret dit første projekt for at komme i gang.</p>}
        </div>
      ) : (
        <div style={{ ...cardStyle, overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 1200 }}>
            <thead>
              <tr>
                <th style={thClickStyle} onClick={() => handleSort('project_number')}>Projekt nr.{sortArrow('project_number')}</th>
                <th style={thClickStyle} onClick={() => handleSort('company')}>Kunde{sortArrow('company')}</th>
                <th style={thClickStyle} onClick={() => handleSort('booking_year')}>Bogføring år{sortArrow('booking_year')}</th>
                <th style={thClickStyle} onClick={() => handleSort('invoice_date')}>Faktura sendt{sortArrow('invoice_date')}</th>
                <th style={thClickStyle} onClick={() => handleSort('dinero_invoice_number')}>Faktura nr.{sortArrow('dinero_invoice_number')}</th>
                <th style={thClickStyle} onClick={() => handleSort('name')}>Beskrivelse{sortArrow('name')}</th>
                <th style={{ ...thClickStyle, textAlign: 'right' }} onClick={() => handleSort('amount_dkk')}>Salg ex moms{sortArrow('amount_dkk')}</th>
                <th style={{ ...thClickStyle, textAlign: 'right' }} onClick={() => handleSort('cost_dkk')}>Omk. ex moms{sortArrow('cost_dkk')}</th>
                <th style={{ ...thClickStyle, textAlign: 'right' }} onClick={() => handleSort('brutto')}>Bruttofort.{sortArrow('brutto')}</th>
                <th style={{ ...thClickStyle, textAlign: 'right' }} onClick={() => handleSort('daekning')}>Dækningsgrad{sortArrow('daekning')}</th>
                <th style={thClickStyle} onClick={() => handleSort('invoiced')}>Faktureret{sortArrow('invoiced')}</th>
                <th style={thClickStyle} onClick={() => handleSort('cost_paid')}>Omk. betalt{sortArrow('cost_paid')}</th>
                <th style={thClickStyle} onClick={() => handleSort('client_paid')}>Kunde betalt{sortArrow('client_paid')}</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const bg = rowBgColor(p);
                const brutto = calcBrutto(p);
                const daekning = calcDaekning(p);
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border-subtle)', transition: 'background-color 0.1s ease', backgroundColor: bg }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = bg)}>
                    <td style={{ ...tdStyle, fontWeight: 600, color: 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{p.project_number || '\u2014'}</td>
                    <td style={tdStyle}>
                      {p.companies?.name ? (
                        <span onClick={() => navigate(`/kontakter/${p.companies.id}`)} style={{ color: 'var(--accent)', cursor: 'pointer', fontWeight: 500 }}>{p.companies.name}</span>
                      ) : '\u2014'}
                    </td>
                    <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums', color: 'var(--text-muted)' }}>{p.booking_year || '\u2014'}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{formatDate(p.invoice_date)}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>{p.dinero_invoice_number || '\u2014'}</td>
                    <td style={{ ...tdStyle, fontWeight: 500, color: 'var(--text)' }}>{p.name}</td>
                    <td style={numTdStyle}>{formatAmount(p.amount_dkk)}</td>
                    <td style={numTdStyle}>{formatAmount(p.cost_dkk)}</td>
                    <td style={{ ...numTdStyle, color: brutto < 0 ? '#dc2626' : 'var(--text-secondary)' }}>{formatAmount(brutto)}</td>
                    <td style={{ ...numTdStyle, color: daekning != null && daekning < 0 ? '#dc2626' : 'var(--text-secondary)' }}>{daekning != null ? `${daekning}%` : '\u2014'}</td>
                    <td style={{ ...tdStyle, color: p.invoiced ? '#059669' : 'var(--text-muted)' }}>{formatBool(p.invoiced)}</td>
                    <td style={{ ...tdStyle, color: p.cost_paid ? '#059669' : 'var(--text-muted)' }}>{formatBool(p.cost_paid)}</td>
                    <td style={{ ...tdStyle, color: p.client_paid ? '#059669' : 'var(--text-muted)' }}>{formatBool(p.client_paid)}</td>
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
  const startParsed = parseMonthYear(initial?.start_date);
  const deadlineParsed = parseMonthYear(initial?.deadline);
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
    company_id: companyId || initial?.company_id || '',
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
    if (!form.name.trim() || !form.company_id) return;
    setSaving(true);
    try {
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
            <label style={labelStyle}>Beskrivelse (navn) *<input name="name" value={form.name} onChange={handleChange} style={inputStyle} required /></label>
            <label style={labelStyle}>Status
              <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
                <option value="planlagt">Planlagt</option>
                <option value="tilbud">Tilbud</option>
                <option value="igangværende">Igangværende</option>
                <option value="afsluttet">Afsluttet</option>
              </select>
            </label>
            <MonthYearPicker label="Projekt start" month={form.start_month} year={form.start_year}
              onMonthChange={(e) => setForm((p) => ({ ...p, start_month: e.target.value }))}
              onYearChange={(e) => setForm((p) => ({ ...p, start_year: e.target.value }))} />
            <MonthYearPicker label="Projekt slut" month={form.deadline_month} year={form.deadline_year}
              onMonthChange={(e) => setForm((p) => ({ ...p, deadline_month: e.target.value }))}
              onYearChange={(e) => setForm((p) => ({ ...p, deadline_year: e.target.value }))} />
            <label style={labelStyle}>Salg ex moms (DKK)<input name="amount_dkk" type="number" value={form.amount_dkk} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Omkostninger ex moms (DKK)<input name="cost_dkk" type="number" value={form.cost_dkk} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Faktura sendt<input name="invoice_date" type="date" value={form.invoice_date} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Bogføring år<input name="booking_year" type="number" min="2000" max="2099" value={form.booking_year} onChange={handleChange} style={inputStyle} placeholder="2026" /></label>
            <label style={labelStyle}>Dinero faktura nr.<input name="dinero_invoice_number" value={form.dinero_invoice_number} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Dinero faktura GUID<input name="dinero_invoice_guid" value={form.dinero_invoice_guid} onChange={handleChange} style={inputStyle} /></label>
          </div>
          <div style={{ display: 'flex', gap: 24, marginTop: 18 }}>
            <label style={checkboxLabelStyle}>
              <input name="invoiced" type="checkbox" checked={form.invoiced} onChange={handleChange} style={checkboxStyle} />
              Faktureret
            </label>
            <label style={checkboxLabelStyle}>
              <input name="cost_paid" type="checkbox" checked={form.cost_paid} onChange={handleChange} style={checkboxStyle} />
              Omkostning betalt
            </label>
            <label style={checkboxLabelStyle}>
              <input name="client_paid" type="checkbox" checked={form.client_paid} onChange={handleChange} style={checkboxStyle} />
              Kunde betalt
            </label>
          </div>
          <label style={{ ...labelStyle, marginTop: 14 }}>Beskrivelse (noter)
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
const thClickStyle = { padding: '11px 12px', fontSize: 11, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, textAlign: 'left', borderBottom: '1px solid var(--border-subtle)', backgroundColor: 'var(--th-bg)', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none', transition: 'color 0.15s ease' };
const tdStyle = { padding: '12px 12px', fontSize: 13 };
const numTdStyle = { ...tdStyle, textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: 'var(--text-secondary)' };
const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--overlay-bg, rgba(0,0,0,0.4))', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle = { backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 620, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg, 0 8px 30px rgba(0,0,0,0.12))', border: '1px solid var(--border-card)' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-faint)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center' };
const labelStyle = { display: 'flex', flexDirection: 'column', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', gap: 5, marginBottom: 14 };
const inputStyle = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, outline: 'none', fontFamily: 'inherit', color: 'var(--text)', backgroundColor: 'var(--bg-input)' };
const checkboxLabelStyle = { display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)', cursor: 'pointer' };
const checkboxStyle = { width: 16, height: 16, accentColor: 'var(--accent)', cursor: 'pointer' };
const pickerSelectStyle = { padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', backgroundColor: 'var(--bg-input)', cursor: 'pointer' };
