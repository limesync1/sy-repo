import { Activity, MapPin, Radio } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Route, RouteStop } from "@/hooks/useRoutes";
import type { RouteEmployeeOption } from "./RouteEditSheet";
import type { RouteLivePosition } from "@/hooks/useRouteLivePositions";
import RouteMap, { type MapStop } from "./RouteMap";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route;
  stops: RouteStop[];
  employees: RouteEmployeeOption[];
  positions: RouteLivePosition[];
};

export const RouteLivePositionDialog = ({ open, onOpenChange, route, stops, employees, positions }: Props) => {
  const sortedStops: MapStop[] = [...stops]
    .sort((a, b) => a.sequence - b.sequence)
    .filter((stop) => stop.latitude != null && stop.longitude != null)
    .map((stop, index) => ({
      id: stop.id,
      lat: Number(stop.latitude),
      lng: Number(stop.longitude),
      label: stop.customer_name || `Stop ${index + 1}`,
      sublabel: stop.address || undefined,
      index: index + 1,
      distanceToNextKm: stop.distance_to_next_km,
      travelTimeToNextMin: stop.travel_time_to_next_min,
    }));
  const livePositions = positions.map((position) => ({
    employeeId: position.employee_id,
    lat: position.latitude,
    lng: position.longitude,
    label: employees.find((employee) => employee.id === position.employee_id)?.name || "Medarbejder",
    currentStopLabel: stops.find((stop) => stop.id === position.current_stop_id)?.customer_name || undefined,
    recordedAt: position.recorded_at,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="planner-overlay flex max-h-[calc(100dvh-1rem)] max-w-4xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0">
        <DialogHeader className="planner-overlay-header border-b border-border bg-card px-4 py-3 pr-12 sm:px-5 sm:py-4">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-accent/10 text-accent">
              <Radio className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="truncate text-base">Medarbejdere på ruten</DialogTitle>
              <DialogDescription className="mt-0.5 flex items-center gap-1.5 text-xs">
                <Activity className="h-3 w-3 text-success" /> Live under aktiv kørsel · {positions.length} online
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        <div className="planner-overlay-body min-h-0 bg-secondary/20 p-2 sm:p-3">
          <RouteMap
            routes={[{ color: route.color || "hsl(var(--accent))", stops: sortedStops }]}
            livePositions={livePositions}
            height="min(68dvh, 680px)"
          />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {livePositions.map((position) => (
              <span key={position.employeeId} className="inline-flex min-w-0 items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground">
                <MapPin className="h-3 w-3 shrink-0 text-accent" />
                <span className="truncate font-medium">{position.label}</span>
                <span className="text-muted-foreground">{position.currentStopLabel ? `· ${position.currentStopLabel}` : "· på ruten"}</span>
              </span>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};