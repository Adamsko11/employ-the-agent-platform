import { notFound } from "next/navigation";
import { getSupabaseServiceRole } from "@/lib/supabase-server";
import { IsometricOfficeAnimated } from "@/components/scene/IsometricOfficeAnimated";
import { LiveDollarTicker } from "@/components/value/LiveDollarTicker";
import { MetricTile } from "@/components/value/MetricTile";
import { ActivityFeed } from "@/components/value/ActivityFeed";
import { formatHours, formatNumber } from "@/lib/format";
import type { Agent, AgentStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SharePage({ params }: { params: Promise<{ slug: string; token: string }> }) {
  const { slug, token } = await params;
  const sr = getSupabaseServiceRole();
  const { data: tenant } = await sr.from("tenant").select("*").eq("slug", slug).maybeSingle();
  if (!tenant || !tenant.share_enabled || tenant.share_token !== token) notFound();

  const [{ data: agents }, { data: heartbeats }, { data: latestRuns }, { data: metrics }, { data: feedRuns }] = await Promise.all([
    sr.from("agent").select("*").eq("tenant_id", tenant.id).eq("enabled", true).order("display_order"),
    sr.from("agent_latest_heartbeat" as never).select("agent_id, status").eq("tenant_id", tenant.id),
    sr.from("agent_run").select("agent_id, task_summary, started_at").eq("tenant_id", tenant.id).order("started_at", { ascending: false }).limit(50),
    sr.from("tenant_today_metrics" as never).select("*").eq("tenant_id", tenant.id).single(),
    sr.from("agent_run").select("id, agent_id, task_summary, started_at, ended_at, dollars_saved, hours_saved, status").eq("tenant_id", tenant.id).order("started_at", { ascending: false }).limit(12),
  ]);

  const taskByAgent = new Map<string, string>();
  for (const r of latestRuns || []) if (!taskByAgent.has(r.agent_id)) taskByAgent.set(r.agent_id, r.task_summary || "");
  const statusByAgent = new Map<string, AgentStatus>();
  for (const h of (heartbeats as Array<{agent_id: string; status: AgentStatus}>) || []) statusByAgent.set(h.agent_id, h.status);

  const sceneAgents = (agents as Agent[] || []).map((a) => ({
    ...a, current_task: taskByAgent.get(a.id) ?? null, status: statusByAgent.get(a.id) ?? "idle" as AgentStatus,
  }));

  const m = metrics as { hours_today: number; tasks_today: number; leads_today: number; active_agents: number; dollars_saved_total: number; } | null;
  const dollarsTotal = Number(m?.dollars_saved_total) || tenant.starting_metrics?.dollars_saved_total || 0;

  return (
    <main className="min-h-screen bg-slate-900">
      <header className="px-6 md:px-10 py-5 flex items-center justify-between border-b border-white/5">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/50">Employ the Agent</p>
          <p className="text-xl font-bold text-white">{tenant.client_name}</p>
        </div>
        <LiveDollarTicker initialValue={dollarsTotal} tenantId={tenant.id} />
      </header>
      <section className="px-6 md:px-10 py-8 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
        <div className="rounded-2xl border border-white/5 overflow-hidden bg-black/30">
          <IsometricOfficeAnimated agents={sceneAgents} brassColor={tenant.brass_color} tenantId={tenant.id} />
        </div>
        <ActivityFeed tenantId={tenant.id} agents={(agents as Agent[]) || []} initialRuns={(feedRuns as never) || []} brassColor={tenant.brass_color}/>
      </section>
      <section className="px-6 md:px-10 pb-12 grid grid-cols-1 md:grid-cols-4 gap-4">
        <MetricTile label="Hours Saved · This Month" value={formatHours(Number(m?.hours_today) || 0)} brassColor={tenant.brass_color}/>
        <MetricTile label="Leads · Today" value={formatNumber(Number(m?.leads_today) || 0)} brassColor={tenant.brass_color}/>
        <MetricTile label="Tasks Completed · Today" value={formatNumber(Number(m?.tasks_today) || 0)} brassColor={tenant.brass_color}/>
        <MetricTile label="Active Agents" value={`${Number(m?.active_agents) || sceneAgents.length} / ${sceneAgents.length}`} brassColor={tenant.brass_color}/>
      </section>
      <footer className="px-6 md:px-10 py-6 text-center text-[10px] tracking-[0.2em] uppercase text-white/30 border-t border-white/5">
        Read-only · Powered by Employ the Agent
      </footer>
    </main>
  );
}
