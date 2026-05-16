import { useEffect, useMemo, useRef, useState } from "react";
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
  ShoppingBag, Route as RouteIcon, Tag, Palette, ListChecks,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { format, addDays, addWeeks, addMonths, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { da } from "date-fns/locale";
import { toast } from "sonner";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  pointerWithin, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { UnassignedJobCard } from "@/components/route-planner/UnassignedJobCard";
import { StopDetailSheet } from "@/components/route-planner/StopDetailSheet";
import { MonthWeekCalendar, type CalendarRoute } from "@/components/route-planner/MonthWeekCalendar";
import { RouteEditSheet, ROUTE_COLORS, ROUTE_COLOR_PALETTE, pickAvailableColor } from "@/components/route-planner/RouteEditSheet";
import { DatePickerField } from "@/components/route-planner/DatePickerField";
import { RouteStopsPanel } from "@/components/route-planner/RouteStopsPanel";
import { MoveRouteDateDialog, type MoveRouteScope } from "@/components/route-planner/MoveRouteDateDialog";
import { MergeRoutesDialog } from "@/components/route-planner/MergeRoutesDialog";
import { supabase } from "@/integrations/supabase/client";
import CreateManualOrderDialog from "@/components/route-planner/CreateManualOrderDialog";
import { Section, Field, SheetHeaderBlock, SheetFooterBar } from "@/components/route-planner/SheetSection";
import { AdminShell } from "@/components/admin/shared/AdminShell";
import { useWeatherForecast, type WeatherDay } from "@/hooks/useWeather";
import { ShellSkeleton } from "@/components/admin/shared/Skeletons";
import { useQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { expandRecurringRoutes, projectedStopMatchesSources, recurringSourceKeysForStop } from "@/lib/recurring-projection";
import { invalidateRouteSyncQueries } from "@/hooks/useRoutes";
import { cn } from "@/lib/utils";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

/** Konverterer "HH:MM[:SS]" til minutter siden midnat (eller null). */
const toMin = (t: string | null | undefined): number | null => {
  if (!t) return null;
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const RoutePlanner = () => {
  const { user, loading } = useAuth();
  if (loading) return <ShellSkeleton />;
  if (!user) return <Navigate to="/log-ind" replace />;
  return <Planner />;
};

const Planner = () => {
  const { data: business } = useMyBusiness();
  const qc = useQueryClient();
  const [date, setDate] = useState<string>(todayStr());
  const [view, setView] = useState<"month" | "week">("month");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "price" | "name">("date");
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
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
   * Optimistisk farve-override pr. rute-id. Sættes når brugeren klikker en
   * ny farve i RouteEditSheet, så RouteStopsPanel (og andre sideløbende
   * paneler) opdaterer samtidig — uden at vente på at mutationen og cache-
   * invalideringen propagerer. Ryddes når mutationen har slået igennem i
   * route-cachen.
   */
  const [routeColorOverride, setRouteColorOverride] = useState<Record<string, string>>({});
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
  } | null>(null);
  const [routeToDelete, setRouteToDelete] = useState<{ id: string; name: string } | null>(null);
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
  const optimizeRoute = useOptimizeRoute();
  const geocode = useGeocodeAddress();

  // Pending route-move: viser MoveRouteDateDialog. Hvis ruten er del af en
  // serie spørger vi brugeren om kun denne ene eller alle fremtidige skal flyttes.
  const [pendingRouteMove, setPendingRouteMove] = useState<{
    route: Route;
    newDate: string;
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
  // Serie-info for kilde-ruten i en igangværende fletning, så fletteren
  // også kan tilbyde "fremtidige aftaler også" når kilden har gentagne aftaler.
  const { data: pendingMergeSeriesInfo } = useRouteSeriesInfo(
    pendingRouteMerge?.source.id ?? null,
    pendingRouteMerge?.source.route_date ?? null,
  );

  // Pr-rute "pending" state — kun den rute der faktisk optimeres viser spinner
  const [optimizingRouteId, setOptimizingRouteId] = useState<string | null>(null);

  // ── Filtre: kun vis stops for valgte assignees / forekomst-statusser ──
  const [filterAssigneeIds, setFilterAssigneeIds] = useState<string[]>([]);
  const [filterStatuses, setFilterStatuses] = useState<string[]>([]);
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

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

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
          .select("id, interval, interval_days, start_date, preferred_route_id, legacy_subscription_id")
          .eq("business_id", businessId!)
          .eq("status", "active")
          .neq("interval", "engangskøb")
          .not("preferred_route_id", "is", null),
        supabase
          .from("subscriptions")
          .select("id, interval, next_service_date, created_at, preferred_route_id, status, order_id")
          .eq("business_id", businessId!)
          .eq("status", "active")
          .neq("interval", "engangskøb")
          .not("preferred_route_id", "is", null),
      ]);
      if (agreementsRes.error) throw agreementsRes.error;
      if (subsRes.error) throw subsRes.error;
      const subOrderById = new Map((subsRes.data || []).map((s: any) => [s.id, s.order_id as string | null]));
      const agreementLegacySubIds = new Set(
        (agreementsRes.data || []).map((a: any) => a.legacy_subscription_id).filter(Boolean),
      );
      const fromAgreements = (agreementsRes.data || []).map((a: any) => ({
        id: `agr:${a.id}`,
        interval: a.interval as string,
        interval_days: (a.interval_days ?? null) as number | null,
        seed_date: a.start_date as string | null,
        preferred_route_id: a.preferred_route_id as string | null,
        sourceKeys: [
          `agr:${a.id}`,
          a.legacy_subscription_id ? `sub:${a.legacy_subscription_id}` : null,
          a.legacy_subscription_id && subOrderById.get(a.legacy_subscription_id) ? `order:${subOrderById.get(a.legacy_subscription_id)}` : null,
        ].filter(Boolean) as string[],
      }));
      const fromSubs = (subsRes.data || [])
        .filter((s: any) => !agreementLegacySubIds.has(s.id))
        .map((s: any) => ({
          id: `sub:${s.id}`,
          interval: s.interval as string,
          interval_days: null,
          seed_date: (s.next_service_date as string | null) || (s.created_at as string | null),
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
        .select("*, agreement_occurrences(agreement_id, legacy_order_id, agreements(interval))")
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
    // Når filtre er aktive, skjul ruter helt hvis ingen af deres stops matcher.
    // Ellers ser det ud som om filteret bare "skjuler detaljer" — hvilket
    // forvirrer brugerne.
    if (filtersActive) {
      return built.filter((r) => (r.stops?.length ?? 0) > 0);
    }
    return built;
  }, [calendarRoutesRaw, visibleCalendarStops, activeEmployees, recurringBaseRoutes]);

  const virtualCalendarRoutes: CalendarRoute[] = useMemo(() => {
    if (!recurringSources.length) return [];
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
    for (const ex of routeOccurrenceExceptions) {
      realKeys.add(`${(ex as any).base_route_id}|${String((ex as any).occurrence_date).slice(0, 10)}`);
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
    // VIGTIGT: vi overskriver IKKE seed_date pr. kilde. Hver aftale har sit
    // eget interval (uge/14 dage/måned/...), og en universel override af alle
    // seeds til basisrutens dato ville kollapse alle aftalerne til én fælles
    // cyklus — så ruter med blandede intervaller kun ville vise nogle af
    // forekomsterne. Spøgelses-projektioner ved flytning af basisruten
    // håndteres allerede via `route_occurrence_exceptions` (se realKeys
    // ovenfor) og af `useMoveRouteSeries`, som forskyder aftalernes egne
    // start_date / next_service_date når brugeren vælger "Fremtidige også".
    const sourcesWithRouteSeed = recurringSources;
    const projections = expandRecurringRoutes({
      sources: sourcesWithRouteSeed,
      // Projicér ALDRIG i fortiden — selvom kalenderens visuelle range
      // starter før i dag (fx månedens grid begynder mandag i forrige uge),
      // skal projicerede ruter aldrig dukke op på datoer der er passeret.
      rangeStart: (() => {
        const todayStr = format(new Date(), "yyyy-MM-dd");
        return calendarRange.start < todayStr ? todayStr : calendarRange.start;
      })(),
      rangeEnd: calendarRange.end,
      realRouteDates: realKeys,
    });
    return projections
      .map((p) => {
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
        const resolved = resolvedBaseById.get(p.baseRouteId);
        // Projicér basis-rutens stops over på den virtuelle dato — gør at
        // brugeren ser kunderne i kalender-kortet selv før forekomsten er
        // materialiseret. Stops markeres som virtuelle så de ikke kan ændres.
        const projectedStops = (base.stops || [])
          .filter((s: any) => projectedStopMatchesSources(s, p.sourceKeys))
          .map((s: any, i: number) => ({
            ...s,
            id: `virtual-stop:${p.baseRouteId}:${p.date}:${s.id}`,
            route_id: p.id,
            status: "planned",
            isVirtual: true,
            sequence: i,
          }));
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
  }, [recurringSources, recurringBaseRoutes, calendarRoutesRaw, routeOccurrenceExceptions, calendarRange.start, calendarRange.end, activeEmployees, calendarRoutes]);

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
    // Apply optimistisk farve-override så sideløbende paneler skifter
    // farve samtidig med RouteEditSheet's picker.
    const override = routeColorOverride[base.id];
    return override ? { ...base, color: override } : base;
  }, [editingRoute, calendarRoutesRaw, recurringBaseRoutes, routeColorOverride]);

  // Ryd override når cachens farve for ruten matcher den valgte farve —
  // dvs. den optimistiske/server-mutation har slået igennem.
  useEffect(() => {
    const entries = Object.entries(routeColorOverride);
    if (entries.length === 0) return;
    const next: Record<string, string> = {};
    let changed = false;
    for (const [id, color] of entries) {
      const cached =
        calendarRoutesRaw.find((r) => r.id === id)
        ?? (recurringBaseRoutes as any[]).find((r) => r.id === id);
      if (cached && cached.color === color) {
        changed = true;
      } else {
        next[id] = color;
      }
    }
    if (changed) setRouteColorOverride(next);
  }, [calendarRoutesRaw, recurringBaseRoutes, routeColorOverride]);

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
    setEditingProjectedContext({ baseRouteId: baseId, projectedDate, sourceKeys: projectedSourceKeys });
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
      setEditingRoute(localBase as Route);
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
      toast.error(err.message || "Basisruten kunne ikke åbnes");
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
  }, [selectedStopId, view]);

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
    if (data?.type === "route" && data?.route?.isVirtual) {
      setActiveDragId(null);
      setActiveDragData(null);
      if (businessId) {
        void logRoutePlannerEvent({
          businessId,
          eventType: "virtual_route_drag_blocked_client",
          severity: "warning",
          baseRouteId: data.route.baseRouteId ?? null,
          projectedDate: data.route.route_date ?? null,
          details: { routeId: data.route.id },
        });
      }
      return;
    }
    setActiveDragId(e.active.id as string);
    setActiveDragData(data);
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
    setActiveDragId(null);
    setActiveDragData(null);
    if (!over || !businessId) return;

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

    const activeData: any = active.data.current;
    const overData: any = over.data.current;
    if (activeData?.type === "route" && activeData?.route?.isVirtual) {
      await logRoutePlannerEvent({
        businessId,
        eventType: "virtual_route_move_blocked_client",
        severity: "error",
        baseRouteId: activeData.route.baseRouteId ?? null,
        projectedDate: activeData.route.route_date ?? null,
        details: { routeId: activeData.route.id, overType: overData?.type ?? null },
      });
      toast.info("Projicerede ruter kan åbnes, men ikke flyttes direkte");
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
          toast.error(err.message || "Kunne ikke tilføje aftale");
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
          toast.error(err.message || "Kunne ikke oprette rute");
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
        toast.error(err.message || "Kunne ikke flytte stop");
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
    const { source, target } = pendingRouteMerge;
    setMergingRoute(true);
    // Optimistisk: flyt stops til målruten og fjern kilderuten fra cachen
    // med det samme, så UI'et reagerer øjeblikkeligt i stedet for at vente
    // 3-4 sek på server-roundtrip + invalidate + refetch. Vi tager snapshots
    // for at kunne rulle tilbage hvis serveren afviser.
    const calSnapshots = qc.getQueriesData<any>({ queryKey: ["route-calendar"] });
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
    setPendingRouteMerge(null);
    try {
      const sourceStops = calendarStops.filter((s: any) => s.route_id === source.id);
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
      toast.success(
        sourceStops.length === 0
          ? "Tom rute slettet"
          : `${moved} aftale${moved === 1 ? "" : "r"} flettet ind i ${target.name || "rute"}`,
        {
          description:
            scope === "future"
              ? "Fremtidige forekomster af gentagne aftaler følger med."
              : "Kilderuten blev slettet automatisk.",
        },
      );
      invalidateRouteSyncQueries(qc);
      qc.invalidateQueries({ queryKey: ["recurring-agreements-for-planner"] });
      qc.invalidateQueries({ queryKey: ["recurring-base-routes"] });
      qc.invalidateQueries({ queryKey: ["route-series-info"] });
    } catch (err: any) {
      // Rul optimistisk cache-patch tilbage hvis fletningen fejlede.
      calSnapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(err.message || "Kunne ikke flette ruterne");
    } finally {
      setMergingRoute(false);
    }
  };

  const handleOptimize = async (routeId: string, routeName: string | null) => {
    setOptimizingRouteId(routeId);
    const label = routeName || "Rute";
    try {
      const result = await optimizeRoute.mutateAsync(routeId);
      const savedKm = Math.max(
        0,
        (result as any).saved_km ?? (((result as any).before_km ?? result.total_km) - result.total_km),
      );
      const savedMin = Math.max(
        0,
        (result as any).saved_minutes ?? (((result as any).before_minutes ?? result.total_minutes) - result.total_minutes),
      );
      const negligible = savedKm < 0.05 && savedMin < 1;
      if (!negligible) {
        const parts: string[] = [];
        if (savedKm >= 0.05) parts.push(`${savedKm.toFixed(1)} km`);
        if (savedMin >= 1) parts.push(`${Math.round(savedMin)} min`);
        toast.success(`${label}: sparet ${parts.join(" · ")}`);
      } else if ((result as any).order_changed) {
        toast.success(`${label}: rækkefølgen er optimeret`);
      } else {
        toast.info(`${label}: ingen bedre rækkefølge fundet`);
      }
    } catch { /* error toast handled in hook */ }
    finally { setOptimizingRouteId(null); }
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
      toast.error(e.message || "Kunne ikke auto-fordele aftaler");
    } finally {
      setDistributing(false);
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={pointerWithin}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <AdminShell
        business={business}
        activeTab="routes"
        contentPadding={false}
        contentClassName="flex flex-col overflow-hidden"
        topbarRight={
          <div className="flex items-center gap-1.5 flex-wrap justify-end">
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

            <div className="flex items-center gap-1.5">
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button data-tour="routes-create-button" size="sm" className="h-7 gap-1">
                    <Plus className="h-3.5 w-3.5" />Opret rute
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md p-0 gap-0 overflow-hidden flex flex-col">
                  <DialogHeader className="px-5 py-4 border-b shrink-0 space-y-0">
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

                  <div className="px-5 py-3 space-y-2.5 bg-secondary/20">
                    <Section icon={<Tag className="h-3.5 w-3.5" />} title="Detaljer">
                      <div className="space-y-2.5">
                        <Field label="Navn (valgfrit)">
                          <Input
                            id="route-name"
                            placeholder="fx Nord, Aarhus C, Mandag-team..."
                            value={newRouteName}
                            onChange={(e) => setNewRouteName(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleCreateRoute(); }}
                            className="h-8"
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
                          className="h-7 pl-6 text-xs"
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
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setCreateOpen(false)} disabled={createRoute.isPending}>
                        Annullér
                      </Button>
                      <Button
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
                    <p><kbd className="px-1 rounded bg-secondary text-[10px]">Esc</kbd> Luk panel</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        }
      >
        <div className="flex-1 overflow-hidden p-3" style={{ height: "calc(100vh - 56px)" }}>
            <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">
              {/* Sidebar: Aftaler uden rute */}
              <ResizablePanel defaultSize={20} minSize={14} maxSize={36} className="overflow-hidden">
                <Card data-tour="routes-unassigned" className="flex flex-col h-full overflow-hidden">
                  <div className="p-3 border-b bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-sm flex items-center gap-1.5">
                        <Inbox className="h-4 w-4 text-primary" />
                        Aftaler uden rute
                      </h2>
                      <Badge variant="secondary" className="tabular-nums">
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
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-transparent w-2 hover:bg-primary/20 transition-colors" />

              {/* Calendar */}
              <ResizablePanel defaultSize={80} className="overflow-hidden">
                <div data-tour="routes-calendar" className="h-full">
                <MonthWeekCalendar
                  view={view}
                  anchorDate={date}
                  routes={calendarRoutesAll}
                  onSelectRoute={async (r: any) => {
                    // Projicerede (gentagende) ruter må IKKE duplikeres ved
                    // simpelt klik. Åbn i stedet basisruten direkte, så
                    // ændringer gælder hele serien. Materialisering sker først
                    // når brugeren eksplicit flytter/redigerer en enkelt
                    // forekomst (drag-and-drop til ny dato).
                    if (r.isVirtual) {
                      await openProjectedRoute(r);
                      return;
                    }
                    // Almindelig (rigtig) rute: nulstil projektions-konteksten
                    // så vi viser alle stops uden filter.
                    setEditingProjectedContext(null);
                    setEditingRoute(r);
                  }}
                  onSelectStop={(s) => setSelectedStopId(s.id)}
                  onCreateRoute={(d) => { setNewRouteDate(d); setCreateOpen(true); }}
                  onOptimizeRoute={(id) => {
                    const r = calendarRoutesRaw.find((x) => x.id === id);
                    handleOptimize(id, r?.name ?? null);
                  }}
                  optimizingRouteId={optimizingRouteId}
                  draggingType={
                    activeDragData?.type === "job" ? "job"
                      : activeDragData?.type === "route" ? "route"
                      : activeDragData?.type === "stop" ? "stop"
                      : null
                  }
                  weatherByDate={weatherByDate}
                  loadingRoutes={loadingCalendarRoutes || loadingCalendarStops}
                  loadingWeather={loadingWeather}
                  weatherError={weatherError}
                  busyTargets={busyTargets}
                />
                </div>
              </ResizablePanel>
            </ResizablePanelGroup>
        </div>

        {/* Manuel ordre-oprettelse — kunde modtager mail med godkendelseslink */}
        {businessId && (
          <CreateManualOrderDialog
            open={createOrderOpen}
            onOpenChange={setCreateOrderOpen}
            businessId={businessId}
            businessName={business?.name || ""}
          />
        )}

        {/* Slet rute bekræftelse */}
        <AlertDialog open={!!routeToDelete} onOpenChange={(o) => !o && setRouteToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Slet rute?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{routeToDelete?.name}</strong> og alle dens stops slettes permanent.
                Tilkoblede medarbejdere fjernes fra ruten, og aftalerne ryger tilbage i aftalepoolen.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annullér</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  if (routeToDelete) {
                    deleteRoute.mutate(routeToDelete.id, {
                      onSuccess: () => toast.success(`${routeToDelete.name} slettet`),
                    });
                    setRouteToDelete(null);
                  }
                }}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Slet rute
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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

        <DragOverlay>
          {activeDragId && activeDragData?.type === "job" && (
            <div
              className="rounded-md border border-accent bg-card px-2 py-1.5 shadow-xl w-[160px] cursor-grabbing"
              style={{ transform: "rotate(-2deg)" }}
            >
              <div className="flex items-center justify-between gap-1.5">
                <p className="text-xs font-semibold truncate">{activeDragData.job.customer_name}</p>
                <span className="text-[10px] font-bold text-accent shrink-0 tabular-nums">
                  {Math.round(Number(activeDragData.job.total_amount || 0))} kr
                </span>
              </div>
            </div>
          )}
          {activeDragId && activeDragData?.type === "stop" && (
            <div className="rounded-md border bg-background p-2 shadow-lg w-[200px] opacity-90 border-l-4 border-l-primary">
              <p className="text-sm font-medium truncate">{activeDragData.stop.customer_name}</p>
              <p className="text-[10px] text-muted-foreground">{activeDragData.stop.duration_minutes} min</p>
            </div>
          )}
        </DragOverlay>

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
            && editingProjectedContext.baseRouteId === activeEditingRoute.id
          );
          // Når projektion er aktiv bruger vi basis-rutens stops fra
          // `recurringBaseRoutes` (som har `agreement_occurrences` joined ind),
          // så sourceKey-matchingen virker pålideligt — calendar-RPC'en giver
          // ikke nødvendigvis nested occurrence-data. Ellers viser vi alle
          // stops fra calendar-vinduet som normalt.
          let stopsForActive: RouteStop[] = [];
          if (activeEditingRoute) {
            if (projectionActive) {
              const baseFromCache = (recurringBaseRoutes as any[]).find(
                (r: any) => r.id === activeEditingRoute.id,
              );
              const sourced = (baseFromCache?.stops || [])
                .filter((s: any) => projectedStopMatchesSources(s, editingProjectedContext!.sourceKeys))
                .map((s: any) => ({
                  ...s,
                  assignee_ids: s.assignee_ids || [],
                  lead_employee_id: s.lead_employee_id ?? s.assigned_employee_id ?? null,
                })) as RouteStop[];
              stopsForActive = sourced;
            } else {
              stopsForActive = calendarStops.filter((s) => s.route_id === activeEditingRoute.id);
            }
          }
          const closeAll = () => {
            setEditingRoute(null);
            setEditingProjectedContext(null);
          };
          return (
            <>
              <RouteEditSheet
                route={activeEditingRoute}
                open={!!activeEditingRoute}
                onOpenChange={(o) => !o && closeAll()}
                stopCount={stopsForActive.length}
                stops={stopsForActive}
                autoGeneratedName={activeEditingAutoName}
                onColorPreview={(c) => {
                  if (!activeEditingRoute) return;
                  setRouteColorOverride((prev) => ({ ...prev, [activeEditingRoute.id]: c }));
                }}
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
                    toast.error(err?.message || "Kunne ikke flytte aftalen");
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
                    toast.error(err?.message || "Kunne ikke oprette ruten");
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
