// Shared types matching the Postgres schema

export type UserRole = "founder" | "evit_manager" | "tenant_admin" | "tenant_viewer";
export type AgentStatus = "running" | "idle" | "stuck" | "failed" | "paused";
export type AlertSeverity = "info" | "warning" | "critical";
export type ContextPreset =
  | "executive_consulting" | "sales_led_saas" | "agency"
  | "manufacturing" | "real_estate" | "legal" | "aec";

export interface Tenant {
  id: string;
  slug: string;
  client_name: string;
  wordmark: string;
  mark: string;
  brass_color: string;
  context_preset: ContextPreset;
  share_token: string | null;
  share_enabled: boolean;
  loaded_hourly_rate_eur: number;
  starting_metrics: {
    hours_saved_month: number;
    leads_today: number;
    tasks_today: number;
    dollars_saved_total: number;
  };
  created_at: string;
  updated_at: string;
}

export interface Agent {
  id: string;
  tenant_id: string;
  name: string;
  role: string;
  system_prompt: string;
  task_template: string;
  rotating_tasks: string[];
  mcp_tools: Array<{ name: string; server_url?: string }>;
  status_preset: string;
  daily_budget_usd: number;
  working_hours_tz: string;
  working_hours_start: number;
  working_hours_end: number;
  enabled: boolean;
  display_order: number;
}

export interface AgentRun {
  id: string;
  agent_id: string;
  tenant_id: string;
  started_at: string;
  ended_at: string | null;
  status: AgentStatus;
  prompt_tokens: number;
  completion_tokens: number;
  cost_usd: number;
  task_summary: string | null;
  hours_saved: number;
  dollars_saved: number;
  error_message: string | null;
  error_class: string | null;
}

export interface Heartbeat {
  id: string;
  agent_id: string;
  tenant_id: string;
  ts: string;
  status: AgentStatus;
}

export interface Alert {
  id: string;
  tenant_id: string | null;
  agent_id: string | null;
  severity: AlertSeverity;
  title: string;
  body: string | null;
  error_class: string | null;
  ai_manager_summary: string | null;
  ai_manager_action: string | null;
  acknowledged_by: string | null;
  acknowledged_at: string | null;
  resolved_at: string | null;
  created_at: string;
}

export interface TenantTodayMetrics {
  tenant_id: string;
  slug: string;
  hours_today: number;
  dollars_today: number;
  tasks_today: number;
  leads_today: number;
  active_agents: number;
  dollars_saved_total: number;
}
