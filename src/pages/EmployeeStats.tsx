// EmployeeStats — medarbejderens egen statistik-side.
// Viser nøgletal (indtjening, ruter, opgaver, arbejdstid, distance) over en
// valgbar periode (i dag/uge/måned/år/alt) eller et frit kalenderinterval.
// Medarbejderen ser ALDRIG sin provisionsprocent, omsætning eller snit pr.
// opgave — kun det beløb hans provision faktisk har givet ham.
import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { PageTransition } from "@/components/admin/shared/PageTransition";
import { useMyEmployee, useMyEmployeeStats } from "@/hooks/useMyEmployee";
import { PageHeader } from "@/components/admin/shared/AdminUI";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Calendar as CalendarIcon, CheckCircle2, Clock,
  MapPin, Route as RouteIcon, Wallet, ChevronDown,
  ListChecks, Users as UsersIcon, FileText, Eye,
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
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";
import { StopDetailsSheetById } from "@/components/employee/StopDetailsSheetById";
import { Skeleton } from "@/components/ui/skeleton";
import { formatKr } from "@/lib/commission";
import { PageSkeleton } from "@/components/admin/shared/Skeletons";

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

const formatWorkTime = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds || 0));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  const s = safe % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
};

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

// Diskrete outline-badges — matcher virksomhedspanelets StopDetailSheet
// hvor status vises som dæmpede outline-chips. Bruges inde i daglig
// aktivitet hvor de forrige fyldte chips var for høj-kontrast.
const PAYMENT_BADGE_OUTLINE: Record<string, string> = {
  paid: "border-feature-cool/40 bg-feature-cool/10 text-feature-cool-foreground",
  settling: "border-feature-lilac/40 bg-feature-lilac/10 text-feature-lilac-foreground",
  pending: "border-feature-warm/40 bg-feature-warm/10 text-feature-warm-foreground",
  unknown: "border-border bg-secondary/50 text-muted-foreground",
};

