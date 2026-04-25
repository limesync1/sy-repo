// EmployeeStats — medarbejderens egen statistik-side.
// Viser nøgletal (ruter, stop, indtjening, arbejdstid, distance) over en
// valgbar periode (uge/måned/år/alt) — i samme StatCard-stil som
// virksomhedspanelets dashboard.
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { useMyEmployee, useMyEmployeeStats } from "@/hooks/useMyEmployee";
import { StatCard } from "@/components/admin/shared/AdminUI";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Calendar as CalendarIcon, CheckCircle2, Clock, DollarSign,
  MapPin, Route as RouteIcon, TrendingUp, Wallet,
} from "lucide-react";
import { format, parseISO, startOfWeek, startOfMonth, startOfYear, endOfWeek, endOfMonth, endOfYear } from "date-fns";
import { da } from "date-fns/locale";

type RangeKey = "week" | "month" | "year" | "all";

const RANGE_LABELS: Record<RangeKey, string> = {
  week: "Denne uge",
  month: "Denne måned",
  year: "I år",
  all: "Alt",
};

const computeRange = (key: RangeKey): { from: string; to: string } => {
  const today = new Date();
  const fmt = (d: Date) => format(d, "yyyy-MM-dd");
  switch (key) {
    case "week":
      return { from: fmt(startOfWeek(today, { weekStartsOn: 1 })), to: fmt(endOfWeek(today, { weekStartsOn: 1 })) };
    case "month":
      return { from: fmt(startOfMonth(today)), to: fmt(endOfMonth(today)) };
    case "year":
      return { from: fmt(startOfYear(today)), to: fmt(endOfYear(today)) };
    case "all":
    default:
      return { from: "2000-01-01", to: fmt(today) };
  }
};

const formatHours = (minutes: number) => {
  if (!minutes) return "0t";
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}t`;
  return `${h}t ${m}m`;
};

const formatKr = (n: number) =>
  `${Math.round(n).toLocaleString("da-DK")} kr`;

const EmployeeStats = () => {
  const { user, loading } = useAuth();
  const { data: employee, isLoading: empLoading } = useMyEmployee();
  const [range, setRange] = useState<RangeKey>("month");
  const { from, to } = useMemo(() => computeRange(range), [range]);
  const { data: stats, isLoading: statsLoading } = useMyEmployeeStats(
    employee?.id,
    employee?.commission_pct ?? 0,
    from,
    to,
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Indlæser...
      </div>
    );
  }
  if (!user) return <Navigate to="/log-ind" replace />;

  const rangePicker = (
    <div className="flex items-center gap-1 rounded-lg border border-border bg-background p-0.5">
      {(Object.keys(RANGE_LABELS) as RangeKey[]).map((k) => (
        <Button
          key={k}
          size="sm"
          variant="ghost"
          onClick={() => setRange(k)}
          className={`h-7 px-2.5 text-[11px] font-semibold ${
            range === k ? "bg-secondary text-foreground" : "text-muted-foreground"
          }`}
        >
          {RANGE_LABELS[k]}
        </Button>
      ))}
    </div>
  );

  const isLoading = empLoading || statsLoading;
  const s = stats;

  return (
    <EmployeeShell activeTab="stats" title="Statistik" topbarRight={rangePicker}>
      <div className="mx-auto max-w-5xl space-y-5 pb-16">
        {/* Header */}
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold text-foreground capitalize">
            {RANGE_LABELS[range]}
          </h2>
          <p className="text-sm text-muted-foreground tabular-nums">
            {format(parseISO(from), "d. MMM yyyy", { locale: da })} – {format(parseISO(to), "d. MMM yyyy", { locale: da })}
          </p>
        </div>

        {isLoading || !s ? (
          <Card className="p-10 text-center text-muted-foreground">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary mb-2">
              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
            </div>
            <p className="text-sm">Indlæser statistik…</p>
          </Card>
        ) : (
          <>
            {/* Nøgletal */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Indtjening"
                value={formatKr(s.commission)}
                icon={<Wallet />}
                tone="emerald"
                hint={employee?.commission_pct ? `${employee.commission_pct}% af ${formatKr(s.revenue)}` : "Ingen kommission sat"}
              />
              <StatCard
                label="Omsætning"
                value={formatKr(s.revenue)}
                icon={<DollarSign />}
                tone="blue"
                hint={`${s.stopsCompleted} udførte opgaver`}
              />
              <StatCard
                label="Ruter"
                value={s.routesCount}
                icon={<RouteIcon />}
                tone="violet"
                hint={s.totalDistanceKm > 0 ? `${s.totalDistanceKm.toFixed(0)} km kørt` : null}
              />
              <StatCard
                label="Opgaver"
                value={`${s.stopsCompleted}/${s.stopsTotal}`}
                icon={<CheckCircle2 />}
                tone="amber"
                hint={s.stopsTotal > 0 ? `${Math.round((s.stopsCompleted / s.stopsTotal) * 100)}% gennemført` : null}
              />
            </div>

            {/* Sekundær række */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <StatCard
                label="Arbejdsdage"
                value={s.workdaysCount}
                icon={<CalendarIcon />}
                tone="neutral"
              />
              <StatCard
                label="Arbejdstid"
                value={formatHours(s.workMinutes)}
                icon={<Clock />}
                tone="neutral"
              />
              <StatCard
                label="Distance"
                value={`${s.totalDistanceKm.toFixed(0)} km`}
                icon={<MapPin />}
                tone="neutral"
              />
              <StatCard
                label="Snit pr. opgave"
                value={s.stopsCompleted > 0 ? formatKr(s.revenue / s.stopsCompleted) : "–"}
                icon={<TrendingUp />}
                tone="neutral"
              />
            </div>

            {/* Daglig oversigt */}
            <Card className="rounded-xl border-border shadow-sm">
              <CardContent className="p-0">
                <div className="border-b border-border px-4 py-3 sm:px-5">
                  <h3 className="text-sm font-semibold text-foreground">Daglig aktivitet</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Færdige opgaver pr. dag i perioden
                  </p>
                </div>
                {s.perDay.length === 0 ? (
                  <div className="p-10 text-center text-sm text-muted-foreground">
                    Ingen aktivitet i denne periode.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {s.perDay.map((d) => {
                      const max = Math.max(...s.perDay.map((x) => x.stops));
                      const pct = max > 0 ? (d.stops / max) * 100 : 0;
                      return (
                        <div key={d.date} className="flex items-center gap-3 px-4 py-3 sm:px-5">
                          <div className="w-24 shrink-0">
                            <p className="text-xs font-semibold text-foreground capitalize">
                              {format(parseISO(d.date), "EEE d. MMM", { locale: da })}
                            </p>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                              <div
                                className="h-full bg-foreground transition-all"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                          <div className="w-16 shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums text-foreground">
                              {d.stops}
                            </p>
                            <p className="text-[10px] text-muted-foreground">opgaver</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </EmployeeShell>
  );
};

export default EmployeeStats;