"use client";
import { useState } from "react";
import type { Tenant, Agent } from "@/lib/types";
import Link from "next/link";

interface Props { tenant: Tenant; agents: Agent[]; canEditAll: boolean; }

type Tab = "brand" | "agents" | "metrics" | "context";

export function AdminClient({ tenant, agents, canEditAll }: Props) {
  const [tab, setTab] = useState<Tab>("brand");
  const [t, setT] = useState(tenant);
  const [as, setAs] = useState(agents);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function save() {
    setSaving(true);
    setSaved(false);
    await fetch(`/api/tenant/${t.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenant: t, agents: as }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function exportConfig() {
    const blob = new Blob([JSON.stringify({ tenant: t, agents: as }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${t.slug}-config.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-slate-900 text-white grid grid-cols-[280px_1fr]">
      <aside className="border-r border-white/10 p-6">
        <div className="flex items-center gap-3 mb-10">
          <div className="w-8 h-8 rounded" style={{ background: t.brass_color }} />
          <div>
            <p className="text-[10px] tracking-[0.2em] text-brass uppercase">{t.mark || "ETA"} · Admin</p>
            <p className="font-bold">Customise</p>
          </div>
        </div>
        <nav className="space-y-1">
          {(["brand", "agents", "metrics", "context"] as Tab[]).map((x) => (
            <button key={x} onClick={() => setTab(x)} className={`w-full text-left px-3 py-2 rounded ${tab === x ? "bg-brass text-white" : "hover:bg-white/5 text-white/70"}`}>
              {x === "brand" ? "Brand" : x === "agents" ? "Agents" : x === "metrics" ? "Metrics" : "Context preset"}
            </button>
          ))}
        </nav>
        <Link href={`/${t.slug}/dashboard`} className="mt-10 block text-xs text-white/50 hover:text-white">← Back to office</Link>
      </aside>

      <main className="p-10 max-w-3xl">
        {tab === "brand" && (
          <div className="space-y-6">
            <p className="text-[10px] tracking-[0.2em] text-brass uppercase">BRAND</p>
            <h2 className="text-3xl font-bold">Brand &amp; client</h2>
            <Field label="Wordmark" value={t.wordmark} onChange={(v) => setT({ ...t, wordmark: v })}/>
            <Field label="Mark (max 4 chars)" value={t.mark} onChange={(v) => setT({ ...t, mark: v.slice(0, 4) })}/>
            <Field label="Client name" value={t.client_name} onChange={(v) => setT({ ...t, client_name: v })}/>
            <ColorField label="Brass colour" value={t.brass_color} onChange={(v) => setT({ ...t, brass_color: v })}/>
          </div>
        )}
        {tab === "agents" && (
          <div className="space-y-6">
            <p className="text-[10px] tracking-[0.2em] text-brass uppercase">AGENTS</p>
            <h2 className="text-3xl font-bold">Agent roster</h2>
            {as.map((a, idx) => (
              <div key={a.id} className="border border-white/10 rounded-lg p-5 space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="text-xl font-bold">{a.name}</h3>
                  <span className="text-[10px] tracking-[0.15em] uppercase text-white/40">{a.role}</span>
                </div>
                <Field label="Name" value={a.name} onChange={(v) => setAs(as.map((x, i) => i === idx ? { ...x, name: v } : x))}/>
                <Field label="Role" value={a.role} onChange={(v) => setAs(as.map((x, i) => i === idx ? { ...x, role: v } : x))}/>
                <NumField label="Daily budget (USD)" value={a.daily_budget_usd} onChange={(v) => setAs(as.map((x, i) => i === idx ? { ...x, daily_budget_usd: v } : x))}/>
                <TextAreaField label="Rotating tasks (one per line)" value={a.rotating_tasks.join("\n")} onChange={(v) => setAs(as.map((x, i) => i === idx ? { ...x, rotating_tasks: v.split("\n").filter(Boolean) } : x))}/>
              </div>
            ))}
          </div>
        )}
        {tab === "metrics" && (
          <div className="space-y-6">
            <p className="text-[10px] tracking-[0.2em] text-brass uppercase">METRICS</p>
            <h2 className="text-3xl font-bold">Starting metrics</h2>
            <p className="text-sm text-white/60">Used until real agent activity accumulates. The AugmentedHype-style seed data.</p>
            <div className="grid grid-cols-2 gap-4">
              <NumField label="Hours saved this month — start" value={t.starting_metrics.hours_saved_month} onChange={(v) => setT({ ...t, starting_metrics: { ...t.starting_metrics, hours_saved_month: v } })}/>
              <NumField label="Leads today — start" value={t.starting_metrics.leads_today} onChange={(v) => setT({ ...t, starting_metrics: { ...t.starting_metrics, leads_today: v } })}/>
              <NumField label="Tasks today — start" value={t.starting_metrics.tasks_today} onChange={(v) => setT({ ...t, starting_metrics: { ...t.starting_metrics, tasks_today: v } })}/>
              <NumField label="Total $ saved — start" value={t.starting_metrics.dollars_saved_total} onChange={(v) => setT({ ...t, starting_metrics: { ...t.starting_metrics, dollars_saved_total: v } })}/>
            </div>
            <NumField label="Loaded hourly rate (EUR) — drives $ saved calc" value={t.loaded_hourly_rate_eur} onChange={(v) => setT({ ...t, loaded_hourly_rate_eur: v })}/>
          </div>
        )}
        {tab === "context" && (
          <div className="space-y-6">
            <p className="text-[10px] tracking-[0.2em] text-brass uppercase">CONTEXT PRESET</p>
            <h2 className="text-3xl font-bold">Context preset</h2>
            <SelectField label="Active preset" value={t.context_preset} options={["executive_consulting", "sales_led_saas", "agency", "manufacturing", "real_estate", "legal", "aec"]} onChange={(v) => setT({ ...t, context_preset: v as Tenant["context_preset"] })}/>
            <p className="text-sm text-white/60">Auto-fills the agent task cycles to match the chosen industry tone. The Agents tab still lets you fine-tune any task cycle individually.</p>
          </div>
        )}
        <div className="mt-10 flex items-center justify-between border-t border-white/10 pt-5">
          <p className="text-xs text-white/50">{saved ? "Saved." : saving ? "Saving…" : canEditAll ? "Founder can save changes globally." : "Tenant admin: limited edit scope."}</p>
          <div className="flex gap-3">
            <button onClick={exportConfig} className="px-4 py-2 border border-white/20 rounded text-sm hover:bg-white/5">Export config</button>
            <button onClick={save} disabled={saving} className="px-5 py-2 bg-brass hover:bg-brass-deep rounded text-sm font-medium">Save changes</button>
          </div>
        </div>
      </main>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange(v: string): void; }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.2em] uppercase text-white/50 mb-2">{label}</label>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded focus:outline-none focus:border-brass"/>
    </div>
  );
}
function NumField({ label, value, onChange }: { label: string; value: number; onChange(v: number): void; }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.2em] uppercase text-white/50 mb-2">{label}</label>
      <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded focus:outline-none focus:border-brass"/>
    </div>
  );
}
function ColorField({ label, value, onChange }: { label: string; value: string; onChange(v: string): void; }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.2em] uppercase text-white/50 mb-2">{label}</label>
      <div className="flex gap-2 items-center">
        <input type="color" value={value} onChange={(e) => onChange(e.target.value)} className="h-10 w-16 rounded border border-white/10 bg-transparent"/>
        <input value={value} onChange={(e) => onChange(e.target.value)} className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded font-mono text-sm"/>
      </div>
    </div>
  );
}
function TextAreaField({ label, value, onChange }: { label: string; value: string; onChange(v: string): void; }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.2em] uppercase text-white/50 mb-2">{label}</label>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={5} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded font-mono text-sm focus:outline-none focus:border-brass"/>
    </div>
  );
}
function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange(v: string): void; }) {
  return (
    <div>
      <label className="block text-[10px] tracking-[0.2em] uppercase text-white/50 mb-2">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded focus:outline-none focus:border-brass">
        {options.map((o) => <option key={o} value={o}>{o.replace(/_/g, " ")}</option>)}
      </select>
    </div>
  );
}
