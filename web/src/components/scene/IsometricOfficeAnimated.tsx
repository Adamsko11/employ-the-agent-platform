"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { IsometricOffice } from "./IsometricOffice";
import type { Agent, AgentStatus } from "@/lib/types";

interface AgentOnScene extends Agent {
  current_task: string | null;
  status: AgentStatus;
}

interface FloatingValue {
  id: number;
  agentId: string;
  amount: number;
  x: number;
  y: number;
}

const DESK_POSITIONS: Record<number, { x: number; y: number }> = {
  0: { x: 320, y: 320 },
  1: { x: 410, y: 350 },
  2: { x: 500, y: 320 },
  3: { x: 590, y: 350 },
  4: { x: 680, y: 320 },
};

interface Props {
  agents: AgentOnScene[];
  brassColor: string;
  tenantId: string;
}

export function IsometricOfficeAnimated({ agents, brassColor, tenantId }: Props) {
  const [floats, setFloats] = useState<FloatingValue[]>([]);
  const idCounter = useRef(0);

  useEffect(() => {
    const supa = getSupabaseBrowser();
    const channel = supa.channel(`scene-${tenantId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "agent_run", filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          const r = payload.new as { agent_id: string; dollars_saved: number; ended_at: string | null };
          if (!r.ended_at || Number(r.dollars_saved) <= 0) return;
          const agentIdx = agents.findIndex((a) => a.id === r.agent_id);
          if (agentIdx < 0) return;
          const pos = DESK_POSITIONS[agentIdx] || { x: 500, y: 340 };
          const id = ++idCounter.current;
          const newFloat = { id, agentId: r.agent_id, amount: Number(r.dollars_saved), x: pos.x, y: pos.y };
          setFloats((prev) => [...prev, newFloat]);
          // Auto-remove after animation
          setTimeout(() => setFloats((prev) => prev.filter((f) => f.id !== id)), 2400);
        })
      .subscribe();
    return () => { supa.removeChannel(channel); };
  }, [tenantId, agents]);

  return (
    <div className="relative">
      <IsometricOffice agents={agents} brassColor={brassColor} />

      {/* Floating $ popups — overlay an SVG matching the office viewBox */}
      <svg viewBox="0 0 1000 540" className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
        <AnimatePresence>
          {floats.map((f) => (
            <motion.text
              key={f.id}
              initial={{ y: f.y - 10, opacity: 0, scale: 0.6 }}
              animate={{ y: f.y - 80, opacity: [0, 1, 1, 0], scale: 1.05 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.2, ease: "easeOut", times: [0, 0.1, 0.7, 1] }}
              x={f.x}
              textAnchor="middle"
              fontSize="16"
              fontWeight="700"
              fill="#10b981"
              fontFamily="Inter Tight, sans-serif"
              style={{ filter: "drop-shadow(0 0 6px rgba(16,185,129,0.6))" }}
            >
              +${f.amount.toFixed(2)}
            </motion.text>
          ))}
        </AnimatePresence>
      </svg>
    </div>
  );
}
