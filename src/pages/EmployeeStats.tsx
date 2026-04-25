// EmployeeStats — medarbejderens egen statistik-side.
// Viser nøgletal (indtjening, ruter, opgaver, arbejdstid, distance) over en
// valgbar periode (i dag/uge/måned/år/alt) eller et frit kalenderinterval.
// Medarbejderen ser ALDRIG sin provisionsprocent, omsætning eller snit pr.
// opgave — kun det beløb hans provision faktisk har givet ham.
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { useMyEmployee, useMyEmployeeStats } from "@/hooks/useMyEmployee";
import { StatCard, PageHeader } from "@/components/admin/shared/AdminUI";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Calendar as CalendarIcon, CheckCircle2, Clock,
  MapPin, Route as RouteIcon, Wallet,
} from "lucide-react";
import {
  format, parseISO,
  startOfWeek, startOfMonth, startOfYear,
  endOfWeek, endOfMonth, endOfYear,
} from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";

type RangeKey = "today" | "week" | "month" | "year" | "all" | "custom";

const RANGE_LABELS: Record<Exclude<RangeKey, "custom">, string> = {
  today: "I dag",
  week: "Denne uge",
  month: "Denne måned",
  year: "I år",
  all: "I alt",
};

const fmtDate = (d: Date) => format(d, "yyyy-MM-dd");

const computeRange = (
  key: RangeKey,
  custom?: DateRange,
): { from: string; to: string } => {
  const today = new Date();
  switch (key) {
    case "today":
      return { from: fmtDate(today), to: fmtDate(today) };
    case "week":
      return {
        from: fmtDate(startOfWeek(today, { weekStartsOn: 1 })),
        to: fmtDate(endOfWeek(today, { weekStartsOn: 1 })),
      };
    case "month":
      return { from: fmtDate(startOfMonth(today)), to: fmtDate(endOfMonth(today)) };
    case "year":
      return { from: fmtDate(startOfYear(today)), to: fmtDate(endOfYear(today)) };
    case "custom":
      if (custom?.from) {
        return {
          from: fmtDate(custom.from),
          to: fmtDate(custom.to ?? custom.from),
        };
      }
      return { from: fmtDate(today), to: fmtDate(today) };
    case "all":
    default:
      return { from: "2000-01-01", to: fmtDate(today) };
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
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { from, to } = useMemo(
    () => computeRange(range, customRange),
    [range, customRange],
  );
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

  const customLabel = (() => {
    if (!customRange?.from) return "Vælg datoer";
    const f = format(customRange.from, "d. MMM", { locale: da });
    if (!customRange.to || fmtDate(customRange.to) === fmtDate(customRange.from)) return f;
    return `${f} – ${format(customRange.to, "d. MMM", { locale: da })}`;
  })();

  const rangePicker = (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-1 shadow-sm">
      {(Object.keys(RANGE_LABELS) as Array<Exclude<RangeKey, "custom">>).map((k) => (
        <Button
          key={k}
          size="sm"
          variant="ghost"
          onClick={() => { setRange(k); setCustomRange(undefined); }}
          className={cn(
            "h-8 rounded-md px-3 text-xs font-medium transition-colors",
            range === k
              ? "bg-foreground text-background hover:bg-foreground/90 hover:text-background shadow-sm"
              : "text-muted-foreground hover:bg-secondary hover:text-foreground",
          )}
        >
          {RANGE_LABELS[k]}
        </Button>
      ))}
      <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant="ghost"
            className={cn(
              "h-8 gap-1.5 rounded-md px-3 text-xs font-medium transition-colors",
              range === "custom"
                ? "bg-foreground text-background hover:bg-foreground/90 hover:text-background shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <CalendarIcon className="h-3.5 w-3.5" />
            {range === "custom" ? customLabel : "Vælg datoer"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            mode="range"
            selected={customRange}
            onSelect={(r) => {
              setCustomRange(r);
              if (r?.from) setRange("custom");
              if (r?.from && r?.to) setCalendarOpen(false);
            }}
            numberOfMonths={2}
            locale={da}
            weekStartsOn={1}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
    </div>
  );

  const isLoading = empLoading || statsLoading;
  const s = stats;
  const headerLabel =
    range === "custom" && customRange?.from ? customLabel : RANGE_LABELS[range as Exclude<RangeKey, "custom">];

  return (
    <EmployeeShell activeTab="stats" title="Statistik">
      <div className="mx-auto max-w-5xl space-y-5 pb-16">
        <PageHeader
          title={<span className="capitalize">{headerLabel}</span>}
          description={
            <span className="tabular-nums">
              {format(parseISO(from), "d. MMM yyyy", { locale: da })} – {format(parseISO(to), "d. MMM yyyy", { locale: da })}
            </span>
          }
          action={rangePicker}
        />

        {isLoading || !s ? (
          <Card className="p-10 text-center text-muted-foreground">
            <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary mb-2">
              <div className="h-4 w-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
            </div>
            <p className="text-sm">Indlæser statistik…</p>
          </Card>
        ) : (
          <>
            {/* Indtjening (medarbejderens egen andel) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <StatCard
                label="Min indtjening"
                value={formatKr(s.commission)}
                icon={<Wallet />}
                tone="emerald"
                hint={`Fra ${s.stopsCompleted} udførte opgaver`}
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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