import { Router } from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const DINERO_API_KEY = process.env.DINERO_API_KEY;
const DINERO_CLIENT_ID = process.env.DINERO_CLIENT_ID;
const DINERO_CLIENT_SECRET = process.env.DINERO_CLIENT_SECRET;
const DINERO_ORG_ID = process.env.DINERO_ORGANISATION_ID || '175405';
const DINERO_BASE = 'https://api.dinero.dk/v1';
const DINERO_AUTH_URL = 'https://authz.dinero.dk/dineroapi/oauth/token';

// Startup check: verify credentials are loaded from environment
console.log('[Dinero config] DINERO_CLIENT_ID:', DINERO_CLIENT_ID ? `${DINERO_CLIENT_ID.slice(0, 4)}...` : 'NOT SET');
console.log('[Dinero config] DINERO_CLIENT_SECRET:', DINERO_CLIENT_SECRET ? `${DINERO_CLIENT_SECRET.slice(0, 4)}...` : 'NOT SET');
console.log('[Dinero config] DINERO_API_KEY:', DINERO_API_KEY ? `${DINERO_API_KEY.slice(0, 4)}...` : 'NOT SET');
console.log('[Dinero config] DINERO_ORG_ID:', DINERO_ORG_ID);

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

let lastSyncTime = null;
let cachedToken = null;
let tokenExpiresAt = null;

