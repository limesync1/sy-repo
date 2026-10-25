// AgendaCalendar — mobil/tablet-venlig kalender til Ruter-siden.
// Viser hver dag som en stacket fuld-bredde række (i stedet for et 7-kolonners
// grid der bliver ulæseligt på smalle skærme). Drag-and-drop benytter de samme
// dnd-kit IDs som MonthWeekCalendar (`day:<date>`, `route:<id>`,
// `route-drop:<id>`) så al planlægger-logikken i RoutePlanner virker uændret.

import { compareDayRoutes } from "./lib/day-route-order";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Loader2, Sparkles, Plus, MapPin, ArrowDown, Repeat, ChevronDown, Inbox, Lock, GitMerge, ArrowRightLeft, AlertTriangle, CalendarArrowDown } from "lucide-react";
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
import EmptyState from "./EmptyState";
import { memo, useMemo, useState } from "react";
import type { CalendarRoute } from "./MonthWeekCalendar";
import { useTargetValidation, ringForSeverity, chipBgForSeverity } from "./drag-validation-context";
import RouteContextMenu from "./RouteContextMenu";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";
import type { StopCapacity } from "./lib/stop-capacity";
import { MoreHorizontal, Eye, History, Trash2 } from "lucide-react";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { PILL_BASE, PILL_VIRTUAL, PILL_COMPLETED, PILL_RAIL_WIDTH } from "./lib/card-styles";

const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const readableTokenOn = (color?: string | null) => {
  const hex = color?.trim().match(/^#?([0-9a-f]{6})$/i)?.[1];
  if (!hex) return "hsl(var(--background))";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.62 ? "hsl(var(--foreground))" : "hsl(var(--background))";
};

type Props = {
  view: "month" | "week";
  selectedDayOnly?: boolean;
  anchorDate: string;
  routes: CalendarRoute[];
  onAddAppointment?: (route: CalendarRoute) => void;
  onSelectRoute: (route: Route) => void;
  onSelectStop: (stop: RouteStop) => void;
  onCreateRoute: (date: string) => void;
  onOptimizeRoute: (routeId: string) => void;
  onDeleteRoute?: (route: CalendarRoute) => void;
  onShowHistory?: (route: CalendarRoute) => void;
  optimizingRouteId?: string | null;
  draggingType?: "job" | "route" | "stop" | null;
  draggingRouteId?: string | null;
  weatherByDate?: Map<string, WeatherDay>;
  loadingRoutes?: boolean;
  loadingWeather?: boolean;
  weatherError?: boolean;
  busyTargets?: Set<string>;
  capacityByDate?: Map<string, StopCapacity>;
  /** Sæt af rute-ids med medarbejder-tids-konflikt — vises som rødt badge. */
  conflictedRouteIds?: Set<string>;
};

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export const AgendaCalendar = ({
  view, selectedDayOnly = false, anchorDate, routes, onSelectRoute, onSelectStop,
  onCreateRoute, onOptimizeRoute, onDeleteRoute, onShowHistory, optimizingRouteId, draggingType, draggingRouteId, weatherByDate,
  loadingRoutes, loadingWeather, weatherError, busyTargets, capacityByDate, conflictedRouteIds, onAddAppointment,
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
      arr.sort(compareDayRoutes);
      m.set(k, arr);
    }
    return m;
  }, [routes]);

  // I månedsvisning skjuler vi tomme dage som ligger UDENFOR den aktive måned
  // for at undgå støj. Inden i måneden vises alle dage (også tomme), så
  // brugeren kan droppe en aftale på en tom dag.
  const visibleDays = useMemo(() => {
    if (selectedDayOnly) return [parseISO(anchorDate)];
    if (view === "week") return days;
    return days.filter((d) => isSameMonth(d, anchor) || (routesByDate.get(ymd(d))?.length ?? 0) > 0);
  }, [days, view, anchor, routesByDate, selectedDayOnly, anchorDate]);

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
    <div className="h-full min-h-0 overflow-y-auto overscroll-contain touch-pan-y rounded-lg bg-background">
      {grouped.map((grp) => (
        <div key={grp.week}>
          {!selectedDayOnly && <div className="sticky top-0 z-10 border-b bg-secondary/80 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
            Uge {grp.week}
          </div>}
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
                  onAddAppointment={onAddAppointment}
                  onSelectStop={onSelectStop}
                  onCreateRoute={onCreateRoute}
                  onOptimizeRoute={onOptimizeRoute}
                  onDeleteRoute={onDeleteRoute}
                  onShowHistory={onShowHistory}
                  optimizingRouteId={optimizingRouteId}
                  draggingType={draggingType}
                  draggingRouteId={draggingRouteId ?? null}
                  weather={weatherByDate?.get(dateStr) ?? null}
                  loadingRoutes={!!loadingRoutes}
                  loadingWeather={!!loadingWeather}
                  weatherError={!!weatherError}
                  busy={!!busyTargets?.has(`day:${dateStr}`)}
                  busyRouteIds={busyTargets}
                  capacity={capacityByDate?.get(dateStr) ?? null}
                  conflictedRouteIds={conflictedRouteIds}
                />
              );
            })}
          </ul>
        </div>
      ))}
      {grouped.length === 0 && (
        <EmptyState
          icon={<Inbox className="h-5 w-5" />}
          title="Ingen planlagte dage"
          description="Der er ingen ruter i denne periode endnu. Skift periode, eller træk en aftale ind på en dag for at komme i gang."
        />
      )}
    </div>
  );
};

