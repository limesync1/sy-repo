// PlatformAuditLogTab — viser alle admin-handlinger på tværs af platformen.
// Kilder: admin_audit_log skrevet af _admin_log() i alle admin_* RPC'er.
// Trin 9: tilføjet admin-filter, dato-range, group-by toggle, CSV-eksport
// samt klikbar JSON-detalje (kollapsibel) for hver række.
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo, Fragment } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader, SearchInput, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Filter, Download, ChevronRight } from "lucide-react";
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

  const { data: log, isLoading } = useQuery({
    queryKey: ["admin-audit-log-all", rangeFilter],
    queryFn: async () => {
      let query = supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      const range = DATE_RANGES.find((r) => r.value === rangeFilter);
      if (range?.days) {
        const since = new Date(Date.now() - range.days * 86_400_000).toISOString();
        query = query.gte("created_at", since);
      }
      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
  });

  const admins = useMemo(() => {
    const set = new Set<string>();
    (log || []).forEach((e: any) => e.admin_email && set.add(e.admin_email));
    return Array.from(set).sort();
  }, [log]);

  const filtered = useMemo(() => {
    return (log || []).filter((e: any) => {
      if (actionFilter !== "all" && e.action !== actionFilter) return false;
      if (adminFilter !== "all" && e.admin_email !== adminFilter) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      return (
        e.action?.toLowerCase().includes(s) ||
        e.admin_email?.toLowerCase().includes(s) ||
        e.target_label?.toLowerCase().includes(s)
      );
    });
  }, [log, q, actionFilter, adminFilter]);

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
    return (
      <div key={e.id} className="border-b border-border last:border-b-0">
        <button
          type="button"
          onClick={() => hasDetails && setOpenId(open ? null : e.id)}
          className={cn(
            "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
            hasDetails ? "hover:bg-secondary/30 cursor-pointer" : "cursor-default",
          )}
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
        {open && hasDetails && (
          <div className="bg-secondary/40 px-4 py-3 border-t border-border">
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
        description={`${filtered.length} af ${log?.length || 0} handlinger`}
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
    </div>
  );
}