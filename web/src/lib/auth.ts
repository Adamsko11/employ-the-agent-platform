import { getSupabaseServer, getSupabaseServiceRole } from "./supabase-server";
import type { UserRole } from "./types";

export async function getCurrentUser() {
  const supa = await getSupabaseServer();
  const { data: { user } } = await supa.auth.getUser();
  if (!user) return null;
  // Use service-role to avoid RLS recursion (app_user policies depend on app_user)
  const sr = getSupabaseServiceRole();
  const { data: appUser } = await sr
    .from("app_user")
    .select("id, email, name, role, tenant_id")
    .eq("id", user.id)
    .maybeSingle();
  return appUser as { id: string; email: string; name: string | null; role: UserRole; tenant_id: string | null } | null;
}

export async function requireRole(roles: UserRole[]) {
  const u = await getCurrentUser();
  if (!u || !roles.includes(u.role)) return null;
  return u;
}
