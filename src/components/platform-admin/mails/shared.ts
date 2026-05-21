export const STATUS_LABEL: Record<string, string> = {
  sent: "Leveret",
  pending: "Afventer",
  suppressed: "Blokeret",
  failed: "Fejlet",
  bounced: "Bounced",
  complained: "Klage",
  dlq: "DLQ",
};

export const STATUS_TONE: Record<string, string> = {
  sent: "border-emerald-400/40 bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300",
  pending: "border-border bg-secondary/60 text-foreground",
  suppressed: "border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300",
  failed: "border-destructive/40 bg-destructive/10 text-destructive",
  bounced: "border-destructive/40 bg-destructive/10 text-destructive",
  complained: "border-destructive/40 bg-destructive/10 text-destructive",
  dlq: "border-destructive/40 bg-destructive/10 text-destructive",
};

export const RANGES = [
  { value: "24h", label: "24 timer", hours: 24 },
  { value: "7d", label: "7 dage", hours: 24 * 7 },
  { value: "30d", label: "30 dage", hours: 24 * 30 },
  { value: "all", label: "Alle", hours: 0 },
];

export function fmtTime(iso: string) {
  return new Date(iso).toLocaleString("da-DK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}