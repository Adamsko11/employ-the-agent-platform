import { redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getSupabaseServiceRole } from "@/lib/supabase-server";
import { OpsConsoleClient } from "@/components/ops/OpsConsoleClient";

export const dynamic = "force-dynamic";

export default async function OpsPage() {
  const me = await requireRole(["founder", "evit_manager"]);
  if (!me) redirect("/login");

  // Founder/manager view — use service-role to bypass RLS recursion on app_user
  const sr = getSupabaseServiceRole();
  const { data: tenants } = await sr.from("tenant").select("id, slug, client_name, brass_color");
  const { data: agents } = await sr.from("agent").select("*").eq("enabled", true).order("display_order");
  const { data: heartbeats } = await sr.from("agent_latest_heartbeat" as never).select("agent_id, status, ts");
  const { data: latestRuns } = await sr.from("agent_run").select("agent_id, task_summary, started_at").order("started_at", { ascending: false }).limit(200);
  const { data: openAlerts } = await sr.from("alert").select("*").is("resolved_at", null).order("created_at", { ascending: false });

  return (
    <OpsConsoleClient
      tenants={tenants || []}
      agents={agents || []}
      initialHeartbeats={heartbeats || []}
      initialLatestRuns={latestRuns || []}
      initialOpenAlerts={openAlerts || []}
    />
  );
}
