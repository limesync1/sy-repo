import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Repeat, Search, Download } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCsv } from "./lib/csv";

const fmtKr = (n: number) => `${Number(n).toLocaleString("da-DK")} kr`;

const statusColor: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-700 border-red-500/20",
};

const PlatformSubscriptionsTab = () => {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("*, businesses(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  const filtered = useMemo(() => {
    return (data || []).filter((s: any) => {
      if (status !== "all" && s.status !== status) return false;
      if (!q.trim()) return true;
      const ql = q.toLowerCase();
      return s.service_name?.toLowerCase().includes(ql) || s.businesses?.name?.toLowerCase().includes(ql);
    });
  }, [data, q, status]);

  const stats = (data || []).reduce(
    (acc: any, s: any) => {
      acc.total += 1;
      if (s.status === "active") { acc.active += 1; acc.mrr += Number(s.total_price || 0); }
      if (s.status === "paused") acc.paused += 1;
      if (s.status === "cancelled") acc.cancelled += 1;
      return acc;
    },
    { total: 0, active: 0, paused: 0, cancelled: 0, mrr: 0 }
  );

  const handleExport = () => {
    exportCsv("abonnementer", filtered.map((s: any) => ({
      service: s.service_name, virksomhed: s.businesses?.name || "",
      interval: s.interval, status: s.status, pris: s.total_price,
      naeste_service: s.next_service_date ? new Date(s.next_service_date).toLocaleDateString("da-DK") : "",
      oprettet: new Date(s.created_at).toLocaleDateString("da-DK"),
    })));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Aktive", value: stats.active, sub: `${fmtKr(stats.mrr)} cyklisk`, color: "text-emerald-600" },
          { label: "Pauset", value: stats.paused, color: "text-amber-600" },
          { label: "Opsagt", value: stats.cancelled, color: "text-red-600" },
          { label: "Total", value: stats.total, color: "text-foreground" },
        ].map((s) => (
          <Card key={s.label} className="rounded-xl border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className={`mt-1.5 text-2xl font-bold tabular-nums ${s.color}`}>{s.value}</p>
              {s.sub && <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Søg service, virksomhed..." className="pl-9" />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="active">Aktive</SelectItem>
            <SelectItem value="paused">Pauset</SelectItem>
            <SelectItem value="cancelled">Opsagt</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
          <Download className="h-3.5 w-3.5" /> CSV
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-14 rounded-lg bg-secondary/40 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="rounded-xl border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Ingen abonnementer fundet.</CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((s: any) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-secondary/30">
                <div className="h-9 w-9 shrink-0 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Repeat className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {s.service_name} <span className="text-muted-foreground">→ {s.businesses?.name || "—"}</span>
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {s.interval} · Næste service: {s.next_service_date ? new Date(s.next_service_date).toLocaleDateString("da-DK") : "—"}
                  </p>
                </div>
                <Badge className={`${statusColor[s.status] || ""} border text-xs`}>{s.status}</Badge>
                <span className="text-sm font-bold tabular-nums w-24 text-right">{fmtKr(s.total_price)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default PlatformSubscriptionsTab;
