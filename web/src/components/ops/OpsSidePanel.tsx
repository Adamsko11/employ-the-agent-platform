"use client";
import { X, RotateCw, CheckCircle2 } from "lucide-react";
import type { AgentRun, Alert } from "@/lib/types";
import { formatUSD } from "@/lib/format";
import { TimeAgo } from "@/components/TimeAgo";

interface Props {
  agent: { id: string; name: string; role: string };
  recentRuns: AgentRun[];
  openAlerts: Alert[];
  onClose(): void;
  onRestart(): void;
  onAcknowledge(alertId: string): void;
}

export function OpsSidePanel({ agent, recentRuns, openAlerts, onClose, onRestart, onAcknowledge }: Props) {
  return (
    <aside className="fixed top-0 right-0 h-full w-full md:w-[460px] bg-slate-900 border-l border-white/10 overflow-y-auto z-50">
      <div className="p-5 border-b border-white/10 flex items-center justify-between">
        <div>
          <p className="text-[10px] tracking-[0.2em] uppercase text-white/50">{agent.role}</p>
          <h3 className="text-xl font-bold text-white">{agent.name}</h3>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white p-2"><X size={20}/></button>
      </div>

      {openAlerts.length > 0 && (
        <div className="p-5 border-b border-white/10 bg-red-950/30">
          <p className="text-[10px] tracking-[0.2em] uppercase text-red-300 mb-2">Open alerts ({openAlerts.length})</p>
          <ul className="space-y-3">
            {openAlerts.map((a) => (
              <li key={a.id} className="text-sm">
                <p className="font-medium text-red-200">{a.title}</p>
                {a.ai_manager_summary && (
                  <p className="text-xs mt-1 text-amber-200/80 italic">AI Manager: {a.ai_manager_summary}</p>
                )}
                <p className="text-xs text-white/50 mt-1"><TimeAgo iso={a.created_at}/></p>
                <div className="flex gap-2 mt-2">
                  <button onClick={() => onAcknowledge(a.id)} className="text-xs px-3 py-1 rounded border border-white/20 hover:bg-white/5 flex items-center gap-1">
                    <CheckCircle2 size={12}/> Acknowledge
                  </button>
                </div>
              </li>
            ))}
          </ul>
          <button onClick={onRestart} className="mt-3 w-full text-xs px-3 py-2 rounded bg-brass hover:bg-brass-deep text-white flex items-center justify-center gap-2">
            <RotateCw size={14}/> Restart agent
          </button>
        </div>
      )}

      <div className="p-5">
        <p className="text-[10px] tracking-[0.2em] uppercase text-white/50 mb-3">Recent runs</p>
        <ul className="space-y-3">
          {recentRuns.map((r) => (
            <li key={r.id} className="border-b border-white/5 pb-3">
              <p className="text-sm text-white/90">{r.task_summary || "—"}</p>
              <div className="flex items-center justify-between text-xs text-white/40 mt-1">
                <TimeAgo iso={r.started_at}/>
                <span>{formatUSD(r.cost_usd)} · {r.prompt_tokens + r.completion_tokens} tokens</span>
              </div>
              {r.error_message && (
                <p className="text-xs text-red-300 mt-1 font-mono">{r.error_message.slice(0, 200)}</p>
              )}
            </li>
          ))}
          {recentRuns.length === 0 && <p className="text-sm text-white/40">No recent runs.</p>}
        </ul>
      </div>
    </aside>
  );
}
