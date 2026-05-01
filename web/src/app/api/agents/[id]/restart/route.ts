import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseServiceRole } from "@/lib/supabase-server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole(["founder", "evit_manager"]);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  const sr = getSupabaseServiceRole();

  // Mark a manual restart heartbeat — the worker watches for these and re-enqueues
  await sr.from("heartbeat").insert({ agent_id: id, tenant_id: (await sr.from("agent").select("tenant_id").eq("id", id).single()).data?.tenant_id, status: "running" });

  // Resolve any open alerts for this agent
  await sr.from("alert").update({ resolved_at: new Date().toISOString() }).eq("agent_id", id).is("resolved_at", null);

  await sr.from("intervention").insert({
    alert_id: null,
    user_id: me.id,
    action: "restart",
    note: "Manual restart from Ops Console",
  } as never);

  return NextResponse.json({ ok: true });
}
