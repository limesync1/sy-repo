import { NoItemsIcon } from "@/components/shared/NoItemsIcon";
import { UiArtwork } from "@/components/shared/UiArtwork";
import { RouteWeatherStatus } from "@/components/employee/RouteWeatherStatus";
import { useEffect, useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyDayRoutes, useMyDayStops, type RouteStop } from "@/hooks/useRoutes";
import { useMyWorkday, useStartWorkday, useEndWorkday } from "@/hooks/useRoutes";
import { useMyEmployee, useMyEmployeeStats } from "@/hooks/useMyEmployee";
import { useStopTimeEntries } from "@/hooks/useRoutes";
import { getRouteStartedAt, readArrival } from "@/components/employee-route/route-run-clock";
import { runMetrics } from "@/components/employee-route/run-metrics";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { canCompleteEarly, earlyCompletionReason, type EarlyCompletionMode } from "@/lib/early-completion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { RouteAwareCalendar } from "@/components/route-planner/RouteAwareCalendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { StopDetailsContent } from "@/components/employee/StopDetailsContent";
import { StopDetailsSheetShell } from "@/components/employee/StopDetailsSheetShell";
import RoutePrintDialog, { type PrintRoute } from "@/components/route-planner/RoutePrintDialog";
import {
  Calendar as CalendarIcon, Printer, MapPin, CheckCircle2,
  ChevronLeft, ChevronRight, Route as RouteIcon, Navigation, PlayCircle, StopCircle,
  Users, User as UserIcon, Info, CalendarCheck, ArrowRight, Lock as LockIcon,
  Unlock as UnlockIcon,
} from "lucide-react";
import { format, addDays, parseISO, isToday } from "date-fns";
import { da } from "date-fns/locale";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { EmployeeShell } from "@/components/employee/EmployeeShell";
import SEO from "@/components/SEO";
import { EmployeePage } from "@/components/employee/EmployeePage";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MinDagSkeleton } from "@/components/employee/MinDagSkeleton";
import { formatKr as formatKrShared } from "@/lib/commission";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";
import { BrandedIllustration, type BrandedIllustrationName } from "@/components/shared/BrandedIllustration";
import { PageHeader } from "@/components/admin/shared/AdminUI";
import { stripPrices } from "@/lib/employee-display";
import { orderDayRoutes } from "@/lib/employee-day-order";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

const formatWorkDuration = (seconds: number) => {
  const safe = Math.max(0, Math.floor(seconds));
  const parts = [Math.floor(safe / 3600), Math.floor((safe % 3600) / 60), safe % 60];
  return parts
    .map((value) => String(value).padStart(2, "0"))
    .join(" : ");
};

// Vis ALTID ører — så medarbejderen ser præcist beløb i hele appen.
const formatKr = (n?: number | null) => formatKrShared(Number(n) || 0);

const miniStopIcon = (n: number, color: string, done: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${done ? "hsl(var(--feature-cool-foreground))" : color};display:flex;align-items:center;justify-content:center;color:hsl(var(--background));font-weight:700;font-size:10px;border:2px solid hsl(var(--background));box-shadow:0 1px 4px hsl(var(--foreground) / .3);">${done ? "✓" : n}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const startIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:hsl(var(--foreground));border:3px solid hsl(var(--background));box-shadow:0 1px 4px hsl(var(--foreground) / .35);"></div>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const RouteMiniMap = ({
  stops,
  startCoord,
  color,
}: {
  stops: RouteStop[];
  startCoord: [number, number] | null;
  color: string;
}) => {
  const valid = stops.filter((s) => s.latitude != null && s.longitude != null);
  const points: [number, number][] = useMemo(() => {
    const arr: [number, number][] = [];
    if (startCoord) arr.push(startCoord);
    for (const s of valid) arr.push([Number(s.latitude), Number(s.longitude)]);
    return arr;
  }, [valid, startCoord]);

  if (points.length === 0) {
    return null;
  }

  const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));

  return (
    <div aria-hidden="true" className="pointer-events-none relative z-0 h-32 w-full isolate overflow-hidden bg-secondary/40 sm:h-44">
      <MapContainer
        bounds={bounds}
        boundsOptions={{ padding: [20, 20] }}
        zoom={11}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
        dragging={false}
        doubleClickZoom={false}
        zoomControl={false}
        attributionControl={false}
        className="relative z-0"
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        {startCoord && <Marker position={startCoord} icon={startIcon} />}
        {points.length > 1 && (
          <Polyline
            positions={points}
            pathOptions={{ color, weight: 4, opacity: 0.85 }}
          />
        )}
        {valid.map((s, i) => (
          <Marker
            key={s.id}
            position={[Number(s.latitude), Number(s.longitude)]}
            icon={miniStopIcon(i + 1, color, s.status === "completed")}
          />
        ))}
      </MapContainer>
    </div>
  );
};

