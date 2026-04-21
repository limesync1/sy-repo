import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Sparkles, Navigation, Loader2, Send, AlertCircle } from "lucide-react";
import type { RouteStop } from "@/hooks/useRoutes";
import { formatDurationMin } from "@/lib/duration-format";

type Props = {
  routeId: string;
  employeeId: string | null;
  label: string;
  subtitle?: string;
  color: string;
  stops: RouteStop[];
  totalKm?: number | null;
  totalMin?: number | null;
  routeStatus?: string;
  optimizing?: boolean;
  dispatching?: boolean;
  onOptimize?: () => void;
  onDispatch?: () => void;
  onSelectStop?: (id: string) => void;
  selectedStopId?: string | null;
};

export const EmployeeColumn = ({
  routeId, employeeId, label, subtitle, color, stops,
  totalKm, totalMin, routeStatus,
  optimizing, dispatching,
  onOptimize, onDispatch, onSelectStop, selectedStopId,
}: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${employeeId ?? "none"}`,
    data: { type: "column", employeeId, routeId },
  });

  const sortedStops = stops.slice().sort((a, b) => a.sequence - b.sequence);
  const sortedIds = sortedStops.map((s) => s.id);
  const completedCount = sortedStops.filter((s) => s.status === "completed").length;
  const isDispatched = routeStatus === "dispatched";

  return (
    <Card
      ref={setNodeRef}
      className={`flex flex-col p-3 transition-all ${isOver ? "border-primary bg-primary/5 ring-2 ring-primary/20" : ""}`}
    >
      {/* Header */}
      <header className="flex items-start gap-2 mb-3">
        <div className="h-3 w-3 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-semibold text-sm truncate">{label}</p>
            {isDispatched && (
              <Badge className="h-4 px-1.5 text-[9px] gap-0.5 bg-emerald-100 text-emerald-700 border-0">
                <Send className="h-2.5 w-2.5" />Sendt
              </Badge>
            )}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-1">
            <Badge variant="secondary" className="text-[10px] h-4 px-1.5">
              {completedCount > 0 ? `${completedCount}/${stops.length}` : `${stops.length}`} stop
            </Badge>
            {totalKm != null && totalKm > 0 && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5">
                <Navigation className="h-2.5 w-2.5" />{totalKm.toFixed(1)} km
              </Badge>
            )}
            {totalMin != null && totalMin > 0 && (
              <Badge variant="outline" className="text-[10px] h-4 px-1.5 gap-0.5">
                <Clock className="h-2.5 w-2.5" />{formatDurationMin(totalMin, { short: true })}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Action row */}
      {stops.length >= 1 && (onOptimize || onDispatch) && (
        <div className="flex gap-1 mb-2">
          {onOptimize && stops.length >= 2 && (
            <Button size="sm" variant="outline" className="flex-1 h-7 text-xs gap-1" onClick={onOptimize} disabled={optimizing} title="AI-optimér rækkefølge">
              {optimizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Optimér
            </Button>
          )}
          {onDispatch && employeeId && (
            <Button
              size="sm"
              variant={isDispatched ? "outline" : "default"}
              className="flex-1 h-7 text-xs gap-1"
              onClick={onDispatch}
              disabled={dispatching || stops.length === 0}
              title={isDispatched ? "Send opdateret rute igen" : "Send rute til medarbejderen via email"}
            >
              {dispatching ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
              {isDispatched ? "Send igen" : "Send"}
            </Button>
          )}
        </div>
      )}

      {/* Stops list */}
      <div className="flex-1 space-y-1.5 min-h-[100px]">
        <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
          {stops.length === 0 && (
            <div className="text-xs text-muted-foreground italic text-center py-8 border-2 border-dashed rounded-md">
              Slip opgaver her
            </div>
          )}
          {sortedStops.map((s, i) => (
            <SortableStopCard
              key={s.id}
              stop={s}
              index={i + 1}
              color={color}
              isSelected={selectedStopId === s.id}
              onSelect={() => onSelectStop?.(s.id)}
            />
          ))}
        </SortableContext>
      </div>
    </Card>
  );
};

const SortableStopCard = ({
  stop, index, color, isSelected, onSelect,
}: {
  stop: RouteStop;
  index: number;
  color: string;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
    data: { type: "stop", stop },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };
  const hasCoords = stop.latitude != null && stop.longitude != null;
  const isDone = stop.status === "completed";
  const isInProgress = stop.status === "in_progress";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group rounded-md border bg-background p-2 transition-all cursor-pointer ${
        isSelected ? "border-primary ring-2 ring-primary/30 shadow-sm"
          : isDone ? "border-green-200 bg-green-50/30 opacity-75"
          : "hover:border-primary/60"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <span
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          className={`flex h-6 w-6 items-center justify-center rounded-full text-white text-[11px] font-bold shrink-0 cursor-grab active:cursor-grabbing ${
            isDone ? "opacity-60" : ""
          }`}
          style={{ background: color }}
        >
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`text-xs font-semibold truncate flex-1 ${isDone ? "line-through text-muted-foreground" : ""}`}>
              {stop.customer_name || "Stop"}
            </p>
            {isInProgress && (
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
            )}
          </div>
          {stop.address && (
            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5">
              <MapPin className="h-2.5 w-2.5" />{stop.address}
            </p>
          )}
          <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
            <span className="flex items-center gap-0.5">
              <Clock className="h-2.5 w-2.5" />{formatDurationMin(stop.duration_minutes, { short: true })}
            </span>
            {stop.time_window_start && (
              <span className="text-amber-700 font-medium">
                {stop.time_window_start.slice(0, 5)}
                {stop.time_window_end && `–${stop.time_window_end.slice(0, 5)}`}
              </span>
            )}
            {stop.distance_to_next_km != null && stop.distance_to_next_km > 0 && (
              <span className="ml-auto">→ {stop.distance_to_next_km.toFixed(1)} km</span>
            )}
            {!hasCoords && (
              <AlertCircle className="h-2.5 w-2.5 text-orange-500" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
