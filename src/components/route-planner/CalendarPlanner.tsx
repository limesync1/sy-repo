// CalendarPlanner — Squidbiz-style time-grid view
// Vertical: 06:00-20:00 in 15-min slots
// Horizontal: one column per ROUTE (a route can have multiple employees attached)
// Each stop is assigned to ONE of the route's employees via dropdown.
// Drag-drop: from sidebar OR between slots — drop on a time slot to set planned_arrival.

import { useEffect, useState } from "react";
import { useDroppable, useDraggable, useDndContext } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, Sparkles, Navigation, Clock, MapPin, AlertCircle,
  GripVertical, UserPlus, MoreVertical, Trash2, UserCheck,
  Inbox, CheckCircle2, PlayCircle, Wand2, ZoomIn, ZoomOut,
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import type { RouteStop } from "@/hooks/useRoutes";

const SLOT_MIN = 15;
const START_HOUR = 6;
const END_HOUR = 20;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;
// Tre zoom-niveauer giver hhv. komprimeret/normal/spacious visning.
// SLOT_HEIGHT er pixel-højden af 1 slot (15 min). Ganges blot ved zoom.
const ZOOM_LEVELS: Record<"compact" | "normal" | "spacious", number> = {
  compact: 14,   // svarer til "se 60 min/række" — komprimeret oversigt
  normal: 22,    // standard
  spacious: 36,  // detaljeret, mest plads pr. stop
};
type ZoomLevel = keyof typeof ZOOM_LEVELS;

export type EmployeeOption = {
  id: string;
  name: string;
  color: string;
};

export type CalendarColumn = {
  routeId: string;
  label: string;
  subtitle?: string;
  color: string;
  stops: RouteStop[];
  attachedEmployees: EmployeeOption[];
  availableEmployees: EmployeeOption[];
  totalKm?: number | null;
  totalMin?: number | null;
  routeStatus?: string;
  optimizedAt?: string | null;
  onOptimize?: () => void;
  onAutoAssign?: () => void;
  onAttachEmployee?: (employeeId: string) => void;
  onDetachEmployee?: (employeeId: string) => void;
  onDeleteRoute?: () => void;
  onAssignStop?: (stopId: string, employeeId: string | null) => void;
  optimizing?: boolean;       // pr-rute spinner
  autoAssigning?: boolean;
};

type Props = {
  routeDate: string;
  columns: CalendarColumn[];
  selectedStopId?: string | null;
  onSelectStop?: (id: string) => void;
};

const arrivalToMinutes = (iso: string | null): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.getHours() * 60 + d.getMinutes();
};

const minutesToY = (mins: number): number => {
  const offset = mins - START_HOUR * 60;
  return (offset / SLOT_MIN) * SLOT_HEIGHT;
};

// Lane-allokering à la Google Calendar:
// Stops der overlapper i tid grupperes i "clusters" og fordeles på baner side-om-side.
// Returnerer Map<stopId, { lane, lanes, conflictWithSameEmployee }>.
type StopLayout = { lane: number; lanes: number; conflictWithSameEmployee: boolean };
const computeStopLayouts = (stops: RouteStop[]): Map<string, StopLayout> => {
  const result = new Map<string, StopLayout>();
  type Entry = { stop: RouteStop; start: number; end: number };
  const entries: Entry[] = stops
    .map((s) => {
      const start = arrivalToMinutes(s.planned_arrival);
      if (start == null) return null;
      const end = start + Math.max(s.duration_minutes, SLOT_MIN);
      return { stop: s, start, end };
    })
    .filter((x): x is Entry => x !== null)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  // Gruppér i clusters af kontinuerligt overlappende stops
  let cluster: Entry[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    if (cluster.length === 0) return;
    // Tildel baner via grådig algoritme
    const laneEnds: number[] = []; // sluttid for sidste stop i hver bane
    const lanes: number[] = [];
    for (const e of cluster) {
      let assigned = -1;
      for (let i = 0; i < laneEnds.length; i++) {
        if (laneEnds[i] <= e.start) { assigned = i; break; }
      }
      if (assigned === -1) { assigned = laneEnds.length; laneEnds.push(e.end); }
      else { laneEnds[assigned] = e.end; }
      lanes.push(assigned);
    }
    const totalLanes = laneEnds.length;
    // Tjek om flere stops i clusteret deler samme medarbejder = reel konflikt
    const empCount = new Map<string, number>();
    for (const e of cluster) {
      const k = e.stop.assigned_employee_id || "";
      if (!k) continue;
      empCount.set(k, (empCount.get(k) || 0) + 1);
    }
    cluster.forEach((e, i) => {
      const empKey = e.stop.assigned_employee_id || "";
      const conflict = empKey ? (empCount.get(empKey) || 0) > 1 : false;
      result.set(e.stop.id, { lane: lanes[i], lanes: totalLanes, conflictWithSameEmployee: conflict });
    });
    cluster = [];
    clusterEnd = -Infinity;
  };

  for (const e of entries) {
    if (e.start >= clusterEnd) flush();
    cluster.push(e);
    clusterEnd = Math.max(clusterEnd, e.end);
  }
  flush();
  return result;
};

