// CalendarPlanner — Squidbiz-style time-grid view
// Vertical: 06:00–20:00 i 15-min slots (snap altid 15 min)
// Horisontalt: én kolonne pr. RUTE; flere medarbejdere kan være tilkoblet
// Zoom-toggle: kompakt / normal / bred — skalerer pixel-højden på slots.
// Drag-drop snapper til 15 min, viser et live ghost-preview i target-slot.

import { createContext, useContext, useEffect, useState } from "react";
import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, Sparkles, Navigation, Clock, MapPin, AlertCircle,
  UserPlus, MoreVertical, Trash2, UserCheck,
  Inbox, CheckCircle2, PlayCircle, Wand2, ZoomIn, ZoomOut,
} from "lucide-react";
import { format, isToday, parseISO } from "date-fns";
import type { RouteStop } from "@/hooks/useRoutes";

const SLOT_MIN = 15;          // snap-interval (altid 15 min)
const START_HOUR = 6;
const END_HOUR = 20;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;

// Zoom-niveauer styrer pixel-højden af 1 slot (15 min). Snap forbliver 15 min.
type ZoomLevel = "compact" | "normal" | "spacious";
const ZOOM_PX: Record<ZoomLevel, number> = { compact: 14, normal: 22, spacious: 36 };
const ZOOM_LABEL: Record<ZoomLevel, string> = { compact: "Kompakt", normal: "Normal", spacious: "Bred" };

// Context så alle interne komponenter læser slot-højden uden prop-drilling
const SlotHeightCtx = createContext<number>(ZOOM_PX.normal);
const useSlotHeight = () => useContext(SlotHeightCtx);

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
  /** Single-employee assign (kompatibilitet — sætter stop til 1 medarbejder, fjerner andre). */
  onAssignStop?: (stopId: string, employeeId: string | null) => void;
  /** Toggle medarbejder på multi-medarbejder stop. */
  onToggleAssignee?: (stopId: string, employeeId: string) => void;
  optimizing?: boolean;
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

// Lane-allokering à la Google Calendar:
// Stops der overlapper i tid grupperes i clusters og fordeles på baner side-om-side.
type StopLayout = { lane: number; lanes: number; conflictWithSameEmployee: boolean };
const computeStopLayouts = (stops: RouteStop[]): Map<string, StopLayout> => {
  const result = new Map<string, StopLayout>();
  type Entry = { stop: RouteStop; start: number; end: number };
  const assigneeIdsForStop = (stop: RouteStop) =>
    Array.isArray(stop.assignee_ids) && stop.assignee_ids.length > 0
      ? stop.assignee_ids
      : stop.assigned_employee_id
        ? [stop.assigned_employee_id]
        : [];
  const entries: Entry[] = stops
    .map((s) => {
      const start = arrivalToMinutes(s.planned_arrival);
      if (start == null) return null;
      const end = start + Math.max(s.duration_minutes, SLOT_MIN);
      return { stop: s, start, end };
    })
    .filter((x): x is Entry => x !== null)
    .sort((a, b) => a.start - b.start || a.end - b.end);

  let cluster: Entry[] = [];
  let clusterEnd = -Infinity;
  const flush = () => {
    if (cluster.length === 0) return;
    const laneEnds: number[] = [];
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
    cluster.forEach((e, i) => {
      const assigneeIds = assigneeIdsForStop(e.stop);
      const conflict = cluster.some((other) => {
        if (other.stop.id === e.stop.id) return false;
        if (e.start >= other.end || e.end <= other.start) return false;
        const otherAssignees = assigneeIdsForStop(other.stop);
        return assigneeIds.some((id) => otherAssignees.includes(id));
      });
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
  // Persistér zoom mellem sessioner
  const [zoom, setZoom] = useState<ZoomLevel>(() => {
    if (typeof window === "undefined") return "normal";
    const saved = window.localStorage.getItem("planner-zoom") as ZoomLevel | null;
    return saved && saved in ZOOM_PX ? saved : "normal";
  });
  useEffect(() => {
    if (typeof window !== "undefined") window.localStorage.setItem("planner-zoom", zoom);
  }, [zoom]);
  const slotHeight = ZOOM_PX[zoom];

  // Tastatur: + / - til at zoome
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "+" || e.key === "=") {
        setZoom((z) => (z === "compact" ? "normal" : z === "normal" ? "spacious" : "spacious"));
      } else if (e.key === "-" || e.key === "_") {
        setZoom((z) => (z === "spacious" ? "normal" : z === "normal" ? "compact" : "compact"));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Live "now" line, kun for i dag
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
            Du kan tilkoble medarbejdere og trække aftaler ind i kalenderen.
          </p>
        </div>
      </Card>
    );
  }

  const minutesToY = (mins: number) => ((mins - START_HOUR * 60) / SLOT_MIN) * slotHeight;
  const nowY = nowMin != null ? minutesToY(nowMin) : null;

  return (
    <SlotHeightCtx.Provider value={slotHeight}>
      <Card className="overflow-hidden flex flex-col h-full">
        {/* Zoom-bar */}
        <div className="flex items-center justify-between gap-2 px-2 py-1 border-b bg-secondary/30 shrink-0">
          <p className="text-[10px] text-muted-foreground">
            {columns.length} {columns.length === 1 ? "rute" : "ruter"} · 15-min snap
          </p>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setZoom((z) => (z === "spacious" ? "normal" : "compact"))}
              disabled={zoom === "compact"}
              aria-label="Zoom ud"
              title="Zoom ud (-)"
            >
              <ZoomOut className="h-3.5 w-3.5" />
            </Button>
            <span className="text-[10px] font-medium tabular-nums w-14 text-center text-muted-foreground">
              {ZOOM_LABEL[zoom]}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setZoom((z) => (z === "compact" ? "normal" : "spacious"))}
              disabled={zoom === "spacious"}
              aria-label="Zoom ind"
              title="Zoom ind (+)"
            >
              <ZoomIn className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Kolonne-headere */}
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
              height: `${TOTAL_SLOTS * slotHeight}px`,
            }}
          >
            {/* Tids-gutter */}
            <div className="border-r relative bg-secondary/20">
              {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
                <div
                  key={i}
                  className={`absolute left-0 right-0 ${i % SLOTS_PER_HOUR === 0 ? "border-t border-border" : ""}`}
                  style={{ top: `${i * slotHeight}px`, height: `${slotHeight}px` }}
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

            {/* Now-linje */}
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
    </SlotHeightCtx.Provider>
  );
};

