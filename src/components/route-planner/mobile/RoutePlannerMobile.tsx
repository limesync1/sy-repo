// Mobil ruteplanlægger — tap-baseret alternativ til desktop drag-and-drop.
// Aktiveres under 768px (telefoner). Layoutet matcher computerversionen:
// ruterne for dagen vises øverst (med deres stop indeni) og en altid-
// synlig "Uden rute"-dock i bunden. Long-press på en aftale eller et
// stop løfter den op til drag-and-drop — så man kan trække aftaler ind
// i ruter, flytte stop mellem ruter eller trække stop tilbage til
// "Uden rute" for at fjerne. "Ny rute" åbner en bekræftelses-dialog så
// der aldrig oprettes tomme ruter.
import { useMemo, useState } from "react";
import {
  addDays,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { da } from "date-fns/locale";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Clock,
  Inbox,
  Loader2,
  MapPin,
  Plus,
  Search,
  Sparkles,
  GripVertical,
  Trash2,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  TouchSensor,
  MouseSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  useDroppable,
  pointerWithin,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createPortal } from "react-dom";

import { AdminShell } from "@/components/admin/shared/AdminShell";
import SEO from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMyBusiness } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import {
  useAddStop,
  useCalendarData,
  useCreateRoute,
  useReorderStops,
  useDeleteStop,
  useOptimizeRoute,
  useUnassignedJobs,
  type Route,
  type RouteStop,
} from "@/hooks/useRoutes";
import ThemeToggle, { usePlannerThemeEffect } from "@/components/route-planner/ThemeToggle";
import { pickAvailableColor } from "@/components/route-planner/RouteEditSheet";
import { toast } from "sonner";

import {
  effectiveJobDate,
  isJobPending,
  jobAddress,
  linkAgreementToRoute,
  serviceSummaryForJob,
} from "./mobile-helpers";
import { MobileAssignSheet } from "./MobileAssignSheet";
import { MobileRouteDetailSheet } from "./MobileRouteDetailSheet";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

const formatDur = (min: number) => {
  if (!min) return "0 min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} t`;
  return `${h} t ${m} min`;
};