const slotIndexToTimeLabel = (i: number): string => {
  const totalMin = START_HOUR * 60 + i * SLOT_MIN;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const CalendarPlanner = ({ routeDate, columns, selectedStopId, onSelectStop }: Props) => {
  // Live "now" line, only when viewing today
  const [nowMin, setNowMin] = useState<number | null>(null);
  useEffect(() => {
    const isViewingToday = isToday(parseISO(routeDate));
    if (!isViewingToday) { setNowMin(null); return; }
    const update = () => {
      const d = new Date();
      const total = d.getHours() * 60 + d.getMinutes();
      if (total >= START_HOUR * 60 && total <= END_HOUR * 60) setNowMin(total);
      else setNowMin(null);
    };
    update();
    const id = setInterval(update, 60_000);
    return () => clearInterval(id);
  }, [routeDate]);

  if (columns.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center p-8 text-center">
        <div className="space-y-3 max-w-sm">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
            <Inbox className="h-7 w-7 text-primary" />
          </div>
          <h3 className="text-base font-semibold">Ingen ruter for denne dag</h3>
          <p className="text-sm text-muted-foreground">
            Klik på <span className="font-medium text-foreground">"Opret rute"</span> i toppen for at planlægge en arbejdsdag.
            Du kan tilkoble medarbejdere og trække opgaver ind i kalenderen.
          </p>
        </div>
      </Card>
    );
  }

  const nowY = nowMin != null ? minutesToY(nowMin) : null;

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      {/* Column headers */}
      <div
        className="grid border-b bg-background sticky top-0 z-20"
        style={{ gridTemplateColumns: `64px repeat(${columns.length}, minmax(240px, 1fr))` }}
      >
        <div className="border-r p-2 text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-center">
          Tid
        </div>
        {columns.map((col) => (
          <ColumnHeader key={col.routeId} col={col} />
        ))}
      </div>

      {/* Scrollable grid body */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: `64px repeat(${columns.length}, minmax(240px, 1fr))`,
            height: `${TOTAL_SLOTS * SLOT_HEIGHT}px`,
          }}
        >
          {/* Time gutter */}
          <div className="border-r relative bg-secondary/20">
            {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
              <div
                key={i}
                className={`absolute left-0 right-0 ${i % SLOTS_PER_HOUR === 0 ? "border-t border-border" : ""}`}
                style={{ top: `${i * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
              >
                {i % SLOTS_PER_HOUR === 0 && (
                  <span className="absolute -top-2.5 right-1.5 text-[10px] text-muted-foreground bg-secondary/20 px-1 font-medium tabular-nums">
                    {slotIndexToTimeLabel(i)}
                  </span>
                )}
              </div>
            ))}
          </div>

          {columns.map((col) => (
            <CalendarColumnView
              key={col.routeId}
              col={col}
              routeDate={routeDate}
              selectedStopId={selectedStopId}
              onSelectStop={onSelectStop}
            />
          ))}

          {/* Now line — spans all columns */}
          {nowY != null && (
            <div
              className="absolute left-0 right-0 z-30 pointer-events-none flex items-center"
              style={{ top: `${nowY}px` }}
            >
              <div className="w-16 flex justify-end pr-1">
                <span className="text-[9px] font-bold text-destructive bg-background border border-destructive/30 rounded px-1 tabular-nums">
                  {format(new Date(), "HH:mm")}
                </span>
              </div>
              <div className="flex-1 h-px bg-destructive/70" />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
};

const ColumnHeader = ({ col }: { col: CalendarColumn }) => {
  const completed = col.stops.filter((s) => s.status === "completed").length;
  const inProgress = col.stops.filter((s) => s.status === "in_progress").length;
  const unattached = col.availableEmployees.filter(
    (e) => !col.attachedEmployees.find((a) => a.id === e.id),
  );
  const unassignedCount = col.stops.filter((s) => !s.assigned_employee_id).length;
  // Tæl unikke konflikter: stops hvor samme medarbejder har overlappende tider
  const layouts = computeStopLayouts(col.stops);
  const conflictCount = Array.from(layouts.values()).filter((l) => l.conflictWithSameEmployee).length;

  return (
    <div
      className="border-r p-2 flex flex-col gap-1.5 min-w-0 border-t-2"
      style={{ borderTopColor: col.color }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <p className="text-sm font-semibold truncate flex-1">{col.label}</p>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            <DropdownMenuLabel className="text-xs">Rute-handlinger</DropdownMenuLabel>
            {col.onOptimize && col.stops.length >= 2 && (
              <DropdownMenuItem onClick={col.onOptimize} disabled={col.optimizing}>
                <Sparkles className="h-3.5 w-3.5 mr-2" />Optimér rækkefølge
              </DropdownMenuItem>
            )}
            {col.onAutoAssign && col.attachedEmployees.length >= 2 && (
              <DropdownMenuItem onClick={col.onAutoAssign} disabled={col.autoAssigning}>
                <Wand2 className="h-3.5 w-3.5 mr-2" />Fordel opgaver
              </DropdownMenuItem>
            )}
            {col.onDeleteRoute && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={col.onDeleteRoute}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />Slet rute
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {col.subtitle && (
        <p className="text-[10px] text-muted-foreground truncate flex items-center gap-1">
          <MapPin className="h-2.5 w-2.5 shrink-0" />{col.subtitle}
        </p>
      )}

      {/* Employee chips */}
      <div className="flex flex-wrap gap-1 items-center">
        {col.attachedEmployees.map((emp) => (
          <DropdownMenu key={emp.id}>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] hover:opacity-80 transition-opacity"
                style={{ background: emp.color, color: "white" }}
                title={emp.name}
              >
                <span className="truncate max-w-[80px] font-medium">{emp.name.split(" ")[0]}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-xs">{emp.name}</DropdownMenuLabel>
              {col.onDetachEmployee && (
                <DropdownMenuItem
                  className="text-destructive focus:text-destructive"
                  onClick={() => col.onDetachEmployee?.(emp.id)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-2" />Fjern fra rute
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        ))}

        {unattached.length > 0 && col.onAttachEmployee && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" className="h-5 px-1.5 gap-0.5 text-[10px]">
                <UserPlus className="h-2.5 w-2.5" />Tilkobl
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-xs">Tilkobl medarbejder</DropdownMenuLabel>
              {unattached.map((e) => (
                <DropdownMenuItem key={e.id} onClick={() => col.onAttachEmployee?.(e.id)}>
                  <span
                    className="h-2 w-2 rounded-full mr-2"
                    style={{ background: e.color }}
                  />
                  {e.name}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        )}

        {col.attachedEmployees.length === 0 && unattached.length === 0 && (
          <span className="text-[10px] text-muted-foreground italic">Ingen medarbejdere</span>
        )}
      </div>

      {/* Stats badges */}
      <div className="flex flex-wrap gap-1 items-center">
        <Badge variant="secondary" className="text-[9px] h-4 px-1 tabular-nums">
          {col.stops.length} stop
        </Badge>
        {completed > 0 && (
          <Badge className="text-[9px] h-4 px-1 gap-0.5 bg-emerald-100 text-emerald-700 border-0 tabular-nums">
            <CheckCircle2 className="h-2.5 w-2.5" />{completed}
          </Badge>
        )}
        {inProgress > 0 && (
          <Badge className="text-[9px] h-4 px-1 gap-0.5 bg-blue-100 text-blue-700 border-0 tabular-nums">
            <PlayCircle className="h-2.5 w-2.5" />{inProgress}
          </Badge>
        )}
        {unassignedCount > 0 && col.attachedEmployees.length > 0 && (
          <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 border-orange-300 text-orange-700 bg-orange-50 tabular-nums">
            <AlertCircle className="h-2.5 w-2.5" />{unassignedCount} utildelt
          </Badge>
        )}
        {conflictCount > 0 && (
          <Badge
            variant="outline"
            className="text-[9px] h-4 px-1 gap-0.5 border-destructive/50 text-destructive bg-destructive/5 tabular-nums"
            title="Samme medarbejder har overlappende tider"
          >
            <AlertCircle className="h-2.5 w-2.5" />{conflictCount} konflikt
          </Badge>
        )}
        {col.totalKm != null && col.totalKm > 0 && (
          <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 tabular-nums">
            <Navigation className="h-2.5 w-2.5" />{col.totalKm.toFixed(1)} km
          </Badge>
        )}
        {col.totalMin != null && col.totalMin > 0 && (
          <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5 tabular-nums">
            <Clock className="h-2.5 w-2.5" />{Math.floor(col.totalMin / 60)}t {col.totalMin % 60}m
          </Badge>
        )}
      </div>

      {/* Action buttons */}
      {(col.onAutoAssign || col.onOptimize) && col.stops.length > 0 && (
        <div className="flex gap-1">
          {col.onAutoAssign && col.attachedEmployees.length >= 2 && unassignedCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] gap-1 px-1.5 flex-1 hover:bg-accent hover:text-accent-foreground"
              onClick={col.onAutoAssign}
              disabled={col.autoAssigning}
              title={`Fordel ${unassignedCount} utildelte stops jævnt mellem medarbejdere`}
            >
              {col.autoAssigning ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Wand2 className="h-2.5 w-2.5" />}
              Fordel {unassignedCount}
            </Button>
          )}
          {col.onOptimize && col.stops.length >= 2 && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-[10px] gap-1 px-1.5 flex-1 hover:bg-primary hover:text-primary-foreground hover:border-primary"
              onClick={col.onOptimize}
              disabled={col.optimizing}
              title="Optimerer rækkefølgen for hver medarbejder på denne rute, baseret på live trafik"
            >
              {col.optimizing ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
              {col.optimizing ? "Optimerer..." : "Optimér"}
            </Button>
          )}
        </div>
      )}

      {col.optimizedAt && !col.optimizing && (
        <p className="text-[9px] text-muted-foreground italic flex items-center gap-1">
          <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
          Optimeret {format(new Date(col.optimizedAt), "HH:mm")}
        </p>
      )}
    </div>
  );
};

const CalendarColumnView = ({
  col, routeDate, selectedStopId, onSelectStop,
}: {
  col: CalendarColumn;
  routeDate: string;
  selectedStopId?: string | null;
  onSelectStop?: (id: string) => void;
}) => {
  const isEmpty = col.stops.length === 0;
  const layouts = computeStopLayouts(col.stops);
  return (
    <div className="border-r relative bg-background">
      {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
        <SlotCell key={i} slotIndex={i} routeId={col.routeId} routeDate={routeDate} />
      ))}

      {isEmpty && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 px-3 pointer-events-none">
          <div className="border-2 border-dashed border-border rounded-md p-3 text-center">
            <p className="text-[10px] text-muted-foreground italic">
              Træk opgaver herind ↓
            </p>
          </div>
        </div>
      )}

      {col.stops.map((stop) => {
        const layout = layouts.get(stop.id) || { lane: 0, lanes: 1, conflictWithSameEmployee: false };
        return (
          <StopBlock
            key={stop.id}
            stop={stop}
            color={
              stop.assigned_employee_id
                ? col.attachedEmployees.find((e) => e.id === stop.assigned_employee_id)?.color ?? col.color
                : col.color
            }
            attachedEmployees={col.attachedEmployees}
            isSelected={selectedStopId === stop.id}
            onSelect={() => onSelectStop?.(stop.id)}
            onAssign={col.onAssignStop}
            lane={layout.lane}
            lanes={layout.lanes}
            hasConflict={layout.conflictWithSameEmployee}
          />
        );
      })}
    </div>
  );
};

const SlotCell = ({
  slotIndex, routeId, routeDate,
}: {
  slotIndex: number;
  routeId: string;
  routeDate: string;
}) => {
  const totalMin = START_HOUR * 60 + slotIndex * SLOT_MIN;
  const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  const slotTime = `${hh}:${mm}`;
  const { setNodeRef, isOver } = useDroppable({
    id: `slot-${routeId}-${slotIndex}`,
    data: { type: "slot", routeId, routeDate, slotTime, slotMinutes: totalMin },
  });
  const isHourBoundary = slotIndex % SLOTS_PER_HOUR === 0;
  const isHalfHour = slotIndex % 2 === 0 && !isHourBoundary;
  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 transition-colors ${
        isOver ? "bg-primary/15 ring-1 ring-primary ring-inset"
          : isHourBoundary ? "border-t border-border"
          : isHalfHour ? "border-t border-border/40"
          : ""
      }`}
      style={{ top: `${slotIndex * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
    >
      {isOver && (
        <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-primary bg-background border border-primary rounded px-1.5 py-0.5 shadow-sm tabular-nums">
          {slotTime}
        </span>
      )}
    </div>
  );
};

const StopBlock = ({
  stop, color, attachedEmployees, isSelected, onSelect, onAssign,
  lane = 0, lanes = 1, hasConflict = false,
}: {
  stop: RouteStop;
  color: string;
  attachedEmployees: EmployeeOption[];
  isSelected: boolean;
  onSelect: () => void;
  onAssign?: (stopId: string, employeeId: string | null) => void;
  lane?: number;
  lanes?: number;
  hasConflict?: boolean;
}) => {
  const arrivalMin = arrivalToMinutes(stop.planned_arrival);
  if (arrivalMin == null || arrivalMin < START_HOUR * 60 || arrivalMin >= END_HOUR * 60) return null;
  const top = minutesToY(arrivalMin);
  const heightPx = Math.max((stop.duration_minutes / SLOT_MIN) * SLOT_HEIGHT, SLOT_HEIGHT * 1.5);

  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: stop.id,
    data: { type: "stop", stop },
  });

  const isDone = stop.status === "completed";
  const isInProgress = stop.status === "in_progress";
  const hasCoords = stop.latitude != null && stop.longitude != null;
  const arrivalLabel = stop.planned_arrival ? format(new Date(stop.planned_arrival), "HH:mm") : "";
  const departureLabel = stop.planned_departure ? format(new Date(stop.planned_departure), "HH:mm") : "";
  const assignedEmp = stop.assigned_employee_id
    ? attachedEmployees.find((e) => e.id === stop.assigned_employee_id)
    : null;
  const isUnassigned = !assignedEmp && attachedEmployees.length > 0;

  // Side-om-side layout ved overlap. Lille overlap (4%) for visuel "stack"-effekt
  // når de ikke er valgt — gør det tydeligt at der er flere uden at miste klikflade.
  const widthPct = lanes > 1 ? (100 / lanes) : 100;
  const leftPct = lanes > 1 ? lane * widthPct : 0;

  return (
    <div
      ref={setNodeRef}
      className={`absolute rounded-md border bg-background shadow-sm overflow-hidden cursor-pointer transition-all z-10 ${
        isDragging ? "opacity-40 scale-95" : ""
      } ${
        isSelected ? "ring-2 ring-primary border-primary shadow-lg z-30"
          : isDone ? "opacity-60"
          : "hover:shadow-md hover:z-20 hover:border-foreground/30"
      } ${hasConflict ? "ring-1 ring-destructive/60" : ""}`}
      style={{
        top: `${top}px`,
        height: `${heightPx}px`,
        left: `calc(${leftPct}% + 2px)`,
        width: `calc(${widthPct}% - 4px)`,
        borderLeftWidth: "4px",
        borderLeftColor: color,
        background: isDone ? "hsl(var(--secondary))" : undefined,
      }}
      onClick={onSelect}
    >
      <div className="flex items-start gap-1 p-1.5 h-full">
        <span
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing shrink-0 opacity-30 hover:opacity-100 transition-opacity"
        >
          <GripVertical className="h-3 w-3" />
        </span>
        <div className="flex-1 min-w-0 overflow-hidden">
          {/* Title row */}
          <div className="flex items-center gap-1">
            <p className={`text-xs font-semibold truncate flex-1 leading-tight ${isDone ? "line-through" : ""}`}>
              {stop.customer_name || "Stop"}
            </p>
            {isDone && <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />}
            {isInProgress && (
              <span title="I gang" className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
            )}
            {!hasCoords && (
              <span title="Mangler GPS koordinater"><AlertCircle className="h-3 w-3 text-orange-500 shrink-0" /></span>
            )}
          </div>

          {/* Time + duration */}
          {arrivalLabel && (
            <p className="text-[9px] text-muted-foreground flex items-center gap-1 mt-0.5 tabular-nums">
              <Clock className="h-2 w-2" />{arrivalLabel}
              {departureLabel && `–${departureLabel}`}
              <span className="ml-auto font-medium">{stop.duration_minutes}m</span>
            </p>
          )}

          {/* Service summary */}
          {stop.service_summary && heightPx >= SLOT_HEIGHT * 2 && (
            <p className="text-[10px] text-foreground/70 truncate mt-0.5">
              {stop.service_summary}
            </p>
          )}

          {/* Address */}
          {stop.address && heightPx >= SLOT_HEIGHT * 2.5 && (
            <p className="text-[9px] text-muted-foreground truncate flex items-center gap-0.5 mt-0.5">
              <MapPin className="h-2 w-2 shrink-0" />{stop.address}
            </p>
          )}

          {/* Assigned-employee badge / picker */}
          {onAssign && heightPx >= SLOT_HEIGHT * 1.8 && (
            <div onClick={(e) => e.stopPropagation()} className="mt-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`inline-flex items-center gap-1 rounded px-1 py-0.5 text-[9px] font-medium transition-colors ${
                      assignedEmp
                        ? "text-white"
                        : isUnassigned
                          ? "bg-orange-50 border border-orange-300 text-orange-700 hover:bg-orange-100"
                          : "border border-border text-muted-foreground hover:bg-secondary"
                    }`}
                    style={assignedEmp ? { background: assignedEmp.color } : undefined}
                  >
                    <UserCheck className="h-2.5 w-2.5" />
                    {assignedEmp ? assignedEmp.name.split(" ")[0] : "Tildel"}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-44">
                  <DropdownMenuLabel className="text-xs">Tildel medarbejder</DropdownMenuLabel>
                  {attachedEmployees.length === 0 && (
                    <DropdownMenuItem disabled className="text-xs italic">
                      Tilkobl medarbejdere først
                    </DropdownMenuItem>
                  )}
                  {attachedEmployees.map((e) => (
                    <DropdownMenuItem key={e.id} onClick={() => onAssign(stop.id, e.id)}>
                      <span className="h-2 w-2 rounded-full mr-2" style={{ background: e.color }} />
                      {e.name}
                    </DropdownMenuItem>
                  ))}
                  {assignedEmp && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => onAssign(stop.id, null)}>
                        Fjern tildeling
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {/* Time window */}
          {stop.time_window_start && heightPx >= SLOT_HEIGHT * 4 && (
            <Badge variant="outline" className="h-3.5 text-[9px] px-1 gap-0.5 mt-0.5 border-amber-300 text-amber-700 bg-amber-50">
              {stop.time_window_start.slice(0, 5)}
              {stop.time_window_end && `–${stop.time_window_end.slice(0, 5)}`}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
