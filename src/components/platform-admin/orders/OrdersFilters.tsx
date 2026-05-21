import { SearchInput } from "@/components/admin/shared/AdminUI";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X } from "lucide-react";
import { STATUS_OPTIONS, SORT_OPTIONS, SavedView } from "./shared";

interface Props {
  q: string; setQ: (v: string) => void;
  status: string; setStatus: (v: string) => void;
  sort: string; setSort: (v: string) => void;
  quickFilter: string; setQuickFilter: (v: string) => void;
  chips: { v: string; label: string }[];
  views: SavedView[];
  applyView: (v: SavedView) => void;
  deleteView: (name: string) => void;
}

export default function OrdersFilters({
  q, setQ, status, setStatus, sort, setSort,
  quickFilter, setQuickFilter, chips, views, applyView, deleteView,
}: Props) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Søg kunde, email, virksomhed..." />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle statusser</SelectItem>
            {STATUS_OPTIONS.map((s) => (<SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>))}
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={setSort}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            {SORT_OPTIONS.map((s) => (<SelectItem key={s.v} value={s.v}>{s.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {views.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground mr-1">Gemte:</span>
          {views.map((v) => (
            <span key={v.name} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/40 pl-2.5 pr-1 py-0.5 text-xs">
              <button onClick={() => applyView(v)} className="font-medium text-foreground hover:text-accent">{v.name}</button>
              <button onClick={() => deleteView(v.name)} className="rounded-full p-0.5 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label="Slet visning">
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {chips.map((c) => (
          <button key={c.v} onClick={() => setQuickFilter(c.v)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
              quickFilter === c.v
                ? "border-foreground bg-foreground text-background"
                : "border-border bg-background text-muted-foreground hover:text-foreground hover:bg-secondary"
            }`}>
            {c.label}
          </button>
        ))}
      </div>
    </>
  );
}