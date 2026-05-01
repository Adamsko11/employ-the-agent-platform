import Anthropic from "@anthropic-ai/sdk";
import { getSupabase } from "../lib/db.js";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
const MODEL = process.env.ANTHROPIC_MANAGER_MODEL || "claude-haiku-4-5-20251001";

const AUTO_HANDLE_CLASSES = new Set(["rate_limit", "mcp_error", "transient_external"]);

const SYSTEM_PROMPT = `You are the AI Manager for Employ the Agent — a platform that runs Claude agents on behalf of clients.
Your job is to triage agent failures.

For each alert you receive, you produce:
1. A 1–2 sentence plain-language summary for the human Ops manager.
2. A classification: rate_limit | mcp_error | prompt_error | budget_exceeded | unknown
3. A recommended action: auto_retry | restart | escalate | wait

Rules:
- Be concise. The human has 5 seconds to read your summary.
- Recommend auto_retry only for rate_limit or transient mcp_error.
- Recommend escalate (default) when uncertain.
- Never invent details that aren't in the error context.

Output format (JSON only, no markdown):
{"summary": "...", "classification": "...", "action": "..."}`;

interface AlertRow {
  id: string;
  tenant_id: string | null;
  agent_id: string | null;
  severity: string;
  title: string;
  body: string | null;
  error_class: string | null;
  ai_manager_summary: string | null;
}

async function triageAlert(alert: AlertRow) {
  const supa = getSupabase();

  // Pull last 10 runs for context if we have an agent
  let context = "";
  if (alert.agent_id) {
    const { data: runs } = await supa.from("agent_run").select("status, task_summary, error_message, error_class, started_at")
      .eq("agent_id", alert.agent_id).order("started_at", { ascending: false }).limit(10);
    if (runs) context = "Recent runs:\n" + runs.map(r => `- ${r.started_at} [${r.status}] ${r.task_summary || ""} ${r.error_message || ""}`).join("\n");
  }

  const userMsg = `Alert title: ${alert.title}
Severity: ${alert.severity}
Error class hint: ${alert.error_class || "unknown"}
Body: ${alert.body || "(none)"}

${context}`;

  try {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: userMsg }],
    });

    const text = response.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { type: "text"; text: string }).text)
      .join("\n");

    let parsed: { summary?: string; classification?: string; action?: string } = {};
    try {
      // Strip any markdown fences just in case
      const clean = text.replace(/```json\s*|```/g, "").trim();
      parsed = JSON.parse(clean);
    } catch {
      parsed = { summary: text.slice(0, 240), classification: "unknown", action: "escalate" };
    }

    const action = parsed.action || "escalate";
    const willAutoHandle = action === "auto_retry" && AUTO_HANDLE_CLASSES.has(parsed.classification || "");

    await supa.from("alert").update({
      ai_manager_summary: parsed.summary || "(no summary)",
      ai_manager_action: willAutoHandle ? "auto_retry" : action,
    }).eq("id", alert.id);

    if (willAutoHandle) {
      // Resolve auto-retried alerts immediately; the next agent tick will retry naturally
      console.log(`[manager] auto-retry for alert ${alert.id} (${parsed.classification})`);
    }
  } catch (err) {
    console.error("[manager] triage failed", err);
  }
}

export async function runManagerTick() {
  const supa = getSupabase();
  // Find untriaged alerts (no ai_manager_summary, not yet resolved)
  const { data: alerts } = await supa.from("alert")
    .select("*")
    .is("ai_manager_summary", null)
    .is("resolved_at", null)
    .order("created_at", { ascending: true })
    .limit(20);

  if (!alerts || alerts.length === 0) return;
  console.log(`[manager] triaging ${alerts.length} alerts`);
  await Promise.all((alerts as AlertRow[]).map(triageAlert));
}
