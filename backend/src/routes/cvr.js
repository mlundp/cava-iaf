import { Router } from 'express';
import axios from 'axios';

const router = Router();

const CVR_URL = 'https://cvrapi.dk/api';

// GET /api/cvr/:cvrNumber
router.get('/:cvrNumber', async (req, res) => {
  const { cvrNumber } = req.params;

  if (!/^\d{8}$/.test(cvrNumber)) {
    return res.status(400).json({ error: 'CVR-nummer skal være 8 cifre.' });
  }

  try {
    const { data } = await axios.get(CVR_URL, {
      params: { search: cvrNumber, country: 'dk' },
      headers: { 'User-Agent': 'cava-crm-itsafact' },
    });

    if (!data || !data.name) {
      return res.status(404).json({ error: 'Ingen virksomhed fundet med dette CVR-nummer.' });
    }

    const name = data.name || null;
    const industry = data.industry || null;
    const employee_count = data.employees ?? null;

    // Format address as "address, zipcode city"
    const addrParts = [data.address, [data.zipcode, data.city].filter(Boolean).join(' ')].filter(Boolean);
    const address = addrParts.join(', ') || null;

    // Owners can be an array of objects or a string
    let ownership = null;
    if (Array.isArray(data.owners)) {
      ownership = data.owners.map((o) => o.name || o).filter(Boolean).join(', ') || null;
    } else if (data.owners) {
      ownership = String(data.owners);
    }

    res.json({
      name,
      industry,
      employee_count,
      address,
      ownership,
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
