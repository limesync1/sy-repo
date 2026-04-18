import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Repeat } from "lucide-react";

const fmtKr = (n: number) => `${Number(n).toLocaleString("da-DK")} kr`;

const statusColor: Record<string, string> = {
  active: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  paused: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  cancelled: "bg-red-500/10 text-red-700 border-red-500/20",
};

const PlatformSubscriptionsTab = () => {
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

  const stats = (data || []).reduce(
    (acc: any, s: any) => {
      acc.total += 1;
      if (s.status === "active") {
        acc.active += 1;
        acc.mrr += Number(s.total_price || 0);
      }
      if (s.status === "paused") acc.paused += 1;
      if (s.status === "cancelled") acc.cancelled += 1;
      return acc;
    },
    { total: 0, active: 0, paused: 0, cancelled: 0, mrr: 0 }
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[
          { label: "Aktive", value: stats.active, sub: `${fmtKr(stats.mrr)} cyklisk` },
          { label: "Pauset", value: stats.paused },
          { label: "Opsagt", value: stats.cancelled },
          { label: "Total", value: stats.total },
        ].map((s) => (
          <Card key={s.label} className="rounded-xl border-border shadow-sm">
            <CardContent className="p-4">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{s.label}</p>
              <p className="mt-1.5 text-2xl font-bold text-foreground tabular-nums">{s.value}</p>
              {s.sub && <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Indlæser abonnementer...</p>
      ) : (data || []).length === 0 ? (
        <Card className="rounded-xl border-dashed">
          <CardContent className="p-8 text-center text-sm text-muted-foreground">Ingen abonnementer endnu.</CardContent>
        </Card>
      ) : (
        <Card className="rounded-xl border-border shadow-sm overflow-hidden">
          <div className="divide-y divide-border">
            {data!.map((s: any) => (
              <div key={s.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
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
