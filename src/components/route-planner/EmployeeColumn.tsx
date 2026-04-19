import { useDroppable } from "@dnd-kit/core";
import { useSortable, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, Clock, Trash2, Sparkles, Navigation, Loader2 } from "lucide-react";
import type { RouteStop } from "@/hooks/useRoutes";

type Props = {
  routeId: string;
  employeeId: string | null;
  label: string;
  subtitle?: string;
  color: string;
  stops: RouteStop[];
  totalKm?: number | null;
  totalMin?: number | null;
  optimizing?: boolean;
  onOptimize?: () => void;
  onDeleteStop?: (id: string) => void;
  onSelectStop?: (id: string) => void;
  selectedStopId?: string | null;
};

export const EmployeeColumn = ({
  routeId, employeeId, label, subtitle, color, stops,
  totalKm, totalMin, optimizing, onOptimize, onDeleteStop, onSelectStop, selectedStopId,
}: Props) => {
  const { setNodeRef, isOver } = useDroppable({
    id: `col-${employeeId ?? "none"}`,
    data: { type: "column", employeeId, routeId },
  });

  const sortedIds = stops.slice().sort((a, b) => a.sequence - b.sequence).map((s) => s.id);

  return (
    <Card
      ref={setNodeRef}
      className={`flex flex-col p-3 transition-colors ${isOver ? "border-primary bg-primary/5 ring-2 ring-primary/20" : ""}`}
    >
      <header className="flex items-start gap-2 mb-3">
        <div className="h-3 w-3 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm truncate">{label}</p>
          {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge variant="secondary" className="text-xs">{stops.length} stop</Badge>
            {totalKm != null && totalKm > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Navigation className="h-3 w-3" />{totalKm.toFixed(1)} km
              </Badge>
            )}
            {totalMin != null && totalMin > 0 && (
              <Badge variant="outline" className="text-xs gap-1">
                <Clock className="h-3 w-3" />{Math.floor(totalMin / 60)}t {totalMin % 60}m
              </Badge>
            )}
          </div>
        </div>
        {stops.length >= 2 && onOptimize && (
          <Button
            size="sm"
            variant="ghost"
            className="h-7 px-2 text-xs gap-1"
            onClick={onOptimize}
            disabled={optimizing}
            title="AI-optimér rækkefølge"
          >
            {optimizing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
            Optimér
          </Button>
        )}
      </header>

      <div className="flex-1 space-y-2 min-h-[100px]">
        <SortableContext items={sortedIds} strategy={verticalListSortingStrategy}>
          {stops.length === 0 && (
            <div className="text-xs text-muted-foreground italic text-center py-8 border-2 border-dashed rounded-md">
              Slip opgaver her
            </div>
          )}
          {stops.slice().sort((a, b) => a.sequence - b.sequence).map((s, i) => (
            <SortableStopCard
              key={s.id}
              stop={s}
              index={i + 1}
              color={color}
              isSelected={selectedStopId === s.id}
              onSelect={() => onSelectStop?.(s.id)}
              onDelete={() => onDeleteStop?.(s.id)}
            />
          ))}
        </SortableContext>
      </div>
    </Card>
  );
};

const SortableStopCard = ({
  stop, index, color, isSelected, onSelect, onDelete,
}: {
  stop: RouteStop;
  index: number;
  color: string;
  isSelected: boolean;
  onSelect: () => void;
  onDelete: () => void;
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

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`rounded-md border bg-background p-2 transition-colors ${
        isSelected ? "border-primary ring-2 ring-primary/30" : "hover:border-primary/60"
      }`}
      onClick={onSelect}
    >
      <div className="flex items-start gap-2">
        <span
          {...listeners}
          {...attributes}
          className="flex h-6 w-6 items-center justify-center rounded-full text-white text-[11px] font-bold shrink-0 cursor-grab active:cursor-grabbing"
          style={{ background: color }}
        >
          {index}
        </span>
        <div className="flex-1 min-w-0" {...listeners} {...attributes}>
          <p className="text-sm font-medium truncate">{stop.customer_name || "Stop"}</p>
          {stop.address && (
            <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
              <MapPin className="h-3 w-3" />{stop.address}
            </p>
          )}
          <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><Clock className="h-3 w-3" />{stop.duration_minutes}m</span>
            {stop.distance_to_next_km != null && stop.distance_to_next_km > 0 && (
              <span>→ {stop.distance_to_next_km.toFixed(1)} km</span>
            )}
            {!hasCoords && <Badge variant="outline" className="text-[9px] h-4 px-1">Ingen GPS</Badge>}
          </div>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive shrink-0"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
