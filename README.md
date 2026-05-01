# Employ the Agent — Platform

Multi-tenant operations & ROI dashboard for AI agents employed across your business.

This is the actual platform behind the Employ the Agent product. Your marketing site (`/employ-the-agent`) drives discovery; this platform is what clients log into post-sale.

> **Status:** Phase 1 walking-skeleton scaffold. See `docs/Employ_The_Agent_Platform_SOW.docx` for the full SOW.

---

## What's in this repo

```
employ-the-agent-platform/
├── docs/                  # SOW (.docx)
├── db/
│   ├── migrations/0001_init.sql      # full schema + RLS policies
│   └── seeds/0001_evit_tenant.sql    # creates the EVIT tenant + 5 default agents
├── web/                   # Next.js 16 app — Value Console + Ops Console + Admin
│   ├── src/
│   │   ├── app/
│   │   │   ├── [slug]/dashboard/    # Value Console (the AugmentedHype-style office)
│   │   │   ├── [slug]/admin/        # White-label customizer
│   │   │   ├── [slug]/share/[token]/# Public read-only share link
│   │   │   ├── ops/                 # Operations Console (founder/manager)
│   │   │   ├── login/               # Magic-link auth
│   │   │   └── api/cron/watchdog/   # System-down email cron
│   │   ├── components/{scene,value,ops,admin}/
│   │   └── lib/                     # supabase, auth, types, format
│   └── vercel.json                  # cron config
└── worker/                # Always-on Node worker — runs the agents
    └── src/
        ├── agents/runAgent.ts       # per-agent loop
        └── manager/manager.ts       # AI Manager triage loop
```

---

## Phase 1 deliverable status

| # | Deliverable | Status |
|---|-------------|--------|
| 1.1 | Next.js scaffold, Supabase auth, RLS, tenant slug routing | ✅ Code complete |
| 1.2 | Database schema (8 entities) | ✅ `db/migrations/0001_init.sql` |
| 1.3 | Single agent worker hitting Claude | ✅ Runs all 5 default agents (currently in "preview" mode — no MCPs yet) |
| 1.4 | Ops Console with realtime tile grid + side panel | ✅ Code complete |
| 1.5 | Value Console with SVG isometric scene + live tiles + dollar ticker | ✅ Code complete |
| 1.6 | Email watchdog → `aps@evit-org.com` when system down | ✅ Code complete |

What's NOT done yet (Phase 2):
- MCP tool wiring inside the agent loop (currently Sonnet runs without tools — preview mode)
- Auth callback session handling polish
- Public share token rotation UI
- Production-grade error fallbacks

---

## Setup — first run

### Prerequisites
- Node.js ≥ 20
- npm or pnpm
- Supabase account (free tier is fine)
- Anthropic API key
- Resend account (for emails) — or any other transactional provider, swap easily
- Railway / Fly / Render account for the worker (free tiers OK)
- Vercel account for the web app

### 1. Set up Supabase

1. Create a new Supabase project. Note the project URL and the anon + service-role keys.
2. In SQL Editor, run `db/migrations/0001_init.sql`.
3. Enable Realtime for `agent_run`, `heartbeat`, `alert`, `agent` (the migration adds them to `supabase_realtime` publication, but verify in Database → Replication).
4. In Authentication → Providers, enable Email (magic link) and optionally Google OAuth.
5. **Create your founder user:** Authentication → Users → "Add user" with your email. Then in SQL editor:
   ```sql
   insert into app_user (id, email, name, role, tenant_id)
   values ('<your-auth-user-id>', 'adam@evit-org.com', 'Adam Skoneczny', 'founder', null);
   ```
6. Run `db/seeds/0001_evit_tenant.sql` to create the EVIT tenant + 5 default agents.

### 2. Set up the web app (Vercel)

