import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const initialState = {
  name: '', type: 'canvas', status: 'warm', cvr_number: '', industry: '',
  employee_count: '', address: '', ownership: '', notes: '',
};

export default function CompanyForm({ company, onClose, onSaved }) {
  const isEdit = !!company;
  const [form, setForm] = useState(
    isEdit ? {
      name: company.name || '', type: company.type || 'canvas', status: company.status || 'warm',
      cvr_number: company.cvr_number || '', industry: company.industry || '',
      employee_count: company.employee_count ?? '', address: company.address || '',
      ownership: company.ownership || '', notes: company.notes || '',
    } : initialState
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [cvrLoading, setCvrLoading] = useState(false);
  const [showNameSearch, setShowNameSearch] = useState(false);
  const [nameQuery, setNameQuery] = useState('');
  const [nameSearchLoading, setNameSearchLoading] = useState(false);
  const [nameSearchResults, setNameSearchResults] = useState([]);

  const isCvrValid = /^\d{8}$/.test(form.cvr_number);

  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onClose]);

  const handleCvrLookup = async () => {
    if (!isCvrValid) return;
    setCvrLoading(true); setError('');
    try {
      const res = await fetch(`${API_URL}/api/cvr/${form.cvr_number}`);
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Kunne ikke hente CVR-data.'); setCvrLoading(false); return; }
      setForm((p) => ({ ...p, name: data.name || p.name, industry: data.industry || p.industry, employee_count: data.employee_count ?? p.employee_count, address: data.address || p.address, ownership: data.ownership || p.ownership }));
    } catch { setError('Netv\u00e6rksfejl \u2014 kunne ikke kontakte CVR-serveren.'); }
    finally { setCvrLoading(false); }
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
        setError(data.error || 'Kunne ikke s\u00f8ge p\u00e5 navn.');
        setNameSearchLoading(false);
        return;
      }
      setNameSearchResults(Array.isArray(data) ? data : []);
    } catch {
      setError('Netv\u00e6rksfejl \u2014 kunne ikke kontakte CVR-serveren.');
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

  const handleChange = (e) => { const { name, value } = e.target; setForm((p) => ({ ...p, [name]: value })); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Navn er p\u00e5kr\u00e6vet.'); return; }
    setSaving(true); setError('');
    const payload = {
      name: form.name.trim(), type: form.type, status: form.status,
      cvr_number: form.cvr_number.trim() || null, industry: form.industry.trim() || null,
      employee_count: form.employee_count ? parseInt(form.employee_count, 10) : null,
      address: form.address.trim() || null, ownership: form.ownership.trim() || null,
      notes: form.notes.trim() || null,
    };
    let result;
    if (isEdit) result = await supabase.from('companies').update(payload).eq('id', company.id);
    else result = await supabase.from('companies').insert(payload);
    if (result.error) { setError(result.error.message); setSaving(false); }
    else onSaved();
  };

  return (
    <div className="cava-overlay" style={overlayStyle} onClick={onClose}>
      <div className="cava-modal" style={modalStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>
            {isEdit ? 'Rediger virksomhed' : 'Tilf\u00f8j virksomhed'}
          </h2>
          <button onClick={onClose} style={closeBtnStyle}>\u00d7</button>
        </div>

        {error && <p style={errorStyle}>{error}</p>}

        <form onSubmit={handleSubmit}>
          <div style={fieldGrid}>
            <label style={labelStyle}>Navn *<input name="name" value={form.name} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Type
              <select name="type" value={form.type} onChange={handleChange} style={inputStyle}>
                <option value="canvas">Canvas</option><option value="client">Klient</option>
              </select>
            </label>
            <label style={labelStyle}>Status
              <select name="status" value={form.status} onChange={handleChange} style={inputStyle}>
                <option value="hot">Hot</option><option value="warm">Warm</option><option value="cold">Cold</option>
              </select>
            </label>
            <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
              CVR-nummer
              <div style={{ display: 'flex', gap: 8 }}>
                <input name="cvr_number" value={form.cvr_number} onChange={handleChange} style={{ ...inputStyle, flex: 1 }} placeholder="12345678" />
                <button type="button" disabled={!isCvrValid || cvrLoading} onClick={handleCvrLookup} style={{ ...cvrBtnStyle, opacity: (!isCvrValid || cvrLoading) ? 0.5 : 1 }}>
                  {cvrLoading ? 'Henter...' : 'Hent CVR-data'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowNameSearch((v) => !v)}
                  style={cvrBtnStyle}
                >
                  S\u00f8g p\u00e5 navn
                </button>
              </div>
              {showNameSearch && (
                <div style={{ marginTop: 8, padding: 12, backgroundColor: 'var(--bg-subtle)', borderRadius: 8, border: '1px solid var(--border)' }}>
                  <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                    <input
                      value={nameQuery}
                      onChange={(e) => setNameQuery(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleNameSearch(); } }}
                      placeholder="S\u00f8g p\u00e5 virksomhedsnavn..."
                      style={{ ...inputStyle, flex: 1, fontSize: 13 }}
                    />
                    <button
                      type="button"
                      disabled={!nameQuery.trim() || nameSearchLoading}
                      onClick={handleNameSearch}
                      style={{ ...cvrBtnStyle, opacity: (!nameQuery.trim() || nameSearchLoading) ? 0.5 : 1 }}
                    >
                      {nameSearchLoading ? 'S\u00f8ger...' : 'S\u00f8g'}
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
                          onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card-hover)')}
                          onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'var(--bg-card)')}
                        >
                          <span style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{r.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: 12 }}>CVR: {r.cvr_number}{r.city ? ` \u2014 ${r.city}` : ''}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {nameSearchResults.length === 0 && !nameSearchLoading && nameQuery.trim() && (
                    <p style={{ margin: 0, fontSize: 13, color: 'var(--text-faint)' }}>Ingen resultater.</p>
                  )}
                </div>
              )}
            </label>
            <label style={labelStyle}>Branche<input name="industry" value={form.industry} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Antal ansatte<input name="employee_count" type="number" value={form.employee_count} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Adresse<input name="address" value={form.address} onChange={handleChange} style={inputStyle} /></label>
            <label style={labelStyle}>Ejerskab<input name="ownership" value={form.ownership} onChange={handleChange} style={inputStyle} /></label>
            <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>Noter
              <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
            </label>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border-subtle)' }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Annuller</button>
            <button type="submit" disabled={saving} style={{ ...saveBtnStyle, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Gemmer...' : isEdit ? 'Gem \u00e6ndringer' : 'Opret'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

const overlayStyle = { position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--overlay-bg)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modalStyle = { backgroundColor: 'var(--bg-card)', borderRadius: 12, padding: 28, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--border-card)' };
const fieldGrid = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18 };
const labelStyle = { display: 'flex', flexDirection: 'column', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', gap: 6 };
const inputStyle = { padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, fontSize: 14, outline: 'none', fontFamily: 'inherit', color: 'var(--text)', backgroundColor: 'var(--bg-input)', transition: 'border-color 0.15s ease' };
const closeBtnStyle = { background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-faint)', width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background-color 0.15s ease' };
const errorStyle = { color: '#dc2626', fontSize: 13, margin: '0 0 16px', padding: '10px 14px', backgroundColor: '#fef2f2', borderRadius: 8, border: '1px solid #fecaca' };
const cancelBtnStyle = { padding: '10px 18px', border: '1px solid var(--border)', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, backgroundColor: 'var(--bg-card)', color: 'var(--text-secondary)', fontFamily: 'inherit', transition: 'all 0.15s ease' };
const cvrBtnStyle = { padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 600, backgroundColor: '#f0f9ff', color: '#0369a1', fontFamily: 'inherit', whiteSpace: 'nowrap', border: '1px solid #bae6fd', transition: 'all 0.15s ease' };
const searchResultStyle = { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2, padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', backgroundColor: 'var(--bg-card)', fontFamily: 'inherit', textAlign: 'left', transition: 'background-color 0.1s ease', width: '100%' };
const saveBtnStyle = { padding: '10px 18px', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, backgroundColor: 'var(--accent)', color: '#fff', fontFamily: 'inherit', transition: 'background-color 0.15s ease' };
