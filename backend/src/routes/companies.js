import { Router } from 'express';
import { createClient } from '@supabase/supabase-js';

const router = Router();

let _supabase;
function getSupabase() {
  if (!_supabase) {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    _supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
  }
  return _supabase;
}

// GET /api/companies/:companyId/log
router.get('/:companyId/log', async (req, res) => {
  try {
    const db = getSupabase();
    const { companyId } = req.params;

    const { data, error } = await db
      .from('log_entries')
      .select('*, contacts(name)')
      .eq('company_id', companyId)
      .order('occurred_at', { ascending: false });

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, entries: data || [] });
  } catch (err) {
    console.error('[CompanyLog] GET error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/companies/:companyId/log
router.post('/:companyId/log', async (req, res) => {
  try {
    const db = getSupabase();
    const { companyId } = req.params;
    const { activity_type, notes, occurred_at, attachments, logged_by } = req.body;

    const payload = {
      company_id: companyId,
      activity_type,
      notes: notes || null,
      occurred_at: occurred_at || new Date().toISOString(),
      attachments: attachments || [],
      logged_by: logged_by || null,
    };

    const { data, error } = await db
      .from('log_entries')
      .insert(payload)
      .select('*, contacts(name)')
      .single();

    if (error) {
      return res.status(500).json({ success: false, error: error.message });
    }

    res.json({ success: true, entry: data });
  } catch (err) {
    console.error('[CompanyLog] POST error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
