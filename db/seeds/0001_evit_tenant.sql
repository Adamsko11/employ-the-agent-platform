-- ============================================================================
-- Seed: EVIT tenant + 5 default agents
-- Run AFTER you've created your founder user via Supabase Auth and inserted
-- a row into app_user with role='founder'.
-- ============================================================================

-- 1) The EVIT tenant
insert into tenant (slug, client_name, wordmark, mark, brass_color, context_preset, loaded_hourly_rate_eur)
values (
  'evit',
  'EVIT Organization',
  'EVIT',
  'EVT',
  '#B8893D',
  'sales_led_saas',
  60.00
)
on conflict (slug) do nothing;

-- 2) Default agent roster
with t as (select id from tenant where slug = 'evit')
insert into agent (tenant_id, name, role, system_prompt, task_template, rotating_tasks, status_preset, daily_budget_usd, display_order)
select t.id, name, role, system_prompt, task_template, rotating_tasks, status_preset, daily_budget_usd, display_order
from t,
(values
  ('Sofia',  'BD Agent',
   'You are Sofia, a business-development agent for EVIT. You research target prospects, score them against ICP, and prepare outreach briefs. Be concise, factual, and never invent data.',
   'Pick the next BD task from the rotation. Return a one-line task summary (max 60 chars).',
   array['Researching prospect — TechVentures Singapore','Drafting outreach to NVI Capital','Reviewing pipeline for Q2 leads','Briefing Anya on opportunity scoring','Scanning LinkedIn for new ICP matches'],
   'Working', 4.00, 0),

  ('Anya',   'Strategy Agent',
   'You are Anya, the strategy agent for EVIT. You analyze the pipeline, score opportunities, and recommend prioritization to Adam.',
   'Pick the next strategy task from the rotation. Return a one-line task summary.',
   array['Scoring this week''s deals','Drafting Q2 OKR brief','Reviewing competitive landscape','Updating ICP weights from win data','Synthesizing client feedback themes'],
   'Working', 3.00, 1),

  ('Eliza',  'Outreach Agent',
   'You are Eliza, the outreach agent for EVIT. You draft personalized outbound messages (email + LinkedIn) for enriched leads. Match the EVIT voice from the copywriting skill.',
   'Pick the next outreach task. Return a one-line task summary.',
   array['Drafting cold email — TechVentures','Personalising LinkedIn DM — NVI','Iterating subject line — DACH batch','Translating sequence to German','Reviewing reply rates from last week'],
   'Working', 4.00, 2),

  ('Marcus', 'CRM Agent',
   'You are Marcus, the CRM agent for EVIT. You keep HubSpot clean: dedupe contacts, update deal stages, log activities, sync meeting notes.',
   'Pick the next CRM task. Return a one-line task summary.',
   array['Deduping contacts — DACH segment','Updating deal stages from Fireflies','Logging meeting notes — NVI Capital','Cleaning closed-lost reasons','Pushing weekly digest to Adam'],
   'Working', 3.00, 3),

  ('Henrik', 'Reporting Agent',
   'You are Henrik, the reporting agent for EVIT. You produce weekly metric digests, pipeline summaries, and ROI reports for clients.',
   'Pick the next reporting task. Return a one-line task summary.',
   array['Generating weekly digest','Calculating client ROI — Q2','Drafting board update','Producing pipeline snapshot','Refreshing metric snapshots'],
   'Working', 2.50, 4)
) as agents(name, role, system_prompt, task_template, rotating_tasks, status_preset, daily_budget_usd, display_order)
on conflict (tenant_id, name) do nothing;
