/**
 * PlatformRouteErrorsTab — overblik over rute-fejl logget af klienterne.
 *
 * Bygger på `route_audit_log` hvor `action LIKE 'error:%'`. Hver række
 * indeholder fejl-kode + besked i `after_data` og det aborterede payload
 * i `before_data`. Vi grupperer pr. fejl-kode så support kan se hvilke
 * koder rammer flest brugere og hvad konteksten typisk er.
 */
import { useInfiniteQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { PageHeader, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";
import { AlertTriangle, ChevronDown, ChevronRight, Download, Search } from "lucide-react";
import { formatDistanceToNow, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 200;
const RANGES: { value: string; label: string; days: number | null }[] = [
  { value: "24h", label: "24 timer", days: 1 },
  { value: "7d", label: "7 dage", days: 7 },
  { value: "30d", label: "30 dage", days: 30 },
  { value: "all", label: "Alle", days: null },
];

type AuditRow = {
  id: string;
  business_id: string;
  actor_id: string | null;
  route_id: string | null;
  agreement_id: string | null;
  action: string;
  scope: string | null;
  affected_count: number;
  before_data: any;
  after_data: any;
  created_at: string;
};

function parseAction(action: string): { code: string; handler: string } {
  // Format: "error:<CODE>:<action>"
  const parts = action.split(":");
  if (parts.length >= 3 && parts[0] === "error") {
    return { code: parts[1], handler: parts.slice(2).join(":") };
  }
  return { code: parts[1] ?? "UNKNOWN", handler: parts.slice(2).join(":") || "—" };
}

export default function PlatformRouteErrorsTab() {
  const [q, setQ] = useState("");
  const [range, setRange] = useState("7d");
  const [codeFilter, setCodeFilter] = useState<string>("all");
  const [openId, setOpenId] = useState<string | null>(null);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } = useInfiniteQuery({
    queryKey: ["route-audit-errors", range],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      let query = supabase
        .from("route_audit_log")
        .select("*")
        .like("action", "error:%")
        .order("created_at", { ascending: false })
        .limit(PAGE_SIZE);
      const r = RANGES.find((x) => x.value === range);
      if (r?.days) {
        const since = new Date(Date.now() - r.days * 86_400_000).toISOString();
        query = query.gte("created_at", since);
      }
      if (pageParam) query = query.lt("created_at", pageParam);
      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as AuditRow[];
    },
    getNextPageParam: (last) => (last.length === PAGE_SIZE ? last[last.length - 1].created_at : undefined),
  });

  const rows = useMemo(() => (data?.pages || []).flat(), [data]);

  const codeCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const { code } = parseAction(r.action);
      map.set(code, (map.get(code) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const { code, handler } = parseAction(r.action);
      if (codeFilter !== "all" && code !== codeFilter) return false;
      if (!q.trim()) return true;
      const s = q.toLowerCase();
      const msg = String(r.after_data?.message ?? "").toLowerCase();
      const title = String(r.after_data?.title ?? "").toLowerCase();
      return (
        code.toLowerCase().includes(s) ||
        handler.toLowerCase().includes(s) ||
        msg.includes(s) ||
        title.includes(s) ||
        r.business_id.includes(s)
      );
    });
  }, [rows, q, codeFilter]);

  const exportCsv = () => {
    const header = ["created_at", "code", "handler", "title", "message", "business_id", "route_id", "agreement_id", "actor_id"];
    const esc = (v: any) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [header.join(",")];
    for (const r of filtered) {
      const { code, handler } = parseAction(r.action);
      lines.push([
        r.created_at, code, handler,
        r.after_data?.title ?? "", r.after_data?.message ?? "",
        r.business_id, r.route_id ?? "", r.agreement_id ?? "", r.actor_id ?? "",
      ].map(esc).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `route-errors-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Rutefejl"
        description={`${filtered.length} af ${rows.length} fejl${hasNextPage ? " (flere tilgængelige)" : ""}`}
        action={
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-3.5 w-3.5 mr-1.5" />
            CSV
          </Button>
        }
      />

      {/* Top-koder oversigt — viser hvilke fejl-koder rammer brugere mest. */}
      {codeCounts.length > 0 && (
        <Card className="rounded-xl border-border shadow-sm p-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setCodeFilter("all")}
              className={cn(
                "rounded-md px-2 py-1 text-xs font-medium border transition-colors",
                codeFilter === "all" ? "bg-foreground text-background border-foreground" : "bg-background border-border hover:bg-secondary",
              )}
            >
              Alle ({rows.length})
            </button>
            {codeCounts.slice(0, 12).map(([code, count]) => (
              <button
                key={code}
                onClick={() => setCodeFilter(code)}
                className={cn(
                  "rounded-md px-2 py-1 text-xs font-mono border transition-colors",
                  codeFilter === code ? "bg-destructive text-destructive-foreground border-destructive" : "bg-background border-border hover:bg-secondary",
                )}
                title={`${count} forekomster`}
              >
                {code} <span className="opacity-70">({count})</span>
              </button>
            ))}
          </div>
        </Card>
      )}

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Søg i kode, besked eller virksomheds-id…"
            className="pl-8 h-9 text-sm"
          />
        </div>
        <Select value={range} onValueChange={setRange}>
          <SelectTrigger className="w-[140px] h-9 text-sm"><SelectValue /></SelectTrigger>
          <SelectContent>
            {RANGES.map((r) => (<SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListCardSkeleton rows={6} />
      ) : filtered.length === 0 ? (
        <EmptyState icon={<AlertTriangle />} title="Ingen fejl" description="Ingen rutefejl logget i den valgte periode." />
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden divide-y">
          {filtered.map((r) => {
            const { code, handler } = parseAction(r.action);
            const open = openId === r.id;
            const when = formatDistanceToNow(parseISO(r.created_at), { addSuffix: true, locale: da });
            return (
              <div key={r.id} className="text-sm">
                <button
                  onClick={() => setOpenId(open ? null : r.id)}
                  className="w-full px-4 py-2.5 flex items-start gap-3 hover:bg-secondary/50 text-left"
                >
                  {open ? <ChevronDown className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />}
                  <Badge variant="destructive" className="font-mono text-[10px] shrink-0">{code}</Badge>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{r.after_data?.title ?? code}</div>
                    <div className="text-xs text-muted-foreground truncate">
                      {r.after_data?.message ?? "—"}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground shrink-0 text-right">
                    <div>{when}</div>
                    <div className="font-mono text-[10px]">{handler}</div>
                  </div>
                </button>
                {open && (
                  <div className="px-4 pb-3 pt-1 bg-secondary/30 space-y-2">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div><span className="text-muted-foreground">business_id:</span> <span className="font-mono">{r.business_id}</span></div>
                      <div><span className="text-muted-foreground">actor_id:</span> <span className="font-mono">{r.actor_id ?? "—"}</span></div>
                      <div><span className="text-muted-foreground">route_id:</span> <span className="font-mono">{r.route_id ?? "—"}</span></div>
                      <div><span className="text-muted-foreground">agreement_id:</span> <span className="font-mono">{r.agreement_id ?? "—"}</span></div>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1">Payload (før)</p>
                      <pre className="text-[11px] font-mono bg-background border rounded p-2 overflow-x-auto max-h-48">{JSON.stringify(r.before_data, null, 2)}</pre>
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold text-muted-foreground mb-1">Fejl-detaljer</p>
                      <pre className="text-[11px] font-mono bg-background border rounded p-2 overflow-x-auto max-h-48">{JSON.stringify(r.after_data, null, 2)}</pre>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
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