export default function RoutePlannerMobile() {
  // Mørk-tilstand for hele siden mens planlæggeren er åben.
  usePlannerThemeEffect();
  const { data: business, isLoading: loadingBusiness } = useMyBusiness();
  const businessId = business?.id;

  const [date, setDate] = useState<string>(todayStr());
  const [search, setSearch] = useState("");
  const [assignJob, setAssignJob] = useState<any | null>(null);
  const [openRoute, setOpenRoute] = useState<Route | null>(null);
  // "Ny rute"-dialog — opretter først rute når brugeren bekræfter.
  const [createOpen, setCreateOpen] = useState(false);
  // Aktiv drag — bruges til DragOverlay og til at vise drop-zoner.
  const [drag, setDrag] = useState<
    | { kind: "job"; job: any }
    | { kind: "stop"; stop: RouteStop; fromRouteId: string }
    | null
  >(null);

  const { data: employees = [] } = useEmployees(businessId);

  // Hent ugen omkring den valgte dato, så dato-strippen kan vise rute-antal pr. dag.
  const weekRange = useMemo(() => {
    const ws = startOfWeek(parseISO(date), { weekStartsOn: 1 });
    return {
      start: format(ws, "yyyy-MM-dd"),
      end: format(addDays(ws, 6), "yyyy-MM-dd"),
      days: Array.from({ length: 7 }, (_, i) => format(addDays(ws, i), "yyyy-MM-dd")),
    };
  }, [date]);

  const { data: calendarData, isLoading: loadingCalendar } = useCalendarData(
    businessId,
    weekRange.start,
    weekRange.end,
  );
  const { data: unassigned = [], isLoading: loadingUnassigned } = useUnassignedJobs(businessId);

  const createRoute = useCreateRoute();
  const addStop = useAddStop();
  const reorderStops = useReorderStops();
  const deleteStop = useDeleteStop();

  const allRoutes = (calendarData?.routes ?? []).filter((r) => !(r as any).isVirtual);
  const allStops = calendarData?.stops ?? [];

  const routeCountByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of allRoutes) m.set(r.route_date, (m.get(r.route_date) ?? 0) + 1);
    return m;
  }, [allRoutes]);

  const stopsByRoute = useMemo(() => {
    const m = new Map<string, RouteStop[]>();
    for (const s of allStops) {
      const arr = m.get(s.route_id) ?? [];
      arr.push(s);
      m.set(s.route_id, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.sequence - b.sequence);
    return m;
  }, [allStops]);

  const dayRoutes = useMemo(
    () =>
      allRoutes
        .filter((r) => r.route_date === date)
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [allRoutes, date],
  );

  const filteredUnassigned = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return unassigned as any[];
    return (unassigned as any[]).filter(
      (j) =>
        j.customer_name?.toLowerCase().includes(q) ||
        j.address?.toLowerCase().includes(q) ||
        j.city?.toLowerCase().includes(q) ||
        j.zip_code?.toLowerCase().includes(q),
    );
  }, [unassigned, search]);

  const weekLabel = `Uge ${format(parseISO(date), "I", { locale: da })} · ${format(parseISO(date), "MMM yyyy", { locale: da })}`;

  // DnD: long-press for at trække (så scroll stadig fungerer), MouseSensor til tablet med mus.
  const sensors = useSensors(
    useSensor(TouchSensor, { activationConstraint: { delay: 220, tolerance: 8 } }),
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor),
  );

  const handleDragStart = (e: DragStartEvent) => {
    const data = e.active.data.current as any;
    if (!data) return;
    if (data.type === "job") setDrag({ kind: "job", job: data.job });
    if (data.type === "stop") setDrag({ kind: "stop", stop: data.stop, fromRouteId: data.fromRouteId });
    // Haptik når drag starter
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      try { (navigator as any).vibrate?.(15); } catch {}
    }
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const active = drag;
    setDrag(null);
    if (!active || !e.over) return;
    const over = e.over.data.current as any;
    if (!over) return;

    // Bestem target-rute + ønsket indsættelses-index
    let targetRouteId: string | null = null;
    let insertIndex: number | null = null;
    if (over.type === "route") {
      targetRouteId = over.routeId as string;
      const targetStops = stopsByRoute.get(targetRouteId) ?? [];
      insertIndex = targetStops.length; // tilføj i bunden
    } else if (over.type === "stop") {
      const overStop = over.stop as RouteStop;
      targetRouteId = overStop.route_id;
      const targetStops = stopsByRoute.get(targetRouteId) ?? [];
      insertIndex = targetStops.findIndex((s) => s.id === overStop.id);
      if (insertIndex < 0) insertIndex = targetStops.length;
    }

    if (targetRouteId && insertIndex !== null) {
      const targetStops = stopsByRoute.get(targetRouteId) ?? [];

      if (active.kind === "job") {
        const job = active.job;
        if (isJobPending(job)) {
          toast.info("Kunden skal godkende tilbuddet før aftalen kan planlægges");
          return;
        }
        try {
          await addStop.mutateAsync({
            route_id: targetRouteId,
            order_id: job.id,
            sequence: insertIndex,
            customer_name: job.customer_name,
            customer_phone: job.customer_phone,
            address: jobAddress(job),
            latitude: job.latitude,
            longitude: job.longitude,
            service_summary: serviceSummaryForJob(job),
            duration_minutes: Number(job.estimated_duration_minutes) || 30,
            time_window_start: job.preferred_time_start || null,
            time_window_end: job.preferred_time_end || null,
          });
          void linkAgreementToRoute(job.id, targetRouteId);
          toast.success("Aftale tilføjet til rute");
        } catch (err: any) {
          const msg = String(err?.message || "");
          if (msg.includes("uniq_route_stops_route_order") || msg.includes("duplicate key")) {
            toast.info("Aftalen ligger allerede på denne rute");
          } else {
            toast.error("Kunne ikke tilføje aftale", { description: err?.message });
          }
        }
        return;
      }

      if (active.kind === "stop") {
        // Same-route reorder
        if (active.fromRouteId === targetRouteId) {
          const fromIdx = targetStops.findIndex((s) => s.id === active.stop.id);
          if (fromIdx === -1 || fromIdx === insertIndex) return;
          const reordered = arrayMove(targetStops, fromIdx, insertIndex);
          const updates = reordered.map((s, i) => ({ id: s.id, sequence: i }));
          try {
            await reorderStops.mutateAsync(updates);
          } catch (err: any) {
            toast.error("Kunne ikke flytte stop", { description: err?.message });
          }
          return;
        }
        // Cross-route move
        try {
          const fromStops = (stopsByRoute.get(active.fromRouteId) ?? []).filter(
            (s) => s.id !== active.stop.id,
          );
          const inserted = [...targetStops];
          inserted.splice(insertIndex, 0, { ...active.stop, route_id: targetRouteId } as RouteStop);
          const updates = [
            ...inserted.map((s, i) => ({
              id: s.id,
              sequence: i,
              route_id: targetRouteId!,
            })),
            ...fromStops.map((s, i) => ({ id: s.id, sequence: i })),
          ];
          await reorderStops.mutateAsync(updates);
          toast.success("Stop flyttet");
        } catch (err: any) {
          toast.error("Kunne ikke flytte stop", { description: err?.message });
        }
        return;
      }
    }

    // Drop i "Uden rute"-dock fjerner et stop
    if (over.type === "unassigned" && active.kind === "stop") {
      try {
        await deleteStop.mutateAsync(active.stop.id);
        toast.success("Stop fjernet fra rute");
      } catch (err: any) {
        toast.error("Kunne ikke fjerne stop", { description: err?.message });
      }
    }
  };

  // AdminShell forventer en indlæst virksomhed — vis skeleton imens.
  if (loadingBusiness || !business) {
    return (
      <div className="flex min-h-dvh flex-col gap-3 p-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <>
      <SEO
        title="Ruteplanlægger – Serviceydere"
        description="Planlæg ruter på farten med den mobile ruteplanlægger."
        noIndex
      />
      <AdminShell
        business={business}
        activeTab="routes"
        contentPadding={false}
        contentClassName="flex flex-col overflow-hidden"
      >
        <DndContext
          sensors={sensors}
          collisionDetection={pointerWithin}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
          onDragCancel={() => setDrag(null)}
        >
        <div className="relative flex h-full min-h-0 flex-col bg-gradient-to-b from-background via-background to-secondary/20">
          {/* Dato-strip */}
          <div className="shrink-0 border-b border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-3 pt-3 pb-2.5">
            <div className="mb-2.5 flex items-center justify-between">
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setDate(format(addDays(parseISO(date), -7), "yyyy-MM-dd"))}
                  aria-label="Forrige uge"
                >
                  <ChevronLeft className="h-5 w-5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-full"
                  onClick={() => setDate(format(addDays(parseISO(date), 7), "yyyy-MM-dd"))}
                  aria-label="Næste uge"
                >
                  <ChevronRight className="h-5 w-5" />
                </Button>
              </div>
              <button
                type="button"
                onClick={() => setDate(todayStr())}
                className="rounded-full px-3 py-1 text-sm font-semibold capitalize tabular-nums text-foreground hover:bg-secondary transition-colors"
              >
                {weekLabel}
              </button>
              <ThemeToggle />
            </div>
            <div className="grid grid-cols-7 gap-1.5">
              {weekRange.days.map((d) => {
                const dt = parseISO(d);
                const isSel = d === date;
                const isToday = d === todayStr();
                const count = routeCountByDate.get(d) ?? 0;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDate(d)}
                    className={cn(
                      "relative flex flex-col items-center gap-0.5 rounded-xl py-2 transition-all",
                      isSel
                        ? "bg-foreground text-background shadow-sm scale-[1.02]"
                        : "hover:bg-secondary active:scale-95",
                    )}
                  >
                    <span className={cn("text-[10px] uppercase", isSel ? "text-background/70" : "text-muted-foreground")}>
                      {format(dt, "EEEEEE", { locale: da })}
                    </span>
                    <span className={cn("text-[15px] font-semibold tabular-nums leading-none", isToday && !isSel && "text-accent")}>
                      {format(dt, "d")}
                    </span>
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        count > 0
                          ? isSel
                            ? "bg-background"
                            : "bg-accent"
                          : "bg-transparent",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Hovedindhold: Ruter for dagen (med drop-zoner) */}
          <RoutesPane
            loading={loadingCalendar}
            date={date}
            routes={dayRoutes}
            stopsByRoute={stopsByRoute}
            onOpenRoute={setOpenRoute}
            onCreate={() => setCreateOpen(true)}
            dragActive={!!drag}
          />

          {/* Bund-dock: Uden rute (altid synlig, drag herfra eller drop hertil) */}
          <UnassignedDock
            loading={loadingUnassigned}
            search={search}
            setSearch={setSearch}
            jobs={filteredUnassigned}
            total={unassigned.length}
            onAssign={(job) => setAssignJob(job)}
            dragActive={!!drag}
            isStopDrag={drag?.kind === "stop"}
          />
        </div>

        {/* Drag overlay — flyder under fingeren */}
        {typeof document !== "undefined" && createPortal(
          <DragOverlay dropAnimation={null}>
            {drag?.kind === "job" && (
              <FloatingChip
                title={drag.job.customer_name || "Aftale"}
                subtitle={jobAddress(drag.job)}
              />
            )}
            {drag?.kind === "stop" && (
              <FloatingChip
                title={drag.stop.customer_name || "Stop"}
                subtitle={drag.stop.address || drag.stop.full_address || ""}
              />
            )}
          </DragOverlay>,
          document.body,
        )}
        </DndContext>
      </AdminShell>

      {/* Ny-rute-dialog — kræver mindst én aftale */}
      {businessId && (
        <NewRouteDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          businessId={businessId}
          date={date}
          usedColors={dayRoutes.map((r) => r.color)}
          unassigned={unassigned as any[]}
          onCreated={(r) => {
            setCreateOpen(false);
            setOpenRoute(r);
          }}
        />
      )}

      {/* Sheets */}
      {assignJob && businessId && (
        <MobileAssignSheet
          open={!!assignJob}
          onOpenChange={(o) => !o && setAssignJob(null)}
          job={assignJob}
          businessId={businessId}
          initialDate={effectiveJobDate(assignJob) || date}
        />
      )}
      {openRoute && businessId && (
        <MobileRouteDetailSheet
          open={!!openRoute}
          onOpenChange={(o) => !o && setOpenRoute(null)}
          route={allRoutes.find((r) => r.id === openRoute.id) ?? openRoute}
          businessId={businessId}
          employees={employees as any[]}
          stops={stopsByRoute.get(openRoute.id) ?? []}
        />
      )}
    </>
  );
}

