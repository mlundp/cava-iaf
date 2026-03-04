import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const actionLabels = {
  ring: { bg: '#eff6ff', color: '#2563eb', border: '#bfdbfe' },
  'send email': { bg: '#eef2ff', color: '#4338ca', border: '#c7d2fe' },
  'book møde': { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0' },
  'følg op': { bg: '#fffbeb', color: '#d97706', border: '#fde68a' },
};

function getActionStyle(action) {
  if (!action) return { bg: '#f8fafc', color: '#374151', border: '#e2e8f0' };
  const key = action.toLowerCase();
  for (const [k, v] of Object.entries(actionLabels)) {
    if (key.includes(k)) return v;
  }
  return { bg: '#f8fafc', color: '#374151', border: '#e2e8f0' };
}

export default function Medhjælperen() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});    // taskId -> 'reasoning' | 'email' | null
  const [snoozeTask, setSnoozeTask] = useState(null);
  const [snoozeDate, setSnoozeDate] = useState('');
  const [editedEmails, setEditedEmails] = useState({});
  const navigate = useNavigate();

  const fetchTasks = async () => {
    const { data, error: fetchError } = await supabase
      .from('tasks')
      .select('*, companies(id, name), contacts(name)')
      .in('status', ['pending', 'snoozed'])
      .order('created_at', { ascending: false });
    if (!fetchError) setTasks(data || []);
    setLoading(false);
  };

  useEffect(() => { fetchTasks(); }, []);

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    try {
      const resp = await fetch(`${API_URL}/api/ai/tasks`, { method: 'POST' });
      const data = await resp.json();
      if (!resp.ok) {
        setError(data.error || 'Kunne ikke generere opgaver.');
      } else {
        await fetchTasks();
      }
    } catch {
      setError('Netværksfejl — kunne ikke kontakte serveren.');
    } finally {
      setGenerating(false);
    }
  };

  const handleUpdateStatus = async (taskId, status, snoozeUntil) => {
    try {
      const resp = await fetch(`${API_URL}/api/ai/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, snooze_until: snoozeUntil || undefined }),
      });
      if (resp.ok) {
        setTasks((prev) => prev.filter((t) => {
          if (t.id !== taskId) return true;
          if (status === 'snoozed') {
            t.status = 'snoozed';
            t.snooze_until = snoozeUntil;
            return true;
          }
          return false; // remove done/cancelled from view
        }));
        setSnoozeTask(null);
        setSnoozeDate('');
      }
    } catch {
      setError('Kunne ikke opdatere opgave.');
    }
  };

  const toggleExpand = (taskId, section) => {
    setExpanded((prev) => ({
      ...prev,
      [taskId]: prev[taskId] === section ? null : section,
    }));
  };

  const pendingTasks = tasks.filter((t) => t.status === 'pending');
  const snoozedTasks = tasks.filter((t) => t.status === 'snoozed');

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#0f172a' }}>Medhjælperen</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#94a3b8' }}>
            Din AI-assistent til salg og outreach
          </p>
        </div>
        <button
          onClick={handleGenerate}
          disabled={generating}
          style={{ ...primaryBtnStyle, opacity: generating ? 0.7 : 1 }}
        >
          {generating ? 'Claude tænker...' : 'Generer nye opgaver'}
        </button>
      </div>

      {error && <p style={errorStyle}>{error}</p>}

      {loading ? (
        <p style={{ color: '#94a3b8', fontSize: 14 }}>Indlæser opgaver...</p>
      ) : pendingTasks.length === 0 && snoozedTasks.length === 0 ? (
        <div style={{ ...cardStyle, padding: 48, textAlign: 'center' }}>
          <p style={{ fontSize: 28, margin: '0 0 12px' }}>🤖</p>
          <p style={{ color: '#64748b', fontSize: 15, margin: 0, fontWeight: 500 }}>
            Ingen opgaver endnu.
          </p>
          <p style={{ color: '#94a3b8', fontSize: 13, margin: '6px 0 0' }}>
            Klik "Generer nye opgaver" for at lade AI analysere din CRM-data.
          </p>
        </div>
      ) : (
        <>
          {pendingTasks.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <h3 style={sectionHeadingStyle}>
                Ventende opgaver
                <span style={countBadge}>{pendingTasks.length}</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {pendingTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    expanded={expanded[task.id]}
                    editedEmail={editedEmails[task.id]}
                    onToggle={(section) => toggleExpand(task.id, section)}
                    onEmailChange={(val) => setEditedEmails((p) => ({ ...p, [task.id]: val }))}
                    onDone={() => handleUpdateStatus(task.id, 'done')}
                    onSnooze={() => { setSnoozeTask(task.id); setSnoozeDate(''); }}
                    onCancel={() => handleUpdateStatus(task.id, 'cancelled')}
                    navigate={navigate}
                  />
                ))}
              </div>
            </div>
          )}

          {snoozedTasks.length > 0 && (
            <div>
              <h3 style={sectionHeadingStyle}>
                Udskudte opgaver
                <span style={{ ...countBadge, backgroundColor: '#fef3c7', color: '#d97706' }}>{snoozedTasks.length}</span>
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {snoozedTasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    expanded={expanded[task.id]}
                    editedEmail={editedEmails[task.id]}
                    onToggle={(section) => toggleExpand(task.id, section)}
                    onEmailChange={(val) => setEditedEmails((p) => ({ ...p, [task.id]: val }))}
                    onDone={() => handleUpdateStatus(task.id, 'done')}
                    onSnooze={() => { setSnoozeTask(task.id); setSnoozeDate(''); }}
                    onCancel={() => handleUpdateStatus(task.id, 'cancelled')}
                    navigate={navigate}
                    isSnoozed
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Snooze date picker modal */}
      {snoozeTask && (
        <div style={overlayStyle} onClick={() => setSnoozeTask(null)}>
          <div style={snoozeModalStyle} onClick={(e) => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>
              Udskyd opgave
            </h3>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, fontWeight: 600, color: '#374151' }}>
              Udskyd til dato
              <input
                type="date"
                value={snoozeDate}
                onChange={(e) => setSnoozeDate(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                style={dateInputStyle}
              />
            </label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 20 }}>
              <button onClick={() => setSnoozeTask(null)} style={cancelBtnStyle}>Annuller</button>
              <button
                disabled={!snoozeDate}
                onClick={() => handleUpdateStatus(snoozeTask, 'snoozed', snoozeDate)}
                style={{ ...snoozeBtnStyle, opacity: snoozeDate ? 1 : 0.5 }}
              >
                Udskyd
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TaskCard({ task, expanded, editedEmail, onToggle, onEmailChange, onDone, onSnooze, onCancel, navigate, isSnoozed }) {
  const ac = getActionStyle(task.suggested_action);
  const emailContent = editedEmail !== undefined ? editedEmail : (task.email_draft || '');

  return (
    <div style={cardStyle}>
      <div style={{ padding: '18px 20px' }}>
        {/* Header row */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
              {task.suggested_action && (
                <span style={{
                  padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                  backgroundColor: ac.bg, color: ac.color, border: `1px solid ${ac.border}`,
                }}>
                  {task.suggested_action}
                </span>
              )}
              {task.companies?.name && (
                <span
                  onClick={() => navigate(`/kontakter/${task.companies.id}`)}
                  style={{ fontSize: 14, fontWeight: 600, color: '#6366f1', cursor: 'pointer' }}
                >
                  {task.companies.name}
                </span>
              )}
              {task.contacts?.name && (
                <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>
                  → {task.contacts.name}
                </span>
              )}
            </div>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: '#0f172a' }}>
              {task.title}
            </p>
            {isSnoozed && task.snooze_until && (
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#d97706' }}>
                Udskudt til {new Date(task.snooze_until).toLocaleDateString('da-DK')}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <button onClick={onDone} style={actionBtnDone} title="Markér som udført">Udført</button>
            <button onClick={onSnooze} style={actionBtnSnooze} title="Udskyd">Udskyd</button>
            <button onClick={onCancel} style={actionBtnCancel} title="Annuller">Annuller</button>
          </div>
        </div>

        {/* Expandable sections */}
        <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
          {task.reasoning && (
            <button
              onClick={() => onToggle('reasoning')}
              style={{ ...expandBtnStyle, backgroundColor: expanded === 'reasoning' ? '#eef2ff' : '#f8fafc' }}
            >
              {expanded === 'reasoning' ? 'Skjul begrundelse' : 'Vis begrundelse'}
            </button>
          )}
          {task.email_draft && (
            <button
              onClick={() => onToggle('email')}
              style={{ ...expandBtnStyle, backgroundColor: expanded === 'email' ? '#eef2ff' : '#f8fafc' }}
            >
              {expanded === 'email' ? 'Skjul email-udkast' : 'Vis email-udkast'}
            </button>
          )}
        </div>

        {/* Expanded reasoning */}
        {expanded === 'reasoning' && task.reasoning && (
          <div style={expandedContentStyle}>
            <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.7 }}>
              {task.reasoning}
            </p>
          </div>
        )}

        {/* Expanded email draft */}
        {expanded === 'email' && task.email_draft && (
          <div style={expandedContentStyle}>
            <textarea
              value={emailContent}
              onChange={(e) => onEmailChange(e.target.value)}
              rows={8}
              style={emailTextareaStyle}
            />
            <button
              onClick={() => {
                navigator.clipboard.writeText(emailContent);
              }}
              style={{ ...expandBtnStyle, marginTop: 8, backgroundColor: '#eef2ff' }}
            >
              Kopiér til udklipsholder
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Styles ── */

const primaryBtnStyle = {
  backgroundColor: '#6366f1',
  color: '#fff',
  border: 'none',
  padding: '9px 18px',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
  transition: 'background-color 0.15s ease',
};

const cardStyle = {
  backgroundColor: '#fff',
  borderRadius: 10,
  overflow: 'hidden',
  boxShadow: '0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06)',
  border: '1px solid rgba(0,0,0,0.06)',
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

const sectionHeadingStyle = {
  fontSize: 13,
  fontWeight: 700,
  color: '#64748b',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  margin: '0 0 12px',
  display: 'flex',
  alignItems: 'center',
  gap: 8,
};

const countBadge = {
  fontSize: 11,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 20,
  backgroundColor: '#eef2ff',
  color: '#6366f1',
};

const actionBtnBase = {
  padding: '6px 12px',
  borderRadius: 6,
  cursor: 'pointer',
  fontSize: 12,
  fontWeight: 600,
  fontFamily: 'inherit',
  transition: 'all 0.15s ease',
};

const actionBtnDone = {
  ...actionBtnBase,
  backgroundColor: '#ecfdf5',
  color: '#059669',
  border: '1px solid #a7f3d0',
};

const actionBtnSnooze = {
  ...actionBtnBase,
  backgroundColor: '#fffbeb',
  color: '#d97706',
  border: '1px solid #fde68a',
};

const actionBtnCancel = {
  ...actionBtnBase,
  backgroundColor: '#f8fafc',
  color: '#94a3b8',
  border: '1px solid #e2e8f0',
};

const expandBtnStyle = {
  background: 'none',
  border: '1px solid #e2e8f0',
  borderRadius: 6,
  padding: '5px 10px',
  fontSize: 12,
  fontWeight: 500,
  cursor: 'pointer',
  color: '#6366f1',
  fontFamily: 'inherit',
  transition: 'background-color 0.15s ease',
};

const expandedContentStyle = {
  marginTop: 12,
  padding: 14,
  backgroundColor: '#f8fafc',
  borderRadius: 8,
  border: '1px solid #f1f5f9',
};

const emailTextareaStyle = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 13,
  fontFamily: 'inherit',
  color: '#0f172a',
  lineHeight: 1.7,
  resize: 'vertical',
  outline: 'none',
  boxSizing: 'border-box',
};

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

const snoozeModalStyle = {
  backgroundColor: '#fff',
  borderRadius: 12,
  padding: 24,
  width: 320,
  boxShadow: '0 24px 48px rgba(0,0,0,0.12)',
  border: '1px solid rgba(0,0,0,0.06)',
};

const dateInputStyle = {
  padding: '10px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  fontFamily: 'inherit',
  color: '#0f172a',
};

const cancelBtnStyle = {
  padding: '9px 16px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#fff',
  color: '#374151',
  fontFamily: 'inherit',
};

const snoozeBtnStyle = {
  padding: '9px 16px',
  border: 'none',
  borderRadius: 8,
  cursor: 'pointer',
  fontSize: 13,
  fontWeight: 600,
  backgroundColor: '#f59e0b',
  color: '#fff',
  fontFamily: 'inherit',
};
