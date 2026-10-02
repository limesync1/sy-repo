import { useEffect, useMemo, useState } from "react";
import { Activity, MapPin, Radio, Users } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Route, RouteStop } from "@/hooks/useRoutes";
import type { RouteEmployeeOption } from "./RouteEditSheet";
import type { RouteLivePosition } from "@/hooks/useRouteLivePositions";
import { EmployeeAvatar } from "@/components/shared/EmployeeAvatar";
import { cn } from "@/lib/utils";
import RouteMap, { type MapStop } from "./RouteMap";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  route: Route;
  stops: RouteStop[];
  employees: RouteEmployeeOption[];
  positions: RouteLivePosition[];
};

/** Hvor gammel en position må være, før vi viser den som "forsinket" i stedet for live. */
const STALE_AFTER_MS = 45_000;

/** Dansk relativ tid i sekunder/minutter — "sat for X sek. siden". */
const secondsAgoLabel = (iso: string, nowMs: number) => {
  const ms = Math.max(0, nowMs - new Date(iso).getTime());
  const seconds = Math.round(ms / 1000);
  if (seconds < 60) return `${seconds} sek. siden`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min. siden`;
  const hours = Math.round(minutes / 60);
  return `${hours} time${hours !== 1 ? "r" : ""} siden`;
};

export const RouteLivePositionDialog = ({ open, onOpenChange, route, stops, employees, positions }: Props) => {
  // Opdater "X sek. siden"-teksterne løbende mens dialogen er åben.
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    if (!open) return;
    const interval = setInterval(() => setNowMs(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [open]);

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

  const rows = useMemo(() => positions
    .map((position) => {
      const employee = employees.find((e) => e.id === position.employee_id);
      const stale = nowMs - new Date(position.recorded_at).getTime() > STALE_AFTER_MS;
      return {
        employeeId: position.employee_id,
        employee,
        lat: position.latitude,
        lng: position.longitude,
        label: employee?.name || "Medarbejder",
        currentStopLabel: stops.find((stop) => stop.id === position.current_stop_id)?.customer_name || undefined,
        recordedAt: position.recorded_at,
        stale,
      };
    })
    .sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime()), [positions, employees, stops, nowMs]);

  const livePositions = rows.map((row) => ({
    employeeId: row.employeeId,
    lat: row.lat,
    lng: row.lng,
    label: row.label,
    currentStopLabel: row.currentStopLabel,
    recordedAt: row.recordedAt,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="planner-overlay flex max-h-[calc(100dvh-1rem)] max-w-5xl grid-rows-[auto_minmax(0,1fr)] gap-0 overflow-hidden p-0">
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
          <div className="flex h-full min-h-0 flex-col gap-2 sm:gap-3 lg:flex-row">
            <div className="min-h-[40dvh] flex-1 lg:min-h-0">
              <RouteMap
                routes={[{ color: route.color || "hsl(var(--accent))", stops: sortedStops }]}
                livePositions={livePositions}
                height="min(68dvh, 680px)"
              />
            </div>
            <div className="flex w-full shrink-0 flex-col gap-1.5 overflow-y-auto rounded-lg border border-border bg-card p-2 sm:p-2.5 lg:w-72">
              <div className="flex items-center gap-1.5 px-1 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                <Users className="h-3.5 w-3.5" /> Online nu
              </div>
              {rows.length === 0 ? (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border px-4 py-8 text-center">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-muted-foreground">
                    <Radio className="h-4 w-4" />
                  </span>
                  <p className="text-sm font-medium text-foreground">Ingen er online lige nu</p>
                  <p className="text-xs text-muted-foreground">Positioner vises her, når en medarbejder kører ruten med appen åben.</p>
                </div>
              ) : (
                rows.map((row) => (
                  <div
                    key={row.employeeId}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md border px-2.5 py-2",
                      row.stale ? "border-border bg-secondary/40" : "border-border bg-card",
                    )}
                  >
                    <div className="relative shrink-0">
                      <EmployeeAvatar employee={row.employee} size={34} />
                      <span
                        className={cn(
                          "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card",
                          row.stale ? "bg-muted-foreground" : "bg-success",
                        )}
                        aria-hidden="true"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-foreground">{row.label}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        <MapPin className="mr-1 inline h-3 w-3 align-[-1px]" />
                        {row.currentStopLabel || "På ruten"}
                      </p>
                      <p className={cn("mt-0.5 text-[11px]", row.stale ? "text-muted-foreground" : "text-success")}>
                        {row.stale ? "Forsinket" : "Live"} · Sat for {secondsAgoLabel(row.recordedAt, nowMs)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
