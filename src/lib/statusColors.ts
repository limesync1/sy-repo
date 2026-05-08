/**
 * Centralt farvesystem for status og intervaller.
 * Brug disse hjælpere alle steder hvor en status eller et interval vises som badge,
 * så farverne forbliver ensartede på tværs af hele platformen.
 */

export type StatusKey =
  | "pending"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "cancelled"
  | "rejected"
  | "active"
  | "paused"
  | "adjusted";

export const STATUS_LABELS: Record<string, string> = {
  pending: "Afventer",
  confirmed: "Bekræftet",
  in_progress: "I gang",
  completed: "Udført",
  cancelled: "Annulleret",
  rejected: "Afvist",
  active: "Aktiv",
  paused: "På pause",
  adjusted: "Justeret",
};

/** Tailwind-klasser til en farvet badge for en given status. */
export const STATUS_BADGE_CLASS: Record<string, string> = {
  pending:     "bg-muted text-muted-foreground border-border",
  confirmed:   "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-800 border-amber-200",
  completed:   "bg-emerald-50 text-emerald-700 border-emerald-200",
  cancelled:   "bg-rose-50 text-rose-700 border-rose-200",
  rejected:    "bg-rose-50 text-rose-700 border-rose-200",
  active:      "bg-blue-50 text-blue-700 border-blue-200",
  paused:      "bg-muted text-muted-foreground border-border",
  adjusted:    "bg-violet-50 text-violet-700 border-violet-200",
};

export function statusBadgeClass(status: string | null | undefined): string {
  if (!status) return STATUS_BADGE_CLASS.pending;
  return STATUS_BADGE_CLASS[status] || STATUS_BADGE_CLASS.pending;
}

export function statusLabel(status: string | null | undefined): string {
  if (!status) return STATUS_LABELS.pending;
  return STATUS_LABELS[status] || status;
}

/** Konsistente farver pr. interval (engangs, ugentligt, månedligt osv.). */
export const INTERVAL_BADGE_CLASS: Record<string, string> = {
  engangskøb:   "bg-secondary text-foreground border-border",
  daglig:       "bg-orange-50 text-orange-700 border-orange-200",
  ugentlig:     "bg-blue-50 text-blue-700 border-blue-200",
  hver_14_dag:  "bg-cyan-50 text-cyan-700 border-cyan-200",
  hver_4_uge:   "bg-indigo-50 text-indigo-700 border-indigo-200",
  hver_8_uge:   "bg-violet-50 text-violet-700 border-violet-200",
  månedlig:     "bg-pink-50 text-pink-700 border-pink-200",
  kvartalsvis:  "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200",
  halvårlig:    "bg-purple-50 text-purple-700 border-purple-200",
  årlig:        "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export function intervalBadgeClass(interval: string | null | undefined): string {
  if (!interval) return INTERVAL_BADGE_CLASS.engangskøb;
  return INTERVAL_BADGE_CLASS[interval] || "bg-primary/5 text-primary border-primary/20";
}