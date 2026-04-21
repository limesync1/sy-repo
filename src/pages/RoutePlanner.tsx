import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import {
  useStopsForRoutes, useUnassignedJobs,
  useAddStop,
  useOptimizeRoute, useGeocodeAddress, useRoutesForRange,
  useCreateRoute, useDeleteRoute, useUpdateRoute,
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
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowLeft,
  Loader2, MapIcon, Search, Plus, Inbox, ArrowUpDown, X, Keyboard,
  ShoppingBag, Route as RouteIcon, Tag, Palette,
} from "lucide-react";
import { format, addDays, addWeeks, addMonths, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from "date-fns";
import { da } from "date-fns/locale";
import { toast } from "sonner";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  pointerWithin, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import RouteMap, { type MapRoute, type MapStop } from "@/components/route-planner/RouteMap";
import { UnassignedJobCard } from "@/components/route-planner/UnassignedJobCard";
import { StopDetailSheet } from "@/components/route-planner/StopDetailSheet";
import { MonthWeekCalendar, type CalendarRoute } from "@/components/route-planner/MonthWeekCalendar";
import { RouteEditSheet, ROUTE_COLORS, ROUTE_COLOR_PALETTE, pickAvailableColor } from "@/components/route-planner/RouteEditSheet";
import { DatePickerField } from "@/components/route-planner/DatePickerField";
import { RouteStopsPanel } from "@/components/route-planner/RouteStopsPanel";
import { supabase } from "@/integrations/supabase/client";
import CreateManualOrderDialog from "@/components/route-planner/CreateManualOrderDialog";
import { Section, Field, SheetHeaderBlock, SheetFooterBar } from "@/components/route-planner/SheetSection";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

const RoutePlanner = () => {
  const { user, loading } = useAuth();
  if (loading) return <div className="flex min-h-screen items-center justify-center text-muted-foreground">Indlæser...</div>;
  if (!user) return <Navigate to="/log-ind" replace />;
  return <Planner />;
};

const Planner = () => {
  const { data: business } = useMyBusiness();
  const [date, setDate] = useState<string>(todayStr());
  const [view, setView] = useState<"month" | "week">("month");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "price" | "name">("date");
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<any | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [createOrderOpen, setCreateOrderOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteColor, setNewRouteColor] = useState<string>(ROUTE_COLOR_PALETTE[0]);
  const [newRouteDate, setNewRouteDate] = useState(todayStr());
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [routeToDelete, setRouteToDelete] = useState<{ id: string; name: string } | null>(null);
  const [distributing, setDistributing] = useState(false);

  const businessId = business?.id;
  const routePlanningEnabled = !!(business?.settings as any)?.route_planning_enabled;

  const { data: employees = [] } = useEmployees(businessId);
  const activeEmployees = useMemo(() => employees.filter((e: any) => e.is_active), [employees]);

  const { data: unassigned = [] } = useUnassignedJobs(businessId);

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
  const { data: calendarRoutesRaw = [] } = useRoutesForRange(businessId, calendarRange.start, calendarRange.end);
  const calendarRouteIds = useMemo(() => calendarRoutesRaw.map((r) => r.id), [calendarRoutesRaw]);
  const { data: calendarStops = [] } = useStopsForRoutes(calendarRouteIds);

  const createRoute = useCreateRoute();
  const deleteRoute = useDeleteRoute();
  const updateRoute = useUpdateRoute();
  const addStop = useAddStop();
  const optimizeRoute = useOptimizeRoute();
  const geocode = useGeocodeAddress();

  // Pr-rute "pending" state — kun den rute der faktisk optimeres viser spinner
  const [optimizingRouteId, setOptimizingRouteId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  /** Kundens ønskede dato — preferred_date primært, ellers next_service_date (abonnement). */
  const effectiveJobDate = (j: any): string | null => {
    if (j.preferred_date) return j.preferred_date;
    if (j.next_service_date) return String(j.next_service_date).slice(0, 10);
    return null;
  };

  /** Tæller (uden filter) hvor mange aftaler der ligger uden for ±3 dage-vinduet
      omkring den valgte dag. Vises som hint ifm. auto-fordel knap. */
  const outsideWindowCount = useMemo(() => {
    const target = parseISO(date).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    return unassigned.filter((j: any) => {
      const ed = effectiveJobDate(j);
      if (!ed) return false;
      const diffDays = (parseISO(ed).getTime() - target) / dayMs;
      // udeladt = fremtidig aftale længere end 3 dage frem
      return diffDays > 3;
    }).length;
  }, [unassigned, date]);

  /** Pr. valgt dag: vis aftaler der er
      - uden dato (fleksible)
      - forsinkede (effectiveDate ≤ valgt dag)
      - inden for ±3 dage omkring valgt dag */
  const filteredUnassigned = useMemo(() => {
    const target = parseISO(date).getTime();
    const dayMs = 24 * 60 * 60 * 1000;

    let list = unassigned.filter((j: any) => {
      const ed = effectiveJobDate(j);
      if (!ed) return true; // ingen dato → altid vis
      const diffDays = (parseISO(ed).getTime() - target) / dayMs;
      // forsinket (negativ) ELLER inden for 3 dage frem
      return diffDays <= 3;
    });

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
  }, [unassigned, search, sortBy, date]);

  const unassignedTotal = useMemo(
    () => filteredUnassigned.reduce((s: number, j: any) => s + Number(j.total_amount || 0), 0),
    [filteredUnassigned],
  );

  /* Stop assignment handler */
  /* Build CalendarRoute[] for MonthWeekCalendar (range covers month/week view) */
  const calendarRoutes: CalendarRoute[] = useMemo(() => {
    const stopsByRoute = new Map<string, RouteStop[]>();
    for (const s of calendarStops) {
      const arr = stopsByRoute.get(s.route_id) || [];
      arr.push(s);
      stopsByRoute.set(s.route_id, arr);
    }
    return calendarRoutesRaw.map((r) => {
      // Saml UNIK liste af medarbejdere på tværs af alle stops på ruten
      const empIds = new Set<string>();
      const stopsForRoute = stopsByRoute.get(r.id) || [];
      for (const s of stopsForRoute) {
        const ids = s.assignee_ids ?? (s.assigned_employee_id ? [s.assigned_employee_id] : []);
        for (const id of ids) empIds.add(id);
      }
      const emps = Array.from(empIds)
        .map((id) => activeEmployees.find((e: any) => e.id === id))
        .filter(Boolean)
        .map((e: any) => ({ id: e.id, name: e.name, avatar_url: e.avatar_url, color: e.color }));
      return {
        ...r,
        stops: stopsForRoute,
        attachedEmployees: emps,
        attachedEmployeeCount: emps.length,
      };
    });
  }, [calendarRoutesRaw, calendarStops, activeEmployees]);

  /* Map data — viser ruter for det aktuelle range (måned/uge) */
  const mapRoutes: MapRoute[] = useMemo(() => {
    const list: MapRoute[] = [];
    for (const r of calendarRoutes) {
      const colStops = r.stops
        .filter((s) => s.latitude != null && s.longitude != null)
        .sort((a, b) => a.sequence - b.sequence)
        .map((s, i) => ({
          id: s.id,
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          label: s.customer_name || "Stop",
          sublabel: s.address || undefined,
          index: i + 1,
          distanceToNextKm: s.distance_to_next_km != null ? Number(s.distance_to_next_km) : null,
          travelTimeToNextMin: s.travel_time_to_next_min != null ? Number(s.travel_time_to_next_min) : null,
        }));
      if (colStops.length) list.push({ color: r.color, stops: colStops });
    }
    return list;
  }, [calendarRoutes]);

  const unassignedMapStops: MapStop[] = useMemo(() =>
    filteredUnassigned
      .filter((j: any) => j.latitude != null && j.longitude != null)
      .map((j: any) => ({
        id: j.id, lat: Number(j.latitude), lng: Number(j.longitude),
        label: j.customer_name, sublabel: j.address, color: "hsl(220 13% 50%)",
      })),
  [filteredUnassigned]);

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
    setActiveDragId(e.active.id as string);
    setActiveDragData(e.active.data.current);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const { active, over } = e;
    setActiveDragId(null);
    setActiveDragData(null);
    if (!over || !businessId) return;

    const activeData: any = active.data.current;
    const overData: any = over.data.current;

    /* ─── Drop fra MonthWeekCalendar ─── */
    // Træk en hel rute → ny dato
    if (activeData?.type === "route" && overData?.type === "day") {
      const route: Route = activeData.route;
      const newDate: string = overData.date;
      if (route.route_date === newDate) return;
      try {
        await updateRoute.mutateAsync({ id: route.id, route_date: newDate });
        toast.success(`Rute flyttet til ${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`);
      } catch (err: any) {
        toast.error(err.message || "Kunne ikke flytte rute");
      }
      return;
    }

    // Træk en aftale fra aftalepool → eksisterende rute (kalender-pille)
    if (activeData?.type === "job" && overData?.type === "route") {
      const job = activeData.job;
      const targetRouteId: string = overData.routeId;
      try {
        const { data: existingStops } = await supabase
          .from("route_stops").select("id").eq("route_id", targetRouteId);
        await addStop.mutateAsync({
          route_id: targetRouteId,
          order_id: job.id,
          sequence: (existingStops || []).length,
          customer_name: job.customer_name,
          customer_phone: job.customer_phone,
          address: job.address || [job.zip_code, job.city].filter(Boolean).join(" "),
          latitude: job.latitude,
          longitude: job.longitude,
          service_summary: (job.order_items || [])
            .map((it: any) => it.quantity > 1 ? `${it.quantity}× ${it.service_name}` : it.service_name)
            .join(", ") || "Aftale",
          duration_minutes: Number(job.estimated_duration_minutes) || 30,
          time_window_start: job.preferred_time_start || null,
          time_window_end: job.preferred_time_end || null,
        });
        toast.success("Aftale tilføjet til ruten");
      } catch (err: any) {
        toast.error(err.message || "Kunne ikke tilføje aftale");
      }
      return;
    }

    // Træk en aftale fra aftalepool → tom dag (opret ny rute + læg aftale på)
    if (activeData?.type === "job" && overData?.type === "day") {
      const job = activeData.job;
      const newDate: string = overData.date;
      try {
        // Find ledig farve baseret på allerede brugte farver samme dag
        const usedColorsThisDay = calendarRoutes
          .filter((r) => r.route_date === newDate)
          .map((r) => r.color);
        const created = await createRoute.mutateAsync({
          business_id: businessId,
          route_date: newDate,
          name: `Rute ${format(parseISO(newDate), "d/M", { locale: da })}`,
          color: pickAvailableColor(usedColorsThisDay),
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
          service_summary: (job.order_items || [])
            .map((it: any) => it.quantity > 1 ? `${it.quantity}× ${it.service_name}` : it.service_name)
            .join(", ") || "Aftale",
          duration_minutes: Number(job.estimated_duration_minutes) || 30,
          time_window_start: job.preferred_time_start || null,
          time_window_end: job.preferred_time_end || null,
        });
        toast.success(`Ny rute oprettet på ${format(parseISO(newDate), "d. MMM", { locale: da })}`);
      } catch (err: any) {
        toast.error(err.message || "Kunne ikke oprette rute");
      }
      return;
    }

  };

  const handleOptimize = async (routeId: string, routeName: string | null) => {
    setOptimizingRouteId(routeId);
    const label = routeName || "Rute";
    try {
      const result = await optimizeRoute.mutateAsync(routeId);
      const empNote = result.employees && result.employees > 1
        ? ` · ${result.employees} medarbejdere`
        : "";
      const unassignedNote = result.unassigned ? ` · ${result.unassigned} kunne ikke planlægges` : "";
      toast.success(
        `${label}: ${result.total_km.toFixed(1)} km · ${Math.floor(result.total_minutes / 60)}t ${result.total_minutes % 60}m${empNote}${unassignedNote}`,
        { description: result.summary || result.reasoning },
      );
    } catch { /* error toast handled in hook */ }
    finally { setOptimizingRouteId(null); }
  };

  const handleCreateRoute = async () => {
    if (!businessId) return;
    try {
      await createRoute.mutateAsync({
        business_id: businessId,
        route_date: newRouteDate,
        name: newRouteName.trim() || null,
        color: newRouteColor,
      });
      toast.success("Rute oprettet");
      setNewRouteName("");
      setCreateOpen(false);
    } catch { /* toast handled in hook */ }
  };

  /* ─── Auto-fordel: opretter/finder ruter pr. kundens ønskede dato og lægger jobs der ─── */
  const handleAutoDistribute = async () => {
    if (!businessId) return;
    const jobsWithDate = unassigned
      .map((j: any) => ({ job: j, date: effectiveJobDate(j) }))
      .filter((x) => !!x.date) as { job: any; date: string }[];

    if (jobsWithDate.length === 0) {
      toast.info("Ingen ledige aftaler med ønsket dato at fordele");
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
            name: `Auto · ${format(parseISO(d), "EEE d/M", { locale: da })}`,
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
            service_summary: (job.order_items || [])
              .map((it: any) => it.quantity > 1 ? `${it.quantity}× ${it.service_name}` : it.service_name)
              .join(", ") || "Aftale",
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
      <div className="min-h-screen bg-secondary/30 flex flex-col">
        {/* Header */}
        <header className="bg-background border-b sticky top-0 z-30">
          <div className="px-4 py-2 flex items-center gap-3 flex-wrap">
            <Button asChild variant="ghost" size="sm">
              <Link to="/virksomhed"><ArrowLeft className="h-4 w-4 mr-1" />Tilbage</Link>
            </Button>
            <h1 className="text-base font-semibold flex items-center gap-2">
              <MapIcon className="h-4 w-4 text-primary" />Ruteplanlægger
            </h1>

            <Tabs value={view} onValueChange={(v) => setView(v as any)}>
              <TabsList className="h-7">
                <TabsTrigger value="month" className="text-xs h-5 px-2">Måned</TabsTrigger>
                <TabsTrigger value="week" className="text-xs h-5 px-2">Uge</TabsTrigger>
              </TabsList>
            </Tabs>

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
              <Button variant="outline" size="sm" className="h-7" onClick={() => setDate(todayStr())}>I dag</Button>
            </div>

            <div className="ml-auto flex items-center gap-1.5">
              <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="h-7 gap-1">
                    <Plus className="h-3.5 w-3.5" />Opret rute
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Opret ny rute</DialogTitle>
                    <DialogDescription>
                      Ruten starter fra virksomhedens adresse. Du kan tilkoble medarbejdere og aftaler bagefter.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="route-name">Navn (valgfrit)</Label>
                      <Input
                        id="route-name"
                        placeholder="fx Nord, Aarhus C, Mandag-team..."
                        value={newRouteName}
                        onChange={(e) => setNewRouteName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") handleCreateRoute(); }}
                        autoFocus
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Dato</Label>
                      <DatePickerField value={newRouteDate} onChange={setNewRouteDate} />
                    </div>
                    <div className="space-y-2">
                      <Label>Farve</Label>
                      <div className="grid grid-cols-6 gap-2">
                        {ROUTE_COLORS.map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            onClick={() => setNewRouteColor(c.value)}
                            title={c.name}
                            className={`relative aspect-square rounded-lg transition-all hover:scale-105 ring-offset-2 ring-offset-background ${newRouteColor === c.value ? "ring-2 ring-foreground shadow-md" : "hover:ring-1 hover:ring-foreground/30"}`}
                            style={{ background: c.value }}
                            aria-label={`Vælg farve ${c.name}`}
                          />
                        ))}
                      </div>
                      <p className="text-[11px] text-muted-foreground">
                        Valgt: <span className="font-medium text-foreground">{ROUTE_COLORS.find((c) => c.value === newRouteColor)?.name || "Brugerdefineret"}</span>
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCreateOpen(false)}>Annullér</Button>
                    <Button onClick={handleCreateRoute} disabled={createRoute.isPending}>
                      {createRoute.isPending && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
                      Opret rute
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Button
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
        </header>

        <div className="flex-1 overflow-hidden p-3" style={{ height: "calc(100vh - 50px)" }}>
            <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">
              {/* Sidebar: Aftalepool */}
              <ResizablePanel defaultSize={20} minSize={14} maxSize={36} className="overflow-hidden">
                <Card className="flex flex-col h-full overflow-hidden">
                  <div className="p-3 border-b bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-sm flex items-center gap-1.5">
                        <Inbox className="h-4 w-4 text-primary" />
                        Aftalepool
                      </h2>
                      <Badge variant="secondary" className="tabular-nums">
                        {filteredUnassigned.length}
                      </Badge>
                    </div>
                    {filteredUnassigned.length > 0 && (
                      <p className="text-[10px] text-muted-foreground tabular-nums">
                        Total værdi: <span className="font-semibold text-foreground">{Math.round(unassignedTotal).toLocaleString("da-DK")} kr</span>
                      </p>
                    )}
                    {outsideWindowCount > 0 && (
                      <p className="text-[10px] text-foreground bg-accent/5 border border-accent/20 rounded px-2 py-1 leading-snug">
                        +{outsideWindowCount} aftale{outsideWindowCount === 1 ? "" : "r"} senere på måneden — brug 'Auto-fordel' for at lægge dem på den ønskede dato.
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs gap-1"
                      onClick={handleAutoDistribute}
                      disabled={distributing || unassigned.length === 0}
                      title="Opretter ruter på hver kundes ønskede dato og lægger aftalerne der. Gælder ALLE ledige aftaler — ikke kun dem du ser."
                    >
                      {distributing ? <Loader2 className="h-3 w-3 animate-spin" /> : <CalendarIcon className="h-3 w-3" />}
                      Auto-fordel pr. ønsket dato
                    </Button>
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
                    {filteredUnassigned.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                          <Inbox className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <p className="text-xs text-muted-foreground italic">
                          {search
                            ? "Ingen aftaler matcher søgningen"
                            : calendarRoutesRaw.length === 0
                              ? "Opret en rute først, så kan du trække aftaler herfra og ind i kalenderen"
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
                <MonthWeekCalendar
                  view={view}
                  anchorDate={date}
                  routes={calendarRoutes}
                  onSelectRoute={(r) => setEditingRoute(r)}
                  onSelectStop={(s) => setSelectedStopId(s.id)}
                  onCreateRoute={(d) => { setNewRouteDate(d); setCreateOpen(true); }}
                  onOptimizeRoute={(id) => {
                    const r = calendarRoutesRaw.find((x) => x.id === id);
                    handleOptimize(id, r?.name ?? null);
                  }}
                  optimizingRouteId={optimizingRouteId}
                  draggingType={activeDragData?.type === "job" ? "job" : activeDragData?.type === "route" ? "route" : null}
                />
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
          stop={calendarStops.find((s) => s.id === selectedStopId) || null}
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

        <RouteEditSheet
          route={editingRoute}
          open={!!editingRoute}
          onOpenChange={(o) => !o && setEditingRoute(null)}
          stopCount={editingRoute ? (calendarStops.filter((s) => s.route_id === editingRoute.id).length) : 0}
        />

        {/* Slide-in: stops på den valgte rute (vises ved siden af rute-redigering) */}
        <RouteStopsPanel
          route={editingRoute}
          open={!!editingRoute}
          onOpenChange={(o) => !o && setEditingRoute(null)}
          stops={editingRoute ? calendarStops.filter((s) => s.route_id === editingRoute.id) : []}
          onSelectStop={(s) => setSelectedStopId(s.id)}
          employees={activeEmployees.map((e: any) => ({
            id: e.id, name: e.name, avatar_url: e.avatar_url, color: e.color,
          }))}
        />
      </div>
    </DndContext>
  );
};

export default RoutePlanner;
