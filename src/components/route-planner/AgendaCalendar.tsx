// AgendaCalendar — mobil/tablet-venlig kalender til Ruter-siden.
// Viser hver dag som en stacket fuld-bredde række (i stedet for et 7-kolonners
// grid der bliver ulæseligt på smalle skærme). Drag-and-drop benytter de samme
// dnd-kit IDs som MonthWeekCalendar (`day:<date>`, `route:<id>`,
// `route-drop:<id>`) så al planlægger-logikken i RoutePlanner virker uændret.

import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Loader2, Sparkles, Plus, MapPin, ArrowDown, Repeat, ChevronDown, Inbox, Lock, GitMerge } from "lucide-react";
import { CloudOff } from "lucide-react";
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, eachDayOfInterval, isSameMonth, isToday, getISOWeek,
} from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Route, RouteStop } from "@/hooks/useRoutes";
import { WeatherBadge } from "./WeatherBadge";
import type { WeatherDay } from "@/hooks/useWeather";
import { Skeleton } from "@/components/ui/skeleton";
import { memo, useMemo } from "react";
import type { CalendarRoute } from "./MonthWeekCalendar";
import { useTargetValidation, ringForSeverity, chipBgForSeverity } from "./drag-validation-context";

type Props = {
  view: "month" | "week";
  anchorDate: string;
  routes: CalendarRoute[];
  onSelectRoute: (route: Route) => void;
  onSelectStop: (stop: RouteStop) => void;
  onCreateRoute: (date: string) => void;
  onOptimizeRoute: (routeId: string) => void;
  optimizingRouteId?: string | null;
  draggingType?: "job" | "route" | "stop" | null;
  draggingRouteId?: string | null;
  weatherByDate?: Map<string, WeatherDay>;
  loadingRoutes?: boolean;
  loadingWeather?: boolean;
  weatherError?: boolean;
  busyTargets?: Set<string>;
};

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export const AgendaCalendar = ({
  view, anchorDate, routes, onSelectRoute, onSelectStop,
  onCreateRoute, onOptimizeRoute, optimizingRouteId, draggingType, draggingRouteId, weatherByDate,
  loadingRoutes, loadingWeather, weatherError, busyTargets,
}: Props) => {
  const anchor = parseISO(anchorDate);
  const todayIso = format(new Date(), "yyyy-MM-dd");

  const days = useMemo<Date[]>(() => {
    if (view === "week") {
      const ws = startOfWeek(anchor, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: ws, end: addDays(ws, 6) });
    }
    return eachDayOfInterval({
      start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
    });
  }, [view, anchorDate]);

  const routesByDate = useMemo(() => {
    const m = new Map<string, CalendarRoute[]>();
    for (const r of routes) {
      const arr = m.get(r.route_date) || [];
      arr.push(r);
      m.set(r.route_date, arr);
    }
    for (const [k, arr] of m) {
      arr.sort((a, b) => {
        const at = (a as any).planned_start_time || "";
        const bt = (b as any).planned_start_time || "";
        if (at !== bt) {
          if (!at) return 1;
          if (!bt) return -1;
          return at < bt ? -1 : 1;
        }
        const av = a.isVirtual ? 0 : 1;
        const bv = b.isVirtual ? 0 : 1;
        if (av !== bv) return av - bv;
        return (a.name || "").localeCompare(b.name || "");
      });
      m.set(k, arr);
    }
    return m;
  }, [routes]);

  // I månedsvisning skjuler vi tomme dage som ligger UDENFOR den aktive måned
  // for at undgå støj. Inden i måneden vises alle dage (også tomme), så
  // brugeren kan droppe en aftale på en tom dag.
  const visibleDays = useMemo(() => {
    if (view === "week") return days;
    return days.filter((d) => isSameMonth(d, anchor) || (routesByDate.get(ymd(d))?.length ?? 0) > 0);
  }, [days, view, anchor, routesByDate]);

  // Gruppér efter ISO-uge så vi kan vise "Uge N"-overskrifter
  const grouped = useMemo(() => {
    const out: Array<{ week: number; days: Date[] }> = [];
    for (const d of visibleDays) {
      const w = getISOWeek(d);
      const last = out[out.length - 1];
      if (last && last.week === w) last.days.push(d);
      else out.push({ week: w, days: [d] });
    }
    return out;
  }, [visibleDays]);

  return (
    <div className="h-full overflow-y-auto rounded-lg border bg-background">
      {grouped.map((grp) => (
        <div key={grp.week}>
          <div className="sticky top-0 z-10 border-b bg-secondary/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
            Uge {grp.week}
          </div>
          <ul className="divide-y">
            {grp.days.map((day) => {
              const dateStr = ymd(day);
              const dayRoutes = routesByDate.get(dateStr) || [];
              return (
                <DayRow
                  key={dateStr}
                  date={day}
                  dateStr={dateStr}
                  todayIso={todayIso}
                  routes={dayRoutes}
                  onSelectRoute={onSelectRoute}
                  onSelectStop={onSelectStop}
                  onCreateRoute={onCreateRoute}
                  onOptimizeRoute={onOptimizeRoute}
                  optimizingRouteId={optimizingRouteId}
                  draggingType={draggingType}
                  draggingRouteId={draggingRouteId ?? null}
                  weather={weatherByDate?.get(dateStr) ?? null}
                  loadingRoutes={!!loadingRoutes}
                  loadingWeather={!!loadingWeather}
                  weatherError={!!weatherError}
                  busy={!!busyTargets?.has(`day:${dateStr}`)}
                  busyRouteIds={busyTargets}
                />
              );
            })}
          </ul>
        </div>
      ))}
      {grouped.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
          <Inbox className="h-8 w-8 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">Ingen dage at vise i denne periode.</p>
        </div>
      )}
    </div>
  );
};

