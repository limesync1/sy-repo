import { SearchInput } from "@/components/admin/shared/AdminUI";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ActivityFilter, ACTIVITY_CHIPS } from "./shared";

interface Props {
  q: string; setQ: (v: string) => void;
  roleFilter: "all" | "admin" | "business_owner" | "user";
  setRoleFilter: (v: "all" | "admin" | "business_owner" | "user") => void;
  activityFilter: ActivityFilter;
  setActivityFilter: (v: ActivityFilter) => void;
  counts: Record<string, number>;
}

export default function UsersFilters({ q, setQ, roleFilter, setRoleFilter, activityFilter, setActivityFilter, counts }: Props) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Søg navn, email, telefon..." />
        <Select value={roleFilter} onValueChange={(v: any) => setRoleFilter(v)}>
          <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle roller</SelectItem>
            <SelectItem value="admin">Admin (kun visning)</SelectItem>
            <SelectItem value="business_owner">Virksomhedsejer</SelectItem>
            <SelectItem value="user">Kunde</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {ACTIVITY_CHIPS.map((c) => {
          const active = activityFilter === c.v;
          const count = counts[c.key] ?? 0;
          const toneCls = active
            ? c.tone === "success" ? "bg-emerald-600 text-white border-emerald-600"
            : c.tone === "warning" ? "bg-amber-600 text-white border-amber-600"
            : c.tone === "danger"  ? "bg-destructive text-destructive-foreground border-destructive"
            : "bg-foreground text-background border-foreground"
            : "bg-background text-muted-foreground border-border hover:bg-secondary hover:text-foreground";
          return (
            <button key={c.v} onClick={() => setActivityFilter(c.v)}
              className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${toneCls}`}>
              {c.label}
              <span className={`tabular-nums text-[10px] rounded-full px-1.5 py-0.5 ${active ? "bg-background/20" : "bg-secondary text-muted-foreground"}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </>
  );
}