// Obtain an OAuth access token using grant_type=password
async function getDineroAuthHeader() {
  // Return cached token if still valid (with 60s buffer)
  if (cachedToken && tokenExpiresAt && Date.now() < tokenExpiresAt - 60000) {
    return `Bearer ${cachedToken}`;
  }

  const basicAuth = Buffer.from(`${DINERO_CLIENT_ID}:${DINERO_CLIENT_SECRET}`).toString('base64');
  const requestBody = `grant_type=password&scope=read%20write&username=${encodeURIComponent(DINERO_API_KEY)}&password=${encodeURIComponent(DINERO_API_KEY)}`;

  console.log('[Dinero auth] Requesting token via grant_type=password...');
  console.log('[Dinero auth] URL:', DINERO_AUTH_URL);
  console.log('[Dinero auth] Basic auth string:', basicAuth);
  console.log('[Dinero auth] Request body:', requestBody);

  let response;
  try {
    response = await axios.post(DINERO_AUTH_URL, requestBody, {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
  } catch (err) {
    console.error('[Dinero auth] Token request FAILED:', {
      status: err.response?.status,
      statusText: err.response?.statusText,
      headers: err.response?.headers,
      data: err.response?.data,
    });
    throw err;
  }

  console.log('[Dinero auth] Token response status:', response.status);
  console.log('[Dinero auth] Token response headers:', response.headers);
  console.log('[Dinero auth] Token response data keys:', Object.keys(response.data));

  const { data } = response;
  cachedToken = data.access_token;
  // Cache token for its lifetime (expires_in is in seconds)
  if (data.expires_in) {
    tokenExpiresAt = Date.now() + data.expires_in * 1000;
  }
  console.log('[Dinero auth] Token obtained successfully, expires_in:', data.expires_in);

  return `Bearer ${cachedToken}`;
}

// Fetch all pages from a paginated Dinero endpoint
async function fetchAllPages(authHeader, path) {
  const results = [];
  let page = 0;
  const pageSize = 250;

  while (true) {
    const separator = path.includes('?') ? '&' : '?';
    const url = `${DINERO_BASE}/${DINERO_ORG_ID}${path}${separator}page=${page}&pageSize=${pageSize}`;
    const { data } = await axios.get(url, {
      headers: { 'Authorization': authHeader },
    });

    const items = data.Collection || data.collection || data;
    if (Array.isArray(items)) {
      results.push(...items);
    }

    const totalPages = data.Pagination?.TotalPages ?? data.pagination?.totalPages ?? 1;
    page++;
    if (page >= totalPages) break;
  }

  return results;
}

// GET /api/dinero/sync
router.get('/sync', async (_req, res) => {
  try {
    const db = getSupabase();
    const authHeader = await getDineroAuthHeader();

    console.log('[Sync] Starting contact fetch...');
    // Fetch contacts (debtors only) from Dinero
    const dineroContacts = await fetchAllPages(authHeader, '/contacts?isDebtor=true');
    console.log('[Sync] Contacts fetched:', dineroContacts.length, 'debtors');

    let companiesUpserted = 0;
    let contactsSkipped = 0;
    let invoicesUpserted = 0;

    // Map of dinero contact guid -> supabase company id
    const contactIdMap = {};

    // Upsert contacts as companies — only customers (IsDebtor)
    for (const contact of dineroContacts) {
      const contactGuid = contact.ContactGuid || contact.contactGuid;
      const name = contact.Name || contact.name;
      if (!contactGuid || !name) continue;

      // Only sync customers (debitors), skip suppliers and others
      const isDebtor = contact.IsDebtor ?? contact.isDebtor ?? contact.IsDebitor ?? contact.isDebitor ?? false;
      if (!isDebtor) {
        contactsSkipped++;
        continue;
      }

      const companyData = {
        dinero_contact_id: contactGuid,
        name,
      };

      // Check if company already exists
      const { data: existing } = await db
        .from('companies')
        .select('id, type')
        .eq('dinero_contact_id', contactGuid)
        .maybeSingle();

      let companyId;
      if (existing) {
        // Update name only
        await db
          .from('companies')
          .update({ name: companyData.name })
          .eq('id', existing.id);
        companyId = existing.id;
      } else {
        // Insert new company
        const { data: inserted } = await db
          .from('companies')
          .insert({
            ...companyData,
            type: 'canvas',
            status: 'cold',
          })
          .select('id')
          .single();
        companyId = inserted?.id;
      }

      if (companyId) {
        contactIdMap[contactGuid] = companyId;
        companiesUpserted++;
      }
    }

    // Test with one invoice: fetch detail and update matching company
    console.log('[Sync] Starting single invoice test...');
    const testGuid = '45f3216f-5674-4396-b82a-1d2b6eaeae74';
    const detailRes = await axios.get(
      `${DINERO_BASE}/${DINERO_ORG_ID}/invoices/${testGuid}`,
      { headers: { 'Authorization': authHeader } }
    );
    const detail = detailRes.data;
    console.log('[Debug] Invoice detail:', JSON.stringify(detail, null, 2));

    // Find matching company in Supabase
    const { data: matchedCompany } = await db
      .from('companies')
      .select('id, name')
      .eq('dinero_contact_id', detail.ContactGuid)
      .maybeSingle();

    if (matchedCompany) {
      await db
        .from('companies')
        .update({
          total_invoiced_dkk: detail.TotalExclVat,
          last_invoice_date: detail.Date,
          type: 'client',
        })
        .eq('id', matchedCompany.id);
      invoicesUpserted = 1;
      console.log('[Sync] Updated company:', matchedCompany.name, 'total:', detail.TotalExclVat);
    } else {
      console.log('[Sync] No matching company found for ContactGuid:', detail.ContactGuid);
    }

    console.log('[Sync] Upsert complete');

    lastSyncTime = new Date().toISOString();

    res.json({
      success: true,
      synced_at: lastSyncTime,
      companies_synced: companiesUpserted,
      contacts_skipped_non_customer: contactsSkipped,
      invoices_synced: invoicesUpserted,
    });
  } catch (err) {
    console.error('[Sync] FATAL ERROR:', err.message, err.stack);
    console.error('Dinero sync error:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    const detail = err.response?.data;
    const errorMsg = typeof detail === 'string' ? detail
      : detail?.message || detail?.error_description || detail?.error || err.message;
    res.status(500).json({
      success: false,
      error: errorMsg,
    });
  }
});

// GET /api/dinero/status
router.get('/status', (_req, res) => {
  res.json({
    last_sync: lastSyncTime,
  });
});

export default router;
