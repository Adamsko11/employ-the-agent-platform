import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { getSupabaseServer } from "@/lib/supabase-server";
import { AdminClient } from "@/components/admin/AdminClient";

export const dynamic = "force-dynamic";

export default async function AdminPage({ params }: { params: Promise<{ slug: string }> }) {
  const me = await requireRole(["founder", "evit_manager", "tenant_admin"]);
  if (!me) redirect("/login");

  const { slug } = await params;
  const supa = await getSupabaseServer();
  const { data: tenant } = await supa.from("tenant").select("*").eq("slug", slug).maybeSingle();
  if (!tenant) notFound();
  // Tenant admins can only edit their own tenant
  if (me.role === "tenant_admin" && tenant.id !== me.tenant_id) redirect(`/${slug}/dashboard`);

  const { data: agents } = await supa.from("agent").select("*").eq("tenant_id", tenant.id).order("display_order");

  return <AdminClient tenant={tenant} agents={agents || []} canEditAll={me.role === "founder"} />;
}
