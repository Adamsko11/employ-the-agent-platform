"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { formatUSD } from "@/lib/format";
import { TimeAgo } from "@/components/TimeAgo";
import type { Agent } from "@/lib/types";

interface RunRow {
  id: string;
  agent_id: string;
  task_summary: string | null;
  started_at: string;
  ended_at: string | null;
  dollars_saved: number;
  hours_saved: number;
  status: string;
}

export function ActivityFeed({ tenantId, agents, initialRuns, brassColor }: {
  tenantId: string; agents: Agent[]; initialRuns: RunRow[]; brassColor: string;
}) {
  const [runs, setRuns] = useState<RunRow[]>(initialRuns);
  const agentById = new Map(agents.map((a) => [a.id, a]));

  useEffect(() => {
    const supa = getSupabaseBrowser();
    const channel = supa.channel(`activity-${tenantId}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "agent_run", filter: `tenant_id=eq.${tenantId}` },
        (payload) => setRuns((prev) => [payload.new as RunRow, ...prev].slice(0, 12)))
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "agent_run", filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          const updated = payload.new as RunRow;
          setRuns((prev) => prev.map((r) => r.id === updated.id ? updated : r));
        })
      .subscribe();
    return () => { supa.removeChannel(channel); };
  }, [tenantId]);

  return (
    <div className="rounded-xl border border-white/5 bg-black/30 p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/50">Live Activity</p>
        <span className="flex items-center gap-2 text-[10px] text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/>
          STREAMING
        </span>
      </div>
      <ul className="space-y-3 max-h-96 overflow-y-auto">
        <AnimatePresence initial={false}>
          {runs.map((r) => {
            const agent = agentById.get(r.agent_id);
            const isComplete = r.ended_at !== null;
            return (
              <motion.li
                key={r.id}
                layout
                initial={{ opacity: 0, x: -20, height: 0 }}
                animate={{ opacity: 1, x: 0, height: "auto" }}
                exit={{ opacity: 0, x: 20, height: 0 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
                className="flex items-start gap-3 text-sm overflow-hidden"
              >
                <div className="mt-1 w-1.5 h-1.5 rounded-full" style={{ background: isComplete ? brassColor : "#10b981" }}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-white">{agent?.name || "Agent"}</span>
                    <span className="text-white/40">{agent?.role || ""}</span>
                  </div>
                  <p className="text-white/80 truncate">{r.task_summary || "Working…"}</p>
                  <div className="flex items-center gap-3 text-[10px] text-white/40 mt-0.5">
                    <TimeAgo iso={r.started_at}/>
                    {isComplete && (
                      <motion.span
                        initial={{ scale: 1.2, color: "#34d399" }}
                        animate={{ scale: 1, color: "#10b981" }}
                        transition={{ duration: 0.5 }}
                      >
                        +{formatUSD(Number(r.dollars_saved))}
                      </motion.span>
                    )}
                    {isComplete && <span>· {Number(r.hours_saved).toFixed(2)}h saved</span>}
                    {!isComplete && <span className="text-emerald-400">working…</span>}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </AnimatePresence>
        {runs.length === 0 && <p className="text-white/40 text-sm">Waiting for activity…</p>}
      </ul>
    </div>
  );
}
