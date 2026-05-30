// Mobil ruteplanlægger — tap-baseret alternativ til desktop drag-and-drop.
// Aktiveres under 768px (telefoner). Layoutet matcher computerversionen:
// ruterne for dagen vises øverst (med deres stop indeni) og en altid-
// synlig "Uden rute"-dock i bunden. Long-press på en aftale eller et
// stop løfter den op til drag-and-drop — så man kan trække aftaler ind
// i ruter, flytte stop mellem ruter eller trække stop tilbage til
// "Uden rute" for at fjerne. "Ny rute" åbner en bekræftelses-dialog så
// der aldrig oprettes tomme ruter.
import { useEffect, useMemo, useRef, useState } from "react";
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
  CheckCircle2,
  CheckSquare,
  X,
  RefreshCw,
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
import { useQueryClient } from "@tanstack/react-query";

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
import { usePersistentState } from "@/hooks/usePersistentState";
import { startDragAutoScroll, stopDragAutoScroll } from "@/components/route-planner/lib/drag-auto-scroll";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";
import { CARD_BASE, CARD_BORDER, CARD_HOVER } from "@/components/route-planner/lib/card-styles";
import { formatInterval } from "@/lib/interval";
import { isToday, isTomorrow, isPast, differenceInDays } from "date-fns";

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

  // Persistér valgte dato på tværs af sessioner, men nulstil til i dag hvis
  // gemt dato er ældre end "i går" (man vil sjældent fortsætte i fortiden).
  const [date, setDate] = usePersistentState<string>(
    "route-planner-mobile:date",
    todayStr(),
  );
  useEffect(() => {
    try {
      const today = parseISO(todayStr());
      const cur = parseISO(date);
      if (cur < addDays(today, -1)) setDate(todayStr());
    } catch { /* ignore */ }
    // kun ved første mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [search, setSearch] = useState("");
  const [assignJob, setAssignJob] = useState<any | null>(null);
  const [openRoute, setOpenRoute] = useState<Route | null>(null);
  // "Ny rute"-dialog — opretter først rute når brugeren bekræfter.
  const [createOpen, setCreateOpen] = useState(false);
  // Multi-select i dock — tap "Vælg flere" → checkboxes → bulk-tildel
  const [selectMode, setSelectMode] = useState(false);
  const [selectedJobs, setSelectedJobs] = useState<Set<string>>(new Set());
  const [bulkAssignOpen, setBulkAssignOpen] = useState(false);
  // Aktiv drag — bruges til DragOverlay og til at vise drop-zoner.
  const [drag, setDrag] = useState<
    | { kind: "job"; job: any }
    | { kind: "stop"; stop: RouteStop; fromRouteId: string }
    | null
  >(null);
  // Tablet (≥768 men <1024) → vis ruter + dock side om side.
  const isTablet = !useIsBelowBreakpoint(640);
  // Peger-position til auto-scroll under drag.
  const pointerRef = useRef<{ x: number; y: number } | null>(null);
  const qc = useQueryClient();

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
    // Start auto-scroll: følg pointer og scroll containere når man trækker nær kanten.
    startDragAutoScroll(() => pointerRef.current);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const active = drag;
    setDrag(null);
    stopDragAutoScroll();
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

  // Track pointer position for auto-scroll
  useEffect(() => {
    const onMove = (e: PointerEvent | TouchEvent) => {
      if ("touches" in e) {
        const t = e.touches[0] ?? e.changedTouches[0];
        if (t) pointerRef.current = { x: t.clientX, y: t.clientY };
      } else {
        pointerRef.current = { x: e.clientX, y: e.clientY };
      }
    };
    window.addEventListener("pointermove", onMove as any, { passive: true });
    window.addEventListener("touchmove", onMove as any, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onMove as any);
      window.removeEventListener("touchmove", onMove as any);
    };
  }, []);

  // Pull-to-refresh — gen-indlæser kalender + uden-rute uden at navigere væk.
  const refresh = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["route-calendar", businessId] }),
      qc.invalidateQueries({ queryKey: ["unassigned-jobs", businessId] }),
    ]);
  };

  // Toggle multi-select mode
  const toggleSelectMode = () => {
    setSelectMode((v) => {
      if (v) setSelectedJobs(new Set());
      return !v;
    });
  };
  const toggleJobSelected = (id: string) => {
    setSelectedJobs((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
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
          onDragCancel={() => { setDrag(null); stopDragAutoScroll(); }}
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

          {/* Hovedindhold: split-view på tablet, stacked på telefon */}
          <div className={cn(
            "relative flex min-h-0 flex-1",
            isTablet ? "flex-row" : "flex-col",
          )}>
            <RoutesPane
              loading={loadingCalendar}
              date={date}
              routes={dayRoutes}
              stopsByRoute={stopsByRoute}
              onOpenRoute={setOpenRoute}
              onCreate={() => setCreateOpen(true)}
              dragActive={!!drag}
              onRefresh={refresh}
              className={isTablet ? "min-w-0 flex-1 border-r border-border/60" : ""}
            />
            <UnassignedDock
              loading={loadingUnassigned}
              search={search}
              setSearch={setSearch}
              jobs={filteredUnassigned}
              total={unassigned.length}
              onAssign={(job) => setAssignJob(job)}
              dragActive={!!drag}
              isStopDrag={drag?.kind === "stop"}
              selectMode={selectMode}
              onToggleSelectMode={toggleSelectMode}
              selectedJobs={selectedJobs}
              onToggleJob={toggleJobSelected}
              onBulkAssign={() => setBulkAssignOpen(true)}
              isTablet={isTablet}
            />
          </div>
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

      {/* Bulk-tildel sheet (multi-select) */}
      {bulkAssignOpen && businessId && (
        <BulkAssignSheet
          open={bulkAssignOpen}
          onOpenChange={(o) => {
            setBulkAssignOpen(o);
            if (!o) { setSelectMode(false); setSelectedJobs(new Set()); }
          }}
          jobs={(unassigned as any[]).filter((j) => selectedJobs.has(j.id) && !isJobPending(j))}
          businessId={businessId}
          date={date}
          existingRoutes={dayRoutes}
          usedColors={dayRoutes.map((r) => r.color)}
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
  onRefresh,
  className,
}: {
  loading: boolean;
  date: string;
  routes: Route[];
  stopsByRoute: Map<string, RouteStop[]>;
  onOpenRoute: (r: Route) => void;
  onCreate: () => void;
  dragActive: boolean;
  onRefresh: () => Promise<void>;
  className?: string;
}) {
  // Pull-to-refresh state — træk ned fra toppen for at gen-indlæse.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [pull, setPull] = useState(0); // px trukket ned (0 = hvile)
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    if (refreshing) return;
    const el = scrollRef.current;
    if (!el || el.scrollTop > 0) { startY.current = null; return; }
    startY.current = e.touches[0]?.clientY ?? null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (startY.current == null) return;
    const dy = (e.touches[0]?.clientY ?? 0) - startY.current;
    if (dy <= 0) { setPull(0); return; }
    setPull(Math.min(90, dy * 0.5));
  };
  const onTouchEnd = async () => {
    if (startY.current == null) { setPull(0); return; }
    startY.current = null;
    if (pull > 55) {
      setRefreshing(true);
      setPull(46);
      try { await onRefresh(); } finally {
        setRefreshing(false);
        setPull(0);
      }
    } else {
      setPull(0);
    }
  };

  return (
    <div
      ref={scrollRef}
      className={cn("relative min-h-0 flex-1 overflow-y-auto px-3 pb-3 pt-3", className)}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => { startY.current = null; setPull(0); }}
    >
      {/* Pull-to-refresh indikator */}
      {(pull > 0 || refreshing) && (
        <div
          className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-center text-muted-foreground"
          style={{ height: pull, opacity: Math.min(1, pull / 40) }}
        >
          <RefreshCw className={cn("h-4 w-4", (refreshing || pull > 55) && "animate-spin text-accent")} />
        </div>
      )}
      <div style={{ transform: pull ? `translateY(${pull}px)` : undefined, transition: pull === 0 ? "transform 200ms" : undefined }}>
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
  const optimize = useOptimizeRoute();
  const optimizing = optimize.isPending && optimize.variables === route.id;
  const stopIds = stops.map((s) => s.id);

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "relative overflow-hidden rounded-lg border bg-card shadow-[0_2px_10px_-6px_hsl(var(--foreground)/0.18)] transition-all",
        isOver
          ? "border-accent/70 bg-accent/[0.04] ring-2 ring-accent/25 shadow-[0_8px_24px_-12px_hsl(var(--accent)/0.35)]"
          : dragActive
            ? "border-dashed border-accent/40 bg-accent/[0.02]"
            : "border-border/70 hover:border-foreground/25",
      )}
    >
      {/* Top farve-stribe — matcher desktop EmployeeColumn */}
      <span
        aria-hidden
        className="absolute inset-x-0 top-0 h-1 opacity-90"
        style={{ background: route.color }}
      />
      {/* Header — tap for at åbne detalje-sheet */}
      <div className="flex items-stretch gap-2.5 px-3 pt-3.5 pb-2.5">
        <button
          type="button"
          onClick={() => onOpenRoute(route)}
          className="flex min-w-0 flex-1 items-start gap-2.5 text-left active:opacity-80"
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-[10px] font-bold leading-none text-background ring-2 ring-background shadow-[0_2px_6px_-2px_hsl(var(--foreground)/0.25)]"
            style={{ background: route.color }}
          >
            {(route.name || "R").charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1 py-0.5">
            <p className="truncate text-sm font-bold leading-tight tracking-tight text-foreground">
              {route.name || "Rute uden navn"}
            </p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1">
              <Badge variant="secondary" className="h-5 rounded-md px-1.5 text-[10px] font-semibold tabular-nums">
                {done > 0 ? `${done}/${stops.length}` : `${stops.length}`} stop
              </Badge>
              {route.total_distance_km != null && route.total_distance_km > 0 && (
                <Badge variant="outline" className="h-5 gap-0.5 rounded-md border-border/70 px-1.5 text-[10px] tabular-nums">
                  <MapPin className="h-2.5 w-2.5" />
                  {route.total_distance_km.toFixed(1)} km
                </Badge>
              )}
              {totalMin > 0 && (
                <Badge variant="outline" className="h-5 gap-0.5 rounded-md border-border/70 px-1.5 text-[10px] tabular-nums">
                  <Clock className="h-2.5 w-2.5" />
                  {formatDur(totalMin)}
                </Badge>
              )}
            </div>
          </div>
        </button>
        {stops.length >= 2 && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-8 shrink-0 gap-1 self-start rounded-md border-border/70 px-2.5 text-xs"
            onClick={async () => {
              try {
                await optimize.mutateAsync(route.id);
                toast.success("Rute optimeret");
              } catch (err: any) {
                toast.error("Optimering fejlede", { description: err?.message });
              }
            }}
            disabled={optimizing}
            title="AI-optimér rækkefølge"
          >
            {optimizing ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
            Optimér
          </Button>
        )}
      </div>

      {/* Inline stop-liste — sorterbar inden for ruten */}
      <div className="border-t border-border/60 px-2.5 pb-2.5 pt-2">
        {stops.length === 0 ? (
          <div
            className={cn(
              "flex items-center justify-center rounded-md border-2 border-dashed py-8 text-[11px] transition-all",
              isOver
                ? "border-accent/60 bg-accent/[0.06] font-medium text-accent"
                : dragActive
                  ? "border-accent/40 text-accent/80"
                  : "border-border/50 text-muted-foreground/70",
            )}
          >
            {isOver ? "Slip for at tildele" : "Træk aftaler hertil"}
          </div>
        ) : (
          <SortableContext items={stopIds} strategy={verticalListSortingStrategy}>
            <ol className="space-y-2">
              {stops.map((s, idx) => (
                <SortableStopRow
                  key={s.id}
                  stop={s}
                  index={idx + 1}
                  routeColor={route.color}
                  onOpenRoute={() => onOpenRoute(route)}
                />
              ))}
            </ol>
          </SortableContext>
        )}
      </div>
    </div>
  );
}

