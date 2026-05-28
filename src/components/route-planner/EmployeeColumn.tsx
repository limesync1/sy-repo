import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Sparkles, Navigation, Loader2, Send, AlertCircle, RefreshCw } from "lucide-react";
import type { RouteStop } from "@/hooks/useRoutes";
import { formatDurationMin } from "@/lib/duration-format";
import { formatInterval } from "@/lib/interval";
import { formatCycleLabel } from "@/lib/cycle-label";

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
      className={`group/col relative flex flex-col p-3 rounded-lg border-border/70 bg-card shadow-[0_2px_10px_-6px_hsl(var(--foreground)/0.18)] transition-all duration-200 ${
        isOver
          ? "border-accent/70 bg-accent/[0.04] ring-2 ring-accent/25 shadow-[0_8px_24px_-12px_hsl(var(--accent)/0.35)]"
          : "hover:border-foreground/25 hover:shadow-[0_6px_16px_-6px_hsl(var(--foreground)/0.18)]"
      }`}
    >
      {/* Top accent stripe matches route color */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 rounded-t-lg opacity-90"
        style={{ background: color }}
      />
      {/* Header */}
      <header className="flex items-start gap-2.5 mb-3.5 mt-1">
        <div
          className="h-8 w-8 rounded-md shrink-0 ring-2 ring-background shadow-[0_2px_6px_-2px_hsl(var(--foreground)/0.25)] flex items-center justify-center"
          style={{ background: color }}
        >
          <span className="text-[10px] font-bold text-background leading-none">
            {label.charAt(0).toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <p className="font-bold text-sm truncate tracking-tight">{label}</p>
            {isDispatched && (
              <Badge className="h-[18px] px-1.5 text-[9px] gap-0.5 bg-emerald-100 text-emerald-700 border-0 rounded-full shadow-sm">
                <Send className="h-2.5 w-2.5" />Sendt
              </Badge>
            )}
          </div>
          {subtitle && <p className="text-[11px] text-muted-foreground truncate mt-0.5 leading-snug">{subtitle}</p>}
          <div className="mt-1.5 flex flex-wrap items-center gap-1">
            <Badge variant="secondary" className="text-[10px] h-5 px-1.5 rounded-md font-semibold tabular-nums">
              {completedCount > 0 ? `${completedCount}/${stops.length}` : `${stops.length}`} stop
            </Badge>
            {totalKm != null && totalKm > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-0.5 rounded-md tabular-nums border-border/70">
                <Navigation className="h-2.5 w-2.5" />{totalKm.toFixed(1)} km
              </Badge>
            )}
            {totalMin != null && totalMin > 0 && (
              <Badge variant="outline" className="text-[10px] h-5 px-1.5 gap-0.5 rounded-md tabular-nums border-border/70">
                <Clock className="h-2.5 w-2.5" />{formatDurationMin(totalMin, { short: true })}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Action row */}
      {stops.length >= 1 && (onOptimize || onDispatch) && (
        <div className="flex gap-1.5 mb-3">
          {onOptimize && stops.length >= 2 && (
            <Button size="sm" variant="outline" className="flex-1 h-8 text-xs gap-1 rounded-md border-border/60 hover:border-accent/60 hover:text-accent" onClick={onOptimize} disabled={optimizing} title="AI-optimér rækkefølge">
              {optimizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
              Optimér
            </Button>
          )}
          {onDispatch && employeeId && (
            <Button
              size="sm"
              variant={isDispatched ? "outline" : "default"}
              className={`flex-1 h-8 text-xs gap-1 rounded-md ${isDispatched ? "border-border/60" : "shadow-[0_2px_6px_-2px_hsl(var(--accent)/0.5)]"}`}
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
      <div className="flex-1 space-y-2 min-h-[100px]">
        <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
          {stops.length === 0 && (
            <div
              className={`text-[11px] text-center py-8 px-3 border-2 border-dashed rounded-md transition-all ${
                isOver
                  ? "border-accent/60 bg-accent/[0.06] text-accent font-medium"
                  : "border-border/50 text-muted-foreground/70 hover:border-border hover:bg-secondary/20"
              }`}
            >
              {isOver ? "Slip for at tildele" : "Træk aftaler hertil"}
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
  const occStatus = (stop as any).occurrence_status as string | undefined;
  const isDone = occStatus === "completed" || stop.status === "completed";
  const isInProgress = !isDone && stop.status === "in_progress";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-md border bg-card p-2.5 pl-3 transition-all duration-150 cursor-pointer overflow-hidden ${
        isSelected
          ? "border-accent/60 ring-2 ring-accent/25 shadow-[0_4px_12px_-4px_hsl(var(--accent)/0.35)] -translate-y-px"
          : isDone
          ? "border-emerald-200/70 bg-emerald-50/40 opacity-80"
          : "border-border/70 hover:border-foreground/25 hover:shadow-[0_6px_14px_-6px_hsl(var(--foreground)/0.18)] hover:-translate-y-px"
      }`}
      onClick={onSelect}
    >
      {/* Left color rail */}
      <span
        aria-hidden
        className="absolute left-0 top-0 bottom-0 w-1 opacity-90"
        style={{ background: isDone ? "hsl(var(--muted-foreground) / 0.4)" : color }}
      />
      <div className="flex items-start gap-2">
        <span
          {...listeners}
          {...attributes}
          onClick={(e) => e.stopPropagation()}
          className={`flex h-6 w-6 items-center justify-center rounded-md text-white text-[11px] font-bold shrink-0 cursor-grab active:cursor-grabbing ring-2 ring-background shadow-[0_2px_4px_-1px_rgba(0,0,0,0.2)] transition-transform hover:scale-105 active:scale-95 ${
            isDone ? "opacity-50" : ""
          }`}
          style={{ background: color }}
        >
          {index}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className={`text-xs font-bold truncate flex-1 ${isDone ? "line-through text-muted-foreground" : ""}`}>
              {stop.customer_name || "Stop"}
            </p>
            {isInProgress && (
              <span className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
            )}
          </div>
          <p className={`text-[10px] truncate mt-0.5 ${stop.service_summary ? "text-foreground/75 font-medium" : "text-muted-foreground italic"}`}>
            {stop.service_summary || "Ingen ydelser angivet"}
          </p>
          {stop.agreement_interval && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">
              {formatInterval(stop.agreement_interval)}
              {(() => {
                const label = formatCycleLabel({
                  completedCycles: stop.completed_cycles,
                  interval: stop.agreement_interval,
                  isCompleted: isDone,
                });
                return label ? (
                  <span className="ml-1 inline-flex items-center gap-0.5 rounded bg-secondary/80 px-1 py-px text-[9px] font-semibold text-foreground">
                    <RefreshCw className="h-2 w-2" />
                    {label}
                  </span>
                ) : null;
              })()}
            </p>
          )}
          {stop.address && (
            <p className="text-[10px] text-muted-foreground truncate flex items-center gap-0.5 mt-0.5">
              <MapPin className="h-2.5 w-2.5" />{stop.address}
            </p>
          )}
          {(stop.distance_to_next_km != null && stop.distance_to_next_km > 0) || !hasCoords ? (
            <div className="mt-0.5 flex items-center gap-1.5 text-[10px] text-muted-foreground">
              {stop.distance_to_next_km != null && stop.distance_to_next_km > 0 && (
                <span>→ {stop.distance_to_next_km.toFixed(1)} km</span>
              )}
              {!hasCoords && (
                <AlertCircle className="h-2.5 w-2.5 text-orange-500" />
              )}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};