type DayRowProps = {
  date: Date;
  dateStr: string;
  todayIso: string;
  routes: CalendarRoute[];
  onSelectRoute: (route: Route) => void;
  onSelectStop: (stop: RouteStop) => void;
  onCreateRoute: (date: string) => void;
  onOptimizeRoute: (routeId: string) => void;
  optimizingRouteId?: string | null;
  draggingType?: "job" | "route" | "stop" | null;
  draggingRouteId?: string | null;
  weather?: WeatherDay | null;
  loadingRoutes?: boolean;
  loadingWeather?: boolean;
  weatherError?: boolean;
  busy?: boolean;
  busyRouteIds?: Set<string>;
};

const DayRowInner = ({
  date, dateStr, todayIso, routes,
  onSelectRoute, onSelectStop, onCreateRoute, onOptimizeRoute, optimizingRouteId,
  draggingType, draggingRouteId, weather, loadingRoutes, loadingWeather, weatherError, busy, busyRouteIds,
}: DayRowProps) => {
  const isPast = dateStr < todayIso;
  const today = isToday(date);
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dateStr}`,
    data: { type: "day", date: dateStr },
    disabled: !!busy || isPast,
  });

  const isDragActive = !!draggingType;
  const isJobDragActive = draggingType === "job";
  const emptyDay = routes.length === 0;
  const canReceiveDrop = isDragActive && !isPast && !busy;
  const validation = useTargetValidation(`day:${dateStr}`);

  const dropVerb = (() => {
    if (!isOver || !canReceiveDrop) return null;
    if (validation?.topMessage) return validation.topMessage;
    if (draggingType === "job") return emptyDay ? "Opret ny rute" : "Tilføj til rute";
    if (draggingType === "stop") return "Flyt stop hertil";
    if (draggingType === "route") return "Flyt rute hertil";
    return null;
  })();

  return (
    <li
      ref={setNodeRef}
      data-route-drop-date={canReceiveDrop ? dateStr : undefined}
      className={cn(
        "relative px-3 py-2.5 transition-colors",
        isPast && "bg-muted/20",
        canReceiveDrop && !isOver && "ring-1 ring-accent/30 ring-inset",
        isOver && canReceiveDrop && !validation && "bg-accent/15 ring-2 ring-accent ring-inset",
        isOver && canReceiveDrop && validation && ringForSeverity(validation.severity),
        busy && "opacity-90",
      )}
      aria-busy={busy || undefined}
    >
      {busy && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[1px] pointer-events-none">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      )}

      {/* Header: dato + vejret + opret-knap */}
      <div className="flex items-center gap-2">
        <div className="flex items-baseline gap-2 min-w-0 flex-1">
          <span
            className={cn(
              "inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-sm font-bold tabular-nums",
              today ? "bg-accent text-accent-foreground" : "text-foreground",
            )}
          >
            {format(date, "d")}
          </span>
          <span className={cn("text-[11px] font-medium uppercase tracking-wide", today ? "text-accent" : "text-muted-foreground")}>
            {format(date, "EEEE", { locale: da })}
          </span>
          <span className="text-[11px] text-muted-foreground">
            {format(date, "MMM", { locale: da })}
          </span>
          {routes.length > 0 && (
            <span className="ml-auto text-[10px] tabular-nums text-muted-foreground">
              {routes.length} {routes.length === 1 ? "rute" : "ruter"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          {weather && <WeatherBadge weather={weather} size="compact" />}
          {!weather && loadingWeather && <Skeleton className="h-4 w-8 rounded-md" />}
          {!weather && !loadingWeather && weatherError && (
            <span className="inline-flex h-4 w-4 items-center justify-center rounded-md bg-muted/60 text-muted-foreground ring-1 ring-border/60" title="Vejrudsigt utilgængelig">
              <CloudOff className="h-2.5 w-2.5" />
            </span>
          )}
          {!isPast && (
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onCreateRoute(dateStr); }}
              className="h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              aria-label="Opret rute denne dag"
              title="Opret rute"
            >
              <Plus className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {dropVerb && (
        <div className={cn(
          "absolute top-2 right-2 z-30 pointer-events-none rounded-md px-1.5 py-0.5 shadow-lg text-[10px] font-semibold flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150",
          chipBgForSeverity(validation?.severity),
        )}>
          <ArrowDown className="h-3 w-3" />
          <span>{dropVerb}</span>
        </div>
      )}

      {/* Rute-piller — fuld bredde, stort touch-mål */}
      <div className="mt-2 flex flex-col gap-1.5">
        {loadingRoutes && routes.length === 0 && (
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card/80 px-3 py-2">
            <div className="h-2.5 w-2 rounded-sm bg-muted-foreground/20" />
            <div className="h-3 flex-1 rounded bg-muted/70 animate-pulse" />
            <div className="h-3 w-3 rounded-full bg-muted/70 animate-pulse" />
          </div>
        )}
        {routes.map((r) => (
          <AgendaRoutePill
            key={r.id}
            route={r}
            onSelect={() => onSelectRoute(r)}
            onSelectStop={onSelectStop}
            onOptimize={() => onOptimizeRoute(r.id)}
            optimizing={optimizingRouteId === r.id}
            jobDragActive={isJobDragActive}
            routeDragSourceId={draggingType === "route" ? (draggingRouteId ?? null) : null}
            busy={!!busyRouteIds?.has(`route:${r.id}`)}
            isPast={isPast}
          />
        ))}

        {isJobDragActive && emptyDay && canReceiveDrop && (
          <div
            className={cn(
              "flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed py-3 transition-all",
              isOver
                ? "border-accent bg-accent/15 text-accent"
                : "border-accent/40 bg-accent/5 text-accent/70",
            )}
          >
            <ArrowDown className={cn("h-4 w-4", isOver && "animate-bounce")} />
            <span className="text-[11px] font-medium">
              {isOver ? "Slip — opret rute" : "Slip aftale for at oprette rute"}
            </span>
          </div>
        )}

        {!isDragActive && emptyDay && !isPast && (
          <button
            type="button"
            onClick={() => onCreateRoute(dateStr)}
            className="flex items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-[11px] text-muted-foreground hover:border-accent hover:text-accent transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Opret rute
          </button>
        )}
      </div>
    </li>
  );
};

const DayRow = memo(DayRowInner);

/* ─── Rute-pille (agenda-variant: fuld bredde, mere plads) ─── */
type AgendaRoutePillProps = {
  route: CalendarRoute;
  onSelect: () => void;
  onSelectStop: (stop: RouteStop) => void;
  onOptimize: () => void;
  optimizing: boolean;
  jobDragActive?: boolean;
  routeDragSourceId?: string | null;
  busy?: boolean;
  isPast?: boolean;
};

const AgendaRoutePillInner = ({ route, onSelect, onOptimize, optimizing, jobDragActive, routeDragSourceId, busy, isPast }: AgendaRoutePillProps) => {
  const isVirtual = !!route.isVirtual;
  const isMergeTarget = !!routeDragSourceId && routeDragSourceId !== route.id && !isVirtual && !isPast && !busy;
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `route:${route.id}`,
    data: { type: "route", route },
    disabled: isVirtual || !!busy,
  });

  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `route-drop:${route.id}`,
    data: { type: "route", routeId: route.id, date: route.route_date },
    disabled: isVirtual || !!busy || !!isPast,
  });

  const setRefs = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };
  const validation = useTargetValidation(`route:${route.id}`);

  const stopCount = route.stops.length;
  const completedCount = route.stops.filter((s) => s.status === "completed").length;
  const visibleEmployees = route.attachedEmployees.slice(0, 3);
  const extraEmployees = route.attachedEmployees.length - visibleEmployees.length;

  return (
    <div
      ref={setRefs}
      data-route-drop-route-id={!isVirtual && !isPast ? route.id : undefined}
      data-route-drop-date={!isVirtual && !isPast ? route.route_date : undefined}
      onClick={(e) => { e.stopPropagation(); if (!isDragging) onSelect(); }}
      className={cn(
        "relative flex items-center gap-2 rounded-md border bg-card px-2.5 py-2 cursor-pointer transition-all overflow-hidden",
        "border-l-[3px]",
        isDragging && "opacity-40",
        isVirtual && "border-dashed",
        isPast && "opacity-60 saturate-50",
        jobDragActive && isPast && "opacity-25 pointer-events-none",
        !isVirtual && isOver && !validation && "ring-2 ring-accent shadow-md",
        !isVirtual && isOver && validation && ringForSeverity(validation.severity),
        isMergeTarget && isOver && "shadow-md bg-accent/5",
        routeDragSourceId && !isMergeTarget && routeDragSourceId !== route.id && "opacity-40 pointer-events-none",
        busy && "cursor-wait",
      )}
      style={{ borderLeftColor: route.color, borderLeftWidth: 3 }}
      aria-busy={busy || undefined}
    >
      {isOver && validation && (
        <div className={cn(
          "absolute -top-1 right-1 z-20 pointer-events-none rounded-md px-1.5 py-0.5 shadow-md text-[10px] font-semibold flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150 max-w-[95%]",
          chipBgForSeverity(validation.severity),
        )}>
          <span className="truncate">{validation.topMessage ?? (validation.severity === "ok" ? (routeDragSourceId ? "Slip her for at flette ruterne" : "Tilføj til rute") : "")}</span>
        </div>
      )}
      {isMergeTarget && isOver && !validation && (
        <div className="absolute -top-1 right-1 z-20 pointer-events-none rounded-md bg-accent text-accent-foreground px-1.5 py-0.5 shadow-md text-[10px] font-semibold flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150 max-w-[95%]">
          <GitMerge className="h-3 w-3 shrink-0" />
          <span className="truncate">Slip her for at flette</span>
        </div>
      )}
      {busy && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[1px] pointer-events-none">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
        </div>
      )}
      <div
        {...(isVirtual ? {} : listeners)}
        {...(isVirtual ? {} : attributes)}
        className={cn(
          "flex-1 min-w-0",
          isVirtual ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        )}
      >
        <div className="text-xs font-semibold leading-tight flex items-center gap-1">
          {isVirtual && (
            <span
              className="inline-flex items-center gap-0.5 rounded-sm bg-muted px-1 py-px text-[9px] font-bold uppercase tracking-wide text-muted-foreground shrink-0"
              title="Projiceret rute — låst forekomst af en gentagende basisrute"
            >
              <Lock className="h-2 w-2" />
              Projiceret
            </span>
          )}
          <span className="truncate">{route.name || `Rute (${format(parseISO(route.route_date), "d. MMM", { locale: da })})`}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground tabular-nums">
          <span className="inline-flex items-center gap-0.5"><MapPin className="h-2.5 w-2.5" />{stopCount} stop</span>
          {completedCount > 0 && <span className="text-emerald-600">{completedCount}✓</span>}
          {(route as any).planned_start_time && (
            <span>kl. {String((route as any).planned_start_time).slice(0,5)}</span>
          )}
        </div>
      </div>

      {visibleEmployees.length > 0 && (
        <div className="flex -space-x-1 shrink-0">
          {visibleEmployees.map((emp) =>
            emp.avatar_url ? (
              <img key={emp.id} src={emp.avatar_url} alt={emp.name} loading="lazy" className="h-5 w-5 rounded-full object-cover ring-1 ring-background" />
            ) : (
              <span key={emp.id} className="inline-block h-5 w-5 rounded-full ring-1 ring-background" style={{ background: emp.color || "#64748b" }} aria-label={emp.name} />
            ),
          )}
          {extraEmployees > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full text-[9px] font-bold ring-1 ring-background bg-muted text-muted-foreground">
              +{extraEmployees}
            </span>
          )}
        </div>
      )}

      {!isVirtual && stopCount >= 2 && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onOptimize(); }}
          disabled={optimizing}
          className="shrink-0 h-7 w-7 inline-flex items-center justify-center rounded hover:bg-accent/10 text-muted-foreground hover:text-accent disabled:opacity-50"
          aria-label="Optimér rækkefølge"
          title="Optimér rækkefølge"
        >
          {optimizing
            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
            : <Sparkles className="h-3.5 w-3.5" />}
        </button>
      )}

      <ChevronDown className="h-3.5 w-3.5 -rotate-90 text-muted-foreground shrink-0" />
    </div>
  );
};

const AgendaRoutePill = memo(AgendaRoutePillInner);
