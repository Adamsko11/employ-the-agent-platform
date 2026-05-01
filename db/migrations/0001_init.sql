-- ============================================================================
-- Employ the Agent — Platform: initial schema
-- Migration 0001: core entities + RLS policies for multi-tenant isolation
-- ============================================================================

-- Extensions
create extension if not exists "pgcrypto";  -- gen_random_uuid()

-- ============================================================================
-- ENUMS
-- ============================================================================
create type user_role as enum ('founder', 'evit_manager', 'tenant_admin', 'tenant_viewer');
create type agent_status as enum ('running', 'idle', 'stuck', 'failed', 'paused');
create type alert_severity as enum ('info', 'warning', 'critical');
create type intervention_action as enum ('restart', 'acknowledge', 'note', 'pause', 'resume');
create type context_preset as enum ('executive_consulting', 'sales_led_saas', 'agency', 'manufacturing', 'real_estate', 'legal', 'aec');

-- ============================================================================
-- TENANT
-- ============================================================================
create table tenant (
  id              uuid primary key default gen_random_uuid(),
  slug            text unique not null check (slug ~ '^[a-z0-9-]+$'),
  client_name     text not null,
  wordmark        text not null,
  mark            text default '' check (length(mark) <= 4),
  brass_color     text not null default '#B8893D' check (brass_color ~ '^#[0-9A-Fa-f]{6}$'),
  context_preset  context_preset not null default 'executive_consulting',
  share_token     text unique,                  -- public read-only access token
  share_enabled   boolean not null default false,
  loaded_hourly_rate_eur numeric(10,2) not null default 50.00,  -- for $-saved calc
  starting_metrics jsonb not null default '{
    "hours_saved_month": 0,
    "leads_today": 0,
    "tasks_today": 0,
    "dollars_saved_total": 0
  }'::jsonb,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on tenant (slug);

-- ============================================================================
-- USER (extends Supabase auth.users)
-- ============================================================================
create table app_user (
  id              uuid primary key references auth.users(id) on delete cascade,
  tenant_id       uuid references tenant(id) on delete cascade,  -- nullable for founder
  email           text not null,
  name            text,
  role            user_role not null default 'tenant_viewer',
  created_at      timestamptz not null default now()
);
create index on app_user (tenant_id);
create index on app_user (email);

-- ============================================================================
-- AGENT
-- ============================================================================
create table agent (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id) on delete cascade,
  name            text not null,                 -- 'Sofia'
  role            text not null,                 -- 'BD Agent'
  system_prompt   text not null,
  task_template   text not null,                 -- prompt fragment for next-task selection
  rotating_tasks  text[] not null default '{}',  -- fallback rotation
  mcp_tools       jsonb not null default '[]'::jsonb,  -- [{name, server_url, credentials_secret_id}]
  status_preset   text not null default 'Working',
  daily_budget_usd numeric(10,2) not null default 5.00,
  working_hours_tz text not null default 'Europe/Warsaw',
  working_hours_start int not null default 8,    -- 0-23
  working_hours_end   int not null default 18,
  enabled         boolean not null default true,
  display_order   int not null default 0,         -- left-to-right desk position
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (tenant_id, name)
);
create index on agent (tenant_id);
create index on agent (tenant_id, enabled);

-- ============================================================================
-- AGENT_RUN
-- ============================================================================
create table agent_run (
  id              uuid primary key default gen_random_uuid(),
  agent_id        uuid not null references agent(id) on delete cascade,
  tenant_id       uuid not null references tenant(id) on delete cascade,  -- denormalized for RLS speed
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  status          agent_status not null default 'running',
  prompt_tokens   int default 0,
  completion_tokens int default 0,
  cost_usd        numeric(10,4) not null default 0,
  task_summary    text,                          -- max 60 chars displayed in scene
  full_output     text,                          -- complete agent response, for logs
  tools_called    jsonb not null default '[]'::jsonb,
  hours_saved     numeric(8,2) not null default 0,
  dollars_saved   numeric(10,2) not null default 0,
  error_message   text,
  error_class     text                           -- 'rate_limit' | 'mcp_error' | 'prompt_error' | 'unknown'
);
create index on agent_run (agent_id, started_at desc);
create index on agent_run (tenant_id, started_at desc);
create index on agent_run (tenant_id, status);

