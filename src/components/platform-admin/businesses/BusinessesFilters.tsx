import { ArrowUpDown, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { SORT_OPTIONS, buildChips, type FilterKey, type SortKey, type SavedView } from "./types";

/** Sort-dropdown til toolbar. */
export const SortMenu = ({ sort, onSortChange }: { sort: SortKey; onSortChange: (v: SortKey) => void }) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="sm" variant="outline" className="h-9 gap-1.5">
        <ArrowUpDown className="h-3.5 w-3.5" /> Sortér
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent>
      {SORT_OPTIONS.map(([k, l]) => (
        <DropdownMenuItem key={k} onClick={() => onSortChange(k)}>
          {sort === k ? "✓ " : ""}{l}
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

export const ViewsMenu = ({
  views, onSaveView, onApplyView, onDeleteView,
}: {
  views: SavedView[];
  onSaveView: () => void;
  onApplyView: (v: SavedView) => void;
  onDeleteView: (id: string) => void;
}) => (
  <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button size="sm" variant="outline" className="h-9 gap-1.5">
        <Star className="h-3.5 w-3.5" /> Visninger
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent className="w-64">
      <DropdownMenuItem onClick={onSaveView}>+ Gem nuværende visning</DropdownMenuItem>
      {views.length === 0 && (
        <div className="px-2 py-1.5 text-xs text-muted-foreground">Ingen gemte visninger</div>
      )}
      {views.map((v) => (
        <DropdownMenuItem key={v.id} onClick={() => onApplyView(v)} className="justify-between gap-2">
          <span className="truncate">{v.name}</span>
          <button
            onClick={(e) => { e.stopPropagation(); onDeleteView(v.id); }}
            className="text-muted-foreground hover:text-destructive text-xs"
          >×</button>
        </DropdownMenuItem>
      ))}
    </DropdownMenuContent>
  </DropdownMenu>
);

/** Chip-filtre med tællere — én knap pr. status. */
export const BusinessChips = ({
  filter, onFilterChange, counts,
}: {
  filter: FilterKey;
  onFilterChange: (v: FilterKey) => void;
  counts: Record<string, number>;
}) => {
  const chips = buildChips(counts);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {chips.map((c) => {
        const active = filter === c.v;
        const toneCls = active
          ? c.tone === "success" ? "bg-emerald-600 text-white border-emerald-600"
          : c.tone === "warning" ? "bg-amber-600 text-white border-amber-600"
          : c.tone === "danger"  ? "bg-destructive text-destructive-foreground border-destructive"
          : "bg-foreground text-background border-foreground"
          : "bg-background text-muted-foreground border-border hover:bg-secondary hover:text-foreground";
        return (
          <button
            key={c.v}
            onClick={() => onFilterChange(c.v)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${toneCls}`}
          >
            {c.label}
            <span className={`tabular-nums text-[10px] rounded-full px-1.5 py-0.5 ${active ? "bg-background/20" : "bg-secondary text-muted-foreground"}`}>
              {c.count}
            </span>
          </button>
        );
      })}
    </div>
  );
};