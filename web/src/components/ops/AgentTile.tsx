"use client";
import type { AgentStatus } from "@/lib/types";
import { TimeAgo } from "@/components/TimeAgo";

interface Props {
  agent: { id: string; name: string; role: string; tenant_id: string };
  status: AgentStatus;
  lastTask: string | null;
  lastHeartbeat: string | null;
  selected: boolean;
  onClick(): void;
}

const STATUS_COLOR: Record<AgentStatus, string> = {
  running: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
  idle:    "bg-white/5 text-white/60 border-white/10",
  stuck:   "bg-amber-500/20 text-amber-300 border-amber-500/40",
  failed:  "bg-red-500/25 text-red-300 border-red-500/60",
  paused:  "bg-red-500/15 text-red-300 border-red-500/40",
};

export function AgentTile({ agent, status, lastTask, lastHeartbeat, selected, onClick }: Props) {
  const isFailed = status === "failed" || status === "paused";
  return (
    <button
      onClick={onClick}
      className={`text-left p-4 rounded-lg border transition w-full
        ${selected ? "border-brass" : "border-white/10 hover:border-white/30"}
        ${isFailed ? "ring-2 ring-red-500/40" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <div>
          <p className="font-bold text-white">{agent.name}</p>
          <p className="text-[10px] tracking-[0.15em] uppercase text-white/50">{agent.role}</p>
        </div>
        <span className={`px-2 py-0.5 text-[10px] uppercase tracking-wider rounded border ${STATUS_COLOR[status]}`}>
          {status}
        </span>
      </div>
      <p className="text-xs text-white/70 truncate min-h-[1rem]">{lastTask || "—"}</p>
      <p className="text-[10px] text-white/40 mt-2">
        {lastHeartbeat ? <TimeAgo iso={lastHeartbeat} prefix="heartbeat "/> : "no heartbeat"}
      </p>
    </button>
  );
}
