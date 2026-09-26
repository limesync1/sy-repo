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
  active: "bg-success/10 text-success border-success/20",
  paused: "bg-warning/10 text-warning-foreground dark:text-warning border-warning/20",
  cancelled: "bg-destructive/10 text-destructive border-destructive/20",
};

export const planStatusColor: Record<string, string> = {
  trialing: "bg-accent/10 text-accent border-accent/20",
  active: "bg-success/10 text-success border-success/20",
  past_due: "bg-destructive/10 text-destructive border-destructive/20",
  canceled: "bg-secondary text-muted-foreground border-border",
  cancelled: "bg-secondary text-muted-foreground border-border",
  incomplete: "bg-warning/10 text-warning-foreground dark:text-warning border-warning/20",
  unpaid: "bg-destructive/10 text-destructive border-destructive/20",
};

export type FieldProps = { label: string; children: ReactNode };