type DayRowProps = {
  onAddAppointment?: (route: CalendarRoute) => void;
  date: Date;
  dateStr: string;
  todayIso: string;
  routes: CalendarRoute[];
  onSelectRoute: (route: Route) => void;
  onSelectStop: (stop: RouteStop) => void;
  onCreateRoute: (date: string) => void;
  onOptimizeRoute: (routeId: string) => void;
  onDeleteRoute?: (route: CalendarRoute) => void;
  onShowHistory?: (route: CalendarRoute) => void;
  optimizingRouteId?: string | null;
  draggingType?: "job" | "route" | "stop" | null;
  draggingRouteId?: string | null;
  weather?: WeatherDay | null;
  loadingRoutes?: boolean;
  loadingWeather?: boolean;
  weatherError?: boolean;
  busy?: boolean;
  busyRouteIds?: Set<string>;
  capacity?: StopCapacity | null;
  conflictedRouteIds?: Set<string>;
};

const DayRowInner = ({
  date, dateStr, todayIso, routes,
  onSelectRoute, onSelectStop, onCreateRoute, onOptimizeRoute, onDeleteRoute, onShowHistory, optimizingRouteId,
  draggingType, draggingRouteId, weather, loadingRoutes, loadingWeather, weatherError, busy, busyRouteIds, capacity, conflictedRouteIds, onAddAppointment,
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
  // Mange forventede ruter (fx korte testintervaller) må ikke drukne de faste
  // ruter. Vis alle faste + de første 3 forventede; resten bag en knap.
  const [showAllProjected, setShowAllProjected] = useState(false);
  const PROJECTED_PREVIEW = 3;
  const visibleRoutes = useMemo(() => {
    if (showAllProjected) return routes;
    let seen = 0;
    return routes.filter((r: any) => {
      if (!(r.isVirtual || r.isProjected)) return true;
      seen += 1;
      return seen <= PROJECTED_PREVIEW;
    });
  }, [routes, showAllProjected]);
  const hiddenProjected = routes.length - visibleRoutes.length;

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
      data-density-target="agenda-day"
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
          <span className={cn("text-xs font-semibold capitalize", today ? "text-accent" : "text-foreground")}>
            {today ? "I dag" : format(date, "EEEE", { locale: da })}
            <span className="ml-1 font-normal normal-case text-muted-foreground">{format(date, "d. MMM", { locale: da })}</span>
          </span>
          {routes.length > 0 && (() => {
            const projected = routes.filter((r: any) => r.isVirtual || r.isProjected).length;
            const real = routes.length - projected;
            return (
              <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                {real} {real === 1 ? "rute" : "ruter"}{projected > 0 ? ` · ${projected} forventede` : ""}
              </span>
            );
          })()}
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
              className="h-11 w-11 inline-flex items-center justify-center rounded-md border border-transparent text-muted-foreground hover:border-border hover:bg-card hover:text-foreground active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
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
      <div className="mt-2 flex flex-col gap-1.5" data-density-target="agenda-routes">
        {loadingRoutes && routes.length === 0 && (
          <div className="flex items-center gap-2 rounded-md border border-border/60 bg-card/80 px-3 py-2">
            <div className="h-2.5 w-2 rounded-sm bg-muted-foreground/20" />
            <div className="h-3 flex-1 rounded bg-muted/70 animate-pulse" />
            <div className="h-3 w-3 rounded-full bg-muted/70 animate-pulse" />
          </div>
        )}
        {visibleRoutes.map((r) => (
          <AgendaRoutePill
            key={r.id}
            route={r}
            onSelect={() => onSelectRoute(r)}
            onAddAppointment={onAddAppointment ? () => onAddAppointment(r) : undefined}
            onSelectStop={onSelectStop}
            onOptimize={() => onOptimizeRoute(r.id)}
            onDelete={onDeleteRoute ? () => onDeleteRoute(r) : undefined}
            onShowHistory={onShowHistory ? () => onShowHistory(r) : undefined}
            optimizing={optimizingRouteId === r.id}
            jobDragActive={isJobDragActive}
            routeDragSourceId={draggingType === "route" ? (draggingRouteId ?? null) : null}
            busy={!!busyRouteIds?.has(`route:${r.id}`)}
            isPast={isPast}
            hasAssigneeConflict={!!conflictedRouteIds?.has(r.id)}
          />
        ))}

        {(hiddenProjected > 0 || (showAllProjected && routes.length > PROJECTED_PREVIEW)) && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setShowAllProjected(v => !v); }}
            aria-expanded={showAllProjected}
            className="flex min-h-11 items-center justify-center rounded-md border border-dashed border-border text-xs font-medium text-muted-foreground hover:border-accent/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent lg:min-h-9"
          >
            {showAllProjected ? "Vis færre forventede" : `Vis ${hiddenProjected} flere forventede`}
          </button>
        )}

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
            className="flex min-h-10 items-center justify-center gap-1.5 rounded-md border border-dashed border-border py-2 text-[11px] font-medium text-muted-foreground hover:border-accent/50 hover:bg-accent/[0.04] hover:text-foreground active:bg-accent/[0.07] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            <Plus className="h-4 w-4" />
            Opret rute
          </button>
        )}
      </div>
       {capacity && capacity.stops_capacity > 0 && !isPast && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px] bg-border/40 overflow-hidden"
           title={`${capacity.stops_booked} af ${capacity.stops_capacity} stop planlagt`}
          aria-label={`${capacity.stops_booked} af ${capacity.stops_capacity} stop planlagt`}
        >
          <div
            className={cn(
              "h-full transition-[width] duration-300",
               capacity.stops_booked > capacity.stops_capacity
                ? "bg-destructive"
                : capacity.load_pct >= 90
                ? "bg-amber-500/80"
                : "bg-foreground/25",
            )}
            style={{ width: `${Math.min(100, capacity.load_pct)}%` }}
          />
        </div>
      )}
    </li>
  );
};

