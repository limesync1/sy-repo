// MonthWeekCalendar — klassisk kalender-overblik med måned/uge visning.
// - Ingen timer/tidsrum: hver dag er ét helt felt
// - Ugenumre vises i venstre side (ISO-uger)
// - Hver rute vises som farvet pille på sin route_date
// - Drag rute → ny dato (onMoveRoute)
// - Drag aftale fra aftalepool → ind på en rute eller tom dag
// - Klik rute → åbner rute-sheet (onSelectRoute)
// - Klik aftale → åbner stop-sheet (onSelectStop)

import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Plus, Users, MapPin, ArrowDown, Repeat, Lock } from "lucide-react";
import { CloudOff } from "lucide-react";
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, eachDayOfInterval, getISOWeek, isSameMonth, isToday, isSameDay,
} from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Route, RouteStop } from "@/hooks/useRoutes";
import { WeatherBadge } from "./WeatherBadge";
import type { WeatherDay } from "@/hooks/useWeather";
import { Skeleton } from "@/components/ui/skeleton";
import { memo, useMemo } from "react";

export type CalendarRoute = Route & {
  stops: RouteStop[];
  attachedEmployeeCount: number;
  attachedEmployees: { id: string; name: string; avatar_url?: string | null; color?: string | null }[];
  /** Når true er ruten en projiceret fremtidig forekomst af en gentagende rute.
   *  Den vises dæmpet med lås-ikon, kan ikke trækkes/optimeres, og klik åbner
   *  basisruten på dens næste rigtige dato. */
  isVirtual?: boolean;
};

