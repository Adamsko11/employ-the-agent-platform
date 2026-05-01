"use client";
import { useEffect, useMemo, useState } from "react";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { AgentTile } from "./AgentTile";
import { OpsSidePanel } from "./OpsSidePanel";
import type { Agent, AgentRun, AgentStatus, Alert } from "@/lib/types";

interface Tenant { id: string; slug: string; client_name: string; brass_color: string; }

interface Props {
  tenants: Tenant[];
  agents: Agent[];
  initialHeartbeats: Array<{ agent_id: string; status: AgentStatus; ts: string }>;
  initialLatestRuns: Array<{ agent_id: string; task_summary: string | null; started_at: string }>;
  initialOpenAlerts: Alert[];
}

export function OpsConsoleClient({ tenants, agents, initialHeartbeats, initialLatestRuns, initialOpenAlerts }: Props) {
  const [hbByAgent, setHbByAgent] = useState(() => {
    const m = new Map<string, { status: AgentStatus; ts: string }>();
    for (const h of initialHeartbeats) m.set(h.agent_id, { status: h.status, ts: h.ts });
    return m;
  });
  const [taskByAgent, setTaskByAgent] = useState(() => {
    const m = new Map<string, string>();
    for (const r of initialLatestRuns) if (!m.has(r.agent_id)) m.set(r.agent_id, r.task_summary || "");
    return m;
  });
  const [openAlerts, setOpenAlerts] = useState<Alert[]>(initialOpenAlerts);
  const [selected, setSelected] = useState<Agent | null>(null);
  const [recentRuns, setRecentRuns] = useState<AgentRun[]>([]);

  // Realtime subscriptions
  useEffect(() => {
    const supa = getSupabaseBrowser();
    const channel = supa.channel("ops")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "heartbeat" }, (payload) => {
        const h = payload.new as { agent_id: string; status: AgentStatus; ts: string };
        setHbByAgent((prev) => new Map(prev).set(h.agent_id, { status: h.status, ts: h.ts }));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "agent_run" }, (payload) => {
        const r = payload.new as { agent_id: string; task_summary: string | null };
        setTaskByAgent((prev) => new Map(prev).set(r.agent_id, r.task_summary || ""));
      })
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "alert" }, (payload) => {
        const a = payload.new as Alert;
        if (!a.resolved_at) setOpenAlerts((prev) => [a, ...prev]);
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "alert" }, (payload) => {
        const a = payload.new as Alert;
        setOpenAlerts((prev) => a.resolved_at ? prev.filter(x => x.id !== a.id) : prev.map(x => x.id === a.id ? a : x));
      })
      .subscribe();
    return () => { supa.removeChannel(channel); };
  }, []);

  // Load recent runs when selecting an agent
  useEffect(() => {
    if (!selected) return;
    const supa = getSupabaseBrowser();
    supa.from("agent_run").select("*").eq("agent_id", selected.id).order("started_at", { ascending: false }).limit(20)
      .then(({ data }) => setRecentRuns((data as AgentRun[]) || []));
  }, [selected]);

  const agentsByTenant = useMemo(() => {
    const m = new Map<string, Agent[]>();
    for (const a of agents) {
      if (!m.has(a.tenant_id)) m.set(a.tenant_id, []);
      m.get(a.tenant_id)!.push(a);
    }
    return m;
  }, [agents]);

  const failedCountByTenant = useMemo(() => {
    const m = new Map<string, number>();
    for (const [agentId, hb] of hbByAgent) {
      if (hb.status === "failed" || hb.status === "stuck") {
        const a = agents.find(x => x.id === agentId);
        if (a) m.set(a.tenant_id, (m.get(a.tenant_id) || 0) + 1);
      }
    }
    return m;
  }, [hbByAgent, agents]);

  async function restartAgent() {
    if (!selected) return;
    await fetch(`/api/agents/${selected.id}/restart`, { method: "POST" });
  }
  async function acknowledgeAlert(alertId: string) {
    await fetch(`/api/alerts/${alertId}/acknowledge`, { method: "POST" });
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white">
      <header className="px-8 py-5 border-b border-white/5 flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-brass">Operations Console</p>
          <h1 className="text-2xl font-bold">All tenants · Live</h1>
        </div>
        <p className="text-sm text-white/50">{tenants.length} tenants · {agents.length} agents</p>
      </header>

      <div className="p-8 space-y-8">
        {tenants.map((t) => {
          const tAgents = agentsByTenant.get(t.id) || [];
          const failedN = failedCountByTenant.get(t.id) || 0;
          return (
            <section key={t.id} className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded" style={{ background: t.brass_color }}/>
                <h2 className="text-lg font-bold">{t.client_name}</h2>
                <span className="text-xs text-white/40">/{t.slug}</span>
                {failedN > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-[10px] uppercase tracking-wider rounded bg-red-500/25 text-red-300 border border-red-500/40">
                    {failedN} failing
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3">
                {tAgents.map((a) => {
                  const hb = hbByAgent.get(a.id);
                  return (
                    <AgentTile
                      key={a.id}
                      agent={a}
                      status={hb?.status ?? "idle"}
                      lastTask={taskByAgent.get(a.id) ?? null}
                      lastHeartbeat={hb?.ts ?? null}
                      selected={selected?.id === a.id}
                      onClick={() => setSelected(a)}
                    />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {selected && (
        <OpsSidePanel
          agent={selected}
          recentRuns={recentRuns}
          openAlerts={openAlerts.filter(a => a.agent_id === selected.id)}
          onClose={() => setSelected(null)}
          onRestart={restartAgent}
          onAcknowledge={acknowledgeAlert}
        />
      )}
    </main>
  );
}
