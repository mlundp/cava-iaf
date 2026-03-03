import { Router } from 'express';
import axios from 'axios';
import { createClient } from '@supabase/supabase-js';

const router = Router();

const DINERO_API_KEY = process.env.DINERO_API_KEY;
const DINERO_ORG_ID = process.env.DINERO_ORGANISATION_ID;
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

let lastSyncTime = null;

// Get a bearer token from Dinero auth endpoint
async function getDineroToken() {
  const basicAuth = Buffer.from(`${DINERO_API_KEY}:${DINERO_API_KEY}`).toString('base64');

  const { data } = await axios.post(
    DINERO_AUTH_URL,
    'grant_type=password&scope=read+write&username=' +
      encodeURIComponent(DINERO_API_KEY) +
      '&password=' +
      encodeURIComponent(DINERO_API_KEY),
    {
      headers: {
        'Authorization': `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    }
  );

  return data.access_token;
}

// Fetch all pages from a paginated Dinero endpoint
async function fetchAllPages(token, path) {
  const results = [];
  let page = 0;
  const pageSize = 250;

  while (true) {
    const { data } = await axios.get(`${DINERO_BASE}/${DINERO_ORG_ID}${path}`, {
      headers: { 'Authorization': `Bearer ${token}` },
      params: { page, pageSize },
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
    const token = await getDineroToken();

    // Fetch contacts and invoices from Dinero
    const [dineroContacts, dineroInvoices] = await Promise.all([
      fetchAllPages(token, '/contacts'),
      fetchAllPages(token, '/invoices'),
    ]);

    let companiesUpserted = 0;
    let invoicesUpserted = 0;

    // Map of dinero contact guid -> supabase company id
    const contactIdMap = {};

    // Upsert contacts as companies
    for (const contact of dineroContacts) {
      const contactGuid = contact.ContactGuid || contact.contactGuid;
      const name = contact.Name || contact.name;
      if (!contactGuid || !name) continue;

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

    // Upsert invoices as projects and compute per-company totals
    const companyInvoiceTotals = {}; // companyId -> { total, lastDate }

    for (const invoice of dineroInvoices) {
      const invoiceGuid = invoice.Guid || invoice.guid;
      const contactGuid = invoice.ContactGuid || invoice.contactGuid;
      const companyId = contactIdMap[contactGuid];
      if (!invoiceGuid || !companyId) continue;

      const amount = invoice.TotalInclVat ?? invoice.totalInclVat ??
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

    // Update company totals and auto-promote to client
    for (const [companyId, totals] of Object.entries(companyInvoiceTotals)) {
      await db
        .from('companies')
        .update({
          total_invoiced_dkk: totals.total,
          last_invoice_date: totals.lastDate?.toISOString()?.slice(0, 10) || null,
          type: 'client',
        })
        .eq('id', companyId);
    }

    lastSyncTime = new Date().toISOString();

    res.json({
      success: true,
      synced_at: lastSyncTime,
      companies_synced: companiesUpserted,
      invoices_synced: invoicesUpserted,
    });
  } catch (err) {
    console.error('Dinero sync error:', err.response?.data || err.message);
    res.status(500).json({
      success: false,
      error: err.response?.data?.message || err.message,
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
