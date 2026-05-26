// Bulk-handlingsbjælke for "Aftaler uden rute".
// Vises når én eller flere aftaler er markeret med checkbox; tilbyder
// hurtige handlinger på alle valgte uden at åbne hver enkelt.
import { CheckSquare, X, ListChecks, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  selectedCount: number;
  totalCount: number;
  onClear: () => void;
  onSelectAll: () => void;
  onAssignToRoute?: () => void;
  onDelete?: () => void;
  busy?: boolean;
};

export default function UnassignedBulkBar({
  selectedCount, totalCount, onClear, onSelectAll,
  onAssignToRoute, onDelete, busy,
}: Props) {
  if (selectedCount === 0) return null;
  return (
    <div className="sticky top-0 z-10 -mx-3 mb-2 flex items-center gap-2 rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-xs">
      <CheckSquare className="h-4 w-4 text-primary shrink-0" />
      <span className="font-medium text-foreground">{selectedCount} valgt</span>
      <button
        type="button"
        className="text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
        onClick={onSelectAll}
      >
        Vælg alle ({totalCount})
      </button>
      <div className="ml-auto flex items-center gap-1">
        {onAssignToRoute && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onAssignToRoute} disabled={busy}>
            <ListChecks className="h-3.5 w-3.5 mr-1" /> Tildel rute ({selectedCount})
          </Button>
        )}
        {onDelete && (
          <Button size="sm" variant="ghost" className="h-7 px-2 text-xs text-destructive hover:text-destructive" onClick={onDelete} disabled={busy}>
            <Trash2 className="h-3.5 w-3.5 mr-1" /> Slet ({selectedCount})
          </Button>
        )}
        <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={onClear} aria-label="Ryd valg">
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}