import { getSupabase } from "../lib/db.js";
import type { AgentDef, AgentStatus, Tenant } from "../lib/types.js";
import { estimateValue } from "../lib/value.js";

export async function emitHeartbeat(agent: AgentDef, status: AgentStatus) {
  const supa = getSupabase();
  await supa.from("heartbeat").insert({
    agent_id: agent.id, tenant_id: agent.tenant_id, status,
  });
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// Per-agent flavor templates for richer task summaries in demo mode
const FLAVOR_BY_ROLE: Record<string, string[]> = {
  "BD Agent": [
    "Researched {company} — strong ICP fit, fired off enrichment",
    "Scored 12 prospects from yesterday's import, top 3 flagged",
    "Found 4 new ICP matches on LinkedIn — added to pipeline",
    "Drafted outreach brief for {company} based on their AI initiative",
    "Re-engaged dormant lead {company} with relevance hook",
  ],
  "Strategy Agent": [
    "Re-scored Q2 deals — 3 moved up tier on funding signal",
    "Synthesized win/loss themes from last 8 closed deals",
    "Adjusted ICP weights — DACH region weighted +15%",
    "Drafted competitive landscape brief for tomorrow's review",
    "Flagged 2 stalled deals for Adam's intervention",
  ],
  "Outreach Agent": [
    "Sent 8 personalized emails — 2 already opened",
    "Drafted German sequence for DACH batch — pending review",
    "A/B variant on subject line — testing on 50 prospects",
    "Translated playbook step 3 to PL for {company}",
    "Reviewed reply rate — 14% on last week's batch",
  ],
  "CRM Agent": [
    "Deduped 47 contacts in DACH segment — 12 merged",
    "Synced 3 Fireflies meetings to deal records",
    "Updated deal stages — 4 moved to Discovery",
    "Cleaned closed-lost reasons — 9 entries normalized",
    "Pushed weekly digest to Adam's Slack",
  ],
  "Reporting Agent": [
    "Generated weekly digest — sent to inbox",
    "Calculated client ROI — Q2 trending +23% vs Q1",
    "Refreshed metric snapshots for 1 tenant",
    "Drafted board-update deck — 6 slides",
    "Produced pipeline snapshot — 14 active deals",
  ],
};

const COMPANIES = [
  "TechVentures Singapore","NVI Capital","Meridian AI","Polaris Robotics",
  "Vertex Logistics","Acme Mfg","Helio Health","Cobalt Studios","Northwind Legal",
  "Ironclad Systems","Brightline","Quanta Research","Stellar Industries",
];

function flavorFor(role: string): string {
  const templates = FLAVOR_BY_ROLE[role] || ["Working on next task"];
  const t = pickRandom(templates);
  return t.replace("{company}", pickRandom(COMPANIES));
}

function isWorkingHours(agent: AgentDef): boolean {
  const now = new Date();
  const hours = Number(now.toLocaleString("en-US", { timeZone: agent.working_hours_tz, hour: "numeric", hour12: false }));
  return hours >= agent.working_hours_start && hours < agent.working_hours_end;
}

export async function runAgentTickDemo(agent: AgentDef, tenant: Tenant) {
  const supa = getSupabase();

  if (!isWorkingHours(agent)) {
    await emitHeartbeat(agent, "idle");
    return;
  }

  await emitHeartbeat(agent, "running");
  const startedAt = new Date().toISOString();

  // Pretend the agent is working for a bit (variable duration to look natural)
  const workDurationMs = 5_000 + Math.random() * 25_000;  // 5-30s

  // Insert "running" run row
  const { data: run } = await supa.from("agent_run").insert({
    agent_id: agent.id, tenant_id: agent.tenant_id, started_at: startedAt,
    status: "running", task_summary: flavorFor(agent.role),
  }).select().single();
  if (!run) return;

  await new Promise((r) => setTimeout(r, workDurationMs));

  // Generate a realistic-looking completion summary
  const taskSummary = flavorFor(agent.role);
  const fakeOutput = `Demo run for ${agent.name}. Task: ${taskSummary}. Outcome: completed successfully. (DEMO_MODE — no actual LLM call.)`;
  const { hours, dollarsSaved } = estimateValue(taskSummary, tenant.loaded_hourly_rate_eur);
  // Fake token + cost metrics so the metrics still tick
  const promptTokens = 800 + Math.floor(Math.random() * 1200);
  const completionTokens = 200 + Math.floor(Math.random() * 600);
  const costUsd = (promptTokens / 1_000_000) * 3 + (completionTokens / 1_000_000) * 15;

  await supa.from("agent_run").update({
    ended_at: new Date().toISOString(),
    status: "running",  // success
    prompt_tokens: promptTokens,
    completion_tokens: completionTokens,
    cost_usd: costUsd,
    full_output: fakeOutput,
    task_summary: taskSummary,
    hours_saved: hours,
    dollars_saved: dollarsSaved,
  }).eq("id", run.id);

  await emitHeartbeat(agent, "idle");
}
