import { NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase-server";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  if (code) {
    const supa = await getSupabaseServer();
    await supa.auth.exchangeCodeForSession(code);
  }
  // Route to a sensible landing based on role
  const supa = await getSupabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (user) {
    const { data: appUser } = await supa
      .from("app_user")
      .select("role, tenant_id")
      .eq("id", user.id)
      .maybeSingle();
    if (appUser?.role === "founder" || appUser?.role === "evit_manager") {
      return NextResponse.redirect(`${origin}/ops`);
    }
    if (appUser?.tenant_id) {
      const { data: tenant } = await supa.from("tenant").select("slug").eq("id", appUser.tenant_id).single();
      if (tenant) return NextResponse.redirect(`${origin}/${tenant.slug}/dashboard`);
    }
  }
  return NextResponse.redirect(`${origin}/`);
}
