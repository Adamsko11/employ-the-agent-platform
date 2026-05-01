import "dotenv/config";
import pLimit from "p-limit";
import { getSupabase } from "./lib/db.js";
import type { AgentDef, Tenant } from "./lib/types.js";
import { runAgentTick } from "./agents/runAgent.js";
import { runAgentTickDemo } from "./agents/runAgentDemo.js";
import { runManagerTick } from "./manager/manager.js";

const TICK_INTERVAL = Number(process.env.AGENT_TICK_INTERVAL_MS || 60_000);
const HEARTBEAT_INTERVAL = Number(process.env.HEARTBEAT_INTERVAL_MS || 30_000);
const DEMO_MODE = process.env.DEMO_MODE === "true";
const limit = pLimit(5);

async function fetchAgents() {
  const supa = getSupabase();
  const { data: agents } = await supa.from("agent").select("*").eq("enabled", true);
  const { data: tenants } = await supa.from("tenant").select("id, slug, loaded_hourly_rate_eur");
  const tenantsById = new Map<string, Tenant>();
  for (const t of (tenants as Tenant[]) || []) tenantsById.set(t.id, t);
  return { agents: (agents as AgentDef[]) || [], tenantsById };
}

async function tick() {
  const { agents, tenantsById } = await fetchAgents();
  console.log(`[tick] ${new Date().toISOString()} — ${agents.length} agents, ${tenantsById.size} tenants${DEMO_MODE ? " [DEMO]" : ""}`);
  await Promise.all(agents.map((a) => limit(async () => {
    const t = tenantsById.get(a.tenant_id);
    if (!t) return;
    try {
      if (DEMO_MODE) await runAgentTickDemo(a, t);
      else await runAgentTick(a, t);
    } catch (err) { console.error(`[agent ${a.name}] error:`, err); }
  })));
}

async function main() {
  console.log("[worker] starting Employ the Agent runtime");
  console.log(`[worker] mode=${DEMO_MODE ? "DEMO (no LLM calls)" : "PRODUCTION (Anthropic API)"}`);
  console.log(`[worker] tick=${TICK_INTERVAL}ms heartbeat=${HEARTBEAT_INTERVAL}ms`);

  setInterval(tick, TICK_INTERVAL);
  if (!DEMO_MODE) setInterval(runManagerTick, 30_000);

  await tick();
  if (!DEMO_MODE) await runManagerTick();
}

main().catch((e) => { console.error("[worker] fatal", e); process.exit(1); });
