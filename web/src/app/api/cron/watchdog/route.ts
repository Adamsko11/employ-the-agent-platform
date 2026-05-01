import { NextResponse } from "next/server";
import { Resend } from "resend";
import { getSupabaseServiceRole } from "@/lib/supabase-server";

// Vercel cron hits this endpoint every minute (configured in vercel.json).
// It checks the last heartbeat across the whole system. If the most recent
// heartbeat is older than HEARTBEAT_THRESHOLD_MINUTES, it sends an email
// alert to aps@evit-org.com — the only system-down notification per Founder direction.

export async function GET(req: Request) {
  // Auth: require Vercel cron secret
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sr = getSupabaseServiceRole();
  const thresholdMin = Number(process.env.HEARTBEAT_THRESHOLD_MINUTES || 5);

  // Find the most recent heartbeat
  const { data: latest } = await sr
    .from("heartbeat")
    .select("ts")
    .order("ts", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!latest) {
    // No heartbeats at all — system has never run or DB cleared. Don't alert.
    return NextResponse.json({ ok: true, status: "no-heartbeats" });
  }

  const ageMs = Date.now() - new Date(latest.ts).getTime();
  const ageMin = ageMs / 60000;

  if (ageMin < thresholdMin) {
    return NextResponse.json({ ok: true, status: "healthy", ageMin });
  }

  // Check if we already sent an alert in the last 30 min — avoid spam
  const halfHourAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString();
  const { data: recentAlert } = await sr
    .from("alert")
    .select("id")
    .eq("error_class", "system_heartbeat_lost")
    .gte("created_at", halfHourAgo)
    .maybeSingle();

  if (recentAlert) {
    return NextResponse.json({ ok: true, status: "alert-already-sent" });
  }

  // Send email
  const resend = new Resend(process.env.RESEND_API_KEY);
  const subject = "Employ the Agent — system heartbeat lost";
  const body = `The Employ the Agent agent runtime has not produced a heartbeat in ${ageMin.toFixed(1)} minutes (threshold: ${thresholdMin} min).

Last heartbeat: ${latest.ts}
Action: check Railway worker logs and restart if needed.

This is an automated alert. You will not receive another for 30 minutes.`;

  await resend.emails.send({
    from: process.env.ALERT_EMAIL_FROM!,
    to: process.env.ALERT_EMAIL_TO!,
    subject,
    text: body,
  });

  // Log the alert in DB so we can rate-limit
  await sr.from("alert").insert({
    severity: "critical",
    title: subject,
    body,
    error_class: "system_heartbeat_lost",
  });

  return NextResponse.json({ ok: true, status: "alert-sent", ageMin });
}
