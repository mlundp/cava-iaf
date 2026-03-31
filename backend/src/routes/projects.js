import { Router } from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const DINERO_ORG_ID = process.env.DINERO_ORGANISATION_ID || '175405';
const DINERO_BASE = 'https://api.dinero.dk/v1';
const DINERO_AUTH_URL = 'https://authz.dinero.dk/dineroapi/oauth/token';

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

let cachedToken = null;
let tokenExpiresAt = null;

async function getDineroAuthHeader() {
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 60000) {
    return `Bearer ${cachedToken}`;
  }
  const basicAuth = Buffer.from(`${process.env.DINERO_CLIENT_ID}:${process.env.DINERO_CLIENT_SECRET}`).toString('base64');
  const requestBody = `grant_type=password&scope=read%20write&username=${encodeURIComponent(process.env.DINERO_API_KEY)}&password=${encodeURIComponent(process.env.DINERO_API_KEY)}`;
  const response = await axios.post(DINERO_AUTH_URL, requestBody, {
    headers: { 'Authorization': `Basic ${basicAuth}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  cachedToken = response.data.access_token;
  if (response.data.expires_in) tokenExpiresAt = Date.now() + response.data.expires_in * 1000;
  return `Bearer ${cachedToken}`;
}

// Allowed columns that exist in the projects table
const ALLOWED_FIELDS = ['name', 'description', 'status', 'start_date', 'deadline', 'amount_dkk', 'cost_dkk', 'dinero_invoice_number', 'dinero_invoice_guid', 'invoice_date', 'booking_year', 'invoiced', 'cost_paid', 'client_paid'];

function pickFields(body) {
  const result = {};
  for (const key of ALLOWED_FIELDS) {
    if (key in body) result[key] = body[key];
  }
  return result;
}

// GET /api/projects - all projects with company name
router.get('/', async (_req, res) => {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('projects')
      .select('*, companies(id, name)')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, projects: data || [] });
  } catch (err) {
    console.error('[Projects] GET / error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/projects/company/:companyId - projects for a company
router.get('/company/:companyId', async (req, res) => {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('projects')
      .select('*')
      .eq('company_id', req.params.companyId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, projects: data || [] });
  } catch (err) {
    console.error('[Projects] GET /company error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/company/:companyId - create project with auto project_number
router.post('/company/:companyId', async (req, res) => {
  try {
    const db = getSupabase();
    const { companyId } = req.params;

    // Auto-generate project_number: L{N}
    const { data: existing } = await db
      .from('projects')
      .select('project_number')
      .not('project_number', 'is', null)
      .order('project_number', { ascending: false });

    let nextNum = 600;
    if (existing && existing.length > 0) {
      for (const p of existing) {
        const match = p.project_number?.match(/^L(\d+)$/);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num >= nextNum) nextNum = num + 1;
        }
      }
    }

    const project_number = `L${nextNum}`;

    const { data, error } = await db
      .from('projects')
      .insert({ ...pickFields(req.body), company_id: companyId, project_number })
      .select('*')
      .single();
    if (error) throw error;
    res.json({ success: true, project: data });
  } catch (err) {
    console.error('[Projects] POST error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// PATCH /api/projects/:id - update project
router.patch('/:id', async (req, res) => {
  try {
    const db = getSupabase();
    const { data, error } = await db
      .from('projects')
      .update(pickFields(req.body))
      .eq('id', req.params.id)
      .select('*')
      .single();
    if (error) throw error;
    res.json({ success: true, project: data });
  } catch (err) {
    console.error('[Projects] PATCH error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// DELETE /api/projects/:id - delete project
router.delete('/:id', async (req, res) => {
  try {
    const db = getSupabase();
    const { error } = await db
      .from('projects')
      .delete()
      .eq('id', req.params.id);
    if (error) throw error;
    res.json({ success: true });
  } catch (err) {
    console.error('[Projects] DELETE error:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/projects/:id/sync-dinero - check invoice status
router.post('/:id/sync-dinero', async (req, res) => {
  try {
    const db = getSupabase();
    const { data: project, error: fetchErr } = await db
      .from('projects')
      .select('dinero_invoice_guid')
      .eq('id', req.params.id)
      .single();
    if (fetchErr) throw fetchErr;
    if (!project?.dinero_invoice_guid) {
      return res.status(400).json({ success: false, error: 'Ingen Dinero faktura-GUID tilknyttet.' });
    }

    const authHeader = await getDineroAuthHeader();
    const { data: invoice } = await axios.get(
      `${DINERO_BASE}/${DINERO_ORG_ID}/invoices/${project.dinero_invoice_guid}`,
      { headers: { 'Authorization': authHeader } }
    );

    console.log('[ProjectSync] Invoice status:', invoice.Status);

    res.json({
      success: true,
      status: invoice.Status,
      amount: invoice.TotalExclVat,
    });
  } catch (err) {
    console.error('[ProjectSync] ERROR:', err.message);
    const detail = err.response?.data;
    const errorMsg = typeof detail === 'string' ? detail
      : detail?.message || detail?.error_description || detail?.error || err.message;
    res.status(500).json({ success: false, error: errorMsg });
  }
});

export default router;
