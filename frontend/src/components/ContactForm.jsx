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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 20 }}>{isEdit ? 'Rediger kontakt' : 'Tilføj kontakt'}</h2>
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

          <label style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 16, fontSize: 14, cursor: 'pointer' }}>
            <input name="is_primary" type="checkbox" checked={form.is_primary} onChange={handleChange} />
            Primær kontakt
          </label>

          <label style={{ ...labelStyle, marginTop: 16 }}>
            Noter
            <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
          </label>

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
  maxWidth: 480,
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
