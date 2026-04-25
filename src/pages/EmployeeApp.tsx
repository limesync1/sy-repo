import { useMemo, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyDayRoutes, useMyDayStops, type RouteStop } from "@/hooks/useRoutes";
import { useMyWorkday, useStartWorkday, useEndWorkday } from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Calendar as CalendarIcon, Play, Printer, MapPin, Clock, CheckCircle2,
  ChevronLeft, ChevronRight, Route as RouteIcon, Navigation, PlayCircle, StopCircle,
  Users, User as UserIcon,
} from "lucide-react";
import { format, addDays, parseISO, isToday, formatDistanceStrict } from "date-fns";
import { da } from "date-fns/locale";
import { MapContainer, TileLayer, Marker, Polyline } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { EmployeeShell } from "@/components/employee/EmployeeShell";
import { PageHeader } from "@/components/admin/shared/AdminUI";
import { cn } from "@/lib/utils";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

const miniStopIcon = (n: number, color: string, done: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="width:22px;height:22px;border-radius:50%;background:${done ? "hsl(142 70% 45%)" : color};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:10px;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.3);">${done ? "✓" : n}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

const startIcon = L.divIcon({
  className: "",
  html: `<div style="width:14px;height:14px;border-radius:50%;background:hsl(222 47% 11%);border:3px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4);"></div>`,
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
    <div className="h-44 w-full relative">
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
  const { data: routes = [], isLoading: routesLoading } = useMyDayRoutes(date);
  const { data: stops = [], isLoading: stopsLoading } = useMyDayStops(date);
  const { data: workday } = useMyWorkday(date);
  const startDay = useStartWorkday();
  const endDay = useEndWorkday();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        Indlæser...
      </div>
    );
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

  // Date navigator — placeret inde i indholdet ved siden af titlen
  // (samme PageHeader-mønster som virksomhedspanelet bruger).
  const dateNav = (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-1 shadow-sm">
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        onClick={() => setDate(format(addDays(dateObj, -1), "yyyy-MM-dd"))}
        aria-label="Forrige dag"
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <div className="px-2 min-w-0">
        <p className="text-xs font-semibold capitalize leading-tight tabular-nums whitespace-nowrap text-foreground">
          {isCurrentDay ? "I dag" : format(dateObj, "EEE d. MMM", { locale: da })}
        </p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
        onClick={() => setDate(format(addDays(dateObj, 1), "yyyy-MM-dd"))}
        aria-label="Næste dag"
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
      {!isCurrentDay && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setDate(todayStr())}
          className={cn(
            "h-8 rounded-md px-3 text-xs font-medium transition-colors",
            "bg-foreground text-background hover:bg-foreground/90 hover:text-background shadow-sm",
          )}
        >
          Gå til i dag
        </Button>
      )}
    </div>
  );

  return (
    <EmployeeShell activeTab="today" title="Min dag">
      <div className="mx-auto max-w-3xl space-y-4 pb-16">
        <PageHeader
          title={<span className="capitalize">{format(dateObj, "EEEE d. MMMM", { locale: da })}</span>}
          description={
            totalStops > 0
              ? `${completedStops} af ${totalStops} stop færdige`
              : "Ingen stop planlagt"
          }
          action={dateNav}
        />

        {/* Start dag / Stop dag — kun for i dag */}
        {isCurrentDay && (
          <Card className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Clock className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold">
                {dayEnded ? "Arbejdsdag afsluttet" : dayStarted ? "Arbejdsdag i gang" : "Arbejdsdag ikke startet"}
              </p>
              <p className="text-xs text-muted-foreground tabular-nums">
                {workday?.started_at && (
                  <>Start {format(new Date(workday.started_at), "HH:mm")}</>
                )}
                {workday?.ended_at && (
                  <> · Slut {format(new Date(workday.ended_at), "HH:mm")} · {workday.duration_minutes ?? 0} min</>
                )}
                {elapsedLabel && !dayEnded && <> · {elapsedLabel}</>}
              </p>
            </div>
            {!dayStarted && !dayEnded && (
              <Button
                size="sm"
                onClick={() => startDay.mutate(date)}
                disabled={startDay.isPending}
                className="gap-1.5"
              >
                <PlayCircle className="h-4 w-4" /> Start dag
              </Button>
            )}
            {dayStarted && (
              <Button
                size="sm"
                variant="outline"
                onClick={() => endDay.mutate(date)}
                disabled={endDay.isPending}
                className="gap-1.5"
              >
                <StopCircle className="h-4 w-4" /> Stop dag
              </Button>
            )}
          </Card>
        )}

        {(routesLoading || stopsLoading) && (
          <Card className="p-8 text-center text-muted-foreground">
            <Loader />
            <p className="text-sm mt-2">Indlæser dine ruter...</p>
          </Card>
        )}

        {!routesLoading && !stopsLoading && routes.length === 0 && (
          <Card className="p-10 text-center">
            <div className="h-16 w-16 rounded-2xl bg-secondary mx-auto flex items-center justify-center mb-4">
              <CalendarIcon className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-base font-semibold mb-1">Ingen ruter denne dag</p>
            <p className="text-sm text-muted-foreground">
              Du har ingen tildelte stop. Skift dato for at se andre dage.
            </p>
          </Card>
        )}

        {routes.map((r) => {
          const myStops = (stopsByRoute.get(r.id) || []).sort((a, b) => a.sequence - b.sequence);
          const done = myStops.filter((s) => s.status === "completed").length;
          const total = myStops.length;
          const allDone = total > 0 && done === total;
          const progress = total > 0 ? Math.round((done / total) * 100) : 0;
          const color = r.color || "hsl(184 90% 42%)";
          const startCoord: [number, number] | null =
            r.start_latitude != null && r.start_longitude != null
              ? [Number(r.start_latitude), Number(r.start_longitude)]
              : null;
          const startTime = r.planned_start_time?.slice(0, 5) || "08:00";
          const firstPendingId = myStops.find((s) => s.status !== "completed")?.id ?? null;
          // En rute er "team" hvis et eller flere stop ikke er specifikt
          // tildelt nogen (assignee) — så er hele ruten en fælles opgave.
          const isTeamRoute = myStops.some((s) => !s.assigned_employee_id);

          return (
            <Card
              key={r.id}
              className="surface-admin overflow-hidden rounded-xl border-border/80 shadow-sm transition-shadow hover:shadow-md"
            >
              {/* Header bar — neutral admin-style med farvet rute-prik */}
              <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 sm:px-5">
                <span
                  className="h-7 w-7 shrink-0 rounded-lg border border-border flex items-center justify-center"
                  style={{ background: color }}
                  aria-hidden
                >
                  <RouteIcon className="h-3.5 w-3.5 text-background" />
                </span>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground truncate">
                    {r.name || `Rute ${format(parseISO(r.route_date), "d. MMM", { locale: da })}`}
                  </h3>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    <span className="text-xs text-muted-foreground">
                      {total > 0
                        ? `${done} af ${total} stop færdige`
                        : "Ingen stop"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/60 px-1.5 py-px text-[10px] font-medium text-muted-foreground">
                      {isTeamRoute ? (
                        <><Users className="h-2.5 w-2.5" /> Team</>
                      ) : (
                        <><UserIcon className="h-2.5 w-2.5" /> Tildelt mig</>
                      )}
                    </span>
                  </div>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-secondary px-2.5 py-1 text-xs font-semibold tabular-nums text-foreground shrink-0">
                  {done}/{total}
                </span>
              </div>

              {/* Kort-preview */}
              <RouteMiniMap stops={myStops} startCoord={startCoord} color={color} />

              {/* Body */}
              <div className="space-y-4 p-4 sm:p-5">
                {/* Meta-rad: start, varighed, distance */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs">
                  <span className="inline-flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    Start <span className="font-semibold text-foreground tabular-nums">{startTime}</span>
                  </span>
                  {r.total_duration_minutes != null && r.total_duration_minutes > 0 && (
                    <span className="text-muted-foreground tabular-nums">
                      Varighed{" "}
                      <span className="font-semibold text-foreground">
                        ~{Math.round(r.total_duration_minutes / 60)}t {r.total_duration_minutes % 60}min
                      </span>
                    </span>
                  )}
                  {r.total_distance_km != null && r.total_distance_km > 0 && (
                    <span className="text-muted-foreground tabular-nums">
                      Distance <span className="font-semibold text-foreground">{r.total_distance_km.toFixed(1)} km</span>
                    </span>
                  )}
                </div>

                {r.start_address && (
                  <div className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-xs">
                    <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-[10px] font-medium text-muted-foreground">Startadresse</p>
                      <p className="truncate text-foreground">{r.start_address}</p>
                    </div>
                  </div>
                )}

                {/* Fremskridt */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Fremskridt</span>
                    <span className="font-semibold tabular-nums text-foreground">{progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${progress}%`, background: color }}
                    />
                  </div>
                </div>

                {/* Stop-preview liste — divide-y row-stil ligesom kunder/aftaler */}
                {total > 0 && (
                  <div className="overflow-hidden rounded-lg border border-border bg-card">
                    <div className="divide-y divide-border">
                      {myStops.slice(0, 4).map((s, i) => {
                        const isNext = s.id === firstPendingId;
                        const arrivalLabel = s.planned_arrival
                          ? format(new Date(s.planned_arrival), "HH:mm")
                          : null;
                        return (
                          <div
                            key={s.id}
                            className={`flex items-center gap-3 px-3 py-2.5 ${
                              isNext ? "bg-accent/5" : ""
                            }`}
                          >
                            <span
                              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[11px] font-bold ${
                                s.status === "completed"
                                  ? "bg-emerald-500/10 text-emerald-600"
                                  : isNext
                                    ? "bg-accent text-accent-foreground ring-2 ring-accent/30"
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
                                  <span className="ml-1.5 text-[9px] font-bold uppercase tracking-wide text-accent">
                                    Næste
                                  </span>
                                )}
                              </p>
                              {s.address && (
                                <p className="truncate text-[11px] text-muted-foreground">
                                  {s.address}
                                </p>
                              )}
                            </div>
                            {arrivalLabel && (
                              <span className="shrink-0 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-foreground">
                                {arrivalLabel}
                              </span>
                            )}
                          </div>
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

                {/* Handlinger */}
                <div className="flex gap-2 pt-1">
                  <Button
                    asChild
                    size="lg"
                    className="h-11 flex-1 gap-2 rounded-lg bg-foreground text-background font-semibold shadow-sm hover:bg-foreground/90"
                    disabled={total === 0}
                  >
                    <Link to={`/medarbejder/rute/${r.id}`}>
                      {allDone ? (
                        <><CheckCircle2 className="h-5 w-5" /> Genåbn</>
                      ) : done > 0 ? (
                        <><Navigation className="h-5 w-5" /> Fortsæt rute</>
                      ) : (
                        <><Play className="h-5 w-5" /> Start rute</>
                      )}
                    </Link>
                  </Button>
                  <Button
                    asChild
                    size="lg"
                    variant="outline"
                    className="h-11 rounded-lg border-border px-3 text-foreground hover:bg-secondary"
                  >
                    <Link
                      to={`/medarbejder/rute/${r.id}/print`}
                      aria-label="Udskriv liste"
                    >
                      <Printer className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </EmployeeShell>
  );
};

const Loader = () => (
  <div className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-secondary">
    <div className="h-4 w-4 rounded-full border-2 border-muted-foreground border-t-transparent animate-spin" />
  </div>
);

export default EmployeeApp;
