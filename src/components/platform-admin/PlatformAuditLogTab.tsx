// PlatformAuditLogTab — viser alle admin-handlinger på tværs af platformen.
// Trin 22: server-side paging, watch-user, diff-visning, gemte filtre.
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, SearchInput, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Filter, Download, ChevronRight, Star, StarOff, Bookmark, Save, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ACTION_LABELS: Record<string, string> = {
  extend_trial: "Forlænget prøveperiode",
  reset_trial: "Nulstillet prøveperiode",
  end_trial_now: "Afsluttet prøveperiode nu",
  force_active: "Markeret som betalende",
  transfer_owner: "Overdraget ejer",
  soft_delete: "Arkiveret (soft-delete)",
  restore: "Gendannet",
  hard_delete: "Slettet permanent",
  set_role: "Ændret rolle",
  suspend_user: "Suspenderet bruger",
  delete_user: "Slettet bruger",
  impersonate: "Logget ind som bruger",
};

type GroupMode = "none" | "day" | "admin" | "target";
const PAGE_SIZE = 100;
const WATCH_KEY = "admin-audit-watch";
const SAVED_KEY = "admin-audit-saved-filters";

type SavedFilter = {
  name: string;
  q: string;
  actionFilter: string;
  adminFilter: string;
  rangeFilter: string;
  groupMode: GroupMode;
  watchOnly: boolean;
};

function loadWatch(): string[] {
  try { return JSON.parse(localStorage.getItem(WATCH_KEY) || "[]"); } catch { return []; }
}
function loadSaved(): SavedFilter[] {
  try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
}

function renderDiff(before: any, after: any) {
  const keys = Array.from(new Set([...Object.keys(before || {}), ...Object.keys(after || {})]));
  return (
    <div className="rounded-md border border-border bg-background overflow-hidden">
      <div className="grid grid-cols-[1fr_1fr_1fr] text-[11px] font-semibold bg-secondary/60 px-3 py-1.5 border-b border-border">
        <span>Felt</span><span>Før</span><span>Efter</span>
      </div>
      {keys.map((k) => {
        const b = before?.[k]; const a = after?.[k];
        const changed = JSON.stringify(b) !== JSON.stringify(a);
        return (
          <div key={k} className={cn("grid grid-cols-[1fr_1fr_1fr] gap-2 px-3 py-1.5 text-[11px] border-b border-border last:border-b-0", changed && "bg-amber-50 dark:bg-amber-950/20")}>
            <span className="font-mono text-muted-foreground truncate">{k}</span>
            <span className="font-mono text-foreground/80 truncate">{b == null ? "—" : typeof b === "object" ? JSON.stringify(b) : String(b)}</span>
            <span className="font-mono text-foreground truncate">{a == null ? "—" : typeof a === "object" ? JSON.stringify(a) : String(a)}</span>
          </div>
        );
      })}
    </div>
  );
}

const DATE_RANGES: { value: string; label: string; days: number | null }[] = [
  { value: "24h", label: "Sidste 24 timer", days: 1 },
  { value: "7d", label: "Sidste 7 dage", days: 7 },
  { value: "30d", label: "Sidste 30 dage", days: 30 },
  { value: "all", label: "Alle", days: null },
];

