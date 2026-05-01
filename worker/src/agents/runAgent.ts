import { getSupabase } from "../lib/db.js";
import type { AgentDef, AgentStatus, Tenant } from "../lib/types.js";
import { estimateValue } from "../lib/value.js";
import { callLLM, getProvider, resolveMCPServers } from "../lib/llm.js";

export async function emitHeartbeat(agent: AgentDef, status: AgentStatus) {
  const supa = getSupabase();
  await supa.from("heartbeat").insert({ agent_id: agent.id, tenant_id: agent.tenant_id, status });
}

function isWorkingHours(agent: AgentDef): boolean {
  const now = new Date();
  const hours = Number(now.toLocaleString("en-US", { timeZone: agent.working_hours_tz, hour: "numeric", hour12: false }));
  return hours >= agent.working_hours_start && hours < agent.working_hours_end;
}

async function getDailySpend(agentId: string): Promise<number> {
  const supa = getSupabase();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supa.from("agent_run").select("cost_usd").eq("agent_id", agentId).gte("started_at", today + "T00:00:00Z");
  return (data || []).reduce((sum, r) => sum + Number(r.cost_usd), 0);
}

async function pickTaskSummary(agent: AgentDef): Promise<string> {
  if (agent.rotating_tasks.length === 0) return agent.role + " — working";
  return agent.rotating_tasks[Math.floor(Math.random() * agent.rotating_tasks.length)];
}

export async function runAgentTick(agent: AgentDef, tenant: Tenant) {
  const supa = getSupabase();

  if (!isWorkingHours(agent)) { await emitHeartbeat(agent, "idle"); return; }

  const spent = await getDailySpend(agent.id);
  if (spent >= agent.daily_budget_usd) {
    await emitHeartbeat(agent, "paused");
    await supa.from("alert").insert({
      tenant_id: agent.tenant_id, agent_id: agent.id, severity: "info",
      title: `${agent.name} paused — daily budget reached`,
      body: `Spent $${spent.toFixed(2)} of $${agent.daily_budget_usd}. Auto-resume at midnight.`,
      error_class: "budget_exceeded",
    });
    return;
  }

  await emitHeartbeat(agent, "running");
  const startedAt = new Date().toISOString();
  const taskSummary = await pickTaskSummary(agent);
  const { data: run } = await supa.from("agent_run").insert({
    agent_id: agent.id, tenant_id: agent.tenant_id, started_at: startedAt,
    status: "running", task_summary: taskSummary,
  }).select().single();
  if (!run) return;

  // Resolve MCP servers from agent config + env
  const mcpServers = resolveMCPServers(agent.mcp_tools || []);

  try {
    const userPrompt = `Task: ${taskSummary}\n\nProduce a concise (under 200 words) status update for what you accomplished. If you have tools available, you may use them.`;
    const result = await callLLM(agent.system_prompt, userPrompt, mcpServers);
    const { hours, dollarsSaved } = estimateValue(taskSummary, tenant.loaded_hourly_rate_eur);

    await supa.from("agent_run").update({
      ended_at: new Date().toISOString(),
      status: "running",
      prompt_tokens: result.inputTokens,
      completion_tokens: result.outputTokens,
      cost_usd: result.costUsd,
      full_output: result.text.slice(0, 4000),
      tools_called: result.toolsUsed,
      hours_saved: hours,
      dollars_saved: dollarsSaved,
    }).eq("id", run.id);
    await emitHeartbeat(agent, "idle");
  } catch (err: unknown) {
    const e = err as { message?: string; status?: number };
    const msg = e.message || "Unknown error";
    const errClass = msg.includes("rate") || e.status === 429 ? "rate_limit"
      : msg.includes("MCP") || msg.includes("mcp") ? "mcp_error" : "unknown";
    await supa.from("agent_run").update({
      ended_at: new Date().toISOString(), status: "failed",
      error_message: msg.slice(0, 1000), error_class: errClass,
    }).eq("id", run.id);
    await supa.from("alert").insert({
      tenant_id: agent.tenant_id, agent_id: agent.id, severity: "warning",
      title: `${agent.name} run failed (${getProvider()})`,
      body: msg.slice(0, 1000), error_class: errClass,
    });
    await emitHeartbeat(agent, "failed");
  }
}
