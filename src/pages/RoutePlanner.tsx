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
  useRevertProjectedShift,
  openProjectedRouteBase,
  logRoutePlannerEvent,
  type RouteStop, type Route,
} from "@/hooks/useRoutes";
import { useDeleteStop } from "@/hooks/useRoutes";
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
  ShoppingBag, Route as RouteIcon, Tag, Palette, ListChecks, AlertTriangle, Undo2, Redo2, Sparkles, MapPin, Clock,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarPicker } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { format, addDays, addWeeks, addMonths, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, differenceInCalendarDays } from "date-fns";
import { da } from "date-fns/locale";
import { toast } from "sonner";
import { toastRouteError } from "@/lib/route-errors";
import { pushBatchedToast } from "@/lib/toast-batch";
import {
  DndContext, DragOverlay, useSensor, useSensors,
  pointerWithin, rectIntersection, type CollisionDetection, type DragEndEvent, type DragMoveEvent, type DragOverEvent, type DragStartEvent,
  PointerSensor, MouseSensor, TouchSensor, KeyboardSensor,
} from "@dnd-kit/core";
import { createPortal } from "react-dom";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { UnassignedJobCard, UnassignedJobCardSkeleton } from "@/components/route-planner/UnassignedJobCard";
import { StopDetailSheet } from "@/components/route-planner/StopDetailSheet";
import { SuggestRouteDialog } from "@/components/route-planner/SuggestRouteDialog";
import { MonthWeekCalendar, type CalendarRoute } from "@/components/route-planner/MonthWeekCalendar";
import { AgendaCalendar } from "@/components/route-planner/AgendaCalendar";
import { ConflictBanner } from "@/components/route-planner/ConflictBanner";
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
import { startDragAutoScroll, stopDragAutoScroll } from "@/components/route-planner/lib/drag-auto-scroll";
import { Section, Field, SheetHeaderBlock, SheetFooterBar } from "@/components/route-planner/SheetSection";
import { AdminShell } from "@/components/admin/shared/AdminShell";
import { useWeatherForecast, type WeatherDay } from "@/hooks/useWeather";
import { useDayConflicts } from "@/hooks/useDayConflicts";
import { useDailyCapacity, useRouteSkillMismatch, deriveZoneKey } from "@/hooks/useRoutePlannerSmarts";
import { findNearestFreeDate } from "@/lib/find-free-date";
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
import { formatDurationMin } from "@/lib/duration-format";
import { useAgreementPauses } from "@/hooks/useAgreementPauses";
import { useBusinessHolidays } from "@/hooks/useBusinessHolidays";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { invalidateRouteSyncQueries } from "@/hooks/useRoutes";
import { routeMutationQueue } from "@/lib/mutation-queue";
import { writeDragValidationDebounced, clearDragValidation, summarize } from "@/components/route-planner/drag-validation-context";
import DragEtaOverlay, { setDragEta, clearDragEta } from "@/components/route-planner/DragEtaOverlay";
import { haversineMeters } from "@/lib/geo-distance";
import { validateStopAssignment, validateRouteMove } from "@/lib/route-validation";
import { cn } from "@/lib/utils";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";
import { Monitor, MousePointer2, Map as MapIcon, LayoutGrid, ArrowLeft, Copy, Check, Rows3, MoreHorizontal, Layers } from "lucide-react";
import { usePersistentState } from "@/hooks/usePersistentState";
import { pushRouteUndo, routeHistory } from "@/lib/route-history";
import { useRouteHistory } from "@/hooks/useRouteHistory";
import { toastSuccessWithUndo } from "@/lib/toast-undo";
import { estimateOptimizationGain, markOptimizeDismissed } from "@/lib/optimize-savings-estimate";
import { BulkMoveRoutesDialog, type BulkMoveRouteItem } from "@/components/route-planner/BulkMoveRoutesDialog";
import RoutePlannerShortcutsHelp from "@/components/route-planner/RoutePlannerShortcutsHelp";
import UnassignedFiltersPopover, { type UrgencyKey } from "@/components/route-planner/UnassignedFiltersPopover";
import UndoBar from "@/components/route-planner/UndoBar";
import PlannerSkeleton from "@/components/route-planner/PlannerSkeleton";
import DensityToggle from "@/components/route-planner/DensityToggle";
import ThemeToggle, { usePlannerTheme, usePlannerThemeEffect } from "@/components/route-planner/ThemeToggle";
import RoutePrintDialog, { type PrintRoute } from "@/components/route-planner/RoutePrintDialog";
import { Printer, ListOrdered } from "lucide-react";
import EmptyState from "@/components/route-planner/EmptyState";
import DayDetailPanel, { type DayStop } from "@/components/route-planner/DayDetailPanel";
import RouteHistoryDialog from "@/components/route-planner/RouteHistoryDialog";
import UnassignedBulkBar from "@/components/route-planner/UnassignedBulkBar";
import BulkShiftDateDialog from "@/components/route-planner/BulkShiftDateDialog";

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
  // Sænket fra 1024 → 900 så små bærbare og iPad Pro i landskab kan bruge
  // planlæggeren. Under 900px er drag-and-drop og sidepanelerne reelt
  // ubrugelige, så der viser vi stadig "kun computer"-skærmen.
  const isSmallScreen = useIsBelowBreakpoint(900);
  if (loading) return <ShellSkeleton />;
  if (!user) return <Navigate to="/log-ind" replace />;
  if (isSmallScreen) return <RoutePlannerDesktopOnly />;
  return <Planner />;
};

const RoutePlannerDesktopOnly = () => {
  const [copied, setCopied] = useState(false);
  const url = typeof window !== "undefined" ? window.location.href : "";
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-muted/30 px-5 py-10">
      <SEO title="Ruteplanlægger – Serviceydere" description="Ruteplanlæggeren er kun tilgængelig på computer." noIndex />
      <div className="w-full max-w-md">
        <div className="rounded-2xl border border-border bg-card shadow-sm overflow-hidden">
          {/* Hero */}
          <div className="relative px-6 pt-8 pb-6 text-center bg-gradient-to-b from-secondary/40 to-transparent">
            <div className="mx-auto mb-4 relative">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground text-background shadow-md">
                <Monitor className="h-8 w-8" />
              </div>
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-x-6 inline-flex h-6 w-6 items-center justify-center rounded-full bg-accent text-accent-foreground text-[10px] font-bold border-2 border-card">
                HD
              </span>
            </div>
            <h1 className="text-xl font-bold text-foreground">Åbn på computer</h1>
            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground leading-relaxed">
              Ruteplanlæggeren er bygget til store skærme med præcis pegeenhed.
            </p>
          </div>

          {/* Features */}
          <div className="px-6 py-5 space-y-2.5 border-t border-border">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
              Hvad du får på desktop
            </p>
            {[
              { icon: MousePointer2, title: "Træk-og-slip planlægning", desc: "Flyt aftaler mellem dage og ruter med musen." },
              { icon: MapIcon, title: "Live kort og ETA", desc: "Se ruter på kortet og beregn køretid undervejs." },
              { icon: LayoutGrid, title: "Paneler side-om-side", desc: "Kalender, aftaler og detaljer samtidigt." },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-start gap-3 rounded-lg p-2 hover:bg-muted/40 transition-colors">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-foreground">
                  <Icon className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground leading-tight">{title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Copy link */}
          <div className="px-6 pb-5">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              Send linket til dig selv
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className="group w-full flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-left transition-colors hover:bg-muted/60 active:scale-[0.99]"
            >
              <span className="min-w-0 flex-1 truncate text-xs font-mono text-muted-foreground">
                {url || "ruteplanlægger"}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 shrink-0 text-xs font-medium transition-colors",
                copied ? "text-emerald-600" : "text-foreground group-hover:text-accent",
              )}>
                {copied ? <><Check className="h-3.5 w-3.5" />Kopieret</> : <><Copy className="h-3.5 w-3.5" />Kopiér</>}
              </span>
            </button>
          </div>

          {/* Footer */}
          <div className="border-t border-border bg-muted/20 px-6 py-3">
            <Link
              to="/virksomhed"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-accent transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Tilbage til oversigt
            </Link>
          </div>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground">
          Tip: Bookmark siden på din computer for hurtig adgang.
        </p>
      </div>
    </div>
  );
};

