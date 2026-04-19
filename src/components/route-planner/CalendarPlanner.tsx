// CalendarPlanner — Squidbiz-style time-grid view
// Vertical: 06:00-20:00 in 15-min slots
// Horizontal: one column per ROUTE (a route can have multiple employees attached)
// Each stop is assigned to ONE of the route's employees via dropdown.
// Drag-drop: from sidebar OR between slots — drop on a time slot to set planned_arrival.

import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuTrigger, DropdownMenuSeparator, DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  Loader2, Send, Sparkles, Navigation, Clock, MapPin, AlertCircle,
  GripVertical, Users, UserPlus, MoreVertical, Trash2, UserCheck,
} from "lucide-react";
import { format } from "date-fns";
import type { RouteStop } from "@/hooks/useRoutes";

const SLOT_MIN = 15;
const START_HOUR = 6;
const END_HOUR = 20;
const SLOTS_PER_HOUR = 60 / SLOT_MIN;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * SLOTS_PER_HOUR;
const SLOT_HEIGHT = 16;

export type EmployeeOption = {
  id: string;
  name: string;
  color: string;
};

export type CalendarColumn = {
  routeId: string;
  label: string;            // route name (or fallback)
  subtitle?: string;
  color: string;
  stops: RouteStop[];
  attachedEmployees: EmployeeOption[];   // employees on this route
  availableEmployees: EmployeeOption[];  // all active employees (for "attach")
  totalKm?: number | null;
  totalMin?: number | null;
  routeStatus?: string;
  onOptimize?: () => void;
  onAttachEmployee?: (employeeId: string) => void;
  onDetachEmployee?: (employeeId: string) => void;
  onDispatchToEmployee?: (employeeId: string) => void;
  onDeleteRoute?: () => void;
  onAssignStop?: (stopId: string, employeeId: string | null) => void;
  optimizing?: boolean;
  dispatching?: boolean;
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

const slotIndexToTimeLabel = (i: number): string => {
  const totalMin = START_HOUR * 60 + i * SLOT_MIN;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const CalendarPlanner = ({ routeDate, columns, selectedStopId, onSelectStop }: Props) => {
  if (columns.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center text-sm text-muted-foreground p-6 text-center">
        Ingen ruter for denne dag. Klik "Opret rute" for at komme i gang.
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      {/* Column headers */}
      <div
        className="grid border-b bg-background sticky top-0 z-20"
        style={{ gridTemplateColumns: `60px repeat(${columns.length}, minmax(220px, 1fr))` }}
      >
        <div className="border-r p-2 text-[10px] uppercase text-muted-foreground font-semibold">Tid</div>
        {columns.map((col) => (
          <ColumnHeader key={col.routeId} col={col} />
        ))}
      </div>

      {/* Scrollable grid body */}
      <div className="flex-1 overflow-y-auto">
        <div
          className="grid relative"
          style={{
            gridTemplateColumns: `60px repeat(${columns.length}, minmax(220px, 1fr))`,
            height: `${TOTAL_SLOTS * SLOT_HEIGHT}px`,
          }}
        >
          {/* Time gutter */}
          <div className="border-r relative">
            {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
              <div
                key={i}
                className={`absolute left-0 right-0 ${i % SLOTS_PER_HOUR === 0 ? "border-t border-border" : "border-t border-border/30"}`}
                style={{ top: `${i * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
              >
                {i % SLOTS_PER_HOUR === 0 && (
                  <span className="absolute -top-2 right-1.5 text-[10px] text-muted-foreground bg-background px-1 font-medium">
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
        </div>
      </div>
    </Card>
  );
};

const ColumnHeader = ({ col }: { col: CalendarColumn }) => {
  const completed = col.stops.filter((s) => s.status === "completed").length;
  const isDispatched = col.routeStatus === "dispatched";
  const unattached = col.availableEmployees.filter(
    (e) => !col.attachedEmployees.find((a) => a.id === e.id),
  );

  return (
    <div className="border-r p-2 flex flex-col gap-1.5 min-w-0">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: col.color }} />
        <p className="text-sm font-semibold truncate flex-1">{col.label}</p>
        {isDispatched && (
          <Badge className="h-4 px-1 text-[9px] gap-0.5 bg-emerald-100 text-emerald-700 border-0">
            <Send className="h-2.5 w-2.5" />Sendt
          </Badge>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost" className="h-5 w-5 p-0">
              <MoreVertical className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            {col.onDeleteRoute && (
              <DropdownMenuItem
                className="text-destructive focus:text-destructive"
                onClick={col.onDeleteRoute}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />Slet rute
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {col.subtitle && <p className="text-[10px] text-muted-foreground truncate">{col.subtitle}</p>}

      {/* Employee chips */}
      <div className="flex flex-wrap gap-1 items-center">
        {col.attachedEmployees.map((emp) => (
          <DropdownMenu key={emp.id}>
            <DropdownMenuTrigger asChild>
              <button
                className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] hover:bg-secondary"
                style={{ borderColor: emp.color, color: emp.color }}
                title={emp.name}
              >
                <span className="h-1.5 w-1.5 rounded-full" style={{ background: emp.color }} />
                <span className="truncate max-w-[80px]">{emp.name}</span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-44">
              <DropdownMenuLabel className="text-xs">{emp.name}</DropdownMenuLabel>
              {col.onDispatchToEmployee && (
                <DropdownMenuItem onClick={() => col.onDispatchToEmployee?.(emp.id)}>
                  <Send className="h-3.5 w-3.5 mr-2" />Send rute til {emp.name.split(" ")[0]}
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
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

      <div className="flex flex-wrap gap-1 items-center">
        <Badge variant="secondary" className="text-[9px] h-4 px-1">
          {completed > 0 ? `${completed}/${col.stops.length}` : col.stops.length} stop
        </Badge>
        {col.attachedEmployees.length > 0 && (
          <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5">
            <Users className="h-2.5 w-2.5" />{col.attachedEmployees.length}
          </Badge>
        )}
        {col.totalKm != null && col.totalKm > 0 && (
          <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5">
            <Navigation className="h-2.5 w-2.5" />{col.totalKm.toFixed(1)} km
          </Badge>
        )}
        {col.totalMin != null && col.totalMin > 0 && (
          <Badge variant="outline" className="text-[9px] h-4 px-1 gap-0.5">
            <Clock className="h-2.5 w-2.5" />{Math.floor(col.totalMin / 60)}t {col.totalMin % 60}m
          </Badge>
        )}
      </div>

      {col.onOptimize && col.stops.length >= 2 && (
        <Button
          size="sm"
          variant="outline"
          className="h-6 text-[10px] gap-1 px-1.5 w-full"
          onClick={col.onOptimize}
          disabled={col.optimizing}
        >
          {col.optimizing ? <Loader2 className="h-2.5 w-2.5 animate-spin" /> : <Sparkles className="h-2.5 w-2.5" />}
          Optimér rækkefølge
        </Button>
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
  return (
    <div className="border-r relative bg-secondary/10">
      {Array.from({ length: TOTAL_SLOTS }).map((_, i) => (
        <SlotCell key={i} slotIndex={i} routeId={col.routeId} routeDate={routeDate} />
      ))}

      {col.stops.map((stop) => (
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
        />
      ))}
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
  return (
    <div
      ref={setNodeRef}
      className={`absolute left-0 right-0 transition-colors ${
        isOver ? "bg-primary/20 border border-primary border-dashed"
          : isHourBoundary ? "border-t border-border" : "border-t border-border/20"
      }`}
      style={{ top: `${slotIndex * SLOT_HEIGHT}px`, height: `${SLOT_HEIGHT}px` }}
    />
  );
};

const StopBlock = ({
  stop, color, attachedEmployees, isSelected, onSelect, onAssign,
}: {
  stop: RouteStop;
  color: string;
  attachedEmployees: EmployeeOption[];
  isSelected: boolean;
  onSelect: () => void;
  onAssign?: (stopId: string, employeeId: string | null) => void;
}) => {
  const arrivalMin = arrivalToMinutes(stop.planned_arrival);
  if (arrivalMin == null || arrivalMin < START_HOUR * 60 || arrivalMin >= END_HOUR * 60) return null;
  const top = minutesToY(arrivalMin);
  const heightPx = Math.max((stop.duration_minutes / SLOT_MIN) * SLOT_HEIGHT, SLOT_HEIGHT);

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

  return (
    <div
      ref={setNodeRef}
      className={`absolute left-1 right-1 rounded-md border bg-background shadow-sm overflow-hidden cursor-pointer transition-all z-10 ${
        isDragging ? "opacity-40" : ""
      } ${
        isSelected ? "ring-2 ring-primary border-primary"
          : isDone ? "opacity-70 border-green-300"
          : "hover:border-primary/60 hover:shadow-md"
      }`}
      style={{
        top: `${top}px`,
        height: `${heightPx}px`,
        borderLeftWidth: "3px",
        borderLeftColor: color,
      }}
      onClick={onSelect}
    >
      <div className="flex items-start gap-1 p-1.5 h-full">
        <span
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing shrink-0 opacity-50 hover:opacity-100"
        >
          <GripVertical className="h-3 w-3" />
        </span>
        <div className="flex-1 min-w-0 overflow-hidden">
          <div className="flex items-center gap-1">
            <p className={`text-xs font-semibold truncate flex-1 ${isDone ? "line-through" : ""}`}>
              {stop.customer_name || "Stop"}
            </p>
            {isInProgress && (
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
            )}
            {!hasCoords && (
              <AlertCircle className="h-2.5 w-2.5 text-orange-500 shrink-0" />
            )}
          </div>

          {/* Assigned-employee badge / picker */}
          {onAssign && (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="inline-flex items-center gap-1 rounded px-1 py-0.5 text-[9px] hover:bg-secondary"
                    style={
                      assignedEmp
                        ? { color: assignedEmp.color, borderColor: assignedEmp.color, borderWidth: 1 }
                        : { color: "hsl(var(--muted-foreground))", borderColor: "hsl(var(--border))", borderWidth: 1 }
                    }
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

          {arrivalLabel && heightPx >= SLOT_HEIGHT * 2 && (
            <p className="text-[9px] text-muted-foreground flex items-center gap-0.5">
              <Clock className="h-2 w-2" />{arrivalLabel}
              {departureLabel && `–${departureLabel}`}
              <span className="ml-auto">{stop.duration_minutes}m</span>
            </p>
          )}
          {stop.address && heightPx >= SLOT_HEIGHT * 3 && (
            <p className="text-[9px] text-muted-foreground truncate flex items-center gap-0.5">
              <MapPin className="h-2 w-2 shrink-0" />{stop.address}
            </p>
          )}
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