type Props = {
  view: "month" | "week";
  /** Anchor-dato — week/month vises omkring denne. */
  anchorDate: string;
  routes: CalendarRoute[];
  onSelectRoute: (route: Route) => void;
  onSelectStop: (stop: RouteStop) => void;
  onCreateRoute: (date: string) => void;
  onOptimizeRoute: (routeId: string) => void;
  optimizingRouteId?: string | null;
  /** Sat til 'job' når brugeren trækker en aftale fra aftalepoolen — får drop-targets til at lyse op. */
  draggingType?: "job" | "route" | null;
  /** Map fra yyyy-MM-dd → vejrudsigt for dagen. */
  weatherByDate?: Map<string, WeatherDay>;
  /** Vi henter stadig ruter/stops til perioden — vis skeleton-piller i hver dag-celle
   *  så layoutet ikke "hopper" når data lander. */
  loadingRoutes?: boolean;
  /** Vejrudsigten henter stadig — vis lille pulserende pille i højre hjørne. */
  loadingWeather?: boolean;
  /** Vejr-API fejlede — vis diskret fallback-ikon så brugeren ved at vejret er utilgængeligt. */
  weatherError?: boolean;
};

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export const MonthWeekCalendar = ({
  view, anchorDate, routes, onSelectRoute, onSelectStop,
  onCreateRoute, onOptimizeRoute, optimizingRouteId, draggingType, weatherByDate,
  loadingRoutes, loadingWeather, weatherError,
}: Props) => {
  const anchor = parseISO(anchorDate);

  // Memo: beregn synlige uger og rute-mapping kun når input ændrer sig.  Tidligere
  // blev disse rebygget hver render (= hver gang vejret eller drag-tilstand
  // ændrede sig), hvilket gjorde at hele kalenderen rerender'ede selv ved
  // bagatel-opdateringer.  Sammen med React.memo på DayCell/RoutePill gør det
  // bladring og drag-and-drop spækfedt.
  const weeks = useMemo<Date[][]>(() => {
    const days: Date[] = view === "week"
      ? eachDayOfInterval({ start: startOfWeek(anchor, { weekStartsOn: 1 }), end: addDays(startOfWeek(anchor, { weekStartsOn: 1 }), 6) })
      : eachDayOfInterval({
          start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
          end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
        });
    const out: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchorDate]);

  const routesByDate = useMemo(() => {
    const m = new Map<string, CalendarRoute[]>();
    for (const r of routes) {
      const arr = m.get(r.route_date) || [];
      arr.push(r);
      m.set(r.route_date, arr);
    }
    return m;
  }, [routes]);

  const weekdayLabels = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      {/* Weekday header */}
      <div className="grid border-b bg-secondary/30 shrink-0" style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}>
        <div className="border-r p-2 text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-center">
          Uge
        </div>
        {weekdayLabels.map((wd) => (
          <div key={wd} className="p-2 text-[11px] uppercase text-muted-foreground font-semibold text-center border-r last:border-r-0">
            {wd}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {weeks.map((week, wi) => {
          const weekNum = getISOWeek(week[0]);
          return (
            <div
              key={wi}
              className="grid border-b last:border-b-0"
              style={{ gridTemplateColumns: "48px repeat(7, 1fr)" }}
            >
              {/* Ugenummer */}
              <div className="border-r bg-secondary/20 flex items-start justify-center pt-2 text-xs font-bold text-muted-foreground tabular-nums">
                {weekNum}
              </div>
              {week.map((day) => {
                const dateStr = ymd(day);
                const dayRoutes = routesByDate.get(dateStr) || [];
                const inMonth = view === "week" ? true : isSameMonth(day, anchor);
                const today = isToday(day);
                return (
                  <DayCell
                    key={dateStr}
                    date={day}
                    dateStr={dateStr}
                    routes={dayRoutes}
                    inMonth={inMonth}
                    today={today}
                    onSelectRoute={onSelectRoute}
                    onSelectStop={onSelectStop}
                    onCreateRoute={onCreateRoute}
                    onOptimizeRoute={onOptimizeRoute}
                    optimizingRouteId={optimizingRouteId}
                    compact={view === "month"}
                    draggingType={draggingType}
                    weather={weatherByDate?.get(dateStr) ?? null}
                    loadingRoutes={!!loadingRoutes}
                    loadingWeather={!!loadingWeather}
                    weatherError={!!weatherError}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </Card>
  );
};

/* ─── Dag-celle ─── */
type DayCellProps = {
  date: Date;
  dateStr: string;
  routes: CalendarRoute[];
  inMonth: boolean;
  today: boolean;
  onSelectRoute: (route: Route) => void;
  onSelectStop: (stop: RouteStop) => void;
  onCreateRoute: (date: string) => void;
  onOptimizeRoute: (routeId: string) => void;
  optimizingRouteId?: string | null;
  compact: boolean;
  draggingType?: "job" | "route" | null;
  weather?: WeatherDay | null;
  loadingRoutes?: boolean;
  loadingWeather?: boolean;
  weatherError?: boolean;
};

const DayCellInner = ({
  date, dateStr, routes, inMonth, today,
  onSelectRoute, onSelectStop, onCreateRoute, onOptimizeRoute, optimizingRouteId, compact, draggingType, weather,
  loadingRoutes, loadingWeather, weatherError,
}: DayCellProps) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dateStr}`,
    data: { type: "day", date: dateStr },
  });

  const isDragActive = !!draggingType;
  const isJobDragActive = draggingType === "job";
  const emptyDay = routes.length === 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "border-r last:border-r-0 relative group flex flex-col gap-1 p-1.5 transition-colors",
        compact ? "min-h-[110px]" : "min-h-[160px]",
        !inMonth && "bg-secondary/10",
        // Når en aftale eller rute trækkes — gør dage subtilt mere indbydende
        isDragActive && inMonth && !isOver && "ring-1 ring-accent/30 ring-inset",
        // Når man hovrer over en dag — tydeligt highlight
        isOver && "bg-accent/15 ring-2 ring-accent ring-inset shadow-inner",
      )}
    >
      {/* Dato-header */}
      <div className="flex items-center justify-between mb-0.5">
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full text-xs font-semibold tabular-nums",
            today ? "h-6 w-6 bg-accent text-accent-foreground" : "h-6 w-6 text-foreground",
            !inMonth && !today && "text-muted-foreground/50",
          )}
        >
          {format(date, "d")}
        </span>
        <div className="flex items-center gap-1">
          {weather && (
            <WeatherBadge weather={weather} size={compact ? "compact" : "full"} />
          )}
          {!weather && loadingWeather && (
            <Skeleton className={cn("rounded-md", compact ? "h-4 w-8" : "h-5 w-12")} />
          )}
          {!weather && !loadingWeather && weatherError && inMonth && (
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-md bg-muted/60 text-muted-foreground ring-1 ring-border/60",
                compact ? "h-4 w-4" : "h-5 w-5",
              )}
              title="Vejrudsigt utilgængelig — prøv igen senere"
              aria-label="Vejrudsigt utilgængelig"
            >
              <CloudOff className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            </span>
          )}
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCreateRoute(dateStr); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 inline-flex items-center justify-center rounded hover:bg-accent/10 text-muted-foreground hover:text-accent"
            aria-label="Opret rute"
            title="Opret rute denne dag"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Rute-piller */}
      <div className="flex-1 flex flex-col gap-1 min-h-0">
        {/* Skeleton pille mens vi henter ruter — kun synlig på dage i den
            aktive måned, så "udenfor"-dage ikke larmer.  Holder layoutet
            stabilt mellem måned/uge-skift. */}
        {loadingRoutes && routes.length === 0 && inMonth && (
          <>
            <Skeleton className="h-5 rounded-md" />
            {!compact && <Skeleton className="h-5 rounded-md w-3/4" />}
          </>
        )}
        {routes.map((r) => (
          <RoutePill
            key={r.id}
            route={r}
            onSelect={() => onSelectRoute(r)}
            onSelectStop={onSelectStop}
            onOptimize={() => onOptimizeRoute(r.id)}
            optimizing={optimizingRouteId === r.id}
            compact={compact}
            jobDragActive={isJobDragActive}
          />
        ))}

        {/* "Slip her" overlay på tomme dage når en aftale trækkes */}
        {isJobDragActive && emptyDay && inMonth && (
          <div
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed transition-all",
              isOver
                ? "border-accent bg-accent/15 text-accent scale-[1.02]"
                : "border-accent/40 bg-accent/5 text-accent/70",
            )}
          >
            <ArrowDown className={cn("h-4 w-4", isOver && "animate-bounce")} />
            <span className="text-[10px] font-medium leading-tight text-center px-1">
              Slip for ny rute
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

/** memo: en dag-celle skal kun rerender når dens egen data ændrer sig
 *  (rute-array, vejret, drag-tilstand).  Det betyder at kalenderens 42 celler
 *  ikke alle re-rendrer hver gang vejret for én anden dag opdateres. */
const DayCell = memo(DayCellInner, (prev, next) => {
  return (
    prev.dateStr === next.dateStr &&
    prev.inMonth === next.inMonth &&
    prev.today === next.today &&
    prev.compact === next.compact &&
    prev.routes === next.routes &&
    prev.weather === next.weather &&
    prev.draggingType === next.draggingType &&
    prev.optimizingRouteId === next.optimizingRouteId &&
    prev.loadingRoutes === next.loadingRoutes &&
    prev.loadingWeather === next.loadingWeather &&
    prev.weatherError === next.weatherError
  );
});

/* ─── Rute-pille (drag + drop target for aftaler) ─── */
type RoutePillProps = {
  route: CalendarRoute;
  onSelect: () => void;
  onSelectStop: (stop: RouteStop) => void;
  onOptimize: () => void;
  optimizing: boolean;
  compact: boolean;
  jobDragActive?: boolean;
};

const RoutePillInner = ({ route, onSelect, onSelectStop, onOptimize, optimizing, compact, jobDragActive }: RoutePillProps) => {
  // Drag-handle: hele pillen kan trækkes til ny dato
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `route:${route.id}`,
    data: { type: "route", route },
  });

  // Drop-zone: aftaler kan slippes på pillen for at blive tilføjet til ruten
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `route-drop:${route.id}`,
    data: { type: "route", routeId: route.id, date: route.route_date },
  });

  // Combined ref
  const setRefs = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const stopCount = route.stops.length;
  const completedCount = route.stops.filter((s) => s.status === "completed").length;
  const visibleEmployees = route.attachedEmployees.slice(0, 3);
  const extraEmployees = route.attachedEmployees.length - visibleEmployees.length;

  return (
    <div
      ref={setRefs}
      onClick={(e) => { e.stopPropagation(); if (!isDragging) onSelect(); }}
      className={cn(
        "relative rounded-md border-l-4 cursor-pointer transition-all overflow-hidden bg-card hover:shadow-sm",
        "border border-border/60",
        isDragging && "opacity-40",
        // Når en aftale er ved at blive sluppet på pillen — markér tydeligt
        jobDragActive && !isOver && "ring-1 shadow-sm",
        isOver && "ring-2 ring-accent shadow-md scale-[1.02]",
      )}
      style={{
        borderLeftColor: route.color,
        ...(jobDragActive && !isOver
          ? { boxShadow: `0 0 0 1px ${route.color}40, 0 1px 3px ${route.color}20` }
          : {}),
      }}
    >
      <div
        {...listeners}
        {...attributes}
        className="px-2 py-1 flex items-center justify-between gap-1 cursor-grab active:cursor-grabbing"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold truncate text-foreground leading-tight">
            {route.name || `Kørsel ${format(parseISO(route.route_date), "d/M")}`}
          </p>
          {!compact ? (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums mt-0.5">
              <MapPin className="h-2.5 w-2.5" />{stopCount}
              {completedCount > 0 && <span className="text-emerald-600">({completedCount}✓)</span>}
            </div>
          ) : (
            stopCount > 0 && (
              <p className="text-[9px] text-muted-foreground tabular-nums">{stopCount} stop</p>
            )
          )}
        </div>
        {/* Medarbejder-avatarer */}
        {visibleEmployees.length > 0 && (
          <div className="flex -space-x-1 shrink-0" title={route.attachedEmployees.map((e) => e.name).join(", ")}>
            {visibleEmployees.map((emp) =>
              emp.avatar_url ? (
                <img
                  key={emp.id}
                  src={emp.avatar_url}
                  alt={emp.name}
                  title={emp.name}
                  loading="lazy"
                  className="h-4 w-4 rounded-full object-cover ring-1 ring-background"
                />
              ) : (
                <span
                  key={emp.id}
                  className="inline-block h-4 w-4 rounded-full ring-1 ring-background"
                  style={{ background: emp.color || "#64748b" }}
                  title={emp.name}
                  aria-label={emp.name}
                />
              ),
            )}
            {extraEmployees > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-0.5 rounded-full text-[8px] font-bold ring-1 ring-background bg-muted text-muted-foreground">
                +{extraEmployees}
              </span>
            )}
          </div>
        )}
        {visibleEmployees.length === 0 && route.attachedEmployeeCount === 0 && !compact && (
          <span className="text-[9px] text-muted-foreground italic flex items-center gap-0.5 shrink-0">
            <Users className="h-2.5 w-2.5" />0
          </span>
        )}
        {stopCount >= 2 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOptimize(); }}
            disabled={optimizing}
            className="shrink-0 h-5 w-5 inline-flex items-center justify-center rounded hover:bg-accent/10 text-muted-foreground hover:text-accent disabled:opacity-50"
            aria-label="Optimér rute"
            title="Optimér rute (AI + Mapbox)"
          >
            {optimizing
              ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
              : <Sparkles className="h-2.5 w-2.5" />}
          </button>
        )}
      </div>

      {/* Stops under ruten — kun i uge-visning (mere plads) */}
      {!compact && stopCount > 0 && (
        <div className="border-t border-border/40 bg-secondary/20 max-h-32 overflow-y-auto">
          {route.stops
            .slice()
            .sort((a, b) => a.sequence - b.sequence)
            .slice(0, 4)
            .map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={(e) => { e.stopPropagation(); onSelectStop(s); }}
                className="w-full text-left px-2 py-0.5 text-[10px] hover:bg-accent/10 truncate text-foreground/80 border-t border-border/30 first:border-t-0"
              >
                <span className="font-medium">{s.customer_name || "Stop"}</span>
                {s.time_window_start && (
                  <Badge variant="outline" className="ml-1 h-3 px-1 text-[8px] tabular-nums">
                    {s.time_window_start.slice(0, 5)}
                  </Badge>
                )}
              </button>
            ))}
          {stopCount > 4 && (
            <div className="px-2 py-0.5 text-[9px] text-muted-foreground italic">
              +{stopCount - 4} mere
            </div>
          )}
        </div>
      )}
    </div>
  );
};

const RoutePill = memo(RoutePillInner, (prev, next) => {
  return (
    prev.route === next.route &&
    prev.optimizing === next.optimizing &&
    prev.compact === next.compact &&
    prev.jobDragActive === next.jobDragActive
  );
});