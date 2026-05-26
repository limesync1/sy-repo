// Bulk-handlingsbjælke for "Aftaler uden rute".
// Sticky i bunden af aftalepoolen så den ikke spiser plads fra listen og
// ikke overlapper kort i toppen. Vises kun når mindst én aftale er valgt.
import { Sparkles, X, Trash2, Loader2 } from "lucide-react";

type Props = {
  selectedCount: number;
  totalCount: number;
  onClear: () => void;
  onSelectAll: () => void;
  onAutoAssign?: () => void;
  onCancel?: () => void;
  busy?: boolean;
};

export default function UnassignedBulkBar({
  selectedCount, totalCount, onClear, onSelectAll,
  onAutoAssign, onCancel, busy,
}: Props) {
  if (selectedCount === 0) return null;
  const allSelected = selectedCount >= totalCount;
  return (
    <div
      className="sticky bottom-0 z-20 mt-1 rounded-lg border border-foreground/15 bg-card/95 backdrop-blur shadow-lg overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-150"
      role="region"
      aria-label="Bulk-handlinger for valgte aftaler"
    >
      <div className="flex items-center gap-2 px-2.5 py-2 border-b border-border/60 bg-secondary/40">
        <span className="inline-flex items-center justify-center min-w-[22px] h-5 px-1.5 rounded-full bg-foreground text-background text-[11px] font-bold tabular-nums">
          {selectedCount}
        </span>
        <span className="text-xs font-medium text-foreground">valgt</span>
        {!allSelected && (
          <button
            type="button"
            className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            onClick={onSelectAll}
          >
            Vælg alle {totalCount}
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
      <div className="grid grid-cols-2 divide-x divide-border/60">
        <button
          type="button"
          onClick={onAutoAssign}
          disabled={busy || !onAutoAssign}
          className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold text-foreground hover:bg-accent/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:bg-accent/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
        >
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5 text-accent" />}
          Auto-fordel
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={busy || !onCancel}
          className="flex items-center justify-center gap-1.5 px-2 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed focus-visible:bg-destructive/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive focus-visible:ring-inset"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Annullér
        </button>
      </div>
    </div>
  );
}