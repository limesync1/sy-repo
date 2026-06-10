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

/**
 * Status-badge for en `agreement_occurrence` på tidslinjen. Tager højde
 * for både rå status, om dens planlagte ankomst stadig ligger så langt
 * ude i fremtiden at den er låst, samt om fakturaen er sendt eller
 * venter på generering.
 */
export type OccurrenceBadgeKind =
  | "locked"
  | "planned"
  | "ready"
  | "confirmed"
  | "in_progress"
  | "completed"
  | "invoiced"
  | "invoice_pending"
  | "cancelled";

export type OccurrenceBadge = {
  kind: OccurrenceBadgeKind;
  label: string;
  className: string;
};

export function occurrenceStatusBadge(input: {
  status?: string | null;
  planned_arrival?: string | null;
  occurrence_date?: string | null;
  invoice_external_number?: string | null;
  invoice_status?: string | null;
  /** Hvis sat: tidspunkt hvor occurrence låses op (sat af planlæggeren).
   *  Hvis ikke sat, betragtes alt med planned_arrival > nu som "låst". */
  unlock_at?: string | null;
}): OccurrenceBadge {
  const status = (input.status ?? "planned").toLowerCase();
  const now = Date.now();
  const plannedAt = input.planned_arrival ? new Date(input.planned_arrival).getTime() : null;

  if (status === "cancelled" || status === "rejected") {
    return { kind: "cancelled", label: "Annulleret", className: "border-rose-200 bg-rose-50 text-rose-700" };
  }
  if (status === "completed") {
    if (input.invoice_external_number) {
      return {
        kind: "invoiced",
        label: `Faktureret #${input.invoice_external_number}`,
        className: "border-emerald-300 bg-emerald-50 text-emerald-700",
      };
    }
    // Udført men ingen faktura endnu → tydeligt gult signal.
    return { kind: "invoice_pending", label: "Faktura venter", className: "border-amber-300 bg-amber-50 text-amber-800" };
  }
  if (status === "in_progress") {
    return { kind: "in_progress", label: "I gang", className: "border-amber-300 bg-amber-50 text-amber-800" };
  }
  if (status === "confirmed") {
    return { kind: "confirmed", label: "Bekræftet", className: "border-violet-300 bg-violet-50 text-violet-700" };
  }
  if (status === "ready") {
    return { kind: "ready", label: "Klar", className: "border-accent/40 bg-accent/10 text-accent" };
  }
  // Default = planned. Hvis planlagt ankomst ligger i fremtiden → låst.
  if (plannedAt && plannedAt > now) {
    return { kind: "locked", label: "Låst", className: "border-border bg-muted text-muted-foreground" };
  }
  return { kind: "planned", label: "Planlagt", className: "border-blue-200 bg-blue-50 text-blue-700" };
}