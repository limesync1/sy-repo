// Bulk-handlingsbjælke for "Aftaler uden rute".
// Sticky i bunden af aftalepoolen så den ikke spiser plads fra listen og
// ikke overlapper kort i toppen. Vises kun når mindst én aftale er valgt.
import { X, Trash2, CalendarDays, Eye, CalendarPlus, Plus } from "lucide-react";

type Props = {
  selectedCount: number;
  /** Antal valgte aftaler der pt. er synlige i listen (efter filter/søgning). */
  visibleCount?: number;
  /** Antal valgte aftaler der ligger udenfor det aktuelle filter/søgning. */
  hiddenCount?: number;
  totalCount: number;
  onClear: () => void;
  onSelectAll: () => void;
  /** Nulstil filter+søgning så skjulte valgte aftaler kommer i syne. */
  onShowHidden?: () => void;
  onCancel?: () => void;
  onShiftDate?: () => void;
  /** Åbn dialog der lægger de valgte aftaler ind på en eksisterende rute. */
  onAddToRoute?: () => void;
  /** Opret en ny rute med de valgte aftaler som stop. */
  onCreateRoute?: () => void;
  busy?: boolean;
};

export default function UnassignedBulkBar({
  selectedCount, visibleCount, hiddenCount, totalCount, onClear, onSelectAll, onShowHidden,
  onCancel, onShiftDate, onAddToRoute, onCreateRoute, busy,
}: Props) {
  if (selectedCount === 0) return null;
  const allSelected = selectedCount >= totalCount;
  // "Vælg alle X" giver kun mening når der faktisk er flere at vælge
  // og man ikke allerede har valgt alle. Tidligere viste den "Vælg alle 1"
  // når der kun var én aftale i listen — det forvirrede mere end det hjalp.
  const showSelectAll = !allSelected && totalCount > 1;
  const hidden = hiddenCount ?? 0;
  const visible = visibleCount ?? selectedCount;
  return (
    <div
      className="sticky bottom-0 z-20 mt-1 overflow-hidden rounded-md border border-foreground/15 bg-card/95 backdrop-blur animate-in fade-in slide-in-from-bottom-2 duration-150"
      role="region"
      aria-label="Bulk-handlinger for valgte aftaler"
    >
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border/60 bg-secondary/40">
        <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-foreground text-background text-[11px] font-bold tabular-nums">
          {selectedCount}
        </span>
        <span className="text-xs font-medium text-foreground">
          {hidden > 0
            ? `valgt (${visible} synlig${visible === 1 ? "" : "e"})`
            : `af ${totalCount} valgt`}
        </span>
        {showSelectAll && (
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            onClick={onSelectAll}
          >
            Vælg alle
          </button>
        )}
        <button
          type="button"
          onClick={onClear}
          aria-label="Ryd valg"
          className="ml-auto h-6 w-6 inline-flex items-center justify-center rounded text-muted-foreground hover:text-foreground hover:bg-secondary focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      {hidden > 0 && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 border-b border-amber-300/60 bg-amber-50/70 text-[11px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
          <Eye className="h-3 w-3 shrink-0" />
          <span className="flex-1 leading-tight">
            {hidden} valgt {hidden === 1 ? "aftale ligger" : "aftaler ligger"} udenfor dit filter — handlingen rammer alle {selectedCount}.
          </span>
          {onShowHidden && (
            <button
              type="button"
              onClick={onShowHidden}
              className="font-semibold underline underline-offset-2 hover:text-amber-950 shrink-0"
            >
              Vis dem
            </button>
          )}
        </div>
      )}
      <div className="space-y-1.5 p-2">
        {onCreateRoute && (
          <button
            type="button"
            onClick={onCreateRoute}
            disabled={busy}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Plus className="h-4 w-4" />
            Opret ny rute med {selectedCount}
          </button>
        )}
        <div className="flex gap-1.5">
          {onAddToRoute && (
            <button
              type="button"
              onClick={onAddToRoute}
              disabled={busy}
              className="flex h-9 flex-1 min-w-0 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <CalendarPlus className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Føj til rute</span>
            </button>
          )}
          {onShiftDate && (
            <button
              type="button"
              onClick={onShiftDate}
              disabled={busy}
              className="flex h-9 flex-1 min-w-0 items-center justify-center gap-1.5 rounded-md border border-border bg-card px-2 text-xs font-semibold text-foreground transition-colors hover:bg-secondary disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">Flyt dato</span>
            </button>
          )}
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              disabled={busy}
              aria-label="Annullér valgte aftaler"
              title="Annullér valgte aftaler"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border bg-card text-destructive transition-colors hover:bg-destructive/10 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
        <p className="text-center text-[11px] leading-snug text-muted-foreground">
          Eller træk et valgt kort ind i kalenderen — alle valgte følger med.
        </p>
      </div>
    </div>
  );
}