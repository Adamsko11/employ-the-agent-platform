export type AgentStatus = "running" | "idle" | "stuck" | "failed" | "paused";

export interface AgentDef {
  id: string;
  tenant_id: string;
  name: string;
  role: string;
  system_prompt: string;
  task_template: string;
  rotating_tasks: string[];
  mcp_tools: Array<{ name: string; server_url?: string }>;
  daily_budget_usd: number;
  working_hours_tz: string;
  working_hours_start: number;
  working_hours_end: number;
  enabled: boolean;
}

export interface Tenant {
  id: string;
  slug: string;
  loaded_hourly_rate_eur: number;
}
