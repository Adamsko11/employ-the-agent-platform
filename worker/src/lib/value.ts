// Map task type to estimated hours-saved.
// Conservative defaults — tweak per tenant later.
const TASK_HOURS_SAVED: Record<string, number> = {
  bd_research: 0.75,
  outreach_draft: 0.4,
  crm_update: 0.25,
  reporting: 1.0,
  strategy: 1.5,
  default: 0.3,
};

export function classifyTask(taskSummary: string): keyof typeof TASK_HOURS_SAVED {
  const s = taskSummary.toLowerCase();
  if (s.includes("research") || s.includes("scoring") || s.includes("scanning")) return "bd_research";
  if (s.includes("draft") || s.includes("outreach") || s.includes("email") || s.includes("dm")) return "outreach_draft";
  if (s.includes("crm") || s.includes("hubspot") || s.includes("dedupe") || s.includes("logging")) return "crm_update";
  if (s.includes("digest") || s.includes("report") || s.includes("snapshot")) return "reporting";
  if (s.includes("strategy") || s.includes("okr") || s.includes("competitive") || s.includes("synthes")) return "strategy";
  return "default";
}

export function estimateValue(taskSummary: string, loadedRateEur: number) {
  const hours = TASK_HOURS_SAVED[classifyTask(taskSummary)];
  // EUR -> USD rough convert (1 EUR ~ 1.07 USD); keep simple, configurable later.
  const dollarsSaved = hours * loadedRateEur * 1.07;
  return { hours, dollarsSaved };
}