function toCsv(rows: any[]): string {
  const header = ["created_at", "admin_email", "action", "target_type", "target_label", "details"];
  const esc = (v: any) => {
    const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [header.join(","), ...rows.map((r) => header.map((h) => esc(r[h])).join(","))].join("\n");
}

export default function PlatformAuditLogTab() {
  const [q, setQ] = useState("");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [adminFilter, setAdminFilter] = useState<string>("all");
  const [rangeFilter, setRangeFilter] = useState<string>("7d");
  const [groupMode, setGroupMode] = useState<GroupMode>("none");
  const [openId, setOpenId] = useState<string | null>(null);
  const [watch, setWatch] = useState<string[]>(() => loadWatch());
  const [watchOnly, setWatchOnly] = useState(false);
  const [saved, setSaved] = useState<SavedFilter[]>(() => loadSaved());
  const [savedName, setSavedName] = useState("");

  useEffect(() => { localStorage.setItem(WATCH_KEY, JSON.stringify(watch)); }, [watch]);
  useEffect(() => { localStorage.setItem(SAVED_KEY, JSON.stringify(saved)); }, [saved]);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["admin-audit-log-paged", rangeFilter],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      const range = DATE_RANGES.find((r) => r.value === rangeFilter);
      if (range?.days) {
        const since = new Date(Date.now() - range.days * 86_400_000).toISOString();
        query = query.gte("created_at", since);
      }
      if (pageParam) query = query.lt("created_at", pageParam);
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    getNextPageParam: (last) => (last.length === PAGE_SIZE ? last[last.length - 1].created_at : undefined),
  });
  const log = useMemo(() => (data?.pages || []).flat(), [data]);

  const toggleWatch = (email: string) => {
    setWatch((prev) => prev.includes(email) ? prev.filter((e) => e !== email) : [...prev, email]);
  };

  const applySaved = (f: SavedFilter) => {
    setQ(f.q); setActionFilter(f.actionFilter); setAdminFilter(f.adminFilter);
    setRangeFilter(f.rangeFilter); setGroupMode(f.groupMode); setWatchOnly(f.watchOnly);
  };
  const saveCurrent = () => {
    const name = savedName.trim();
    if (!name) return;
    setSaved((prev) => [...prev.filter((s) => s.name !== name), { name, q, actionFilter, adminFilter, rangeFilter, groupMode, watchOnly }]);
    setSavedName("");
    toast.success(`Filter "${name}" gemt`);
  };
  const deleteSaved = (name: string) => setSaved((prev) => prev.filter((s) => s.name !== name));

  const admins = useMemo(() => {
    const set = new Set<string>();
    (log || []).forEach((e: any) => e.admin_email && set.add(e.admin_email));
    return Array.from(set).sort();
  }, [log]);

  const filtered = useMemo(() => {
    return (log || []).filter((e: any) => {
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (adminFilter !== "all" && e.admin_email !== adminFilter) return false;
      if (watchOnly && !watch.includes(e.admin_email)) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        e.action?.toLowerCase().includes(s) ||
        e.admin_email?.toLowerCase().includes(s) ||
        e.target_label?.toLowerCase().includes(s)
      );
    });
  }, [log, q, actionFilter, adminFilter, watchOnly, watch]);

  const grouped = useMemo(() => {
    if (groupMode === "none") return null;
    const map = new Map<string, any[]>();
    filtered.forEach((e: any) => {
      let key = "—";
      if (groupMode === "day") {
        key = new Date(e.created_at).toLocaleDateString("da-DK", { day: "2-digit", month: "short", year: "numeric" });
      } else if (groupMode === "admin") {
        key = e.admin_email || "Ukendt admin";
      } else if (groupMode === "target") {
        key = e.target_label || e.target_type || "Uden mål";
      }
      const arr = map.get(key) || [];
      arr.push(e);
      map.set(key, arr);
    });
    return Array.from(map.entries());
  }, [filtered, groupMode]);

  const exportCsv = () => {
    const csv = toCsv(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderRow = (e: any) => {
    const open = openId === e.id;
    const hasDetails = e.details && Object.keys(e.details).length > 0;
    const hasDiff = hasDetails && e.details.before && e.details.after && typeof e.details.before === "object" && typeof e.details.after === "object";
    const watched = e.admin_email && watch.includes(e.admin_email);
    return (
      <div key={e.id} className="border-b border-border last:border-b-0">
        <div className={cn("flex w-full items-center gap-2 px-4 py-3 transition-colors", watched && "bg-primary/5", hasDetails && "hover:bg-secondary/30")}>
          <button
            type="button"
            onClick={() => e.admin_email && toggleWatch(e.admin_email)}
            className="shrink-0 text-muted-foreground hover:text-foreground"
            title={watched ? "Fjern fra watch-listen" : "Tilføj til watch-listen"}
          >
            {watched ? <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> : <StarOff className="h-3.5 w-3.5" />}
          </button>
          <button
            type="button"
            onClick={() => hasDetails && setOpenId(open ? null : e.id)}
            className={cn("flex flex-1 items-start gap-3 text-left", hasDetails ? "cursor-pointer" : "cursor-default")}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
            {hasDetails ? (
              <ChevronRight className={cn("h-4 w-4 transition-transform", open && "rotate-90")} />
            ) : (
              <History className="h-4 w-4" />
            )}
            </div>
            <div className="min-w-0 flex-1">
            <p className="text-sm">
              <span className="font-semibold text-foreground">{e.admin_email || "Admin"}</span>{" "}
              <span className="text-muted-foreground">{ACTION_LABELS[e.action] || e.action}</span>{" "}
              {e.target_label && <span className="font-medium text-foreground">{e.target_label}</span>}
            </p>
            {hasDetails && !open && (
              <p className="text-xs text-muted-foreground truncate">
                {Object.entries(e.details).map(([k, v]) => `${k}: ${JSON.stringify(v)}`).join(" · ")}
              </p>
            )}
            </div>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
            {new Date(e.created_at).toLocaleString("da-DK", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
          </button>
        </div>
        {open && hasDetails && (
          <div className="bg-secondary/40 px-4 py-3 border-t border-border space-y-2">
            {hasDiff && renderDiff(e.details.before, e.details.after)}
            <pre className="overflow-x-auto rounded-md bg-background p-3 text-[11px] leading-relaxed text-foreground border border-border">
{JSON.stringify(e.details, null, 2)}
            </pre>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Aktivitetslog"
        description={`${filtered.length} af ${log?.length || 0} hentede handlinger${hasNextPage ? " (flere tilgængelige)" : ""}`}
        action={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            CSV
          </Button>
        }
      />

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
          onClick={() => setWatchOnly((v) => !v)}
          disabled={watch.length === 0}
          title={watch.length === 0 ? "Tilføj admins til watch via stjernen på rækker" : ""}
        >
          <Star className={cn("h-3.5 w-3.5 mr-1.5", watchOnly && "fill-current")} />
          Watch ({watch.length})
        </Button>
      </div>

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

      {isLoading ? (
        <ListCardSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<History />} title="Ingen handlinger" description="Når admins ændrer noget vises det her." />
      ) : grouped ? (
        <div className="space-y-3">
          {grouped.map(([key, rows]) => (
            <Card key={key} className="rounded-xl border-border shadow-sm overflow-hidden">
              <div className="flex items-center justify-between bg-secondary/50 px-4 py-2 border-b border-border">
                <p className="text-sm font-semibold text-foreground truncate">{key}</p>
                <span className="text-xs tabular-nums text-muted-foreground">{rows.length}</span>
              </div>
              <div>{rows.map(renderRow)}</div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div>{filtered.map(renderRow)}</div>
        </Card>
      )}

      {hasNextPage && (
        <div className="flex justify-center pt-2">
          <Button variant="outline" size="sm" onClick={() => fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? "Henter…" : "Hent flere"}
          </Button>
        </div>
      )}
    </div>
  );
}