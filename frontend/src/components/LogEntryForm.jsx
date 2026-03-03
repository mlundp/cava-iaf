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
  const [form, setForm] = useState({
    company_id: '',
    contact_id: '',
    activity_type: '',
    notes: '',
    occurred_at: new Date().toISOString().slice(0, 10),
  });
  const [selectedCompanyName, setSelectedCompanyName] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase.from('companies').select('id, name').order('name');
      setCompanies(data || []);
    };
    fetchCompanies();
  }, []);

  useEffect(() => {
    if (!form.company_id) {
      setContacts([]);
      return;
    }
    const fetchContacts = async () => {
      const { data } = await supabase
        .from('contacts')
        .select('id, name')
        .eq('company_id', form.company_id)
        .order('name');
      setContacts(data || []);
    };
    fetchContacts();
  }, [form.company_id]);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(companySearch.toLowerCase())
  );

  const selectCompany = (company) => {
    setForm((prev) => ({ ...prev, company_id: company.id, contact_id: '' }));
    setSelectedCompanyName(company.name);
    setCompanySearch(company.name);
    setShowDropdown(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.company_id) {
      setError('Vælg en virksomhed.');
      return;
    }
    if (!form.activity_type) {
      setError('Vælg en aktivitetstype.');
      return;
    }
    setSaving(true);
    setError('');

    const { data: { session } } = await supabase.auth.getSession();
    const loggedBy = session?.user?.email || 'ukendt';

    const payload = {
      company_id: form.company_id,
      contact_id: form.contact_id || null,
      activity_type: form.activity_type,
      notes: form.notes.trim() || null,
      occurred_at: new Date(form.occurred_at).toISOString(),
      logged_by: loggedBy,
    };

    const { error: insertError } = await supabase.from('log_entries').insert(payload);

    if (insertError) {
      setError(insertError.message);
      setSaving(false);
    } else {
      onSaved();
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>Log aktivitet</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: 14, margin: '0 0 12px' }}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <label style={labelStyle}>
            Dato
            <input
              type="date"
              value={form.occurred_at}
              onChange={(e) => setForm((prev) => ({ ...prev, occurred_at: e.target.value }))}
              style={inputStyle}
            />
          </label>

          <label style={{ ...labelStyle, marginTop: 16, position: 'relative' }}>
            Virksomhed *
            <div ref={dropdownRef} style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Søg efter virksomhed..."
                value={companySearch}
                onChange={(e) => {
                  setCompanySearch(e.target.value);
                  setShowDropdown(true);
                  if (!e.target.value) {
                    setForm((prev) => ({ ...prev, company_id: '', contact_id: '' }));
                    setSelectedCompanyName('');
                  }
                }}
                onFocus={() => setShowDropdown(true)}
                style={inputStyle}
              />
              {showDropdown && filteredCompanies.length > 0 && (
                <div style={dropdownStyle}>
                  {filteredCompanies.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => selectCompany(c)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        fontSize: 14,
                        backgroundColor: c.id === form.company_id ? '#f0f0f0' : '#fff',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f5f5f5')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = c.id === form.company_id ? '#f0f0f0' : '#fff')}
                    >
                      {c.name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </label>

          {form.company_id && contacts.length > 0 && (
            <label style={{ ...labelStyle, marginTop: 16 }}>
              Kontakt (valgfri)
              <select
                value={form.contact_id}
                onChange={(e) => setForm((prev) => ({ ...prev, contact_id: e.target.value }))}
                style={inputStyle}
              >
                <option value="">— Ingen kontakt —</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </label>
          )}

          <div style={{ marginTop: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#555', marginBottom: 8 }}>Aktivitetstype *</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {activityTypes.map((at) => (
                <button
                  key={at.key}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, activity_type: at.key }))}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 20,
                    fontSize: 13,
                    fontWeight: 600,
                    border: form.activity_type === at.key ? '2px solid #1a1a2e' : '1px solid #ddd',
                    backgroundColor: form.activity_type === at.key ? '#1a1a2e' : '#fff',
                    color: form.activity_type === at.key ? '#fff' : '#555',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                  }}
                >
                  {at.label}
                </button>
              ))}
            </div>
          </div>

          <label style={{ ...labelStyle, marginTop: 16 }}>
            Note (valgfri)
            <textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Tilføj en note..."
              style={{ ...inputStyle, resize: 'vertical' }}
            />
          </label>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Annuller</button>
            <button type="submit" disabled={saving} style={saveBtnStyle}>
              {saving ? 'Gemmer...' : 'Gem log'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = {
  position: 'fixed',
  top: 0, left: 0, right: 0, bottom: 0,
  backgroundColor: 'rgba(0,0,0,0.4)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle = {
  backgroundColor: '#fff',
  borderRadius: 10,
  padding: 28,
  width: '100%',
  maxWidth: 520,
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  fontSize: 13,
  fontWeight: 600,
  color: '#555',
  gap: 4,
};

const inputStyle = {
  padding: '9px 12px',
  border: '1px solid #ddd',
  borderRadius: 6,
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
};

const dropdownStyle = {
  position: 'absolute',
  top: '100%',
  left: 0,
  right: 0,
  backgroundColor: '#fff',
  border: '1px solid #ddd',
  borderRadius: 6,
  maxHeight: 200,
  overflowY: 'auto',
  zIndex: 10,
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
};

const cancelBtnStyle = {
  padding: '10px 20px',
  border: '1px solid #ddd',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
  backgroundColor: '#fff',
};

const saveBtnStyle = {
  padding: '10px 20px',
  border: 'none',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 600,
  backgroundColor: '#1a1a2e',
  color: '#fff',
};
