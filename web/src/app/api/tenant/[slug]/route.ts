import { NextResponse } from "next/server";
import { requireRole } from "@/lib/auth";
import { getSupabaseServiceRole } from "@/lib/supabase-server";

export async function PATCH(req: Request, { params }: { params: Promise<{ slug: string }> }) {
  const me = await requireRole(["founder", "evit_manager", "tenant_admin"]);
  if (!me) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { slug } = await params;
  const sr = getSupabaseServiceRole();

  const { data: tenant } = await sr.from("tenant").select("id").eq("slug", slug).single();
  if (!tenant) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (me.role === "tenant_admin" && tenant.id !== me.tenant_id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const t = body.tenant;
  const agents = body.agents || [];

  // Tenant admins can only update brand/metrics, not agents
  const tenantUpdate: Record<string, unknown> = {
    wordmark: t.wordmark,
    mark: t.mark,
    client_name: t.client_name,
    brass_color: t.brass_color,
    starting_metrics: t.starting_metrics,
    loaded_hourly_rate_eur: t.loaded_hourly_rate_eur,
  };
  if (me.role === "founder" || me.role === "evit_manager") {
    tenantUpdate.context_preset = t.context_preset;
  }
  await sr.from("tenant").update(tenantUpdate).eq("id", tenant.id);

  if (me.role === "founder" || me.role === "evit_manager") {
    for (const a of agents) {
      await sr.from("agent").update({
        name: a.name, role: a.role, daily_budget_usd: a.daily_budget_usd, rotating_tasks: a.rotating_tasks,
      }).eq("id", a.id);
    }
  }
  return NextResponse.json({ ok: true });
}
