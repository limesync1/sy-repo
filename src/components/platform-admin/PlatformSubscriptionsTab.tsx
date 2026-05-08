import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Repeat, Download, DollarSign, PauseCircle, XCircle, ListChecks, Calendar, AlertCircle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportCsv } from "./lib/csv";
import { PageHeader, StatCard, SearchInput, EmptyState } from "@/components/admin/shared/AdminUI";
import { ListCardSkeleton } from "@/components/admin/shared/Skeletons";

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

  // Hjælp admin med at se hvad der kræver opmærksomhed denne uge.
  const upcomingCount = (data || []).filter((s: any) => {
    if (s.status !== "active" || !s.next_service_date) return false;
    const days = (new Date(s.next_service_date).getTime() - Date.now()) / 86400000;
    return days >= 0 && days <= 7;
  }).length;
  const arr = stats.mrr * 12;
  const churnRate = stats.total ? (stats.cancelled / stats.total) * 100 : 0;

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
      <PageHeader
        title="Abonnementer"
        description="Tilbagevendende services og MRR på platformen."
        action={
          <Button size="sm" variant="outline" onClick={handleExport} className="h-9 gap-1.5">
            <Download className="h-3.5 w-3.5" /> CSV
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Aktive" value={String(stats.active)} icon={<DollarSign />} tone="emerald"
          hint={`${fmtKr(stats.mrr)}/md · ${fmtKr(arr)}/år`} />
        <StatCard label="Service inden for 7 dage" value={String(upcomingCount)} icon={<Calendar />} tone="blue"
          hint={upcomingCount > 0 ? "Kræver planlægning" : "Ingen lige nu"} />
        <StatCard label="Pauset" value={String(stats.paused)} icon={<PauseCircle />} tone="amber"
          hint={stats.paused > 0 ? "Genoptag eller opsig" : undefined} />
        <StatCard label="Opsigelsesrate" value={`${churnRate.toFixed(0)}%`} icon={<XCircle />} tone="neutral"
          hint={`${stats.cancelled} af ${stats.total} samlet`} />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={q} onChange={setQ} placeholder="Søg service, virksomhed..." />
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-[180px] h-10"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle</SelectItem>
            <SelectItem value="active">Aktive</SelectItem>
            <SelectItem value="paused">Pauset</SelectItem>
            <SelectItem value="cancelled">Opsagt</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <ListCardSkeleton rows={5} />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Repeat />}
          title="Ingen abonnementer fundet"
          description="Justér søgning eller status-filter."
        />
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {filtered.map((s: any) => (
              <SubscriptionRow key={s.id} s={s} />
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

/* SubscriptionRow — enkel række med visuel "snart"-pille når næste
   service er inden for 7 dage. Gør det nemt at spotte hvad der kræver
   handling uden at læse datoen. */
const SubscriptionRow = ({ s }: { s: any }) => {
  const next = s.next_service_date ? new Date(s.next_service_date) : null;
  const daysToNext = next ? (next.getTime() - Date.now()) / 86400000 : null;
  const upcoming = s.status === "active" && daysToNext !== null && daysToNext >= 0 && daysToNext <= 7;
  const overdue = s.status === "active" && daysToNext !== null && daysToNext < 0;
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 hover:bg-secondary/30">
                <div className="h-9 w-9 shrink-0 rounded-lg bg-accent/10 flex items-center justify-center">
                  <Repeat className="h-4 w-4 text-accent" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {s.service_name} <span className="text-muted-foreground">→ {s.businesses?.name || "—"}</span>
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                    <span>{INTERVAL_LABELS[s.interval] || s.interval}</span>
                    <span>·</span>
                    <span>Næste: {next ? next.toLocaleDateString("da-DK") : "—"}</span>
                    {overdue && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-destructive/10 px-1.5 py-0.5 text-[10px] font-semibold text-destructive">
                        <AlertCircle className="h-2.5 w-2.5" /> Overskredet
                      </span>
                    )}
                    {upcoming && !overdue && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                        <Calendar className="h-2.5 w-2.5" /> Om {Math.ceil(daysToNext!)} dag{Math.ceil(daysToNext!) === 1 ? "" : "e"}
                      </span>
                    )}
                  </div>
                </div>
                <Badge className={`${statusColor[s.status] || ""} border text-xs`}>{s.status}</Badge>
                <span className="text-sm font-bold tabular-nums w-24 text-right">{fmtKr(s.total_price)}</span>
    </div>
  );
};

export default PlatformSubscriptionsTab;
