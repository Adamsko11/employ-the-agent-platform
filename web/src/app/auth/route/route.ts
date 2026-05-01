import { NextResponse } from "next/server";
import { getSupabaseServer, getSupabaseServiceRole } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supa = await getSupabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return NextResponse.redirect(`${origin}/login`);

  // Use service-role to read role (avoids RLS recursion on app_user)
  const sr = getSupabaseServiceRole();
  const { data: appUser } = await sr
    .from("app_user")
    .select("role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();

  if (appUser?.role === "founder" || appUser?.role === "evit_manager") {
    return NextResponse.redirect(`${origin}/ops`);
  }
  if (appUser?.tenant_id) {
    const { data: tenant } = await sr.from("tenant").select("slug").eq("id", appUser.tenant_id).single();
    if (tenant) return NextResponse.redirect(`${origin}/${tenant.slug}/dashboard`);
  }
  return NextResponse.redirect(`${origin}/`);
}
