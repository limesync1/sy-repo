import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchInput } from "@/components/admin/shared/AdminUI";
import { Bookmark, Filter, Save, Star, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTION_LABELS, DATE_RANGES, type GroupMode, type SavedFilter } from "./shared";

export function FilterBar(props: {
  q: string; setQ: (v: string) => void;
  actionFilter: string; setActionFilter: (v: string) => void;
  adminFilter: string; setAdminFilter: (v: string) => void;
  rangeFilter: string; setRangeFilter: (v: string) => void;
  groupMode: GroupMode; setGroupMode: (v: GroupMode) => void;
  watchOnly: boolean; setWatchOnly: (v: boolean) => void;
  admins: string[];
  watch: string[];
}) {
  const { q, setQ, actionFilter, setActionFilter, adminFilter, setAdminFilter,
    rangeFilter, setRangeFilter, groupMode, setGroupMode, watchOnly, setWatchOnly,
    admins, watch } = props;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <SearchInput value={q} onChange={setQ} placeholder="Søg admin, virksomhed eller handling..." />
      <Select value={actionFilter} onValueChange={setActionFilter}>
        <SelectTrigger className="w-[220px] h-9">
          <Filter className="h-3.5 w-3.5 mr-1.5" /><SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle handlinger</SelectItem>
          {Object.entries(ACTION_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={adminFilter} onValueChange={setAdminFilter}>
        <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="Admin" /></SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Alle admins</SelectItem>
          {admins.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={rangeFilter} onValueChange={setRangeFilter}>
        <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          {DATE_RANGES.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
        </SelectContent>
      </Select>
      <Select value={groupMode} onValueChange={(v) => setGroupMode(v as GroupMode)}>
        <SelectTrigger className="w-[170px] h-9"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="none">Ingen gruppering</SelectItem>
          <SelectItem value="day">Grupper pr. dag</SelectItem>
          <SelectItem value="admin">Grupper pr. admin</SelectItem>
          <SelectItem value="target">Grupper pr. mål</SelectItem>
        </SelectContent>
      </Select>
      <Button
        type="button"
        variant={watchOnly ? "default" : "outline"}
        size="sm"
        onClick={() => setWatchOnly(!watchOnly)}
        disabled={watch.length === 0}
        title={watch.length === 0 ? "Tilføj admins til watch via stjernen på rækker" : ""}
      >
        <Star className={cn("h-3.5 w-3.5 mr-1.5", watchOnly && "fill-current")} />
        Watch ({watch.length})
      </Button>
    </div>
  );
}

export function SavedFiltersBar(props: {
  saved: SavedFilter[];
  applySaved: (f: SavedFilter) => void;
  deleteSaved: (name: string) => void;
  savedName: string; setSavedName: (v: string) => void;
  saveCurrent: () => void;
}) {
  const { saved, applySaved, deleteSaved, savedName, setSavedName, saveCurrent } = props;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Bookmark className="h-3.5 w-3.5 text-muted-foreground" />
      <span className="text-xs text-muted-foreground">Gemte filtre:</span>
      {saved.length === 0 && <span className="text-xs italic text-muted-foreground">ingen</span>}
      {saved.map((s) => (
        <span key={s.name} className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/40 px-2 py-0.5 text-xs">
          <button type="button" onClick={() => applySaved(s)} className="font-medium hover:text-primary">{s.name}</button>
          <button type="button" onClick={() => deleteSaved(s.name)} className="text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3 w-3" />
          </button>
        </span>
      ))}
      <Input
        value={savedName}
        onChange={(e) => setSavedName(e.target.value)}
        placeholder="Navngiv filter..."
        className="h-7 w-40 text-xs"
      />
      <Button type="button" variant="outline" size="sm" onClick={saveCurrent} disabled={!savedName.trim()}>
        <Save className="h-3.5 w-3.5 mr-1.5" />Gem
      </Button>
    </div>
  );
}