const DayRow = memo(DayRowInner);

/* ─── Rute-pille (agenda-variant: fuld bredde, mere plads) ─── */
type AgendaRoutePillProps = {
  onAddAppointment?: () => void;
  route: CalendarRoute;
  onSelect: () => void;
  onSelectStop: (stop: RouteStop) => void;
  onOptimize: () => void;
  onDelete?: () => void;
  onShowHistory?: () => void;
  optimizing: boolean;
  jobDragActive?: boolean;
  routeDragSourceId?: string | null;
  busy?: boolean;
  isPast?: boolean;
  hasAssigneeConflict?: boolean;
};

const AgendaRoutePillInner = ({ route, onSelect, onOptimize, onDelete, onShowHistory, optimizing, jobDragActive, routeDragSourceId, busy, isPast, hasAssigneeConflict, onAddAppointment }: AgendaRoutePillProps) => {
  const compactLayout = useIsBelowBreakpoint(1100);
  const isVirtual = !!route.isVirtual;
  const isMergeTarget = !!routeDragSourceId && routeDragSourceId !== route.id && !isVirtual && !isPast && !busy;
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `route:${route.id}`,
    data: { type: "route", route },
    disabled: compactLayout || isVirtual || !!busy,
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
  // Konsistent "udført"-visualisering ligesom MonthWeekCalendar's RoutePill:
  // 100% færdig (eller server-status = completed) → emerald baggrund + venstre-
  // rail + lille badge. Ellers vises en tynd progress-bar i bunden.
  const allStopsDone = !isVirtual && stopCount > 0 && completedCount === stopCount;
  const isRouteCompleted = !isVirtual && (route as any).status === "completed";
  const showAsCompleted = isRouteCompleted || allStopsDone;
  const progressPct = stopCount > 0 ? Math.round((completedCount / stopCount) * 100) : 0;
  const visibleEmployees = route.attachedEmployees.slice(0, 3);
  const extraEmployees = route.attachedEmployees.length - visibleEmployees.length;

  const canOptimizeInline = compactLayout && !isVirtual && !isPast && !showAsCompleted && stopCount >= 2;
  const canAddInline = !!onAddAppointment && !isVirtual && !isPast && !showAsCompleted;
  const showFooter = canOptimizeInline || canAddInline;
  const actionMenu = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label={`Handlinger for ${route.name || "ruten"}`} onClick={(e) => e.stopPropagation()}><MoreHorizontal /></Button></DropdownMenuTrigger>
      <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={onSelect}><Eye />Vis rute</DropdownMenuItem>
        {!isVirtual && stopCount >= 2 && <DropdownMenuItem disabled={busy || optimizing} onClick={onOptimize}><Sparkles className="h-4 w-4" />Optimér rute</DropdownMenuItem>}
        {!isVirtual && onShowHistory && <DropdownMenuItem onClick={onShowHistory}><History />Historik</DropdownMenuItem>}
        {!isVirtual && onDelete && <DropdownMenuItem disabled={busy} onClick={onDelete} className="text-destructive"><Trash2 />Slet rute</DropdownMenuItem>}
      </DropdownMenuContent>
    </DropdownMenu>
  );
  const pill = (
    <div
      ref={setRefs}
      data-route-drop-route-id={!isVirtual && !isPast ? route.id : undefined}
      data-route-drop-date={!isVirtual && !isPast ? route.route_date : undefined}
      data-route-pill=""
      data-density-target="agenda-route"
      onClick={(e) => { e.stopPropagation(); if (!isDragging) onSelect(); }}
      className={cn(
        PILL_BASE,
        "grid min-h-[88px] grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-2 pl-3 pr-2.5 py-2.5",
        isDragging && "opacity-40",
        isVirtual && PILL_VIRTUAL,
        isPast && "opacity-60 saturate-50 cursor-not-allowed",
        showAsCompleted && !isPast && PILL_COMPLETED,
        jobDragActive && isPast && "opacity-25 pointer-events-none",
        !isVirtual && isOver && !validation && "ring-2 ring-accent shadow-md",
        !isVirtual && isOver && validation && ringForSeverity(validation.severity),
        isMergeTarget && isOver && "shadow-md bg-accent/5",
        routeDragSourceId && !isMergeTarget && routeDragSourceId !== route.id && "opacity-40 pointer-events-none",
        busy && "cursor-wait",
      )}

      aria-busy={busy || undefined}
    >
      <span aria-hidden className={cn("absolute inset-y-0 left-0", PILL_RAIL_WIDTH)} style={{ backgroundColor: showAsCompleted ? "hsl(var(--success))" : route.color }} />
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
        {...(isVirtual || compactLayout ? {} : listeners)}
        {...(isVirtual || compactLayout ? {} : attributes)}
        role="button"
        tabIndex={0}
        aria-label={`Åbn ${route.name || "rute"}`}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(); } }}
        className={cn(
          "min-w-0 outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isVirtual || compactLayout ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        )}
      >
        <div className="text-sm font-semibold leading-snug flex flex-wrap items-center gap-1">
          {isVirtual && (
            <span
              className="inline-flex items-center gap-0.5 rounded-sm bg-muted px-1 py-px text-[9px] font-bold uppercase tracking-wide text-muted-foreground shrink-0"
            >
              <Lock className="h-2 w-2" />
              Forventet
            </span>
          )}
          {!isVirtual && isPast && (
            <span
              className="inline-flex items-center gap-0.5 rounded-sm bg-muted px-1 py-px text-[9px] font-bold uppercase tracking-wide text-muted-foreground shrink-0"
              aria-label="Låst — tidligere rute"
            >
              <Lock className="h-2 w-2" />
              Låst
            </span>
          )}
          {!isVirtual && route.isReplacement && (
            <span
              className="inline-flex items-center gap-0.5 rounded-sm bg-amber-500/15 text-amber-700 dark:text-amber-300 px-1 py-px text-[9px] font-bold uppercase tracking-wide shrink-0"
              aria-label={route.replacedFromDate
                ? `Flyttet hertil fra ${format(parseISO(route.replacedFromDate), "EEEE d. MMM", { locale: da })}`
                : "Flyttet hertil fra en anden dato"}
            >
              <CalendarArrowDown className="h-2 w-2" />
              Flyttet
            </span>
          )}
          {!isVirtual && hasAssigneeConflict && (
            <span
              className="inline-flex items-center gap-0.5 rounded-sm bg-destructive/15 text-destructive px-1 py-px text-[9px] font-bold uppercase tracking-wide shrink-0"
              aria-label="Konflikt: en tildelt medarbejder er booket til to ting samtidig samme dag"
            >
              <AlertTriangle className="h-2 w-2" />
              Konflikt
            </span>
          )}
          <span className="break-words">{route.name || `Rute (${format(parseISO(route.route_date), "d. MMM", { locale: da })})`}</span>
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground tabular-nums">
          {showAsCompleted ? (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-feature-cool/40 bg-feature-cool/10 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-feature-cool-foreground">
              ✓ Udført · {stopCount} stop
            </span>
          ) : isVirtual ? (
            <span className="font-semibold text-foreground/80">{stopCount} stop</span>
          ) : (
            <span className="font-semibold text-foreground/80">{completedCount} af {stopCount} udført</span>
          )}
          {compactLayout && route.attachedEmployees.length > 0 && (
            <span className="min-w-0 truncate">{route.attachedEmployees.map((e) => e.name.split(" ")[0]).join(", ")}</span>
          )}
          {compactLayout && route.attachedEmployees.length === 0 && !isVirtual && (
            <span className="text-destructive">Ingen medarbejder</span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-start gap-1">
      {visibleEmployees.length > 0 && (
        <div className="flex -space-x-1 shrink-0 pt-0.5">
          {visibleEmployees.map((emp) =>
            emp.avatar_url ? (
              <img key={emp.id} src={emp.avatar_url} alt={emp.name} loading="lazy" className="h-5 w-5 rounded-full object-cover ring-1 ring-background" />
            ) : (
              <span
                key={emp.id}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-background text-[9px] font-bold leading-none"
                style={{ background: emp.color || "hsl(var(--muted-foreground))", color: readableTokenOn(emp.color) }}
                aria-label={emp.name}
                title={emp.name}
              >
                {initials(emp.name)}
              </span>
            ),
          )}
          {extraEmployees > 0 && (
            <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-1 rounded-full text-[9px] font-bold ring-1 ring-background bg-muted text-muted-foreground">
              +{extraEmployees}
            </span>
          )}
        </div>
      )}
      {!showFooter && <div className="-mr-1.5 -mt-1.5" onClick={(e) => e.stopPropagation()}>{actionMenu}</div>}
      </div>

      {showFooter && (
      <div className="col-span-2 -mx-2.5 -mb-2.5 ml-[-0.75rem] flex items-center justify-end gap-1 border-t border-border/70 bg-secondary/20 px-2 py-1" onClick={(e) => e.stopPropagation()}>
      {compactLayout && !isVirtual && !isPast && !showAsCompleted && stopCount >= 2 && (
        <Button variant="outline" size="sm" className="h-11 shrink-0 gap-1 px-2 text-xs" aria-label={`Optimér ${route.name || "ruten"}`} disabled={busy || optimizing} onKeyDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onOptimize(); }}>
          {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}<span>Optimér</span>
        </Button>
      )}
      {onAddAppointment && !isVirtual && !isPast && !showAsCompleted && (
        <Button variant="outline" size="sm" className="h-11 shrink-0 gap-1 px-2 text-xs" aria-label={`Tilføj aftale til ${route.name || "ruten"}`} disabled={busy} onKeyDown={(e) => e.stopPropagation()} onPointerDown={(e) => e.stopPropagation()} onClick={(e) => { e.stopPropagation(); onAddAppointment(); }}>
          <Plus className="h-3.5 w-3.5" /><span className="hidden sm:inline">Tilføj aftale</span><span className="sm:hidden">Tilføj</span>
        </Button>
      )}
      {actionMenu}
      </div>
      )}
      {stopCount > 0 && !showAsCompleted && !isVirtual && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[3px] bg-secondary" aria-hidden="true">
          <div
            className="h-full bg-success transition-all duration-500"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      )}
    </div>
  );

  const isVirtualRoute = !!route.isVirtual;
  const canDelete = !!onDelete && !isVirtualRoute && !busy;
  const canOptimize = !isVirtualRoute && stopCount >= 2 && !busy;
  const canHistory = !!onShowHistory && !isVirtualRoute;

  return (
    <RouteContextMenu
      hide={{
        duplicate: true,
        move: true,
        "show-on-map": true,
        optimize: !canOptimize,
        delete: !canDelete,
        history: !canHistory,
      }}
      onAction={(action) => {
        if (action === "view") onSelect();
        else if (action === "optimize" && canOptimize) onOptimize();
        else if (action === "delete" && canDelete) onDelete?.();
        else if (action === "history" && canHistory) onShowHistory?.();
      }}
    >
      {pill}
    </RouteContextMenu>
  );
};

const AgendaRoutePill = memo(AgendaRoutePillInner);
