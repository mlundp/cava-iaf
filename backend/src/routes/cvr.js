import { Router } from 'express';
import axios from 'axios';

const router = Router();

const CVR_URL = 'https://api.cvr.dev/api/elastic/virksomhed/_search';
const CVR_API_KEY = process.env.CVR_API_KEY;

// GET /api/cvr/:cvrNumber
router.get('/:cvrNumber', async (req, res) => {
  const { cvrNumber } = req.params;

  if (!/^\d{8}$/.test(cvrNumber)) {
    return res.status(400).json({ error: 'CVR-nummer skal være 8 cifre.' });
  }

  if (!CVR_API_KEY) {
    return res.status(500).json({ error: 'CVR API-nøgle mangler i serverkonfigurationen.' });
  }

  try {
    const { data } = await axios.post(CVR_URL, {
      query: {
        term: { 'Vrvirksomhed.cvrNummer': Number(cvrNumber) },
      },
    }, {
      headers: {
        'Authorization': `Basic ${Buffer.from(`${CVR_API_KEY}:`).toString('base64')}`,
      },
    });

    const hits = data?.hits?.hits;
    if (!hits || hits.length === 0) {
      return res.status(404).json({ error: 'Ingen virksomhed fundet med dette CVR-nummer.' });
    }

    const vrk = hits[0]._source?.Vrvirksomhed;
    if (!vrk) {
      return res.status(404).json({ error: 'Ingen virksomhedsdata fundet.' });
    }

    // Legal name — use the most recent entry
    const navne = vrk.navne || [];
    const latestNavn = navne.find((n) => !n.periode?.gyldigTil) || navne[0];
    const name = latestNavn?.navn || null;

    // Industry — most recent branchekode
    const branches = vrk.hovedbranche || [];
    const latestBranch = branches.find((b) => !b.periode?.gyldigTil) || branches[0];
    const industry = latestBranch?.branchetekst || null;

    // Employee count — most recent interval
    const antalAnsatte = vrk.kvartalsbeskaeftigelse || vrk.maanedsbeskaeftigelse || [];
    const latestAnsatte = antalAnsatte[antalAnsatte.length - 1];
    const employee_count = latestAnsatte?.antalAnsatte ?? latestAnsatte?.intervalKodeAntalAnsatte ?? null;

    // Address — most recent beliggenhedsadresse
    const adresser = vrk.beliggenhedsadresse || [];
    const latestAddr = adresser.find((a) => !a.periode?.gyldigTil) || adresser[0];
    let address = null;
    if (latestAddr) {
      const parts = [
        latestAddr.vejnavn,
        latestAddr.husnummerFra,
        latestAddr.postnummer ? `, ${latestAddr.postnummer}` : null,
        latestAddr.bynavn,
      ].filter(Boolean);
      address = parts.join(' ') || null;
    }

    // Ownership / virksomhedsform
    const former = vrk.virksomhedsform || [];
    const latestForm = former.find((f) => !f.periode?.gyldigTil) || former[0];
    const ownership = latestForm?.langBeskrivelse || latestForm?.kortBeskrivelse || null;

    // Annual revenue — from seneste årsregnskab
    const regnskaber = vrk.regnskab?.regnskabsperiode || vrk.aarsregnskab || [];
    const latestReg = regnskaber[regnskaber.length - 1];
    const annual_revenue_cvr = latestReg?.omsaetning ?? null;

    res.json({
      name,
      industry,
      employee_count,
      address,
      ownership,
      annual_revenue_cvr,
    });
  } catch (err) {
    console.error('CVR opslag fejlede:', {
      message: err.message,
      status: err.response?.status,
      data: err.response?.data,
    });
    const status = err.response?.status || 500;
    const detail = err.response?.data;
    const errorMsg = typeof detail === 'string' ? detail
      : detail?.message || detail?.error || 'Kunne ikke hente CVR-data. Prøv igen senere.';
    res.status(status).json({ error: errorMsg });
  }
});

export default router;