const EmployeeApp = () => {
  const { user, loading } = useAuth();
  const [date, setDate] = useState(todayStr());
  const isCompact = useIsBelowBreakpoint(1024);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [detailsStopId, setDetailsStopId] = useState<string | null>(null);
  // Print-forhåndsvisning (rute-id der vises i preview-sheet'en)
  const [previewRouteId, setPreviewRouteId] = useState<string | null>(null);
  const { data: routes = [], isLoading: routesLoading } = useMyDayRoutes(date);
  const { data: stops = [], isLoading: stopsLoading } = useMyDayStops(date);
  const detailsStop = stops.find(stop => stop.id === detailsStopId);
  const detailsRoute = routes.find(route => route.id === detailsStop?.route_id);
  useEffect(() => { setDetailsStopId(null); }, [date]);
  useEffect(() => {
    if (!stopsLoading && detailsStopId && !detailsStop) setDetailsStopId(null);
  }, [stopsLoading, detailsStopId, detailsStop]);
  const { data: workday } = useMyWorkday(date);
  const { data: me } = useMyEmployee();
  const { data: receiptStats, isLoading: receiptStatsLoading, isError: receiptStatsError } = useMyEmployeeStats(previewRouteId ? me?.id : undefined, me?.commission_pct ?? 0, date, date);
  const { data: receiptTimes = [], isLoading: receiptTimesLoading, isError: receiptTimesError } = useStopTimeEntries(previewRouteId ? stops.filter(s => s.route_id === previewRouteId).map(s => s.id) : []);
  const routeDates = useMemo(() => new Set(routes.map((route) => route.route_date).filter(Boolean)), [routes]);
  const stopsByRoute = useMemo(() => {
    const grouped = new Map<string, RouteStop[]>();
    for (const stop of stops) grouped.set(stop.route_id, [...(grouped.get(stop.route_id) || []), stop]);
    return grouped;
  }, [stops]);
  const sortedRoutes = useMemo(() => orderDayRoutes(routes, new Set(routes.filter(r => {
    const routeStops = stopsByRoute.get(r.id) || [];
    return routeStops.length > 0 && routeStops.every(s => s.status === "completed");
  }).map(r => r.id))), [routes, stopsByRoute]);
  const firstActiveId = sortedRoutes.find(r => (stopsByRoute.get(r.id) || []).some(s => s.status !== "completed"))?.id ?? null;
  const printableRoutes = useMemo<PrintRoute[]>(() => routes.map((route) => ({
    id: route.id,
    date: route.route_date,
    name: route.name || "Rute",
    color: route.color,
    employeeNames: me?.name ? [me.name] : [],
    startAddress: route.start_address,
    distanceKm: route.total_distance_km,
    plannedStartTime: route.planned_start_time,
    receipt: (() => {
      const routeStops = stopsByRoute.get(route.id) || [];
      const start = getRouteStartedAt(route.id);
      const completed = routeStops.filter(s => s.status === "completed");
      const end = routeStops.length > 0 && completed.length === routeStops.length ? Math.max(...completed.map(s => s.completed_at ? new Date(s.completed_at).getTime() : 0)) || null : null;
      const entries = receiptTimes.filter(e => routeStops.some(s => s.id === e.stop_id));
      const earningsRows = receiptStats?.perDay.flatMap(d => d.entries) ?? [];
      const earnings = completed.length === 0 ? 0 : completed.every(s => earningsRows.some(e => e.stopId === s.id)) ? completed.reduce((sum, s) => sum + (earningsRows.find(e => e.stopId === s.id)?.share ?? 0), 0) : null;
      return { start, end, ...runMetrics(start, end ?? Date.now(), entries, me?.id), earnings, loading: receiptStatsLoading || receiptTimesLoading, error: receiptStatsError || receiptTimesError };
    })(),
    stops: (stopsByRoute.get(route.id) || []).map((stop) => ({
      id: stop.id,
      customerName: stop.customer_name || "Aftale",
      address: stop.full_address || stop.address,
      phone: stop.customer_phone,
      notes: stop.notes,
      serviceSummary: stop.service_summary ? stripPrices(stop.service_summary) : null,
      plannedArrival: stop.planned_arrival,
      plannedDeparture: stop.planned_departure,
      durationMinutes: stop.duration_minutes,
      arrivedAt: readArrival(route.id, stop.id),
      completedAt: stop.status === "completed" ? stop.completed_at : null,
      earnings: stop.status === "completed" ? receiptStats?.perDay.flatMap(d => d.entries).find(e => e.stopId === stop.id)?.share : null,
    })),
  })), [routes, stopsByRoute, me?.name, me?.id, receiptTimes, receiptStats, receiptStatsLoading, receiptTimesLoading, receiptStatsError, receiptTimesError, previewRouteId]);
  const [workdayNow, setWorkdayNow] = useState(() => Date.now());
  const startDay = useStartWorkday();
  const endDay = useEndWorkday();
  // Tidlig udførelse — hent medarbejderens egen indstilling og virksomhedens
  // default. Resolver: src/lib/early-completion.ts.
  const employeeMode = ((me as any)?.early_completion_mode || "inherit") as EarlyCompletionMode;
  const { data: businessEarlyDefault = false } = useQuery({
    queryKey: ["business-early-default", me?.business_id],
    enabled: !!me?.business_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses")
        .select("allow_early_completion_default")
        .eq("id", me!.business_id!)
        .maybeSingle();
      return !!(data as any)?.allow_early_completion_default;
    },
  });

  const dayStarted = !!workday?.started_at && !workday?.ended_at;
  const dayEnded = !!workday?.ended_at;
  useEffect(() => {
    if (!dayStarted) return;
    setWorkdayNow(Date.now());
    const timer = window.setInterval(() => setWorkdayNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [dayStarted, workday?.started_at]);

  if (loading) {
    // Vis shell med skeleton fra første millisekund — ingen blank
    // spinner-skærm. Layoutet føles "fyldt" med det samme.
    return (
      <EmployeeShell activeTab="today" title="Min dag">
        <EmployeePage>
          <MinDagSkeleton />
        </EmployeePage>
      </EmployeeShell>
    );
  }
  if (!user) return <Navigate to="/log-ind" replace />;

  const totalStops = stops.length;
  const completedStops = stops.filter((s) => s.status === "completed").length;
  const dateObj = parseISO(date);
  const isCurrentDay = isToday(dateObj);
  const isFutureDay = date > todayStr();
  const actualWorkSeconds = Math.max(0, Number(workday?.accumulated_seconds || 0)) + (workday?.started_at
    ? Math.max(0, Math.floor(((workday.ended_at ? new Date(workday.ended_at).getTime() : workdayNow) - new Date(workday.started_at).getTime()) / 1000))
    : 0);

  // Date navigator — kompakt, klar visuel struktur:
  //  [‹]  [📅 dato (popover)]  [›]   [Gå til i dag?]
  // Date navigator — én sammenhængende boks så "Gå til i dag"-knappen
  // ALDRIG dækker forrige/næste-pilene. Når man IKKE er på dagens dato,
  // vises en lille knap helt til højre indeni boksen.
  const dateNav = (
    <div className="flex w-full items-center sm:w-auto">
      <div className="flex w-full items-center gap-1 rounded-[5px] border border-border bg-card p-1 shadow-sm sm:w-auto">
        <Button
          size="icon"
          variant="ghost"
          className="h-11 w-11 shrink-0 rounded-[4px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
          onClick={() => setDate(format(addDays(dateObj, -1), "yyyy-MM-dd"))}
          aria-label="Forrige dag"
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              size="sm"
              variant="ghost"
              className="h-11 flex-1 min-w-0 gap-1.5 rounded-[4px] px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] data-[state=open]:bg-secondary sm:flex-initial"
            >
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="inline-block tabular-nums truncate first-letter:uppercase">
                {isCurrentDay ? "I dag" : format(dateObj, "EEE d. MMM", { locale: da })}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto max-w-[calc(100vw-1rem)] max-h-[calc(100dvh-2rem)] overflow-auto p-0" align="center" collisionPadding={8}>
            <RouteAwareCalendar
              mode="single"
              selected={dateObj}
              routeDates={routeDates}
              onSelect={(selected) => {
                if (!selected) return;
                setDate(format(selected, "yyyy-MM-dd"));
                setCalendarOpen(false);
              }}
              locale={da}
              weekStartsOn={1}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Button
          size="icon"
          variant="ghost"
          className="h-11 w-11 shrink-0 rounded-[4px] text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
          onClick={() => setDate(format(addDays(dateObj, 1), "yyyy-MM-dd"))}
          aria-label="Næste dag"
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
        {!isCurrentDay && (
          <>
            <span className="mx-0.5 h-5 w-px bg-border" aria-hidden />
            <Button
              size="icon"
              variant="ghost"
              onClick={() => setDate(todayStr())}
              aria-label="Gå til i dag"
              title="Gå til i dag"
              className="h-11 w-11 shrink-0 rounded-[4px] bg-foreground text-background transition-colors hover:bg-foreground/90 hover:text-background focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
            >
              <CalendarCheck className="h-4 w-4" />
            </Button>
          </>
        )}
      </div>
    </div>
  );

  return (
    <EmployeeShell activeTab="today" title="Min dag">
      <SEO
        title="Min dag – Medarbejder | Serviceydere"
        description="Se dagens ruter, stop og aftaler som medarbejder på Serviceydere."
        noIndex
      />
      {/* PageTransition fader indholdet ind når brugeren skifter dag,
          så det føles som en blød navigation frem for et hårdt re-render. */}
      <EmployeePage transitionKey={date} className="employee-day sm:space-y-4">
        <PageHeader
          variant="plain"
          title={<span className="inline-block first-letter:uppercase">{format(dateObj, "EEEE d. MMMM", { locale: da })}</span>}
          description={(
            <span className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-semibold text-foreground">{completedStops}/{totalStops} stop</span>
              <span aria-hidden>·</span>
              <span>{routes.length === 1 ? "1 rute" : `${routes.length} ruter`}</span>
              <span aria-hidden>·</span>
              <span className={cn("inline-flex items-center gap-1 font-medium", dayStarted ? "text-success" : "text-muted-foreground")}>
                <span className={cn("h-1.5 w-1.5 rounded-full", dayStarted ? "bg-success" : "bg-muted-foreground/45")} />
                {dayEnded ? "Dagen er afsluttet" : dayStarted ? "Dagen er startet" : "Dagen er ikke startet"}
              </span>
              {!!workday?.started_at && (
                <span className="rounded-[4px] border border-border bg-secondary/50 px-2 py-1 font-semibold tabular-nums text-foreground" aria-label="Faktisk registreret arbejdstid">
                  {formatWorkDuration(actualWorkSeconds)}
                </span>
              )}
            </span>
          )}
          action={dateNav}
        />

        {/* ─────────── Smart "Næste skridt" forslag ───────────
            Foreslår medarbejderen den mest logiske handling lige nu —
            samme princip som virksomhedspanelets AI-forslag på rute-
            planneren. Kontekst-bevidst: starter dagen, fortsætter ruten,
            afslutter dagen, eller printer kvitteringer. */}
        {!routesLoading && !stopsLoading && isCurrentDay && (() => {
          // Find næste ikke-udførte stop på tværs af dagens ruter.
          let nextStop: RouteStop | null = null;
          let nextRoute: typeof routes[number] | null = null;
          for (const r of sortedRoutes) {
            const rs = (stopsByRoute.get(r.id) || []).sort((a, b) => a.sequence - b.sequence);
            const pending = rs.find((s) => s.status !== "completed");
            if (pending) { nextStop = pending; nextRoute = r; break; }
          }
          const allRoutesDone = totalStops > 0 && completedStops === totalStops;

          type Suggestion = {
            tone: "primary" | "calm" | "warm";
            title: string;
            description: string;
            illustration: BrandedIllustrationName;
            cta: { label: string; icon: any; onClick?: () => void; to?: string };
          };
          let suggestion: Suggestion | null = null;

          if (!dayStarted && !dayEnded) {
            suggestion = {
              tone: "primary",
              title: "Start din arbejdsdag",
              description: totalStops > 0
                ? `Du har ${totalStops} stop planlagt. Start tidsregistreringen før første besøg.`
                : "Start tidsregistreringen — så er din arbejdstid registreret korrekt.",
              illustration: "startDay",
              cta: { label: "Start dag", icon: PlayCircle, onClick: () => startDay.mutate(date) },
            };
          } else if (dayStarted && !dayEnded && nextStop && nextRoute) {
            suggestion = {
              tone: "primary",
              title: nextRoute.name || "Din næste rute",
              description: `Næste stop: ${nextStop.customer_name || "Stop"} · ${nextStop.full_address || nextStop.address || ""}`,
              illustration: "dayInProgress",
              cta: (stopsByRoute.get(nextRoute.id) || []).some((s) => s.status === "completed")
                ? { label: "Fortsæt rute", icon: Navigation, to: `/medarbejder/rute/${nextRoute.id}` }
                : { label: "Start rute", icon: Navigation, to: `/medarbejder/rute/${nextRoute.id}` },
            };
          } else if (dayStarted && allRoutesDone && !dayEnded) {
            suggestion = {
              tone: "calm",
              title: "Alle stop er udført — godt arbejde!",
              description: "Husk at afslutte din arbejdsdag, så tiden bliver registreret korrekt.",
              illustration: "dayInProgress",
              cta: { label: "Stop dag", icon: StopCircle, onClick: () => endDay.mutate(date) },
            };
          } else if (dayStarted && !dayEnded && routes.length === 0) {
            // Ingen ruter, men dagen kører — tilbyd at stoppe dagen.
            suggestion = {
              tone: "calm",
              title: "Din arbejdsdag er i gang",
              description: "Stop dagen, når du er færdig — så registreres din arbejdsdag korrekt.",
              illustration: "dayInProgress",
              cta: { label: "Stop dag", icon: StopCircle, onClick: () => endDay.mutate(date) },
            };
          } else if (dayEnded) {
            const pendingAfterEnd = totalStops > 0 && completedStops < totalStops;
            if (pendingAfterEnd) {
              suggestion = {
                tone: "primary",
                title: "Nye stop er kommet til ruten",
                description: `Der er ${totalStops - completedStops} stop tilbage. Genoptag arbejdsdagen for at fortsætte tidsregistreringen.`,
                illustration: "restartDay",
                cta: { label: "Genstart dagen", icon: PlayCircle, onClick: () => startDay.mutate(date) },
              };
            } else {
              suggestion = {
                tone: "calm",
                title: "Dagen er afsluttet",
                description: "Genstart dagen, hvis du skal arbejde videre. Udførte aftaler og registreret tid bevares.",
                illustration: "restartDay",
                cta: { label: "Genstart dagen", icon: PlayCircle, onClick: () => startDay.mutate(date) },
              };
            }
          }

          if (!suggestion) return null;

          // Konsekvent med resten af medarbejderpanelet: ren bg-card +
          // border-border/80, status formidles via det dag-tilhørende ikon.
          const toneClasses = "service-panel-card border-border bg-card";

          const Cta = suggestion.cta;
          return (
            <Card className={cn("overflow-hidden rounded-[5px] border-l-[3px] border-l-accent shadow-sm", toneClasses)}>
              <div className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-4">
                <div className="flex items-start gap-2.5 min-w-0">
                  <BrandedIllustration
                    name={suggestion.illustration}
                    className="h-14 w-14 shrink-0 sm:h-16 sm:w-16"
                  />
                  <div className="min-w-0">
                    <p className="text-[10px] sm:text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Næste skridt
                    </p>
                    <p className="mt-0.5 text-sm sm:text-base font-semibold text-foreground tracking-tight">
                      {suggestion.title}
                    </p>
                    <p className="mt-0.5 sm:mt-1 text-xs sm:text-sm text-muted-foreground tabular-nums">
                      {suggestion.description}
                    </p>
                  </div>
                </div>
                <Button
                  asChild={!!Cta.to}
                  onClick={Cta.onClick}
                  disabled={startDay.isPending || endDay.isPending}
                  size="lg"
                  className={cn("h-11 w-full shrink-0 gap-2 rounded-[4px] px-4 sm:px-5 text-sm font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] sm:w-auto", Cta.label === "Stop dag" ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-foreground text-background hover:bg-foreground/90 hover:text-background")}
                >
                  {Cta.to ? (
                    <Link to={Cta.to}>
                      <Cta.icon className="h-4 w-4" /> {Cta.label}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <>
                      <Cta.icon className="h-4 w-4" /> {Cta.label}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </Card>
          );
        })()}

        {(routesLoading || stopsLoading) && (
          <MinDagSkeleton />
        )}

        {!routesLoading && !stopsLoading && routes.length === 0 && (
          <Card className="rounded-[5px] border-dashed border-border p-6 sm:p-10 text-center shadow-sm">
            <NoItemsIcon className="mb-3 sm:mb-4 h-14 w-14 sm:h-16 sm:w-16" />
            <p className="text-sm sm:text-base font-semibold mb-1">Ingen ruter denne dag</p>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Du har ingen tildelte stop. Skift dato for at se andre dage.
            </p>
          </Card>
        )}

        <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">
        {sortedRoutes.map((r, routeIndex) => {
          const myStops = (stopsByRoute.get(r.id) || []).sort((a, b) => a.sequence - b.sequence);
          const done = myStops.filter((s) => s.status === "completed").length;
          const total = myStops.length;
          const allDone = total > 0 && done === total;
          // Lås ruten hvis (a) en tidligere rute samme dag ikke er færdig
          // ELLER (b) brugeren endnu ikke har trykket "Start dag".
          // En afsluttet dag skal genstartes før ruten fortsættes.
          const needsStartDay = isCurrentDay && !dayStarted;
          // Datolås: ruter kan kun udføres på selve dagen — medmindre
          // virksomhed/medarbejder/rute har låst tidlig udførelse op.
          const earlyAllowed = canCompleteEarly({
            routeAllow: (r as any).allow_early_completion,
            employeeMode,
            businessDefault: businessEarlyDefault,
          });
          const dateLocked = isFutureDay && !earlyAllowed;
          const isLocked = total > 0 && (
            dateLocked
            || (!allDone && firstActiveId !== null && r.id !== firstActiveId)
            || needsStartDay
          );
          const lockReason = dateLocked
            ? earlyCompletionReason({
                routeAllow: (r as any).allow_early_completion,
                employeeMode,
                businessDefault: businessEarlyDefault,
              })
            : needsStartDay
              ? dayEnded ? "Tryk \"Genstart dagen\" øverst, før du starter ruten" : "Tryk \"Start dag\" øverst, før du starter ruten"
              : "Tilgængelig efter forrige rute er gennemført";
          const progress = total > 0 ? Math.round((done / total) * 100) : 0;
          const color = r.color || "hsl(var(--accent))";
          const startCoord: [number, number] | null =
            r.start_latitude != null && r.start_longitude != null
              ? [Number(r.start_latitude), Number(r.start_longitude)]
              : null;
          const firstPendingId = myStops.find((s) => s.status !== "completed")?.id ?? null;
          // En rute er "team" hvis et eller flere stop ikke er specifikt
          // tildelt nogen (assignee) — så er hele ruten en fælles opgave.
          const isTeamRoute = myStops.some((s) => !s.assigned_employee_id);

          // ───── Færdig rute = kompakt, ikke-klikbar opsummering ─────
          // Brugeren skal ikke kunne "åbne" en færdig rute igen — vi viser
          // kun et roligt resumé så listen forbliver overskuelig.
          // Udførte ruter vises ikke under Ruter — de findes under Aftaler.
          if (allDone) return null;
          if (allDone) {
            const lastDoneAt = myStops
              .map((s) => s.completed_at)
              .filter(Boolean)
              .sort()
              .at(-1);
            return (
              <Card
                key={r.id}
                className="service-panel-card overflow-hidden rounded-[5px] border-border opacity-95 shadow-sm"
                aria-label={`Rute ${r.name || ""} er færdig`}
              >
                <div className="flex items-center gap-2.5 sm:gap-3 border-b border-border bg-card px-3 py-2.5 sm:px-5 sm:py-3">
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden>
                    <BrandedIllustration name="routeDone" className="h-full w-full" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-muted-foreground">Rute {routeIndex + 1} af {sortedRoutes.length}{r.planned_start_time ? ` · kl. ${r.planned_start_time.slice(0, 5)}` : ""}</p>
                   <h3 className="break-words text-sm font-semibold text-foreground">
                      {r.name || `Rute ${format(parseISO(r.route_date), "d. MMM", { locale: da })}`}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Alle {total} stop er udført
                      
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-feature-cool/40 bg-feature-cool/10 px-2.5 py-1 text-[11px] font-semibold text-feature-cool-foreground shrink-0">
                    <CheckCircle2 className="h-3 w-3" /> Udført
                  </span>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={() => setPreviewRouteId(r.id)}
                    className="h-11 w-11 shrink-0 rounded-[4px] text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label="Vis og udskriv ruten"
                    title="Vis og udskriv"
                  >
                    <Printer className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-3 p-3 sm:p-5 text-xs">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Stop</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{total}</p>
                  </div>
                  
                  {r.total_distance_km != null && r.total_distance_km > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Distance</p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{r.total_distance_km.toFixed(1)} km</p>
                    </div>
                  )}
                </div>
              </Card>
            );
          }

          return (
            <Card
              key={r.id}
              className="group service-panel-card overflow-hidden rounded-[5px] border-border shadow-sm transition-colors hover:border-accent/35"
            >
              {/* Header — samme prik+titel+badge mønster som virksomhedspanelets
                  rutekort, men med ét enkelt status-badge til højre. */}
              <div className="flex items-center gap-2.5 sm:gap-3 border-b border-border bg-card px-3 py-2.5 sm:px-5 sm:py-3">
                <span className="flex h-14 w-14 shrink-0 items-center justify-center" aria-hidden>
                   <BrandedIllustration name="routeReady" className="h-full w-full" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-muted-foreground">Rute {routeIndex + 1} af {sortedRoutes.length}{r.planned_start_time ? ` · kl. ${r.planned_start_time.slice(0, 5)}` : ""}</p>
                   <h3 className="break-words text-sm font-semibold text-foreground">
                    {r.name || `Rute ${format(parseISO(r.route_date), "d. MMM", { locale: da })}`}
                  </h3>
                   <p className="mt-0.5 inline-flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                    {isTeamRoute ? (
                      <><Users className="h-3 w-3" /> Team-rute</>
                    ) : (
                      <><UserIcon className="h-3 w-3" /> Tildelt mig</>
                    )}
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">{total > 0 ? `${done} af ${total} stop udført` : "Ingen stop"}</span>
                  </p>
                </div>
                {isFutureDay && (
                  earlyAllowed ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-feature-cool/40 bg-feature-cool/10 px-2 py-0.5 text-[10px] font-semibold text-feature-cool-foreground shrink-0">
                      <UnlockIcon className="h-2.5 w-2.5" /> Låst op
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-2 py-0.5 text-[10px] font-semibold text-muted-foreground shrink-0">
                      <LockIcon className="h-2.5 w-2.5" /> Låst
                    </span>
                  )
                )}
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  onClick={() => setPreviewRouteId(r.id)}
                  className="h-11 w-11 shrink-0 rounded-[4px] text-muted-foreground hover:bg-secondary hover:text-foreground"
                  aria-label="Vis og udskriv ruten"
                  title="Vis og udskriv"
                >
                  <Printer className="h-3.5 w-3.5" />
                </Button>
              </div>

              {/* Kort-preview */}
              <div className="hidden sm:block"><RouteMiniMap stops={myStops} startCoord={startCoord} color={color} /></div>

              {/* Body */}
              <div className="space-y-3 sm:space-y-4 p-3 sm:p-5">
                <RouteWeatherStatus routeId={r.id} date={r.route_date} stops={myStops} />
                {/* Meta-grid — strukturerede tal-felter ligesom statskort i
                    virksomhedspanelet. Tre faste kolonner = forudsigelig
                    visuel rytme på alle skærmstørrelser. */}
                <div className="grid grid-cols-2 gap-2 rounded-[4px] border border-border bg-secondary/30 p-2.5">
                  <div className="px-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Stop</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{done}/{total}</p>
                  </div>
                  <div className="border-l border-border px-2.5">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Distance</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                      {r.total_distance_km != null && r.total_distance_km > 0
                        ? `${r.total_distance_km.toFixed(1)} km`
                        : "—"}
                    </p>
                  </div>
                </div>

                {r.start_address && (
                  <div className="flex items-start gap-2 rounded-[4px] border border-border bg-card px-3 py-2 text-xs">
                    <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Startadresse</p>
                      <p className="truncate text-foreground">{r.start_address}</p>
                    </div>
                  </div>
                )}

                {/* Fremskridt */}
                {total > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold uppercase tracking-wide text-muted-foreground">Fremskridt</span>
                      <span className="font-bold tabular-nums text-foreground">{done}/{total} · {progress}%</span>
                    </div>
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full transition-all duration-500"
                        style={{ width: `${progress}%`, background: color }}
                      />
                    </div>
                  </div>
                )}

                {/* Stop-preview liste — divide-y row-stil ligesom kunder/aftaler */}
                {total > 0 && (
                  <div className="overflow-hidden rounded-[4px] border border-border bg-card">
                    <div className="divide-y divide-border">
                      {myStops.map((s, i) => {
                        // Udførte aftaler og betalingsstatus hører til under Aftaler.
                        if (s.status === "completed") return null;
                        const isNext = s.id === firstPendingId;
                        const pay = !isCurrentDay && !isFutureDay
                          ? { label: "Ikke udført", className: "border-border bg-secondary/50 text-muted-foreground" }
                          : isNext
                            ? { label: "Næste", className: "border-foreground/30 bg-secondary text-foreground" }
                            : { label: "Klar", className: "border-border bg-secondary/50 text-muted-foreground" };
                        return (
                          <Button
                            key={s.id}
                            type="button"
                            onClick={() => setDetailsStopId(s.id)}
                            variant="ghost"
                            className={`flex h-auto min-h-14 items-center justify-start gap-3 rounded-none whitespace-normal px-3 py-2.5 ${
                              isNext ? "bg-secondary/60" : ""
                            } w-full text-left transition-colors hover:bg-secondary/80`}
                            aria-label={`Vis detaljer for ${s.customer_name || "stop"}`}
                          >
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                s.status === "completed"
                                  ? "bg-feature-cool text-feature-cool-foreground"
                                  : isNext
                                    ? "bg-foreground text-background ring-2 ring-foreground/15"
                                    : "bg-secondary text-foreground"
                              }`}
                            >
                              {s.status === "completed" ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p
                                className={`break-words [overflow-wrap:anywhere] text-sm font-semibold ${
                                  s.status === "completed"
                                    ? "text-muted-foreground line-through"
                                    : "text-foreground"
                                }`}
                              >
                                {s.customer_name || "Stop"}
                                {isNext && s.status !== "completed" && (
                                  <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-foreground">
                                    Næste
                                  </span>
                                )}
                              </p>
                              <div className="mt-1 flex min-w-0 flex-wrap items-center gap-1.5">
                                {(s.full_address || s.address) && (
                                  <p className="min-w-0 flex-1 break-words [overflow-wrap:anywhere] text-xs text-muted-foreground">
                                    {s.full_address || s.address}
                                  </p>
                                )}
                                <Badge variant="outline" className={cn("h-5 shrink-0 px-1.5 text-[10px] font-medium", pay.className)}>
                                  {pay.label}
                                </Badge>
                              </div>
                            </div>
                            <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </Button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Den vigtigste handling står alene. Print ligger diskret i kortets header. */}
                <div className="pt-0.5 sm:pt-1">
                  <Button
                    asChild={total > 0 && !isLocked}
                    size="lg"
                    className={cn("h-11 w-full gap-2 rounded-[4px] text-sm sm:text-base font-semibold shadow-sm focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]", isLocked ? "border border-border bg-secondary text-muted-foreground disabled:opacity-100" : "bg-foreground text-background hover:bg-foreground/90 hover:text-background")}
                    disabled={total === 0 || isLocked}
                    title={isLocked ? lockReason : undefined}
                  >
                    {isLocked ? (
                      <><UiArtwork name="dayLocked" className="h-5 w-6 sm:h-6 sm:w-7" />
                        {dateLocked
                          ? `Låst indtil ${format(dateObj, "d. MMM", { locale: da })}`
                          : needsStartDay
                            ? dayEnded ? "Låst — genstart dagen først" : "Låst — start dagen først"
                            : "Låst — afslut forrige"}
                      </>
                    ) : total > 0 ? (
                      <Link to={`/medarbejder/rute/${r.id}`}>
                        {done > 0 ? (
                          <><Navigation className="h-4 w-4 sm:h-5 sm:w-5" /> Fortsæt rute · stop {Math.min(done + 1, total)} af {total}</>
                        ) : (
                          <><Navigation className="h-4 w-4 sm:h-5 sm:w-5" /> Start rute</>
                        )}
                      </Link>
                    ) : (
                      <><Navigation className="h-4 w-4 sm:h-5 sm:w-5" /> Ingen stop</>
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        </div>
      </EmployeePage>

      {/* Detaljer-sheet — højre-side på desktop (matcher virksomhedspanelet)
          og fuld bottom-sheet på mobil. Viser fulde oplysninger for aftalen. */}
      <StopDetailsSheetShell open={!!detailsStop} onOpenChange={(o) => !o && setDetailsStopId(null)}>
          {detailsStop && (
            <StopDetailsContent
              stop={detailsStop}
              index={stops.filter(s => s.route_id === detailsStop.route_id).sort((a, b) => a.sequence - b.sequence).findIndex(s => s.id === detailsStop.id)}
              themeColor={detailsRoute?.color || "hsl(var(--foreground))"}
              route={{
                name: detailsRoute?.name || null,
                color: detailsRoute?.color,
                date: detailsRoute?.route_date,
                allowEarly: canCompleteEarly({
                  routeAllow: (detailsRoute as any)?.allow_early_completion,
                  employeeMode,
                  businessDefault: businessEarlyDefault,
                }),
              }}
              readOnly
            />
          )}
      </StopDetailsSheetShell>

      <RoutePrintDialog
        open={!!previewRouteId}
        onOpenChange={(o) => !o && setPreviewRouteId(null)}
        initialDate={date}
        routes={printableRoutes.filter((route) => !previewRouteId || route.id === previewRouteId)}
        businessName={me?.business?.name}
        title="Print arbejdskvittering"
      />
    </EmployeeShell>
  );
};

export default EmployeeApp;
