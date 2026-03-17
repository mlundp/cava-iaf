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

    // Fetch invoice list to determine which contacts have invoices
    const invoices = await fetchAllPages(authHeader, '/invoices?fields=ContactGuid&pageSize=1000');
    const invoiceContactGuids = new Set();
    for (const inv of invoices) {
      const guid = inv.ContactGuid || inv.contactGuid;
      if (guid) invoiceContactGuids.add(guid);
    }
    console.log('[Sync] Contacts with invoices:', invoiceContactGuids.size);

    let companiesUpserted = 0;
    let contactsSkipped = 0;
    let invoicesUpserted = 0;

    // Map of dinero contact guid -> supabase company id
    const contactIdMap = {};

    // Upsert contacts as companies — only those with invoices
    if (dineroContacts.length > 0) {
      console.log('[Sync] First contact sample:', JSON.stringify(dineroContacts[0]));
    }
    for (const contact of dineroContacts) {
      const contactGuid = contact.ContactGuid || contact.contactGuid;
      const name = contact.Name || contact.name;
      if (!contactGuid || !name) continue;

      // Skip contacts that have no invoices
      if (!invoiceContactGuids.has(contactGuid)) {
        contactsSkipped++;
        continue;
      }

      // Check if company already exists
      const { data: existing } = await db
        .from('companies')
        .select('id')
        .eq('dinero_contact_id', contactGuid)
        .maybeSingle();

      let companyId;
      if (existing) {
        // Only update name — preserve manually set type, status, etc.
        const { error } = await db
          .from('companies')
          .update({ name })
          .eq('id', existing.id);

        if (error) {
          console.error('[Sync] Update error:', error.message, error.details);
          continue;
        }
        console.log('[Sync] Updated existing company:', name);
        companyId = existing.id;
      } else {
        // Insert new company with defaults
        const { data: inserted, error } = await db
          .from('companies')
          .insert({ dinero_contact_id: contactGuid, name, type: 'canvas', status: 'cold' })
          .select('id')
          .single();

        if (error) {
          console.error('[Sync] Insert error:', error.message, error.details);
          continue;
        }
        console.log('[Sync] Inserted new company:', name);
        companyId = inserted?.id;
      }

      if (companyId) {
        contactIdMap[contactGuid] = companyId;
        companiesUpserted++;
      }
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

// POST /api/dinero/sync-invoices/:contactGuid
router.post('/sync-invoices/:contactGuid', async (req, res) => {
  try {
    const db = getSupabase();
    const authHeader = await getDineroAuthHeader();
    const { contactGuid } = req.params;

    console.log('[InvoiceSync] Fetching invoices for contactGuid:', contactGuid);

    // Step 1: Fetch invoice list (returns Guid, ContactName, Date, Description)
    const allInvoices = await fetchAllPages(authHeader, '/invoices');
    console.log('[InvoiceSync] Total invoices fetched:', allInvoices.length);

    // Step 2: Get company name from Supabase for pre-filtering
    const { data: company } = await db
      .from('companies')
      .select('id, name')
      .eq('dinero_contact_id', contactGuid)
      .maybeSingle();

    const companyName = company?.name;

    // Step 3: Pre-filter by ContactName to avoid fetching details for all invoices
    const filtered = companyName
      ? allInvoices.filter(inv => {
          const name = inv.ContactName || inv.contactName || '';
          return name === companyName;
        })
      : allInvoices;
    console.log('[InvoiceSync] Invoices after name pre-filter:', filtered.length);

    // Step 4: Fetch detail only for pre-filtered invoices to get ContactGuid and TotalExclVat
    const matchingInvoices = [];
    for (const inv of filtered) {
      const guid = inv.Guid || inv.guid;
      if (!guid) continue;

      const detailRes = await axios.get(
        `${DINERO_BASE}/${DINERO_ORG_ID}/invoices/${guid}`,
        { headers: { 'Authorization': authHeader } }
      );
      const detail = detailRes.data;

      if (detail.ContactGuid === contactGuid) {
        matchingInvoices.push(detail);
      }
    }

    console.log('[InvoiceSync] Matching invoices found:', matchingInvoices.length);

    // Step 4: Sum TotalExclVat and find most recent Date
    let totalExclVat = 0;
    let latestDate = null;

    for (const detail of matchingInvoices) {
      totalExclVat += Number(detail.TotalExclVat || 0);

      const invoiceDate = detail.Date || null;
      if (invoiceDate && (!latestDate || invoiceDate > latestDate)) {
        latestDate = invoiceDate;
      }
    }

    // Step 6: Update company in Supabase
    const updateData = {
      total_invoiced_dkk: totalExclVat,
      last_invoice_date: latestDate,
    };
    if (totalExclVat > 0) {
      updateData.type = 'client';
    }

    if (company) {
      await db.from('companies').update(updateData).eq('id', company.id);
      console.log('[InvoiceSync] Updated company:', company.name, 'total:', totalExclVat);
    } else {
      console.log('[InvoiceSync] No company found for contactGuid:', contactGuid);
    }

    // Step 7: Return results
    res.json({
      success: true,
      total_invoiced_dkk: totalExclVat,
      last_invoice_date: latestDate,
      invoices_count: matchingInvoices.length,
    });
  } catch (err) {
    console.error('[InvoiceSync] ERROR:', err.message, err.stack);
    const detail = err.response?.data;
    const errorMsg = typeof detail === 'string' ? detail
      : detail?.message || detail?.error_description || detail?.error || err.message;
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// GET /api/dinero/contacts/:contactGuid
router.get('/contacts/:contactGuid', async (req, res) => {
  try {
    const { contactGuid } = req.params;
    console.log('[DineroContact] Fetching contact:', contactGuid);

    const authHeader = await getDineroAuthHeader();
    const { data } = await axios.get(
      `${DINERO_BASE}/${DINERO_ORG_ID}/contacts/${contactGuid}`,
      { headers: { 'Authorization': authHeader } }
    );

    res.json({
      success: true,
      Name: data.Name,
      Email: data.Email,
      Phone: data.Phone,
      ExternalReference: data.ExternalReference,
    });
  } catch (err) {
    console.error('[DineroContact] ERROR:', err.message);
    const detail = err.response?.data;
    const errorMsg = typeof detail === 'string' ? detail
      : detail?.message || detail?.error_description || detail?.error || err.message;
    res.status(500).json({ success: false, error: errorMsg });
  }
});

// GET /api/dinero/status
router.get('/status', (_req, res) => {
  res.json({
    last_sync: lastSyncTime,
  });
});

export default router;
