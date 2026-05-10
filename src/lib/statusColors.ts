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

/**
 * Re-eksporterer den centrale interval-badge-funktion som forstår både
 * legacy enum-værdier og det nye `every_<N>_<unit>` format.
 */
export { intervalBadgeClass } from "@/lib/interval";