const Planner = () => {
  const { data: business, isLoading: loadingBusiness } = useMyBusiness();
  const isCompactRouteLayout = useIsBelowBreakpoint(1024);
  const qc = useQueryClient();
  // Mørk-tilstand gælder hele siden mens ruteplanlæggeren er åben, så
  // sidebar, topbar og alt portal-indhold (dialoger, sheets, popovers,
  // dropdowns) følger temaet. Ryddes op ved unmount.
  const plannerTheme = usePlannerThemeEffect();
  const [date, setDate] = useState<string>(todayStr());
  const [view, setView] = usePersistentState<"month" | "week">("route-planner:view", "month");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = usePersistentState<"date" | "price" | "name">("route-planner:sortBy", "date");
  const [compactCards, setCompactCards] = usePersistentState<boolean>("route-planner:compactCards", false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [printOpen, setPrintOpen] = useState(false);
  const [dayDetailOpen, setDayDetailOpen] = useState(false);
  const [historyRoute, setHistoryRoute] = useState<{ id: string; name: string } | null>(null);
  // Bulk-valg i "Aftaler uden rute": Sæt af ordre-ids der pt. er markeret.
  const [selectedJobIds, setSelectedJobIds] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  // Bulk-flyt dato: åbner dialog der viser forhåndsvisning før udførsel.
  const [bulkShiftOpen, setBulkShiftOpen] = useState(false);
  // Filter + gruppering for "Aftaler uden rute" — gør store puljer
  // overskuelige uden at brugeren skal scrolle gennem alt.
  const [unassignedStatusFilter, setUnassignedStatusFilter] = usePersistentState<
    "all" | "ready" | "pending"
  >("route-planner:unassignedStatus", "all");
  const [unassignedGroupBy, setUnassignedGroupBy] = usePersistentState<
    "none" | "status" | "route" | "week" | "postcode"
  >("route-planner:unassignedGroupBy", "none");
  // Avancerede filtre (urgency / postnumre / services). Persistent som arrays
  // siden Set ikke kan serialiseres til JSON.
  const [urgencyFilterArr, setUrgencyFilterArr] = usePersistentState<UrgencyKey[]>(
    "route-planner:filter:urgency", [],
  );
  const [postcodeFilterArr, setPostcodeFilterArr] = usePersistentState<string[]>(
    "route-planner:filter:postcode", [],
  );
  const [serviceFilterArr, setServiceFilterArr] = usePersistentState<string[]>(
    "route-planner:filter:service", [],
  );
  const urgencyFilter = useMemo(() => new Set(urgencyFilterArr), [urgencyFilterArr]);
  const postcodeFilter = useMemo(() => new Set(postcodeFilterArr), [postcodeFilterArr]);
  const serviceFilter = useMemo(() => new Set(serviceFilterArr), [serviceFilterArr]);
  /** Sidst-klikkede aftale (uden shift) — bruges som anker for Shift+klik
   *  range-select i "Aftaler uden rute". */
  const lastSelectedJobIdRef = useRef<string | null>(null);
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [suggestJob, setSuggestJob] = useState<any | null>(null);
  // Ref til "Aftaler uden rute"-søgefeltet — så vi kan fokusere det med "/".
  const unassignedSearchRef = useRef<HTMLInputElement | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  // ID for det drop-target musen p.t. hovrer over — bruges af DragEtaOverlay
  // til at vide hvilken validering + ETA der skal vises.
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
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

  // ─── Proaktive konflikt-prikker i kalenderen ─────────────────────────────
  // Beregner en map<dato → severity+label> der vises som farvet prik ved siden
  // af dato-tallet i MonthWeekCalendar. Brugeren ser problemer INDEN de prøver
  // at trække noget hen — sparer en mislykket drag-cyklus.
  //
  // - `warning` (gul):  helligdag / virksomheds-lukkedag
  // - `error`   (rød):  samme medarbejder dobbeltbooket på samme dato
  const dateAlerts = useMemo(() => {
    const map = new Map<string, { severity: "warning" | "error"; label: string }>();
    // 1) Helligdage → gul prik
    for (const h of businessHolidays as any[]) {
      const d = h.holiday_date as string;
      if (!d) continue;
      map.set(d, { severity: "warning", label: h.name ? `Lukkedag: ${h.name}` : "Lukkedag" });
    }
    // 2) Medarbejder-dobbeltbookinger pr. dato → rød prik (trumfer gul)
    // Brug både assigned_employee_id og route_stop_assignees-relationen ville
    // kræve ekstra query — vi nøjes med stop.assigned_employee_id som er det
    // primære felt i kalenderens data og dermed tilstrækkeligt til en
    // proaktiv advarsel. Faktiske konflikter valideres mere præcist ved drop.
    const byDateEmp = new Map<string, Map<string, number>>();
    const routesById = new Map<string, any>();
    for (const r of calendarRoutesRaw) routesById.set(r.id, r);
    for (const s of calendarStops as any[]) {
      if (!s.assigned_employee_id) continue;
      if (s.status === "cancelled") continue;
      const route = routesById.get(s.route_id);
      const date = route?.route_date;
      if (!date) continue;
      let inner = byDateEmp.get(date);
      if (!inner) { inner = new Map(); byDateEmp.set(date, inner); }
      inner.set(s.assigned_employee_id, (inner.get(s.assigned_employee_id) ?? 0) + 1);
    }
    for (const [date, empCounts] of byDateEmp) {
      let dupEmpCount = 0;
      for (const c of empCounts.values()) if (c > 1) dupEmpCount++;
      if (dupEmpCount > 0) {
        map.set(date, {
          severity: "error",
          label: dupEmpCount === 1
            ? "1 medarbejder er dobbeltbooket"
            : `${dupEmpCount} medarbejdere er dobbeltbooket`,
        });
      }
    }
    return map;
  }, [businessHolidays, calendarStops, calendarRoutesRaw]);

  // ─── Smartere kalender-signaler (#9) ───
  // Dagligt kapacitetsoverblik (booket vs. medarbejder-kapacitet) og
  // skill-mismatch-detektion. Begge er rene "info"-lag der ikke ændrer
  // adfærd — bare hjælper brugeren med at se overbelastning eller
  // medarbejdere der mangler en færdighed for et stop på ruten.
  const { data: dailyCapacityRows = [] } = useDailyCapacity({
    business_id: businessId,
    start: calendarRange.start,
    end: calendarRange.end,
  });
  const capacityByDate = useMemo(() => {
    const m = new Map<string, { load_pct: number; minutes_booked: number; minutes_capacity: number }>();
    for (const row of dailyCapacityRows) {
      m.set(row.route_date, {
        load_pct: Number(row.load_pct) || 0,
        minutes_booked: row.minutes_booked,
        minutes_capacity: row.minutes_capacity,
      });
    }
    return m;
  }, [dailyCapacityRows]);

  const { data: skillMismatchRows = [] } = useRouteSkillMismatch({
    business_id: businessId,
    start: calendarRange.start,
    end: calendarRange.end,
  });
  const mismatchedRouteIds = useMemo(
    () => new Set(skillMismatchRows.map((r) => r.route_id)),
    [skillMismatchRows],
  );

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

  // Bredt og stabilt vejr-interval: altid i dag → +15 dage. Så genbruger
  // kalenderen samme cache på tværs af måned/uge-navigation i stedet for at
  // starte et nyt vejrkald for hvert synligt interval.
  const weatherRange = useMemo(() => {
    const today = todayStr();
    const farFuture = format(addDays(new Date(), 15), "yyyy-MM-dd");
    return { start: today, end: farFuture };
  }, []);

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
  const deleteStop = useDeleteStop();
  const shiftProjectedOccurrence = useShiftProjectedOccurrence();
  const revertProjectedShift = useRevertProjectedShift();
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

  // Efter en vellykket flytning/merge spørger vi om brugeren vil køre
  // auto-optimering af stop-rækkefølgen på den berørte rute. Vi optimerer
  // ALDRIG uden brugerens aktive ja — så rækkefølgen ikke pludselig ændrer
  // sig "i baggrunden" efter en flytning.
  const [pendingOptimizePrompt, setPendingOptimizePrompt] = useState<{
    routeId: string;
    routeName: string;
    reason: "moved" | "merged";
    /** Estimat fra `estimateOptimizationGain` — bruges til at vise konkrete
     *  tal i dialogen så brugeren ved HVORFOR vi spørger ("kan spare 12 km"). */
    estimate: { savingsKm: number; savingsPct: number; currentKm: number; suggestedKm: number };
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
    autoSkipCadence?: boolean;
  } | null>(null);

  // ─── Bulk-multi-select: flyt flere ruter med ét tryk ─────────────────
  // Brugeren ⌘/Ctrl/Shift-klikker rute-piller i kalenderen for at samle et
  // valg, og kan så åbne en bulk-flyt dialog der forskyder alle valgte med
  // samme antal dage. Per-rute konflikt-check og fortidsfilter sker live i
  // dialogen — ruter med konflikter springes pænt over uden at blokere de
  // andre.
  const [selectedRouteIds, setSelectedRouteIds] = useState<Set<string>>(new Set());
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkMoveInProgress, setBulkMoveInProgress] = useState(false);
  const [bulkMoveProgress, setBulkMoveProgress] = useState<{ done: number; total: number } | null>(null);

  const toggleRouteSelection = useCallback((id: string) => {
    setSelectedRouteIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }, []);
  const clearRouteSelection = useCallback(() => setSelectedRouteIds(new Set()), []);

  // Når brugeren skifter ugen/måneden eller skifter view rydder vi valget —
  // ellers risikerer vi at brugeren bulk-flytter ruter de ikke længere kan se.
  useEffect(() => {
    setSelectedRouteIds(new Set());
  }, [calendarRange.start, calendarRange.end, view]);

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
      return;
    }
    // Smart sync-default: bestem ud fra hvor langt brugeren flytter ift.
    // seriens dominerende interval. Små flytninger (inden for halvdelen af
    // intervallet) → "kun næste besøg". Store flytninger (≥ ét helt interval)
    // → "forskyd hele rytmen". Mellem-store: lad begge være afkrydsede så
    //  brugeren selv vælger. Defaultet kan altid overskrives manuelt.
    const intv = pendingProjectedSeriesInfo?.dominantIntervalDays;
    if (!intv || intv <= 0) {
      setProjectedMoveSyncStart(false);
      setProjectedMoveSyncNext(true);
      return;
    }
    let delta = 0;
    try {
      delta = Math.abs(differenceInCalendarDays(
        parseISO(pendingProjectedMove.toDate),
        parseISO(pendingProjectedMove.fromDate),
      ));
    } catch {}
    if (delta >= intv) {
      setProjectedMoveSyncStart(true);
      setProjectedMoveSyncNext(false);
    } else {
      setProjectedMoveSyncStart(false);
      setProjectedMoveSyncNext(true);
    }
  }, [pendingProjectedMove, pendingProjectedSeriesInfo?.dominantIntervalDays]);
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
  //  - MouseSensor: 8px aktiverings-tærskel → drag starter først efter en
  //    bevidst håndbevægelse. Det betyder at klik på tekst, knapper og
  //    expand-toggles i aftalekortet aldrig misforstås som drag, selv hvis
  //    musen rykker sig et par pixels mellem mousedown og mouseup.
  //  - TouchSensor: kort delay (120 ms) + tolerance (8 px) — så et tap
  //    stadig fungerer som klik på mobil/tablet.
  //  - KeyboardSensor: tilgængelighed (Space/Enter + piletaster).
  // PointerSensor importeres for bagudkompatibilitet men er bevidst ikke
  // aktiv — Mouse/Touch dækker alle scenarier stabilt.
  void PointerSensor;
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
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
    // Status-filter — gør store puljer lettere at fokusere på.
    if (unassignedStatusFilter !== "all") {
      list = list.filter((j: any) => {
        const hasGps = j.latitude != null && j.longitude != null;
        if (unassignedStatusFilter === "pending") return j.status === "pending";
        // "ready" = klar til auto-fordel: ikke pending, har GPS, har dato.
        return j.status !== "pending" && hasGps && (j.preferred_date || j.next_service_date);
      });
    }
    // Urgency-filter (relativt til i dag).
    if (urgencyFilter.size > 0) {
      const today = todayStr();
      const tomorrow = format(addDays(parseISO(today), 1), "yyyy-MM-dd");
      const weekEnd = format(addDays(parseISO(today), 7), "yyyy-MM-dd");
      list = list.filter((j: any) => {
        const d = effectiveJobDate(j);
        let key: UrgencyKey;
        if (!d) key = "later";
        else if (d < today) key = "overdue";
        else if (d === today) key = "today";
        else if (d === tomorrow) key = "tomorrow";
        else if (d <= weekEnd) key = "thisweek";
        else key = "later";
        return urgencyFilter.has(key);
      });
    }
    if (postcodeFilter.size > 0) {
      list = list.filter((j: any) => j.zip_code && postcodeFilter.has(String(j.zip_code)));
    }
    if (serviceFilter.size > 0) {
      list = list.filter((j: any) => {
        const items = effectiveJobItems(j) as any[];
        return items.some((it) => serviceFilter.has(String(it.service_name || "").trim()));
      });
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
  }, [unassigned, search, sortBy, unassignedStatusFilter, urgencyFilter, postcodeFilter, serviceFilter]);

  // Facets: postnumre + services i den nuværende pulje (uden urgency/postcode/service-
  // filtre, så brugeren kan se totalen pr. værdi). Beregnes fra `unassigned`
  // efter status+search, så facets viser hvad der reelt er at vælge mellem.
  const facetBase = useMemo(() => {
    let list = [...unassigned];
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((j: any) =>
        j.customer_name?.toLowerCase().includes(q) ||
        j.address?.toLowerCase().includes(q) ||
        j.city?.toLowerCase().includes(q),
      );
    }
    if (unassignedStatusFilter !== "all") {
      list = list.filter((j: any) => {
        const hasGps = j.latitude != null && j.longitude != null;
        if (unassignedStatusFilter === "pending") return j.status === "pending";
        return j.status !== "pending" && hasGps && (j.preferred_date || j.next_service_date);
      });
    }
    return list;
  }, [unassigned, search, unassignedStatusFilter]);

  const postcodeFacets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of facetBase as any[]) {
      const z = j.zip_code ? String(j.zip_code).trim() : "";
      if (!z) continue;
      counts.set(z, (counts.get(z) ?? 0) + 1);
    }
    return Array.from(counts.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [facetBase]);

  const serviceFacets = useMemo(() => {
    const counts = new Map<string, number>();
    for (const j of facetBase as any[]) {
      const items = effectiveJobItems(j) as any[];
      const seen = new Set<string>();
      for (const it of items) {
        const name = String(it.service_name || "").trim();
        if (!name || seen.has(name)) continue;
        seen.add(name);
        counts.set(name, (counts.get(name) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([value, count]) => ({ value, label: value, count }));
  }, [facetBase]);

  const activeAdvancedFilterCount =
    urgencyFilter.size + postcodeFilter.size + serviceFilter.size;

  const unassignedTotal = useMemo(
    () => filteredUnassigned.reduce((s: number, j: any) => s + Number(j.total_amount || 0), 0),
    [filteredUnassigned],
  );

  // ─── Bulk-selection: hold valg i sync med listen ───
  // Hvis en valgt aftale forsvinder fra "Aftaler uden rute" (blev
  // tildelt en rute, annulleret, eller filtreret væk fra serveren),
  // skal vi rydde dens id ud af selectedJobIds. Ellers viser tælleren
  // "1 valgt" mens highlight'et peger på ingenting — kilden til den
  // klassiske "1 af 0 valgt"-forvirring.
  useEffect(() => {
    if (selectedJobIds.size === 0) return;
    const live = new Set((unassigned as any[]).map((j) => j.id));
    let changed = false;
    const next = new Set<string>();
    selectedJobIds.forEach((id) => {
      if (live.has(id)) next.add(id);
      else changed = true;
    });
    if (changed) setSelectedJobIds(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unassigned]);

  // Antal valgte aftaler der pt. er synlige i listen — det er DEM bulk-
  // handlingerne reelt rammer i denne visning. Vises sammen med "skjulte
  // valgte" så brugeren forstår hvorfor tallet kan afvige fra totalen.
  const selectedVisibleCount = useMemo(() => {
    if (selectedJobIds.size === 0) return 0;
    let n = 0;
    for (const j of filteredUnassigned as any[]) if (selectedJobIds.has(j.id)) n++;
    return n;
  }, [filteredUnassigned, selectedJobIds]);
  const selectedHiddenCount = selectedJobIds.size - selectedVisibleCount;

  /** Periode-overblik vist i toolbaren — giver hurtigt overblik over hvor
   *  meget arbejde der er planlagt i den viste måned/uge. */
  const periodSummary = useMemo(() => {
    const routeCount = calendarRoutesRaw.length;
    const stopCount = calendarStops.length;
    const workMinutes = (calendarStops as any[]).reduce(
      (sum, s) => sum + (Number(s.duration_minutes) || 0),
      0,
    );
    return { routeCount, stopCount, workMinutes };
  }, [calendarRoutesRaw.length, calendarStops]);

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
    const shiftedTargetDates = new Set(Array.from(shiftsByOriginal.values()));
    return shifted
      .map((p) => {
        // Klip kun projektioner væk der ligger før basisrutens dato når kilden
        // IKKE har en route-date som kalender-anker. For ankrede serier er
        // datoer før basisruten legitime — fx d. 14 når basisruten er d. 28 og
        // aftalen kører hver 14. dag.
        const baseMinDate = minDateByBaseRouteId.get(p.baseRouteId);
        const hasAnchoredSource = p.sourceKeys.some((key) => anchoredSourceKeys.has(key));
        const isShiftedOccurrence = shiftsByOriginal.get(`${p.baseRouteId}|${p.date}`) !== undefined
          || shiftedTargetDates.has(p.date);
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

  // ── Soft target-konflikter + foreslået fri dato for projiceret-flyt ──
  const { conflicts: projectedTargetConflicts } = useDayConflicts(
    businessId,
    pendingProjectedMove?.toDate || undefined,
  );
  const projectedTargetWarnings = useMemo<string[]>(() => {
    return projectedTargetConflicts
      .filter((c) => c.stops.length >= 2)
      .map((c) => {
        const names = Array.from(new Set(c.stops.map((s) => s.label).filter(Boolean))).slice(0, 3).join(", ");
        const overlap = c.overlapsTime ? " (tidsoverlap)" : "";
        return `Medarbejder har allerede ${c.stops.length} stops denne dag${overlap}${names ? `: ${names}` : ""}.`;
      });
  }, [projectedTargetConflicts]);
  const projectedSuggestedDate = useMemo<string | null>(() => {
    if (!pendingProjectedMove) return null;
    if (projectedTargetWarnings.length === 0) return null;
    const baseId = pendingProjectedMove.baseRouteId;
    const occupiedSeriesDates = new Set<string>();
    for (const r of calendarRoutesRaw) {
      if ((r as any).id === baseId || (r as any).base_route_id === baseId) {
        occupiedSeriesDates.add(String((r as any).route_date).slice(0, 10));
      }
    }
    for (const r of virtualCalendarRoutes) {
      if ((r as any).baseRouteId === baseId && (r as any).route_date !== pendingProjectedMove.fromDate) {
        occupiedSeriesDates.add(String((r as any).route_date).slice(0, 10));
      }
    }
    const conflictDates = new Set<string>([pendingProjectedMove.toDate]);
    return findNearestFreeDate(pendingProjectedMove.toDate, (iso) =>
      occupiedSeriesDates.has(iso) || conflictDates.has(iso),
    );
  }, [pendingProjectedMove, projectedTargetWarnings, calendarRoutesRaw, virtualCalendarRoutes]);

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

  /* Auto-geocode jobs missing coords.
   * Vi rydder hele puljen op til 25 ad gangen — det er hurtigt nok at
   * geocoding føles "automatisk" uden manuel knap, men ikke så stort
   * at vi rate-limiter edge-funktionen ved første sideloading. Effekten
   * kører igen når listen ændrer længde, så restende stragglere fanges. */
  useEffect(() => {
    if (!businessId || geocoding) return;
    const needsGeocode = unassigned.filter((j: any) =>
      (j.address || j.zip_code || j.city) && (j.latitude == null || j.longitude == null),
    );
    if (needsGeocode.length === 0) return;
    setGeocoding(true);
    (async () => {
      for (const job of needsGeocode.slice(0, 25)) {
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
      qc.invalidateQueries({ queryKey: ["unassigned-jobs"] });
      setGeocoding(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unassigned.length, businessId]);

  // Auto-fordel: lægger valgte/alle aftaler ind på den bedst matchende
  // eksisterende rute. Bruger samme RPC som "Foreslå rute"-dialogen, men
  // holder selv styr på kapacitet og sequence-numre LOKALT under kørslen
  // — så to aftaler ikke ender på samme plads og en rute ikke fyldes ud
  // over kapacitet bare fordi RPC'en ikke ved at vi lige har lagt noget på.
  const [autoAssigning, setAutoAssigning] = useState(false);

  type SkipReason =
    | "no-gps" | "no-date" | "pending"
    | "no-route" | "full" | "rpc-error" | "save-error";
  // Returnerer en hel sætning med korrekt ental/flertal, så fx "1 aftale
  // mangler adresse" og "3 aftaler mangler adresse" begge giver mening.
  const skipPhrase = (reason: SkipReason, n: number): string => {
    const aftale = n === 1 ? "aftale" : "aftaler";
    switch (reason) {
      case "no-gps":     return `${n} ${aftale} mangler adresse`;
      case "no-date":    return `${n} ${aftale} mangler dato`;
      case "pending":    return `${n} ${aftale} afventer godkendelse`;
      case "no-route":   return `${n} ${aftale} havde ingen rute på dagen`;
      case "full":       return `${n} ${aftale} kunne ikke få plads`;
      case "rpc-error":  return `${n} ${aftale} kunne ikke hentes forslag for`;
      case "save-error": return `${n} ${aftale} kunne ikke gemmes`;
    }
  };

  const runAutoAssignCore = async (
    jobs: any[],
    opts: { setBusy: (b: boolean) => void; sourceLabel: "alle" | "valgte" },
  ) => {
    if (!businessId) return;
    opts.setBusy(true);
    // Lokale akkumulatorer pr. rute — opdateres efter hver succes så næste
    // job ser den korrekte kapacitet i samme batch.
    const usage = new Map<string, { minutes: number; stops: number }>();
    const seqByRoute = new Map<string, number>();
    const getUsage = (id: string) => usage.get(id) ?? { minutes: 0, stops: 0 };
    const getSeq = (id: string) => {
      const cur = seqByRoute.get(id);
      if (cur != null) return cur;
      const base = (calendarStops as any[]).filter((s) => s.route_id === id).length;
      seqByRoute.set(id, base);
      return base;
    };

    let assigned = 0;
    const skipped: { job: any; reason: SkipReason }[] = [];
    // Tracker: stop-ids vi har oprettet (til Fortryd) + hvor mange aftaler
    // der røg på hver rute (til læselig per-rute opsummering).
    const createdStopIds: string[] = [];
    const perRouteCount = new Map<string, { name: string; date: string; n: number }>();

    try {
      for (const job of jobs) {
        if (job.status === "pending") { skipped.push({ job, reason: "pending" }); continue; }
        if (job.latitude == null || job.longitude == null) { skipped.push({ job, reason: "no-gps" }); continue; }
        const jobDateRaw = job.preferred_date || job.next_service_date;
        if (!jobDateRaw) { skipped.push({ job, reason: "no-date" }); continue; }
        const jobDate = String(jobDateRaw).slice(0, 10);
        const duration = Number(job.estimated_duration_minutes) || 30;

        let suggestions: any[] = [];
        try {
          const { data: rpc, error } = await (supabase as any).rpc("suggest_routes_for_stop", {
            _business_id: businessId,
            _date: jobDate,
            _latitude: job.latitude,
            _longitude: job.longitude,
            _service_id: job.order_items?.[0]?.service_id ?? null,
            _duration_minutes: duration,
            _zone_key: deriveZoneKey(job.zip_code),
            _weather_bad: false,
            _skill_key: null,
          });
          if (error) { skipped.push({ job, reason: "rpc-error" }); continue; }
          suggestions = (rpc as any)?.suggestions || [];
        } catch {
          skipped.push({ job, reason: "rpc-error" });
          continue;
        }

        if (suggestions.length === 0) { skipped.push({ job, reason: "no-route" }); continue; }

        // Find første forslag der HAR plads INKL. det vi lige har akkumuleret
        // på samme rute i denne kørsel.
        const top = suggestions.find((s: any) => {
          const extra = getUsage(s.route_id);
          const minutesAfter = s.minutes_used + extra.minutes + duration;
          const stopsAfter = s.stop_count + extra.stops + 1;
          const overHours = s.capacity?.hours_max != null && minutesAfter / 60 > s.capacity.hours_max;
          const overStops = s.capacity?.stops_max != null && stopsAfter > s.capacity.stops_max;
          return !overHours && !overStops;
        });
        if (!top) { skipped.push({ job, reason: "full" }); continue; }

        const seq = getSeq(top.route_id);
        try {
          const newStop = await addStop.mutateAsync({
            route_id: top.route_id,
            order_id: job.id,
            sequence: seq,
            customer_name: job.customer_name,
            customer_phone: job.customer_phone,
            address: job.address || [job.zip_code, job.city].filter(Boolean).join(" "),
            latitude: job.latitude,
            longitude: job.longitude,
            service_summary: serviceSummaryForJob(job),
            duration_minutes: duration,
            time_window_start: job.preferred_time_start || null,
            time_window_end: job.preferred_time_end || null,
          });
          if (newStop?.id) createdStopIds.push(newStop.id);
          const prev = perRouteCount.get(top.route_id);
          perRouteCount.set(top.route_id, {
            name: top.route_name || prev?.name || "Rute",
            date: top.route_date || prev?.date || jobDate,
            n: (prev?.n ?? 0) + 1,
          });
          const cur = getUsage(top.route_id);
          usage.set(top.route_id, { minutes: cur.minutes + duration, stops: cur.stops + 1 });
          seqByRoute.set(top.route_id, seq + 1);
          assigned++;
        } catch {
          skipped.push({ job, reason: "save-error" });
        }
      }

      invalidateRouteSyncQueries(qc);

      // Lav læselig opsummering: hvis flere blev sprunget over af samme
      // årsag — skriv "X mangler adresse, Y ruterne fyldte" i stedet for
      // bare et tal.
      const reasonCounts = new Map<SkipReason, number>();
      for (const s of skipped) reasonCounts.set(s.reason, (reasonCounts.get(s.reason) ?? 0) + 1);
      const reasonSummary = Array.from(reasonCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .map(([r, n]) => skipPhrase(r, n))
        .join(" · ");

      // Per-rute opsummering: "2 til Mandagsrute · 1 til Torsdagsrute"
      const routeSummary = (() => {
        if (perRouteCount.size === 0) return "";
        const entries = Array.from(perRouteCount.values()).sort((a, b) => b.n - a.n);
        const top3 = entries.slice(0, 3).map((e) => `${e.n} til ${e.name}`).join(" · ");
        const rest = entries.length - 3;
        return rest > 0 ? `${top3} · +${rest} ruter mere` : top3;
      })();

      if (assigned > 0) {
        const total = assigned + skipped.length;
        const parts: string[] = [];
        if (routeSummary) parts.push(routeSummary);
        if (skipped.length > 0) parts.push(`Sprunget over: ${reasonSummary}`);
        toast.success(
          `Fordelt ${assigned} af ${total} aftale${total === 1 ? "" : "r"}`,
          {
            description: parts.join(" — ") || "Kapacitetsbjælkerne i kalenderen er opdateret.",
            duration: 10000,
            action: createdStopIds.length > 0 ? {
              label: "Fortryd",
              onClick: async () => {
                let ok = 0;
                for (const id of createdStopIds) {
                  try { await deleteStop.mutateAsync(id); ok++; } catch { /* ignorer */ }
                }
                invalidateRouteSyncQueries(qc);
                if (ok === createdStopIds.length) {
                  toast.success(`Fortrudt — ${ok} aftale${ok === 1 ? "" : "r"} fjernet fra ruterne`);
                } else if (ok > 0) {
                  toast.warning(`Fortrudt delvist — ${ok} af ${createdStopIds.length} fjernet`);
                } else {
                  toast.error("Kunne ikke fortryde", { description: "Aftalerne er måske allerede ændret." });
                }
              },
            } : undefined,
          },
        );
        if (opts.sourceLabel === "valgte") setSelectedJobIds(new Set());
      } else {
        toast.error("Ingen aftaler kunne fordeles", {
          description: skipped.length > 0
            ? reasonSummary + ". Opret en rute på dagen eller flyt opstartsdatoen."
            : "Opret en rute på den ønskede dag først, eller flyt opstartsdatoen.",
          duration: 8000,
        });
      }
    } finally {
      opts.setBusy(false);
    }
  };

  const runAutoAssign = async () => {
    if (autoAssigning) return;
    const candidates = (unassigned as any[]).filter(
      (j) => j.status !== "pending"
        && j.latitude != null && j.longitude != null
        && (j.preferred_date || j.next_service_date),
    );
    if (candidates.length === 0) {
      toast.info("Ingen aftaler kan auto-fordeles", {
        description: "Aftaler skal have adresse på kortet og en ønsket dato.",
      });
      return;
    }
    // Tidligere skar vi listen ned til 25 — det er forvirrende når brugeren
    // ser "Auto-fordel 40 aftaler" og kun 25 bliver kørt. Vi tager nu hele
    // listen; tunge batches sker stadig sekventielt så DB ikke overbelastes.
    await runAutoAssignCore(candidates, { setBusy: setAutoAssigning, sourceLabel: "alle" });
  };

  // Hold refs synkroniseret så keyboard-shortcuts altid kalder seneste closure.
  useEffect(() => {
    runAutoAssignRef.current = runAutoAssign;
    focusSearchRef.current = () => {
      const el = unassignedSearchRef.current;
      if (!el) return;
      el.focus();
      try { el.select(); } catch { /* select kan kaste på read-only inputs */ }
    };
  });

  const runBulkAutoAssign = async () => {
    if (bulkBusy || selectedJobIds.size === 0) return;
    const candidates = (unassigned as any[]).filter((j) => selectedJobIds.has(j.id));
    if (candidates.length === 0) {
      toast.info("Ingen valgte aftaler at fordele");
      return;
    }
    await runAutoAssignCore(candidates, { setBusy: setBulkBusy, sourceLabel: "valgte" });
  };

  /** Annullér de valgte aftaler — sætter status til 'cancelled' så de
   *  forsvinder fra "Aftaler uden rute". Vi henter forrige status først så
   *  vi kan tilbyde "Fortryd" i succes-toasten — sikrere end window.confirm
   *  som ellers gjorde dialogen til en blokerende systembesked. */
  const runBulkCancel = async () => {
    if (!businessId || bulkBusy || selectedJobIds.size === 0) return;
    const ids = Array.from(selectedJobIds);
    setBulkBusy(true);
    try {
      // Snapshot tidligere status så fortryd kan sætte rækkerne tilbage
      // til præcis dén status de havde — ikke en gæt-default.
      const prev = (unassigned as any[])
        .filter((j) => selectedJobIds.has(j.id))
        .map((j) => ({ id: j.id as string, status: (j.status as string) || "confirmed" }));
      const { error } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .in("id", ids);
      if (error) throw error;
      setSelectedJobIds(new Set());
      invalidateRouteSyncQueries(qc);
      toast.success(`${ids.length} aftale${ids.length === 1 ? "" : "r"} annulleret`, {
        description: "De er fjernet fra 'Aftaler uden rute'.",
        duration: 8000,
        action: {
          label: "Fortryd",
          onClick: async () => {
            try {
              // Sæt hver rækker tilbage til sin oprindelige status.
              const byStatus = new Map<string, string[]>();
              for (const row of prev) {
                const list = byStatus.get(row.status) ?? [];
                list.push(row.id);
                byStatus.set(row.status, list);
              }
              for (const [status, rowIds] of byStatus.entries()) {
                await supabase.from("orders").update({ status: status as any }).in("id", rowIds);
              }
              invalidateRouteSyncQueries(qc);
              toast.success("Annullering fortrudt");
            } catch (e: any) {
              toast.error("Kunne ikke fortryde annulleringen", { description: e?.message });
            }
          },
        },
      });
    } catch (e: any) {
      toast.error("Kunne ikke annullere aftalerne", { description: e?.message });
    } finally {
      setBulkBusy(false);
    }
  };

  /* Keyboard shortcuts: ←/→ for date, T for today, M for map, N for new route */
  // Ref så vi kan kalde optimize-handleren fra keydown uden at depende på
  // dens definition-rækkefølge (den er defineret længere nede).
  const optimizeRouteRef = useRef<(id: string) => void>(() => {});
  // Refs så keyboard-shortcuts kan kalde de senest definerede handlers
  // uden at vi skal hejse hele runAutoAssign op før effekten.
  const runAutoAssignRef = useRef<() => void | Promise<void>>(() => {});
  const focusSearchRef = useRef<() => void>(() => {});
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
      if (e.key === "/") {
        // "/" — som GitHub/Linear: hop til søgefeltet i "Aftaler uden rute".
        e.preventDefault();
        focusSearchRef.current();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        setDate((d) => format(view === "week" ? addWeeks(parseISO(d), -1) : addMonths(parseISO(d), -1), "yyyy-MM-dd"));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setDate((d) => format(view === "week" ? addWeeks(parseISO(d), 1) : addMonths(parseISO(d), 1), "yyyy-MM-dd"));
      } else if (e.key.toLowerCase() === "t") {
        setDate(todayStr());
      } else if (e.key.toLowerCase() === "n") {
        setCreateOpen(true);
      } else if (e.key.toLowerCase() === "a") {
        // "A" — auto-fordel alle aftaler uden rute (eller find bedste rute
        // hvis kun én er klar). Springer over hvis intet er klar.
        e.preventDefault();
        void runAutoAssignRef.current();
      } else if (e.key === "Escape") {
        // Prioritet: 1) ryd bulk-valg (oftest brugt) 2) luk stop-panel.
        if (selectedJobIds.size > 0) {
          setSelectedJobIds(new Set());
          lastSelectedJobIdRef.current = null;
        } else if (selectedStopId) {
          setSelectedStopId(null);
        }
      } else if ((e.key === "Delete" || e.key === "Backspace") && selectedStopId) {
        // Fjern det aktuelt valgte stop fra ruten. Virtuelle (projicerede)
        // stops kan ikke slettes — de skal flyttes via basis-ruten.
        if (selectedStopId.startsWith("virtual-stop:")) {
          toast.message("Projicerede stops kan ikke slettes — åbn basis-ruten for at ændre.");
          return;
        }
        e.preventDefault();
        const id = selectedStopId;
        deleteStop.mutate(id, {
          onSuccess: () => {
            toast.success("Stop fjernet fra rute");
            setSelectedStopId(null);
          },
          onError: (err: any) => toast.error("Kunne ikke fjerne stoppet", { description: err?.message }),
        });
      } else if (e.key === "?" || (e.shiftKey && e.key === "/")) {
        e.preventDefault();
        setShortcutsOpen(true);
      } else if (e.key.toLowerCase() === "p") {
        e.preventDefault();
        setPrintOpen(true);
      } else if (e.key.toLowerCase() === "d") {
        e.preventDefault();
        setDayDetailOpen(true);
      } else if (e.key.toLowerCase() === "j") {
        e.preventDefault();
        setDate((d) => format(addDays(parseISO(d), 1), "yyyy-MM-dd"));
      } else if (e.key.toLowerCase() === "k") {
        e.preventDefault();
        setDate((d) => format(addDays(parseISO(d), -1), "yyyy-MM-dd"));
      } else if (e.key.toLowerCase() === "o") {
        if (editingRoute) {
          e.preventDefault();
          optimizeRouteRef.current(editingRoute.id);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedStopId, view, history, editingRoute, selectedJobIds, deleteStop]);

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
    // Planner-specifik skeleton (sidebar + kalender-grid) — virker mere
    // "rigtig" end den generiske ShellSkeleton fordi formen matcher.
    return <PlannerSkeleton />;
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
    // Auto-scroll: ruller lister/kalender når kortet trækkes mod en kant.
    startDragAutoScroll(() => activeDragPointRef.current);
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
      setDragOverTargetId(null);
      clearDragEta();
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
        setDragOverTargetId(`route:${targetRoute.id}`);
        // ── ETA-estimat: ekstra køretid (luftlinje × 1.3 ÷ 50 km/t) +
        //    ny kapacitets-% baseret på job.duration_minutes. Grovt nok
        //    til en live drag-preview uden ekstra netværkskald.
        try {
          const job = activeData.job ?? {};
          let extraDriveMin: number | null = null;
          if (job.latitude != null && job.longitude != null && stopsOnRoute.length) {
            let nearestM = Infinity;
            for (const s of stopsOnRoute) {
              if (s.latitude == null || s.longitude == null) continue;
              const d = haversineMeters(Number(job.latitude), Number(job.longitude), Number(s.latitude), Number(s.longitude));
              if (d < nearestM) nearestM = d;
            }
            if (Number.isFinite(nearestM)) {
              // tur/retur ~ 2× luftlinje × 1.3 omveje, 50 km/t snit
              extraDriveMin = (nearestM * 2 * 1.3) / 1000 / 50 * 60;
            }
          }
          const cap = capacityByDate.get(targetRoute.route_date);
          let newLoadPct: number | null = null;
          if (cap && cap.minutes_capacity > 0) {
            const addMin = Number(job.duration_minutes) || 0;
            newLoadPct = ((cap.minutes_booked + addMin) / cap.minutes_capacity) * 100;
          }
          setDragEta({ extraDriveMin, newLoadPct });
        } catch { clearDragEta(); }
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
        setDragOverTargetId(`day:${overData.date}`);
        const cap = capacityByDate.get(overData.date);
        const job = activeData.job ?? {};
        let newLoadPct: number | null = null;
        if (cap && cap.minutes_capacity > 0) {
          const addMin = Number(job.duration_minutes) || 0;
          newLoadPct = ((cap.minutes_booked + addMin) / cap.minutes_capacity) * 100;
        }
        setDragEta({ newLoadPct, message: "Opretter ny rute" });
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
        setDragOverTargetId(`day:${overData.date}`);
        clearDragEta();
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
          setDragOverTargetId(`route:${target.id}`);
          clearDragEta();
          return;
        }
        writeDragValidationDebounced({
          targetId: `route:${target.id}`,
          severity: "ok",
          topMessage: "Slip her for at flette ruterne",
          result: { ok: true, errors: [], warnings: [], suggestions: [] } as any,
        });
        setDragOverTargetId(`route:${target.id}`);
        clearDragEta();
        return;
      }

      clearDragValidation();
      setDragOverTargetId(null);
      clearDragEta();
    } catch {
      // Validering må ALDRIG kaste — ryd state stille og fald tilbage til
      // den klassiske flow (drop-handler beholder sin egen guard).
      clearDragValidation();
      setDragOverTargetId(null);
      clearDragEta();
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
  // Hold ref opdateret så keyboard-shortcut'en "O" kan kalde den seneste version.
  optimizeRouteRef.current = handleCalendarOptimizeRoute;

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
    stopDragAutoScroll();
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
    setDragOverTargetId(null);
    clearDragEta();
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
      // Hvis det er en NATURLIG kadence-forekomst af samme serie der ville
      // ligge på mål-datoen, blokerer vi ikke længere. I stedet tilbyder vi
      // brugeren at "auto-skippe" den dag, så der ikke ender to forekomster
      // oven i hinanden. (En shifted-forekomst flyttet hertil tidligere er
      // stadig en hård konflikt — server-RPC'en fanger den.)
      const autoSkipCadence = !!collidingVirtual;
      setPendingProjectedMove({
        baseRouteId,
        routeName: activeData.route.name || "Rute",
        fromDate,
        toDate,
        autoSkipCadence,
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
        // Batchet så hurtigt dropp-tempo bliver til "N aftaler tilføjet".
        pushBatchedToast("success", "Aftale tilføjet til ruten", {
          key: "rp-add-to-route",
          successWord: "aftaler tilføjet",
          errorWord: "fejlede",
        });
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
        pushBatchedToast(
          "success",
          `Ny rute oprettet på ${format(parseISO(newDate), "d. MMM", { locale: da })}`,
          { key: "rp-create-route", successWord: "nye ruter oprettet", errorWord: "fejlede" },
        );
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
          // ── Undo: registrér så brugeren kan rulle stoppet tilbage til
          //    dets oprindelige dato. Bruger samme RPC i modsat retning;
          //    fungerer for både simple og split-genererede flytninger.
          const originalDate = currentRoute?.route_date;
          if (originalDate && originalDate !== newDate) {
            pushRouteUndo({
              label: `Flyt stop tilbage til ${format(parseISO(originalDate), "d. MMM", { locale: da })}`,
              undo: async () => {
                const { error: undoErr } = await supabase.rpc("move_stops_to_date", {
                  _stop_ids: [stop.id],
                  _target_date: originalDate,
                });
                if (undoErr) throw undoErr;
                invalidateRouteSyncQueries(qc);
                toast.success("Stop flyttet tilbage");
              },
            });
          }
          // Batchet — hurtige flytninger samles til "N stops flyttet".
          if (conflictMsg) {
            toast.success(
              `Stop flyttet til ${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`,
              { description: `⚠️ ${conflictMsg} — tjek tidsplanen` },
            );
          } else {
            pushBatchedToast(
              "success",
              `Stop flyttet til ${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`,
              { key: "rp-move-stop", successWord: "stops flyttet", errorWord: "fejlede" },
            );
          }
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
      toastSuccessWithUndo({
        message: scope === "future"
          ? `Ruteserien forskudt til ${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`
          : `Rute flyttet til ${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`,
        description: "Klik Fortryd for at rulle tilbage.",
      });
      setPendingRouteMove(null);
      // Klogt: spørg KUN om optimering hvis vores estimat viser at der
      // reelt er noget at vinde (≥5 km OG ≥20 % besparelse). Ellers
      // pester vi ikke brugeren — ruten er allerede fint planlagt.
      tryPromptOptimize(route.id, route.name, "moved");
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
            ? "Fremtidige forekomster af gentagne aftaler følger med."
            : "Kilderuten blev slettet automatisk.",
        duration: 8000,
        action: scope === "single" ? {
          label: "Fortryd",
          onClick: async () => {
            try {
              const ran = await routeHistory.undoLast();
              if (ran) toast.success(`Fortrudt: ${ran.label}`);
            } catch (e: any) {
              toast.error("Kunne ikke fortryde", { description: e?.message });
            }
          },
        } : undefined,
      });
      setPendingRouteMerge(null);
      invalidateRouteSyncQueries(qc);
      qc.invalidateQueries({ queryKey: ["recurring-agreements-for-planner"] });
      qc.invalidateQueries({ queryKey: ["recurring-base-routes"] });
      qc.invalidateQueries({ queryKey: ["route-series-info"] });

      // Efter en flet er målruten næsten altid blevet større. Spørg om vi
      // skal optimere stop-rækkefølgen så den nye samlede rute kører
      // geografisk korrekt.
      if (!result?.alreadyMerged) {
        // Klogt: spørg KUN hvis estimatet faktisk viser meningsfuld
        // besparelse — ellers er fletteren bare blevet en længere rute
        // der allerede kører fornuftigt.
        tryPromptOptimize(target.id, target.name, "merged");
      }

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

  /**
   * Klog gatekeeper: kun spørg brugeren om auto-optimering hvis der reelt er
   * noget at vinde. Bruger `estimateOptimizationGain` til at sammenligne
   * den nuværende rækkefølge med en nearest-neighbour heuristik. Hvis
   * besparelsen er for lille (eller brugeren nylig har sagt "nej tak" til
   * denne rute) viser vi ingenting — så undgår vi nag.
   */
  const tryPromptOptimize = (routeId: string, routeName: string | null, reason: "moved" | "merged") => {
    if (!routeId) return;
    // Ekstra defensiv: hent stops fra cachen så vi aldrig viser prompten
    // for en rute uden data (fx hvis kald sker mellem invalidate og refetch).
    const stops = calendarStops.filter((s: any) => s.route_id === routeId);
    if (stops.length === 0) return;
    const est = estimateOptimizationGain(routeId, stops as any[]);
    if (!est.worth) return;
    setPendingOptimizePrompt({
      routeId,
      routeName: routeName || "Rute",
      reason,
      estimate: {
        savingsKm: est.savingsKm,
        savingsPct: est.savingsPct,
        currentKm: est.currentKm,
        suggestedKm: est.suggestedKm,
      },
    });
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
    <div className={cn(plannerTheme === "dark" && "dark")}>
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
        stopDragAutoScroll();
        activeDragPointRef.current = null;
        activeDragOriginRef.current = null;
        setRouteDragPoint(null);
        activeRouteDragPointRef.current = null;
        activeRouteDragOriginRef.current = null;
        clearDragValidation();
        setDragOverTargetId(null);
        clearDragEta();
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
          <div className="hidden 2xl:flex items-center gap-2 flex-wrap justify-end">
            {/* Slank topbar: kun de handlinger der bruges dagligt ligger frit fremme.
                Print, tidslinje, planlægning, opret bestilling, tæthed, tema og
                genveje er flyttet ind i "Mere"-menuen for at reducere visuel støj. */}
            {(periodSummary.routeCount > 0 || unassigned.length > 0) && (
              <div
                className="hidden md:inline-flex items-center gap-2 h-8 pl-2.5 pr-3 rounded-md bg-secondary/40 border border-border/60 text-[11px] tabular-nums"
                title={`${periodSummary.routeCount} ${periodSummary.routeCount === 1 ? "rute" : "ruter"}, ${periodSummary.stopCount} stop og ca. ${formatDurationMin(periodSummary.workMinutes)} arbejde i visningen${unassigned.length > 0 ? ` · ${unassigned.length} aftale${unassigned.length === 1 ? "" : "r"} mangler en rute` : ""}`}
              >
                <span className="inline-flex items-center gap-1">
                  <RouteIcon className="h-3 w-3 text-muted-foreground/70" />
                  <span className="font-bold text-foreground">{periodSummary.routeCount}</span>
                  <span className="text-muted-foreground/80">{periodSummary.routeCount === 1 ? "rute" : "ruter"}</span>
                </span>
                <span className="h-3 w-px bg-border/80" />
                <span className="inline-flex items-center gap-1">
                  <MapPin className="h-3 w-3 text-muted-foreground/70" />
                  <span className="font-bold text-foreground">{periodSummary.stopCount}</span>
                  <span className="text-muted-foreground/80">stop</span>
                </span>
                {periodSummary.workMinutes > 0 && (
                  <>
                    <span className="h-3 w-px bg-border/80" />
                    <span className="hidden xl:inline-flex items-center gap-1">
                      <Clock className="h-3 w-3 text-muted-foreground/70" />
                      <span className="font-bold text-foreground">{formatDurationMin(periodSummary.workMinutes, { short: true })}</span>
                    </span>
                  </>
                )}
                {unassigned.length > 0 && (
                  <>
                    <span className="h-3 w-px bg-border/80" />
                    <span className="inline-flex items-center gap-1 text-amber-600 dark:text-amber-400" title={`${unassigned.length} aftale${unassigned.length === 1 ? "" : "r"} mangler en rute`}>
                      <Inbox className="h-3 w-3" />
                      <span className="font-bold">{unassigned.length}</span>
                      <span className="opacity-80">uplanlagt{unassigned.length === 1 ? "" : "e"}</span>
                    </span>
                  </>
                )}
              </div>
            )}

            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList className="h-8 p-0.5 rounded-md">
                <TabsTrigger value="month" className="text-[11px] font-semibold h-6 px-2.5 rounded-md">Måned</TabsTrigger>
                <TabsTrigger value="week" className="text-[11px] font-semibold h-6 px-2.5 rounded-md">Uge</TabsTrigger>
              </TabsList>
            </Tabs>

            {/* Filtre — assignee og forekomst-status */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "h-8 gap-1.5 rounded-md border-border/70 font-semibold transition-colors",
                    filtersActive
                      ? "border-accent/60 bg-accent/[0.08] text-accent hover:bg-accent/[0.12]"
                      : "hover:border-border hover:text-foreground"
                  )}
                >
                  <Filter className="h-3.5 w-3.5" />
                  Filtre
                  {filtersActive && (
                    <Badge className="h-4 min-w-[16px] px-1 text-[10px] font-bold tabular-nums bg-accent text-accent-foreground border-0 rounded-full">
                      {filterAssigneeIds.length + filterStatuses.length}
                    </Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-72 p-3 space-y-3">
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Medarbejdere</Label>
                    {filterAssigneeIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterAssigneeIds([])}
                        className="text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded px-1.5 py-0.5 transition-colors"
                      >
                        Ryd
                      </button>
                    )}
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-0.5 rounded-md border border-border/60 p-1.5">
                    {activeEmployees.length === 0 && (
                      <p className="text-[11px] text-muted-foreground px-1.5 py-1">Ingen medarbejdere</p>
                    )}
                    {activeEmployees.map((emp: any) => {
                      const checked = filterAssigneeIds.includes(emp.id);
                      return (
                        <label
                          key={emp.id}
                          className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-secondary cursor-pointer text-xs transition-colors"
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
                    <Label className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Status</Label>
                    {filterStatuses.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setFilterStatuses([])}
                        className="text-[10px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary rounded px-1.5 py-0.5 transition-colors"
                      >
                        Ryd
                      </button>
                    )}
                  </div>
                  <div className="space-y-0.5 rounded-md border border-border/60 p-1.5">
                    {STATUS_OPTIONS.map((opt) => {
                      const checked = filterStatuses.includes(opt.value);
                      return (
                        <label
                          key={opt.value}
                          className="flex items-center gap-2 px-1.5 py-1 rounded-md hover:bg-secondary cursor-pointer text-xs transition-colors"
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
                    className="w-full h-7 text-xs hover:bg-secondary active:scale-[0.99] transition-[background-color,transform] duration-150"
                    onClick={() => { setFilterAssigneeIds([]); setFilterStatuses([]); }}
                  >
                    Nulstil alle filtre
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            <div className="flex items-center gap-0.5 rounded-md border border-border/70 bg-background p-0.5 shadow-[0_1px_2px_hsl(var(--foreground)/0.04)]">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md hover:bg-secondary"
                onClick={() =>
                  setDate(format(view === "week" ? addWeeks(parseISO(date), -1) : addMonths(parseISO(date), -1), "yyyy-MM-dd"))
                }
                aria-label={view === "week" ? "Forrige uge" : "Forrige måned"}
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className="text-[13px] font-semibold capitalize min-w-[140px] text-center tabular-nums px-2.5 h-6 rounded-md hover:bg-secondary tracking-tight focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                    aria-label="Vælg dato"
                    title="Spring til specifik dato"
                  >
                    {view === "week"
                      ? `Uge ${format(parseISO(date), "I", { locale: da })} · ${format(parseISO(date), "MMM yyyy", { locale: da })}`
                      : format(parseISO(date), "MMMM yyyy", { locale: da })}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="center" className="w-auto p-0">
                  <CalendarPicker
                    mode="single"
                    selected={parseISO(date)}
                    onSelect={(d) => { if (d) setDate(format(d, "yyyy-MM-dd")); }}
                    weekStartsOn={1}
                    locale={da}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-md hover:bg-secondary"
                onClick={() =>
                  setDate(format(view === "week" ? addWeeks(parseISO(date), 1) : addMonths(parseISO(date), 1), "yyyy-MM-dd"))
                }
                aria-label={view === "week" ? "Næste uge" : "Næste måned"}
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
            </div>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  data-tour="routes-today"
                  variant="outline"
                  size="sm"
                  className="h-8 text-[11px] font-semibold rounded-md border-border/70 hover:border-border hover:bg-secondary/70 hover:text-foreground active:scale-[0.97] transition-[background-color,color,border-color,transform] duration-150"
                  onClick={() => setDate(todayStr())}
                >
                  I dag
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs">Hop tilbage til dags dato</TooltipContent>
            </Tooltip>

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
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-[0.92] transition-[background-color,color,transform] duration-150"
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
                    className="h-8 w-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-[0.92] transition-[background-color,color,transform] duration-150"
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

              <DropdownMenu>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground active:scale-[0.92] transition-[background-color,color,transform] duration-150" aria-label="Flere handlinger">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="text-xs">Flere handlinger</TooltipContent>
                </Tooltip>
                <DropdownMenuContent align="end" className="w-60">
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Handlinger</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setCreateOrderOpen(true)} className="text-xs gap-2">
                    <ShoppingBag className="h-3.5 w-3.5" /> Opret bestilling manuelt
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setPrintOpen(true)} className="text-xs gap-2">
                    <Printer className="h-3.5 w-3.5" /> Print / PDF af dagen
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setDayDetailOpen(true)} className="text-xs gap-2">
                    <ListOrdered className="h-3.5 w-3.5" /> Vis dag som tidslinje
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Visning</DropdownMenuLabel>
                  <div className="px-2 py-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Tæthed</span>
                    <DensityToggle />
                  </div>
                  <div className="px-2 py-1 flex items-center justify-between gap-2">
                    <span className="text-xs text-muted-foreground">Mørk tilstand</span>
                    <ThemeToggle />
                  </div>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShortcutsOpen(true)} className="text-xs gap-2">
                    <Keyboard className="h-3.5 w-3.5" /> Tastatur-genveje
                    <kbd className="ml-auto px-1 rounded bg-secondary text-[10px]">?</kbd>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button data-tour="routes-create-button" size="sm" className="h-8 gap-1.5 rounded-md font-semibold">
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
                      <div className="grid grid-cols-12 gap-2">
                        {ROUTE_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setNewRouteColor(c.value)}
                            title={c.name}
                            className={`relative aspect-square rounded-md transition-all duration-150 hover:scale-110 ring-offset-2 ring-offset-background shadow-[0_1px_2px_rgba(0,0,0,0.08)] ${
                              newRouteColor === c.value
                                ? "ring-2 ring-foreground scale-105 shadow-[0_3px_8px_-2px_rgba(0,0,0,0.25)]"
                                : "hover:ring-2 hover:ring-foreground/40"
                            }`}
                            style={{ background: c.value }}
                            aria-label={`Vælg farve ${c.name}`}
                          >
                            {newRouteColor === c.value && (
                              <Check className="absolute inset-0 m-auto h-3.5 w-3.5 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                            )}
                          </button>
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
                        {(() => {
                          const filtered = unassigned
                            .filter((j: any) => j.status !== "pending")
                            .filter((j: any) => {
                              const q = newRouteJobSearch.trim().toLowerCase();
                              if (!q) return true;
                              return (
                                j.customer_name?.toLowerCase().includes(q) ||
                                j.address?.toLowerCase().includes(q) ||
                                j.city?.toLowerCase().includes(q)
                              );
                            });
                          const shown = filtered.slice(0, 50);
                          return (
                            <>
                              {shown.map((j: any) => {
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
                              {filtered.length > shown.length && (
                                <div className="p-2 text-center text-[10px] text-muted-foreground bg-secondary/30">
                                  Viser {shown.length} af {filtered.length} — søg for at indsnævre
                                </div>
                              )}
                              {filtered.length === 0 && unassigned.length > 0 && (
                                <div className="p-4 text-center text-xs text-muted-foreground">
                                  Ingen aftaler matcher søgningen.
                                </div>
                              )}
                            </>
                          );
                        })()}
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
            </div>
          </div>
        }
      >
        {(() => {
          // Sidebar: Aftaler uden rute — genbruges i lg+ ResizablePanel og i
          // mobil/tablet Sheet-drawer, så drag-and-drop fungerer på alle enheder.
          const unassignedCard = (
                <Card
                   data-tour="routes-unassigned"
                   className={cn(
                     "flex flex-col h-full overflow-hidden transition-all duration-200 rounded-lg border-border/70 bg-card shadow-[0_2px_10px_-6px_hsl(var(--foreground)/0.18)]",
                     selectedJobIds.size > 0 && "ring-1 ring-accent/60 shadow-[0_10px_28px_-12px_hsl(var(--accent)/0.5)]",
                   )}
                 >
                   <div className="relative px-3.5 pt-3.5 pb-3 border-b border-border/70 bg-card space-y-3">
                    <div aria-hidden className="absolute left-0 top-0 bottom-0 w-[3px] bg-foreground/80" />
                    <div className="flex items-start gap-2.5 pr-10 xl:pr-0">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-secondary text-foreground ring-1 ring-border/70 shrink-0">
                        <Inbox className="h-4 w-4 text-foreground" />
                      </span>
                      <div className="flex-1 min-w-0">
                        <h2 className="font-bold text-sm leading-tight text-foreground truncate tracking-tight">
                          Aftaler uden rute
                        </h2>
                        {filteredUnassigned.length > 0 ? (
                          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">
                            <span className="tabular-nums font-semibold text-foreground/80">{Math.round(unassignedTotal).toLocaleString("da-DK")} kr</span> samlet
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground leading-snug mt-0.5 truncate">
                            Træk aftaler ind i kalenderen
                          </p>
                        )}
                      </div>
                      {filteredUnassigned.length > 0 && (
                        <span className="inline-flex items-center justify-center min-w-7 h-7 px-2 rounded-md bg-foreground text-background text-[11px] font-bold tabular-nums shrink-0 shadow-sm">
                          {filteredUnassigned.length}
                        </span>
                      )}
                    </div>
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        ref={unassignedSearchRef}
                        placeholder="Søg navn eller adresse..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Escape") { setSearch(""); (e.target as HTMLInputElement).blur(); } }}
                        className="h-8 pl-7 pr-12 text-xs bg-background border-border/70 rounded-md shadow-[inset_0_1px_2px_hsl(var(--foreground)/0.04)]"
                      />
                      {search ? (
                        <button
                          type="button"
                          onClick={() => setSearch("")}
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded hover:bg-secondary text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                          aria-label="Ryd søgning"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      ) : (
                        <kbd
                          aria-hidden
                          title="Tryk / for at søge"
                          className="absolute right-1.5 top-1/2 -translate-y-1/2 hidden sm:inline-flex h-4 min-w-[16px] items-center justify-center rounded border border-border bg-secondary px-1 font-mono text-[10px] font-semibold text-muted-foreground pointer-events-none"
                        >/</kbd>
                      )}
                    </div>
                    {filteredUnassigned.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                          <SelectTrigger className="h-8 text-[11px] flex-1 bg-background gap-1.5 rounded-md border-border/70" aria-label="Sortering">
                            <ArrowUpDown className="h-3 w-3 text-muted-foreground shrink-0" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="date" className="text-xs">Sortér efter dato</SelectItem>
                            <SelectItem value="price" className="text-xs">Højeste pris først</SelectItem>
                            <SelectItem value="name" className="text-xs">Navn (A-Å)</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={unassignedStatusFilter} onValueChange={(v) => setUnassignedStatusFilter(v as any)}>
                          <SelectTrigger className="h-8 text-[11px] flex-1 bg-background gap-1.5 rounded-md border-border/70" aria-label="Filtrér">
                            <Filter className="h-3 w-3 text-muted-foreground shrink-0" />
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="all" className="text-xs">Vis alle</SelectItem>
                            <SelectItem value="ready" className="text-xs">Klar til auto-fordel</SelectItem>
                            <SelectItem value="pending" className="text-xs">Afventer godkendelse</SelectItem>
                          </SelectContent>
                        </Select>
                         <Select value={unassignedGroupBy} onValueChange={(v) => setUnassignedGroupBy(v as any)}>
                           <SelectTrigger
                             className={cn(
                               "h-8 w-8 p-0 justify-center bg-background hover:bg-secondary transition-colors [&>svg:last-child]:hidden shrink-0 rounded-md border-border/70",
                               unassignedGroupBy !== "none"
                                 ? "text-accent border-accent/60"
                                 : "text-muted-foreground",
                             )}
                             aria-label="Gruppering"
                             title={
                               unassignedGroupBy === "none"
                                 ? "Gruppér listen (uge, status, rute)"
                                 : unassignedGroupBy === "week"
                                   ? "Grupperet efter uge — klik for at ændre"
                                   : unassignedGroupBy === "status"
                                     ? "Grupperet efter status — klik for at ændre"
                                     : "Grupperet efter foretrukken rute — klik for at ændre"
                             }
                           >
                             <Layers className="h-3.5 w-3.5" />
                           </SelectTrigger>
                           <SelectContent align="end">
                             <SelectItem value="none" className="text-xs">Ingen gruppering</SelectItem>
                             <SelectItem value="week" className="text-xs">Gruppér efter uge</SelectItem>
                             <SelectItem value="status" className="text-xs">Gruppér efter status</SelectItem>
                              <SelectItem value="postcode" className="text-xs">Gruppér efter postnummer</SelectItem>
                             <SelectItem value="route" className="text-xs">Gruppér efter foretrukken rute</SelectItem>
                           </SelectContent>
                         </Select>
                         <Tooltip>
                           <TooltipTrigger asChild>
                             <button
                               type="button"
                               onClick={() => setCompactCards((v) => !v)}
                               aria-label={compactCards ? "Skift til fulde kort" : "Skift til kompakte kort"}
                               aria-pressed={compactCards}
                               className="h-8 w-8 inline-flex items-center justify-center rounded-md border border-border/70 bg-background text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none shrink-0"
                             >
                               {compactCards ? <Rows3 className="h-3.5 w-3.5" /> : <LayoutGrid className="h-3.5 w-3.5" />}
                             </button>
                           </TooltipTrigger>
                           <TooltipContent side="bottom" className="text-xs">
                             {compactCards ? "Skift til fulde kort" : "Skift til kompakte kort"}
                           </TooltipContent>
                         </Tooltip>
                          <UnassignedFiltersPopover
                            urgencyValues={urgencyFilter}
                            onUrgencyChange={(next) => setUrgencyFilterArr(Array.from(next))}
                            postcodeValues={postcodeFilter}
                            onPostcodeChange={(next) => setPostcodeFilterArr(Array.from(next))}
                            serviceValues={serviceFilter}
                            onServiceChange={(next) => setServiceFilterArr(Array.from(next))}
                            postcodeFacets={postcodeFacets}
                            serviceFacets={serviceFacets}
                            activeCount={activeAdvancedFilterCount}
                            onClearAll={() => {
                              setUrgencyFilterArr([]);
                              setPostcodeFilterArr([]);
                              setServiceFilterArr([]);
                            }}
                          />
                      </div>
                    )}
                    {(() => {
                      // Når filteret er aktivt, taler vi om de aftaler brugeren faktisk
                      // ser i listen — ellers er tallet i knappen forvirrende.
                      const scope: any[] = unassignedStatusFilter === "all"
                        ? (unassigned as any[])
                        : (filteredUnassigned as any[]);
                      const missing = scope.filter(
                        (j) => (j.address || j.zip_code || j.city) && (j.latitude == null || j.longitude == null),
                      ).length;
                      const canAutoAssign = scope.filter(
                        (j) => j.status !== "pending" && j.latitude != null && j.longitude != null && (j.preferred_date || j.next_service_date),
                      ).length;
                      // Når brugeren har valgt aftaler bliver knappen kontekstuel:
                      // den fordeler kun de valgte (samme som bulk-baren tidligere).
                      // Det fjerner duplikatet hvor 3 knapper konkurrerede om samme handling.
                      const selectedCount = selectedJobIds.size;
                      const selectionMode = selectedCount > 0;
                      const selectedReady = selectionMode
                        ? (unassigned as any[]).filter((j: any) =>
                            selectedJobIds.has(j.id)
                            && j.status !== "pending"
                            && j.latitude != null && j.longitude != null
                            && (j.preferred_date || j.next_service_date),
                          ).length
                        : 0;
                      if (geocoding) {
                        return (
                          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                            <Loader2 className="h-2.5 w-2.5 animate-spin" />Finder GPS-koordinater…
                          </p>
                        );
                      }
                      if (canAutoAssign === 0 && !selectionMode) {
                        // GPS-koordinater hentes automatisk i baggrunden — vi viser
                        // kun en stille statuslinje når noget mangler, ingen knap.
                        if (missing > 0) {
                          return (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5 text-amber-500" />
                              {missing} aftale{missing === 1 ? "" : "r"} uden GPS — hentes automatisk
                            </p>
                          );
                        }
                        return null;
                      }
                      return (
                        <div className="space-y-1.5">
                          {missing > 0 && (
                            <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                              <MapPin className="h-2.5 w-2.5 text-amber-500" />
                              {missing} uden GPS — hentes automatisk
                            </p>
                          )}
                          {selectionMode ? (
                            // Selektions-tilstand: knappen fordeler KUN de valgte.
                            // Disabled hvis ingen valgte aftaler opfylder kravene.
                            <button
                              type="button"
                              onClick={runBulkAutoAssign}
                              disabled={bulkBusy || selectedReady === 0}
                              className={cn(
                                "w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:outline-none",
                                selectedReady > 0
                                  ? "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
                                  : "border border-border bg-background text-muted-foreground",
                              )}
                              title={selectedReady === 0
                                ? "Valgte aftaler mangler adresse på kortet eller ønsket dato"
                                : `Fordel ${selectedReady} valgte aftale${selectedReady === 1 ? "" : "r"} til de bedst matchende ruter`}
                            >
                              {bulkBusy
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Fordeler {selectedReady}…</>
                                : selectedReady === 0
                                  ? <><Sparkles className="h-3.5 w-3.5" />Ingen valgte er klar</>
                                  : <><Sparkles className="h-3.5 w-3.5" />Auto-fordel {selectedReady} valgte</>}
                            </button>
                          ) : canAutoAssign > 0 && (
                            // Ingen valgt: fordeler ALLE klar-aftaler i listen.
                            // Ved 1 aftale er knappen diskret outline — træk/per-kort er ofte hurtigere.
                            <button
                              type="button"
                              onClick={runAutoAssign}
                              disabled={autoAssigning}
                              className={cn(
                                "w-full inline-flex items-center justify-center gap-1.5 h-9 rounded-md text-xs font-bold transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 focus-visible:outline-none",
                                canAutoAssign === 1
                                  ? "border border-border bg-background text-foreground hover:bg-secondary"
                                  : "bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm",
                              )}
                              title={canAutoAssign === 1
                                ? "Lad systemet finde den bedste rute til denne aftale"
                                : "Fordel alle klar-aftaler til de bedst matchende ruter"}
                            >
                              {autoAssigning
                                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" />Fordeler {canAutoAssign}…</>
                                : canAutoAssign === 1
                                  ? <><Sparkles className="h-3.5 w-3.5 text-accent" />Auto-fordel 1 aftale</>
                                  : <><Sparkles className="h-3.5 w-3.5" />Auto-fordel alle {canAutoAssign}</>}
                            </button>
                          )}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-secondary/[0.16]">
                    {loadingUnassigned && unassigned.length === 0 && (
                      <div className="space-y-1.5">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <UnassignedJobCardSkeleton key={i} compact={compactCards} />
                        ))}
                      </div>
                    )}
                    {!loadingUnassigned && filteredUnassigned.length === 0 && (
                      (() => {
                        const hasFilter = unassignedStatusFilter !== "all";
                        const filterLabel: Record<typeof unassignedStatusFilter, string> = {
                          all: "alle",
                          ready: "klar til auto-fordel",
                          pending: "afventer godkendelse",
                        } as any;
                        if (search) {
                          return (
                            <EmptyState
                              icon={<Search className="h-5 w-5" />}
                              title="Ingen aftaler matcher"
                              description={`Ingen aftaler i ”${filterLabel[unassignedStatusFilter]}” matcher din søgning.`}
                              action={{ label: "Ryd søgning", onClick: () => setSearch("") }}
                              compact
                            />
                          );
                        }
                        if (hasFilter && unassigned.length > 0) {
                          return (
                            <EmptyState
                              icon={<Filter className="h-5 w-5" />}
                              title="Ingen aftaler i dette filter"
                              description={`Der er ${unassigned.length} aftale${unassigned.length === 1 ? "" : "r"} uden rute — bare ikke i kategorien “${filterLabel[unassignedStatusFilter]}”.`}
                              action={{ label: "Vis alle aftaler", onClick: () => setUnassignedStatusFilter("all") }}
                              compact
                            />
                          );
                        }
                        if (calendarRoutesRaw.length === 0) {
                          return (
                            <EmptyState
                              icon={<Inbox className="h-5 w-5" />}
                              title="Kom godt i gang"
                              description="Du har ingen aftaler eller ruter endnu. Opret en bestilling, så kan du planlægge den på kalenderen."
                              action={{ label: "Opret bestilling", icon: <Plus className="h-4 w-4" />, onClick: () => setCreateOrderOpen(true) }}
                              compact
                            />
                          );
                        }
                        return (
                          <EmptyState
                            icon={<Inbox className="h-5 w-5" />}
                            title="Alle aftaler er planlagt 🎉"
                            description="Nye aftaler lander her, så snart de oprettes."
                            action={{ label: "Opret bestilling", icon: <Plus className="h-4 w-4" />, onClick: () => setCreateOrderOpen(true) }}
                            compact
                          />
                        );
                      })()
                    )}
                    {(() => {
                      const renderCard = (job: any) => (
                        <UnassignedJobCard
                        key={job.id}
                        job={job}
                        onClick={() => setSelectedJob(job)}
                        onSuggestRoute={() => setSuggestJob(job)}
                        selected={selectedJobIds.has(job.id)}
                        anySelected={selectedJobIds.size > 0}
                        onToggleSelect={(e) => {
                          // Shift+klik = range-select fra sidste valgte aftale til
                          // denne, baseret på den synlige rækkefølge i listen.
                          const useShift =
                            e?.shiftKey && lastSelectedJobIdRef.current && lastSelectedJobIdRef.current !== job.id;
                          if (useShift) {
                            const order = filteredUnassigned as any[];
                            const fromIdx = order.findIndex((j) => j.id === lastSelectedJobIdRef.current);
                            const toIdx = order.findIndex((j) => j.id === job.id);
                            if (fromIdx !== -1 && toIdx !== -1) {
                              const [lo, hi] = fromIdx < toIdx ? [fromIdx, toIdx] : [toIdx, fromIdx];
                              setSelectedJobIds((prev) => {
                                const next = new Set(prev);
                                for (let i = lo; i <= hi; i++) {
                                  const j = order[i];
                                  // Spring pending-aftaler over — de er ikke valgbare.
                                  if (j.status !== "pending") next.add(j.id);
                                }
                                return next;
                              });
                              return;
                            }
                          }
                          setSelectedJobIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(job.id)) next.delete(job.id);
                            else next.add(job.id);
                            return next;
                          });
                          lastSelectedJobIdRef.current = job.id;
                        }}
                        onFindFreeSlot={() => {
                          const start = parseISO(date);
                          for (let i = 1; i <= 90; i++) {
                            const d = format(addDays(start, i), "yyyy-MM-dd");
                            const cap = capacityByDate.get(d);
                            if (!cap || cap.load_pct < 80) {
                              setDate(d);
                              toast.success(`Hopper til ${d}`, {
                                description: cap ? `Belastning ${Math.round(cap.load_pct)}%` : "Ingen booket arbejde",
                              });
                              return;
                            }
                          }
                          toast.message("Ingen ledige slots fundet de næste 90 dage");
                        }}
                        compact={compactCards}
                        />
                      );
                      if (unassignedGroupBy === "none") {
                        return filteredUnassigned.map(renderCard);
                      }
                      const groups = new Map<string, { label: string; items: any[] }>();
                      const keyFor = (job: any): { key: string; label: string } => {
                        if (unassignedGroupBy === "status") {
                          if (job.status === "pending") return { key: "1-pending", label: "Afventer godkendelse" };
                          if (job.preferred_date || job.next_service_date) return { key: "0-ready", label: "Klar til auto-fordel" };
                          return { key: "3-other", label: "Andet" };
                        }
                        if (unassignedGroupBy === "route") {
                          const name = job.preferred_route_name?.trim();
                          return name
                            ? { key: `r-${name}`, label: `Ønsker: ${name}` }
                            : { key: "z-no-route", label: "Ingen foretrukken rute" };
                        }
                        if (unassignedGroupBy === "postcode") {
                          const z = job.zip_code ? String(job.zip_code).trim() : "";
                          const city = (job.city || "").trim();
                          if (!z) return { key: "z-no-zip", label: "Ingen postnummer" };
                          return { key: `p-${z}`, label: city ? `${z} ${city}` : z };
                        }
                        // week
                        const iso = job.preferred_date || job.next_service_date;
                        if (!iso) return { key: "z-no-date", label: "Uden dato" };
                        const d = parseISO(iso);
                        const monday = startOfWeek(d, { weekStartsOn: 1 });
                        const wk = format(d, "I", { locale: da });
                        const label = `Uge ${wk} · ${format(monday, "d. MMM", { locale: da })}`;
                        return { key: format(monday, "yyyy-MM-dd"), label };
                      };
                      for (const job of filteredUnassigned) {
                        const { key, label } = keyFor(job);
                        if (!groups.has(key)) groups.set(key, { label, items: [] });
                        groups.get(key)!.items.push(job);
                      }
                      const entries = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
                      return entries.map(([key, g]) => (
                        <div key={key} className="space-y-1.5">
                          <div className="sticky top-0 z-[1] flex items-center gap-2 rounded-md border border-border/70 bg-card/95 px-2 py-1.5 text-[10px] uppercase tracking-[0.1em] font-bold text-muted-foreground shadow-sm backdrop-blur">
                            <span className="truncate">{g.label}</span>
                            {selectedJobIds.size > 0 && (() => {
                              const selectable = g.items.filter((j: any) => j.status !== "pending");
                              if (selectable.length === 0) return null;
                              const allSelected = selectable.every((j: any) => selectedJobIds.has(j.id));
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedJobIds((prev) => {
                                      const next = new Set(prev);
                                      if (allSelected) {
                                        selectable.forEach((j: any) => next.delete(j.id));
                                      } else {
                                        selectable.forEach((j: any) => next.add(j.id));
                                      }
                                      return next;
                                    });
                                  }}
                                  className="normal-case tracking-normal text-[10px] font-semibold text-accent hover:text-accent/80 hover:underline underline-offset-2"
                                  title={allSelected ? "Fravælg alle i denne gruppe" : "Vælg alle i denne gruppe"}
                                >
                                  {allSelected ? "Fravælg alle" : `Vælg alle ${selectable.length}`}
                                </button>
                              );
                            })()}
                            <span className="ml-auto tabular-nums text-foreground/70">{g.items.length}</span>
                          </div>
                          {g.items.map(renderCard)}
                        </div>
                      ));
                    })()}
                    {/* Sticky bulk-bar i bunden af listen — overlapper ikke
                        kort i toppen og spiser ikke plads når intet er valgt. */}
                    <UnassignedBulkBar
                      selectedCount={selectedJobIds.size}
                      visibleCount={selectedVisibleCount}
                      hiddenCount={selectedHiddenCount}
                      totalCount={filteredUnassigned.length}
                      onClear={() => { setSelectedJobIds(new Set()); lastSelectedJobIdRef.current = null; }}
                      onSelectAll={() => setSelectedJobIds(new Set(filteredUnassigned.map((j: any) => j.id)))}
                      onShowHidden={selectedHiddenCount > 0 ? () => {
                        // Nulstil filtre/søgning så de skjulte valgte aftaler
                        // bliver synlige igen — så brugeren kan se præcis hvad
                        // bulk-handlingen rammer.
                        setSearch("");
                        setUnassignedStatusFilter("all");
                      } : undefined}
                      onCancel={runBulkCancel}
                      onShiftDate={() => setBulkShiftOpen(true)}
                      busy={bulkBusy}
                    />
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
                <ConflictBanner
                  capacityByDate={capacityByDate}
                  mismatchedRouteIds={mismatchedRouteIds}
                  rangeStart={calendarRange.start}
                  rangeEnd={calendarRange.end}
                />
                <div className="flex-1 min-h-0">
                <MonthWeekCalendar
                  view={view}
                  anchorDate={date}
                  routes={calendarRoutesAll}
                  onSelectRoute={handleCalendarSelectRoute}
                  onSelectStop={handleCalendarSelectStop}
                  onCreateRoute={handleCalendarCreateRoute}
                  onOptimizeRoute={handleCalendarOptimizeRoute}
                  onDeleteRoute={(r) => setRouteToDelete({ id: r.id, name: r.name || "Rute" })}
                  onShowHistory={(r) => setHistoryRoute({ id: r.id, name: r.name || "Rute" })}
                  optimizingRouteId={optimizingRouteId}
                  draggingType={draggingTypeForCalendar}
                  draggingRouteId={activeDragData?.type === "route" ? (activeDragData.route?.id ?? null) : null}
                  weatherByDate={weatherByDate}
                  loadingRoutes={loadingCalendarRoutes || loadingCalendarStops}
                  loadingWeather={loadingWeather}
                  weatherError={weatherError}
                  busyTargets={busyTargets}
                  dateAlerts={dateAlerts}
                  selectedRouteIds={selectedRouteIds}
                  onToggleRouteSelection={(id) => toggleRouteSelection(id)}
                  capacityByDate={capacityByDate}
                  mismatchedRouteIds={mismatchedRouteIds}
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
                  onDeleteRoute={(r) => setRouteToDelete({ id: r.id, name: r.name || "Rute" })}
                  onShowHistory={(r) => setHistoryRoute({ id: r.id, name: r.name || "Rute" })}
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
              {/* Desktop (xl+, ≥1280px): resizable side-by-side med aftalepool venstre + kalender højre.
                  Under 1280px presses 7-kolonners grid + 225px aftalepool sammen til ulæseligt — så vi
                  bruger agenda-visningen i stedet (≤1279px). Topbaren har ikke plads til alle handlinger
                  før 2xl, så vi viser en kompakt toolbar oven på split-layoutet ved xl. */}
              <div className="hidden h-full xl:flex xl:flex-col xl:gap-2">
                <div className="shrink-0 rounded-lg border border-border/70 bg-card p-2 shadow-[0_2px_10px_-6px_hsl(var(--foreground)/0.18)] 2xl:hidden">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-md border-border/70"
                      onClick={() =>
                        setDate(format(view === "week" ? addWeeks(parseISO(date), -1) : addMonths(parseISO(date), -1), "yyyy-MM-dd"))
                      }
                      aria-label={view === "week" ? "Forrige uge" : "Forrige måned"}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 px-2.5 text-xs font-semibold capitalize min-w-[150px] gap-1.5 tabular-nums rounded-md hover:bg-secondary"
                          aria-label="Spring til dato"
                        >
                          <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
                          {view === "week"
                            ? `Uge ${format(parseISO(date), "I", { locale: da })} · ${format(parseISO(date), "MMM yyyy", { locale: da })}`
                            : format(parseISO(date), "MMMM yyyy", { locale: da })}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent align="start" className="w-auto p-0">
                        <CalendarPicker
                          mode="single"
                          selected={parseISO(date)}
                          onSelect={(d) => d && setDate(format(d, "yyyy-MM-dd"))}
                          weekStartsOn={1}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 shrink-0 rounded-md border-border/70"
                      onClick={() =>
                        setDate(format(view === "week" ? addWeeks(parseISO(date), 1) : addMonths(parseISO(date), 1), "yyyy-MM-dd"))
                      }
                      aria-label={view === "week" ? "Næste uge" : "Næste måned"}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs font-semibold rounded-md border-border/70 hover:bg-secondary hover:text-foreground" onClick={() => setDate(todayStr())}>
                      I dag
                    </Button>
                    <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                      <TabsList className="h-8">
                        <TabsTrigger value="month" className="h-6 text-[11px] font-semibold px-2.5 rounded-md">Måned</TabsTrigger>
                        <TabsTrigger value="week" className="h-6 text-[11px] font-semibold px-2.5 rounded-md">Uge</TabsTrigger>
                      </TabsList>
                    </Tabs>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          size="sm"
                          className={cn(
                            "h-8 gap-1.5 text-xs font-semibold rounded-md border-border/70 transition-colors",
                            filtersActive
                              ? "border-accent/60 bg-accent/[0.08] text-accent hover:bg-accent/[0.12]"
                              : "hover:border-border hover:text-foreground",
                          )}
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
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant={history.canUndo ? "outline" : "ghost"}
                            size="sm"
                            className="h-8 gap-1.5 px-2 text-xs max-w-[200px]"
                            onClick={() => void history.undo()}
                            disabled={!history.canUndo}
                            aria-label={history.canUndo ? `Fortryd: ${history.lastLabel}` : "Intet at fortryde"}
                          >
                            {history.isUndoing ? <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> : <Undo2 className="h-3.5 w-3.5 shrink-0" />}
                            <span className="truncate">
                              {history.canUndo ? `Fortryd: ${history.lastLabel}` : "Fortryd"}
                            </span>
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {history.canUndo ? <>Fortryd: <span className="font-medium">{history.lastLabel}</span></> : "Intet at fortryde"}
                        </TooltipContent>
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void history.redo()} disabled={!history.canRedo} aria-label="Gentag seneste fortryd">
                            <Redo2 className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">
                          {history.canRedo ? <>Gentag: <span className="font-medium">{history.nextRedoLabel}</span></> : "Intet at gentage"}
                        </TooltipContent>
                      </Tooltip>
                      <DropdownMenu>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Flere handlinger">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                          </TooltipTrigger>
                          <TooltipContent side="bottom" className="text-xs">Flere handlinger</TooltipContent>
                        </Tooltip>
                        <DropdownMenuContent align="end" className="w-56">
                          <DropdownMenuLabel className="text-xs">Handlinger</DropdownMenuLabel>
                          <DropdownMenuItem onClick={() => setPrintOpen(true)} className="text-xs gap-2">
                            <Printer className="h-3.5 w-3.5" /> Print / PDF
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => setDayDetailOpen(true)} className="text-xs gap-2">
                            <ListOrdered className="h-3.5 w-3.5" /> Vis dag som tidslinje
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuLabel className="text-xs">Visning</DropdownMenuLabel>
                          <div className="px-2 py-1 flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">Tæthed</span>
                            <DensityToggle />
                          </div>
                          <div className="px-2 py-1 flex items-center justify-between gap-2">
                            <span className="text-xs text-muted-foreground">Tema</span>
                            <ThemeToggle />
                          </div>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => setShortcutsOpen(true)} className="text-xs gap-2">
                            <Keyboard className="h-3.5 w-3.5" /> Tastatur-genveje
                            <kbd className="ml-auto px-1 rounded bg-secondary text-[10px]">?</kbd>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      <Button data-tour="routes-create-button" size="sm" className="h-8 gap-1 text-xs" onClick={() => setCreateOpen(true)}>
                        <Plus className="h-3.5 w-3.5" /> Opret rute
                      </Button>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button variant="outline" size="icon" className="h-8 w-8" aria-label="Ny bestilling" onClick={() => setCreateOrderOpen(true)}>
                            <ShoppingBag className="h-3.5 w-3.5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom" className="text-xs">Opret ny bestilling manuelt</TooltipContent>
                      </Tooltip>
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

              {/* Mobil/tablet/narrow desktop (<xl, <1280px): dedikeret toolbar + agenda-kalender fuld
                  bredde. Vi har bumpet breakpointet fra lg→xl så 1024–1279px viewports ikke længere
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
          modifiers={[snapCenterToCursor]}
          dropAnimation={{ duration: 220, easing: "cubic-bezier(0.22, 0.61, 0.36, 1)" }}
        >
          {activeDragId && activeDragData?.type === "job" && (
            <div
              className="relative w-[184px] overflow-hidden rounded-xl border border-accent/50 bg-card/95 backdrop-blur-md pl-3 pr-2.5 py-2 cursor-grabbing"
              style={{
                transform: "rotate(-2deg) scale(1.03)",
                boxShadow: "0 18px 40px -10px hsl(var(--accent) / 0.5), 0 6px 16px -4px rgba(0,0,0,0.22)",
              }}
            >
              <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1 bg-accent" />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-bold truncate text-foreground capitalize">{activeDragData.job.customer_name}</p>
                <span className="text-[11px] font-bold text-accent shrink-0 tabular-nums">
                  {Math.round(Number(activeDragData.job.total_amount || 0))} kr
                </span>
              </div>
              {activeDragData.job.address && (
                <p className="mt-0.5 text-[10px] text-muted-foreground truncate">{activeDragData.job.address}</p>
              )}
            </div>
          )}
          {activeDragId && activeDragData?.type === "stop" && (
            <div
              className="relative w-[184px] overflow-hidden rounded-xl border border-border/70 bg-card/95 backdrop-blur-md pl-3 pr-2.5 py-2 cursor-grabbing"
              style={{
                transform: "rotate(-1.5deg) scale(1.03)",
                boxShadow: "0 18px 40px -10px rgba(0,0,0,0.28), 0 6px 16px -4px rgba(0,0,0,0.18)",
              }}
            >
              <span aria-hidden className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
              <p className="text-[12px] font-bold truncate text-foreground capitalize">{activeDragData.stop.customer_name}</p>
              {activeDragData.stop.duration_minutes != null && (
                <p className="text-[10px] text-muted-foreground leading-tight tabular-nums">
                  {activeDragData.stop.duration_minutes} min
                </p>
              )}
            </div>
          )}
        </DragOverlay>,
        document.body)}

        {/* Floating ETA-chip — viser severity + ekstra køretid + ny load% */}
        {activeDragId && <DragEtaOverlay targetId={dragOverTargetId} />}

        {activeDragId && activeDragData?.type === "route" && routeDragPoint && createPortal(
          <div
            ref={routeOverlayRef}
            className="fixed z-[1000] w-[170px] pointer-events-none rounded-md border-l-[3px] border border-border/70 bg-card/95 backdrop-blur-sm px-2.5 py-1.5"
            style={{
              left: routeDragPoint.x,
              top: routeDragPoint.y,
              transform: "translate(-50%, -50%) rotate(-2deg) scale(1.02)",
              borderLeftColor: activeDragData.route?.color || "hsl(var(--accent))",
              boxShadow: `0 12px 32px -8px ${activeDragData.route?.color || "rgba(0,0,0,0.3)"}55, 0 4px 12px -2px rgba(0,0,0,0.18)`,
            }}
          >
            <p className="text-[11px] font-semibold truncate text-foreground">
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
          onRouteDeleted={() => {
            // Rutens sidste aftale blev fjernet — luk også rute-panelet.
            setEditingRoute(null);
            setEditingProjectedContext(null);
            setSelectedStopId(null);
          }}
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

        {suggestJob && businessId && (
          <SuggestRouteDialog
            open={!!suggestJob}
            onOpenChange={(o) => !o && setSuggestJob(null)}
            businessId={businessId}
            job={{
              id: suggestJob.id,
              customer_name: suggestJob.customer_name,
              latitude: suggestJob.latitude,
              longitude: suggestJob.longitude,
              zip_code: suggestJob.zip_code,
              estimated_duration_minutes: Number(suggestJob.estimated_duration_minutes) || 30,
              preferred_date: suggestJob.preferred_date,
              next_service_date: suggestJob.next_service_date,
              service_id: suggestJob.order_items?.[0]?.service_id ?? null,
              weather_sensitive: suggestJob.order_items?.some?.((it: any) => it?.weather_sensitive) ?? false,
            }}
            weatherBad={false}
            onAssignToRoute={async (routeId) => {
              try {
                const sequence = calendarStops.filter((s: any) => s.route_id === routeId).length;
                await addStop.mutateAsync({
                  route_id: routeId,
                  order_id: suggestJob.id,
                  sequence,
                  customer_name: suggestJob.customer_name,
                  customer_phone: suggestJob.customer_phone,
                  address: suggestJob.address || [suggestJob.zip_code, suggestJob.city].filter(Boolean).join(" "),
                  latitude: suggestJob.latitude,
                  longitude: suggestJob.longitude,
                  service_summary: serviceSummaryForJob(suggestJob),
                  duration_minutes: Number(suggestJob.estimated_duration_minutes) || 30,
                  time_window_start: suggestJob.preferred_time_start || null,
                  time_window_end: suggestJob.preferred_time_end || null,
                });
                toast.success("Aftalen tildelt valgt rute");
              } catch (e: any) {
                toast.error(e?.message || "Kunne ikke tildele rute");
              } finally {
                setSuggestJob(null);
              }
            }}
          />
        )}

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
                onRouteDeleted={closeAll}
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

        {/* Klog auto-optimering: efter en flytning/merge spørger vi om
            brugeren vil have stop-rækkefølgen optimeret automatisk.
            Aldrig uden bekræftelse — så brugeren bevarer fuld kontrol. */}
        <AlertDialog
          open={!!pendingOptimizePrompt}
          onOpenChange={(o) => {
            if (!o) {
              // Markér at brugeren dismisset denne rute — vi spørger ikke
              // igen indenfor 1 time, så vi ikke pester. Samme effekt som
              // "Nej tak"-knappen.
              if (pendingOptimizePrompt) markOptimizeDismissed(pendingOptimizePrompt.routeId);
              setPendingOptimizePrompt(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-accent" />
                Spar {pendingOptimizePrompt?.estimate.savingsKm ?? 0} km på {pendingOptimizePrompt?.routeName ?? "ruten"}?
              </AlertDialogTitle>
              <AlertDialogDescription asChild>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>
                    {pendingOptimizePrompt?.reason === "merged"
                      ? "Efter fletningen er rækkefølgen ikke længere optimal — kører lidt frem og tilbage."
                      : "Rækkefølgen er ikke længere optimal på den nye dato — kører lidt frem og tilbage."}
                  </p>
                  {pendingOptimizePrompt && (
                    <div className="rounded-md border bg-muted/40 px-3 py-2 text-foreground tabular-nums">
                      <div className="flex items-center justify-between">
                        <span>Nu</span>
                        <span className="font-semibold">{pendingOptimizePrompt.estimate.currentKm} km</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span>Efter optimering</span>
                        <span className="font-semibold text-emerald-600">
                          ≈ {pendingOptimizePrompt.estimate.suggestedKm} km
                        </span>
                      </div>
                      <div className="mt-1 border-t pt-1 flex items-center justify-between text-xs">
                        <span>Besparelse</span>
                        <span className="font-semibold text-emerald-600">
                          {pendingOptimizePrompt.estimate.savingsKm} km ({pendingOptimizePrompt.estimate.savingsPct}%)
                        </span>
                      </div>
                    </div>
                  )}
                  <p className="text-[11px]">
                    Estimat — du kan altid optimere manuelt senere via knappen på rute-pillen.
                  </p>
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={() => {
                  if (pendingOptimizePrompt) markOptimizeDismissed(pendingOptimizePrompt.routeId);
                }}
              >
                Nej tak
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  const p = pendingOptimizePrompt;
                  setPendingOptimizePrompt(null);
                  if (p) void handleOptimize(p.routeId, p.routeName);
                }}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                Ja, optimér nu
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* ─── Bulk-flyt: selection-bar + dialog ─────────────────────────
            Når ≥1 rute er valgt vises en flydende bar nederst med "Flyt N
            ruter" + "Ryd". Klik åbner BulkMoveRoutesDialog hvor brugeren
            angiver dage at forskyde med, ser per-rute preview og konflikter,
            og bekræfter. Hver mutation køres sekventielt via samme hook
            som single-flytning, så undo/optimistik fungerer som normalt.  */}
        {selectedRouteIds.size > 0 && (
          <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-3 rounded-full border bg-background px-4 py-2 shadow-lg">
              <span className="text-sm font-semibold text-foreground">
                {selectedRouteIds.size} {selectedRouteIds.size === 1 ? "rute" : "ruter"} valgt
              </span>
              <Button
                size="sm"
                className="h-8"
                onClick={() => setBulkMoveOpen(true)}
                disabled={bulkMoveInProgress}
              >
                <CalendarIcon className="h-3.5 w-3.5" />
                Flyt valgte
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                onClick={clearRouteSelection}
                disabled={bulkMoveInProgress}
              >
                Ryd
              </Button>
            </div>
          </div>
        )}
        <BulkMoveRoutesDialog
          open={bulkMoveOpen}
          onOpenChange={(o) => { if (!bulkMoveInProgress) setBulkMoveOpen(o); }}
          loading={bulkMoveInProgress}
          progress={bulkMoveProgress}
          routes={(() => {
            const items: BulkMoveRouteItem[] = [];
            for (const id of selectedRouteIds) {
              const r = calendarRoutesRaw.find((x) => x.id === id);
              if (!r) continue;
              items.push({
                id: r.id,
                name: r.name || "Rute",
                currentDate: r.route_date,
                color: r.color,
              });
            }
            return items;
          })()}
          detectConflicts={(newDates) => {
            // Live konflikt-tjek pr. rute. To slags blokering:
            //   1) "collision" — en ANDEN rute (ikke selv en af de valgte)
            //      ligger allerede på måldatoen.
            //   2) "past"      — håndteres direkte i dialogen (dato < i dag)
            // Tomme/manglende koordinater = ingen blokering, fejl udløses
            // først ved selve mutation.
            const result = new Map<string, { kind: "collision" | "past"; message: string } | null>();
            const selected = selectedRouteIds;
            for (const [routeId, newDate] of newDates.entries()) {
              const collision = calendarRoutesRaw.find((r) =>
                r.id !== routeId && !selected.has(r.id) && r.route_date === newDate,
              );
              if (collision) {
                result.set(routeId, {
                  kind: "collision",
                  message: `Allerede en rute "${collision.name || "uden navn"}" på den dato`,
                });
              } else {
                result.set(routeId, null);
              }
            }
            return result;
          }}
          onRemoveRoute={(id) => toggleRouteSelection(id)}
          onConfirm={async (offsetDays) => {
            const today = todayStr();
            const ids = Array.from(selectedRouteIds);
            // Filtrer ruter der enten ligger i fortid eller har kollision
            // — vi flytter kun dem der faktisk kan flyttes, og rapporterer
            // hvor mange der blev sprunget over.
            const plan: { route: Route; newDate: string }[] = [];
            const skipped: { name: string; reason: string }[] = [];
            for (const id of ids) {
              const r = calendarRoutesRaw.find((x) => x.id === id);
              if (!r) continue;
              const newDate = format(addDays(parseISO(r.route_date), offsetDays), "yyyy-MM-dd");
              if (newDate < today) {
                skipped.push({ name: r.name || "Rute", reason: "fortid" });
                continue;
              }
              const collision = calendarRoutesRaw.find((x) =>
                x.id !== id && !selectedRouteIds.has(x.id) && x.route_date === newDate,
              );
              if (collision) {
                skipped.push({ name: r.name || "Rute", reason: "kollision" });
                continue;
              }
              plan.push({ route: r, newDate });
            }
            if (plan.length === 0) {
              toast.error("Ingen ruter kan flyttes", {
                description: "Alle valgte ruter ville lande på en blokeret dato.",
              });
              return;
            }
            setBulkMoveInProgress(true);
            setBulkMoveProgress({ done: 0, total: plan.length });
            const toastId = toast.loading(`Flytter ${plan.length} ${plan.length === 1 ? "rute" : "ruter"}…`);
            let succeeded = 0;
            const failed: { name: string; message: string }[] = [];
            for (let i = 0; i < plan.length; i++) {
              const { route, newDate } = plan[i];
              try {
                await moveRouteSeries.mutateAsync({
                  routeId: route.id,
                  newDate,
                  scope: "single",
                  moveLinkedSubscriptions: false,
                });
                succeeded++;
              } catch (err: any) {
                failed.push({ name: route.name || "Rute", message: err?.message || "ukendt fejl" });
              }
              setBulkMoveProgress({ done: i + 1, total: plan.length });
            }
            toast.dismiss(toastId);
            if (failed.length === 0 && skipped.length === 0) {
              toast.success(`${succeeded} ${succeeded === 1 ? "rute flyttet" : "ruter flyttet"}`, {
                description: `Forskudt med ${offsetDays > 0 ? "+" : ""}${offsetDays} ${Math.abs(offsetDays) === 1 ? "dag" : "dage"}.`,
              });
            } else if (failed.length === 0) {
              toast.success(`${succeeded} flyttet · ${skipped.length} sprunget over`, {
                description: skipped.map((s) => `${s.name} (${s.reason})`).slice(0, 3).join(", "),
              });
            } else {
              toast.error(`${succeeded} flyttet · ${failed.length} fejlede`, {
                description: failed.map((f) => `${f.name}: ${f.message}`).slice(0, 3).join(" · "),
              });
            }
            setBulkMoveInProgress(false);
            setBulkMoveProgress(null);
            setBulkMoveOpen(false);
            clearRouteSelection();
          }}
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
          warnings={projectedTargetWarnings}
          suggestedFreeDate={projectedSuggestedDate}
          onPickSuggestedDate={(iso) => setPendingProjectedMove((prev) => prev ? { ...prev, toDate: iso, autoSkipCadence: false } : prev)}
          autoSkipCadence={!!pendingProjectedMove?.autoSkipCadence}
          loading={shiftProjectedOccurrence.isPending}
          onConfirm={async () => {
            if (!pendingProjectedMove) return;
            const agreementIds = pendingProjectedSeriesInfo?.agreementIds ?? [];
            const subscriptionIds = pendingProjectedSeriesInfo?.recurringSubscriptionIds ?? [];
            const orderIds = pendingProjectedSeriesInfo?.orderIds ?? [];
            try {
              const result = await shiftProjectedOccurrence.mutateAsync({
                baseRouteId: pendingProjectedMove.baseRouteId,
                fromDate: pendingProjectedMove.fromDate,
                toDate: pendingProjectedMove.toDate,
                agreementIds,
                subscriptionIds,
                orderIds,
                moveStartDates: projectedMoveSyncStart,
                moveNextDates: projectedMoveSyncNext,
                skipTargetCadence: !!pendingProjectedMove.autoSkipCadence,
              });
              const fromD = pendingProjectedMove.fromDate;
              const toD = pendingProjectedMove.toDate;
              const baseId = pendingProjectedMove.baseRouteId;
              const exceptionId: string | null = (result as any)?.id ?? null;
              pushRouteUndo({
                label: `Flyt projiceret forekomst tilbage til ${format(parseISO(fromD), "d. MMM", { locale: da })}`,
                undo: async () => {
                  // Foretræk ren revert (fjerner exception-rækken helt)
                  // så projektionen lander præcis på sin oprindelige kadence-dato
                  // uden at efterlade ekstra exception-rows i DB.
                  if (exceptionId) {
                    await revertProjectedShift.mutateAsync({ exceptionId });
                  } else {
                    await shiftProjectedOccurrence.mutateAsync({
                      baseRouteId: baseId,
                      fromDate: toD,
                      toDate: fromD,
                    });
                  }
                },
              });
              toastSuccessWithUndo({
                message: `Forekomst flyttet til ${format(parseISO(toD), "EEEE d. MMM", { locale: da })}`,
                description: "Klik Fortryd for at lægge den tilbage på den oprindelige dato.",
              });
              setPendingProjectedMove(null);
              // Projicerede forekomster materialiseres på serveren — vi har ikke
              // altid det nye route_id direkte i hånden. Spørger kun om
              // optimering hvis vi kan udlede en konkret rute fra resultatet.
              const newRouteId: string | undefined = (result as any)?.target_route_id ?? (result as any)?.route_id;
              if (newRouteId) {
                tryPromptOptimize(newRouteId, pendingProjectedMove.routeName, "moved");
              }
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
      <UndoBar />
      <RoutePlannerShortcutsHelp open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <BulkShiftDateDialog
        open={bulkShiftOpen}
        onOpenChange={setBulkShiftOpen}
        jobs={(unassigned as any[]).filter((j) => selectedJobIds.has(j.id))}
        onDone={() => setSelectedJobIds(new Set())}
      />
      <RoutePrintDialog
        open={printOpen}
        onOpenChange={setPrintOpen}
        date={date}
        businessName={(business as any)?.name}
        routes={(calendarRoutes
          .filter((r: any) => r.route_date === date)
          .map((r: any): PrintRoute => ({
            id: r.id,
            name: r.name || r.display_name || "Rute",
            color: r.color,
            employeeName: (r.employees?.[0]?.name) ?? null,
            stops: [...(r.stops ?? [])]
              .sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0))
              .map((s: any) => ({
                customerName: s.customer_name ?? "—",
                address: s.address ?? null,
                city: null,
                phone: s.customer_phone ?? null,
                startTime: s.planned_arrival
                  ? new Date(s.planned_arrival).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })
                  : null,
                durationMin: s.duration_minutes ?? null,
                notes: s.notes ?? null,
              })),
          })))}
      />
      <DayDetailPanel
        open={dayDetailOpen}
        onOpenChange={setDayDetailOpen}
        date={date}
        stops={(calendarRoutes
          .filter((r: any) => r.route_date === date)
          .flatMap((r: any): DayStop[] =>
            [...(r.stops ?? [])]
              .sort((a: any, b: any) => (a.sequence ?? 0) - (b.sequence ?? 0))
              .map((s: any): DayStop => ({
                id: s.id,
                routeName: r.name || r.display_name || "Rute",
                routeColor: r.color,
                customerName: s.customer_name ?? "—",
                address: s.address ?? null,
                startTime: s.planned_arrival
                  ? new Date(s.planned_arrival).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })
                  : null,
                durationMin: s.duration_minutes ?? null,
              }))
          ))}
      />
      <RouteHistoryDialog
        open={!!historyRoute}
        onOpenChange={(o) => { if (!o) setHistoryRoute(null); }}
        routeId={historyRoute?.id ?? null}
        routeName={historyRoute?.name}
      />
    </DndContext>
    </div>
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
      className="inline-flex h-4 w-4 items-center justify-center rounded-full ring-1 ring-border text-background text-[8px] font-semibold shrink-0"
      style={{ background: emp?.color || "hsl(220 13% 46%)" }}
      aria-hidden
    >
      {initials}
    </span>
  );
};
