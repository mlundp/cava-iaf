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

    // Fetch invoices from Dinero (booked + paid)
    console.log('[Sync] Starting invoice fetch...');
    const [bookedInvoices, paidInvoices] = await Promise.all([
      fetchAllPages(authHeader, '/invoices/booked'),
      fetchAllPages(authHeader, '/invoices/paid'),
    ]);
    const dineroInvoices = [...bookedInvoices, ...paidInvoices];
    console.log('[Sync] Invoices fetched:', bookedInvoices.length, 'booked,', paidInvoices.length, 'paid');

    // Upsert invoices as projects and compute per-company totals
    const companyInvoiceTotals = {}; // companyId -> { total, lastDate }

    for (const invoice of dineroInvoices) {
      const invoiceGuid = invoice.Guid || invoice.guid;
      const contactGuid = invoice.ContactGuid || invoice.contactGuid;
      const companyId = contactIdMap[contactGuid];
      if (!invoiceGuid || !companyId) continue;

      const amount = invoice.TotalInclVat ?? invoice.totalInclVat ??
                     invoice.TotalAmount ?? invoice.totalAmount ??
                     invoice.TotalExclVat ?? invoice.totalExclVat ?? 0;
      const invoiceDate = invoice.Date || invoice.date ||
                          invoice.InvoiceDate || invoice.invoiceDate || null;
      const description = invoice.Description || invoice.description ||
                          invoice.Comment || invoice.comment || null;
      const invoiceNumber = invoice.Number || invoice.number || null;

      const projectData = {
        company_id: companyId,
        dinero_invoice_id: invoiceGuid,
        name: invoiceNumber ? `Faktura #${invoiceNumber}` : 'Dinero faktura',
        amount_dkk: amount,
        invoice_date: invoiceDate,
        description,
      };

      // Check if project already exists
      const { data: existingProject } = await db
        .from('projects')
        .select('id')
        .eq('dinero_invoice_id', invoiceGuid)
        .maybeSingle();

      if (existingProject) {
        await db
          .from('projects')
          .update(projectData)
          .eq('id', existingProject.id);
      } else {
        await db
          .from('projects')
          .insert(projectData);
      }

      invoicesUpserted++;

      // Track totals per company
      if (!companyInvoiceTotals[companyId]) {
        companyInvoiceTotals[companyId] = { total: 0, lastDate: null };
      }
      companyInvoiceTotals[companyId].total += Number(amount) || 0;
      const dateVal = invoiceDate ? new Date(invoiceDate) : null;
      if (dateVal && (!companyInvoiceTotals[companyId].lastDate ||
          dateVal > companyInvoiceTotals[companyId].lastDate)) {
        companyInvoiceTotals[companyId].lastDate = dateVal;
      }
    }

    // Update company totals and auto-promote to client if invoiced > 0
    for (const [companyId, totals] of Object.entries(companyInvoiceTotals)) {
      const updateData = {
        total_invoiced_dkk: totals.total,
        last_invoice_date: totals.lastDate?.toISOString()?.slice(0, 10) || null,
      };
      if (totals.total > 0) {
        updateData.type = 'client';
      }
      await db
        .from('companies')
        .update(updateData)
        .eq('id', companyId);
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
