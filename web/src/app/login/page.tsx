"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowser } from "@/lib/supabase-browser";

type Step = "email" | "code";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<Step>("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  // Handle implicit-flow tokens in URL fragment (from admin generateLink dev path)
  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash;
    if (!hash || !hash.includes("access_token=")) return;
    const params = new URLSearchParams(hash.slice(1));
    const access_token = params.get("access_token");
    const refresh_token = params.get("refresh_token");
    if (access_token && refresh_token) {
      const supa = getSupabaseBrowser();
      supa.auth.setSession({ access_token, refresh_token }).then(() => {
        // Strip fragment and route to landing
        window.history.replaceState(null, "", "/login");
        router.push("/auth/route");
      });
    }
  }, [router]);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const supa = getSupabaseBrowser();
    const { error } = await supa.auth.signInWithOtp({ email, options: { shouldCreateUser: false } });
    setBusy(false);
    if (error) setErr(error.message);
    else setStep("code");
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    const supa = getSupabaseBrowser();
    const { error } = await supa.auth.verifyOtp({ email, token: code, type: "email" });
    setBusy(false);
    if (error) { setErr(error.message); return; }
    router.push("/auth/route");
  }

  return (
    <main className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-xs tracking-[0.2em] text-brass uppercase mb-3">EMPLOY THE AGENT</p>
        <h1 className="text-3xl font-bold mb-8">Sign in</h1>
        {step === "email" && (
          <form onSubmit={sendCode} className="space-y-4">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-brass"/>
            <button type="submit" disabled={busy} className="w-full px-6 py-3 rounded-lg bg-brass hover:bg-brass-deep transition font-medium disabled:opacity-50">{busy ? "Sending…" : "Send 6-digit code"}</button>
          </form>
        )}
        {step === "code" && (
          <form onSubmit={verifyCode} className="space-y-4">
            <p className="text-sm text-white/70">Code sent to <span className="text-white">{email}</span>. Check your inbox.</p>
            <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="123456" className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-center text-2xl tracking-[0.5em] font-mono focus:outline-none focus:border-brass" autoFocus/>
            <button type="submit" disabled={busy || code.length < 6} className="w-full px-6 py-3 rounded-lg bg-brass hover:bg-brass-deep transition font-medium disabled:opacity-50">{busy ? "Verifying…" : "Sign in"}</button>
            <button type="button" onClick={() => { setStep("email"); setCode(""); setErr(null); }} className="w-full text-xs text-white/50 hover:text-white">Use a different email</button>
          </form>
        )}
        {err && <p className="text-red-400 text-sm mt-4">{err}</p>}
      </div>
    </main>
  );
}
