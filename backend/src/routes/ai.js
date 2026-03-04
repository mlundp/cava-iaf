import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
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

let _anthropic;
function getAnthropic() {
  if (!_anthropic) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY must be set');
    }
    _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _anthropic;
}

// POST /api/ai/tasks — generate prioritised task list via Claude
router.post('/tasks', async (_req, res) => {
  try {
    const db = getSupabase();
    const claude = getAnthropic();

    // Fetch CRM data
    const [companiesRes, contactsRes, logsRes] = await Promise.all([
      db.from('companies').select('*').order('name'),
      db.from('contacts').select('*').order('name'),
      db.from('log_entries').select('*, companies(name), contacts(name)').order('occurred_at', { ascending: false }).limit(200),
    ]);

    const companies = companiesRes.data || [];
    const contacts = contactsRes.data || [];
    const logs = logsRes.data || [];

    if (companies.length === 0) {
      return res.status(400).json({ error: 'Ingen virksomheder i CRM — kan ikke generere opgaver.' });
    }

    // Build context for Claude
    const companySummaries = companies.map((c) => {
      const companyContacts = contacts.filter((ct) => ct.company_id === c.id);
      const companyLogs = logs.filter((l) => l.company_id === c.id).slice(0, 5);

      let summary = `- ${c.name} (type: ${c.type}, status: ${c.status})`;
      if (c.total_invoiced_dkk) summary += `, total faktureret: ${c.total_invoiced_dkk} kr.`;
      if (c.last_invoice_date) summary += `, seneste faktura: ${c.last_invoice_date}`;
      if (c.industry) summary += `, branche: ${c.industry}`;

      if (companyContacts.length > 0) {
        const contactNames = companyContacts.map((ct) => {
          let name = ct.name;
          if (ct.title) name += ` (${ct.title})`;
          return name;
        }).join(', ');
        summary += `\n  Kontakter: ${contactNames}`;
      }

      if (companyLogs.length > 0) {
        const logSummary = companyLogs.map((l) => {
          const date = new Date(l.occurred_at).toLocaleDateString('da-DK');
          return `${date}: ${l.activity_type}${l.notes ? ' — ' + l.notes : ''}`;
        }).join('; ');
        summary += `\n  Seneste aktivitet: ${logSummary}`;
      } else {
        summary += `\n  Ingen aktivitet logget endnu`;
      }

      return { id: c.id, summary };
    });

    const companyIds = companies.map((c) => c.id);
    const contactsByCompany = {};
    contacts.forEach((ct) => {
      if (!contactsByCompany[ct.company_id]) contactsByCompany[ct.company_id] = [];
      contactsByCompany[ct.company_id].push(ct);
    });

    const prompt = `Du er Medhjælperen — en intelligent CRM-assistent for et dansk bureau.

Herunder er en oversigt over alle virksomheder, kontaktpersoner og seneste aktivitet i CRM-systemet:

${companySummaries.map((s) => s.summary).join('\n\n')}

Baseret på denne data, generer en prioriteret liste med 5-10 konkrete outreach-opgaver.
Prioriter virksomheder der:
- Har status "hot" eller "warm" men ingen nylig aktivitet
- Er klienter med faldende aktivitet
- Er canvas/leads med potentiale der ikke er fulgt op på
- Har kontaktpersoner man kan henvende sig til

For hver opgave, returner et JSON array med objekter der har disse felter:
- company_id (UUID af virksomheden)
- contact_id (UUID af relevant kontaktperson, eller null)
- title (kort opgavetitel på dansk)
- suggested_action (konkret handling: "ring", "send email", "book møde", "følg op", etc.)
- email_draft (et udkast til en kort, professionel email på dansk hvis relevant, ellers null)
- reasoning (kort begrundelse for hvorfor denne opgave er vigtig)

Her er virksomheds-ID'er til reference:
${companies.map((c) => `${c.name}: ${c.id}`).join('\n')}

${contacts.length > 0 ? `\nKontaktperson-ID'er:\n${contacts.map((ct) => `${ct.name} (${companies.find((c) => c.id === ct.company_id)?.name || 'ukendt'}): ${ct.id}`).join('\n')}` : ''}

VIGTIGT: Returner KUN et JSON array — ingen anden tekst.`;

    const message = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    // Parse Claude's response
    const responseText = message.content
      .filter((block) => block.type === 'text')
      .map((block) => block.text)
      .join('');

    // Extract JSON array from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error('Claude response was not valid JSON:', responseText);
      return res.status(500).json({ error: 'Kunne ikke parse AI-svar. Prøv igen.' });
    }

    let tasks;
    try {
      tasks = JSON.parse(jsonMatch[0]);
    } catch {
      console.error('Failed to parse JSON from Claude:', jsonMatch[0]);
      return res.status(500).json({ error: 'Kunne ikke parse AI-svar. Prøv igen.' });
    }

    if (!Array.isArray(tasks) || tasks.length === 0) {
      return res.status(500).json({ error: 'AI returnerede ingen opgaver.' });
    }

    // Validate and insert tasks
    const validTasks = tasks
      .filter((t) => t.title && companyIds.includes(t.company_id))
      .map((t) => ({
        company_id: t.company_id,
        contact_id: t.contact_id || null,
        title: t.title,
        suggested_action: t.suggested_action || null,
        email_draft: t.email_draft || null,
        reasoning: t.reasoning || null,
        status: 'pending',
        generated_by: 'Medhjælperen',
      }));

    if (validTasks.length === 0) {
      return res.status(500).json({ error: 'AI genererede ingen gyldige opgaver.' });
    }

    const { data: inserted, error: insertError } = await db
      .from('tasks')
      .insert(validTasks)
      .select('*, companies(id, name), contacts(name)');

    if (insertError) {
      console.error('Failed to insert tasks:', insertError);
      return res.status(500).json({ error: 'Kunne ikke gemme opgaver: ' + insertError.message });
    }

    res.json({ tasks: inserted });
  } catch (err) {
    console.error('AI task generation error:', err);
    res.status(500).json({ error: err.message || 'Kunne ikke generere opgaver.' });
  }
});

// PATCH /api/ai/tasks/:id — update task status
router.patch('/tasks/:id', async (req, res) => {
  try {
    const db = getSupabase();
    const { id } = req.params;
    const { status, snooze_until } = req.body;

    if (!['done', 'snoozed', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Ugyldig status. Brug: done, snoozed, cancelled.' });
    }

    const updateData = { status };

    if (status === 'snoozed' && snooze_until) {
      updateData.snooze_until = snooze_until;
    }

    if (status === 'done' || status === 'cancelled') {
      updateData.resolved_at = new Date().toISOString();
    }

    const { data: updated, error: updateError } = await db
      .from('tasks')
      .update(updateData)
      .eq('id', id)
      .select('*, companies(id, name)')
      .single();

    if (updateError) {
      return res.status(500).json({ error: 'Kunne ikke opdatere opgave: ' + updateError.message });
    }

    // If done, also create a log entry
    if (status === 'done' && updated) {
      await db.from('log_entries').insert({
        company_id: updated.company_id,
        contact_id: updated.contact_id || null,
        activity_type: 'other',
        notes: updated.title,
        occurred_at: new Date().toISOString(),
        logged_by: 'Medhjælperen',
      });
    }

    res.json({ task: updated });
  } catch (err) {
    console.error('Task update error:', err);
    res.status(500).json({ error: err.message || 'Kunne ikke opdatere opgave.' });
  }
});

export default router;
