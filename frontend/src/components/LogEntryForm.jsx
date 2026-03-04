import { useEffect, useState, useRef } from 'react';
import { supabase } from '../lib/supabase';

const activityTypes = [
  { key: 'called', label: 'Ringet op' },
  { key: 'emailed', label: 'Sendt mail' },
  { key: 'met', label: 'Møde' },
  { key: 'no_answer', label: 'Ingen svar' },
  { key: 'proposal_sent', label: 'Tilbud sendt' },
  { key: 'contract_signed', label: 'Aftale indgået' },
  { key: 'other', label: 'Andet' },
];

export default function LogEntryForm({ onClose, onSaved }) {
  const [companies, setCompanies] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [companySearch, setCompanySearch] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [form, setForm] = useState({ company_id: '', contact_id: '', activity_type: '', notes: '', occurred_at: new Date().toISOString().slice(0, 10) });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  useEffect(() => {
    const f = async () => { const { data } = await supabase.from('companies').select('id, name').order('name'); setCompanies(data || []); };
    f();
  }, []);

  useEffect(() => {
    if (!form.company_id) { setContacts([]); return; }
    const f = async () => { const { data } = await supabase.from('contacts').select('id, name').eq('company_id', form.company_id).order('name'); setContacts(data || []); };
    f();
  }, [form.company_id]);

  useEffect(() => {
    const h = (e) => { if (dropdownRef.current && !dropdownRef.current.contains(e.target)) setShowDropdown(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const filteredCompanies = companies.filter((c) => c.name.toLowerCase().includes(companySearch.toLowerCase()));

  const selectCompany = (company) => {
    setForm((p) => ({ ...p, company_id: company.id, contact_id: '' }));
    setCompanySearch(company.name);
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_id) { setError('Vælg en virksomhed.'); return; }
    if (!form.activity_type) { setError('Vælg en aktivitetstype.'); return; }
    setSaving(true); setError('');
    const { data: { session } } = await supabase.auth.getSession();
    const loggedBy = session?.user?.email || 'ukendt';
    const payload = { company_id: form.company_id, contact_id: form.contact_id || null, activity_type: form.activity_type, notes: form.notes.trim() || null, occurred_at: new Date(form.occurred_at).toISOString(), logged_by: loggedBy };
    const { error: insertError } = await supabase.from('log_entries').insert(payload);
    if (insertError) { setError(insertError.message); setSaving(false); }
    else onSaved();
  };

  return (
    <div className="cava-overlay" style={overlayStyle} onClick={onClose}>
      <div className="cava-modal" style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Log aktivitet</h2>
          <button onClick={onClose} style={closeBtnStyle}>\u00d7</button>
        </div>

        {error && <p style={errorStyle}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>Dato
            <input type="date" value={form.occurred_at} onChange={(e) => setForm((p) => ({ ...p, occurred_at: e.target.value }))} style={inputStyle} />
          </label>

          <label style={{ ...labelStyle, marginTop: 18, position: 'relative' }}>Virksomhed *
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <input type="text" placeholder="Søg efter virksomhed..." value={companySearch}
                onChange={(e) => { setCompanySearch(e.target.value); setShowDropdown(true); if (!e.target.value) { setForm((p) => ({ ...p, company_id: '', contact_id: '' })); } }}
                onFocus={() => setShowDropdown(true)} style={inputStyle} />
              {showDropdown && filteredCompanies.length > 0 && (
                <div style={dropdownStyle}>
                  {filteredCompanies.map((c) => (
                    <div key={c.id} onClick={() => selectCompany(c)} style={{ padding: '9px 14px', cursor: 'pointer', fontSize: 14, color: 'var(--text)', backgroundColor: c.id === form.company_id ? 'var(--bg-subtle)' : 'var(--bg-card)', transition: 'background-color 0.1s ease' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = c.id === form.company_id ? 'var(--bg-subtle)' : 'var(--bg-card)')}>
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </label>

          {form.company_id && contacts.length > 0 && (
            <label style={{ ...labelStyle, marginTop: 18 }}>Kontakt (valgfri)
              <select value={form.contact_id} onChange={(e) => setForm((p) => ({ ...p, contact_id: e.target.value }))} style={inputStyle}>
                <option value="">\u2014 Ingen kontakt \u2014</option>
                {contacts.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </label>
          )}

          <div style={{ marginTop: 18 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 10 }}>Aktivitetstype *</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {activityTypes.map((at) => {
                const isActive = form.activity_type === at.key;
                return (
                  <button key={at.key} type="button" onClick={() => setForm((p) => ({ ...p, activity_type: at.key }))}
                    style={{ padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 500, fontFamily: 'inherit', cursor: 'pointer', transition: 'all 0.15s ease',
                      border: isActive ? '1px solid var(--accent)' : '1px solid var(--border)',
                      backgroundColor: isActive ? 'var(--accent)' : 'var(--bg-card)',
                      color: isActive ? '#fff' : 'var(--text-muted)',
                    }}>
                    {at.label}
                  </button>
                );
              })}
            </div>
          </div>

          <label style={{ ...labelStyle, marginTop: 18 }}>Note (valgfri)
            <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={3} placeholder="Tilføj en note..." style={{ ...inputStyle, resize: 'vertical' }} />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Annuller</button>
            <button type="submit" disabled={saving} style={{ ...saveBtnStyle, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Gemmer...' : 'Gem log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle = { backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-card)' };
const labelStyle = { display: 'flex', flexDirection: 'column', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', gap: 6 };
const inputStyle = { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: 'var(--text)', backgroundColor: 'var(--bg-input)', transition: 'border-color 0.15s ease' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-faint)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.15s ease' };
const errorStyle = { color: '#dc2626', fontSize: 13, margin: '0 0 16px', padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' };
const dropdownStyle = { position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, backgroundColor: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, maxHeight: 200, overflowY: 'auto', zIndex: 10, boxShadow: 'var(--shadow-sm)' };
const cancelBtnStyle = { padding: '10px 18px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontFamily: 'inherit', transition: 'all 0.15s ease' };
const saveBtnStyle = { padding: '10px 18px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'inherit', transition: 'background-color 0.15s ease' };
