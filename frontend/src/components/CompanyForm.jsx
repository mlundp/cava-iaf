import { useState } from 'react';
import { supabase } from '../lib/supabase';

const initialState = {
  name: '',
  type: 'canvas',
  status: 'warm',
  cvr_number: '',
  industry: '',
  employee_count: '',
  address: '',
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
          notes: company.notes || '',
        }
      : initialState
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

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
            <label style={labelStyle}>
              CVR-nummer
              <input name="cvr_number" value={form.cvr_number} onChange={handleChange} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Branche
              <input name="industry" value={form.industry} onChange={handleChange} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Antal ansatte
              <input name="employee_count" type="number" value={form.employee_count} onChange={handleChange} style={inputStyle} />
            </label>
            <label style={{ ...labelStyle, gridColumn: '1 / -1' }}>
              Adresse
              <input name="address" value={form.address} onChange={handleChange} style={inputStyle} />
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