function SortableStopRow({
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
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: stop.id,
    data: { type: "stop", stop, fromRouteId: stop.route_id },
  });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };
  const completed = stop.status === "completed";
  const dur = (stop as any).duration_minutes as number | undefined;
  const interval = (stop as any).agreement_interval as string | undefined;
  const intervalLabel = interval ? formatInterval(interval) : null;
  const distanceToNext = (stop as any).distance_to_next_km as number | undefined;
  const serviceSummary = (stop as any).service_summary as string | undefined;
  const addressLine = stop.address || (stop as any).full_address;

  // Swipe-to-delete — træk rækken til venstre for at afsløre Slet-knap.
  // Brugeren slipper for at bekræfte; en lille tryk-undo følger ikke med,
  // men handlingen er to-trins (træk + tap) så den er hård at trigge ved et uheld.
  const [swipe, setSwipe] = useState(0);
  const swipeStart = useRef<number | null>(null);
  const deleteStop = useDeleteStop();
  const REVEAL = 84;
  const onTouchStart = (e: React.TouchEvent) => {
    if (isDragging) return;
    swipeStart.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchMove = (e: React.TouchEvent) => {
    if (swipeStart.current == null) return;
    const dx = (e.touches[0]?.clientX ?? 0) - swipeStart.current;
    if (dx > 0) { setSwipe(0); return; }
    setSwipe(Math.max(-REVEAL - 20, dx));
  };
  const onTouchEnd = () => {
    if (swipeStart.current == null) return;
    swipeStart.current = null;
    setSwipe(swipe < -REVEAL / 2 ? -REVEAL : 0);
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative overflow-hidden rounded-xl",
        isDragging && "z-10 opacity-30",
      )}
    >
      {/* Bag-laget: Slet-knap der afsløres ved swipe-venstre */}
      {swipe < -8 && !isDragging && (
        <button
          type="button"
          aria-label="Fjern stop fra rute"
          className="absolute inset-y-0 right-0 flex w-20 items-center justify-center gap-1 bg-destructive text-[11px] font-semibold text-destructive-foreground"
          onClick={async () => {
            try {
              await deleteStop.mutateAsync(stop.id);
              toast.success("Stop fjernet");
            } catch (err: any) {
              toast.error("Kunne ikke fjerne", { description: err?.message });
            } finally {
              setSwipe(0);
            }
          }}
        >
          <Trash2 className="h-3.5 w-3.5" /> Slet
        </button>
      )}
      <div
        className={cn(
          CARD_BASE,
          "p-2.5 pl-3 transition-transform",
          completed
            ? "border-emerald-200/70 bg-emerald-50/40 opacity-80 dark:border-emerald-500/25 dark:bg-emerald-500/10"
            : cn(CARD_BORDER, CARD_HOVER),
        )}
        style={{ transform: swipe ? `translateX(${swipe}px)` : undefined }}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        onTouchCancel={() => { swipeStart.current = null; setSwipe(0); }}
      >
        {/* Venstre farve-rail — matcher desktop SortableStopCard */}
        <span
          aria-hidden
          className="absolute left-0 top-0 bottom-0 w-1 opacity-90"
          style={{ background: completed ? "hsl(var(--muted-foreground) / 0.4)" : routeColor }}
        />
        <div className="flex items-start gap-2">
          {/* Nummeret farve-badge — fungerer som drag-handle (long-press) */}
          <span
            {...listeners}
            {...attributes}
            aria-label="Træk stop"
            className={cn(
              "flex h-6 w-6 shrink-0 cursor-grab touch-none items-center justify-center rounded-md text-[11px] font-bold leading-none text-background ring-2 ring-background shadow-[0_2px_4px_-1px_hsl(var(--foreground)/0.2)] transition-transform active:scale-95 active:cursor-grabbing",
              completed && "opacity-50",
            )}
            style={{ background: routeColor }}
          >
            {index}
          </span>
          <button
            type="button"
            onClick={onOpenRoute}
            className="flex min-w-0 flex-1 flex-col items-start py-0.5 text-left"
          >
            <span className={cn(
              "truncate text-xs font-bold leading-tight w-full",
              completed && "text-muted-foreground line-through",
            )}>
              {stop.customer_name || "Stop"}
            </span>
            <span className={cn(
              "truncate text-[10px] leading-tight mt-0.5 w-full",
              serviceSummary ? "text-foreground/75 font-medium" : "italic text-muted-foreground",
            )}>
              {serviceSummary || "Ingen ydelser angivet"}
            </span>
            {intervalLabel && (
              <span className="truncate text-[10px] leading-tight text-muted-foreground mt-0.5 w-full">
                {intervalLabel}
              </span>
            )}
            {addressLine && (
              <span className="mt-0.5 flex w-full items-center gap-0.5 truncate text-[10px] leading-tight text-muted-foreground">
                <MapPin className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{addressLine}</span>
              </span>
            )}
            {distanceToNext != null && distanceToNext > 0 && (
              <span className="mt-0.5 text-[10px] leading-tight text-muted-foreground">
                → {distanceToNext.toFixed(1)} km
              </span>
            )}
          </button>
          {dur ? (
            <span className="ml-1 inline-flex shrink-0 items-center gap-0.5 rounded-md bg-secondary px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
              <Clock className="h-2.5 w-2.5" />
              {dur}m
            </span>
          ) : null}
        </div>
      </div>
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
  selectMode,
  onToggleSelectMode,
  selectedJobs,
  onToggleJob,
  onBulkAssign,
  isTablet,
}: {
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  jobs: any[];
  total: number;
  onAssign: (job: any) => void;
  dragActive: boolean;
  isStopDrag: boolean;
  selectMode: boolean;
  onToggleSelectMode: () => void;
  selectedJobs: Set<string>;
  onToggleJob: (id: string) => void;
  onBulkAssign: () => void;
  isTablet: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: "unassigned-dock",
    data: { type: "unassigned" },
  });
  const selectedCount = selectedJobs.size;

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 transition-colors",
        isTablet
          ? "flex w-[320px] shrink-0 flex-col border-l"
          : "shrink-0 border-t",
        isStopDrag && isOver
          ? "border-destructive bg-destructive/5"
          : "border-border",
      )}
      style={isTablet ? undefined : { maxHeight: total === 0 && !isStopDrag ? "auto" : "42vh" }}
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
              {total === 0
                ? "Nye aftaler dukker op her"
                : isStopDrag
                  ? "Slip her for at fjerne stoppet"
                  : selectMode
                    ? `${selectedCount} valgt`
                    : "Hold inde og træk op i en rute"}
            </p>
          </div>
        </div>
        {total > 0 && (
          <div className="flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              size="sm"
              variant={selectMode ? "secondary" : "ghost"}
              className="h-7 gap-1 rounded-full px-2 text-[11px]"
              onClick={onToggleSelectMode}
            >
              {selectMode ? <X className="h-3 w-3" /> : <CheckSquare className="h-3 w-3" />}
              {selectMode ? "Annullér" : "Vælg flere"}
            </Button>
            {!selectMode && (
              <Badge variant="secondary" className="rounded-full px-2 tabular-nums">
                {total}
              </Badge>
            )}
          </div>
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

      {/* Skjul scroll-area helt når der ingen aftaler er — sparer plads */}
      {(total > 0 || loading) && (
        <div className={cn(
          "px-3 pt-1",
          isTablet ? "min-h-0 flex-1 overflow-y-auto pb-3" : "overflow-x-auto overflow-y-hidden pb-3",
        )}>
          {loading ? (
            <div className={cn(isTablet ? "space-y-2" : "flex gap-2")}>
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className={cn("h-24 rounded-2xl", isTablet ? "w-full" : "w-44 shrink-0")} />
              ))}
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-6 text-center text-xs text-muted-foreground">
              Ingen aftaler matcher søgningen.
            </div>
          ) : (
            <div className={cn(isTablet ? "space-y-2 pb-1" : "flex gap-2 pb-1")}>
              {jobs.map((job) => (
                <DraggableJobCard
                  key={job.id}
                  job={job}
                  onAssign={onAssign}
                  selectMode={selectMode}
                  selected={selectedJobs.has(job.id)}
                  onToggle={() => onToggleJob(job.id)}
                  fullWidth={isTablet}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bulk-actions bar — vises når selectMode er aktiv og noget er valgt */}
      {selectMode && selectedCount > 0 && (
        <div className="sticky bottom-0 flex items-center justify-between gap-2 border-t border-border bg-card/95 px-3 py-2 backdrop-blur">
          <span className="text-xs font-semibold text-foreground">
            {selectedCount} valgt
          </span>
          <Button size="sm" className="h-8 rounded-full" onClick={onBulkAssign}>
            Tildel rute
          </Button>
        </div>
      )}
    </div>
  );
}

function DraggableJobCard({
  job,
  onAssign,
  selectMode,
  selected,
  onToggle,
  fullWidth,
}: {
  job: any;
  onAssign: (job: any) => void;
  selectMode: boolean;
  selected: boolean;
  onToggle: () => void;
  fullWidth: boolean;
}) {
  const pending = isJobPending(job);
  const wishDate = effectiveJobDate(job);
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `job:${job.id}`,
    data: { type: "job", job },
    disabled: pending || selectMode,
  });

  // Urgency-tema: matcher desktop UnassignedJobCard's venstre-rail.
  const wd = wishDate ? parseISO(wishDate) : null;
  const urgency = (() => {
    if (pending) {
      return { rail: "bg-amber-400", pillBg: "bg-amber-50 dark:bg-amber-500/10", pillText: "text-amber-700 dark:text-amber-300", pillBorder: "border-amber-200 dark:border-amber-500/30", label: "Afventer kunde", pulse: false };
    }
    if (!wd) {
      return { rail: "bg-muted-foreground/30", pillBg: "bg-secondary", pillText: "text-muted-foreground", pillBorder: "border-border", label: "Ikke planlagt", pulse: false };
    }
    if (isPast(wd) && !isToday(wd)) {
      return { rail: "bg-destructive", pillBg: "bg-destructive/10", pillText: "text-destructive", pillBorder: "border-destructive/30", label: `${Math.abs(differenceInDays(wd, new Date()))} dage forsinket`, pulse: true };
    }
    if (isToday(wd)) {
      return { rail: "bg-orange-500", pillBg: "bg-orange-50 dark:bg-orange-500/10", pillText: "text-orange-700 dark:text-orange-300", pillBorder: "border-orange-200 dark:border-orange-500/30", label: "I dag", pulse: true };
    }
    if (isTomorrow(wd)) {
      return { rail: "bg-amber-500", pillBg: "bg-amber-50 dark:bg-amber-500/10", pillText: "text-amber-700 dark:text-amber-300", pillBorder: "border-amber-200 dark:border-amber-500/30", label: "I morgen", pulse: false };
    }
    return { rail: "bg-primary", pillBg: "bg-primary/10", pillText: "text-foreground", pillBorder: "border-primary/20", label: format(wd, "d. MMM", { locale: da }), pulse: false };
  })();

  const items = (job.business_response === "adjusted" && job.customer_response === "accepted" && Array.isArray(job?.adjusted_details?.items))
    ? (job.adjusted_details.items as any[])
    : (job.order_items || []);
  const itemCount = items.length;
  const displayAmount = job.customer_response === "accepted" ? (job.adjusted_amount ?? job.total_amount) : job.total_amount;
  const fullAddress = [job.address, [job.zip_code, job.city].filter(Boolean).join(" ")].filter(Boolean).join(", ");

  return (
    <div
      ref={setNodeRef}
      onClick={selectMode && !pending ? onToggle : undefined}
      className={cn(
        CARD_BASE,
        "flex shrink-0",
        fullWidth ? "w-full" : "w-64",
        selectMode && !pending && "cursor-pointer",
        selected
          ? "border-accent ring-2 ring-accent/25 shadow-[0_6px_18px_-6px_hsl(var(--accent)/0.45)]"
          : pending
            ? "border-amber-300/60"
            : cn(CARD_BORDER, CARD_HOVER),
        isDragging && "border-dashed border-accent/60 bg-secondary/30 opacity-45 shadow-none",
      )}
    >
      {/* Venstre urgency-rail */}
      <div aria-hidden className={cn("w-1 shrink-0", urgency.rail, urgency.pulse && "animate-pulse")} />

      <div className="flex-1 min-w-0 p-2.5 space-y-1.5">
        {/* Drag-handle/check + navn + dato-pille */}
        <div className="flex items-start gap-1.5">
          {selectMode && !pending ? (
            <span
              className={cn(
                "mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border-2 transition-colors",
                selected ? "border-accent bg-accent text-accent-foreground" : "border-muted-foreground/40",
              )}
            >
              {selected && <CheckCircle2 className="h-3 w-3" />}
            </span>
          ) : !pending ? (
            <button
              type="button"
              {...listeners}
              {...attributes}
              aria-label="Træk aftale"
              className="-ml-1 flex h-7 w-5 shrink-0 touch-none items-center justify-center text-muted-foreground active:text-foreground"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          ) : null}
          <h3 className="min-w-0 flex-1 truncate text-[13.5px] font-bold capitalize leading-tight text-foreground">
            {job.customer_name || "Ukendt kunde"}
          </h3>
          <span
            className={cn(
              "shrink-0 inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-[9.5px] font-bold tracking-wide",
              urgency.pillBg, urgency.pillText, urgency.pillBorder,
            )}
          >
            {urgency.label}
          </span>
        </div>

        {/* Service + pris — matcher desktop UnassignedJobCard */}
        {itemCount > 0 && (
          <div className="flex items-baseline justify-between gap-2 rounded-md bg-secondary/30 px-1.5 py-1">
            <p className="min-w-0 flex-1 truncate text-[11px] font-semibold leading-snug text-foreground/80">
              {items[0].quantity > 1 && <span>{items[0].quantity}× </span>}
              {items[0].service_name}
              {itemCount > 1 && <span className="text-muted-foreground"> · +{itemCount - 1}</span>}
            </p>
            {displayAmount != null && (
              <div className="shrink-0 leading-none">
                <span className="text-[12px] font-bold tracking-tight text-foreground tabular-nums">
                  {Math.round(Number(displayAmount || 0))}
                </span>
                <span className="ml-0.5 text-[9.5px] font-bold uppercase tracking-wide text-muted-foreground">kr</span>
              </div>
            )}
          </div>
        )}

        {fullAddress && (
          <p className="flex items-center gap-1 truncate text-[10.5px] leading-tight text-muted-foreground">
            <MapPin className="h-2.5 w-2.5 shrink-0" />
            <span className="truncate">{fullAddress}</span>
          </p>
        )}

        {!pending && !selectMode && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="h-7 w-full rounded-md border-border/70 text-[11px]"
            onClick={(e) => { e.stopPropagation(); onAssign(job); }}
          >
            Vælg rute
          </Button>
        )}
      </div>
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

/* ──────────────────────── Mini-map ─────────────────────────
 * Lille SVG-forhåndsvisning af rute-stoppene normaliseret til en
 * bounding box. Ingen eksterne kort-API'er — viser ruteformen og
 * antallet af stop som hurtigt visuelt overblik.
 */
function MiniMap({ stops, color, className }: { stops: RouteStop[]; color: string; className?: string }) {
  const pts = stops
    .map((s) => ({ x: Number(s.longitude), y: Number(s.latitude) }))
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
  if (pts.length < 2) return null;
  const xs = pts.map((p) => p.x);
  const ys = pts.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const w = 100, h = 36;
  const pad = 4;
  const sx = maxX === minX ? 1 : (w - 2 * pad) / (maxX - minX);
  const sy = maxY === minY ? 1 : (h - 2 * pad) / (maxY - minY);
  const norm = pts.map((p) => ({
    x: pad + (p.x - minX) * sx,
    // Y inverteres (skærm vs. lat).
    y: h - pad - (p.y - minY) * sy,
  }));
  const path = norm.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${w} ${h}`}
      className={cn("h-9 w-full opacity-90", className)}
      preserveAspectRatio="none"
      aria-hidden
    >
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {norm.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={1.5} fill={color} />
      ))}
    </svg>
  );
}

/* ─────────────────── Bulk-tildel sheet ──────────────────── */
function BulkAssignSheet({
  open,
  onOpenChange,
  jobs,
  businessId,
  date,
  existingRoutes,
  usedColors,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  jobs: any[];
  businessId: string;
  date: string;
  existingRoutes: Route[];
  usedColors: string[];
}) {
  const addStop = useAddStop();
  const createRoute = useCreateRoute();
  const [busy, setBusy] = useState(false);

  const assignTo = async (routeId: string) => {
    if (busy) return;
    setBusy(true);
    let ok = 0, fail = 0;
    for (const job of jobs) {
      try {
        await addStop.mutateAsync({
          route_id: routeId,
          order_id: job.id,
          sequence: 9999, // bunden
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
        void linkAgreementToRoute(job.id, routeId);
        ok++;
      } catch {
        fail++;
      }
    }
    setBusy(false);
    if (ok > 0) toast.success(`${ok} aftaler tilføjet`);
    if (fail > 0) toast.error(`${fail} aftaler kunne ikke tilføjes`);
    onOpenChange(false);
  };

  const createAndAssign = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await createRoute.mutateAsync({
        business_id: businessId,
        route_date: date,
        name: null,
        color: pickAvailableColor(usedColors),
      });
      await assignTo(r.id);
    } catch (err: any) {
      toast.error("Kunne ikke oprette rute", { description: err?.message });
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Tildel {jobs.length} aftaler</DialogTitle>
          <DialogDescription>
            {format(parseISO(date), "EEEE d. MMM yyyy", { locale: da })} — vælg en rute eller opret en ny.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          {existingRoutes.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Ingen ruter på denne dag. Opret en ny.
            </div>
          ) : (
            existingRoutes.map((r) => (
              <button
                key={r.id}
                type="button"
                disabled={busy}
                onClick={() => assignTo(r.id)}
                className="flex w-full items-center gap-2 rounded-xl border border-border bg-card p-2.5 text-left transition-colors hover:bg-secondary/50 disabled:opacity-50"
              >
                <span className="h-8 w-8 shrink-0 rounded-lg" style={{ backgroundColor: r.color }} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{r.name || "Rute uden navn"}</p>
                </div>
              </button>
            ))
          )}
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-2"
            disabled={busy}
            onClick={createAndAssign}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Opret ny rute med disse aftaler
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}