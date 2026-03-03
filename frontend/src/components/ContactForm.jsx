import { useState } from 'react';
import { supabase } from '../lib/supabase';

const initialState = {
  name: '',
  title: '',
  email: '',
  phone: '',
  is_primary: false,
  notes: '',
};

export default function ContactForm({ companyId, contact, onClose, onSaved }) {
  const isEdit = !!contact;
  const [form, setForm] = useState(
    isEdit
      ? {
          name: contact.name || '',
          title: contact.title || '',
          email: contact.email || '',
          phone: contact.phone || '',
          is_primary: contact.is_primary || false,
          notes: contact.notes || '',
        }
      : initialState
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
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
      company_id: companyId,
      name: form.name.trim(),
      title: form.title.trim() || null,
      email: form.email.trim() || null,
      phone: form.phone.trim() || null,
      is_primary: form.is_primary,
      notes: form.notes.trim() || null,
    };

    let result;
    if (isEdit) {
      result = await supabase.from('contacts').update(payload).eq('id', contact.id);
    } else {
      result = await supabase.from('contacts').insert(payload);
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
            {isEdit ? 'Rediger kontakt' : 'Tilføj kontakt'}
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
              Titel
              <input name="title" value={form.title} onChange={handleChange} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Email
              <input name="email" type="email" value={form.email} onChange={handleChange} style={inputStyle} />
            </label>
            <label style={labelStyle}>
              Telefon
              <input name="phone" value={form.phone} onChange={handleChange} style={inputStyle} />
            </label>
          </div>

          <label style={{
            display: 'flex', alignItems: 'center', gap: 10, marginTop: 20, fontSize: 14,
            cursor: 'pointer', color: '#374151', fontWeight: 500,
          }}>
            <input
              name="is_primary"
              type="checkbox"
              checked={form.is_primary}
              onChange={handleChange}
              style={{ width: 16, height: 16, accentColor: '#6366f1', cursor: 'pointer' }}
            />
            Primær kontakt
          </label>

          <label style={{ ...labelStyle, marginTop: 20 }}>
            Noter
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </label>

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
  maxWidth: 480,
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
