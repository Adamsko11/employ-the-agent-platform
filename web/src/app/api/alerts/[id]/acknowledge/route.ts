import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseServiceRole } from "@/lib/supabase-server";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const me = await requireRole(["founder", "evit_manager"]);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const { id } = await params;
  const sr = getSupabaseServiceRole();
  await sr.from("alert").update({
    acknowledged_by: me.id,
    acknowledged_at: new Date().toISOString(),
  }).eq("id", id);
  await sr.from("intervention").insert({
    alert_id: id, user_id: me.id, action: "acknowledge", note: null,
  } as never);
  return NextResponse.json({ ok: true });
}
