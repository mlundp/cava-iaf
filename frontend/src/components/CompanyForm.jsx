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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{isEdit ? 'Rediger virksomhed' : 'Tilføj virksomhed'}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#888' }}>×</button>
        </div>

        {error && <p style={{ color: '#dc2626', fontSize: 14, margin: '0 0 12px' }}>{error}</p>}

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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
            <button type="button" onClick={onClose} style={cancelBtnStyle}>Annuller</button>
            <button type="submit" disabled={saving} style={saveBtnStyle}>
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
  maxWidth: 560,
  maxHeight: '90vh',
  overflowY: 'auto',
  boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
};

const fieldGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
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
