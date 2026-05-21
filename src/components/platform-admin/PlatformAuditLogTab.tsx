// PlatformAuditLogTab — viser alle admin-handlinger på tværs af platformen.
// Trin 22: server-side paging, watch-user, diff-visning, gemte filtre.
import { useInfiniteQuery } from "@tanstack/react-query";
import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { History, Download } from "lucide-react";
import { toast } from "sonner";
import {
  DATE_RANGES, PAGE_SIZE, SAVED_KEY, WATCH_KEY,
  loadSaved, loadWatch, toCsv, type GroupMode, type SavedFilter,
} from "./auditlog/shared";
import { AuditRow } from "./auditlog/AuditRow";
import { FilterBar, SavedFiltersBar } from "./auditlog/FilterBar";

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

      <FilterBar
        q={q} setQ={setQ}
        actionFilter={actionFilter} setActionFilter={setActionFilter}
        adminFilter={adminFilter} setAdminFilter={setAdminFilter}
        rangeFilter={rangeFilter} setRangeFilter={setRangeFilter}
        groupMode={groupMode} setGroupMode={setGroupMode}
        watchOnly={watchOnly} setWatchOnly={setWatchOnly}
        admins={admins} watch={watch}
        removeWatch={(email) => setWatch((prev) => prev.filter((e) => e !== email))}
      />

      <SavedFiltersBar
        saved={saved} applySaved={applySaved} deleteSaved={deleteSaved}
        savedName={savedName} setSavedName={setSavedName} saveCurrent={saveCurrent}
      />

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
              <div>
                {rows.map((e: any) => (
                  <AuditRow key={e.id} e={e} openId={openId} setOpenId={setOpenId} watch={watch} toggleWatch={toggleWatch} />
                ))}
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div>
            {filtered.map((e: any) => (
              <AuditRow key={e.id} e={e} openId={openId} setOpenId={setOpenId} watch={watch} toggleWatch={toggleWatch} />
            ))}
          </div>
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