/* ─────────────────────────── Ruter-pane (top) ───────────────────────────
 * Viser dagens ruter som ekspanderede kort med stop-liste indeni.
 * Hver rute er en drop-zone (træk en aftale eller stop hertil).
 * Hver stop-række er en drag-handle (long-press for at flytte).
 */
function RoutesPane({
  loading,
  date,
  routes,
  stopsByRoute,
  onOpenRoute,
  onCreate,
  dragActive,
}: {
  loading: boolean;
  date: string;
  routes: Route[];
  stopsByRoute: Map<string, RouteStop[]>;
  onOpenRoute: (r: Route) => void;
  onCreate: () => void;
  dragActive: boolean;
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3">
      <div className="mb-2.5 flex items-center justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Dagens ruter
          </p>
          <p className="mt-0.5 text-base font-semibold capitalize text-foreground">
            {format(parseISO(date), "EEEE d. MMM", { locale: da })}
          </p>
        </div>
        <Button onClick={onCreate} size="sm" className="gap-1.5 rounded-full">
          <Plus className="h-4 w-4" />
          Ny rute
        </Button>
      </div>

      {loading ? (
        <div className="space-y-2.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28 w-full rounded-2xl" />
          ))}
        </div>
      ) : routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-12 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <CalendarClock className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">Ingen ruter denne dag</p>
          <p className="mt-1 max-w-[18rem] text-xs leading-snug text-muted-foreground">
            Tryk på "Ny rute" — eller hold en aftale i bunden inde og træk den herop.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {routes.map((r) => (
            <DroppableRouteCard
              key={r.id}
              route={r}
              stops={stopsByRoute.get(r.id) ?? []}
              onOpenRoute={onOpenRoute}
              dragActive={dragActive}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function DroppableRouteCard({
  route,
  stops,
  onOpenRoute,
  dragActive,
}: {
  route: Route;
  stops: RouteStop[];
  onOpenRoute: (r: Route) => void;
  dragActive: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: `route:${route.id}`,
    data: { type: "route", routeId: route.id },
  });
  const done = stops.filter((s) => s.status === "completed").length;
  const totalMin = route.total_duration_minutes ?? 0;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "overflow-hidden rounded-2xl border bg-card shadow-sm transition-all",
        isOver
          ? "border-accent ring-2 ring-accent/30 shadow-md"
          : dragActive
            ? "border-dashed border-foreground/30"
            : "border-border",
      )}
    >
      {/* Header — tap for at åbne detalje-sheet */}
      <button
        type="button"
        onClick={() => onOpenRoute(route)}
        className="flex w-full items-stretch gap-3 px-3 pt-3 pb-2 text-left active:bg-secondary/40"
      >
        <span
          className="w-1.5 shrink-0 rounded-full"
          style={{ backgroundColor: route.color }}
          aria-hidden
        />
        <div className="min-w-0 flex-1 py-0.5">
          <p className="truncate text-[15px] font-semibold leading-tight text-foreground">
            {route.name || "Rute uden navn"}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
              <MapPin className="h-3 w-3" />
              {stops.length} stop
            </span>
            {route.total_distance_km != null && route.total_distance_km > 0 && (
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground">
                {Math.round(route.total_distance_km)} km
              </span>
            )}
            {totalMin > 0 && (
              <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground">
                {formatDur(totalMin)}
              </span>
            )}
            {done > 0 && (
              <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                {done} udført
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground" />
      </button>

      {/* Inline stop-liste */}
      <div className="border-t border-border/60 px-2 pb-2 pt-1.5">
        {stops.length === 0 ? (
          <div
            className={cn(
              "flex items-center justify-center rounded-xl border-2 border-dashed py-5 text-[11px]",
              isOver
                ? "border-accent/60 bg-accent/5 text-accent"
                : "border-border text-muted-foreground",
            )}
          >
            {isOver ? "Slip for at tilføje" : "Træk en aftale hertil"}
          </div>
        ) : (
          <ol className="space-y-1">
            {stops.map((s, idx) => (
              <DraggableStopRow
                key={s.id}
                stop={s}
                index={idx + 1}
                routeColor={route.color}
                onOpenRoute={() => onOpenRoute(route)}
              />
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}

function DraggableStopRow({
  stop,
  index,
  routeColor,
  onOpenRoute,
}: {
  stop: RouteStop;
  index: number;
  routeColor: string;
  onOpenRoute: () => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `stop:${stop.id}`,
    data: { type: "stop", stop, fromRouteId: stop.route_id },
  });
  const completed = stop.status === "completed";
  return (
    <li
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-1.5 rounded-xl border border-border/70 bg-background/60 p-1.5 transition-opacity",
        isDragging && "opacity-30",
      )}
    >
      {/* Drag-handle — long-press for at trække */}
      <button
        type="button"
        {...listeners}
        {...attributes}
        aria-label="Træk stop"
        className="flex h-9 w-7 shrink-0 touch-none items-center justify-center rounded-md text-muted-foreground active:bg-secondary"
      >
        <GripVertical className="h-4 w-4" />
      </button>
      <span
        className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold",
          completed ? "bg-emerald-600 text-white" : "text-white",
        )}
        style={!completed ? { backgroundColor: routeColor } : undefined}
      >
        {index}
      </span>
      <button
        type="button"
        onClick={onOpenRoute}
        className="flex min-w-0 flex-1 flex-col items-start py-0.5 text-left"
      >
        <span
          className={cn(
            "truncate text-[13px] font-medium leading-tight",
            completed ? "text-muted-foreground line-through" : "text-foreground",
          )}
        >
          {stop.customer_name || "Stop"}
        </span>
        {(stop.address || stop.full_address) && (
          <span className="truncate text-[11px] leading-tight text-muted-foreground">
            {stop.address || stop.full_address}
          </span>
        )}
      </button>
    </li>
  );
}

/* ─────────────────────── Uden-rute dock (bund) ───────────────────────
 * Altid synlig under ruterne. Drop et stop hertil for at fjerne det
 * fra ruten. Træk en aftale herfra op til en rute for at tildele.
 */
function UnassignedDock({
  loading,
  search,
  setSearch,
  jobs,
  total,
  onAssign,
  dragActive,
  isStopDrag,
}: {
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  jobs: any[];
  total: number;
  onAssign: (job: any) => void;
  dragActive: boolean;
  isStopDrag: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "unassigned-dock",
    data: { type: "unassigned" },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "shrink-0 border-t bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 transition-colors",
        isStopDrag && isOver
          ? "border-destructive bg-destructive/5"
          : "border-border",
      )}
      style={{ maxHeight: "42vh" }}
    >
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary">
            {isStopDrag && isOver ? (
              <Trash2 className="h-3.5 w-3.5 text-destructive" />
            ) : (
              <Inbox className="h-3.5 w-3.5 text-foreground" />
            )}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[13px] font-semibold text-foreground">
              {isStopDrag && isOver
                ? "Slip for at fjerne fra rute"
                : total === 0
                  ? "Alle aftaler er planlagt"
                  : `${total} uden rute`}
            </p>
            <p className="truncate text-[10px] text-muted-foreground">
              Hold inde og træk op i en rute
            </p>
          </div>
        </div>
        {total > 0 && (
          <Badge variant="secondary" className="shrink-0 rounded-full px-2 tabular-nums">
            {total}
          </Badge>
        )}
      </div>

      {total > 0 && (
        <div className="relative px-3 pb-2">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Søg kunde eller adresse"
            className="h-8 rounded-full pl-7 text-xs"
          />
        </div>
      )}

      <div
        className={cn(
          "overflow-x-auto overflow-y-hidden px-3 pb-3 pt-1",
          // Vis et "drop her"-hint hvis en aftale slæbes (men ikke nyttigt — kun stops kan droppes her)
        )}
      >
        {loading ? (
          <div className="flex gap-2">
            {[0, 1, 2].map((i) => (
              <Skeleton key={i} className="h-24 w-44 shrink-0 rounded-2xl" />
            ))}
          </div>
        ) : total === 0 ? (
          <div className="flex items-center justify-center py-4 text-center text-xs text-muted-foreground">
            Nye aftaler dukker op her, klar til at blive trukket ind i en rute.
          </div>
        ) : jobs.length === 0 ? (
          <div className="py-6 text-center text-xs text-muted-foreground">
            Ingen aftaler matcher søgningen.
          </div>
        ) : (
          <div className="flex gap-2 pb-1">
            {jobs.map((job) => (
              <DraggableJobCard key={job.id} job={job} onAssign={onAssign} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function DraggableJobCard({ job, onAssign }: { job: any; onAssign: (job: any) => void }) {
  const pending = isJobPending(job);
  const wishDate = effectiveJobDate(job);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `job:${job.id}`,
    data: { type: "job", job },
    disabled: pending,
  });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex w-52 shrink-0 flex-col rounded-2xl border border-border bg-background p-2.5 shadow-sm transition-opacity",
        isDragging && "opacity-30",
        pending && "opacity-90",
      )}
    >
      <div className="flex items-start gap-1.5">
        {!pending && (
          <button
            type="button"
            {...listeners}
            {...attributes}
            aria-label="Træk aftale"
            className="-ml-1 flex h-7 w-5 shrink-0 touch-none items-center justify-center text-muted-foreground active:text-foreground"
          >
            <GripVertical className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12.5px] font-semibold text-foreground">
            {job.customer_name || "Ukendt kunde"}
          </p>
          <p className="truncate text-[10.5px] text-muted-foreground">
            {jobAddress(job)}
          </p>
        </div>
      </div>
      <p className="mt-1 line-clamp-2 text-[10.5px] leading-snug text-muted-foreground">
        {serviceSummaryForJob(job)}
      </p>
      {wishDate && (
        <span className="mt-1.5 inline-flex w-fit items-center rounded-full bg-secondary px-1.5 py-0.5 text-[9.5px] font-medium tabular-nums text-foreground">
          Ønsket {format(parseISO(wishDate), "d. MMM", { locale: da })}
        </span>
      )}
      {pending ? (
        <span className="mt-1.5 inline-flex w-fit items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
          Afventer kunde
        </span>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="mt-2 h-7 rounded-full text-[11px]"
          onClick={() => onAssign(job)}
        >
          Vælg rute
        </Button>
      )}
    </div>
  );
}

/* DragOverlay-indhold — flyder under fingeren */
function FloatingChip({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="pointer-events-none flex w-56 items-center gap-2 rounded-2xl border border-accent bg-card p-2.5 shadow-2xl ring-2 ring-accent/40">
      <GripVertical className="h-4 w-4 shrink-0 text-accent" />
      <div className="min-w-0 flex-1">
        <p className="truncate text-[13px] font-semibold text-foreground">{title}</p>
        {subtitle && (
          <p className="truncate text-[10.5px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

/* ──────────────────────── Ny-rute dialog ────────────────────────
 * Spørger om navn og hvilke aftaler ruten skal indeholde — opretter
 * først rute (og tilføjer stops) når brugeren bekræfter. Lukker man
 * dialogen uden at gemme, sker der intet.
 */
function NewRouteDialog({
  open,
  onOpenChange,
  businessId,
  date,
  usedColors,
  unassigned,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  businessId: string;
  date: string;
  usedColors: string[];
  unassigned: any[];
  onCreated: (r: Route) => void;
}) {
  const [name, setName] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [jobSearch, setJobSearch] = useState("");
  const createRoute = useCreateRoute();
  const addStop = useAddStop();
  const [submitting, setSubmitting] = useState(false);

  // Nulstil felter når dialogen åbner
  const reset = () => {
    setName("");
    setSelected([]);
    setJobSearch("");
  };

  const eligible = useMemo(
    () => unassigned.filter((j) => j.status !== "pending"),
    [unassigned],
  );
  const filtered = useMemo(() => {
    const q = jobSearch.trim().toLowerCase();
    if (!q) return eligible;
    return eligible.filter(
      (j) =>
        j.customer_name?.toLowerCase().includes(q) ||
        j.address?.toLowerCase().includes(q) ||
        j.city?.toLowerCase().includes(q),
    );
  }, [eligible, jobSearch]);

  const handleSubmit = async () => {
    if (submitting || selected.length === 0) return;
    setSubmitting(true);
    try {
      const created = await createRoute.mutateAsync({
        business_id: businessId,
        route_date: date,
        name: name.trim() || null,
        color: pickAvailableColor(usedColors),
      });
      // Tilføj valgte aftaler som stops
      for (let i = 0; i < selected.length; i++) {
        const job = eligible.find((j) => j.id === selected[i]);
        if (!job) continue;
        try {
          await addStop.mutateAsync({
            route_id: created.id,
            order_id: job.id,
            sequence: i,
            customer_name: job.customer_name,
            customer_phone: job.customer_phone,
            address: jobAddress(job),
            latitude: job.latitude,
            longitude: job.longitude,
            service_summary: serviceSummaryForJob(job),
            duration_minutes: Number(job.estimated_duration_minutes) || 30,
            time_window_start: job.preferred_time_start || null,
            time_window_end: job.preferred_time_end || null,
          });
          void linkAgreementToRoute(job.id, created.id);
        } catch (err) {
          console.warn("Kunne ikke tilføje aftale", err);
        }
      }
      toast.success(
        `Ny rute oprettet med ${selected.length} ${selected.length === 1 ? "aftale" : "aftaler"}`,
      );
      reset();
      onCreated(created);
    } catch (err: any) {
      toast.error("Kunne ikke oprette rute", { description: err?.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Ny rute</DialogTitle>
          <DialogDescription>
            {format(parseISO(date), "EEEE d. MMM yyyy", { locale: da })} — vælg
            mindst én aftale.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-semibold text-muted-foreground">
              Navn (valgfrit)
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Fx 'Nord' eller 'Tirsdag'"
              className="h-9"
            />
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground">
                Aftaler ({selected.length} valgt)
              </label>
            </div>
            {eligible.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border bg-card/40 p-4 text-center text-xs text-muted-foreground">
                Ingen aftaler uden rute. Opret en bestilling først.
              </div>
            ) : (
              <>
                <div className="relative mb-2">
                  <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={jobSearch}
                    onChange={(e) => setJobSearch(e.target.value)}
                    placeholder="Søg…"
                    className="h-8 pl-7 text-xs"
                  />
                </div>
                <div className="max-h-56 divide-y overflow-y-auto rounded-lg border border-border bg-background">
                  {filtered.slice(0, 50).map((j: any) => {
                    const checked = selected.includes(j.id);
                    return (
                      <label
                        key={j.id}
                        className={cn(
                          "flex cursor-pointer items-start gap-2 p-2 text-xs hover:bg-secondary/50",
                          checked && "bg-accent/5",
                        )}
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={(v) =>
                            setSelected((prev) =>
                              v ? [...prev, j.id] : prev.filter((x) => x !== j.id),
                            )
                          }
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium text-foreground">
                            {j.customer_name || "Ukendt kunde"}
                          </p>
                          <p className="truncate text-[11px] text-muted-foreground">
                            {jobAddress(j)}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                  {filtered.length === 0 && (
                    <div className="p-3 text-center text-xs text-muted-foreground">
                      Ingen aftaler matcher.
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            Annullér
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || selected.length === 0}
          >
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            Opret rute
            {selected.length > 0 && ` med ${selected.length}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { formatDur };