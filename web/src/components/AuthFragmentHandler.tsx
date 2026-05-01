"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

export function AuthFragmentHandler() {
  const router = useRouter();
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token=")) return;
    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (!access_token || !refresh_token) return;
    (async () => {
      const supa = getSupabaseBrowser();
      const { error } = await supa.auth.setSession({ access_token, refresh_token });
      if (!error) {
        window.history.replaceState(null, "", window.location.pathname);
        router.push("/auth/route");
      }
    })();
  }, [router]);
  return null;
}
