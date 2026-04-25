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
  MapPin, Route as RouteIcon, Wallet, ChevronDown,
  ListChecks,
} from "lucide-react";
import {
  format, parseISO,
  startOfWeek, startOfMonth, startOfYear,
  endOfWeek, endOfMonth, endOfYear,
} from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useIsMobile } from "@/hooks/use-mobile";

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

const PAYMENT_LABEL: Record<string, string> = {
  paid: "Betalt",
  settling: "Afregnes",
  pending: "Afventer",
  unknown: "Status ukendt",
};

const PAYMENT_BADGE: Record<string, string> = {
  paid: "bg-feature-cool text-feature-cool-foreground border-transparent",
  settling: "bg-feature-lilac text-feature-lilac-foreground border-transparent",
  pending: "bg-feature-warm text-feature-warm-foreground border-transparent",
  unknown: "bg-secondary text-muted-foreground border-transparent",
};

const EmployeeStats = () => {
  const { user, loading } = useAuth();
  const { data: employee, isLoading: empLoading } = useMyEmployee();
  const [range, setRange] = useState<RangeKey>("month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isMobile = useIsMobile();
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
    <div className="w-full overflow-hidden rounded-xl border border-border bg-card shadow-sm sm:w-auto">
      <div className="flex gap-1 overflow-x-auto p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {(Object.keys(RANGE_LABELS) as Array<Exclude<RangeKey, "custom">>).map((k) => (
        <Button
          key={k}
          size="sm"
          variant="ghost"
          onClick={() => { setRange(k); setCustomRange(undefined); }}
          className={cn(
            "h-9 shrink-0 rounded-lg px-3 text-xs font-semibold transition-colors active:scale-[0.98]",
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
              "h-9 shrink-0 gap-1.5 rounded-lg px-3 text-xs font-semibold transition-colors active:scale-[0.98]",
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
            numberOfMonths={isMobile ? 1 : 2}
            locale={da}
            weekStartsOn={1}
            initialFocus
            className={cn("p-3 pointer-events-auto")}
          />
        </PopoverContent>
      </Popover>
      </div>
    </div>
  );

  const isLoading = empLoading || statsLoading;
  const s = stats;
  const headerLabel =
    range === "custom" && customRange?.from ? customLabel : RANGE_LABELS[range as Exclude<RangeKey, "custom">];

  return (
    <EmployeeShell activeTab="stats" title="Statistik">
      <div className="mx-auto max-w-5xl space-y-4 pb-20 sm:space-y-5">
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="sm:col-span-2 lg:col-span-1">
                <StatCard
                  label="Min indtjening"
                  value={formatKr(s.commission)}
                  icon={<Wallet />}
                  tone="emerald"
                  hint={`Fra ${s.stopsCompleted} udførte opgaver`}
                />
              </div>
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
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
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
                <div className="flex items-start gap-3 border-b border-border px-4 py-3 sm:px-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                    <ListChecks className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground">Daglig aktivitet</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Udfold en dag for at se hver aftale, betaling og din udbetaling.
                    </p>
                  </div>
                </div>
                {s.perDay.length === 0 ? (
                  <div className="p-10 text-center text-sm text-muted-foreground">
                    Ingen aktivitet i denne periode.
                  </div>
                ) : (
                  <div className="divide-y divide-border">
                    {s.perDay.map((d) => {
                      const max = Math.max(...s.perDay.map((x) => x.stops), 1);
                      const pct = (d.stops / max) * 100;
                      return (
                        <Collapsible key={d.date} defaultOpen={s.perDay.length <= 3}>
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="grid w-full gap-3 px-4 py-3.5 text-left transition-colors hover:bg-secondary/60 active:bg-secondary sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-center sm:gap-4 sm:px-5"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground capitalize">
                                  {format(parseISO(d.date), "EEEE d. MMM", { locale: da })}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                                  {d.stops} {d.stops === 1 ? "opgave" : "opgaver"}
                                </p>
                              </div>
                              <div className="block">
                                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                                  <div
                                    className="h-full bg-foreground transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-3 rounded-lg bg-secondary/50 px-3 py-2 sm:justify-end sm:bg-transparent sm:p-0">
                                <div className="text-right">
                                  <p className="text-sm font-bold tabular-nums text-foreground">
                                    {formatKr(d.earnings)}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">min indtjening</p>
                                </div>
                                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform data-[state=open]:rotate-180" />
                              </div>
                            </button>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <div className="border-t border-border bg-secondary/30 px-3 py-2 sm:px-5">
                              {d.entries.length === 0 ? (
                                <p className="py-3 text-center text-xs text-muted-foreground">
                                  Ingen detaljer
                                </p>
                              ) : (
                                <ul className="divide-y divide-border/60">
                                  {d.entries.map((e) => (
                                    <li
                                      key={e.stopId}
                                      className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 rounded-lg px-2 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4"
                                    >
                                      <div className="min-w-0">
                                        <p className="truncate text-sm font-medium text-foreground">
                                          {e.customerName || "Opgave"}
                                        </p>
                                        <Badge
                                          variant="outline"
                                          className={cn(
                                            "mt-1 inline-flex h-5 w-fit border px-1.5 text-[10px] font-medium",
                                            PAYMENT_BADGE[e.paymentStatus],
                                          )}
                                        >
                                          {PAYMENT_LABEL[e.paymentStatus]}
                                        </Badge>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Aftale</p>
                                        <p className="text-xs font-medium tabular-nums text-muted-foreground">
                                          {formatKr(e.orderAmount)}
                                        </p>
                                      </div>
                                      <div className="col-span-2 flex items-center justify-between rounded-md bg-card px-3 py-2 text-right sm:col-span-1 sm:block sm:bg-transparent sm:p-0">
                                        <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Min andel</p>
                                        <p className="text-sm font-bold tabular-nums text-foreground">
                                          {formatKr(e.share)}
                                        </p>
                                      </div>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
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