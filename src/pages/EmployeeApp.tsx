import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyDayRoutes, useMyDayStops, type RouteStop } from "@/hooks/useRoutes";
import { useMyWorkday, useStartWorkday, useEndWorkday } from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { StopDetailsContent } from "@/components/employee/StopDetailsContent";
import { RoutePrintPreviewSheet } from "@/components/employee/RoutePrintPreviewSheet";
import {
  Calendar as CalendarIcon, Play, Printer, MapPin, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, Route as RouteIcon, Navigation, PlayCircle, StopCircle,
  Users, User as UserIcon, Info, CalendarCheck, Sparkles, ArrowRight, Eye,
} from "lucide-react";
import { format, addDays, parseISO, isToday, formatDistanceStrict } from "date-fns";
import { da } from "date-fns/locale";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { LoadingScreen } from "@/components/admin/shared/LoadingScreen";
import { PageTransition } from "@/components/admin/shared/PageTransition";
import { PageHeader, StatCard } from "@/components/admin/shared/AdminUI";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

const formatKr = (n?: number | null) => `${Math.round(n || 0).toLocaleString("da-DK")} kr`;

const paymentMeta = (status?: string | null) => {
  // Diskrete outline-badges — matcher virksomhedspanelets sprog så
  // status-chips ikke "skriger" i en ellers rolig liste.
  if (status === "completed") return { label: "Betalt", className: "border-feature-cool/40 bg-feature-cool/10 text-feature-cool-foreground" };
  if (status === "confirmed" || status === "in_progress") return { label: "Afregnes", className: "border-feature-lilac/40 bg-feature-lilac/10 text-feature-lilac-foreground" };
  if (status === "pending") return { label: "Afventer", className: "border-feature-warm/40 bg-feature-warm/10 text-feature-warm-foreground" };
  return { label: "Status ukendt", className: "border-border bg-secondary/50 text-muted-foreground" };
};

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
    return (
      <div className="h-40 bg-secondary/40 flex items-center justify-center text-xs text-muted-foreground">
        <MapPin className="h-4 w-4 mr-1" /> Ingen kortdata
      </div>
    );
  }

  const bounds = L.latLngBounds(points.map((p) => L.latLng(p[0], p[1])));

  return (
    <div className="relative z-0 h-40 w-full isolate overflow-hidden bg-secondary/40 sm:h-44">
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
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [detailsStop, setDetailsStop] = useState<{ stop: RouteStop; index: number; routeName: string | null; routeColor: string | null; routeDate: string | null } | null>(null);
  // Print-forhåndsvisning (rute-id der vises i preview-sheet'en)
  const [previewRouteId, setPreviewRouteId] = useState<string | null>(null);
  const { data: routes = [], isLoading: routesLoading } = useMyDayRoutes(date);
  const { data: stops = [], isLoading: stopsLoading } = useMyDayStops(date);
  const { data: workday } = useMyWorkday(date);
  const startDay = useStartWorkday();
  const endDay = useEndWorkday();

  if (loading) {
    return <LoadingScreen full label="Indlæser dine ruter…" />;
  }
  if (!user) return <Navigate to="/log-ind" replace />;

  const stopsByRoute = new Map<string, RouteStop[]>();
  for (const s of stops) {
    const arr = stopsByRoute.get(s.route_id) || [];
    arr.push(s);
    stopsByRoute.set(s.route_id, arr);
  }

  const totalStops = stops.length;
  const completedStops = stops.filter((s) => s.status === "completed").length;
  const dateObj = parseISO(date);
  const isCurrentDay = isToday(dateObj);
  const dayStarted = !!workday?.started_at && !workday?.ended_at;
  const dayEnded = !!workday?.ended_at;
  const elapsedLabel = workday?.started_at && !workday?.ended_at
    ? formatDistanceStrict(new Date(workday.started_at), new Date(), { locale: da, unit: "minute" })
    : null;

  // Date navigator — kompakt, klar visuel struktur:
  //  [‹]  [📅 dato (popover)]  [›]   [Gå til i dag?]
  // Date navigator — én sammenhængende boks så "Gå til i dag"-knappen
  // ALDRIG dækker forrige/næste-pilene. Når man IKKE er på dagens dato,
  // vises en lille knap helt til højre indeni boksen.
  const dateNav = (
    <div className="flex w-full items-center sm:w-auto">
      <div className="flex w-full items-center gap-1 rounded-xl border border-border bg-card p-1 shadow-sm sm:w-auto">
        <Button
          size="icon"
          variant="ghost"
          className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
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
              className="h-9 flex-1 min-w-0 gap-1.5 rounded-lg px-3 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97] data-[state=open]:bg-secondary sm:flex-initial"
            >
              <CalendarIcon className="h-3.5 w-3.5 shrink-0" />
              <span className="capitalize tabular-nums truncate">
                {isCurrentDay ? "I dag" : format(dateObj, "EEE d. MMM", { locale: da })}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="center">
            <Calendar
              mode="single"
              selected={dateObj}
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
          className="h-9 w-9 shrink-0 rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
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
              className="h-9 w-9 shrink-0 rounded-lg bg-foreground text-background transition-colors hover:bg-foreground/90 hover:text-background focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.97]"
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
      {/* PageTransition fader indholdet ind når brugeren skifter dag,
          så det føles som en blød navigation frem for et hårdt re-render. */}
      <PageTransition transitionKey={date} className="w-full space-y-4 pb-24 sm:pb-20">
        <PageHeader
          title={<span className="capitalize">{format(dateObj, "EEEE d. MMMM", { locale: da })}</span>}
          description={
            totalStops > 0
              ? `${completedStops} af ${totalStops} stop færdige`
              : "Ingen stop planlagt"
          }
          action={dateNav}
        />

        {/* Top-overblik: stat-kort + arbejdsdag-handling — samme stil som virksomhedspanelet */}
        <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
          <StatCard
            label="Stop i dag"
            value={`${completedStops}/${totalStops}`}
            icon={<CheckCircle2 />}
            tone="emerald"
            hint={totalStops > 0 ? `${Math.round((completedStops / Math.max(totalStops, 1)) * 100)}% gennemført` : "Ingen stop"}
          />
          <StatCard
            label="Ruter"
            value={routes.length}
            icon={<RouteIcon />}
            tone="violet"
            hint={routes.length > 0 ? `${routes.length === 1 ? "1 rute planlagt" : `${routes.length} ruter planlagt`}` : "Ingen ruter"}
          />
          <StatCard
            label="Næste start"
            value={routes[0]?.planned_start_time?.slice(0, 5) || "—"}
            icon={<Clock />}
            tone="blue"
            hint={routes[0]?.name || (routes[0] ? "Første rute" : "Ingen ruter")}
          />
          <StatCard
            label="Arbejdsdag"
            value={dayEnded ? "Afsluttet" : dayStarted ? "I gang" : "Ikke startet"}
            icon={<PlayCircle />}
            tone={dayStarted && !dayEnded ? "emerald" : dayEnded ? "neutral" : "amber"}
            hint={
              workday?.started_at && dayEnded
                ? `${format(new Date(workday.started_at), "HH:mm")}–${format(new Date(workday!.ended_at!), "HH:mm")} · ${workday.duration_minutes ?? 0} min`
                : workday?.started_at && !dayEnded
                  ? `Start ${format(new Date(workday.started_at), "HH:mm")}${elapsedLabel ? ` · ${elapsedLabel}` : ""}`
                  : isCurrentDay ? "Tryk Start dag når du er klar" : null
            }
          />
        </div>

        {/* Arbejdsdag — smartere panel med levende status:
            - Ikke startet: tydelig CTA + kontekst om hvor mange stop dagen indeholder
            - I gang: stor tabular-nums tid siden start + næste stop hint
            - Afsluttet: rolig opsummering med tidsrum + total varighed */}
        {isCurrentDay && (
          <Card
            className={cn(
              "overflow-hidden rounded-xl border shadow-sm",
              dayStarted && !dayEnded
                ? "border-feature-cool/30 bg-feature-cool/5"
                : dayEnded
                  ? "border-border/80 bg-secondary/20"
                  : "border-border/80 bg-card",
            )}
          >
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-5 sm:p-5">
              <div className="flex items-start gap-3 min-w-0">
                <div
                  className={cn(
                    "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
                    dayStarted && !dayEnded
                      ? "bg-feature-cool text-feature-cool-foreground"
                      : dayEnded
                        ? "bg-secondary text-muted-foreground"
                        : "bg-foreground text-background",
                  )}
                  aria-hidden
                >
                  {dayEnded ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : dayStarted ? (
                    <Clock className="h-5 w-5" />
                  ) : (
                    <PlayCircle className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Arbejdsdag
                  </p>
                  {dayEnded ? (
                    <>
                      <p className="mt-0.5 text-base font-semibold text-foreground">Dagen er afsluttet</p>
                      <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                        {workday?.started_at && workday?.ended_at
                          ? `${format(new Date(workday.started_at), "HH:mm")} – ${format(new Date(workday.ended_at), "HH:mm")} · ${workday.duration_minutes ?? 0} min`
                          : "Tid registreret"}
                      </p>
                    </>
                  ) : dayStarted ? (
                    <>
                      <p className="mt-0.5 text-base font-semibold text-foreground">Du er i gang</p>
                      <p className="mt-1 text-sm text-muted-foreground tabular-nums">
                        Start kl. {workday?.started_at ? format(new Date(workday.started_at), "HH:mm") : "—"}
                        {elapsedLabel ? ` · ${elapsedLabel}` : ""}
                        {totalStops > 0 ? ` · ${completedStops}/${totalStops} stop` : ""}
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-0.5 text-base font-semibold text-foreground">Klar til at starte?</p>
                      <p className="mt-1 text-sm text-muted-foreground">
                        {totalStops > 0
                          ? `Du har ${totalStops} ${totalStops === 1 ? "stop" : "stop"} planlagt i dag.`
                          : "Ingen stop planlagt — du kan stadig registrere din arbejdstid."}
                      </p>
                    </>
                  )}
                </div>
              </div>
              {!dayEnded && (
                !dayStarted ? (
                  <Button
                    onClick={() => startDay.mutate(date)}
                    disabled={startDay.isPending}
                    size="lg"
                    className="h-11 w-full shrink-0 gap-2 rounded-lg bg-foreground px-5 text-sm font-semibold text-background shadow-sm transition-colors hover:bg-foreground/90 hover:text-background focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] sm:w-auto"
                  >
                    <PlayCircle className="h-4 w-4" /> Start dag
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => endDay.mutate(date)}
                    disabled={endDay.isPending}
                    size="lg"
                    className="h-11 w-full shrink-0 gap-2 rounded-lg border-border bg-card px-5 text-sm font-semibold text-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] sm:w-auto"
                  >
                    <StopCircle className="h-4 w-4" /> Stop dag
                  </Button>
                )
              )}
            </div>
          </Card>
        )}

        {(routesLoading || stopsLoading) && (
          <div className="grid gap-4 lg:grid-cols-2">
            {[0, 1].map((i) => (
              <Card key={i} className="overflow-hidden rounded-xl border-border/80 shadow-sm">
                <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
                  <Skeleton className="h-7 w-7 rounded-lg" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
                <Skeleton className="h-40 w-full rounded-none" />
                <div className="space-y-3 p-4 sm:p-5">
                  <div className="flex gap-3">
                    <Skeleton className="h-3 w-20" />
                    <Skeleton className="h-3 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-2 w-full rounded-full" />
                  <div className="space-y-2">
                    <Skeleton className="h-10 w-full rounded-lg" />
                    <Skeleton className="h-10 w-full rounded-lg" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-11 flex-1 rounded-lg" />
                    <Skeleton className="h-11 w-11 rounded-lg" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}

        {!routesLoading && !stopsLoading && routes.length === 0 && (
          <Card className="rounded-xl border-dashed border-border p-10 text-center shadow-sm">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary">
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold mb-1">Ingen ruter denne dag</p>
            <p className="text-sm text-muted-foreground">
              Du har ingen tildelte stop. Skift dato for at se andre dage.
            </p>
          </Card>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
        {routes.map((r) => {
          const myStops = (stopsByRoute.get(r.id) || []).sort((a, b) => a.sequence - b.sequence);
          const done = myStops.filter((s) => s.status === "completed").length;
          const total = myStops.length;
          const allDone = total > 0 && done === total;
          const progress = total > 0 ? Math.round((done / total) * 100) : 0;
          const color = r.color || "hsl(var(--accent))";
          const startCoord: [number, number] | null =
            r.start_latitude != null && r.start_longitude != null
              ? [Number(r.start_latitude), Number(r.start_longitude)]
              : null;
          const startTime = r.planned_start_time?.slice(0, 5) || "08:00";
          const firstPendingId = myStops.find((s) => s.status !== "completed")?.id ?? null;
          // En rute er "team" hvis et eller flere stop ikke er specifikt
          // tildelt nogen (assignee) — så er hele ruten en fælles opgave.
          const isTeamRoute = myStops.some((s) => !s.assigned_employee_id);

          // ───── Færdig rute = kompakt, ikke-klikbar opsummering ─────
          // Brugeren skal ikke kunne "åbne" en færdig rute igen — vi viser
          // kun et roligt resumé så listen forbliver overskuelig.
          if (allDone) {
            const lastDoneAt = myStops
              .map((s) => s.completed_at)
              .filter(Boolean)
              .sort()
              .at(-1);
            return (
              <Card
                key={r.id}
                className="surface-admin overflow-hidden rounded-xl border-border/80 opacity-95 shadow-sm"
                aria-label={`Rute ${r.name || ""} er færdig`}
              >
                <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
                  <span
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-border"
                    style={{ background: color }}
                    aria-hidden
                  >
                    <CheckCircle2 className="h-3.5 w-3.5 text-background" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {r.name || `Rute ${format(parseISO(r.route_date), "d. MMM", { locale: da })}`}
                    </h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Alle {total} stop er færdige
                      {lastDoneAt ? ` · sidst kl. ${format(new Date(lastDoneAt), "HH:mm")}` : ""}
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full border border-feature-cool/40 bg-feature-cool/10 px-2.5 py-1 text-[11px] font-semibold text-feature-cool-foreground shrink-0">
                    <CheckCircle2 className="h-3 w-3" /> Færdig
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-3 p-4 sm:p-5 text-xs">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Stop</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{total}</p>
                  </div>
                  {r.total_duration_minutes != null && r.total_duration_minutes > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Varighed</p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                        ~{Math.round(r.total_duration_minutes / 60)}t {r.total_duration_minutes % 60}min
                      </p>
                    </div>
                  )}
                  {r.total_distance_km != null && r.total_distance_km > 0 && (
                    <div>
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Distance</p>
                      <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{r.total_distance_km.toFixed(1)} km</p>
                    </div>
                  )}
                </div>
                {/* Print som eneste sekundære handling — ingen "genåbn".
                    Pænere outline-stil med tydelig ikon-boks så knappen
                    ikke ligner et "klik for at åbne rute"-hint. */}
                <div className="border-t border-border bg-secondary/30 px-4 py-3 sm:px-5">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setPreviewRouteId(r.id)}
                    className="h-9 w-full gap-2 rounded-lg border-border bg-card text-xs font-semibold text-foreground shadow-sm transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98] sm:w-auto"
                  >
                    <Eye className="h-3.5 w-3.5" /> Vis & udskriv kvittering
                  </Button>
                </div>
              </Card>
            );
          }

          return (
            <Card
              key={r.id}
              className="group surface-admin overflow-hidden rounded-xl border-border/80 shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md"
            >
              {/* Header — samme prik+titel+badge mønster som virksomhedspanelets
                  rutekort, men med ét enkelt status-badge til højre. */}
              <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border shadow-sm"
                  style={{ background: color }}
                  aria-hidden
                >
                  <RouteIcon className="h-4 w-4 text-background" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-semibold text-foreground">
                    {r.name || `Rute ${format(parseISO(r.route_date), "d. MMM", { locale: da })}`}
                  </h3>
                  <p className="mt-0.5 inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
                    {isTeamRoute ? (
                      <><Users className="h-3 w-3" /> Team-rute</>
                    ) : (
                      <><UserIcon className="h-3 w-3" /> Tildelt mig</>
                    )}
                    <span aria-hidden>·</span>
                    <span className="tabular-nums">{total > 0 ? `${done} af ${total} stop færdige` : "Ingen stop"}</span>
                  </p>
                </div>
              </div>

              {/* Kort-preview */}
              <RouteMiniMap stops={myStops} startCoord={startCoord} color={color} />

              {/* Body */}
              <div className="space-y-4 p-4 sm:p-5">
                {/* Meta-grid — strukturerede tal-felter ligesom statskort i
                    virksomhedspanelet. Tre faste kolonner = forudsigelig
                    visuel rytme på alle skærmstørrelser. */}
                <div className="grid grid-cols-3 gap-2 rounded-lg border border-border bg-secondary/30 p-2.5">
                  <div className="px-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Start</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">{startTime}</p>
                  </div>
                  <div className="border-l border-border px-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Varighed</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                      {r.total_duration_minutes != null && r.total_duration_minutes > 0
                        ? `${Math.round(r.total_duration_minutes / 60)}t ${r.total_duration_minutes % 60}min`
                        : "—"}
                    </p>
                  </div>
                  <div className="border-l border-border px-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Distance</p>
                    <p className="mt-0.5 text-sm font-bold tabular-nums text-foreground">
                      {r.total_distance_km != null && r.total_distance_km > 0
                        ? `${r.total_distance_km.toFixed(1)} km`
                        : "—"}
                    </p>
                  </div>
                </div>

                {r.start_address && (
                  <div className="flex items-start gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs">
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
                  <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <div className="divide-y divide-border">
                      {myStops.slice(0, 4).map((s, i) => {
                        const isNext = s.id === firstPendingId;
                        const arrivalLabel = s.planned_arrival
                          ? format(new Date(s.planned_arrival), "HH:mm")
                          : null;
                        const pay = paymentMeta(s.order_status);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setDetailsStop({ stop: s, index: i, routeName: r.name, routeColor: r.color, routeDate: r.route_date })}
                            className={`flex items-center gap-3 px-3 py-2.5 ${
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
                                className={`truncate text-xs font-semibold ${
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
                                  <p className="min-w-0 flex-1 truncate text-[11px] text-muted-foreground">
                                    {s.full_address || s.address}
                                  </p>
                                )}
                                <Badge variant="outline" className={cn("h-5 shrink-0 px-1.5 text-[10px] font-medium", pay.className)}>
                                  {pay.label}
                                </Badge>
                              </div>
                            </div>
                            {arrivalLabel && (
                              <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
                                {arrivalLabel}
                              </span>
                            )}
                            <Info className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          </button>
                        );
                      })}
                      {myStops.length > 4 && (
                        <div className="px-3 py-2 text-[11px] text-muted-foreground">
                          +{myStops.length - 4} flere stop
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Handlinger — primær CTA + print som sekundær.
                    Færdige ruter render allerede som kompakt summary længere
                    oppe og kommer aldrig hertil. */}
                <div className="flex gap-2 pt-1">
                  <Button
                    asChild={total > 0}
                    size="lg"
                    className="h-11 flex-1 gap-2 rounded-lg bg-foreground font-semibold text-background shadow-sm transition-colors hover:bg-foreground/90 hover:text-background focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                    disabled={total === 0}
                  >
                    {total > 0 ? (
                      <Link to={`/medarbejder/rute/${r.id}`}>
                        {done > 0 ? (
                          <><Navigation className="h-5 w-5" /> Fortsæt rute</>
                        ) : (
                          <><Play className="h-5 w-5" /> Start rute</>
                        )}
                      </Link>
                    ) : (
                      <><Play className="h-5 w-5" /> Ingen stop</>
                    )}
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-11 shrink-0 rounded-lg border-border bg-card px-3 text-foreground transition-colors hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]"
                    aria-label="Udskriv liste"
                    title="Udskriv liste"
                  >
                    <Link to={`/medarbejder/rute/${r.id}/print`}>
                      <Printer className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
        </div>
      </PageTransition>

      {/* Detaljer-sheet — højre-side på desktop (matcher virksomhedspanelet)
          og fuld bottom-sheet på mobil. Viser fulde oplysninger for aftalen. */}
      <Sheet open={!!detailsStop} onOpenChange={(o) => !o && setDetailsStop(null)}>
        <SheetContent side="right" className="w-full p-0 flex flex-col sm:max-w-lg">
          {detailsStop && (
            <StopDetailsContent
              stop={detailsStop.stop}
              index={detailsStop.index}
              themeColor={detailsStop.routeColor || "hsl(var(--foreground))"}
              route={{ name: detailsStop.routeName, color: detailsStop.routeColor, date: detailsStop.routeDate }}
              readOnly
            />
          )}
        </SheetContent>
      </Sheet>
    </EmployeeShell>
  );
};

export default EmployeeApp;
