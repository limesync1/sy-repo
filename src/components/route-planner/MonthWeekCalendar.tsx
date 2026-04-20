// MonthWeekCalendar — klassisk kalender-overblik med måned/uge visning.
// - Ingen timer/tidsrum: hver dag er ét helt felt
// - Ugenumre vises i venstre side (ISO-uger)
// - Hver rute vises som farvet pille på sin route_date
// - Drag rute → ny dato (onMoveRoute)
// - Drag opgave fra opgavepool → ind på en rute eller tom dag
// - Klik rute → åbner rute-sheet (onSelectRoute)
// - Klik opgave → åbner stop-sheet (onSelectStop)

import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Plus, Users, MapPin, ArrowDown } from "lucide-react";
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, eachDayOfInterval, getISOWeek, isSameMonth, isToday, isSameDay,
} from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Route, RouteStop } from "@/hooks/useRoutes";

export type CalendarRoute = Route & {
  stops: RouteStop[];
  attachedEmployeeCount: number;
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
  /** Sat til 'job' når brugeren trækker en opgave fra opgavepoolen — får drop-targets til at lyse op. */
  draggingType?: "job" | "route" | null;
};

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export const MonthWeekCalendar = ({
  view, anchorDate, routes, onSelectRoute, onSelectStop,
  onCreateRoute, onOptimizeRoute, optimizingRouteId, draggingType,
}: Props) => {
  const anchor = parseISO(anchorDate);

  // Beregn dage at vise
  const days: Date[] = (() => {
    if (view === "week") {
      const ws = startOfWeek(anchor, { weekStartsOn: 1 });
      return eachDayOfInterval({ start: ws, end: addDays(ws, 6) });
    }
    // month: starter mandag inden månedens start, slutter søndag efter månedens slut
    const ms = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
    const me = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: ms, end: me });
  })();

  // Grupper dage i uger (rækker af 7)
  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  // Map route_date → routes
  const routesByDate = new Map<string, CalendarRoute[]>();
  for (const r of routes) {
    const arr = routesByDate.get(r.route_date) || [];
    arr.push(r);
    routesByDate.set(r.route_date, arr);
  }

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
};

const DayCell = ({
  date, dateStr, routes, inMonth, today,
  onSelectRoute, onSelectStop, onCreateRoute, onOptimizeRoute, optimizingRouteId, compact, draggingType,
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
        // Når en opgave eller rute trækkes — gør dage subtilt mere indbydende
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

      {/* Rute-piller */}
      <div className="flex-1 flex flex-col gap-1 min-h-0">
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

        {/* "Slip her" overlay på tomme dage når en opgave trækkes */}
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

/* ─── Rute-pille (drag + drop target for opgaver) ─── */
type RoutePillProps = {
  route: CalendarRoute;
  onSelect: () => void;
  onSelectStop: (stop: RouteStop) => void;
  onOptimize: () => void;
  optimizing: boolean;
  compact: boolean;
};

const RoutePill = ({ route, onSelect, onSelectStop, onOptimize, optimizing, compact }: RoutePillProps) => {
  // Drag-handle: hele pillen kan trækkes til ny dato
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `route:${route.id}`,
    data: { type: "route", route },
  });

  // Drop-zone: opgaver kan slippes på pillen for at blive tilføjet til ruten
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

  return (
    <div
      ref={setRefs}
      onClick={(e) => { e.stopPropagation(); if (!isDragging) onSelect(); }}
      className={cn(
        "relative rounded-md border-l-4 cursor-pointer transition-all overflow-hidden bg-card hover:shadow-sm",
        "border border-border/60",
        isDragging && "opacity-40",
        isOver && "ring-2 ring-accent",
      )}
      style={{ borderLeftColor: route.color }}
    >
      <div
        {...listeners}
        {...attributes}
        className="px-2 py-1 flex items-center justify-between gap-1 cursor-grab active:cursor-grabbing"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold truncate text-foreground leading-tight">
            {route.name || `Rute ${format(parseISO(route.route_date), "d/M")}`}
          </p>
          {!compact && (
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground tabular-nums mt-0.5">
              <Users className="h-2.5 w-2.5" />{route.attachedEmployeeCount}
              <span className="mx-0.5">·</span>
              <MapPin className="h-2.5 w-2.5" />{stopCount}
              {completedCount > 0 && <span className="text-emerald-600">({completedCount}✓)</span>}
            </div>
          )}
          {compact && stopCount > 0 && (
            <p className="text-[9px] text-muted-foreground tabular-nums">
              {stopCount} stop{stopCount === 1 ? "" : ""}
            </p>
          )}
        </div>
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