const ColumnHeader = ({ col }: { col: CalendarColumn }) => {
  const completed = col.stops.filter((s) => s.status === "completed").length;
  const inProgress = col.stops.filter((s) => s.status === "in_progress").length;
  const unattached = col.availableEmployees.filter(
    (e) => !col.attachedEmployees.find((a) => a.id === e.id),
  );
  const unassignedCount = col.stops.filter((s) => !s.assigned_employee_id).length;
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
                <Wand2 className="h-3.5 w-3.5 mr-2" />Fordel aftaler
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

      {/* Medarbejder-chips */}
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
              Træk aftaler herind ↓
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
  const slotHeight = useSlotHeight();
  const totalMin = START_HOUR * 60 + slotIndex * SLOT_MIN;
  const hh = String(Math.floor(totalMin / 60)).padStart(2, "0");
  const mm = String(totalMin % 60).padStart(2, "0");
  const slotTime = `${hh}:${mm}`;
  const { setNodeRef, isOver, active } = useDroppable({
    id: `slot-${routeId}-${slotIndex}`,
    data: { type: "slot", routeId, routeDate, slotTime, slotMinutes: totalMin },
  });
  const isHourBoundary = slotIndex % SLOTS_PER_HOUR === 0;
  const isHalfHour = slotIndex % 2 === 0 && !isHourBoundary;

  // Beregn varighed på det stop/job der trækkes — bruges til preview-overlay
  const dragData: any = active?.data?.current;
  let dragDurationMin = 0;
  if (dragData?.type === "stop") dragDurationMin = dragData.stop?.duration_minutes || 30;
  else if (dragData?.type === "job") dragDurationMin = 30; // standard for nye stops

  const previewHeight = isOver && dragDurationMin > 0
    ? Math.max((dragDurationMin / SLOT_MIN) * slotHeight, slotHeight * 1.5)
    : 0;
  const endMin = totalMin + dragDurationMin;
  const endHH = String(Math.floor(endMin / 60)).padStart(2, "0");
  const endMM = String(endMin % 60).padStart(2, "0");

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 transition-colors ${
        isOver ? "bg-primary/10 ring-1 ring-primary ring-inset"
          : isHourBoundary ? "border-t border-border"
          : isHalfHour ? "border-t border-border/40"
          : ""
      }`}
      style={{ top: `${slotIndex * slotHeight}px`, height: `${slotHeight}px` }}
    >
      {isOver && previewHeight > 0 && (
        <>
          {/* Ghost-block der viser præcist hvor stoppet lander */}
          <div
            className="absolute left-1 right-1 rounded-md border-2 border-dashed border-primary bg-primary/15 pointer-events-none z-20"
            style={{ top: 0, height: `${previewHeight}px` }}
          >
            <div className="flex flex-col items-center justify-center h-full text-primary px-1">
              <span className="text-[10px] font-bold tabular-nums leading-none">
                {slotTime} – {endHH}:{endMM}
              </span>
              <span className="text-[9px] tabular-nums opacity-80 mt-0.5">{dragDurationMin} min</span>
            </div>
          </div>
        </>
      )}
      {isOver && previewHeight === 0 && (
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
  const slotHeight = useSlotHeight();
  const arrivalMin = arrivalToMinutes(stop.planned_arrival);
  if (arrivalMin == null || arrivalMin < START_HOUR * 60 || arrivalMin >= END_HOUR * 60) return null;
  const top = ((arrivalMin - START_HOUR * 60) / SLOT_MIN) * slotHeight;
  // Mindre minimum-højde — sikrer altid 2 linjer er læselige
  const heightPx = Math.max((stop.duration_minutes / SLOT_MIN) * slotHeight, 38);

  // Hele kortet er draggable — meget nemmere end at ramme et lille greb
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

  const widthPct = lanes > 1 ? (100 / lanes) : 100;
  const leftPct = lanes > 1 ? lane * widthPct : 0;

  // Visnings-tærskler i absolutte pixels — uafhængig af zoom
  // Service vises altid så medarbejdere/ejere kan se hvad der skal udføres.
  const showService = true;
  const showAssign = heightPx >= 50;
  const showAddress = heightPx >= 78;
  const showWindow = heightPx >= 96;

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`group absolute rounded-md border bg-card shadow-sm overflow-hidden transition-all z-10 select-none ${
        isDragging ? "opacity-40 scale-95 cursor-grabbing" : "cursor-grab active:cursor-grabbing"
      } ${
        isSelected ? "ring-2 ring-primary border-primary shadow-lg z-30"
          : isDone ? "opacity-60"
          : "hover:shadow-md hover:z-20 hover:border-foreground/40"
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
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
    >
      <div className="flex flex-col gap-0.5 px-2 py-1.5 h-full overflow-hidden">
        {/* Top-linje: tid + navn + status */}
        <div className="flex items-center gap-1.5 min-w-0">
          {arrivalLabel && (
            <span className="text-[10px] font-bold tabular-nums text-foreground/80 shrink-0 leading-none">
              {arrivalLabel}
            </span>
          )}
          <p className={`text-[12px] font-semibold truncate flex-1 leading-tight ${isDone ? "line-through" : ""}`}>
            {stop.customer_name || "Stop"}
          </p>
          {isDone && <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />}
          {isInProgress && (
            <span title="I gang" className="h-2 w-2 rounded-full bg-blue-500 animate-pulse shrink-0" />
          )}
          {hasConflict && (
            <span title="Overlapper med et andet stop hos samme medarbejder">
              <AlertCircle className="h-3 w-3 text-destructive shrink-0" />
            </span>
          )}
        </div>

        {/* Anden linje: varighed + sluttid */}
        <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground tabular-nums leading-none">
          <Clock className="h-2.5 w-2.5 shrink-0" />
          <span className="font-medium">{stop.duration_minutes}m</span>
          {departureLabel && <span>· slutter {departureLabel}</span>}
        </div>

        {/* Service-summary */}
        {showService && stop.service_summary && (
          <p className="text-[11px] text-foreground/75 truncate leading-tight">
            {stop.service_summary}
          </p>
        )}

        {/* Adresse */}
        {showAddress && stop.address && (
          <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5 leading-tight">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{stop.address}</span>
          </p>
        )}

        {/* Tildel-knap + tidsvindue — klik må ikke starte drag */}
        <div className="mt-auto flex items-center gap-1 flex-wrap">
          {showAssign && onAssign && (
            <div onPointerDown={(e) => e.stopPropagation()} onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium transition-colors ${
                      assignedEmp
                        ? "text-white shadow-sm"
                        : isUnassigned
                          ? "bg-orange-50 border border-orange-300 text-orange-700 hover:bg-orange-100"
                          : "border border-border text-muted-foreground hover:bg-secondary"
                    }`}
                    style={assignedEmp ? { background: assignedEmp.color } : undefined}
                  >
                    <UserCheck className="h-2.5 w-2.5" />
                    <span className="truncate max-w-[80px]">
                      {assignedEmp ? assignedEmp.name.split(" ")[0] : "Tildel"}
                    </span>
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

          {showWindow && stop.time_window_start && (
            <Badge variant="outline" className="h-4 text-[9px] px-1 gap-0.5 border-amber-300 text-amber-700 bg-amber-50 tabular-nums">
              {stop.time_window_start.slice(0, 5)}
              {stop.time_window_end && `–${stop.time_window_end.slice(0, 5)}`}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};