-- ============================================================================
-- HEARTBEAT
-- ============================================================================
create table heartbeat (
  id              uuid primary key default gen_random_uuid(),
  agent_id        uuid not null references agent(id) on delete cascade,
  tenant_id       uuid not null references tenant(id) on delete cascade,
  ts              timestamptz not null default now(),
  status          agent_status not null
);
create index on heartbeat (agent_id, ts desc);
create index on heartbeat (tenant_id, ts desc);

-- ============================================================================
-- ALERT
-- ============================================================================
create table alert (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid references tenant(id) on delete cascade,  -- nullable for system-level alerts
  agent_id        uuid references agent(id) on delete cascade,   -- nullable for system-level
  severity        alert_severity not null default 'warning',
  title           text not null,
  body            text,
  error_class     text,                          -- mirrors agent_run.error_class
  ai_manager_summary text,                       -- written by AI Manager
  ai_manager_action  text,                       -- 'auto_retry' | 'pause' | 'escalate' | null
  acknowledged_by uuid references app_user(id) on delete set null,
  acknowledged_at timestamptz,
  resolved_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index on alert (tenant_id, created_at desc);
create index on alert (agent_id, resolved_at);
create index on alert (severity, resolved_at) where resolved_at is null;

-- ============================================================================
-- INTERVENTION
-- ============================================================================
create table intervention (
  id              uuid primary key default gen_random_uuid(),
  alert_id        uuid not null references alert(id) on delete cascade,
  user_id         uuid references app_user(id) on delete set null,
  action          intervention_action not null,
  note            text,
  created_at      timestamptz not null default now()
);
create index on intervention (alert_id);

-- ============================================================================
-- METRIC_SNAPSHOT (pre-aggregated daily metrics)
-- ============================================================================
create table metric_snapshot (
  id              uuid primary key default gen_random_uuid(),
  tenant_id       uuid not null references tenant(id) on delete cascade,
  date            date not null,
  hours_saved     numeric(10,2) not null default 0,
  leads_count     int not null default 0,
  tasks_count     int not null default 0,
  dollars_saved   numeric(12,2) not null default 0,
  active_agents   int not null default 0,
  unique (tenant_id, date)
);
create index on metric_snapshot (tenant_id, date desc);

-- ============================================================================
-- VIEWS
-- ============================================================================

-- Latest heartbeat per agent (for Ops Console)
create view agent_latest_heartbeat as
select distinct on (agent_id)
  agent_id, tenant_id, ts, status
from heartbeat
order by agent_id, ts desc;

-- Today's running totals per tenant (for Value Console)
create view tenant_today_metrics as
select
  t.id as tenant_id,
  t.slug,
  coalesce(sum(ar.hours_saved) filter (where ar.started_at::date = current_date), 0) as hours_today,
  coalesce(sum(ar.dollars_saved) filter (where ar.started_at::date = current_date), 0) as dollars_today,
  coalesce(count(ar.id) filter (where ar.started_at::date = current_date and ar.status != 'failed'), 0) as tasks_today,
  coalesce(count(ar.id) filter (where ar.started_at::date = current_date and ar.task_summary ilike '%lead%'), 0) as leads_today,
  coalesce(count(distinct a.id) filter (where a.enabled = true), 0) as active_agents,
  (select coalesce(sum(dollars_saved), 0) from agent_run where tenant_id = t.id) as dollars_saved_total
from tenant t
left join agent a on a.tenant_id = t.id
left join agent_run ar on ar.tenant_id = t.id
group by t.id, t.slug;

-- ============================================================================
-- ROW-LEVEL SECURITY
-- ============================================================================

alter table tenant            enable row level security;
alter table app_user          enable row level security;
alter table agent             enable row level security;
alter table agent_run         enable row level security;
alter table heartbeat         enable row level security;
alter table alert             enable row level security;
alter table intervention      enable row level security;
alter table metric_snapshot   enable row level security;

-- Helper: get the current user's role and tenant_id from JWT claims
create or replace function auth_user_role() returns user_role
language sql stable as $$
  select role from app_user where id = auth.uid()
$$;

create or replace function auth_user_tenant() returns uuid
language sql stable as $$
  select tenant_id from app_user where id = auth.uid()
$$;

-- TENANT policies
create policy "founder reads all tenants"
  on tenant for select
  using (auth_user_role() = 'founder' or auth_user_role() = 'evit_manager');

create policy "tenant users read their own tenant"
  on tenant for select
  using (id = auth_user_tenant());

create policy "founder writes all tenants"
  on tenant for all
  using (auth_user_role() = 'founder')
  with check (auth_user_role() = 'founder');

-- APP_USER policies
create policy "founder reads all users"
  on app_user for select
  using (auth_user_role() in ('founder', 'evit_manager'));

create policy "users read users in their tenant"
  on app_user for select
  using (tenant_id = auth_user_tenant());

create policy "founder writes all users"
  on app_user for all
  using (auth_user_role() = 'founder')
  with check (auth_user_role() = 'founder');

-- AGENT policies (read for tenant; write for founder + evit_manager + tenant_admin)
create policy "founder/manager read all agents"
  on agent for select using (auth_user_role() in ('founder', 'evit_manager'));
create policy "tenant users read their agents"
  on agent for select using (tenant_id = auth_user_tenant());
create policy "founder writes agents"
  on agent for all
  using (auth_user_role() = 'founder')
  with check (auth_user_role() = 'founder');

-- AGENT_RUN policies (read-only for tenant; service role writes)
create policy "founder/manager read all runs"
  on agent_run for select using (auth_user_role() in ('founder', 'evit_manager'));
create policy "tenant users read their runs"
  on agent_run for select using (tenant_id = auth_user_tenant());

-- HEARTBEAT policies
create policy "founder/manager read all heartbeats"
  on heartbeat for select using (auth_user_role() in ('founder', 'evit_manager'));
create policy "tenant users read their heartbeats"
  on heartbeat for select using (tenant_id = auth_user_tenant());

-- ALERT policies
create policy "founder/manager read all alerts"
  on alert for select using (auth_user_role() in ('founder', 'evit_manager'));
create policy "tenant users read their alerts"
  on alert for select using (tenant_id = auth_user_tenant());
create policy "founder/manager write alerts"
  on alert for all
  using (auth_user_role() in ('founder', 'evit_manager'))
  with check (auth_user_role() in ('founder', 'evit_manager'));

-- INTERVENTION policies
create policy "founder/manager all interventions"
  on intervention for all
  using (auth_user_role() in ('founder', 'evit_manager'))
  with check (auth_user_role() in ('founder', 'evit_manager'));

-- METRIC_SNAPSHOT policies
create policy "founder/manager read all metrics"
  on metric_snapshot for select using (auth_user_role() in ('founder', 'evit_manager'));
create policy "tenant users read their metrics"
  on metric_snapshot for select using (tenant_id = auth_user_tenant());

-- ============================================================================
-- REALTIME
-- ============================================================================
-- Allow Supabase Realtime publication to broadcast row changes
alter publication supabase_realtime add table agent_run;
alter publication supabase_realtime add table heartbeat;
alter publication supabase_realtime add table alert;
alter publication supabase_realtime add table agent;

-- ============================================================================
-- TRIGGERS
-- ============================================================================
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger tenant_updated_at before update on tenant
  for each row execute function set_updated_at();
create trigger agent_updated_at before update on agent
  for each row execute function set_updated_at();

-- ============================================================================
-- INITIAL SEED — EVIT tenant (uncomment after first founder user is created)
-- ============================================================================
-- See db/seeds/0001_evit_tenant.sql
