"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useMotionValueEvent } from "framer-motion";
import { getSupabaseBrowser } from "@/lib/supabase-browser";
import { formatUSD } from "@/lib/format";

interface Props {
  initialValue: number;
  tenantId: string;
}

export function LiveDollarTicker({ initialValue, tenantId }: Props) {
  const target = useRef(initialValue);
  const motionVal = useMotionValue(initialValue);
  const spring = useSpring(motionVal, { stiffness: 60, damping: 20, mass: 1 });
  const [display, setDisplay] = useState(initialValue);
  const [flash, setFlash] = useState(false);

  // Sync the spring's animated value into React state for rendering
  useMotionValueEvent(spring, "change", (v) => setDisplay(v));

  // Ambient drift
  useEffect(() => {
    const id = setInterval(() => {
      target.current += Math.random() * 0.4 + 0.05;
      motionVal.set(target.current);
    }, 1500);
    return () => clearInterval(id);
  }, [motionVal]);

  // Real updates from Realtime
  useEffect(() => {
    const supa = getSupabaseBrowser();
    const channel = supa.channel(`ticker-${tenantId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "agent_run", filter: `tenant_id=eq.${tenantId}` },
        (payload) => {
          const r = payload.new as { dollars_saved: number; ended_at: string | null };
          if (r.ended_at && Number(r.dollars_saved) > 0) {
            target.current += Number(r.dollars_saved);
            motionVal.set(target.current);
            setFlash(true);
            setTimeout(() => setFlash(false), 900);
          }
        })
      .subscribe();
    return () => { supa.removeChannel(channel); };
  }, [tenantId, motionVal]);

  return (
    <div className="text-right">
      <p className="text-[10px] tracking-[0.2em] text-white/60 uppercase">Total $ Saved · Live</p>
      <motion.p
        className="text-3xl md:text-4xl font-bold tabular-nums"
        animate={{ color: flash ? "#10b981" : "#ffffff", scale: flash ? 1.04 : 1 }}
        transition={{ duration: 0.3 }}
      >
        {formatUSD(display)}
      </motion.p>
    </div>
  );
}
