import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import {
  useUnassignedJobs,
  useCalendarData,
  useAddStop,
  useOptimizeRoute, useGeocodeAddress,
  useCreateRoute, useDeleteRoute, useUpdateRoute,
  useRouteSeriesInfo, useMoveRouteSeries,
  useRouteOccurrenceExceptions,
  useShiftProjectedOccurrence,
  openProjectedRouteBase,
  logRoutePlannerEvent,
  type RouteStop, type Route,
} from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
} from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon,
  Loader2, Search, Plus, Inbox, ArrowUpDown, X, Keyboard, Filter,
  ShoppingBag, Route as RouteIcon, Tag, Palette, ListChecks, AlertTriangle, Undo2, Redo2,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { format, addDays, addWeeks, addMonths, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { da } from "date-fns/locale";
import { toast } from "sonner";
import { toastRouteError } from "@/lib/route-errors";
import {
  DndContext, DragOverlay, useSensor, useSensors,
  pointerWithin, rectIntersection, type CollisionDetection, type DragEndEvent, type DragMoveEvent, type DragOverEvent, type DragStartEvent,
  PointerSensor, MouseSensor, TouchSensor, KeyboardSensor,
} from "@dnd-kit/core";
import { createPortal } from "react-dom";
import { UnassignedJobCard } from "@/components/route-planner/UnassignedJobCard";
import { StopDetailSheet } from "@/components/route-planner/StopDetailSheet";
import { MonthWeekCalendar, type CalendarRoute } from "@/components/route-planner/MonthWeekCalendar";
import { AgendaCalendar } from "@/components/route-planner/AgendaCalendar";
import { RouteEditSheet, ROUTE_COLORS, ROUTE_COLOR_PALETTE, pickAvailableColor } from "@/components/route-planner/RouteEditSheet";
import PlanningPanel from "@/components/route-planner/PlanningPanel";
import SEO from "@/components/SEO";
import { DatePickerField } from "@/components/route-planner/DatePickerField";
import { RouteStopsPanel } from "@/components/route-planner/RouteStopsPanel";
import { MoveRouteDateDialog, type MoveRouteScope } from "@/components/route-planner/MoveRouteDateDialog";
import { MoveProjectedOccurrenceDialog } from "@/components/route-planner/MoveProjectedOccurrenceDialog";
import { MergeRoutesDialog } from "@/components/route-planner/MergeRoutesDialog";
import { DeleteRouteDialog } from "@/components/route-planner/DeleteRouteDialog";
import { DiagnosticsDialog } from "@/components/route-planner/DiagnosticsDialog";
import { supabase } from "@/integrations/supabase/client";
import CreateManualOrderDialog from "@/components/route-planner/CreateManualOrderDialog";
import { renameFreshSplitRoutes } from "@/components/route-planner/MoveStopsDialog";
import { dragMetrics } from "@/lib/drag-metrics";
import { Section, Field, SheetHeaderBlock, SheetFooterBar } from "@/components/route-planner/SheetSection";
import { AdminShell } from "@/components/admin/shared/AdminShell";
import { useWeatherForecast, type WeatherDay } from "@/hooks/useWeather";
import { ShellSkeleton } from "@/components/admin/shared/Skeletons";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import {
  expandRecurringRoutes,
  expandProjectionWindowForShiftedOccurrences,
  projectedStopMatchesSources,
  recurringSourceKeysForStop,
  resolveProjectionExceptions,
  applyProjectedOccurrenceShifts,
} from "@/lib/recurring-projection";
import { intervalToCadence } from "@/lib/interval";
import { useAgreementPauses } from "@/hooks/useAgreementPauses";
import { useBusinessHolidays } from "@/hooks/useBusinessHolidays";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { invalidateRouteSyncQueries } from "@/hooks/useRoutes";
import { routeMutationQueue } from "@/lib/mutation-queue";
import { writeDragValidationDebounced, clearDragValidation, summarize } from "@/components/route-planner/drag-validation-context";
import { validateStopAssignment, validateRouteMove } from "@/lib/route-validation";
import { cn } from "@/lib/utils";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";
import { Monitor } from "lucide-react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { pushRouteUndo } from "@/lib/route-history";
import { useRouteHistory } from "@/hooks/useRouteHistory";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

type DragPoint = { x: number; y: number };
type RouteDropPointTarget =
  | { type: "route"; routeId: string; date?: string | null }
  | { type: "day"; date: string };

const getDragPoint = (event: Event | null): DragPoint | null => {
  if (!event) return null;
  if ("clientX" in event && typeof (event as MouseEvent).clientX === "number") {
    const { clientX, clientY } = event as MouseEvent;
    return { x: clientX, y: clientY };
  }
  const touchEvent = event as TouchEvent;
  const touch = touchEvent.touches?.[0] ?? touchEvent.changedTouches?.[0];
  return touch ? { x: touch.clientX, y: touch.clientY } : null;
};

const routeIdFromDndId = (id: unknown) => String(id ?? "").replace(/^route:/, "");

const getRouteDropPointTarget = (point: DragPoint | null, sourceRouteId?: string | null): RouteDropPointTarget | null => {
  if (!point || typeof document === "undefined") return null;
  const elements = typeof document.elementsFromPoint === "function"
    ? document.elementsFromPoint(point.x, point.y)
    : [document.elementFromPoint(point.x, point.y)].filter(Boolean) as Element[];

  for (const element of elements) {
    const routeEl = element.closest<HTMLElement>("[data-route-drop-route-id]");
    const routeId = routeEl?.dataset.routeDropRouteId;
    if (routeId && routeId !== sourceRouteId) {
      return { type: "route", routeId, date: routeEl.dataset.routeDropDate ?? null };
    }
  }

  for (const element of elements) {
    const dayEl = element.closest<HTMLElement>("[data-route-drop-date]");
    const date = dayEl?.dataset.routeDropDate;
    if (date) return { type: "day", date };
  }

  return null;
};

/** Konverterer "HH:MM[:SS]" til minutter siden midnat (eller null). */
const toMin = (t: string | null | undefined): number | null => {
  if (!t) return null;
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const RoutePlanner = () => {
  const { user, loading } = useAuth();
  // Ruteplanlæggeren er bevidst kun tilgængelig på computere — drag-and-drop
  // planlægning, kortvisning og parallelle paneler kræver en stor skærm og
  // præcis pointer. På mobil/tablet viser vi en venlig "kun på computer"
  // forklaring i stedet for at hænge brugeren op med en uanvendelig UI.
  const isSmallScreen = useIsBelowBreakpoint(1024);
  if (loading) return <ShellSkeleton />;
  if (!user) return <Navigate to="/log-ind" replace />;
  if (isSmallScreen) return <RoutePlannerDesktopOnly />;
  return <Planner />;
};

const RoutePlannerDesktopOnly = () => (
  <div className="flex min-h-screen items-center justify-center bg-background px-6">
    <SEO title="Ruteplanlægger – Serviceydere" description="Ruteplanlæggeren er kun tilgængelig på computer." noIndex />
    <div className="max-w-md text-center">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-secondary">
        <Monitor className="h-7 w-7 text-foreground" />
      </div>
      <h1 className="mb-2 text-lg font-semibold text-foreground">Kun på computer</h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Ruteplanlæggeren bruger træk-og-slip, kort og flere paneler ved siden af hinanden.
        Åbn siden på en computer for at planlægge ruter — telefoner og tablets understøttes ikke.
      </p>
      <Link to="/virksomhed" className="text-sm font-medium text-accent hover:underline">
        ← Tilbage til oversigt
      </Link>
    </div>
  </div>
);

const Planner = () => {
  const { data: business, isLoading: loadingBusiness } = useMyBusiness();
  const isCompactRouteLayout = useIsBelowBreakpoint(1024);
  const qc = useQueryClient();
  const [date, setDate] = useState<string>(todayStr());
  const [view, setView] = usePersistentState<"month" | "week">("route-planner:view", "month");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = usePersistentState<"date" | "price" | "name">("route-planner:sortBy", "date");
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const activeDragPointRef = useRef<DragPoint | null>(null);
  const activeDragOriginRef = useRef<DragPoint | null>(null);
  const [routeDragPoint, setRouteDragPoint] = useState<DragPoint | null>(null);
  const activeRouteDragPointRef = useRef<DragPoint | null>(null);
  const activeRouteDragOriginRef = useRef<DragPoint | null>(null);
  const routeOverlayRef = useRef<HTMLDivElement | null>(null);
  const applyRouteOverlayPosition = (point: DragPoint | null) => {
    const el = routeOverlayRef.current;
    if (!el || !point) return;
    el.style.left = `${point.x}px`;
    el.style.top = `${point.y}px`;
  };
  // Beskytter mod dobbelt-drop på samme kilde+mål — undgår dubletruter og
  // "uniq_route_stops_route_order" race conditions.
  const inFlightDropsRef = useRef<Set<string>>(new Set());
  // Synlig "behandler"-tilstand pr. drop-target (route:<id> eller day:<date>).
  // Bruges af kalenderen til at deaktivere drop og vise spinner mens en
  // flytning er i gang — så brugeren ikke kan slippe igen ved et uheld.
  const [busyTargets, setBusyTargets] = useState<Set<string>>(new Set());
  const setTargetBusy = (target: string | null, busy: boolean) => {
    if (!target) return;
    setBusyTargets((prev) => {
      const next = new Set(prev);
      if (busy) next.add(target); else next.delete(target);
      return next;
    });
  };
  const [geocoding, setGeocoding] = useState(false);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteColor, setNewRouteColor] = useState<string>(ROUTE_COLOR_PALETTE[0]);
  const [newRouteDate, setNewRouteDate] = useState(todayStr());
  const [newRouteJobIds, setNewRouteJobIds] = useState<string[]>([]);
  const [newRouteJobSearch, setNewRouteJobSearch] = useState("");
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  /**
   * Når en projiceret rute åbnes (klik på virtuel pille i kalenderen) holder
   * vi fast i de aktive sourceKeys for netop den dato. Det bruges til at
   * filtrere basis-rutens stops i edit-sheet/stops-panel, så kun de aftaler
   * der faktisk udføres på dén dag vises — ikke alle aftaler fra basisruten.
   */
  const [editingProjectedContext, setEditingProjectedContext] = useState<{
    baseRouteId: string;
    projectedDate: string;
    sourceKeys: string[];
    previewStops?: RouteStop[];
  } | null>(null);
  const [routeToDelete, setRouteToDelete] = useState<{ id: string; name: string } | null>(null);
  const [diagnosticsOpen, setDiagnosticsOpen] = useState(false);
  const [pendingRouteMerge, setPendingRouteMerge] = useState<{
    source: Route;
    target: Route;
  } | null>(null);
  const [mergingRoute, setMergingRoute] = useState(false);
  const [distributing, setDistributing] = useState(false);
  const businessId = business?.id;
  const routePlanningEnabled = !!(business?.settings as any)?.route_planning_enabled;

  // Realtime: når ruter, stops, aftaler eller forekomster ændres et andet sted
  // (anden bruger, baggrundsjob, mobilapp), invalider queries så kalenderen
  // og aftalepoolen opdateres uden manuel refresh.
  useEffect(() => {
    if (!businessId) return;
    const filter = `business_id=eq.${businessId}`;
    // Coalesce flere postgres_changes-events til ÉN invalidering pr. ~250 ms.
    // Når en stor batch-mutation rammer (fx materialisering af 20 forekomster)
    // undgår vi at React Query trigger 20 refetches lige efter hinanden — det
    // var en tydelig kilde til lag og duplikerede karts i kalenderen.
    let pending: { route: boolean; recurring: boolean } = { route: false, recurring: false };
    let timer: ReturnType<typeof setTimeout> | null = null;
    const flush = () => {
      timer = null;
      const flags = pending;
      pending = { route: false, recurring: false };
      if (flags.route) invalidateRouteSyncQueries(qc);
      if (flags.recurring) qc.invalidateQueries({ queryKey: ["recurring-agreements-for-planner"] });
    };
    const schedule = (which: "route" | "recurring") => {
      pending[which] = true;
      if (timer) return;
      timer = setTimeout(flush, 250);
    };
    const channel = supabase
      .channel(`route-planner:${businessId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "routes", filter }, () => schedule("route"))
      .on("postgres_changes", { event: "*", schema: "public", table: "agreements", filter }, () => {
        schedule("route");
        schedule("recurring");
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "agreement_occurrences" }, () => schedule("route"))
      .on("postgres_changes", { event: "*", schema: "public", table: "route_stops" }, () => schedule("route"))
      .on("postgres_changes", { event: "*", schema: "public", table: "orders", filter }, () => schedule("route"))
      .subscribe();
    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [businessId, qc]);

  const { data: employees = [] } = useEmployees(businessId);
  const activeEmployees = useMemo(() => employees.filter((e: any) => e.is_active), [employees]);

  const { data: unassigned = [], isLoading: loadingUnassigned } = useUnassignedJobs(businessId);

  // Range for kalender: hele måneden hvis month-view, ugen hvis week-view
  const calendarRange = useMemo(() => {
    const anchor = parseISO(date);
    if (view === "week") {
      const ws = startOfWeek(anchor, { weekStartsOn: 1 });
      return { start: format(ws, "yyyy-MM-dd"), end: format(addDays(ws, 6), "yyyy-MM-dd") };
    }
    const ms = startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 });
    const me = endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 });
    return { start: format(ms, "yyyy-MM-dd"), end: format(me, "yyyy-MM-dd") };
  }, [date, view]);
  const { data: calendarData, isLoading: loadingCalendar } = useCalendarData(
    businessId,
    calendarRange.start,
    calendarRange.end,
  );
  const { data: routeOccurrenceExceptions = [] } = useRouteOccurrenceExceptions(
    businessId,
    calendarRange.start,
    calendarRange.end,
  );
  // Pauseperioder + helligdage — bruges af projektionen til at springe over
  // datoer hvor en aftale ikke skal forekomme (kunde-ferie, lukkedage osv.).
  const { data: agreementPauses = [] } = useAgreementPauses(businessId, calendarRange);
  const { data: businessHolidays = [] } = useBusinessHolidays(businessId, calendarRange);
  const calendarRoutesRaw = calendarData?.routes ?? [];
  const rawCalendarStops = calendarData?.stops ?? [];
  const loadingCalendarRoutes = loadingCalendar;
  const loadingCalendarStops = loadingCalendar;

  /* ─── Opstartsdato + "første gang"-indikator pr. ordre ───
     Henter preferred_date + completed_cycles for alle ordrer der har stops i
     synligt interval. Bruges til at vise "Opstart: DD/MM"-badge på aftalekort
     indtil aftalen er udført første gang. */
  const orderIdsForStops = useMemo(() => {
    const ids = new Set<string>();
    for (const s of rawCalendarStops) if (s.order_id) ids.add(s.order_id as string);
    return Array.from(ids).sort();
  }, [rawCalendarStops]);

  const { data: orderStartInfo } = useQuery({
    queryKey: ["route-stop-order-start-info", orderIdsForStops.join(",")],
    enabled: orderIdsForStops.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const map = new Map<string, { preferred_date: string | null; completed_cycles: number }>();
      // Chunk i batches af 500 så vi ikke rammer .in()-limits ved meget store kalendre.
      const chunkSize = 500;
      for (let i = 0; i < orderIdsForStops.length; i += chunkSize) {
        const chunk = orderIdsForStops.slice(i, i + chunkSize);
        const { data, error } = await supabase
          .from("orders")
          .select("id, preferred_date, completed_cycles")
          .in("id", chunk);
        if (error) throw error;
        for (const o of data || []) {
          map.set(o.id as string, {
            preferred_date: (o.preferred_date as string | null) ?? null,
            completed_cycles: Number(o.completed_cycles ?? 0),
          });
        }
      }
      return map;
    },
  });

  /** Decorerede stops: tilføjer `start_date` + `is_first_occurrence` så
      kort kan vise "Opstart"-badge når aftalen ikke er kørt endnu. */
  const calendarStops = useMemo(() => {
    if (!orderStartInfo || orderStartInfo.size === 0) return rawCalendarStops as RouteStop[];
    return rawCalendarStops.map((s) => {
      const info = s.order_id ? orderStartInfo.get(s.order_id as string) : undefined;
      if (!info) return s as RouteStop;
      return {
        ...s,
        start_date: info.preferred_date,
        is_first_occurrence: info.completed_cycles === 0,
        completed_cycles: info.completed_cycles,
      } as RouteStop;
    });
  }, [rawCalendarStops, orderStartInfo]);

  // Vejrudsigt — bruger gennemsnit af stop-koordinater i det viste interval,
  // ellers Danmarks centrum. Open-Meteo kan levere op til 16 dage frem.
  // Vi henter altid maks. forecast (i dag → +15 dage) så vejret allerede er
  // cached når brugeren bladrer en uge eller måned frem — der er ingen
  // ekstra omkostning ved at hente flere dage på én gang.
  const weatherCenter = useMemo(() => {
    const coords = calendarStops
      .filter((s) => s.latitude != null && s.longitude != null)
      .map((s) => [Number(s.latitude), Number(s.longitude)] as [number, number]);
    if (coords.length === 0) return { lat: 56.0, lng: 10.5 }; // Danmark
    const lat = coords.reduce((a, [la]) => a + la, 0) / coords.length;
    const lng = coords.reduce((a, [, lo]) => a + lo, 0) / coords.length;
    return { lat, lng };
  }, [calendarStops]);

  // Bredt vejr-interval: fra MIN(synlig start, i dag) til MAX(synlig slut, i dag+15).
  // På den måde er forecast altid tilgængelig for både fortid (= ingen data) og
  // fremtidige måneder/uger uden ekstra refetch ved navigation.
  const weatherRange = useMemo(() => {
    const today = todayStr();
    const farFuture = format(addDays(new Date(), 15), "yyyy-MM-dd");
    const start = calendarRange.start < today ? today : calendarRange.start;
    const end = calendarRange.end > farFuture ? farFuture : (calendarRange.end < today ? farFuture : calendarRange.end);
    return { start, end };
  }, [calendarRange.start, calendarRange.end]);

  const { data: weatherDays = [], isLoading: loadingWeather, isError: weatherError } = useWeatherForecast({
    startDate: weatherRange.start,
    endDate: weatherRange.end,
    latitude: weatherCenter.lat,
    longitude: weatherCenter.lng,
  });

  const weatherByDate = useMemo(() => {
    const m = new Map<string, WeatherDay>();
    for (const d of weatherDays) m.set(d.date, d);
    return m;
  }, [weatherDays]);

  const createRoute = useCreateRoute();
  const deleteRoute = useDeleteRoute();
  const updateRoute = useUpdateRoute();
  const moveRouteSeries = useMoveRouteSeries();
  const addStop = useAddStop();
  const shiftProjectedOccurrence = useShiftProjectedOccurrence();
  const optimizeRoute = useOptimizeRoute();
  const geocode = useGeocodeAddress();

  // Undo-stak (Rutekalender 3.0 — Fase B.3). Sidste 50 handlinger kan
  // fortrydes via Cmd/Ctrl+Z eller toolbar-knap. Pushes lokalt fra hver
  // mutation der ændrer en rute eller forekomst.
  const history = useRouteHistory();

  // Pending route-move: viser MoveRouteDateDialog. Hvis ruten er del af en
  // serie spørger vi brugeren om kun denne ene eller alle fremtidige skal flyttes.
  const [pendingRouteMove, setPendingRouteMove] = useState<{
    route: Route;
    newDate: string;
  } | null>(null);

  // Pending drag-and-drop af en projiceret rute → ny dato.
  // Vises som en bekræftelsesdialog så brugeren aktivt skal sige ja
  // før forekomsten flyttes — en utilsigtet drag/drop må aldrig flytte
  // en fremtidig forekomst uden bekræftelse.
  const [pendingProjectedMove, setPendingProjectedMove] = useState<{
    baseRouteId: string;
    routeName: string;
    fromDate: string;
    toDate: string;
  } | null>(null);

  // Pending start-date konflikt: vises når brugeren dropper en aftale på en
  // dato der ikke matcher aftalens opstartsdato. Brugeren bekræfter om
  // opstartsdatoen skal flyttes — først derefter eksekveres `execute()`.
  const [pendingStartDateChange, setPendingStartDateChange] = useState<{
    job: any;
    currentStart: string;
    targetDate: string;
    isBefore: boolean;
    targetLabel: string;
    execute: () => Promise<void>;
  } | null>(null);
  const [confirmingStartDate, setConfirmingStartDate] = useState(false);
  // Bulk-konflikt: når brugeren opretter en rute med flere aftaler hvis
  // opstartsdatoer ikke matcher rutens dato, beder vi om bekræftelse på at
  // flytte ALLE de pågældende opstartsdatoer i én operation.
  const [pendingBulkStartDateChange, setPendingBulkStartDateChange] = useState<{
    targetDate: string;
    mismatches: Array<{ job: any; currentStart: string }>;
    execute: () => Promise<void>;
  } | null>(null);
  const [confirmingBulkStartDate, setConfirmingBulkStartDate] = useState(false);
  const { data: pendingSeriesInfo } = useRouteSeriesInfo(
    pendingRouteMove?.route.id ?? null,
    pendingRouteMove?.route.route_date ?? null,
  );
  // Serie-info for den projicerede flytning, så vi kan tilbyde brugeren at
  // synkronisere aftalens opstartsdato / næste-udførsel med den nye dato.
  const { data: pendingProjectedSeriesInfo } = useRouteSeriesInfo(
    pendingProjectedMove?.baseRouteId ?? null,
    pendingProjectedMove?.fromDate ?? null,
  );
  const [projectedMoveSyncStart, setProjectedMoveSyncStart] = useState(false);
  const [projectedMoveSyncNext, setProjectedMoveSyncNext] = useState(false);
  useEffect(() => {
    if (!pendingProjectedMove) {
      setProjectedMoveSyncStart(false);
      setProjectedMoveSyncNext(false);
    }
  }, [pendingProjectedMove]);
  // Serie-info for kilde-ruten i en igangværende fletning, så fletteren
  // også kan tilbyde "fremtidige aftaler også" når kilden har gentagne aftaler.
  const { data: pendingMergeSeriesInfo } = useRouteSeriesInfo(
    pendingRouteMerge?.source.id ?? null,
    pendingRouteMerge?.source.route_date ?? null,
  );

  // Pr-rute "pending" state — kun den rute der faktisk optimeres viser spinner
  const [optimizingRouteId, setOptimizingRouteId] = useState<string | null>(null);

  // ── Filtre: kun vis stops for valgte assignees / forekomst-statusser ──
  // Persisteret i localStorage så brugerens valg overlever sidegenindlæsning.
  const [filterAssigneeIds, setFilterAssigneeIds] = usePersistentState<string[]>(
    "route-planner:filterAssigneeIds", [],
  );
  const [filterStatuses, setFilterStatuses] = usePersistentState<string[]>(
    "route-planner:filterStatuses", [],
  );
  const STATUS_OPTIONS: { value: string; label: string }[] = [
    { value: "planned",   label: "Planlagt" },
    { value: "confirmed", label: "Bekræftet" },
    { value: "in_progress", label: "I gang" },
    { value: "completed", label: "Færdig" },
    { value: "cancelled", label: "Aflyst" },
  ];
  const filtersActive = filterAssigneeIds.length > 0 || filterStatuses.length > 0;

  /** Stops efter filter — bruges både til rute-bygger og kalender-kort. */
  const visibleCalendarStops = useMemo(() => {
    // Udførte aftaler skal forsvinde fra ruten — de hører hjemme under
    // "Udførte" på Aftaler-siden. Stoppet bliver i databasen (så historik
    // og regnskab er intakt), men er ikke længere synligt i kalenderen.
    // Vi tjekker BÅDE forekomst-status (kanonisk for gentagende aftaler)
    // OG legacy stop-status, så engangs-stops også bliver filtreret væk.
    const notCompleted = calendarStops.filter((s: any) => {
      const occ = (s.occurrence_status as string | undefined) ?? null;
      const eff = occ ?? s.status;
      return eff !== "completed";
    });
    if (!filtersActive) return notCompleted;
    return notCompleted.filter((s: any) => {
      if (filterAssigneeIds.length > 0) {
        const ids = (s.assignee_ids || []) as string[];
        if (!ids.some((id) => filterAssigneeIds.includes(id))) return false;
      }
      if (filterStatuses.length > 0) {
        const occ = (s.occurrence_status as string | undefined) ?? null;
        const eff = occ ?? s.status; // forekomst-status er kanonisk, fallback til legacy stop-status
        if (!filterStatuses.includes(eff)) return false;
      }
      return true;
    });
  }, [calendarStops, filterAssigneeIds, filterStatuses, filtersActive]);

  // ─── Drag-sensorer ───
  // Mouse + Touch er den kombination der har vist sig mest pålidelig på
  // tværs af alle enheder vi har testet — desktop, Windows-touchpads,
  // tablets og mobil. PointerSensor virkede i teorien men fejlede at
  // detektere drop-targets i `Aftaler uden rute`-flowet, fordi nogle
  // browsere ikke lod pointer-koordinaterne lække igennem til
  // `pointerWithin` når aktivatoren brugte pointer-capture.
  //  - MouseSensor: lille distance (4px) → hurtig responsiv aktivering
  //    og klassisk `mouseup` på window som collision-detection kan stole på.
  //  - TouchSensor: kort delay (120 ms) + tolerance (8 px) — så et tap
  //    stadig fungerer som klik på mobil/tablet.
  //  - KeyboardSensor: tilgængelighed (Space/Enter + piletaster).
  // PointerSensor importeres for bagudkompatibilitet men er bevidst ikke
  // aktiv — Mouse/Touch dækker alle scenarier stabilt.
  void PointerSensor;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );
  const routePlannerCollisionDetection = useCallback<CollisionDetection>((args) => {
    const activeType = args.active.data.current?.type;
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      // Når en aftale trækkes hen over en rute, kan dnd-kit nogle gange
      // rapportere dag-cellen først (fordi den ligger som større parent).
      // DOM-hit-testen afgør derfor rute-pillen eksplicit, så aftalen ender
      // på den konkrete rute og ikke fejlagtigt som "ny rute på dagen".
      if (activeType === "job") {
        const pointTarget = getRouteDropPointTarget(activeDragPointRef.current, null);
        if (pointTarget?.type === "route") {
          const routeHit = args.droppableContainers.find((container) => container.id === `route-drop:${pointTarget.routeId}`);
          if (routeHit) return [{ id: routeHit.id }];
        }
      }
      // Ved rute-drag foretrækker vi altid en rute-droppable hvis pointeren
      // er over både en dag-celle OG en rute i den celle — ellers bliver
      // route→route merge fejlagtigt fortolket som route→day move (fordi
      // pointerWithin nogle gange returnerer dag-cellen først).
      if (activeType === "route") {
        const sourceRouteId = routeIdFromDndId(args.active.id);
        const routeHit = pointerCollisions.find((c) => {
          const container = args.droppableContainers.find((d) => d.id === c.id);
          return container?.data.current?.type === "route"
            && container?.data.current?.routeId !== sourceRouteId;
        });
        if (routeHit) return [routeHit];
        const nonSourceHits = pointerCollisions.filter((c) => {
          const container = args.droppableContainers.find((d) => d.id === c.id);
          return !(container?.data.current?.type === "route" && container?.data.current?.routeId === sourceRouteId);
        });
        if (nonSourceHits.length > 0) return nonSourceHits;
      }
      return pointerCollisions;
    }

    const dragPoint = activeType === "route" ? activeRouteDragPointRef.current : activeDragPointRef.current;
    if (dragPoint && (activeType === "route" || activeType === "job")) {
      const pointTarget = getRouteDropPointTarget(dragPoint, activeType === "route" ? routeIdFromDndId(args.active.id) : null);
      const targetId = pointTarget?.type === "route"
        ? `route-drop:${pointTarget.routeId}`
        : pointTarget?.type === "day"
          ? `day:${pointTarget.date}`
          : null;
      const routePointerCollision = targetId
        ? args.droppableContainers.find((container) => container.id === targetId)
        : null;
      if (routePointerCollision) return [{ id: routePointerCollision.id }];
    }

    // Route-drag kan nogle gange miste pointer-hit på desktop, især når den
    // trukne rute ligger over små kalenderceller. Fallback til overlap gør
    // drop stabilt uden at ændre job/stop-drop adfærd.
    return activeType === "route"
      ? rectIntersection(args)
      : pointerCollisions;
  }, []);

  /** Kundens ønskede dato — preferred_date primært, ellers next_service_date (abonnement). */
  const effectiveJobDate = (j: any): string | null => {
    if (j.preferred_date) return j.preferred_date;
    if (j.next_service_date) return String(j.next_service_date).slice(0, 10);
    return null;
  };

  const effectiveJobItems = (job: any) => (
    job.business_response === "adjusted" &&
    job.customer_response === "accepted" &&
    Array.isArray(job.adjusted_details?.items)
  ) ? job.adjusted_details.items : (job.order_items || []);

  const serviceSummaryForJob = (job: any) => effectiveJobItems(job)
    .map((it: any) => it.quantity > 1 ? `${it.quantity}× ${it.service_name}` : it.service_name)
    .join(", ") || "Ingen ydelser angivet";

  /** Vis ALLE aftaler uden rute i poolen — ingen dato-vinduesfiltrering.
      Brugeren foretrækker at se hele listen ad gangen, fremfor at skulle
      åbne en separat dialog for at finde aftaler der ligger længere ude. */
  const filteredUnassigned = useMemo(() => {
    let list = [...unassigned];

    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j: any) =>
        j.customer_name?.toLowerCase().includes(q) ||
        j.address?.toLowerCase().includes(q) ||
        j.city?.toLowerCase().includes(q),
      );
    }
    const sorted = [...list];
    if (sortBy === "date") {
      sorted.sort((a: any, b: any) => {
        const ad = effectiveJobDate(a) || "9999-12-31";
        const bd = effectiveJobDate(b) || "9999-12-31";
        if (ad !== bd) return ad < bd ? -1 : 1;
        const at = a.preferred_time_start || "99:99";
        const bt = b.preferred_time_start || "99:99";
        return at < bt ? -1 : at > bt ? 1 : 0;
      });
    } else if (sortBy === "price") {
      sorted.sort((a: any, b: any) => Number(b.total_amount || 0) - Number(a.total_amount || 0));
    } else if (sortBy === "name") {
      sorted.sort((a: any, b: any) => (a.customer_name || "").localeCompare(b.customer_name || "", "da"));
    }
    return sorted;
  }, [unassigned, search, sortBy]);

  const unassignedTotal = useMemo(
    () => filteredUnassigned.reduce((s: number, j: any) => s + Number(j.total_amount || 0), 0),
    [filteredUnassigned],
  );

  /** Periode-overblik vist i toolbaren — giver hurtigt overblik over hvor
   *  meget arbejde der er planlagt i den viste måned/uge. */
  const periodSummary = useMemo(() => {
    const routeCount = calendarRoutesRaw.length;
    const stopCount = calendarStops.length;
    return { routeCount, stopCount };
  }, [calendarRoutesRaw.length, calendarStops.length]);

  /* Stop assignment handler */
  /* Build CalendarRoute[] for MonthWeekCalendar (range covers month/week view) */
  /* ─── Gentagende ruter: hent aktive abonnementer med preferred_route_id og
         projicér virtuelle forekomster på fremtidige datoer (op til 6 mdr.).
         Virtuelle forekomster vises dæmpet med lås — de bliver til rigtige
         route_stops når DB-jobbet `auto_recur_due_orders` kører. */
  const { data: recurringSources = [] } = useQuery({
    queryKey: ["recurring-agreements-for-planner", businessId],
    enabled: !!businessId,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [agreementsRes, subsRes] = await Promise.all([
        supabase
          .from("agreements")
          .select("id, interval, interval_days, start_date, preferred_route_id, legacy_subscription_id, customer_name, customer_phone, address, zip_code, city, latitude, longitude, notes, estimated_duration_minutes, preferred_time_start, preferred_time_end, employee_ids, total_amount")
          .eq("business_id", businessId!)
          .eq("status", "active")
          .neq("interval", "engangskøb")
          .not("preferred_route_id", "is", null),
        supabase
          .from("subscriptions")
          .select("id, interval, details, next_service_date, created_at, preferred_route_id, status, order_id")
          .eq("business_id", businessId!)
          .eq("status", "active")
          .neq("interval", "engangskøb")
          .not("preferred_route_id", "is", null),
      ]);
      if (agreementsRes.error) throw agreementsRes.error;
      if (subsRes.error) throw subsRes.error;
      const subOrderById = new Map((subsRes.data || []).map((s: any) => [s.id, s.order_id as string | null]));
      const agreementIds = (agreementsRes.data || []).map((a: any) => a.id).filter(Boolean);
      const agreementItemIntervalById = new Map<string, string>();
      if (agreementIds.length > 0) {
        const { data: agreementItems } = await supabase
          .from("agreement_items")
          .select("agreement_id, details")
          .in("agreement_id", agreementIds);
        for (const item of agreementItems || []) {
          const detailInterval = (item as any).details?.interval;
          if (detailInterval && !agreementItemIntervalById.has((item as any).agreement_id)) {
            agreementItemIntervalById.set((item as any).agreement_id, detailInterval);
          }
        }
      }
      const preferredRouteIds = Array.from(new Set([
        ...(agreementsRes.data || []).map((a: any) => a.preferred_route_id),
        ...(subsRes.data || []).map((s: any) => s.preferred_route_id),
      ].filter(Boolean) as string[]));
      const routeDateById = new Map<string, string>();
      if (preferredRouteIds.length > 0) {
        const { data: routesData, error: routesErr } = await supabase
          .from("routes")
          .select("id, route_date")
          .in("id", preferredRouteIds);
        if (routesErr) throw routesErr;
        for (const r of routesData || []) routeDateById.set((r as any).id, String((r as any).route_date).slice(0, 10));
      }
      const agreementLegacySubIds = new Set(
        (agreementsRes.data || []).map((a: any) => a.legacy_subscription_id).filter(Boolean),
      );
      const fromAgreements = (agreementsRes.data || []).map((a: any) => ({
        id: `agr:${a.id}`,
        agreement_id: a.id as string,
        interval: (agreementItemIntervalById.get(a.id) || a.interval) as string,
        interval_days: (a.interval_days ?? null) as number | null,
        seed_date: a.start_date as string | null,
        anchor_date: routeDateById.get(a.preferred_route_id) ?? null,
        preferred_route_id: a.preferred_route_id as string | null,
        sourceKeys: [
          `agr:${a.id}`,
          a.legacy_subscription_id ? `sub:${a.legacy_subscription_id}` : null,
          a.legacy_subscription_id && subOrderById.get(a.legacy_subscription_id) ? `order:${subOrderById.get(a.legacy_subscription_id)}` : null,
        ].filter(Boolean) as string[],
        placeholder: {
          agreement_id: a.id,
          customer_name: a.customer_name ?? null,
          customer_phone: a.customer_phone ?? null,
          address: a.address ?? null,
          zip_code: a.zip_code ?? null,
          city: a.city ?? null,
          latitude: a.latitude ?? null,
          longitude: a.longitude ?? null,
          notes: a.notes ?? null,
          duration_minutes: a.estimated_duration_minutes ?? 30,
          time_window_start: a.preferred_time_start ?? null,
          time_window_end: a.preferred_time_end ?? null,
          assignee_ids: (a.employee_ids as string[] | null) ?? [],
          assigned_employee_id: ((a.employee_ids as string[] | null) ?? [])[0] ?? null,
          order_amount: Number(a.total_amount ?? 0),
        },
      }));
      const fromSubs = (subsRes.data || [])
        .filter((s: any) => !agreementLegacySubIds.has(s.id))
        .map((s: any) => ({
          id: `sub:${s.id}`,
          interval: ((s.details as any)?.interval || s.interval) as string,
          interval_days: null,
          seed_date: (s.next_service_date as string | null) || (s.created_at as string | null),
          anchor_date: routeDateById.get(s.preferred_route_id) ?? null,
          preferred_route_id: s.preferred_route_id as string | null,
          sourceKeys: [
            `sub:${s.id}`,
            s.order_id ? `order:${s.order_id}` : null,
          ].filter(Boolean) as string[],
        }));
      return [...fromAgreements, ...fromSubs];
    },
  });

  const recurringRouteIds = useMemo(
    () =>
      Array.from(
        new Set(
          recurringSources
            .map((s) => s.preferred_route_id)
            .filter((id): id is string => !!id),
        ),
      ),
    [recurringSources],
  );

  // Per-forekomst overrides for gentagende aftaler — bruges af `expandRecurringRoutes`
  // til at hoppe over aflyste forekomster og flytte rescheduled forekomster til ny dato.
  const agreementIdsForOverrides = useMemo(
    () =>
      Array.from(new Set(
        (recurringSources as any[])
          .map((s) => s.agreement_id as string | undefined)
          .filter((id): id is string => !!id),
      )),
    [recurringSources],
  );
  const { data: occurrenceOverrides = [] } = useQuery({
    queryKey: ["agreement-occurrence-overrides", businessId, agreementIdsForOverrides.sort().join(",")],
    enabled: !!businessId && agreementIdsForOverrides.length > 0,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agreement_occurrence_overrides" as any)
        .select("agreement_id, original_date, new_date, status")
        .in("agreement_id", agreementIdsForOverrides);
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: recurringBaseRoutes = [] } = useQuery({
    queryKey: ["recurring-base-routes", businessId, recurringRouteIds.sort().join(",")],
    enabled: !!businessId && recurringRouteIds.length > 0,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .in("id", recurringRouteIds);
      if (error) throw error;
      const routes = (data || []) as any[];
      const { data: stopsData, error: stopsErr } = await supabase
        .from("route_stops")
          .select("*, agreement_occurrences(agreement_id, legacy_order_id, status, occurrence_date, agreements(interval))")
        .in("route_id", recurringRouteIds);
      if (stopsErr) throw stopsErr;
      // Berig stops med assignees fra junction-tabellen, så projicerede
      // ruter arver ALLE tildelte medarbejdere fra basisruten — ikke kun
      // den primære (assigned_employee_id). Uden dette vises projicerede
      // ruter uden medarbejder-avatars når basisruten bruger multi-assign.
      const stopIds = (stopsData || []).map((s: any) => s.id);
      const byStop = new Map<string, { ids: string[]; lead: string | null }>();
      if (stopIds.length > 0) {
        const { data: assignees } = await supabase
          .from("route_stop_assignees")
          .select("stop_id, employee_id, is_lead")
          .in("stop_id", stopIds);
        (assignees || []).forEach((a: any) => {
          const entry = byStop.get(a.stop_id) || { ids: [], lead: null };
          entry.ids.push(a.employee_id);
          if (a.is_lead) entry.lead = a.employee_id;
          byStop.set(a.stop_id, entry);
        });
      }
      const orderIds = Array.from(new Set((stopsData || []).map((s: any) => s.order_id).filter(Boolean))) as string[];
      const orderAmountById = new Map<string, number>();
      if (orderIds.length > 0) {
        const { data: orderRows } = await supabase
          .from("orders")
          .select("id,total_amount,adjusted_amount")
          .in("id", orderIds);
        for (const o of orderRows || []) {
          orderAmountById.set((o as any).id, Number((o as any).adjusted_amount ?? (o as any).total_amount ?? 0));
        }
      }
      const stopsByRoute = new Map<string, any[]>();
      for (const s of stopsData || []) {
        const entry = byStop.get(s.id);
        const enriched = {
          ...s,
          assignee_ids: entry?.ids || (s.assigned_employee_id ? [s.assigned_employee_id] : []),
          lead_employee_id: entry?.lead ?? s.assigned_employee_id ?? null,
          // Propagér aftaleintervallet til projicerede stops så kortet kan
          // vise fx "Hver uge" i stedet for ingenting.
          agreement_interval:
            (s as any).agreement_occurrences?.agreements?.interval
            ?? (s as any).agreement_interval
            ?? null,
          agreement_id:
            (s as any).agreement_occurrences?.agreement_id
            ?? (s as any).agreement_id
            ?? null,
          occurrence_status: (s as any).agreement_occurrences?.status ?? (s as any).occurrence_status ?? null,
          occurrence_date: (s as any).agreement_occurrences?.occurrence_date ?? (s as any).occurrence_date ?? null,
          order_amount: orderAmountById.get((s as any).order_id) ?? Number((s as any).order_amount ?? 0),
        };
        const arr = stopsByRoute.get(s.route_id) || [];
        arr.push(enriched);
        stopsByRoute.set(s.route_id, arr);
      }
      return routes.map((r) => ({
        ...r,
        stops: (stopsByRoute.get(r.id) || []).sort(
          (a, b) => (a.sequence ?? 0) - (b.sequence ?? 0),
        ),
      }));
    },
  });

  const calendarRoutes: CalendarRoute[] = useMemo(() => {
    const stopsByRoute = new Map<string, RouteStop[]>();
    for (const s of visibleCalendarStops) {
      const arr = stopsByRoute.get(s.route_id) || [];
      arr.push(s);
      stopsByRoute.set(s.route_id, arr);
    }
    // Per-day numbering ("Kørsel 1", "Kørsel 2", ...)
    const sortedByDate = [...calendarRoutesRaw].sort((a, b) => {
      if (a.route_date !== b.route_date) return a.route_date < b.route_date ? -1 : 1;
      return (a.created_at || "").localeCompare(b.created_at || "");
    });
    const indexByRouteId = new Map<string, number>();
    const counterByDate = new Map<string, number>();
    for (const r of sortedByDate) {
      const n = (counterByDate.get(r.route_date) || 0) + 1;
      counterByDate.set(r.route_date, n);
      indexByRouteId.set(r.id, n);
    }
    // Hjælper: aflæs medarbejdere på en rute ud fra dens stops.
    const employeesForStops = (stops: any[]) => {
      const empIds = new Set<string>();
      for (const s of stops || []) {
        const ids = (s as any).assignee_ids ?? ((s as any).assigned_employee_id ? [(s as any).assigned_employee_id] : []);
        for (const id of ids) if (id) empIds.add(id);
      }
      return Array.from(empIds)
        .map((id) => activeEmployees.find((e: any) => e.id === id))
        .filter(Boolean)
        .map((e: any) => ({ id: e.id, name: e.name, avatar_url: e.avatar_url, color: e.color }));
    };
    // BEMÆRK: tidligere udledte vi her et "smart" by-baseret navn — det
    // er fjernet, fordi navnet ændrede sig når stops blev flyttet, hvilket
    // brugeren oplevede som at en navngivet rute pludselig hed noget andet.
    // Vi bruger nu kun eksplicit navn → basisrutens navn → dato-fallback.
    // Map til hurtig opslag på basis-rutens visningsnavn/farve, så
    // materialiserede gentagende ruter arver detaljer fra originalen.
    const baseInfoById = new Map<string, { name: string | null; color: string | null }>();
    for (const b of recurringBaseRoutes as any[]) {
      const explicit = (b.name && String(b.name).trim()) ? String(b.name).trim() : null;
      // KUN eksplicitte navne fra basisruten arves. Vi udleder ALDRIG et
      // dynamisk by-baseret navn her — det fik tidligere navne til at
      // "skifte af sig selv" når stops blev tilføjet/flyttet, hvilket
      // brugeren oplevede som at deres navngivne rute automatisk blev
      // omdøbt. Falder vi tilbage, sker det via dateFallback nedenfor.
      baseInfoById.set(b.id, { name: explicit, color: b.color || null });
    }
    // Basisruter der er flyttet til en anden dato via `move_route_to_date`
    // efterlader en `moved`-exception der peger på en ny rute-row. Den
    // oprindelige basisrute-row bliver dog liggende på sin ankerdato — så
    // projektions-cadencen ikke ødelægges. Når vi viser den til brugeren
    // skal vi dog SKJULE basisruten på dens oprindelige dato hvis der
    // findes en gyldig erstatning, ellers ses ruten BÅDE på den gamle
    // OG den nye dato samtidig.
    const movedBaseKeys = new Set<string>();
    {
      const realIds = new Set(calendarRoutesRaw.map((r) => r.id));
      for (const ex of routeOccurrenceExceptions as any[]) {
        const type = (ex.exception_type as string | null) ?? "moved";
        if (type !== "moved") continue;
        const replId = ex.replacement_route_id as string | null;
        const baseId = ex.base_route_id as string;
        const date = String(ex.occurrence_date).slice(0, 10);
        if (!replId || replId === baseId) continue;
        if (!realIds.has(replId)) continue;
        movedBaseKeys.add(`${baseId}|${date}`);
      }
    }
    const built = calendarRoutesRaw.map((r) => {
      const stopsForRoute = stopsByRoute.get(r.id) || [];
      const emps = employeesForStops(stopsForRoute);
      const dayIndex = indexByRouteId.get(r.id) || 1;
      // Materialiseret gentagende rute: arv navn + farve fra basisruten,
      // så alle forekomster i serien hedder/ser ens ud.
      const baseInfo = (r as any).base_route_id ? baseInfoById.get((r as any).base_route_id) : null;
      // Stabil navngivning — i denne rækkefølge:
      //   1) brugerens egen titel (r.name)
      //   2) basisrutens eksplicitte titel (for materialiserede forekomster)
      //   3) datobaseret fallback "Rute (16. sep)"
      // Vi udleder ALDRIG navnet fra stops/by/medarbejdere længere —
      // det skabte "fantom-omdøbninger" når data ændrede sig.
      const dateLabel = (() => {
        try { return format(parseISO(r.route_date), "d. MMM", { locale: da }); }
        catch { return r.route_date; }
      })();
      const dateFallback = dayIndex > 1
        ? `Rute ${dayIndex} (${dateLabel})`
        : `Rute (${dateLabel})`;
      const autoName = (() => {
        if (r.name && r.name.trim()) return r.name;
        if (baseInfo?.name) return baseInfo.name;
        return dateFallback;
      })();
      const inheritedColor = baseInfo?.color && !r.color ? baseInfo.color : r.color;
      return {
        ...r,
        name: autoName,
        color: inheritedColor,
        stops: stopsForRoute,
        attachedEmployees: emps,
        attachedEmployeeCount: emps.length,
      };
    });
    return built.filter((r: any) => {
      // Materialiserede/projicerede forekomster uden aktive stops er ghost-ruter.
      // Manuelt oprettede tomme ruter må stadig vises, så brugeren kan lægge
      // aftaler på dem.
      if (r.base_route_id && (r.stops?.length ?? 0) === 0) return false;
      // Skjul den oprindelige basisrute-row på dens ankerdato hvis brugeren
      // har flyttet den til en anden dato (se kommentaren ovenfor).
      if (!r.base_route_id && movedBaseKeys.has(`${r.id}|${r.route_date}`)) return false;
      // Når filtre er aktive, skjul ruter helt hvis ingen af deres stops matcher.
      if (filtersActive && (r.stops?.length ?? 0) === 0) return false;
      return true;
    });
  }, [calendarRoutesRaw, visibleCalendarStops, activeEmployees, recurringBaseRoutes, filtersActive, routeOccurrenceExceptions]);

  const virtualCalendarRoutes: CalendarRoute[] = useMemo(() => {
    if (!recurringSources.length) return [];
    // Map fra source-key (agr:.. / sub:.. / order:..) til intervallet
    // aftalen/abonnementet kører på. Bruges til at hejse aftalens
    // gentagelses-interval ned på de projicerede stops — uden dette ville
    // basis-rute-stops uden agreement_occurrence-link vise "Engangsaftale"
    // i alle projicerede ruter, selvom aftalen reelt gentages hver uge/14. dag.
    const intervalByKey = new Map<string, string>();
    for (const src of recurringSources) {
      if (!src.interval) continue;
      for (const key of src.sourceKeys) {
        if (!intervalByKey.has(key)) intervalByKey.set(key, src.interval);
      }
    }
    const intervalForStop = (s: any): string | null => {
      const keys = recurringSourceKeysForStop(s);
      for (const k of keys) {
        const iv = intervalByKey.get(k);
        if (iv) return iv;
      }
      return null;
    };
    const anchoredSourceKeys = new Set<string>();
    for (const src of recurringSources as any[]) {
      if (!src.anchor_date) continue;
      for (const key of src.sourceKeys || []) anchoredSourceKeys.add(key);
    }
    // Slå basisrutens *færdige* visningsnavn og farve op fra det allerede
    // byggede calendarRoutes (samme logik som rigtige rute-kort bruger).
    // Det sikrer at projicerede forekomster altid arver præcis samme navn
    // og farve som originalen — også når brugeren ikke har sat det manuelt.
    const resolvedBaseById = new Map<string, { name: string | null; color: string | null }>();
    for (const r of calendarRoutes as any[]) {
      resolvedBaseById.set(r.id, { name: r.name || null, color: r.color || null });
    }
    // Map for hurtig opslag på basis-rute. Vi falder tilbage til den separat
    // hentede basis-rute hvis den ikke er i det synlige interval — så
    // projektionen virker uendeligt frem (og tilbage) i tiden.
    const baseById = new Map<string, any>();
    for (const r of recurringBaseRoutes) baseById.set(r.id, r);
    // Foretræk basis-versionen med stops; ellers brug rå-route-data.
    for (const r of calendarRoutesRaw) {
      if (!baseById.has(r.id)) baseById.set(r.id, r);
    }
    // Suppress projektion både for selve basisrutens dato OG for datoer hvor
    // brugeren har materialiseret en override (rigtig rute med base_route_id).
    const realKeys = new Set<string>();
    for (const r of calendarRoutesRaw) {
      realKeys.add(`${r.id}|${r.route_date}`);
      if ((r as any).base_route_id) {
        realKeys.add(`${(r as any).base_route_id}|${r.route_date}`);
      }
    }
    const realRouteIds = new Set(calendarRoutesRaw.map((r) => r.id));
    const { suppressedProjectionKeys, shiftsByOriginal } = resolveProjectionExceptions(
      routeOccurrenceExceptions as any[],
      realRouteIds,
    );
    for (const key of suppressedProjectionKeys) realKeys.add(key);
    // Pr. basis-rute: den dato hvor den RIGTIGE rute-row faktisk ligger lige nu.
    // Vi bruger den til at klippe projektioner væk der ellers ville dukke op
    // FØR rutens nuværende dato — fx hvis brugeren har flyttet ruten frem i
    // tiden og en aftale-cyklus (eller en anden aftale på samme rute) stadig
    // ville projicere på den gamle/mellemliggende dato. En basisrute kan
    // logisk set ikke "have forekomster" før basisruten selv eksisterer.
    const minDateByBaseRouteId = new Map<string, string>();
    for (const r of calendarRoutesRaw) {
      const baseId = (r as any).base_route_id || r.id;
      const d = String(r.route_date).slice(0, 10);
      const existing = minDateByBaseRouteId.get(baseId);
      if (!existing || d > existing) minDateByBaseRouteId.set(baseId, d);
    }
    // Robust dedup: hvis en aftale (agreement/subscription/order) allerede
    // findes som rigtigt stop på en given dato, skal vi IKKE også vise
    // den som projiceret rute på samme dato — uanset om stoppet ligger
    // på basisruten eller en helt anden materialiseret rute. Uden dette
    // ender den projicerede rute med at dukke op "bagved" den rigtige.
    const realSourceKeysByDate = new Map<string, Set<string>>();
    for (const s of visibleCalendarStops as any[]) {
      const route = calendarRoutesRaw.find((r) => r.id === s.route_id);
      if (!route) continue;
      const d = String(route.route_date).slice(0, 10);
      const keys = recurringSourceKeysForStop(s);
      if (keys.length === 0) continue;
      const set = realSourceKeysByDate.get(d) || new Set<string>();
      keys.forEach((k) => set.add(k));
      realSourceKeysByDate.set(d, set);
    }
    const isLiveProjectedStop = (s: any) => {
      const eff = (s.occurrence_status as string | null | undefined) ?? s.status;
      return eff !== "completed" && eff !== "cancelled";
    };
    // Hver aftale beholder sit eget interval, men bruger basisrutens route_date
    // som stabil kalender-anker når den findes. Det gør projektionen robust i
    // begge retninger: en 14-dages aftale på en basisrute d. 28 viser også d.
    // 14, mens månedlige/ugentlige aftaler stadig beregnes med deres egen cadence.
    const sourcesWithRouteSeed = recurringSources;
    const projectionWindow = expandProjectionWindowForShiftedOccurrences(
      calendarRange.start,
      calendarRange.end,
      routeOccurrenceExceptions as any[],
    );
    const projections = expandRecurringRoutes({
      sources: sourcesWithRouteSeed,
      // Hvis en shifted forekomst lander i viewet men originaldatoen ligger
      // lige udenfor, udvider vi projektionen nok til at kunne flytte den ind.
      rangeStart: projectionWindow.rangeStart,
      rangeEnd: projectionWindow.rangeEnd,
      realRouteDates: realKeys,
      overrides: occurrenceOverrides as any[],
      pauses: agreementPauses.map((p) => ({
        agreement_id: p.agreement_id,
        start_date: p.start_date,
        end_date: p.end_date,
      })),
      holidayDates: businessHolidays.map((h) => h.holiday_date),
    });
    const shifted = applyProjectedOccurrenceShifts(projections, shiftsByOriginal, realKeys);
    return shifted
      .map((p) => {
        // Klip kun projektioner væk der ligger før basisrutens dato når kilden
        // IKKE har en route-date som kalender-anker. For ankrede serier er
        // datoer før basisruten legitime — fx d. 14 når basisruten er d. 28 og
        // aftalen kører hver 14. dag.
        const baseMinDate = minDateByBaseRouteId.get(p.baseRouteId);
        const hasAnchoredSource = p.sourceKeys.some((key) => anchoredSourceKeys.has(key));
        const isShiftedOccurrence = shiftsByOriginal.get(`${p.baseRouteId}|${p.date}`) !== undefined
          || Array.from(shiftsByOriginal.values()).includes(p.date);
        if (baseMinDate && p.date < baseMinDate && !hasAnchoredSource && !isShiftedOccurrence) return null;
        // Filtrér source-keys der allerede er materialiseret som rigtige
        // stops på samme dato — så vi ikke får dubletter.
        const dateRealKeys = realSourceKeysByDate.get(p.date);
        if (dateRealKeys && dateRealKeys.size > 0) {
          const remaining = p.sourceKeys.filter((k) => !dateRealKeys.has(k));
          if (remaining.length === 0) return null;
          p = { ...p, sourceKeys: remaining };
        }
        const base = baseById.get(p.baseRouteId);
        if (!base) return null;
        const sourceSet = new Set(p.sourceKeys);
        const baseHasActiveSource = recurringSources.some((src: any) =>
          src.preferred_route_id === p.baseRouteId
          && src.sourceKeys?.some((key: string) => sourceSet.has(key)),
        );
        if (!baseHasActiveSource) return null;
        const resolved = resolvedBaseById.get(p.baseRouteId);
        // Projicér basis-rutens stops over på den virtuelle dato — gør at
        // brugeren ser kunderne i kalender-kortet selv før forekomsten er
        // materialiseret. Stops markeres som virtuelle så de ikke kan ændres.
        const projectedStops: any[] = (base.stops || [])
          .filter((s: any) => projectedStopMatchesSources(s, p.sourceKeys))
          .filter(isLiveProjectedStop)
          .map((s: any, i: number) => ({
            ...s,
            id: `virtual-stop:${p.baseRouteId}:${p.date}:${s.id}`,
            route_id: p.id,
            status: "planned",
            isVirtual: true,
            sequence: i,
            // Arv aftalens interval fra den matchende recurring source —
            // basis-stoppet har ofte ikke selv en agreement_occurrence-link,
            // så uden dette ville badge'et fejlagtigt vise "Engangsaftale".
            agreement_interval: s.agreement_interval ?? intervalForStop(s),
          }));
        // Synthesér placeholder-stops for de aftaler i sourceKeys der ikke har
        // et eksisterende stop på basisruten — ellers ville fx 3 aftaler på
        // samme rute kun vise 1 kunde på den projicerede dato (kun den med
        // et materialiseret base-stop). Hver aftale fortjener sin egen række.
        const coveredKeys = new Set<string>();
        for (const s of projectedStops) {
          for (const k of recurringSourceKeysForStop(s)) coveredKeys.add(k);
        }
        let synthIndex = projectedStops.length;
        for (const src of recurringSources as any[]) {
          if (src.preferred_route_id !== p.baseRouteId) continue;
          if (!src.placeholder) continue;
          const keys: string[] = src.sourceKeys ?? [];
          if (!keys.some((k) => sourceSet.has(k))) continue;
          if (keys.some((k) => coveredKeys.has(k))) continue;
          const ph = src.placeholder;
          projectedStops.push({
            ...ph,
            id: `virtual-stop:${p.baseRouteId}:${p.date}:agr:${ph.agreement_id}`,
            route_id: p.id,
            status: "planned",
            isVirtual: true,
            sequence: synthIndex++,
            agreement_interval: src.interval ?? null,
            order_id: null,
            subscription_id: null,
          } as any);
          for (const k of keys) coveredKeys.add(k);
        }
        if (projectedStops.length === 0) return null;
        // Saml medarbejdere fra basis-rutens stops så virtuelle ruter også
        // viser tilknyttede medarbejdere på kalender-kortet.
        const empIds = new Set<string>();
        for (const s of projectedStops) {
          const ids = s.assignee_ids ?? (s.assigned_employee_id ? [s.assigned_employee_id] : []);
          for (const id of ids) if (id) empIds.add(id);
        }
        const emps = Array.from(empIds)
          .map((id) => activeEmployees.find((e: any) => e.id === id))
          .filter(Boolean)
          .map((e: any) => ({ id: e.id, name: e.name, avatar_url: e.avatar_url, color: e.color }));
        return {
          ...base,
          id: p.id,
          baseRouteId: p.baseRouteId,
          // Bevar sourceKeys på den virtuelle rute, så vi efter klik kan
          // filtrere basis-rutens stops til præcis de aftaler der reelt
          // udføres på den projicerede dato. Uden dette ender filteret med
          // en tom liste og stops-panelet viser ingenting.
          sourceKeys: p.sourceKeys,
          route_date: p.date,
          // Arv basis-rutens *visningsnavn og farve* (incl. auto-genereret),
          // så hele serien ser identisk ud i kalenderen.
          name:
            (resolved?.name && resolved.name.trim())
            || (base.name && String(base.name).trim())
            || `Rute (${format(parseISO(p.date), "d. MMM", { locale: da })})`,
          color: resolved?.color || base.color || null,
          stops: projectedStops,
          attachedEmployees: emps,
          attachedEmployeeCount: emps.length,
          isVirtual: true,
        } as CalendarRoute;
      })
      .filter(Boolean) as CalendarRoute[];
  }, [recurringSources, recurringBaseRoutes, calendarRoutesRaw, routeOccurrenceExceptions, calendarRange.start, calendarRange.end, activeEmployees, calendarRoutes, occurrenceOverrides, agreementPauses, businessHolidays]);

  /* ─── Projection sanity-check / diagnostik ───
     Kører FØR projektionen bruges i UI'et, så vi:
       1) Auto-fjerner inkonsistente `route_occurrence_exceptions`
          (self-replacement eller pegende på slettede ruter) — disse
          undertrykker ellers fuldkommen gyldige projektioner og var
          årsagen til at fx "Aa" + hver-14-dag forsvandt fra kalenderen.
       2) Samler en liste over aftaler der IKKE kan projiceres
          (manglende interval/cadence, manglende rute/seed-dato) og
          viser en advarsel i UI'et — så fejlen aldrig bare "forsvinder".
     ──────────────────────────────────────────── */
  const projectionDiagnostics = useMemo(() => {
    const realRouteIds = new Set(calendarRoutesRaw.map((r) => r.id));
    const staleExceptions: any[] = [];
    for (const ex of routeOccurrenceExceptions as any[]) {
      const baseId = ex.base_route_id as string;
      const replId = ex.replacement_route_id as string | null;
      if (!replId) continue;
      // Self-replacement (samme rute) eller peger på en rute der ikke længere
      // findes → stale data fra tidligere flyt/optimer-operationer.
      if (replId === baseId || !realRouteIds.has(replId)) {
        staleExceptions.push(ex);
      }
    }
    const unprojectable: { source: any; reason: string }[] = [];
    for (const s of recurringSources as any[]) {
      if (!s.preferred_route_id) { unprojectable.push({ source: s, reason: "missing_route" }); continue; }
      if (!s.seed_date && !s.anchor_date) { unprojectable.push({ source: s, reason: "missing_seed" }); continue; }
      const cad = intervalToCadence(s.interval, s.interval_days);
      if (!cad) unprojectable.push({ source: s, reason: "invalid_interval" });
    }
    return { staleExceptions, unprojectable };
  }, [routeOccurrenceExceptions, calendarRoutesRaw, recurringSources]);

  /* Auto-cleanup af stale exceptions — best-effort, kører i baggrunden. */
  const cleanupAttemptedIdsRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const stale = projectionDiagnostics.staleExceptions;
    if (stale.length === 0) return;
    const fresh = stale
      .map((e: any) => e.id as string)
      .filter((id) => !cleanupAttemptedIdsRef.current.has(id));
    if (fresh.length === 0) return;
    fresh.forEach((id) => cleanupAttemptedIdsRef.current.add(id));
    (async () => {
      const { error } = await supabase
        .from("route_occurrence_exceptions")
        .delete()
        .in("id", fresh);
      if (!error) {
        qc.invalidateQueries({ queryKey: ["route-occurrence-exceptions"] });
      }
    })();
  }, [projectionDiagnostics.staleExceptions, qc]);

  /* ─── Fallback-projektion fra agreement_occurrences ───
     Tilbagevendende aftaler genererer planlagte forekomster (`agreement_occurrences`)
     for op til 6 mdr. frem — også når aftalen endnu IKKE har en preferred_route_id.
     Vi viser dem som virtuelle "ghost"-rutekort på datoen, så brugeren altid kan
     se hvad der venter selvom aftalen ikke er tildelt en rute endnu. */
  const { data: pendingOccurrences = [] } = useQuery({
    queryKey: ["pending-occurrences", businessId, calendarRange.start, calendarRange.end],
    enabled: !!businessId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("agreement_occurrences")
        .select("id, agreement_id, occurrence_date, status, route_id, agreements!inner(customer_name, interval, preferred_route_id, status)")
        .eq("business_id", businessId!)
        .gte("occurrence_date", calendarRange.start)
        .lte("occurrence_date", calendarRange.end)
        .is("route_id", null)
        .eq("status", "planned")
        // Skjul forekomster fra inaktive/annullerede aftaler — uden dette
        // hænger gamle "spøgelses-ruter" uden indhold på datoen.
        .eq("agreements.status", "active");
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const occurrenceVirtualRoutes: CalendarRoute[] = useMemo(() => {
    if (!pendingOccurrences.length) return [];
    return pendingOccurrences
      // Spring forekomster over hvor aftalen mangler (orphan-row efter sletning)
      // eller allerede har en preferred_route_id — de tegnes via
      // `virtualCalendarRoutes` (basis-rute-projektionen).
      .filter((o: any) => o.agreements && !o.agreements.preferred_route_id)
      .map((o: any) => ({
        id: `agr-occ:${o.id}`,
        business_id: businessId!,
        employee_id: null,
        route_date: String(o.occurrence_date).slice(0, 10),
        status: "planned",
        name: `Aftale · ${o.agreements?.customer_name || "kunde"}`,
        color: "hsl(var(--muted-foreground))",
        total_distance_km: null,
        total_duration_minutes: null,
        stops: [],
        attachedEmployees: [],
        attachedEmployeeCount: 0,
        isVirtual: true,
      } as unknown as CalendarRoute));
  }, [pendingOccurrences, businessId]);

  const calendarRoutesAll: CalendarRoute[] = useMemo(
    // Skjul projicerede (virtuelle) ruter når filtre er aktive — de har
    // ingen stops endnu, så vi kan ikke matche dem mod assignee/status-filtret.
    () => [
      ...calendarRoutes,
      ...(filtersActive ? [] : virtualCalendarRoutes),
    ],
    [calendarRoutes, virtualCalendarRoutes, filtersActive],
  );

  const activeEditingRoute = useMemo(() => {
    if (!editingRoute) return null;
    // Slå op i begge cacher: calendar-vinduet OG recurring-base-routes,
    // så basisruter der ligger uden for den aktuelle kalender-range stadig
    // vises med deres seneste data (fx når man åbner den via en projiceret
    // forekomst i en fremtidig måned).
    const base = (
      calendarRoutesRaw.find((route) => route.id === editingRoute.id)
      ?? (recurringBaseRoutes as any[]).find((r) => r.id === editingRoute.id)
      ?? editingRoute
    );
    return base;
  }, [editingRoute, calendarRoutesRaw, recurringBaseRoutes]);

  // Find det auto-genererede visningsnavn (fra calendarRoutes-transformen) så
  // edit-sheet kan pre-udfylde inputtet med det navn brugeren faktisk ser på
  // pillen — i stedet for at vise et tomt felt.
  const activeEditingAutoName = useMemo<string | null>(() => {
    if (!editingRoute) return null;
    // 1) Direkte match (rigtige rutekort)
    const direct = calendarRoutes.find((r) => r.id === editingRoute.id);
    if ((direct as any)?.name) return (direct as any).name;
    // 2) Hvis editingRoute er en basisrute åbnet via en projiceret forekomst,
    //    så find et virtuelt kort hvor baseRouteId peger på den.
    const viaBase = calendarRoutes.find(
      (r: any) => r.isVirtual && r.baseRouteId === editingRoute.id,
    );
    return (viaBase as any)?.name || null;
  }, [editingRoute, calendarRoutes]);

  const openProjectedRoute = async (r: any) => {
    const baseId = r.baseRouteId || (typeof r.id === "string" ? r.id.split(":")[1] : null);
    const projectedDate = String(r.route_date || "").slice(0, 10);
    const clientEventId = `open-projected:${baseId || "missing"}:${projectedDate}:${Date.now()}`;
    if (!businessId || !baseId || !projectedDate) {
      toast.error("Kunne ikke åbne projiceret rute");
      return;
    }
    // Husk hvilke aftale-kilder der er aktive for netop denne projicerede
    // forekomst — så stops-listen i sheet/panel kun viser dem.
    const projectedSourceKeys: string[] = Array.isArray(r.sourceKeys) ? r.sourceKeys : [];
    const projectedPreviewStops = Array.isArray(r.stops) ? r.stops : [];
    if (projectedPreviewStops.length === 0) {
      toast.error("Projiceret rute fjernet", {
        description: "Ruten har ingen aktive stops og vises derfor ikke længere.",
      });
      await qc.invalidateQueries({ queryKey: ["route-calendar"] });
      await qc.invalidateQueries({ queryKey: ["recurring-agreements-for-planner"] });
      return;
    }
    setEditingProjectedContext({
      baseRouteId: baseId,
      projectedDate,
      sourceKeys: projectedSourceKeys,
      previewStops: projectedPreviewStops,
    });
    // Find basisruten direkte i en af de lokale cacher — projicerede ruter må
    // ALDRIG have deres eget modal. Vi åbner altid den originale ruten,
    // så ændringer (navn, farve, osv.) gælder hele serien. Vi tjekker
    // BÅDE calendarRoutesRaw (basisrute i det aktuelle vindue) OG
    // recurringBaseRoutes (basisrute uden for vinduet) før vi falder
    // tilbage til serverkaldet.
    const localBase =
      calendarRoutesRaw.find((x: any) => x.id === baseId)
      ?? (recurringBaseRoutes as any[]).find((x: any) => x.id === baseId);
    if (localBase) {
      try {
        const materializedRoute = await openProjectedRouteBase({ businessId, baseRouteId: baseId, projectedDate, clientEventId });
        setEditingRoute(materializedRoute as Route);
        await qc.invalidateQueries({ queryKey: ["route-calendar"] });
        await qc.invalidateQueries({ queryKey: ["recurring-agreements-for-planner"] });
      } catch (err: any) {
        setEditingProjectedContext(null);
        toastRouteError(err, toast.error, { titleFallback: "Den projicerede rute kunne ikke gøres klar" });
        return;
      }
      // Telemetri i baggrunden — ikke blokerende.
      void logRoutePlannerEvent({
        businessId,
        eventType: "projected_route_opened_base_local",
        severity: "info",
        baseRouteId: baseId,
        projectedDate,
        clientEventId,
      });
      return;
    }
    try {
      const beforeCount = calendarRoutesRaw.filter(
        (x: any) => x.base_route_id === baseId && String(x.route_date).slice(0, 10) === projectedDate,
      ).length;
      if (beforeCount > 0) {
        await logRoutePlannerEvent({
          businessId,
          eventType: "projected_route_click_duplicate_detected_client",
          severity: "error",
          baseRouteId: baseId,
          projectedDate,
          clientEventId,
          details: { materializedCountInClientCache: beforeCount, action: "open_base_only" },
        });
      }
      const baseRoute = await openProjectedRouteBase({ businessId, baseRouteId: baseId, projectedDate, clientEventId });
      setEditingRoute(baseRoute);
      await qc.invalidateQueries({ queryKey: ["route-planner-events"] });
    } catch (err: any) {
      setEditingProjectedContext(null);
      toastRouteError(err, toast.error, { titleFallback: "Basisruten kunne ikke åbnes" });
      await logRoutePlannerEvent({
        businessId,
        eventType: "projected_route_open_failed_client",
        severity: "error",
        baseRouteId: baseId,
        projectedDate,
        clientEventId,
        details: { message: String(err?.message || err) },
      });
    }
  };

  /* Auto-geocode jobs missing coords */
  useEffect(() => {
    if (!businessId || geocoding) return;
    const needsGeocode = unassigned.filter((j: any) =>
      (j.address || j.zip_code || j.city) && (j.latitude == null || j.longitude == null),
    );
    if (needsGeocode.length === 0) return;
    setGeocoding(true);
    (async () => {
      for (const job of needsGeocode.slice(0, 5)) {
        try {
          const res = await geocode.mutateAsync({
            address: job.address || undefined,
            zip_code: job.zip_code || undefined,
            city: job.city || undefined,
          });
          if (res.found) {
            await supabase.from("orders").update({
              latitude: res.latitude, longitude: res.longitude,
            }).eq("id", job.id);
          }
        } catch { /* ignore */ }
      }
      setGeocoding(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unassigned.length, businessId]);

  /* Keyboard shortcuts: ←/→ for date, T for today, M for map, N for new route */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const t = e.target as HTMLElement;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      // Undo/redo (skal håndteres FØR den generelle modifier-guard nedenfor).
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) void history.redo();
        else void history.undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        // Windows-konvention for redo.
        e.preventDefault();
        void history.redo();
        return;
      }
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setDate((d) => format(view === "week" ? addWeeks(parseISO(d), -1) : addMonths(parseISO(d), -1), "yyyy-MM-dd"));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setDate((d) => format(view === "week" ? addWeeks(parseISO(d), 1) : addMonths(parseISO(d), 1), "yyyy-MM-dd"));
      } else if (e.key.toLowerCase() === "t") {
        setDate(todayStr());
      } else if (e.key.toLowerCase() === "n") {
        setCreateOpen(true);
      } else if (e.key === "Escape" && selectedStopId) {
        setSelectedStopId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedStopId, view, history]);

  /* Når create-dialog åbnes, foreslå en ledig farve for den valgte dato */
  useEffect(() => {
    if (!createOpen) return;
    const usedColorsThisDay = calendarRoutes
      .filter((r) => r.route_date === newRouteDate)
      .map((r) => r.color);
    setNewRouteColor(pickAvailableColor(usedColorsThisDay));
    setNewRouteJobIds([]);
    setNewRouteJobSearch("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [createOpen, newRouteDate]);

  // ─── Stabile callbacks til MonthWeekCalendar ───
  // VIGTIGT: Disse hooks SKAL stå før de tidlige `if (!business) return …`
  // og `if (!routePlanningEnabled) return …` nedenfor, ellers ændrer
  // hook-rækkefølgen sig mellem renders og React kaster
  // "Rendered more hooks than during the previous render."
  const handleCalendarSelectStop = useCallback((s: any) => {
    setSelectedStopId(s.id);
  }, []);
  const handleCalendarCreateRoute = useCallback((d: string) => {
    setNewRouteDate(d);
    setCreateOpen(true);
  }, []);
  const draggingTypeForCalendar = useMemo<"job" | "route" | "stop" | null>(() => {
    if (activeDragData?.type === "job") return "job";
    if (activeDragData?.type === "route") return "route";
    if (activeDragData?.type === "stop") return "stop";
    return null;
  }, [activeDragData?.type]);

  if (loadingBusiness) {
    return <ShellSkeleton />;
  }

  if (!business) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="p-6 text-center">
          <p className="mb-4">Du skal oprette en virksomhed først.</p>
          <Button asChild><Link to="/virksomhed">Gå til virksomhedspanel</Link></Button>
        </Card>
      </div>
    );
  }

  if (!routePlanningEnabled) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="p-8 max-w-md text-center">
          <h2 className="text-xl font-semibold mb-2">Ruteplanlægning er ikke aktiveret</h2>
          <p className="text-muted-foreground mb-4">Aktivér funktionen under Indstillinger for at planlægge ruter.</p>
          <Button asChild><Link to="/virksomhed">Gå til indstillinger</Link></Button>
        </Card>
      </div>
    );
  }

  /* ─── DnD ─── */
  const handleDragStart = (e: DragStartEvent) => {
    const data: any = e.active.data.current;
    // ─── Metrics: start måling af drag-to-drop latency ───
    // Sporer hvor lang tid brugeren bruger fra drag begynder til drop
    // gennemføres. Sammen med klik-fejlraten (drag uden drop) kan vi
    // sammenligne perf på Windows/Android vs. macOS/iOS.
    const metricType: "job" | "route" | "stop" | "unknown" =
      data?.type === "job" || data?.type === "route" || data?.type === "stop"
        ? data.type
        : "unknown";
    dragMetrics.start(metricType);
    // Virtuelle (projicerede) ruter er nu tilladt at trække — de håndteres
    // separat i drag-end ved at registrere en shift-undtagelse i stedet for
    // at flytte selve basisruten eller materialisere den.
    setActiveDragId(e.active.id as string);
    setActiveDragData(data);
    const origin = getDragPoint(e.activatorEvent);
    activeDragOriginRef.current = origin;
    activeDragPointRef.current = origin;
    if (data?.type === "route") {
      activeRouteDragOriginRef.current = origin;
      activeRouteDragPointRef.current = origin;
      setRouteDragPoint(origin);
      applyRouteOverlayPosition(origin);
    } else {
      activeRouteDragOriginRef.current = null;
      activeRouteDragPointRef.current = null;
      setRouteDragPoint(null);
    }
  };

  const handleDragOver = (e: DragOverEvent) => {
    // ─── Live drag-validering ───
    // Beregn et `ValidationResult` for det aktuelt hovrede target og
    // skriv det til den globale drag-validation-store. MonthWeekCalendar's
    // celler/rute-pillule læser status via `useTargetValidation` og
    // ændrer ring-farve (grøn/gul/rød) + tooltip — INDEN drop.
    const activeData: any = e.active.data.current;
    const overData: any = e.over?.data.current;
    if (!activeData || !overData) {
      clearDragValidation();
      return;
    }

    try {
      // ── JOB → ROUTE: tjek aftaledubletter på dagen + kapacitet ──
      if (activeData.type === "job" && overData.type === "route") {
        const targetRoute = calendarRoutesRaw.find((r) => r.id === overData.routeId);
        if (!targetRoute) return clearDragValidation();
        const sameDayStops = visibleCalendarStops.filter((s: any) => {
          const r = calendarRoutesRaw.find((x) => x.id === s.route_id);
          return r?.route_date === targetRoute.route_date;
        });
        const stopsOnRoute = visibleCalendarStops.filter((s) => s.route_id === targetRoute.id) as any[];
        const job = activeData.job ?? {};
        const result = validateStopAssignment(
          {
            order_id: job.id ?? null,
            customer_id: job.customer_id ?? null,
            customer_name: job.customer_name ?? null,
            latitude: job.latitude ?? null,
            longitude: job.longitude ?? null,
          },
          { id: targetRoute.id, route_date: targetRoute.route_date, isVirtual: (targetRoute as any).isVirtual },
          {
            otherStopsSameDay: sameDayStops as any[],
            stopsOnTargetRoute: stopsOnRoute.map((s) => ({ id: s.id, latitude: s.latitude, longitude: s.longitude })),
            estimatedStopCountAfter: stopsOnRoute.length + 1,
          },
        );
        const { severity, topMessage } = summarize(result);
        writeDragValidationDebounced({ targetId: `route:${targetRoute.id}`, severity, topMessage, result });
        return;
      }

      // ── JOB → DAY (tom celle = ny rute): altid ok (men advar ved fortid) ──
      if (activeData.type === "job" && overData.type === "day") {
        const today = todayStr();
        const result = overData.date < today
          ? validateRouteMove({ id: "new", route_date: today }, overData.date)
          : { ok: true, errors: [], warnings: [], suggestions: [] } as any;
        const { severity, topMessage } = summarize(result);
        writeDragValidationDebounced({ targetId: `day:${overData.date}`, severity, topMessage, result });
        return;
      }

      // ── ROUTE → DAY (flytning): tjek fortid, serie-kollision på datoen ──
      if (activeData.type === "route" && overData.type === "day") {
        const route = activeData.route;
        if (!route) return clearDragValidation();
        const baseId: string | null = route.base_route_id ?? route.baseRouteId ?? null;
        const seriesRoutesOnTargetDate = calendarRoutesRaw.filter((r: any) =>
          String(r.route_date).slice(0, 10) === overData.date
          && r.id !== route.id
          && (
            (baseId && (r.id === baseId || r.base_route_id === baseId))
            || (!baseId && r.id === route.id)
          )
        );
        const result = validateRouteMove(
          { id: route.id, route_date: route.route_date, isVirtual: route.isVirtual, baseRouteId: baseId },
          overData.date,
          { seriesRoutesOnTargetDate },
        );
        const { severity, topMessage } = summarize(result);
        writeDragValidationDebounced({ targetId: `day:${overData.date}`, severity, topMessage, result });
        return;
      }

      // ── ROUTE → ROUTE (flet): blokér ved projection→projection ──
      if (activeData.type === "route" && overData.type === "route") {
        const source = activeData.route;
        const target = calendarRoutesRaw.find((r) => r.id === overData.routeId) as any;
        if (!source || !target) return clearDragValidation();
        if (source.isVirtual && target.isVirtual) {
          writeDragValidationDebounced({
            targetId: `route:${target.id}`,
            severity: "error",
            topMessage: "Kan ikke flette to projicerede ruter",
            result: { ok: false, errors: [], warnings: [], suggestions: [] } as any,
          });
          return;
        }
        writeDragValidationDebounced({
          targetId: `route:${target.id}`,
          severity: "ok",
          topMessage: undefined,
          result: { ok: true, errors: [], warnings: [], suggestions: [] } as any,
        });
        return;
      }

      clearDragValidation();
    } catch {
      // Validering må ALDRIG kaste — ryd state stille og fald tilbage til
      // den klassiske flow (drop-handler beholder sin egen guard).
      clearDragValidation();
    }
  };

  const handleDragMove = (e: DragMoveEvent) => {
    const origin = activeDragOriginRef.current;
    if (!origin) return;
    const point = { x: origin.x + e.delta.x, y: origin.y + e.delta.y };
    activeDragPointRef.current = point;
    if (e.active.data.current?.type === "route") {
      activeRouteDragPointRef.current = point;
      applyRouteOverlayPosition(point);
    }
  };

  // De øvrige kalender-callbacks afhænger af `openProjectedRoute` /
  // `handleOptimize` som er defineret nedenfor, så de bliver almindelige
  // (uden useCallback). MonthWeekCalendar-memoen accepterer det — kun de
  // mest brugte callbacks (select stop / create route) skal være stabile.
  const handleCalendarSelectRoute = async (r: any) => {
    setSelectedStopId(null);
    if (r.isVirtual) {
      await openProjectedRoute(r);
      return;
    }
    setEditingProjectedContext(null);
    setEditingRoute(r);
  };
  const handleCalendarOptimizeRoute = (id: string) => {
    const r = calendarRoutesRaw.find((x) => x.id === id);
    handleOptimize(id, r?.name ?? null);
  };

  /** Tjekker om en flytning af et stop til en ny dato vil overlappe
   *  med en assignees øvrige stops på den dato. Returnerer en kort
   *  beskrivende tekst (eller null hvis ingen konflikt). */
  const detectAssigneeConflicts = (
    stop: any,
    targetDate: string,
  ): string | null => {
    const assignees: string[] = stop.assignee_ids || (stop.assigned_employee_id ? [stop.assigned_employee_id] : []);
    if (assignees.length === 0) return null;
    const dur = Number(stop.duration_minutes || 30);
    const startMin = stop.planned_arrival
      ? (() => { const d = new Date(stop.planned_arrival); return d.getHours() * 60 + d.getMinutes(); })()
      : (stop.time_window_start ? toMin(stop.time_window_start) : null);
    if (startMin == null) return null;
    const endMin = startMin + dur;

    // Find route_ids på targetDate
    const targetRouteIds = new Set(
      calendarRoutesRaw.filter((r) => r.route_date === targetDate).map((r) => r.id),
    );
    if (targetRouteIds.size === 0) return null;

    const conflicts: string[] = [];
    for (const other of calendarStops) {
      if (other.id === stop.id) continue;
      if (!targetRouteIds.has(other.route_id)) continue;
      const otherIds: string[] = (other as any).assignee_ids || [];
      const overlap = otherIds.some((id) => assignees.includes(id));
      if (!overlap) continue;
      const oStart = (other as any).planned_arrival
        ? (() => { const d = new Date((other as any).planned_arrival); return d.getHours() * 60 + d.getMinutes(); })()
        : (other.time_window_start ? toMin(other.time_window_start) : null);
      if (oStart == null) continue;
      const oEnd = oStart + Number(other.duration_minutes || 30);
      if (startMin < oEnd && oStart < endMin) {
        conflicts.push(other.customer_name || "Stop");
      }
    }
    return conflicts.length === 0
      ? null
      : `Overlapper med ${conflicts.length === 1 ? conflicts[0] : `${conflicts.length} andre stops`}`;
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    const activeDataAtDrop: any = active.data.current;
    const pointAtDrop = activeDataAtDrop?.type === "route" ? activeRouteDragPointRef.current : activeDragPointRef.current;
    const domRouteTarget = activeDataAtDrop?.type === "route" || activeDataAtDrop?.type === "job"
      ? getRouteDropPointTarget(pointAtDrop, activeDataAtDrop?.type === "route" ? activeDataAtDrop.route?.id : null)
      : null;
    const dndRouteTarget = over?.data.current ?? null;
    const preferredRouteTarget = activeDataAtDrop?.type === "route" || activeDataAtDrop?.type === "job"
      ? dndRouteTarget?.type === "route"
        ? dndRouteTarget
        : domRouteTarget?.type === "route"
          ? domRouteTarget
          : dndRouteTarget ?? domRouteTarget
      : null;
    const hasDropTarget = activeDataAtDrop?.type === "route" || activeDataAtDrop?.type === "job" ? !!preferredRouteTarget : !!over;
    setActiveDragId(null);
    setActiveDragData(null);
    activeDragPointRef.current = null;
    activeDragOriginRef.current = null;
    setRouteDragPoint(null);
    activeRouteDragPointRef.current = null;
    activeRouteDragOriginRef.current = null;
    clearDragValidation();
    // ─── Metrics: registrér resultatet af denne drag ───
    // `dropped=true` kun når brugeren faktisk slap på et target. Drags
    // der ender uden over-target tæller som "klik-fejl" — typisk når
    // browseren startede en drag pga. en lille touch-bevægelse, mens
    // brugeren forsøgte at klikke (særligt Windows-touchpads/Android).
    dragMetrics.end(hasDropTarget);
    if (!hasDropTarget || !businessId) return;

    // Knyt en ordres aktive, gentagende abonnement til en bestemt rute,
    // så ruteplanlæggeren kan projicere fremtidige forekomster (uger/måneder)
    // af aftalen på den rute. Stille fejl — det må aldrig blokere selve droppet.
    const linkAgreementToRoute = async (orderId: string, routeId: string) => {
      try {
        await supabase
          .from("subscriptions")
          .update({ preferred_route_id: routeId })
          .eq("order_id", orderId)
          .eq("status", "active")
          .neq("interval", "engangskøb");
      } catch (err) {
        console.warn("Kunne ikke knytte aftale til rute (projektion)", err);
      }
      // Nye aftaler (uden subscription) — find dem via deres forekomster
      // og sæt preferred_route_id direkte. Dette sikrer at projicerede ruter
      // oprettes første gang en aftale lægges på en rute.
      try {
        const { data: occs } = await supabase
          .from("agreement_occurrences")
          .select("agreement_id")
          .eq("legacy_order_id", orderId);
        const agreementIds = Array.from(new Set(
          (occs || []).map((o: any) => o.agreement_id).filter(Boolean) as string[]
        ));
        if (agreementIds.length > 0) {
          await supabase
            .from("agreements")
            .update({ preferred_route_id: routeId })
            .in("id", agreementIds)
            .neq("interval", "engangskøb")
            .eq("status", "active");
        }
      } catch (err) {
        console.warn("Kunne ikke knytte ny aftale til rute (projektion)", err);
      }
      // VIGTIGT: invalidér eksplicit projektions-queries så virtuelle
      // forekomster vises med det samme — vi kan ikke vente på realtime
      // (postgres_changes på `agreements` fyrer ikke altid pålideligt og
      // staleTime på 60s gjorde tidligere at projektionen først dukkede
      // op efter første rute-flytning).
      qc.invalidateQueries({ queryKey: ["recurring-agreements-for-planner"] });
      qc.invalidateQueries({ queryKey: ["recurring-base-routes"] });
      qc.invalidateQueries({ queryKey: ["pending-occurrences"] });
    };

    /** Aftalens opstartsdato (yyyy-MM-dd) — preferred_date eller next_service_date. */
    const jobStartDate = (job: any): string | null => {
      const raw = job?.preferred_date || job?.next_service_date;
      return raw ? String(raw).slice(0, 10) : null;
    };

    /** Skubber aftalens opstartsdato til ny dato i alle relaterede tabeller.
     *  Bedst-effort — UI'et viser allerede succes på selve droppet. */
    const shiftJobStartDate = async (orderId: string, newDate: string) => {
      try {
        await supabase.from("orders").update({
          preferred_date: newDate,
          next_service_date: newDate,
        }).eq("id", orderId);
      } catch (e) { console.warn("shift orders.preferred_date failed", e); }
      try {
        await supabase.from("subscriptions").update({
          next_service_date: newDate,
        }).eq("order_id", orderId).eq("status", "active");
      } catch (e) { console.warn("shift subscriptions.next_service_date failed", e); }
      // Find aftaler via legacy_subscription_id og opdatér start_date.
      try {
        const { data: subs } = await supabase
          .from("subscriptions").select("id").eq("order_id", orderId);
        const subIds = (subs || []).map((s: any) => s.id);
        if (subIds.length > 0) {
          await supabase.from("agreements").update({ start_date: newDate })
            .in("legacy_subscription_id", subIds);
        }
      } catch (e) { console.warn("shift agreements.start_date failed", e); }
    };

    /** Returnerer true hvis droppet må fortsætte. Hvis target-datoen ikke
     *  matcher aftalens opstartsdato, åbnes en bekræftelsesdialog der
     *  beder brugeren om at flytte opstartsdatoen — i så fald bailes der ud
     *  her og dropet eksekveres senere via `execute()`. */
    const ensureStartDateMatches = (
      job: any,
      targetDate: string,
      targetLabel: string,
      execute: () => Promise<void>,
    ): boolean => {
      const start = jobStartDate(job);
      if (!start || start === targetDate) return true;
      setPendingStartDateChange({
        job,
        currentStart: start,
        targetDate,
        isBefore: targetDate < start,
        targetLabel,
        execute,
      });
      return false;
    };

    const activeData: any = activeDataAtDrop;
    const overData: any = activeData?.type === "route" || activeData?.type === "job" ? preferredRouteTarget : over?.data.current;
    // ─── Hård spærring: aldrig drop på en dato før i dag ───
    // Kalender-cellerne er allerede disabled som drop-target, men en
    // eksplicit guard + toast sikrer at intet drop (rute, stop eller job)
    // kan ramme bagud i tid — uanset hvilken vej dnd-kit routinger fyrer.
    //
    // Sanity-check (tidszone- og månedsskift-sikker):
    //  - Vi sammenligner KUN på yyyy-MM-dd i lokal tid (begge sider).
    //  - Brugerens lokale "i dag" beregnes via `format(new Date(), ...)`,
    //    som respekterer enhedens tidszone, så midnatsskift, sommertid
    //    og månedsskift håndteres korrekt.
    //  - Vi spærrer kun når targetDate < today (lex. sammenligning er
    //    valid for yyyy-MM-dd) — samme dag og fremad er altid tilladt.
    const targetDateForGuard: string | null = (() => {
      const raw = overData?.type === "day"
        ? overData.date
        : overData?.type === "route"
          ? calendarRoutesRaw.find((r) => r.id === overData.routeId)?.route_date
          : null;
      if (!raw) return null;
      const s = String(raw).slice(0, 10);
      // Valider formatet — afvis blot guarden hvis input er korrupt
      // (lader resten af handleren håndtere fejlen normalt).
      return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
    })();
    const todayLocal = todayStr();
    if (targetDateForGuard && targetDateForGuard < todayLocal) {
      toast.error("Kan ikke flytte til en dato før i dag", {
        description: `Dags dato er ${format(new Date(), "EEEE d. MMM yyyy", { locale: da })} — ruter og aftaler kan kun planlægges fra i dag og frem.`,
      });
      return;
    }
    // ─── Projicerede ruter (virtuelle pilule) ───
    // Tilladt: træk → en anden DATO. Spørger via dialog og registrerer en
    //          shift-undtagelse (ingen materialisering, ingen duplikering).
    // Ikke tilladt: træk → en anden rute (flet) — projicerede forekomster
    //          findes ikke fysisk endnu og kan ikke flettes ind i noget.
    if (activeData?.type === "route" && activeData?.route?.isVirtual) {
      if (overData?.type === "route") {
        toast.error("Kan ikke flette en projiceret rute", {
          description: "Åbn den projicerede rute først, eller flyt en faktisk rute i stedet.",
        });
        return;
      }
      if (overData?.type !== "day") return;
      const fromDate = String(activeData.route.route_date || "").slice(0, 10);
      const toDate = String(overData.date || "").slice(0, 10);
      if (!fromDate || !toDate || fromDate === toDate) return;
      const baseRouteId: string | null = activeData.route.baseRouteId ?? null;
      if (!baseRouteId) {
        toast.error("Kan ikke identificere basisruten for forekomsten");
        return;
      }
      // Klient-side guard: er der allerede en faktisk rute fra samme serie
      // på target-datoen? Eller en anden projicerede forekomst af samme
      // basisrute? — så blokerer vi før vi spørger.
      const collidingReal = calendarRoutesRaw.find((r: any) =>
        String(r.route_date).slice(0, 10) === toDate
        && (r.id === baseRouteId || r.base_route_id === baseRouteId),
      );
      if (collidingReal) {
        toast.error("Der findes allerede en rute fra samme serie på den dato");
        return;
      }
      const collidingVirtual = virtualCalendarRoutes.find((r: any) =>
        String(r.route_date).slice(0, 10) === toDate
        && r.baseRouteId === baseRouteId
        && r.id !== activeData.route.id,
      );
      if (collidingVirtual) {
        toast.error("Der er allerede en projiceret forekomst af ruten på den dato");
        return;
      }
      setPendingProjectedMove({
        baseRouteId,
        routeName: activeData.route.name || "Rute",
        fromDate,
        toDate,
      });
      return;
    }

    // ─── Re-entrancy-guard ───
    // Beskyt mod dobbelt-drop (hurtig-klik / accidentel re-fyring) som ellers
    // kunne oprette dublet-ruter eller udløse "uniq_route_stops_route_order".
    const dropKey = (() => {
      if (activeData?.type === "job" && overData?.type === "route") return `job:${activeData.job?.id}->route:${overData.routeId}`;
      if (activeData?.type === "job" && overData?.type === "day") return `job:${activeData.job?.id}->day:${overData.date}`;
      if (activeData?.type === "stop" && overData?.type === "day") return `stop:${activeData.stop?.id}->day:${overData.date}`;
      if (activeData?.type === "route" && overData?.type === "route") return `route:${activeData.route?.id}->route:${overData.routeId}`;
      if (activeData?.type === "route" && overData?.type === "day") return `route:${activeData.route?.id}->day:${overData.date}`;
      return null;
    })();
    if (dropKey) {
      if (inFlightDropsRef.current.has(dropKey)) return;
      inFlightDropsRef.current.add(dropKey);
    }
    // Bestem hvilket target der skal markeres som "behandler".
    const targetKey = (() => {
      if (overData?.type === "route") return `route:${overData.routeId}`;
      if (overData?.type === "day") return `day:${overData.date}`;
      return null;
    })();
    setTargetBusy(targetKey, true);
    const releaseDrop = () => {
      if (dropKey) inFlightDropsRef.current.delete(dropKey);
      setTargetBusy(targetKey, false);
    };

    // Server-side idempotens-claim — atomart insert-on-conflict.
    // Returnerer false hvis nøglen allerede findes (= dobbelt-kald), så
    // vi bailer ud før der laves nogen som helst route/stop-mutationer.
    // Tidsbucket på 3 sekunder gør at brugeren kan retry'e efter en kort
    // pause hvis fx netværket fejlede.
    const claimIdempotency = async (): Promise<boolean> => {
      if (!dropKey) return true;
      const bucket = Math.floor(Date.now() / 3000);
      try {
        const { data, error } = await supabase.rpc("claim_route_planner_idempotency", {
          _key: `${businessId}:${dropKey}:${bucket}`,
          _business_id: businessId,
        });
        if (error) {
          // Hvis selve claim'et fejler, lader vi handlingen køre videre —
          // bedre at risikere en advarsel end at blokere alt arbejde.
          console.warn("idempotency claim failed", error);
          return true;
        }
        return data === true;
      } catch (err) {
        console.warn("idempotency claim threw", err);
        return true;
      }
    };

    /* ─── Drop fra MonthWeekCalendar ─── */
    // Træk en hel rute → en anden rute = flet/merge alle stops ind i målrute
    if (activeData?.type === "route" && overData?.type === "route") {
      const source: Route = activeData.route;
      const targetRouteId: string = overData.routeId;
      if (source.id === targetRouteId) { releaseDrop(); return; }
      const target = calendarRoutesRaw.find((r) => r.id === targetRouteId);
      if (!target) { releaseDrop(); return; }
      // Spær: aldrig flet ind i en projiceret (virtuel) rute — den findes
      // ikke fysisk endnu og ville ellers blive ufrivilligt materialiseret.
      if ((target as any).isVirtual) {
        toast.error("Kan ikke flette ind i en projiceret rute", {
          description: "Vælg en faktisk rute som mål — eller flyt den projicerede forekomst først.",
        });
        releaseDrop();
        return;
      }
      setPendingRouteMerge({ source, target: target as unknown as Route });
      releaseDrop();
      return;
    }

    // Træk en hel rute → ny dato
    if (activeData?.type === "route" && overData?.type === "day") {
      const route: Route = activeData.route;
      const newDate: string = overData.date;
      if (route.route_date === newDate) { releaseDrop(); return; }
      // Åbn dialog — hvis ruten er del af en serie kan brugeren vælge scope.
      // For enkelt-ruter (uden template) viser dialogen kun "Kun denne gang".
      setPendingRouteMove({ route, newDate });
      releaseDrop();
      return;
    }

    // Træk en aftale fra aftalepool → eksisterende rute (kalender-pille)
    if (activeData?.type === "job" && overData?.type === "route") {
      const job = activeData.job;
      if (job.status === "pending") {
        toast.error("Aftalen skal godkendes først", {
          description: "Aftalen er endnu ikke bekræftet af jer eller kunden — godkend den før den kan lægges på en rute.",
        });
        releaseDrop();
        return;
      }
      const targetRouteId: string = overData.routeId;
      const targetRoute = calendarRoutesRaw.find((r) => r.id === targetRouteId);
      if ((targetRoute as any)?.isVirtual) {
        toast.error("Kan ikke lægge aftaler på en projiceret rute", {
          description: "Projicerede ruter er fremtidige forekomster — læg aftalen på basisruten eller en faktisk rute.",
        });
        releaseDrop();
        return;
      }
      const targetDate = targetRoute?.route_date || (targetRoute as any)?.date;
      if (!(await claimIdempotency())) {
        // Et andet kald har allerede claimet samme drop — bail.
        toast.info("Aftalen er allerede ved at blive tilføjet");
        releaseDrop();
        return;
      }
      const performAddToRoute = async () => {
        // Klient-side dubletcheck mod allerede-cached stops — undgår en
        // ekstra Supabase-roundtrip pr. drop. DB har stadig unique-constraint
        // som sikkerhedsnet, og vi catcher fejlen længere nede.
        const cachedDup = calendarStops.some(
          (s: any) => s.route_id === targetRouteId && s.order_id === job.id,
        );
        if (cachedDup) {
          toast.info("Aftalen ligger allerede på denne rute");
          return;
        }
        const sequence = calendarStops.filter((s: any) => s.route_id === targetRouteId).length;
        await addStop.mutateAsync({
          route_id: targetRouteId,
          order_id: job.id,
          sequence,
          customer_name: job.customer_name,
          customer_phone: job.customer_phone,
          address: job.address || [job.zip_code, job.city].filter(Boolean).join(" "),
          latitude: job.latitude,
          longitude: job.longitude,
          service_summary: serviceSummaryForJob(job),
          duration_minutes: Number(job.estimated_duration_minutes) || 30,
          time_window_start: job.preferred_time_start || null,
          time_window_end: job.preferred_time_end || null,
        });
        // Vis success med det samme — koblingen til projektion sker i
        // baggrunden så brugeren ikke mærker forsinkelse.
        toast.success("Aftale tilføjet til ruten");
        void linkAgreementToRoute(job.id, targetRouteId);
      };
      // Klog tjek: matcher target-datoen aftalens opstartsdato?
      // Hvis ikke, beder vi brugeren om bekræftelse før vi flytter opstartsdatoen.
      if (targetDate && !ensureStartDateMatches(
        job, targetDate,
        targetRoute?.name ? `ruten "${targetRoute.name}"` : "ruten",
        async () => {
          await shiftJobStartDate(job.id, targetDate);
          await performAddToRoute();
        },
      )) {
        releaseDrop();
        return;
      }
      try {
        await performAddToRoute();
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (msg.includes("uniq_route_stops_route_order") || msg.includes("duplicate key")) {
          // Race / dobbelt-drop — den anden kørsel har allerede tilføjet stoppet.
          toast.info("Aftalen ligger allerede på denne rute");
          invalidateRouteSyncQueries(qc);
        } else {
          toastRouteError(err, toast.error, { titleFallback: "Kunne ikke tilføje aftale" });
        }
      } finally {
        releaseDrop();
      }
      return;
    }

    // Træk en aftale fra aftalepool → tom dag (opret ny rute + læg aftale på)
    if (activeData?.type === "job" && overData?.type === "day") {
      const job = activeData.job;
      if (job.status === "pending") {
        toast.error("Aftalen skal godkendes først", {
          description: "Aftalen er endnu ikke bekræftet af jer eller kunden — godkend den før den kan lægges på en rute.",
        });
        releaseDrop();
        return;
      }
      const newDate: string = overData.date;
      if (!(await claimIdempotency())) {
        toast.info("Aftalen er allerede ved at blive lagt på den dag");
        releaseDrop();
        return;
      }
      const performCreateRouteWithStop = async () => {
        // Hvis aftalen allerede er lagt på en rute samme dag (fx pga. tidligere
        // hurtig-drop som lige har committet), så afbryd for at undgå dublet-ruter.
        const alreadyOnDay = calendarStops.some(
          (s: any) => s.order_id === job.id &&
            calendarRoutesRaw.find((r) => r.id === s.route_id)?.route_date === newDate,
        );
        if (alreadyOnDay) {
          toast.info("Aftalen ligger allerede på en rute den dag");
          return;
        }
        // Server-side farvevælger undgår race conditions hvis to brugere
        // dropper samtidigt; falder tilbage til klient-valg ved fejl.
        let chosenColor: string | null = null;
        try {
          const { data: c } = await supabase.rpc("pick_route_color", {
            _business_id: businessId,
            _route_date: newDate,
          });
          if (typeof c === "string") chosenColor = c;
        } catch { /* fallback nedenfor */ }
        if (!chosenColor) {
          const usedColorsThisDay = calendarRoutes
            .filter((r) => r.route_date === newDate)
            .map((r) => r.color);
          chosenColor = pickAvailableColor(usedColorsThisDay);
        }
        const created = await createRoute.mutateAsync({
          business_id: businessId,
          route_date: newDate,
          name: null,
          color: chosenColor,
        });
        await addStop.mutateAsync({
          route_id: created.id,
          order_id: job.id,
          sequence: 0,
          customer_name: job.customer_name,
          customer_phone: job.customer_phone,
          address: job.address || [job.zip_code, job.city].filter(Boolean).join(" "),
          latitude: job.latitude,
          longitude: job.longitude,
          service_summary: serviceSummaryForJob(job),
          duration_minutes: Number(job.estimated_duration_minutes) || 30,
          time_window_start: job.preferred_time_start || null,
          time_window_end: job.preferred_time_end || null,
        });
        toast.success(`Ny rute oprettet på ${format(parseISO(newDate), "d. MMM", { locale: da })}`);
        void linkAgreementToRoute(job.id, created.id);
      };
      if (!ensureStartDateMatches(
        job, newDate,
        `${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`,
        async () => {
          await shiftJobStartDate(job.id, newDate);
          await performCreateRouteWithStop();
        },
      )) {
        releaseDrop();
        return;
      }
      try {
        await performCreateRouteWithStop();
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (msg.includes("uniq_route_stops_route_order") || msg.includes("duplicate key")) {
          toast.info("Aftalen ligger allerede på en rute den dag");
          invalidateRouteSyncQueries(qc);
        } else {
          toastRouteError(err, toast.error, { titleFallback: "Kunne ikke oprette rute" });
        }
      } finally {
        releaseDrop();
      }
      return;
    }

    // ── Træk et eksisterende stop fra én rute → en anden dag ──
    // Bruger move_stops_to_date som finder/opretter målrute pr. assignee
    // og opdaterer agreement_occurrences via DB-trigger.
    if (activeData?.type === "stop" && overData?.type === "day") {
      const stop = activeData.stop;
      // Spær: virtuelle (projicerede) stops findes ikke i DB endnu. De skal
      // ikke kunne flyttes direkte — kun via skift på basisruten.
      if ((stop as any)?.isVirtual || String(stop?.id || "").startsWith("virtual-stop:")) {
        toast.error("Projicerede stops kan ikke flyttes", {
          description: "Åbn basisruten for at ændre rækkefølge eller dato for denne aftale.",
        });
        releaseDrop();
        return;
      }
      const newDate: string = overData.date;
      // Find aktuel rute-dato — undgå "flytning" til samme dag
      const currentRoute = calendarRoutesRaw.find((r) => r.id === stop.route_id);
      if (currentRoute && currentRoute.route_date === newDate) { releaseDrop(); return; }

      if (!(await claimIdempotency())) {
        toast.info("Stoppet er allerede ved at blive flyttet");
        releaseDrop();
        return;
      }

      // Konflikt-tjek: advar hvis assignee har overlappende stops på dato
      const conflictMsg = detectAssigneeConflicts(stop, newDate);
      const performMoveStop = async () => {
        const { data, error } = await supabase.rpc("move_stops_to_date", {
          _stop_ids: [stop.id],
          _target_date: newDate,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        const moved = Number(row?.moved_count ?? 0);
        const missing = Number(row?.missing_employee_count ?? 0);
        if (moved > 0) {
          // Hvis flytningen oprettede en helt ny rute på den nye dato
          // (split fra eksisterende rute), så omdøb den efter første kunde
          // og giv den en ledig farve — samme adfærd som MoveStopsDialog.
          try { await renameFreshSplitRoutes([stop.id], newDate); }
          catch (e) { console.warn("renameFreshSplitRoutes", e); }
          toast.success(
            `Stop flyttet til ${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`,
            conflictMsg ? { description: `⚠️ ${conflictMsg} — tjek tidsplanen` } : undefined,
          );
        }
        if (missing > 0) {
          toast.error("Stoppet mangler en medarbejder for at kunne flyttes", {
            description: "Tilknyt en medarbejder til ruten eller aftalen, og prøv igen.",
          });
        }
      };
      // Klog tjek: hent ordrens opstartsdato og advar hvis den nye dato
      // ligger før (eller ikke matcher) opstartsdatoen.
      let startDateForJob: string | null = null;
      let customerName: string | null = stop.customer_name || null;
      if (stop.order_id) {
        try {
          const { data: o } = await supabase
            .from("orders")
            .select("preferred_date, next_service_date, customer_name")
            .eq("id", stop.order_id)
            .maybeSingle();
          if (o) {
            startDateForJob = (o.preferred_date || o.next_service_date) as string | null;
            customerName = customerName || (o.customer_name as string | null);
          }
        } catch { /* stille fejl — vi fortsætter uden tjek */ }
      }
      if (
        startDateForJob &&
        String(startDateForJob).slice(0, 10) !== newDate
      ) {
        // Bloker drop hvis target-datoen ikke matcher opstartsdatoen — uanset
        // om den er før eller efter. Brugeren bekræfter om opstartsdatoen
        // skal flyttes, eller annullerer.
        const startStr = String(startDateForJob).slice(0, 10);
        setPendingStartDateChange({
          job: { id: stop.order_id, customer_name: customerName },
          currentStart: startStr,
          targetDate: newDate,
          isBefore: newDate < startStr,
          targetLabel: `${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`,
          execute: async () => {
            await shiftJobStartDate(stop.order_id, newDate);
            await performMoveStop();
          },
        });
        releaseDrop();
        return;
      }
      try {
        await performMoveStop();
      } catch (err: any) {
        toastRouteError(err, toast.error, { titleFallback: "Kunne ikke flytte stop" });
      } finally {
        releaseDrop();
      }
      return;
    }

    releaseDrop();
  };

  const handleConfirmMoveRoute = async (
    scope: MoveRouteScope,
    moveLinkedSubscriptions: boolean,
  ) => {
    if (!pendingRouteMove) return;
    const { route, newDate } = pendingRouteMove;
    const oldDate = route.route_date;
    try {
      await moveRouteSeries.mutateAsync({
        routeId: route.id,
        newDate,
        scope,
        moveLinkedSubscriptions,
      });
      toast.success(
        scope === "future"
          ? `Ruteserien forskudt til ${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`
          : `Rute flyttet til ${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`,
      );
      pushRouteUndo({
        label: scope === "future"
          ? `Forskydning af ruteserie til ${format(parseISO(newDate), "d. MMM", { locale: da })}`
          : `Flyt rute til ${format(parseISO(newDate), "d. MMM", { locale: da })}`,
        undo: async () => {
          await moveRouteSeries.mutateAsync({
            routeId: route.id,
            newDate: oldDate,
            scope,
            moveLinkedSubscriptions,
          });
        },
      });
      setPendingRouteMove(null);
    } catch (err: any) {
      toast.error(err.message || "Kunne ikke flytte rute", {
        description: "Tjek at den nye dato er gyldig, og prøv igen.",
      });
    }
  };

  // Flet alle aftaler fra én rute over i en anden, og slet kilden.
  // scope === "future" → flyt også gentagne aftalers preferred_route_id over
  // på målruten (og forskyd deres næste forekomst med dato-deltaet),
  // præcis som "Flyt rute til ny dato" gør.
  const handleConfirmRouteMerge = async (scope: "single" | "future" = "single") => {
    if (!pendingRouteMerge) return;
    if (mergingRoute) return; // dobbeltklik-beskyttelse
    const { source, target } = pendingRouteMerge;
    setMergingRoute(true);
    // Persistent loading-toast så brugeren får live feedback under flytningen.
    // Lukkes/erstattes i success eller error blok nedenfor.
    const toastId = toast.loading(
      `Fletter ${source.name || "rute"} → ${target.name || "rute"}…`,
      { description: scope === "future" ? "Inklusive fremtidige forekomster" : "Kun denne dato" },
    );
    // Optimistisk: flyt stops til målruten og fjern kilderuten fra cachen
    // med det samme, så UI'et reagerer øjeblikkeligt i stedet for at vente
    // 3-4 sek på server-roundtrip + invalidate + refetch. Vi tager snapshots
    // for at kunne rulle tilbage hvis serveren afviser.
    const calSnapshots = qc.getQueriesData<any>({ queryKey: ["route-calendar"] });
    // Snapshot af kilderuten FØR vi fjerner den fra cachen, så undo kan
    // genoprette den med samme id, navn, farve, dato osv.
    const sourceSnapshot: any = { ...source };
    qc.setQueriesData({ queryKey: ["route-calendar"] }, (old: any) => {
      if (!old?.routes || !old?.stops) return old;
      return {
        ...old,
        routes: old.routes.filter((r: any) => r.id !== source.id),
        stops: old.stops.map((s: any) =>
          s.route_id === source.id ? { ...s, route_id: target.id } : s,
        ),
      };
    });
    try {
      const result = await routeMutationQueue.run(async () => {
      const sourceStops = calendarStops.filter((s: any) => s.route_id === source.id);
      // Idempotens: hvis kilderuten allerede er slettet (fx fra et tidligere
      // klik der nåede igennem), så er der intet at flette — bare returnér.
      const { data: existing } = await supabase
        .from("routes")
        .select("id")
        .eq("id", source.id)
        .maybeSingle();
      if (!existing) return { sourceStops, moved: 0, alreadyMerged: true };
      let moved = 0;
      if (sourceStops.length > 0) {
        const { data, error } = await supabase.rpc("move_stops_to_route", {
          _stop_ids: sourceStops.map((s: any) => s.id),
          _target_route_id: target.id,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        moved = Number(row?.moved_count ?? 0);
      }

      // "Fremtidige aftaler også": forskyd recurring aftaler/abonnementer
      // på kilden til målrutens dato, og re-point preferred_route_id så
      // fremtidige projektioner tegnes på målruten i stedet.
      if (scope === "future") {
        const deltaMs =
          new Date(target.route_date).getTime() - new Date(source.route_date).getTime();
        const deltaDays = Math.round(deltaMs / 86_400_000);
        const shiftIso = (d: string) => {
          const nd = new Date(d);
          nd.setDate(nd.getDate() + deltaDays);
          return nd.toISOString();
        };
        const shiftDate = (d: string) => {
          const nd = new Date(d);
          nd.setDate(nd.getDate() + deltaDays);
          return nd.toISOString().slice(0, 10);
        };
        const [subsRes, agrsRes] = await Promise.all([
          supabase
            .from("subscriptions")
            .select("id, next_service_date")
            .eq("preferred_route_id", source.id)
            .eq("status", "active")
            .neq("interval", "engangskøb"),
          supabase
            .from("agreements")
            .select("id, start_date")
            .eq("preferred_route_id", source.id)
            .eq("status", "active")
            .neq("interval", "engangskøb"),
        ]);
        await Promise.all([
          ...(subsRes.data || []).map((s: any) =>
            supabase
              .from("subscriptions")
              .update({
                preferred_route_id: target.id,
                ...(deltaDays !== 0 && s.next_service_date
                  ? { next_service_date: shiftIso(s.next_service_date) }
                  : {}),
              })
              .eq("id", s.id),
          ),
          ...(agrsRes.data || []).map((a: any) =>
            supabase
              .from("agreements")
              .update({
                preferred_route_id: target.id,
                ...(deltaDays !== 0 && a.start_date
                  ? { start_date: shiftDate(a.start_date) }
                  : {}),
              })
              .eq("id", a.id),
          ),
        ]);
      }

      // Auto-slet kilderute (den er nu tom efter et fuldt merge)
      const { count } = await supabase
        .from("route_stops")
        .select("id", { count: "exact", head: true })
        .eq("route_id", source.id);
      if ((count ?? 0) === 0) {
        await supabase.from("routes").delete().eq("id", source.id);
      }
      return { sourceStops, moved, alreadyMerged: false };
      });
      const sourceStops = result?.sourceStops ?? [];
      const moved = result?.moved ?? 0;
      const successTitle = result?.alreadyMerged
        ? "Allerede flettet"
        : sourceStops.length === 0
          ? "Tom rute slettet"
          : `${moved} aftale${moved === 1 ? "" : "r"} flettet ind i ${target.name || "rute"}`;
      toast.success(successTitle, {
        id: toastId,
        description:
          scope === "future"
            ? "Fremtidige forekomster af gentagne aftaler følger med — Cmd+Z for at fortryde"
            : "Kilderuten blev slettet automatisk — Cmd+Z for at fortryde",
      });
      setPendingRouteMerge(null);
      invalidateRouteSyncQueries(qc);
      qc.invalidateQueries({ queryKey: ["recurring-agreements-for-planner"] });
      qc.invalidateQueries({ queryKey: ["recurring-base-routes"] });
      qc.invalidateQueries({ queryKey: ["route-series-info"] });

      // Undo (kun for "single" scope — at rulle subscription/agreement-ændringer
      // tilbage er destruktivt og ikke worth complexity). Genopretter kildens
      // routes-row med samme id + flytter stops tilbage.
      if (!result?.alreadyMerged && scope === "single") {
        const stopIdsToMoveBack = sourceStops.map((s: any) => s.id);
        pushRouteUndo({
          label: `Flet ${source.name || "rute"} → ${target.name || "rute"}`,
          undo: async () => {
            try {
              // 1) Genopret kildens routes-row hvis den blev slettet.
              const { data: stillExists } = await supabase
                .from("routes")
                .select("id")
                .eq("id", source.id)
                .maybeSingle();
              if (!stillExists) {
                const insertRow: any = {
                  id: source.id,
                  business_id: (source as any).business_id,
                  route_date: source.route_date,
                  name: source.name,
                  color: (source as any).color ?? null,
                  status: (source as any).status ?? "draft",
                  employee_id: (source as any).employee_id ?? null,
                  start_address: (source as any).start_address ?? null,
                  base_route_id: (source as any).base_route_id ?? null,
                  recurrence_type: (source as any).recurrence_type ?? null,
                  recurrence_interval: (source as any).recurrence_interval ?? null,
                  recurrence_days: (source as any).recurrence_days ?? null,
                };
                const { error: insErr } = await supabase.from("routes").insert(insertRow);
                if (insErr) throw insErr;
              }
              // 2) Flyt stops tilbage til kilden (kun dem vi rent faktisk flyttede).
              if (stopIdsToMoveBack.length > 0) {
                const { error: mvErr } = await supabase.rpc("move_stops_to_route", {
                  _stop_ids: stopIdsToMoveBack,
                  _target_route_id: source.id,
                });
                if (mvErr) throw mvErr;
              }
              invalidateRouteSyncQueries(qc);
              toast.success(`Fletning fortrudt — ${source.name || "rute"} gendannet`);
            } catch (e: any) {
              toast.error("Kunne ikke fortryde fletning", {
                description: e?.message ?? "Prøv at genindlæse siden.",
              });
              throw e;
            }
          },
        });
      }
    } catch (err: any) {
      // Rul optimistisk cache-patch tilbage hvis fletningen fejlede.
      calSnapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.dismiss(toastId);
      toastRouteError(err, toast.error, { titleFallback: "Kunne ikke flette ruterne" });
      // Behold dialogen åben så brugeren kan prøve igen eller annullere bevidst.
    } finally {
      setMergingRoute(false);
      // Brug sourceSnapshot for at undgå unused-var advarsel hvis vi ikke nåede til undo-blokken.
      void sourceSnapshot;
    }
  };

  const handleOptimize = async (routeId: string, routeName: string | null) => {
    setOptimizingRouteId(routeId);
    const label = routeName || "Rute";
    const runner = (async () => {
      const result = await optimizeRoute.mutateAsync(routeId);
      const savedKm = Math.max(
        0,
        (result as any).saved_km ?? (((result as any).before_km ?? result.total_km) - result.total_km),
      );
      const savedMin = Math.max(
        0,
        (result as any).saved_minutes ?? (((result as any).before_minutes ?? result.total_minutes) - result.total_minutes),
      );
      return {
        savedKm,
        savedMin,
        orderChanged: !!(result as any).order_changed,
        meaningful: savedKm >= 0.05 || savedMin >= 1,
      };
    })();
    toast.promise(runner, {
      loading: `${label}: optimerer rækkefølgen…`,
      success: ({ savedKm, savedMin, orderChanged, meaningful }) => {
        if (meaningful) {
          const parts: string[] = [];
          if (savedKm >= 0.05) parts.push(`${savedKm.toFixed(1)} km`);
          if (savedMin >= 1) parts.push(`${Math.round(savedMin)} min`);
          return `${label}: sparet ${parts.join(" · ")}`;
        }
        if (orderChanged) return `${label}: rækkefølgen er opdateret`;
        return `${label}: allerede den bedste rækkefølge`;
      },
      error: (e: any) => `${label}: ${e?.message || "kunne ikke optimere"}`,
    });
    try { await runner; } catch { /* */ }
    setOptimizingRouteId(null);
  };

  const handleCreateRoute = async () => {
    if (!businessId) return;
    if (newRouteJobIds.length === 0) {
      toast.error("Vælg mindst én aftale", {
        description: "En rute skal indeholde mindst én aftale.",
      });
      return;
    }
    // Klog opstartsdato-validering: tjek om alle valgte aftalers
    // opstartsdato matcher rutens dato. Hvis ikke — bed brugeren bekræfte
    // at vi flytter opstartsdatoerne sammen med oprettelsen.
    const jobStartOf = (j: any): string | null => {
      const raw = j?.preferred_date || j?.next_service_date;
      return raw ? String(raw).slice(0, 10) : null;
    };
    const shiftStartOf = async (orderId: string, newDate: string) => {
      try {
        await supabase.from("orders").update({
          preferred_date: newDate,
          next_service_date: newDate,
        }).eq("id", orderId);
      } catch (e) { console.warn("shift orders.preferred_date failed", e); }
      try {
        await supabase.from("subscriptions").update({
          next_service_date: newDate,
        }).eq("order_id", orderId).eq("status", "active");
      } catch (e) { console.warn("shift subscriptions.next_service_date failed", e); }
      try {
        const { data: subs } = await supabase
          .from("subscriptions").select("id").eq("order_id", orderId);
        const subIds = (subs || []).map((s: any) => s.id);
        if (subIds.length > 0) {
          await supabase.from("agreements").update({ start_date: newDate })
            .in("legacy_subscription_id", subIds);
        }
      } catch (e) { console.warn("shift agreements.start_date failed", e); }
    };

    const selectedJobs = newRouteJobIds
      .map((id) => unassigned.find((j: any) => j.id === id))
      .filter(Boolean) as any[];
    const mismatches = selectedJobs
      .map((job) => ({ job, currentStart: jobStartOf(job) }))
      .filter((x) => x.currentStart && x.currentStart !== newRouteDate) as
        Array<{ job: any; currentStart: string }>;

    const execute = async () => {
      // Flyt evt. opstartsdatoer FØR vi opretter ruten, så DB er konsistent.
      for (const m of mismatches) {
        try { await shiftStartOf(m.job.id, newRouteDate); } catch { /* logged */ }
      }
      await actuallyCreateRoute(selectedJobs);
    };

    if (mismatches.length > 0) {
      setPendingBulkStartDateChange({
        targetDate: newRouteDate,
        mismatches,
        execute,
      });
      return;
    }
    await actuallyCreateRoute(selectedJobs);
  };

  const actuallyCreateRoute = async (selectedJobs: any[]) => {
    if (!businessId) return;
    try {
      const created = await createRoute.mutateAsync({
        business_id: businessId,
        route_date: newRouteDate,
        name: newRouteName.trim() || null,
        color: newRouteColor,
      });
      // Læg de valgte aftaler på den nye rute (i den rækkefølge brugeren valgte).
      let seq = 0;
      for (const job of selectedJobs) {
        try {
          await addStop.mutateAsync({
            route_id: created.id,
            order_id: job.id,
            sequence: seq++,
            customer_name: job.customer_name,
            customer_phone: job.customer_phone,
            address: job.address || [job.zip_code, job.city].filter(Boolean).join(" "),
            latitude: job.latitude,
            longitude: job.longitude,
            service_summary: serviceSummaryForJob(job),
            duration_minutes: Number(job.estimated_duration_minutes) || 30,
            time_window_start: job.preferred_time_start || null,
            time_window_end: job.preferred_time_end || null,
          });
        } catch (err: any) {
          console.error("[CreateRoute] kunne ikke tilføje stop", err);
        }
      }
      toast.success(`Rute oprettet med ${selectedJobs.length} aftale${selectedJobs.length === 1 ? "" : "r"}`);
      setNewRouteName("");
      setNewRouteJobIds([]);
      setCreateOpen(false);
    } catch { /* toast handled in hook */ }
  };

  /* ─── Auto-fordel: opretter/finder ruter pr. kundens ønskede dato og lægger jobs der ─── */
  const handleAutoDistribute = async () => {
    if (!businessId) return;
    const jobsWithDate = unassigned
      .filter((j: any) => j.status !== "pending")
      .map((j: any) => ({ job: j, date: effectiveJobDate(j) }))
      .filter((x) => !!x.date) as { job: any; date: string }[];

    if (jobsWithDate.length === 0) {
      toast.info("Ingen godkendte aftaler med ønsket dato at fordele");
      return;
    }

    const byDate = new Map<string, any[]>();
    for (const { job, date: d } of jobsWithDate) {
      const arr = byDate.get(d) || [];
      arr.push(job);
      byDate.set(d, arr);
    }

    setDistributing(true);
    try {
      const allDates = Array.from(byDate.keys()).sort();
      const minDate = allDates[0];
      const maxDate = allDates[allDates.length - 1];
      const { data: existingRoutes } = await supabase
        .from("routes")
        .select("id, route_date, name")
        .eq("business_id", businessId)
        .gte("route_date", minDate)
        .lte("route_date", maxDate);

      let totalAssigned = 0;
      let routesCreated = 0;

      for (const [d, jobs] of byDate.entries()) {
        let routeId = (existingRoutes || []).find((r: any) => r.route_date === d)?.id || null;
        if (!routeId) {
          const created = await createRoute.mutateAsync({
            business_id: businessId,
            route_date: d,
            name: null,
          });
          routeId = created.id;
          routesCreated++;
        }

        const { data: stopsOnRoute } = await supabase
          .from("route_stops")
          .select("id")
          .eq("route_id", routeId);
        let seq = (stopsOnRoute || []).length;

        for (const job of jobs) {
          await addStop.mutateAsync({
            route_id: routeId,
            order_id: job.id,
            sequence: seq++,
            customer_name: job.customer_name,
            customer_phone: job.customer_phone,
            address: job.address || [job.zip_code, job.city].filter(Boolean).join(" "),
            latitude: job.latitude,
            longitude: job.longitude,
            service_summary: serviceSummaryForJob(job),
            duration_minutes: Number(job.estimated_duration_minutes) || 30,
            time_window_start: job.preferred_time_start || null,
            time_window_end: job.preferred_time_end || null,
          });
          totalAssigned++;
        }
      }

      toast.success(
        `${totalAssigned} aftaler fordelt på ${byDate.size} dage` +
        (routesCreated > 0 ? ` (${routesCreated} nye ruter oprettet)` : ""),
        { description: "Klik på en rute og 'Optimér' for bedste rækkefølge." },
      );
    } catch (e: any) {
      toastRouteError(e, toast.error, { titleFallback: "Kunne ikke auto-fordele aftaler" });
    } finally {
      setDistributing(false);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={routePlannerCollisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      onDragCancel={() => {
        // ESC eller pointer-loss midt i drag tæller som klik-fejl.
        dragMetrics.end(false);
        setActiveDragId(null);
        setActiveDragData(null);
        activeDragPointRef.current = null;
        activeDragOriginRef.current = null;
        setRouteDragPoint(null);
        activeRouteDragPointRef.current = null;
        activeRouteDragOriginRef.current = null;
        clearDragValidation();
      }}
    >
      <SEO
        title="Ruteplanlægger – Serviceydere"
        description="Planlæg og optimer dine medarbejderes ruter og stop på Serviceydere."
        noIndex
      />
      <AdminShell
        business={business}
        activeTab="routes"
        contentPadding={false}
        contentClassName="flex flex-col overflow-hidden"
        topbarRight={
          <div className="hidden 2xl:flex items-center gap-1.5 flex-wrap justify-end">
            {/* Hurtig periode-statistik — gør det øjeblikkeligt klart hvor
                meget arbejde der ligger i den viste måned/uge. */}
            {periodSummary.routeCount > 0 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="hidden md:inline-flex items-center gap-2 h-7 px-2.5 rounded-md bg-secondary/60 border border-border/60 text-[11px] tabular-nums">
                    <span className="font-semibold text-foreground">{periodSummary.routeCount}</span>
                    <span className="text-muted-foreground">{periodSummary.routeCount === 1 ? "rute" : "ruter"}</span>
                    <span className="text-border">·</span>
                    <span className="font-semibold text-foreground">{periodSummary.stopCount}</span>
                    <span className="text-muted-foreground">{periodSummary.stopCount === 1 ? "stop" : "stop"}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  Overblik for {view === "week" ? "den viste uge" : "den viste måned"}
                </TooltipContent>
              </Tooltip>
            )}

            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList className="h-7">
                <TabsTrigger value="month" className="text-xs h-5 px-2">Måned</TabsTrigger>
                <TabsTrigger value="week" className="text-xs h-5 px-2">Uge</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filtre — assignee og forekomst-status */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={filtersActive ? "default" : "outline"}
                  size="sm"
                  className="h-7 gap-1.5"
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filtre
                  {filtersActive && (
                    <Badge variant="secondary" className="h-4 px-1 text-[10px] tabular-nums">
                      {filterAssigneeIds.length + filterStatuses.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-semibold">Medarbejdere</Label>
                    {filterAssigneeIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterAssigneeIds([])}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Ryd
                      </button>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 rounded border p-1.5">
                    {activeEmployees.length === 0 && (
                      <p className="text-[11px] text-muted-foreground px-1.5 py-1">Ingen medarbejdere</p>
                    )}
                    {activeEmployees.map((emp: any) => {
                      const checked = filterAssigneeIds.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-secondary cursor-pointer text-xs"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              setFilterAssigneeIds((prev) =>
                                v ? [...prev, emp.id] : prev.filter((id) => id !== emp.id),
                              )
                            }
                          />
                          <FilterEmpAvatar emp={emp} />
                          <span className="truncate">{emp.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-xs font-semibold">Status</Label>
                    {filterStatuses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterStatuses([])}
                        className="text-[10px] text-muted-foreground hover:text-foreground"
                      >
                        Ryd
                      </button>
                    )}
                  </div>
                  <div className="space-y-1 rounded border p-1.5">
                    {STATUS_OPTIONS.map((opt) => {
                      const checked = filterStatuses.includes(opt.value);
                      return (
                        <label
                          key={opt.value}
                          className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-secondary cursor-pointer text-xs"
                        >
                          <Checkbox
                            checked={checked}
                            onCheckedChange={(v) =>
                              setFilterStatuses((prev) =>
                                v ? [...prev, opt.value] : prev.filter((s) => s !== opt.value),
                              )
                            }
                          />
                          <span>{opt.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>

                {filtersActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full h-7 text-xs"
                    onClick={() => { setFilterAssigneeIds([]); setFilterStatuses([]); }}
                  >
                    Nulstil alle filtre
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  setDate(format(view === "week" ? addWeeks(parseISO(date), -1) : addMonths(parseISO(date), -1), "yyyy-MM-dd"))
                }
                aria-label={view === "week" ? "Forrige uge" : "Forrige måned"}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <span className="text-xs font-medium capitalize min-w-[110px] text-center tabular-nums">
                {view === "week"
                  ? `Uge ${format(parseISO(date), "I", { locale: da })} · ${format(parseISO(date), "MMM yyyy", { locale: da })}`
                  : format(parseISO(date), "MMMM yyyy", { locale: da })}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  setDate(format(view === "week" ? addWeeks(parseISO(date), 1) : addMonths(parseISO(date), 1), "yyyy-MM-dd"))
                }
                aria-label={view === "week" ? "Næste uge" : "Næste måned"}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button data-tour="routes-today" variant="outline" size="sm" className="h-7" onClick={() => setDate(todayStr())}>I dag</Button>
            </div>

            <PlanningPanel
              businessId={businessId}
              anchorDate={date}
              stops={calendarStops as any}
              routes={calendarRoutesRaw as any}
              employees={activeEmployees as any}
              filterAssigneeIds={filterAssigneeIds}
              onFilterAssigneeIds={setFilterAssigneeIds}
              unassignedCount={unassigned.length}
            />

            <div className="flex items-center gap-1.5">
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button data-tour="routes-create-button" size="sm" className="h-7 gap-1">
                    <Plus className="h-3.5 w-3.5" />Opret rute
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md p-0 gap-0 overflow-hidden flex flex-col">
                  <DialogHeader className="px-4 sm:px-5 py-4 pr-12 border-b shrink-0 space-y-0 text-left">
                    <SheetHeaderBlock
                      icon={<RouteIcon className="h-4 w-4" />}
                      accent={newRouteColor}
                      title={<DialogTitle className="text-base">Opret ny rute</DialogTitle>}
                      description={
                        <DialogDescription className="text-xs leading-snug">
                          Ruten starter fra virksomhedens adresse. Du kan tilkoble medarbejdere og aftaler bagefter.
                        </DialogDescription>
                      }
                    />
                  </DialogHeader>

                  <div className="px-3 sm:px-5 py-3 space-y-2.5 bg-secondary/20 overflow-y-auto">
                    <Section icon={<Tag className="h-3.5 w-3.5" />} title="Detaljer">
                      <div className="space-y-2.5">
                        <Field label="Navn (valgfrit)">
                          <Input
                            id="route-name"
                            placeholder="fx Nord, Aarhus C, Mandag-team..."
                            value={newRouteName}
                            onChange={(e) => setNewRouteName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleCreateRoute(); }}
                            className="h-9"
                            autoFocus
                          />
                        </Field>
                        <Field label="Dato" required>
                          <DatePickerField value={newRouteDate} onChange={setNewRouteDate} />
                        </Field>
                      </div>
                    </Section>

                    <Section
                      icon={<Palette className="h-3.5 w-3.5" />}
                      title="Farve"
                      hint={ROUTE_COLORS.find((c) => c.value === newRouteColor)?.name || "Brugerdefineret"}
                    >
                      <div className="grid grid-cols-12 gap-1.5">
                        {ROUTE_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setNewRouteColor(c.value)}
                            title={c.name}
                            className={`relative aspect-square rounded transition-all hover:scale-110 ring-offset-1 ring-offset-background ${newRouteColor === c.value ? "ring-2 ring-foreground shadow-sm" : "hover:ring-1 hover:ring-foreground/30"}`}
                            style={{ background: c.value }}
                            aria-label={`Vælg farve ${c.name}`}
                          />
                        ))}
                      </div>
                    </Section>

                    <Section
                      icon={<ListChecks className="h-3.5 w-3.5" />}
                      title="Aftaler på ruten"
                      hint={`${newRouteJobIds.length} valgt`}
                    >
                      <p className="text-[11px] text-muted-foreground mb-2">
                        Vælg mindst én aftale fra aftalepoolen — ruter kan ikke oprettes uden aftaler.
                      </p>
                      <div className="relative mb-2">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          placeholder="Søg kunde eller adresse..."
                          value={newRouteJobSearch}
                          onChange={(e) => setNewRouteJobSearch(e.target.value)}
                          className="h-9 pl-6 text-sm"
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto rounded border divide-y bg-background">
                        {unassigned.length === 0 && (
                          <div className="p-4 text-center text-xs text-muted-foreground">
                            Ingen aftaler i poolen. Opret en bestilling først.
                          </div>
                        )}
                        {unassigned
                          .filter((j: any) => j.status !== "pending")
                          .filter((j: any) => {
                            const q = newRouteJobSearch.trim().toLowerCase();
                            if (!q) return true;
                            return (
                              j.customer_name?.toLowerCase().includes(q) ||
                              j.address?.toLowerCase().includes(q) ||
                              j.city?.toLowerCase().includes(q)
                            );
                          })
                          .slice(0, 50)
                          .map((j: any) => {
                            const checked = newRouteJobIds.includes(j.id);
                            const jStart = (j.preferred_date || j.next_service_date || "").slice(0, 10);
                            const mismatch = jStart && jStart !== newRouteDate;
                            return (
                              <label
                                key={j.id}
                                className={cn(
                                  "flex items-start gap-2 p-2 cursor-pointer hover:bg-secondary/50 text-xs",
                                  checked && "bg-accent/5",
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) =>
                                    setNewRouteJobIds((prev) =>
                                      v ? [...prev, j.id] : prev.filter((x) => x !== j.id),
                                    )
                                  }
                                  className="mt-0.5"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="font-medium truncate">{j.customer_name}</p>
                                  <p className="text-[10px] text-muted-foreground truncate">
                                    {serviceSummaryForJob(j)}
                                  </p>
                                  {(j.address || j.city) && (
                                    <p className="text-[10px] text-muted-foreground truncate">
                                      {[j.address, [j.zip_code, j.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")}
                                    </p>
                                  )}
                                  {checked && mismatch && (
                                    <p
                                      className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 truncate"
                                      title="Aftalens opstartsdato matcher ikke rutens dato — du vil blive bedt om at flytte den."
                                    >
                                      ⚠ Opstart {format(parseISO(jStart), "d. MMM", { locale: da })} — flyttes ved oprettelse
                                    </p>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                      </div>
                    </Section>
                  </div>

                  <SheetFooterBar>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                      <Button variant="outline" className="sm:w-auto" onClick={() => setCreateOpen(false)} disabled={createRoute.isPending}>
                        Annullér
                      </Button>
                      <Button
                        className="sm:w-auto"
                        onClick={handleCreateRoute}
                        disabled={createRoute.isPending || newRouteJobIds.length === 0}
                      >
                        {createRoute.isPending && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
                        Opret rute{newRouteJobIds.length > 0 ? ` med ${newRouteJobIds.length} aftale${newRouteJobIds.length === 1 ? "" : "r"}` : ""}
                      </Button>
                    </div>
                  </SheetFooterBar>
                </DialogContent>
              </Dialog>

              <Button
                data-tour="routes-create-order"
                variant="default"
                size="sm"
                className="h-7"
                onClick={() => setCreateOrderOpen(true)}
              >
                <ShoppingBag className="h-3.5 w-3.5 mr-1" />Opret bestilling
              </Button>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Tastatur-genveje">
                    <Keyboard className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  <div className="space-y-1">
                    <p className="font-semibold mb-1">Tastatur-genveje</p>
                    <p><kbd className="px-1 rounded bg-secondary text-[10px]">←</kbd> <kbd className="px-1 rounded bg-secondary text-[10px]">→</kbd> Skift {view === "week" ? "uge" : "måned"}</p>
                    <p><kbd className="px-1 rounded bg-secondary text-[10px]">T</kbd> I dag</p>
                    <p><kbd className="px-1 rounded bg-secondary text-[10px]">N</kbd> Ny rute</p>
                    <p><kbd className="px-1 rounded bg-secondary text-[10px]">{navigator.platform.toLowerCase().includes("mac") ? "⌘" : "Ctrl"}+Z</kbd> Fortryd</p>
                    <p><kbd className="px-1 rounded bg-secondary text-[10px]">{navigator.platform.toLowerCase().includes("mac") ? "⌘⇧" : "Ctrl+Shift"}+Z</kbd> Gentag</p>
                    <p><kbd className="px-1 rounded bg-secondary text-[10px]">Esc</kbd> Luk panel</p>
                  </div>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => void history.undo()}
                    disabled={!history.canUndo}
                    aria-label="Fortryd seneste handling"
                  >
                    {history.isUndoing
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Undo2 className="h-3.5 w-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {history.canUndo
                    ? <>Fortryd: <span className="font-medium">{history.lastLabel}</span></>
                    : "Intet at fortryde"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={() => void history.redo()}
                    disabled={!history.canRedo}
                    aria-label="Gentag seneste fortryd"
                  >
                    <Redo2 className="h-3.5 w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="bottom" className="text-xs">
                  {history.canRedo
                    ? <>Gentag: <span className="font-medium">{history.nextRedoLabel}</span></>
                    : "Intet at gentage"}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        }
      >
        {(() => {
          // Sidebar: Aftaler uden rute — genbruges i lg+ ResizablePanel og i
          // mobil/tablet Sheet-drawer, så drag-and-drop fungerer på alle enheder.
          const unassignedCard = (
                <Card data-tour="routes-unassigned" className="flex flex-col h-full overflow-hidden">
                  <div className="p-3 border-b bg-secondary/30 space-y-2">
                    {/* pr-10 reserverer plads til Sheet's luk-knap (right-4 top-4) på
                        alle viewports hvor kortet vises i en Sheet. ResizablePanel-
                        layoutet kommer først ved xl+ — så vi fjerner først pr-10 dér. */}
                    <div className="flex items-center gap-2 pr-10 xl:pr-0">
                      <h2 className="min-w-0 font-semibold text-sm flex items-center gap-1.5 leading-tight">
                        <Inbox className="h-4 w-4 text-primary" />
                        <span className="truncate">Aftaler uden rute</span>
                      </h2>
                      <Badge variant="secondary" className="shrink-0 tabular-nums">
                        {filteredUnassigned.length}
                      </Badge>
                    </div>
                    <p className="text-[10px] text-muted-foreground leading-snug">
                      Træk en aftale ind i kalenderen for at planlægge den. Når en aftale med interval markeres som udført, opretter vi automatisk næste aftale på samme rute og medarbejder.
                    </p>
                    {filteredUnassigned.length > 0 && (
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        Total værdi: <span className="font-semibold text-foreground">{Math.round(unassignedTotal).toLocaleString("da-DK")} kr</span>
                      </p>
                    )}
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Søg navn eller adresse..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="h-7 pl-7 pr-7 text-xs"
                      />
                      {search && (
                        <button
                          type="button"
                          onClick={() => setSearch("")}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-4 w-4 flex items-center justify-center rounded hover:bg-secondary text-muted-foreground"
                          aria-label="Ryd søgning"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <ArrowUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
                      <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                        <SelectTrigger className="h-6 text-[11px] flex-1">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="date" className="text-xs">Sortér efter dato</SelectItem>
                          <SelectItem value="price" className="text-xs">Højeste pris først</SelectItem>
                          <SelectItem value="name" className="text-xs">Navn (A-Å)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    {geocoding && (
                      <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />Finder GPS-koordinater...
                      </p>
                    )}
                  </div>

                  <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                    {loadingUnassigned && unassigned.length === 0 && (
                      <div className="space-y-1.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <div
                            key={i}
                            className="rounded-md border border-border/60 bg-card p-2 space-y-1.5"
                          >
                            <div className="flex items-center gap-2">
                              <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                              <div className="ml-auto h-3 w-12 rounded bg-muted animate-pulse" />
                            </div>
                            <div className="h-2.5 w-3/4 rounded bg-muted/70 animate-pulse" />
                            <div className="h-2.5 w-2/3 rounded bg-muted/60 animate-pulse" />
                          </div>
                        ))}
                      </div>
                    )}
                    {!loadingUnassigned && filteredUnassigned.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                          <Inbox className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                          {search
                            ? "Ingen aftaler matcher søgningen"
                            : calendarRoutesRaw.length === 0
                              ? "Træk en aftale ind på en dag i kalenderen — så opretter vi automatisk en rute for dig"
                              : "Alle aftaler er planlagt 🎉"}
                        </p>
                        {search && (
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setSearch("")}>
                            Ryd søgning
                          </Button>
                        )}
                      </div>
                    )}
                    {filteredUnassigned.map((job: any) => (
                      <UnassignedJobCard
                        key={job.id}
                        job={job}
                        onClick={() => setSelectedJob(job)}
                      />
                    ))}
                  </div>
                </Card>
          );

          const calendarBlock = (
                <div data-tour="routes-calendar" className="h-full flex flex-col">
                {projectionDiagnostics.unprojectable.length > 0 && (
                  <Alert
                    variant="destructive"
                    className="m-2 mb-0 shrink-0 cursor-pointer hover:opacity-90"
                    role="button"
                    tabIndex={0}
                    onClick={() => setDiagnosticsOpen(true)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setDiagnosticsOpen(true); }}
                  >
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>
                      {projectionDiagnostics.unprojectable.length === 1
                        ? "1 aftale kan ikke vises i kalenderen"
                        : `${projectionDiagnostics.unprojectable.length} aftaler kan ikke vises i kalenderen`}
                    </AlertTitle>
                    <AlertDescription className="text-xs">
                      Klik for at se hvilke aftaler det drejer sig om og rette dem.
                    </AlertDescription>
                  </Alert>
                )}
                <div className="flex-1 min-h-0">
                <MonthWeekCalendar
                  view={view}
                  anchorDate={date}
                  routes={calendarRoutesAll}
                  onSelectRoute={handleCalendarSelectRoute}
                  onSelectStop={handleCalendarSelectStop}
                  onCreateRoute={handleCalendarCreateRoute}
                  onOptimizeRoute={handleCalendarOptimizeRoute}
                  optimizingRouteId={optimizingRouteId}
                  draggingType={draggingTypeForCalendar}
                  draggingRouteId={activeDragData?.type === "route" ? (activeDragData.route?.id ?? null) : null}
                  weatherByDate={weatherByDate}
                  loadingRoutes={loadingCalendarRoutes || loadingCalendarStops}
                  loadingWeather={loadingWeather}
                  weatherError={weatherError}
                  busyTargets={busyTargets}
                />
                </div>
                </div>
          );

          const mobileCalendarBlock = (
            <div data-tour="routes-calendar" className="h-full flex flex-col">
              {projectionDiagnostics.unprojectable.length > 0 && (
                <Alert
                  variant="destructive"
                  className="m-2 mb-0 shrink-0 cursor-pointer hover:opacity-90"
                  role="button"
                  tabIndex={0}
                  onClick={() => setDiagnosticsOpen(true)}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setDiagnosticsOpen(true); }}
                >
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle className="text-sm">
                    {projectionDiagnostics.unprojectable.length === 1
                      ? "1 aftale kan ikke vises"
                      : `${projectionDiagnostics.unprojectable.length} aftaler kan ikke vises`}
                  </AlertTitle>
                  <AlertDescription className="text-xs">
                    Tryk for at åbne diagnostik og rette aftalerne.
                  </AlertDescription>
                </Alert>
              )}
              <div className="flex-1 min-h-0">
                <AgendaCalendar
                  view={view}
                  anchorDate={date}
                  routes={calendarRoutesAll}
                  onSelectRoute={handleCalendarSelectRoute}
                  onSelectStop={handleCalendarSelectStop}
                  onCreateRoute={handleCalendarCreateRoute}
                  onOptimizeRoute={handleCalendarOptimizeRoute}
                  optimizingRouteId={optimizingRouteId}
                  draggingType={draggingTypeForCalendar}
                  draggingRouteId={activeDragData?.type === "route" ? (activeDragData.route?.id ?? null) : null}
                  weatherByDate={weatherByDate}
                  loadingRoutes={loadingCalendarRoutes || loadingCalendarStops}
                  loadingWeather={loadingWeather}
                  weatherError={weatherError}
                  busyTargets={busyTargets}
                />
              </div>
            </div>
          );

          return (
            <div className="flex-1 overflow-hidden p-2 sm:p-3" style={{ height: "calc(100vh - 56px)" }}>
              {/* Desktop (lg+): resizable side-by-side med aftalepool venstre + kalender højre.
                  Topbaren har ikke plads til alle handlinger før 2xl, så vi viser en kompakt
                  toolbar oven på split-layoutet ved lg/xl. */}
              <div className="hidden h-full xl:flex xl:flex-col xl:gap-2">
                <div className="shrink-0 rounded-lg border bg-card p-2 shadow-sm 2xl:hidden">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() =>
                        setDate(format(view === "week" ? addWeeks(parseISO(date), -1) : addMonths(parseISO(date), -1), "yyyy-MM-dd"))
                      }
                      aria-label={view === "week" ? "Forrige uge" : "Forrige måned"}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-xs font-medium capitalize min-w-[140px] text-center tabular-nums">
                      {view === "week"
                        ? `Uge ${format(parseISO(date), "I", { locale: da })} · ${format(parseISO(date), "MMM yyyy", { locale: da })}`
                        : format(parseISO(date), "MMMM yyyy", { locale: da })}
                    </span>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() =>
                        setDate(format(view === "week" ? addWeeks(parseISO(date), 1) : addMonths(parseISO(date), 1), "yyyy-MM-dd"))
                      }
                      aria-label={view === "week" ? "Næste uge" : "Næste måned"}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs" onClick={() => setDate(todayStr())}>
                      I dag
                    </Button>
                    <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                      <TabsList className="h-8">
                        <TabsTrigger value="month" className="h-6 text-xs px-2">Måned</TabsTrigger>
                        <TabsTrigger value="week" className="h-6 text-xs px-2">Uge</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button variant={filtersActive ? "default" : "outline"} size="sm" className="h-8 gap-1.5 text-xs">
                          <Filter className="h-3.5 w-3.5" />
                          Filtre
                          {filtersActive && (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px] tabular-nums">
                              {filterAssigneeIds.length + filterStatuses.length}
                            </Badge>
                          )}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-72 p-3 space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <Label className="text-xs font-semibold">Medarbejdere</Label>
                            {filterAssigneeIds.length > 0 && (
                              <button type="button" onClick={() => setFilterAssigneeIds([])} className="text-[10px] text-muted-foreground hover:text-foreground">Ryd</button>
                            )}
                          </div>
                          <div className="max-h-48 overflow-y-auto space-y-1 rounded border p-1.5">
                            {activeEmployees.length === 0 && <p className="text-[11px] text-muted-foreground px-1.5 py-1">Ingen medarbejdere</p>}
                            {activeEmployees.map((emp: any) => {
                              const checked = filterAssigneeIds.includes(emp.id);
                              return (
                                <label key={emp.id} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-secondary cursor-pointer text-xs">
                                  <Checkbox checked={checked} onCheckedChange={(v) => setFilterAssigneeIds((prev) => v ? [...prev, emp.id] : prev.filter((id) => id !== emp.id))} />
                                  <FilterEmpAvatar emp={emp} />
                                  <span className="truncate">{emp.name}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <Label className="text-xs font-semibold">Status</Label>
                            {filterStatuses.length > 0 && (
                              <button type="button" onClick={() => setFilterStatuses([])} className="text-[10px] text-muted-foreground hover:text-foreground">Ryd</button>
                            )}
                          </div>
                          <div className="space-y-1 rounded border p-1.5">
                            {STATUS_OPTIONS.map((opt) => {
                              const checked = filterStatuses.includes(opt.value);
                              return (
                                <label key={opt.value} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-secondary cursor-pointer text-xs">
                                  <Checkbox checked={checked} onCheckedChange={(v) => setFilterStatuses((prev) => v ? [...prev, opt.value] : prev.filter((s) => s !== opt.value))} />
                                  <span>{opt.label}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                        {filtersActive && (
                          <Button variant="ghost" size="sm" className="w-full h-7 text-xs" onClick={() => { setFilterAssigneeIds([]); setFilterStatuses([]); }}>
                            Nulstil alle filtre
                          </Button>
                        )}
                      </PopoverContent>
                    </Popover>
                    <div className="ml-auto flex items-center gap-1.5">
                      <PlanningPanel
                        businessId={businessId}
                        anchorDate={date}
                        stops={calendarStops as any}
                        routes={calendarRoutesRaw as any}
                        employees={activeEmployees as any}
                        filterAssigneeIds={filterAssigneeIds}
                        onFilterAssigneeIds={setFilterAssigneeIds}
                        unassignedCount={unassigned.length}
                      />
                      <Button data-tour="routes-create-button" size="sm" className="h-8 gap-1 text-xs" onClick={() => setCreateOpen(true)}>
                        <Plus className="h-3.5 w-3.5" /> Opret rute
                      </Button>
                      <Button variant="outline" size="sm" className="h-8 gap-1 text-xs" onClick={() => setCreateOrderOpen(true)}>
                        <ShoppingBag className="h-3.5 w-3.5" /> Bestilling
                      </Button>
                    </div>
                  </div>
                </div>
                <div className="flex-1 min-h-0">
                  <ResizablePanelGroup
                    direction="horizontal"
                    className="h-full rounded-lg"
                    autoSaveId="route-planner:unassigned-split"
                  >
                    <ResizablePanel id="unassigned" order={1} defaultSize={22} minSize={16} maxSize={36} className="overflow-hidden">
                      {unassignedCard}
                    </ResizablePanel>
                    <ResizableHandle withHandle className="bg-transparent w-2 hover:bg-primary/20 transition-colors" />
                    <ResizablePanel id="calendar" order={2} defaultSize={78} className="overflow-hidden">
                      {calendarBlock}
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </div>
              </div>

              {/* Mobil/tablet/narrow desktop (<xl): dedikeret toolbar + agenda-kalender fuld bredde.
                  Vi har bumpet breakpointet fra lg→xl så 1024–1279px viewports ikke længere
                  presses ind i et 7-kolonners grid hvor hver dagcelle bliver < 120px. */}
              <div className="flex h-full flex-col gap-2 xl:hidden">
                <div className="shrink-0 space-y-2 rounded-lg border bg-card p-2 shadow-sm">
                  <div className="flex items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() =>
                        setDate(format(view === "week" ? addWeeks(parseISO(date), -1) : addMonths(parseISO(date), -1), "yyyy-MM-dd"))
                      }
                      aria-label={view === "week" ? "Forrige uge" : "Forrige måned"}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <div className="min-w-0 flex-1 text-center">
                      <p className="truncate text-sm font-semibold capitalize tabular-nums text-foreground">
                        {view === "week"
                          ? `Uge ${format(parseISO(date), "I", { locale: da })} · ${format(parseISO(date), "MMM yyyy", { locale: da })}`
                          : format(parseISO(date), "MMMM yyyy", { locale: da })}
                      </p>
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        {periodSummary.routeCount} {periodSummary.routeCount === 1 ? "rute" : "ruter"} · {periodSummary.stopCount} stop
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 shrink-0"
                      onClick={() =>
                        setDate(format(view === "week" ? addWeeks(parseISO(date), 1) : addMonths(parseISO(date), 1), "yyyy-MM-dd"))
                      }
                      aria-label={view === "week" ? "Næste uge" : "Næste måned"}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-[1fr_auto_auto] items-center gap-1.5">
                    <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                      <TabsList className="grid h-9 w-full grid-cols-2">
                        <TabsTrigger value="month" className="h-7 text-xs">Måned</TabsTrigger>
                        <TabsTrigger value="week" className="h-7 text-xs">Uge</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Sheet>
                      <SheetTrigger asChild>
                        <Button
                          variant={filtersActive ? "default" : "outline"}
                          size="sm"
                          className="h-9 shrink-0 gap-1.5 px-3 text-xs"
                          aria-label="Filtre"
                        >
                          <Filter className="h-4 w-4" />
                          Filtre
                          {filtersActive && (
                            <Badge variant="secondary" className="h-4 px-1 text-[10px] tabular-nums">
                              {filterAssigneeIds.length + filterStatuses.length}
                            </Badge>
                          )}
                        </Button>
                      </SheetTrigger>
                      <SheetContent side="bottom" className="h-[74dvh] max-h-[74dvh] rounded-t-2xl p-0 flex flex-col">
                        <div className="shrink-0 border-b px-4 py-3 pr-12">
                          <p className="text-sm font-semibold text-foreground">Filtrér ruter</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">Vælg medarbejdere eller statusser — kalenderen opdateres med det samme.</p>
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-4 px-4 py-4">
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-xs font-semibold">Medarbejdere</Label>
                              {filterAssigneeIds.length > 0 && (
                                <button type="button" onClick={() => setFilterAssigneeIds([])} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                                  Ryd medarbejdere
                                </button>
                              )}
                            </div>
                            <div className="grid gap-2">
                              {activeEmployees.length === 0 && <p className="rounded-lg border bg-card px-3 py-2 text-xs text-muted-foreground">Ingen medarbejdere</p>}
                              {activeEmployees.map((emp: any) => {
                                const checked = filterAssigneeIds.includes(emp.id);
                                return (
                                  <label
                                    key={emp.id}
                                    className={cn(
                                      "flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2 text-sm transition-colors",
                                      checked ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground",
                                    )}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(v) =>
                                        setFilterAssigneeIds((prev) =>
                                          v ? [...prev, emp.id] : prev.filter((id) => id !== emp.id),
                                        )
                                      }
                                      className={checked ? "border-background data-[state=checked]:bg-background data-[state=checked]:text-foreground" : undefined}
                                    />
                                    <FilterEmpAvatar emp={emp} />
                                    <span className="truncate font-medium">{emp.name}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center justify-between mb-2">
                              <Label className="text-xs font-semibold">Status</Label>
                              {filterStatuses.length > 0 && (
                                <button type="button" onClick={() => setFilterStatuses([])} className="text-xs font-medium text-muted-foreground hover:text-foreground">
                                  Ryd status
                                </button>
                              )}
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              {STATUS_OPTIONS.map((opt) => {
                                const checked = filterStatuses.includes(opt.value);
                                return (
                                  <label
                                    key={opt.value}
                                    className={cn(
                                      "flex min-h-10 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium transition-colors",
                                      checked ? "border-foreground bg-foreground text-background" : "border-border bg-card text-foreground",
                                    )}
                                  >
                                    <Checkbox
                                      checked={checked}
                                      onCheckedChange={(v) =>
                                        setFilterStatuses((prev) =>
                                          v ? [...prev, opt.value] : prev.filter((s) => s !== opt.value),
                                        )
                                      }
                                      className={checked ? "border-background data-[state=checked]:bg-background data-[state=checked]:text-foreground" : undefined}
                                    />
                                    <span>{opt.label}</span>
                                  </label>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                        <div className="shrink-0 border-t bg-card px-4 py-3">
                          <Button
                            variant={filtersActive ? "outline" : "default"}
                            size="sm"
                            className="h-9 w-full text-xs"
                            onClick={() => { setFilterAssigneeIds([]); setFilterStatuses([]); }}
                            disabled={!filtersActive}
                          >
                            Nulstil alle filtre
                          </Button>
                        </div>
                      </SheetContent>
                    </Sheet>
                    <Button variant="outline" size="sm" className="h-9 px-3 text-xs" onClick={() => setDate(todayStr())}>
                      I dag
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <Button className="h-9 gap-1.5 text-xs" onClick={() => setCreateOpen(true)}>
                      <Plus className="h-4 w-4" />
                      Opret rute
                    </Button>
                    <Button variant="outline" className="h-9 gap-1.5 text-xs" onClick={() => setCreateOrderOpen(true)}>
                      <ShoppingBag className="h-4 w-4" />
                      Bestilling
                    </Button>
                  </div>

                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="outline" size="sm" className="h-9 w-full justify-between">
                        <span className="inline-flex items-center gap-2">
                          <Inbox className="h-4 w-4" />
                          Aftaler uden rute
                        </span>
                        <Badge variant="secondary" className="tabular-nums">{filteredUnassigned.length}</Badge>
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[88vw] max-w-sm p-0 flex flex-col">
                      <div className="flex flex-1 min-h-0 items-center justify-center p-6">
                        <div className="max-w-xs text-center">
                          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                            <Monitor className="h-6 w-6 text-foreground" />
                          </div>
                          <h3 className="mb-1.5 text-base font-semibold">Kun på computer</h3>
                          <p className="text-sm text-muted-foreground">
                            Planlægning af aftaler uden rute kræver en større skærm. Åbn siden på en computer for at trække aftaler ind på ruter.
                          </p>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                </div>
                <div className="flex-1 min-h-0">
                  {mobileCalendarBlock}
                </div>
              </div>
            </div>
          );
        })()}

        {/* Manuel ordre-oprettelse — kunde modtager mail med godkendelseslink */}
        {businessId && (
          <CreateManualOrderDialog
            open={createOrderOpen}
            onOpenChange={setCreateOrderOpen}
            businessId={businessId}
            businessName={business?.name || ""}
          />
        )}

        {/* Slet rute bekræftelse — viser konsekvens for tilknyttede aftaler */}
        <DeleteRouteDialog
          route={routeToDelete}
          onOpenChange={(o) => !o && setRouteToDelete(null)}
          pending={deleteRoute.isPending}
          onConfirm={async () => {
            if (!routeToDelete) return;
            const name = routeToDelete.name;
            const routeId = routeToDelete.id;
            try {
              const res = await deleteRoute.mutateAsync(routeId);
              setRouteToDelete(null);
              if ((res as any)?.soft) {
                // Soft-delete (archived_at). Kan fortrydes ved at nulstille archived_at.
                pushRouteUndo({
                  label: `Slet rute: ${name}`,
                  undo: async () => {
                    const { error } = await supabase
                      .from("routes")
                      .update({ archived_at: null })
                      .eq("id", routeId);
                    if (error) {
                      toast.error("Kunne ikke fortryde sletning");
                      return;
                    }
                    await qc.invalidateQueries({ queryKey: ["routes"] });
                    await qc.invalidateQueries({ queryKey: ["routes-range"] });
                    toast.success(`${name} gendannet`);
                  },
                });
                toast.success(`${name} slettet — Cmd+Z for at fortryde`);
              } else {
                toast.success(`${name} slettet`);
              }
            } catch {
              /* useDeleteRoute har allerede vist fejl-toast */
            }
          }}
        />

        {/* L3: Diagnostik for ikke-projicérbare aftaler — per-aftale fix-knapper */}
        <DiagnosticsDialog
          open={diagnosticsOpen}
          onOpenChange={setDiagnosticsOpen}
          items={projectionDiagnostics.unprojectable}
        />

        {/* Bekræft fletning af to ruter (drag-and-drop rute → rute) */}
        <MergeRoutesDialog
          open={!!pendingRouteMerge}
          onOpenChange={(o) => { if (!o && !mergingRoute) setPendingRouteMerge(null); }}
          sourceName={pendingRouteMerge?.source.name || "Rute uden navn"}
          targetName={pendingRouteMerge?.target.name || "Målrute"}
          sourceDate={pendingRouteMerge?.source.route_date || ""}
          targetDate={pendingRouteMerge?.target.route_date || ""}
          recurringAppointmentCount={pendingMergeSeriesInfo?.recurringAppointmentCount ?? 0}
          loading={mergingRoute}
          onConfirm={(scope) => handleConfirmRouteMerge(scope)}
        />

        {createPortal(
        <DragOverlay
          dropAnimation={{ duration: 180, easing: "cubic-bezier(0.18, 0.67, 0.6, 1)" }}
        >
          {activeDragId && activeDragData?.type === "job" && (
            <div
              className="rounded-md border border-accent/70 bg-card px-2 py-1 shadow-xl w-[140px] cursor-grabbing"
              style={{ transform: "rotate(-2deg)" }}
            >
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-[11px] font-semibold truncate">{activeDragData.job.customer_name}</p>
                <span className="text-[9px] font-bold text-accent shrink-0 tabular-nums">
                  {Math.round(Number(activeDragData.job.total_amount || 0))} kr
                </span>
              </div>
            </div>
          )}
          {activeDragId && activeDragData?.type === "stop" && (
            <div
              className="rounded-md border bg-background px-2 py-1 shadow-xl w-[160px] opacity-95 border-l-[3px] border-l-primary"
              style={{ transform: "rotate(-1.5deg)" }}
            >
              <p className="text-[11px] font-semibold truncate">{activeDragData.stop.customer_name}</p>
              <p className="text-[9px] text-muted-foreground leading-tight">
                {activeDragData.stop.duration_minutes} min
              </p>
            </div>
          )}
        </DragOverlay>,
        document.body)}

        {activeDragId && activeDragData?.type === "route" && routeDragPoint && createPortal(
          <div
            ref={routeOverlayRef}
            className="fixed z-[1000] w-[160px] pointer-events-none rounded-md border-l-[3px] border bg-card px-2 py-1 shadow-xl"
            style={{
              left: routeDragPoint.x,
              top: routeDragPoint.y,
              transform: "translate(-50%, -50%) rotate(-2deg)",
              borderLeftColor: activeDragData.route?.color || "hsl(var(--accent))",
            }}
          >
            <p className="text-[11px] font-semibold truncate">
              {activeDragData.route?.name || "Rute"}
            </p>
          </div>,
          document.body,
        )}

        <StopDetailSheet
          readOnly={
            !!selectedStopId && (
              selectedStopId.startsWith("virtual-stop:")
              || !!(
                editingProjectedContext
                && activeEditingRoute
                && editingProjectedContext.baseRouteId === activeEditingRoute.id
              )
            )
          }
          stop={(() => {
            if (!selectedStopId) return null;
            // Almindelige stops fra det aktuelle kalender-vindue.
            const direct = calendarStops.find((s) => s.id === selectedStopId);
            if (direct) return direct;
            // Klik på et stop i en projiceret rute — det reelle stop-id
            // ligger på basisruten og findes derfor ikke nødvendigvis i
            // calendarStops (basisruten kan være uden for kalender-vinduet).
            // Slå altid op i recurring-base-routes som fallback, og håndtér
            // også det legacy `virtual-stop:`-præfiks fra ældre kald.
            const realId = selectedStopId.startsWith("virtual-stop:")
              ? selectedStopId.split(":").pop()
              : selectedStopId;
            if (realId) {
              for (const r of (recurringBaseRoutes as any[])) {
                const hit = (r.stops || []).find((s: any) => s.id === realId);
                if (hit) return hit;
              }
            }
            return null;
          })()}
          open={!!selectedStopId}
          onOpenChange={(o) => !o && setSelectedStopId(null)}
          effectiveDate={(() => {
            // Projicerede klik: brug forekomstens dato fra editingProjectedContext.
            if (editingProjectedContext?.projectedDate) {
              return editingProjectedContext.projectedDate;
            }
            // Ellers: brug datoen for stoppets rute så "Næste besøg" beregnes
            // ud fra præcis den forekomst brugeren kigger på.
            if (!selectedStopId) return null;
            const direct = calendarStops.find((s) => s.id === selectedStopId);
            const rid = direct?.route_id;
            if (rid) {
              const r = calendarRoutesRaw.find((x) => x.id === rid);
              if (r?.route_date) return String(r.route_date).slice(0, 10);
            }
            return null;
          })()}
        />

        {/* Klik på en aftale i aftalepoolen åbner samme detalje-sheet i read-only */}
        <StopDetailSheet
          readOnly
          stop={
            selectedJob
              ? ({
                  id: `job-${selectedJob.id}`,
                  route_id: "",
                  order_id: selectedJob.id,
                  subscription_id: null,
                  sequence: 0,
                  status: "pending",
                  customer_name: selectedJob.customer_name,
                  customer_phone: selectedJob.customer_phone,
                  address: [
                    selectedJob.address,
                    [selectedJob.zip_code, selectedJob.city].filter(Boolean).join(" "),
                  ].filter(Boolean).join(", "),
                  latitude: selectedJob.latitude,
                  longitude: selectedJob.longitude,
                  duration_minutes: Number(selectedJob.estimated_duration_minutes) || 30,
                  time_window_start: selectedJob.preferred_time_start,
                  time_window_end: selectedJob.preferred_time_end,
                  notes: selectedJob.notes,
                  service_summary: null,
                  planned_arrival: null,
                  planned_departure: null,
                  distance_to_next_km: null,
                  travel_time_to_next_min: null,
                  required_staff: 1,
                  assigned_employee_id: null,
                  completed_at: null,
                  photo_urls: [],
                  created_at: "",
                  updated_at: "",
                } as any)
              : null
          }
          open={!!selectedJob}
          onOpenChange={(o) => !o && setSelectedJob(null)}
        />

        {(() => {
          // Stops for den aktive rute. Når sheet'et er åbnet via en projiceret
          // forekomst, filtrerer vi til kun de aftaler der reelt rammer den
          // dato (matcher mod projected-rutens sourceKeys). Ellers vises alle.
          const projectionActive = !!(
            editingProjectedContext
            && activeEditingRoute
            && (
              editingProjectedContext.baseRouteId === activeEditingRoute.id
              || editingProjectedContext.baseRouteId === (activeEditingRoute as any).base_route_id
            )
          );
          // Når projektion er aktiv bruger vi basis-rutens stops fra
          // `recurringBaseRoutes` (som har `agreement_occurrences` joined ind),
          // så sourceKey-matchingen virker pålideligt — calendar-RPC'en giver
          // ikke nødvendigvis nested occurrence-data. Ellers viser vi alle
          // stops fra calendar-vinduet som normalt.
          let stopsForActive: RouteStop[] = [];
          if (activeEditingRoute) {
            if (projectionActive) {
              const projectedBaseId = editingProjectedContext!.baseRouteId;
              const baseFromCache = (recurringBaseRoutes as any[]).find(
                (r: any) => r.id === projectedBaseId,
              );
              const isActiveProjectedStop = (s: any) => {
                const eff = (s.occurrence_status as string | undefined) ?? s.status;
                return eff !== "completed" && eff !== "cancelled";
              };
              const filterProjectedStops = (list: any[] = []) => list
                .filter((s: any) => projectedStopMatchesSources(s, editingProjectedContext!.sourceKeys))
                .filter(isActiveProjectedStop);
              const sourceStops = filterProjectedStops(baseFromCache?.stops || []);
              const fallbackStops = filterProjectedStops(editingProjectedContext!.previewStops || []);
              const sourced = (sourceStops.length > 0 ? sourceStops : fallbackStops)
                .map((s: any) => {
                  // Find aftalens interval via recurringSources (key→interval)
                  // — basis-stop har ofte ikke selv et agreement_occurrence-
                  // link, så uden dette viser detaljepanelet "Engangsaftale"
                  // selv på en projiceret hver-14.-dag rute.
                  let inheritedInterval: string | null = null;
                  const keys = recurringSourceKeysForStop(s);
                  for (const src of recurringSources) {
                    if (!src.interval) continue;
                    if (src.sourceKeys.some((k) => keys.includes(k))) {
                      inheritedInterval = src.interval;
                      break;
                    }
                  }
                  return {
                    ...s,
                    assignee_ids: s.assignee_ids || [],
                    lead_employee_id: s.lead_employee_id ?? s.assigned_employee_id ?? null,
                    agreement_interval: s.agreement_interval ?? inheritedInterval,
                    order_amount: Number((s as any).order_amount ?? 0),
                  };
                }) as RouteStop[];
              stopsForActive = sourced;
            } else {
              stopsForActive = calendarStops.filter((s) => s.route_id === activeEditingRoute.id);
            }
          }
          const closeAll = () => {
            setEditingRoute(null);
            setEditingProjectedContext(null);
            setSelectedStopId(null);
          };
          return (
            <>
              <RouteEditSheet
                route={activeEditingRoute}
                open={!!activeEditingRoute && !isCompactRouteLayout}
                onOpenChange={(o) => !o && closeAll()}
                stopCount={stopsForActive.length}
                stops={stopsForActive}
                autoGeneratedName={activeEditingAutoName}
                isProjection={projectionActive}
                projectedDate={projectionActive ? editingProjectedContext?.projectedDate ?? null : null}
              />
              <RouteStopsPanel
                route={activeEditingRoute}
                open={!!activeEditingRoute}
                onOpenChange={(o) => !o && closeAll()}
                stops={stopsForActive}
          onSelectStop={(s) => setSelectedStopId(s.id)}
          employees={activeEmployees.map((e: any) => ({
            id: e.id, name: e.name, avatar_url: e.avatar_url, color: e.color,
          }))}
                isProjection={projectionActive}
              />
            </>
          );
        })()}

        <MoveRouteDateDialog
          open={!!pendingRouteMove}
          onOpenChange={(o) => { if (!o) setPendingRouteMove(null); }}
          routeName={pendingRouteMove?.route.name || "Rute"}
          fromDate={pendingRouteMove?.route.route_date || ""}
          toDate={pendingRouteMove?.newDate || ""}
          recurringAppointmentCount={pendingSeriesInfo?.recurringAppointmentCount ?? 0}
          linkedSubscriptionCount={pendingSeriesInfo?.linkedSubscriptionCount ?? 0}
          loading={moveRouteSeries.isPending}
          onConfirm={handleConfirmMoveRoute}
        />

        {/* Bekræftelse: drag/drop af en projiceret forekomst til ny dato. */}
        <MoveProjectedOccurrenceDialog
          open={!!pendingProjectedMove}
          onOpenChange={(o) => { if (!o && !shiftProjectedOccurrence.isPending) setPendingProjectedMove(null); }}
          routeName={pendingProjectedMove?.routeName || "Rute"}
          fromDate={pendingProjectedMove?.fromDate || ""}
          toDate={pendingProjectedMove?.toDate || ""}
          recurringAppointmentCount={pendingProjectedSeriesInfo?.recurringAppointmentCount ?? 0}
          syncNext={projectedMoveSyncNext}
          onSyncNextChange={setProjectedMoveSyncNext}
          syncStart={projectedMoveSyncStart}
          onSyncStartChange={setProjectedMoveSyncStart}
          loading={shiftProjectedOccurrence.isPending}
          onConfirm={async () => {
            if (!pendingProjectedMove) return;
            const agreementIds = pendingProjectedSeriesInfo?.agreementIds ?? [];
            const subscriptionIds = pendingProjectedSeriesInfo?.recurringSubscriptionIds ?? [];
            const orderIds = pendingProjectedSeriesInfo?.orderIds ?? [];
            try {
              await shiftProjectedOccurrence.mutateAsync({
                baseRouteId: pendingProjectedMove.baseRouteId,
                fromDate: pendingProjectedMove.fromDate,
                toDate: pendingProjectedMove.toDate,
                agreementIds,
                subscriptionIds,
                orderIds,
                moveStartDates: projectedMoveSyncStart,
                moveNextDates: projectedMoveSyncNext,
              });
              toast.success("Den projicerede forekomst er flyttet til den nye dato");
              const fromD = pendingProjectedMove.fromDate;
              const toD = pendingProjectedMove.toDate;
              const baseId = pendingProjectedMove.baseRouteId;
              pushRouteUndo({
                label: `Flyt projiceret forekomst tilbage til ${format(parseISO(fromD), "d. MMM", { locale: da })}`,
                undo: async () => {
                  await shiftProjectedOccurrence.mutateAsync({
                    baseRouteId: baseId,
                    fromDate: toD,
                    toDate: fromD,
                  });
                },
              });
              setPendingProjectedMove(null);
            } catch (e: any) {
              toastRouteError(e, toast.error, { titleFallback: "Kunne ikke flytte den projicerede rute" });
            }
          }}
        />

        {/* Klog opstartsdato-validering ved drop af aftale på dato/rute. */}
        <AlertDialog
          open={!!pendingStartDateChange}
          onOpenChange={(o) => { if (!o && !confirmingStartDate) setPendingStartDateChange(null); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingStartDateChange?.isBefore
                  ? "Datoen er før aftalens opstartsdato"
                  : "Datoen passer ikke med opstartsdatoen"}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>
                    Aftalen for <strong>{pendingStartDateChange?.job?.customer_name || "kunden"}</strong> har
                    opstartsdato{" "}
                    <strong>
                      {pendingStartDateChange?.currentStart
                        ? format(parseISO(pendingStartDateChange.currentStart), "EEEE d. MMM yyyy", { locale: da })
                        : ""}
                    </strong>.
                  </p>
                  <p>
                    Du er ved at lægge den på{" "}
                    <strong>
                      {pendingStartDateChange?.targetDate
                        ? format(parseISO(pendingStartDateChange.targetDate), "EEEE d. MMM yyyy", { locale: da })
                        : ""}
                    </strong>{" "}
                    ({pendingStartDateChange?.targetLabel}).
                  </p>
                  <p className="text-muted-foreground">
                    Vil du flytte aftalens opstartsdato til den nye dato? Det opdaterer også
                    fremtidige forekomster og evt. tilknyttet abonnement.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={confirmingStartDate}>
                Annullér drop
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmingStartDate}
                onClick={async (e) => {
                  e.preventDefault();
                  if (!pendingStartDateChange) return;
                  setConfirmingStartDate(true);
                  try {
                    await pendingStartDateChange.execute();
                  } catch (err: any) {
                    toastRouteError(err, toast.error, { titleFallback: "Kunne ikke flytte aftalen" });
                  } finally {
                    setConfirmingStartDate(false);
                    setPendingStartDateChange(null);
                  }
                }}
              >
                {confirmingStartDate ? "Flytter…" : "Flyt opstartsdato og placér"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bulk-validering: opret rute hvor flere aftaler har afvigende opstartsdato. */}
        <AlertDialog
          open={!!pendingBulkStartDateChange}
          onOpenChange={(o) => { if (!o && !confirmingBulkStartDate) setPendingBulkStartDateChange(null); }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {pendingBulkStartDateChange?.mismatches.length === 1
                  ? "1 aftale har en anden opstartsdato"
                  : `${pendingBulkStartDateChange?.mismatches.length ?? 0} aftaler har afvigende opstartsdato`}
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm">
                  <p>
                    Du opretter en rute på{" "}
                    <strong>
                      {pendingBulkStartDateChange?.targetDate
                        ? format(parseISO(pendingBulkStartDateChange.targetDate), "EEEE d. MMM yyyy", { locale: da })
                        : ""}
                    </strong>, men følgende aftaler har en anden opstartsdato:
                  </p>
                  <ul className="rounded border bg-secondary/30 divide-y max-h-48 overflow-y-auto">
                    {pendingBulkStartDateChange?.mismatches.map((m) => (
                      <li key={m.job.id} className="px-2.5 py-1.5 text-xs flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{m.job.customer_name || "Ukendt kunde"}</span>
                        <span className="text-muted-foreground shrink-0">
                          {format(parseISO(m.currentStart), "d. MMM yyyy", { locale: da })}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground">
                    Vil du flytte deres opstartsdato til rutens dato og fortsætte med oprettelsen?
                    Det opdaterer også fremtidige forekomster og evt. tilknyttede abonnementer.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={confirmingBulkStartDate}>
                Annullér
              </AlertDialogCancel>
              <AlertDialogAction
                disabled={confirmingBulkStartDate}
                onClick={async (e) => {
                  e.preventDefault();
                  if (!pendingBulkStartDateChange) return;
                  setConfirmingBulkStartDate(true);
                  try {
                    await pendingBulkStartDateChange.execute();
                  } catch (err: any) {
                    toastRouteError(err, toast.error, { titleFallback: "Kunne ikke oprette ruten" });
                  } finally {
                    setConfirmingBulkStartDate(false);
                    setPendingBulkStartDateChange(null);
                  }
                }}
              >
                {confirmingBulkStartDate ? "Opretter…" : "Flyt opstartsdatoer og opret"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </AdminShell>
    </DndContext>
  );
};

export default RoutePlanner;

/** Lille avatar til medarbejder-filter-popoveren. Viser profilbillede når
 *  det findes — falder ellers tilbage til initialer på medarbejderens
 *  farve, så listen altid har et visuelt anker. */
const FilterEmpAvatar = ({ emp }: { emp: { name?: string | null; color?: string | null; avatar_url?: string | null } }) => {
  const name = emp?.name || "?";
  if (emp?.avatar_url) {
    return (
      <img
        src={emp.avatar_url}
        alt={name}
        loading="lazy"
        className="h-4 w-4 rounded-full object-cover ring-1 ring-border shrink-0"
      />
    );
  }
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  return (
    <span
      className="inline-flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-border text-white text-[8px] font-semibold shrink-0"
      style={{ background: emp?.color || "hsl(220 13% 46%)" }}
      aria-hidden
    >
      {initials}
    </span>
  );
};
