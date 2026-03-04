import { useState } from 'react';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const initialState = {
  name: '',
  type: 'canvas',
  status: 'warm',
  cvr_number: '',
  industry: '',
  employee_count: '',
  address: '',
  ownership: '',
  notes: '',
};

export default function CompanyForm({ company, onClose, onSaved }) {
  const isEdit = !!company;
  const [form, setForm] = useState(
    isEdit
      ? {
          name: company.name || '',
          type: company.type || 'canvas',
          status: company.status || 'warm',
          cvr_number: company.cvr_number || '',
          industry: company.industry || '',
          employee_count: company.employee_count ?? '',
          address: company.address || '',
          ownership: company.ownership || '',
          notes: company.notes || '',
        }
      : initialState
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cvrLoading, setCvrLoading] = useState(false);
  const [showNameSearch, setShowNameSearch] = useState(false);
  const [nameQuery, setNameQuery] = useState('');
  const [nameSearchLoading, setNameSearchLoading] = useState(false);
  const [nameSearchResults, setNameSearchResults] = useState([]);

  const isCvrValid = /^\d{8}$/.test(form.cvr_number);

  const handleCvrLookup = async () => {
    if (!isCvrValid) return;
    setCvrLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/cvr/${form.cvr_number}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Kunne ikke hente CVR-data.');
        setCvrLoading(false);
        return;
      }
      setForm((prev) => ({
        ...prev,
        name: data.name || prev.name,
        industry: data.industry || prev.industry,
        employee_count: data.employee_count ?? prev.employee_count,
        address: data.address || prev.address,
        ownership: data.ownership || prev.ownership,
      }));
    } catch {
      setError('Netværksfejl — kunne ikke kontakte CVR-serveren.');
    } finally {
      setCvrLoading(false);
    }
  };

  const handleNameSearch = async () => {
    if (!nameQuery.trim()) return;
    setNameSearchLoading(true);
    setNameSearchResults([]);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/cvr/search?q=${encodeURIComponent(nameQuery.trim())}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Kunne ikke søge på navn.');
        setNameSearchLoading(false);
        return;
      }
      setNameSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setError('Netværksfejl — kunne ikke kontakte CVR-serveren.');
    } finally {
      setNameSearchLoading(false);
    }
  };

  const selectSearchResult = (result) => {
    setForm((prev) => ({
      ...prev,
      cvr_number: result.cvr_number || prev.cvr_number,
      name: result.name || prev.name,
      industry: result.industry || prev.industry,
      employee_count: result.employee_count ?? prev.employee_count,
      address: result.address || prev.address,
      ownership: result.ownership || prev.ownership,
    }));
    setShowNameSearch(false);
    setNameQuery('');
    setNameSearchResults([]);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setError('Navn er påkrævet.');
      return;
    }
    setSaving(true);
    setError('');

    const payload = {
      name: form.name.trim(),
      type: form.type,
      status: form.status,
      cvr_number: form.cvr_number.trim() || null,
      industry: form.industry.trim() || null,
      employee_count: form.employee_count ? parseInt(form.employee_count, 10) : null,
      address: form.address.trim() || null,
      ownership: form.ownership.trim() || null,
      notes: form.notes.trim() || null,
    };

    let result;
    if (isEdit) {
      result = await supabase.from('companies').update(payload).eq('id', company.id);
    } else {
      result = await supabase.from('companies').insert(payload);
    }

    if (result.error) {
      setError(result.error.message);
      setSaving(false);
    } else {
      onSaved();
    }
  };

  return (
    <div style={overlayStyle} onClick={onClose}>
      <div style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0f172a' }}>
            {isEdit ? 'Rediger virksomhed' : 'Tilføj virksomhed'}
          </h2>
          <button onClick={onClose} style={closeBtnStyle}>×</button>
        </div>

        {error && <p style={errorStyle}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={fieldGrid}>
            <label style={labelStyle}>
              Navn *
              <input name="name" value={form.name} onChange={handleChange} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Type
              <select name="type" value={form.type} onChange={handleChange} style={inputStyle}>
                <option value="canvas">Canvas</option>
                <option value="client">Klient</option>
              </select>
            </label>
            <label style={labelStyle}>
              Status
              <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
                <option value="hot">Hot</option>
                <option value="warm">Warm</option>
                <option value="cold">Cold</option>
              </select>
            </label>
            <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
              CVR-nummer
              <div style={{ display: 'flex', gap: 8 }}>
                <input name="cvr_number" value={form.cvr_number} onChange={handleChange} style={{ ...inputStyle, flex: 1 }} placeholder="12345678" />
                <button
                  type="button"
                  disabled={!isCvrValid || cvrLoading}
                  onClick={handleCvrLookup}
                  style={{ ...cvrBtnStyle, opacity: (!isCvrValid || cvrLoading) ? 0.5 : 1 }}
                >
                  {cvrLoading ? 'Henter...' : 'Hent CVR-data'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNameSearch((v) => !v)}
                  style={cvrBtnStyle}
                >
                  Søg på navn
                </button>
              </div>
              {showNameSearch && (
                <div style={{ marginTop: 8, padding: 12, backgroundColor: '#f8fafc', borderRadius: 8, border: '1px solid #e2e8f0' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      value={nameQuery}
                      onChange={(e) => setNameQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNameSearch(); } }}
                      placeholder="Søg på virksomhedsnavn..."
                      style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                    />
                    <button
                      type="button"
                      disabled={!nameQuery.trim() || nameSearchLoading}
                      onClick={handleNameSearch}
                      style={{ ...cvrBtnStyle, opacity: (!nameQuery.trim() || nameSearchLoading) ? 0.5 : 1 }}
                    >
                      {nameSearchLoading ? 'Søger...' : 'Søg'}
                    </button>
                  </div>
                  {nameSearchResults.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {nameSearchResults.map((r, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => selectSearchResult(r)}
                          style={searchResultStyle}
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#eef2ff')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
                        >
                          <span style={{ fontWeight: 600, color: '#0f172a', fontSize: 13 }}>{r.name}</span>
                          <span style={{ color: '#64748b', fontSize: 12 }}>CVR: {r.cvr_number}{r.city ? ` — ${r.city}` : ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {nameSearchResults.length === 0 && !nameSearchLoading && nameQuery.trim() && (
                    <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>Ingen resultater.</p>
                  )}
                </div>
              )}
            </label>
            <label style={labelStyle}>
              Branche
              <input name="industry" value={form.industry} onChange={handleChange} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Antal ansatte
              <input name="employee_count" type="number" value={form.employee_count} onChange={handleChange} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Adresse
              <input name="address" value={form.address} onChange={handleChange} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Ejerskab
              <input name="ownership" value={form.ownership} onChange={handleChange} style={inputStyle} />
            </label>
            <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
              Noter
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </label>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid #f1f5f9' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Annuller</button>
            <button type="submit" disabled={saving} style={{ ...saveBtnStyle, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Gemmer...' : isEdit ? 'Gem ændringer' : 'Opret'}
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
  backgroundColor: 'rgba(15, 23, 42, 0.4)',
  backdropFilter: 'blur(4px)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
};

const modalStyle = {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 28,
  width: '100%',
  maxWidth: 560,
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 24px 48px rgba(0,0,0,0.12), 0 4px 12px rgba(0,0,0,0.08)',
  border: '1px solid rgba(0,0,0,0.06)',
};

const fieldGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 18,
};

const labelStyle = {
  display: 'flex',
  flexDirection: 'column',
  fontSize: 13,
  fontWeight: 600,
  color: '#374151',
  gap: 6,
};

const inputStyle = {
  padding: '10px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  outline: 'none',
  fontFamily: 'inherit',
  color: '#0f172a',
  backgroundColor: '#fff',
  transition: 'border-color 0.15s ease',
};

const closeBtnStyle = {
  background: 'none',
  border: 'none',
  fontSize: 20,
  cursor: 'pointer',
  color: '#94a3b8',
  width: 32,
  height: 32,
  borderRadius: 8,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'background-color 0.15s ease',
};

const errorStyle = {
  color: '#dc2626',
  fontSize: 13,
  margin: '0 0 16px',
  padding: '10px 14px',
  backgroundColor: '#fef2f2',
  borderRadius: 8,
  border: '1px solid #fecaca',
};

const cancelBtnStyle = {
  padding: '10px 18px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#fff',
  color: '#374151',
  fontFamily: 'inherit',
  transition: 'all 0.15s ease',
};

const cvrBtnStyle = {
  padding: '10px 14px',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  backgroundColor: '#f0f9ff',
  color: '#0369a1',
  fontFamily: 'inherit',
  whiteSpace: 'nowrap',
  border: '1px solid #bae6fd',
  transition: 'all 0.15s ease',
};

const searchResultStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'flex-start',
  gap: 2,
  padding: '8px 10px',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  cursor: 'pointer',
  backgroundColor: '#fff',
  fontFamily: 'inherit',
  textAlign: 'left',
  transition: 'background-color 0.1s ease',
  width: '100%',
};

const saveBtnStyle = {
  padding: '10px 18px',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#6366f1',
  color: '#fff',
  fontFamily: 'inherit',
  transition: 'background-color 0.15s ease',
};