const EmployeeStats = () => {
  const { user, loading } = useAuth();
  const { data: employee, isLoading: empLoading } = useMyEmployee();
  const [range, setRange] = useState<RangeKey>("month");
  const [customRange, setCustomRange] = useState<DateRange | undefined>();
  const [calendarOpen, setCalendarOpen] = useState(false);
  const isCompact = useIsBelowBreakpoint(1024);
  // Stop som er valgt for "Vis detaljer"-modalen.
  const [detailStopId, setDetailStopId] = useState<string | null>(null);
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
      <EmployeeShell activeTab="stats" title="Statistik">
        <PageSkeleton statsCount={5} rows={4} />
      </EmployeeShell>
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
    <div className="w-full overflow-hidden rounded-[5px] border border-border bg-card shadow-sm sm:w-auto">
      <div className="flex gap-1 overflow-x-auto p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {(Object.keys(RANGE_LABELS) as Array<Exclude<RangeKey, "custom">>).map((k) => (
        <Button
          key={k}
          size="sm"
          variant="ghost"
          onClick={() => { setRange(k); setCustomRange(undefined); }}
          className={cn(
            "h-9 shrink-0 rounded-[5px] px-3 text-xs font-semibold transition-colors active:scale-[0.98]",
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
              "h-9 shrink-0 gap-1.5 rounded-[5px] px-3 text-xs font-semibold transition-colors active:scale-[0.98]",
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
            numberOfMonths={isCompact ? 1 : 2}
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
      {/* Fade indholdet ind ved hvert range-skift så tal-ændringer føles
          guidede frem for at "blinke" pludseligt. */}
      <PageTransition transitionKey={`${range}|${from}|${to}`} className="mx-auto w-full max-w-6xl space-y-3 sm:space-y-5">
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
          <>
            <Card className="service-panel-card overflow-hidden rounded-[5px] border-border shadow-sm">
              <div className="flex flex-col gap-3 border-l-4 border-l-primary p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
                <div className="flex items-center gap-4">
                  <Skeleton className="h-12 w-12 rounded-[5px] sm:h-14 sm:w-14" />
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-8 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-1">
                  <Skeleton className="h-10 w-full sm:w-24" />
                  <Skeleton className="h-10 w-full sm:w-24" />
                </div>
              </div>
            </Card>
            <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-5">
              {[0, 1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-20 rounded-[5px]" />
              ))}
            </div>
            <Card className="service-panel-card rounded-[5px] border-border shadow-sm">
              <div className="space-y-2 p-5">
                {[0, 1, 2].map((i) => (
                  <div key={i} className="flex items-center gap-3 py-2">
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                    <Skeleton className="h-2 flex-1" />
                    <Skeleton className="h-8 w-20" />
                  </div>
                ))}
              </div>
            </Card>
          </>
        ) : (
          <>
            {/* Hero: medarbejderens egen indtjening — fremhævet som det vigtigste tal */}
            <Card className="service-panel-card overflow-hidden rounded-[5px] border-border shadow-sm">
              <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-6">
                <div className="flex items-center gap-3 sm:gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[5px] bg-primary/10 text-primary sm:h-12 sm:w-12">
                    <Wallet className="h-5 w-5 sm:h-7 sm:w-7" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Min indtjening
                    </p>
                    <p className="mt-0.5 text-2xl font-bold tracking-tight tabular-nums text-foreground sm:text-3xl">
                      {formatKr(s.commission)}
                    </p>
                    <p className="mt-0.5 sm:mt-1 text-[11px] sm:text-xs text-muted-foreground">
                      Fra {s.stopsCompleted} {s.stopsCompleted === 1 ? "udført aftale" : "udførte aftaler"}
                    </p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-1 sm:gap-1 sm:text-right">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Periode</p>
                    <p className="text-xs sm:text-sm font-semibold tabular-nums text-foreground">{headerLabel}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Gennemført</p>
                    <p className="text-xs sm:text-sm font-semibold tabular-nums text-foreground">
                      {s.stopsTotal > 0 ? `${Math.round((s.stopsCompleted / s.stopsTotal) * 100)}%` : "—"}
                    </p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Ét samlet, roligt nøgletalsoverblik i stedet for fem farvede kort. */}
            <div className="grid grid-cols-2 overflow-hidden rounded-[5px] border border-border bg-card shadow-sm lg:grid-cols-5">
              {[
                { label: "Ruter", value: s.routesCount, icon: RouteIcon },
                { label: "Aftaler", value: `${s.stopsCompleted}/${s.stopsTotal}`, icon: CheckCircle2 },
                { label: "Arbejdsdage", value: s.workdaysCount, icon: CalendarIcon },
                 { label: "Arbejdstid", value: formatWorkTime(s.workSeconds), icon: Clock },
                { label: "Distance", value: `${s.totalDistanceKm.toFixed(0)} km`, icon: MapPin },
              ].map(({ label, value, icon: Icon }, index) => (
                <div
                  key={label}
                  className={cn(
                    "flex min-h-[76px] items-center gap-3 p-3.5",
                    "border-b border-border odd:border-r lg:border-b-0 lg:border-r",
                    index === 4 && "col-span-2 border-b-0 odd:border-r-0 lg:col-span-1 lg:border-r-0",
                  )}
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[5px] bg-secondary text-muted-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
                    <p className="mt-0.5 truncate text-lg font-bold tabular-nums text-foreground">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Daglig oversigt */}
            <Card className="service-panel-card rounded-[5px] border-border shadow-sm">
              <CardContent className="p-0">
                <div className="flex items-start gap-3 border-b border-border px-4 py-3 sm:px-5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[5px] bg-secondary text-foreground">
                    <ListChecks className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-semibold text-foreground tracking-tight">Daglig aktivitet</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">Aftaler og indtjening fordelt på dage.</p>
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
                        <Collapsible key={d.date} defaultOpen>
                          <CollapsibleTrigger asChild>
                            <button
                              type="button"
                              className="grid w-full gap-2.5 px-3 py-3 text-left transition-colors hover:bg-secondary/60 active:bg-secondary sm:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)_auto] sm:items-center sm:gap-4 sm:px-5 sm:py-3.5"
                            >
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-foreground tracking-tight capitalize">
                                  {format(parseISO(d.date), "EEEE d. MMM", { locale: da })}
                                </p>
                                <p className="mt-0.5 text-[11px] text-muted-foreground tabular-nums">
                                  {d.stops} {d.stops === 1 ? "aftale" : "aftaler"}
                                </p>
                              </div>
                              <div className="hidden sm:block">
                                <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                                  <div
                                    className="h-full bg-foreground transition-all"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center justify-between gap-3 rounded-[5px] bg-secondary/50 px-3 py-2 sm:justify-end sm:bg-transparent sm:p-0">
                                <div className="text-right">
                                  <p className="text-sm font-bold tabular-nums text-foreground">
                                    {formatKr(d.earnings)}
                                  </p>
                                  <p className="text-[10px] text-muted-foreground">Min andel ekskl. moms</p>
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
                                      className="group rounded-[5px] p-3 transition-colors hover:bg-card/60"
                                    >
                                      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                                        <div className="min-w-0 space-y-1.5">
                                          <div className="flex flex-wrap items-center gap-2">
                                            <p className="truncate text-sm font-semibold text-foreground tracking-tight">
                                              {e.customerName || "Aftale"}
                                            </p>
                                            <Badge
                                              variant="outline"
                                              className={cn(
                                                "inline-flex h-5 w-fit gap-1 border px-1.5 text-[10px] font-medium",
                                                PAYMENT_BADGE_OUTLINE[e.paymentStatus],
                                              )}
                                            >
                                              {PAYMENT_LABEL[e.paymentStatus]}
                                            </Badge>
                                          </div>
                                          {e.serviceName && (
                                            <p className="text-xs text-muted-foreground">{e.serviceName}</p>
                                          )}
                                          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                                            {e.completedAt && (
                                              <span className="inline-flex items-center gap-1 tabular-nums">
                                                <Clock className="h-3 w-3" />
                                                Færdig {format(new Date(e.completedAt), "HH:mm", { locale: da })}
                                              </span>
                                            )}
                                            {e.address && (
                                              <span className="inline-flex min-w-0 max-w-full items-start gap-1">
                                                <MapPin className="mt-0.5 h-3 w-3 shrink-0" />
                                                <span className="break-words">{e.address}</span>
                                              </span>
                                            )}
                                            {e.sharers > 1 && (
                                              <span className="inline-flex items-center gap-1">
                                                <UsersIcon className="h-3 w-3" />
                                                Delt på {e.sharers}
                                              </span>
                                            )}
                                          </div>
                                          {e.note && (
                                            <p className="mt-1 flex items-start gap-1.5 rounded-[5px] bg-card px-2 py-1.5 text-[11px] text-muted-foreground">
                                              <FileText className="mt-0.5 h-3 w-3 shrink-0" />
                                              <span>{e.note}</span>
                                            </p>
                                          )}
                                        </div>
                                        <div className="flex items-center justify-between gap-4 rounded-[5px] bg-card px-3 py-2 sm:flex-col sm:items-end sm:gap-1 sm:bg-transparent sm:p-0">
                                          <div className="text-right">
                                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Total inkl. moms</p>
                                            <p className="text-xs font-medium tabular-nums text-muted-foreground">
                                              {formatKr(e.orderAmount)}
                                            </p>
                                          </div>
                                          <div className="text-right">
                                            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Min andel ekskl. moms</p>
                                            <p className="text-sm font-bold tabular-nums text-foreground">
                                              {formatKr(e.share)}
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                      <div className="mt-3 flex justify-end border-t border-border/50 pt-2">
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="sm"
                                          onClick={() => setDetailStopId(e.stopId)}
                                          className="h-8 gap-1.5 rounded-[5px] px-2.5 text-[11px] font-semibold text-foreground tracking-tight transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                                        >
                                          <Eye className="h-3.5 w-3.5" />
                                          Vis detaljer
                                        </Button>
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
      </PageTransition>
      <StopDetailsSheetById
        open={!!detailStopId}
        onOpenChange={(open) => { if (!open) setDetailStopId(null); }}
        stopId={detailStopId}
      />
    </EmployeeShell>
  );
};

export default EmployeeStats;