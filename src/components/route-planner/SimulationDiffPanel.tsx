/**
 * SimulationDiffPanel — Bølge 5 / 5.1
 * -----------------------------------------------------------------------------
 * Lille floating "What-if"-panel der viser et `SimulationSummary` fra
 * `useSimulation().preview(action)`. Render typisk i `RoutePlanner` ved
 * pointer eller fast nederst-til-højre. Kan også bruges inline i dialoger
 * før commit.
 *
 * Designprincipper:
 *  - Bruger semantiske tokens (success/warning/destructive) — aldrig hex.
 *  - Ingen interaktivitet — rent informationspanel.
 *  - Kompakt: én linje med ikoner + tal, evt. detalje-rækker.
 */
import { ArrowRightLeft, AlertTriangle, AlertCircle, Users, Calendar, X, Move, UserCog } from "lucide-react";
import type { SimulationSummary } from "@/domain/routes";
import { cn } from "@/lib/utils";

export type SimulationDiffPanelProps = {
  summary: SimulationSummary;
  label?: string;
  className?: string;
  /** Vis kompakt (kun tal-badges). Default false. */
  compact?: boolean;
};

const Stat = ({
  icon: Icon, value, label, tone,
}: {
  icon: any; value: number; label: string;
  tone?: "default" | "success" | "warning" | "destructive";
}) => {
  if (value === 0) return null;
  const toneCls =
    tone === "destructive" ? "text-destructive" :
    tone === "warning" ? "text-warning" :
    tone === "success" ? "text-success" :
    "text-foreground";
  return (
    <div className={cn("inline-flex items-center gap-1.5 text-xs", toneCls)}>
      <Icon className="h-3.5 w-3.5" />
      <span className="font-medium tabular-nums">{value}</span>
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
};

export function SimulationDiffPanel({ summary, label, className, compact }: SimulationDiffPanelProps) {
  const empty =
    summary.movedCount === 0 && summary.reassignedCount === 0 &&
    summary.cancelledCount === 0 && summary.conflictCount === 0;
  if (empty) return null;

  return (
    <div
      className={cn(
        "pointer-events-none rounded-lg border border-border bg-background/95 px-3 py-2 shadow-md backdrop-blur",
        "flex flex-col gap-1.5",
        className,
      )}
      role="status"
      aria-live="polite"
    >
      {label ? (
        <div className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
          {label}
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <Stat icon={Move} value={summary.movedCount} label="flyttet" />
        <Stat icon={UserCog} value={summary.reassignedCount} label="omfordelt" />
        <Stat icon={X} value={summary.cancelledCount} label="aflyst" tone="destructive" />
        <Stat icon={AlertCircle} value={summary.errorCount} label="fejl" tone="destructive" />
        <Stat icon={AlertTriangle} value={summary.warningCount} label="advarsler" tone="warning" />
      </div>
      {!compact && (summary.affectedEmployees.length > 0 || summary.affectedDates.length > 0) ? (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-muted-foreground">
          {summary.affectedEmployees.length > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Users className="h-3 w-3" />
              {summary.affectedEmployees.length} medarb.
            </span>
          ) : null}
          {summary.affectedDates.length > 0 ? (
            <span className="inline-flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {summary.affectedDates.length} dag{summary.affectedDates.length === 1 ? "" : "e"}
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

/** Hjælper: render kun hvis der er noget at vise. */
export function SimulationDiffBadge({ summary }: { summary: SimulationSummary }) {
  const total = summary.movedCount + summary.reassignedCount + summary.cancelledCount;
  if (total === 0 && summary.conflictCount === 0) return null;
  const tone =
    summary.errorCount > 0 ? "bg-destructive text-destructive-foreground" :
    summary.warningCount > 0 ? "bg-warning text-warning-foreground" :
    "bg-success text-success-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium", tone)}>
      <ArrowRightLeft className="h-3 w-3" />
      {total > 0 ? `${total} ændring${total === 1 ? "" : "er"}` : null}
      {summary.conflictCount > 0 ? (
        <>
          {total > 0 ? " · " : null}
          {summary.conflictCount} konflikt{summary.conflictCount === 1 ? "" : "er"}
        </>
      ) : null}
    </span>
  );
}