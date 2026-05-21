import type { ReactNode } from "react";

export const fmtKr = (n: number) => `${Number(n).toLocaleString("da-DK")} kr`;
export const fmtDate = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleDateString("da-DK", { day: "2-digit", month: "short" }) : "—";
export const fmtDateTime = (s: string | null | undefined) =>
  s ? new Date(s).toLocaleString("da-DK", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—";

// Defensiv: cache-deling mellem faner har historisk leveret en Map
// her — så vi sikrer altid en array før .filter/.reduce.
export const asArray = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v as T[]) : []);

/**
 * Churn-risk-score 0–100 baseret på betalingsfejl, past_due-status,
 * kort tid til fornyelse uden aktivitet, og cancel_at_period_end.
 */
export const churnRiskScore = (p: any): number => {
  let score = 0;
  if (p.status === "past_due") score += 50;
  if (p.last_payment_failed_at) score += 25;
  if (p.cancel_at_period_end) score += 30;
  if (p.status === "trialing" && p.trial_ends_at) {
    const daysLeft = (new Date(p.trial_ends_at).getTime() - Date.now()) / 86400000;
    if (daysLeft <= 3) score += 20;
  }
  if (p.status === "unpaid") score += 60;
  return Math.min(100, score);
};

export const monthlyAmount = (p: any): number =>
  p.billing_period === "yearly"
    ? Number(p.monthly_price_dkk || 0) / 12
    : Number(p.monthly_price_dkk || 0);

export const statusColor: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-700 border-red-500/20",
};

export const planStatusColor: Record<string, string> = {
  trialing: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  past_due: "bg-red-500/10 text-red-700 border-red-500/20",
  canceled: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  cancelled: "bg-slate-500/10 text-slate-700 border-slate-500/20",
  incomplete: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  unpaid: "bg-red-500/10 text-red-700 border-red-500/20",
};

export type FieldProps = { label: string; children: ReactNode };