```bash
cd web
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
#         SUPABASE_SERVICE_ROLE_KEY, RESEND_API_KEY, ALERT_EMAIL_TO=aps@evit-org.com,
#         ALERT_EMAIL_FROM=alerts@employtheagent.com (verify domain in Resend),
#         CRON_SECRET (long random string)
npm install
npm run dev
# visit http://localhost:3000/login
```

Deploy:
```bash
vercel --prod
# In the Vercel dashboard, set the same env vars + add CRON_SECRET to the cron auth header
```

### 3. Set up the worker (Railway recommended)

```bash
cd worker
cp .env.example .env
# fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, ANTHROPIC_API_KEY
npm install
npm start  # runs the agent loop locally
```

To deploy on Railway:
```bash
railway init
railway link
railway up
# In Railway dashboard, set the same env vars, set the start command to `npm start`
```

The worker will tick every `AGENT_TICK_INTERVAL_MS` (default 60s) and run each enabled agent through one Claude call. Heartbeats land in Postgres and the web app picks them up via Supabase Realtime.

### 4. Verify end-to-end

1. Open `https://your-app.vercel.app/login` → magic link → land on `/ops`.
2. Confirm 5 agent tiles show up under "EVIT Organization" with "running" status within 60s.
3. Open `https://your-app.vercel.app/evit/dashboard` — Value Console renders, dollar ticker counts up.
4. Stop the Railway worker. Within 90s an agent tile should flip to red. Within 5 min, an email lands at `aps@evit-org.com` with subject "Employ the Agent — system heartbeat lost".

---

## Onboarding a new client tenant (Phase 2 flow, but works manually now)

```sql
-- 1. Create the tenant
insert into tenant (slug, client_name, wordmark, mark, brass_color, context_preset)
values ('acme', 'Acme Corp', 'Acme', 'ACM', '#9C8B5F', 'sales_led_saas');

-- 2. Copy default agents (or customize)
insert into agent (tenant_id, name, role, system_prompt, task_template, rotating_tasks, daily_budget_usd, display_order)
select
  (select id from tenant where slug = 'acme'),
  name, role, system_prompt, task_template, rotating_tasks, daily_budget_usd, display_order
from agent
where tenant_id = (select id from tenant where slug = 'evit');
```

Then visit `/acme/admin` to white-label, or use the EXPORT CONFIG button on the EVIT tenant and import.

---

## Architecture summary

- **Web tier** (Vercel, Next.js 16 + Tailwind 4): UI, auth, admin, realtime subscriptions, cron watchdog.
- **Worker tier** (Railway, Node.js): always-on agent loop + AI Manager triage.
- **Data tier** (Supabase Postgres + RLS): single source of truth. Realtime replication pushes changes to subscribed clients.
- **LLM**: Claude Sonnet for agent work, Claude Haiku for AI Manager triage.
- **Email**: Resend, transactional only, single recipient (`aps@evit-org.com`) for system-down alerts.

Multi-tenant safety relies on RLS. Every row in every business table has `tenant_id`. Every read is RLS-filtered by the user's JWT claim. Service-role JWT is used only server-side for admin/cron paths.

---

## What to build next (Phase 2)

See SOW §13. Priority order:
1. Wire MCP tools into the agent runtime (Marcus → HubSpot, Eliza → Gmail, etc.)
2. Persist admin customizer changes (right now the Save button calls the API — verify it works end-to-end)
3. AI Manager auto-actions (currently only writes summaries; allowlist auto-retry needs implementing)
4. First paying client onboarding playbook + provisioning script

---

## Decisions / open questions resolved during build

- ✅ Email recipient is `aps@evit-org.com` (confirmed not a typo).
- ✅ Fresh repo (this one), separate from the marketing site at `../employ-the-agent`.
- ⚠️ Default loaded hourly rate left at €50/h until you set per-tenant. Adjust in the admin Metrics tab.
- ⚠️ Three.js scene deferred to Phase 3 — v1 ships SVG-only as planned.

---

## Authored by
ANALYST (lead) + ARCHITECT (architecture) + PRODUCT (use cases) — May 2026.

<!-- trigger deploy -->
