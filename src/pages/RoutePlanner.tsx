import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import {
  useRoutesForDate, useStopsForRoutes, useUnassignedJobs,
  useAddStop, useUpdateStop,
  useOptimizeRoute, useGeocodeAddress, useRoutesForRange,
  useCreateRoute, useDeleteRoute,
  useRouteEmployees, useAddRouteEmployee, useRemoveRouteEmployee,
  useAutoAssignStops,
  type RouteStop, type Route,
} from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ResizablePanelGroup, ResizablePanel, ResizableHandle,
} from "@/components/ui/resizable";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowLeft,
  Loader2, MapIcon, Search, Plus, Inbox, ArrowUpDown, X, Keyboard,
} from "lucide-react";
import { format, addDays, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from "date-fns";
import { da } from "date-fns/locale";
import { toast } from "sonner";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  pointerWithin, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import RouteMap, { type MapRoute, type MapStop } from "@/components/route-planner/RouteMap";
import { UnassignedJobCard } from "@/components/route-planner/UnassignedJobCard";
import { StopDetailSheet } from "@/components/route-planner/StopDetailSheet";
import { CalendarPlanner, type CalendarColumn, type EmployeeOption } from "@/components/route-planner/CalendarPlanner";
import { MonthWeekCalendar, type CalendarRoute } from "@/components/route-planner/MonthWeekCalendar";
import { RouteEditSheet, ROUTE_COLOR_PALETTE } from "@/components/route-planner/RouteEditSheet";
import { useUpdateRoute } from "@/hooks/useRoutes";
import { busyIntervalsForEmployee, findFirstFreeSlot, hhmmToMin, minToIso, minToHHmm } from "@/components/route-planner/lib/scheduling";
import { supabase } from "@/integrations/supabase/client";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

const ROUTE_COLORS = [
  "hsl(184 90% 35%)",
  "hsl(24 90% 50%)",
  "hsl(260 70% 55%)",
  "hsl(140 60% 40%)",
  "hsl(340 75% 50%)",
  "hsl(50 90% 45%)",
  "hsl(210 80% 50%)",
];

const slotToIso = (date: string, hhmm: string): string => {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(date + "T00:00:00");
  d.setHours(h, m, 0, 0);
  return d.toISOString();
};

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
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRouteName, setNewRouteName] = useState("");
  const [newRouteColor, setNewRouteColor] = useState(ROUTE_COLOR_PALETTE[0]);
  const [newRouteDate, setNewRouteDate] = useState(todayStr());
  const [editingRoute, setEditingRoute] = useState<Route | null>(null);
  const [routeToDelete, setRouteToDelete] = useState<{ id: string; name: string } | null>(null);
  const [distributing, setDistributing] = useState(false);

  const businessId = business?.id;
  const routePlanningEnabled = !!(business?.settings as any)?.route_planning_enabled;

  const { data: employees = [] } = useEmployees(businessId);
  const activeEmployees = useMemo(() => employees.filter((e: any) => e.is_active), [employees]);

  const { data: routes = [] } = useRoutesForDate(businessId, date);
  const routeIds = useMemo(() => routes.map((r) => r.id), [routes]);
  const { data: stops = [] } = useStopsForRoutes(routeIds);
  const { data: routeLinks = [] } = useRouteEmployees(routeIds);
  const { data: unassigned = [] } = useUnassignedJobs(businessId);

  const weekStart = useMemo(() => format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd"), [date]);
  const weekEnd = useMemo(() => format(addDays(parseISO(weekStart), 6), "yyyy-MM-dd"), [weekStart]);
  const { data: weekRoutes = [] } = useRoutesForRange(businessId, weekStart, weekEnd);

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
  const { data: calendarRouteLinks = [] } = useRouteEmployees(calendarRouteIds);

  const createRoute = useCreateRoute();
  const deleteRoute = useDeleteRoute();
  const updateRoute = useUpdateRoute();
  const addStop = useAddStop();
  const updateStop = useUpdateStop();
  const optimizeRoute = useOptimizeRoute();
  const autoAssign = useAutoAssignStops();
  const geocode = useGeocodeAddress();
  const attachEmp = useAddRouteEmployee();
  const detachEmp = useRemoveRouteEmployee();

  // Pr-rute "pending" state — kun den rute der faktisk optimeres viser spinner
  const [optimizingRouteId, setOptimizingRouteId] = useState<string | null>(null);
  const [autoAssigningRouteId, setAutoAssigningRouteId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  /* Build per-employee color map (stable per business) */
  const employeeColors = useMemo(() => {
    const map = new Map<string, string>();
    activeEmployees.forEach((e: any, i: number) => {
      map.set(e.id, ROUTE_COLORS[i % ROUTE_COLORS.length]);
    });
    return map;
  }, [activeEmployees]);

  const employeeOptions: EmployeeOption[] = useMemo(() =>
    activeEmployees.map((e: any) => ({
      id: e.id,
      name: e.name,
      color: employeeColors.get(e.id) || ROUTE_COLORS[0],
    })),
  [activeEmployees, employeeColors]);

  const stopsByRoute = useMemo(() => {
    const map = new Map<string, RouteStop[]>();
    for (const s of stops) {
      const arr = map.get(s.route_id) || [];
      arr.push(s);
      map.set(s.route_id, arr);
    }
    return map;
  }, [stops]);

  const employeesByRoute = useMemo(() => {
    const map = new Map<string, EmployeeOption[]>();
    for (const link of routeLinks) {
      const opt = employeeOptions.find((e) => e.id === link.employee_id);
      if (!opt) continue;
      const arr = map.get(link.route_id) || [];
      arr.push(opt);
      map.set(link.route_id, arr);
    }
    return map;
  }, [routeLinks, employeeOptions]);

  /* Color for a route = first attached employee, else neutral teal */
  const colorForRoute = (routeId: string): string => {
    const emps = employeesByRoute.get(routeId) || [];
    return emps[0]?.color || "hsl(184 90% 35%)";
  };

  /** Kundens ønskede dato — preferred_date primært, ellers next_service_date (abonnement). */
  const effectiveJobDate = (j: any): string | null => {
    if (j.preferred_date) return j.preferred_date;
    if (j.next_service_date) return String(j.next_service_date).slice(0, 10);
    return null;
  };

  /** Tæller (uden filter) hvor mange opgaver der ligger uden for ±3 dage-vinduet
      omkring den valgte dag. Vises som hint ifm. auto-fordel knap. */
  const outsideWindowCount = useMemo(() => {
    const target = parseISO(date).getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    return unassigned.filter((j: any) => {
      const ed = effectiveJobDate(j);
      if (!ed) return false;
      const diffDays = (parseISO(ed).getTime() - target) / dayMs;
      // udeladt = fremtidig opgave længere end 3 dage frem
      return diffDays > 3;
    }).length;
  }, [unassigned, date]);

  /** Pr. valgt dag: vis opgaver der er
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
  const handleAssignStop = async (stopId: string, employeeId: string | null) => {
    try {
      await updateStop.mutateAsync({ id: stopId, assigned_employee_id: employeeId });
      toast.success(employeeId ? "Tildelt medarbejder" : "Tildeling fjernet");
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke opdatere tildeling");
    }
  };

  /* Build calendar columns — one per route */
  const calendarColumns: CalendarColumn[] = useMemo(() => {
    return routes.map((r) => {
      const attached = employeesByRoute.get(r.id) || [];
      return {
        routeId: r.id,
        label: r.name || `Rute ${format(parseISO(r.route_date), "d/M")}`,
        subtitle: r.start_address || undefined,
        color: colorForRoute(r.id),
        stops: stopsByRoute.get(r.id) || [],
        attachedEmployees: attached,
        availableEmployees: employeeOptions,
        totalKm: r.total_distance_km,
        totalMin: r.total_duration_minutes,
        routeStatus: r.status,
        optimizedAt: r.optimized_at,
        onOptimize: () => handleOptimize(r.id, r.name),
        onAutoAssign: () => handleAutoAssign(r.id, attached.map((e) => e.id), r.name),
        onAttachEmployee: (eid) => attachEmp.mutate({ route_id: r.id, employee_id: eid }),
        onDetachEmployee: (eid) => detachEmp.mutate({ route_id: r.id, employee_id: eid }),
        onDeleteRoute: () => {
          setRouteToDelete({ id: r.id, name: r.name || `Rute ${format(parseISO(r.route_date), "d/M")}` });
        },
        onAssignStop: handleAssignStop,
        optimizing: optimizingRouteId === r.id,
        autoAssigning: autoAssigningRouteId === r.id,
      } satisfies CalendarColumn;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, stopsByRoute, employeesByRoute, employeeOptions, optimizingRouteId, autoAssigningRouteId]);

  /* Build CalendarRoute[] for MonthWeekCalendar (range covers month/week view) */
  const calendarRoutes: CalendarRoute[] = useMemo(() => {
    const stopsByRoute = new Map<string, RouteStop[]>();
    for (const s of calendarStops) {
      const arr = stopsByRoute.get(s.route_id) || [];
      arr.push(s);
      stopsByRoute.set(s.route_id, arr);
    }
    const empCountByRoute = new Map<string, number>();
    for (const link of calendarRouteLinks) {
      empCountByRoute.set(link.route_id, (empCountByRoute.get(link.route_id) || 0) + 1);
    }
    return calendarRoutesRaw.map((r) => ({
      ...r,
      stops: stopsByRoute.get(r.id) || [],
      attachedEmployeeCount: empCountByRoute.get(r.id) || 0,
    }));
  }, [calendarRoutesRaw, calendarStops, calendarRouteLinks]);

  /* Map data */
  const mapRoutes: MapRoute[] = useMemo(() => {
    const list: MapRoute[] = [];
    for (const col of calendarColumns) {
      const colStops = col.stops
        .filter((s) => s.latitude != null && s.longitude != null)
        .sort((a, b) => a.sequence - b.sequence)
        .map((s, i) => ({
          id: s.id,
          lat: Number(s.latitude),
          lng: Number(s.longitude),
          label: s.customer_name || "Stop",
          sublabel: s.address || undefined,
          index: i + 1,
        }));
      if (colStops.length) list.push({ color: col.color, stops: colStops });
    }
    return list;
  }, [calendarColumns]);

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
        setDate((d) => format(addDays(parseISO(d), -1), "yyyy-MM-dd"));
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        setDate((d) => format(addDays(parseISO(d), 1), "yyyy-MM-dd"));
      } else if (e.key.toLowerCase() === "t") {
        setDate(todayStr());
      } else if (e.key.toLowerCase() === "m") {
        setShowMap((v) => !v);
      } else if (e.key.toLowerCase() === "n") {
        setCreateOpen(true);
      } else if (e.key === "Escape" && selectedStopId) {
        setSelectedStopId(null);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedStopId]);

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

    // Træk en opgave fra opgavepool → eksisterende rute (kalender-pille)
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
            .join(", ") || "Opgave",
        });
        toast.success("Opgave tilføjet til ruten");
      } catch (err: any) {
        toast.error(err.message || "Kunne ikke tilføje opgave");
      }
      return;
    }

    // Træk en opgave fra opgavepool → tom dag (opret ny rute + læg opgave på)
    if (activeData?.type === "job" && overData?.type === "day") {
      const job = activeData.job;
      const newDate: string = overData.date;
      try {
        const created = await createRoute.mutateAsync({
          business_id: businessId,
          route_date: newDate,
          name: `Rute ${format(parseISO(newDate), "d/M", { locale: da })}`,
          color: ROUTE_COLOR_PALETTE[Math.floor(Math.random() * ROUTE_COLOR_PALETTE.length)],
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
            .join(", ") || "Opgave",
        });
        toast.success(`Ny rute oprettet på ${format(parseISO(newDate), "d. MMM", { locale: da })}`);
      } catch (err: any) {
        toast.error(err.message || "Kunne ikke oprette rute");
      }
      return;
    }

    if (overData?.type !== "slot") return;

    const targetRouteId: string = overData.routeId;
    const desiredMin: number = hhmmToMin(overData.slotTime) ?? 480;

    if (activeData?.type === "job") {
      const job = activeData.job;
      try {
        const existingStops = stopsByRoute.get(targetRouteId) || [];
        // Nyt stop er endnu ikke tildelt en medarbejder → ingen busy-check
        const finalMin = desiredMin;
        const slotIso = minToIso(date, finalMin);

        // Advar hvis ruten er på en anden dato end kundens ønske
        const wantedDate = effectiveJobDate(job);
        const targetRoute = routes.find((r) => r.id === targetRouteId);
        const routeDate = targetRoute?.route_date;
        const dateMismatch = wantedDate && routeDate && wantedDate !== routeDate;

        await addStop.mutateAsync({
          route_id: targetRouteId,
          order_id: job.id,
          sequence: existingStops.length,
          customer_name: job.customer_name,
          customer_phone: job.customer_phone,
          address: job.address || [job.zip_code, job.city].filter(Boolean).join(" "),
          latitude: job.latitude,
          longitude: job.longitude,
          service_summary: (job.order_items || [])
            .map((it: any) => it.quantity > 1 ? `${it.quantity}× ${it.service_name}` : it.service_name)
            .join(", ") || "Opgave",
        });
        const created = await supabase.from("route_stops")
          .select("id").eq("route_id", targetRouteId).eq("order_id", job.id)
          .order("created_at", { ascending: false }).limit(1).maybeSingle();
        if (created.data?.id) {
          await updateStop.mutateAsync({
            id: created.data.id,
            planned_arrival: slotIso,
          });
        }
        if (dateMismatch) {
          toast.warning(
            `Tilføjet kl. ${minToHHmm(finalMin)} — men kunden ønsker ${format(parseISO(wantedDate!), "EEEE d. MMM", { locale: da })}`,
            { duration: 6000 },
          );
        } else {
          toast.success(`Tilføjet kl. ${minToHHmm(finalMin)}`);
        }
      } catch (err: any) {
        toast.error(err.message || "Kunne ikke tilføje stop");
      }
      return;
    }

    if (activeData?.type === "stop") {
      const draggedStop: RouteStop = activeData.stop;
      try {
        const targetStops = stopsByRoute.get(targetRouteId) || [];
        // Anti-overlap: hvis stoppet har en tildelt medarbejder, find første ledige slot
        // efter desiredMin der ikke kolliderer med et andet stop hos samme medarbejder.
        let finalMin = desiredMin;
        const draggedAssignees = (draggedStop.assignee_ids && draggedStop.assignee_ids.length > 0)
          ? draggedStop.assignee_ids
          : draggedStop.assigned_employee_id
            ? [draggedStop.assigned_employee_id]
            : [];
        if (draggedAssignees.length > 0) {
          const busy = busyIntervalsForEmployee(
            targetStops,
            draggedAssignees,
            draggedStop.id,
          );
          finalMin = findFirstFreeSlot(desiredMin, draggedStop.duration_minutes, busy);
        }
        const slotIso = minToIso(date, finalMin);
        const moved = finalMin !== desiredMin;

        if (draggedStop.route_id !== targetRouteId) {
          await updateStop.mutateAsync({
            id: draggedStop.id,
            route_id: targetRouteId,
            sequence: targetStops.length,
            planned_arrival: slotIso,
            assigned_employee_id: null,
          });
        } else {
          await updateStop.mutateAsync({
            id: draggedStop.id,
            planned_arrival: slotIso,
          });
        }
        if (moved) {
          toast.info(
            `Flyttet til kl. ${minToHHmm(finalMin)} (rykket fra ${overData.slotTime} for at undgå overlap)`,
          );
        } else {
          toast.success(`Flyttet til kl. ${minToHHmm(finalMin)}`);
        }
      } catch (err: any) {
        toast.error(err.message || "Kunne ikke flytte stop");
      }
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

  const handleAutoAssign = async (routeId: string, employeeIds: string[], routeName: string | null) => {
    if (employeeIds.length < 2) {
      toast.error("Tilkobl mindst 2 medarbejdere før du fordeler opgaver");
      return;
    }
    setAutoAssigningRouteId(routeId);
    try {
      const res = await autoAssign.mutateAsync({ routeId, employeeIds });
      if (res.assigned === 0) {
        toast.info("Alle stops er allerede tildelt");
      } else {
        toast.success(`${routeName || "Rute"}: ${res.assigned} stops fordelt jævnt mellem ${employeeIds.length} medarbejdere`);
      }
    } catch { /* */ }
    finally { setAutoAssigningRouteId(null); }
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
      toast.info("Ingen ledige opgaver med ønsket dato at fordele");
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
              .join(", ") || "Opgave",
          });
          totalAssigned++;
        }
      }

      toast.success(
        `${totalAssigned} opgaver fordelt på ${byDate.size} dage` +
        (routesCreated > 0 ? ` (${routesCreated} nye ruter oprettet)` : ""),
        { description: "Klik på en rute og 'Optimér' for bedste rækkefølge." },
      );
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke auto-fordele opgaver");
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
              <Button variant="outline" size="icon" className="h-7 w-7"
                onClick={() => setDate(format(addDays(parseISO(date), -1), "yyyy-MM-dd"))}>
                <ChevronLeft className="h-3.5 w-3.5" />
              </Button>
              <CalendarIcon className="h-3.5 w-3.5 text-muted-foreground" />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[150px] h-7" />
              <Button variant="outline" size="icon" className="h-7 w-7"
                onClick={() => setDate(format(addDays(parseISO(date), 1), "yyyy-MM-dd"))}>
                <ChevronRight className="h-3.5 w-3.5" />
              </Button>
              <Button variant="outline" size="sm" className="h-7" onClick={() => setDate(todayStr())}>I dag</Button>
            </div>

            <span className="text-xs text-muted-foreground capitalize">
              {format(parseISO(date), "EEEE d. MMMM", { locale: da })}
            </span>

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
                      Ruten starter fra virksomhedens adresse. Du kan tilkoble medarbejdere og opgaver bagefter.
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
                      <Label htmlFor="route-date">Dato</Label>
                      <Input
                        id="route-date"
                        type="date"
                        value={newRouteDate}
                        onChange={(e) => setNewRouteDate(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Farve</Label>
                      <div className="flex flex-wrap gap-2">
                        {ROUTE_COLOR_PALETTE.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setNewRouteColor(c)}
                            className={`h-8 w-8 rounded-full transition-all hover:scale-110 ${newRouteColor === c ? "ring-2 ring-foreground ring-offset-2" : ""}`}
                            style={{ background: c }}
                            aria-label={`Vælg farve ${c}`}
                          />
                        ))}
                      </div>
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
                variant={showMap ? "default" : "ghost"}
                size="sm"
                className="h-7"
                onClick={() => setShowMap((v) => !v)}
              >
                <MapIcon className="h-3.5 w-3.5 mr-1" />{showMap ? "Skjul kort" : "Vis kort"}
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
                    <p><kbd className="px-1 rounded bg-secondary text-[10px]">←</kbd> <kbd className="px-1 rounded bg-secondary text-[10px]">→</kbd> Skift dag</p>
                    <p><kbd className="px-1 rounded bg-secondary text-[10px]">T</kbd> I dag</p>
                    <p><kbd className="px-1 rounded bg-secondary text-[10px]">N</kbd> Ny rute</p>
                    <p><kbd className="px-1 rounded bg-secondary text-[10px]">M</kbd> Vis/skjul kort</p>
                    <p><kbd className="px-1 rounded bg-secondary text-[10px]">Esc</kbd> Luk panel</p>
                  </div>
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-hidden p-3" style={{ height: "calc(100vh - 50px)" }}>
            <ResizablePanelGroup direction="horizontal" className="h-full rounded-lg">
              {/* Sidebar: Opgavepool */}
              <ResizablePanel defaultSize={20} minSize={14} maxSize={36} className="overflow-hidden">
                <Card className="flex flex-col h-full overflow-hidden">
                  <div className="p-3 border-b bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-sm flex items-center gap-1.5">
                        <Inbox className="h-4 w-4 text-primary" />
                        Opgavepool
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
                      <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1 leading-snug">
                        +{outsideWindowCount} opgave{outsideWindowCount === 1 ? "" : "r"} senere på måneden — brug 'Auto-fordel' for at lægge dem på den ønskede dato.
                      </p>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full h-7 text-xs gap-1"
                      onClick={handleAutoDistribute}
                      disabled={distributing || unassigned.length === 0}
                      title="Opretter ruter på hver kundes ønskede dato og lægger opgaverne der. Gælder ALLE ledige opgaver — ikke kun dem du ser."
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
                            ? "Ingen opgaver matcher søgningen"
                            : routes.length === 0
                              ? "Opret en rute først, så kan du trække opgaver herfra og ind i kalenderen"
                              : "Alle opgaver er planlagt 🎉"}
                        </p>
                        {search && (
                          <Button size="sm" variant="ghost" className="h-6 text-xs" onClick={() => setSearch("")}>
                            Ryd søgning
                          </Button>
                        )}
                      </div>
                    )}
                    {filteredUnassigned.map((job: any) => (
                      <UnassignedJobCard key={job.id} job={job} />
                    ))}
                  </div>
                </Card>
              </ResizablePanel>

              <ResizableHandle withHandle className="bg-transparent w-2 hover:bg-primary/20 transition-colors" />

              {/* Calendar */}
              <ResizablePanel defaultSize={showMap ? 45 : 80} className="overflow-hidden">
                <MonthWeekCalendar
                  view={view}
                  anchorDate={date}
                  routes={calendarRoutes}
                  onSelectRoute={(r) => setEditingRoute(r)}
                  onSelectStop={(s) => setSelectedStopId(s.id)}
                  onCreateRoute={(d) => { setNewRouteDate(d); setCreateOpen(true); }}
                  onOptimizeRoute={(id) => {
                    const r = routes.find((x) => x.id === id) ?? weekRoutes.find((x) => x.id === id);
                    handleOptimize(id, r?.name ?? null);
                  }}
                  optimizingRouteId={optimizingRouteId}
                />
              </ResizablePanel>

              {/* Inline map panel — ikke en Sheet, så den ikke konflikter med stop-detail */}
              {showMap && (
                <>
                  <ResizableHandle withHandle className="bg-transparent w-2 hover:bg-primary/20 transition-colors" />
                  <ResizablePanel defaultSize={35} minSize={20} maxSize={60} className="overflow-hidden">
                    <Card className="h-full flex flex-col overflow-hidden">
                      <div className="px-3 py-2 border-b bg-secondary/30 flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapIcon className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold leading-tight">Kort</p>
                            <p className="text-[10px] text-muted-foreground leading-tight">
                              {mapRoutes.reduce((acc, r) => acc + r.stops.length, 0)} planlagte · {unassignedMapStops.length} ledige
                            </p>
                          </div>
                        </div>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7"
                          onClick={() => setShowMap(false)}
                          aria-label="Skjul kort"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="flex-1 min-h-0">
                        <RouteMap
                          routes={mapRoutes}
                          unassigned={unassignedMapStops}
                          selectedStopId={selectedStopId}
                          onStopClick={setSelectedStopId}
                        />
                      </div>
                    </Card>
                  </ResizablePanel>
                </>
              )}
            </ResizablePanelGroup>
        </div>


        {/* Slet rute bekræftelse */}
        <AlertDialog open={!!routeToDelete} onOpenChange={(o) => !o && setRouteToDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Slet rute?</AlertDialogTitle>
              <AlertDialogDescription>
                <strong>{routeToDelete?.name}</strong> og alle dens stops slettes permanent.
                Tilkoblede medarbejdere fjernes fra ruten, og opgaverne ryger tilbage i opgavepoolen.
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
            <div className="rounded-md border bg-background p-2 shadow-lg w-[220px] opacity-90">
              <p className="text-sm font-medium truncate">{activeDragData.job.customer_name}</p>
              {activeDragData.job.address && (
                <p className="text-[10px] text-muted-foreground truncate">{activeDragData.job.address}</p>
              )}
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
          stop={stops.find((s) => s.id === selectedStopId) || null}
          open={!!selectedStopId}
          onOpenChange={(o) => !o && setSelectedStopId(null)}
        />
      </div>
    </DndContext>
  );
};

const WeekView = ({
  weekStart, weekRoutes, onPickDate,
}: {
  weekStart: string;
  weekRoutes: Route[];
  onPickDate: (d: string) => void;
}) => {
  const days = eachDayOfInterval({
    start: parseISO(weekStart),
    end: addDays(parseISO(weekStart), 6),
  });
  const routesPerDay = (dateStr: string) => weekRoutes.filter((r) => r.route_date === dateStr);

  return (
    <div className="container mx-auto px-4 py-4">
      <Card className="p-4 overflow-x-auto">
        <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(7, minmax(140px, 1fr))" }}>
          {days.map((d) => {
            const ds = format(d, "yyyy-MM-dd");
            const ds_routes = routesPerDay(ds);
            return (
              <button
                key={ds}
                onClick={() => onPickDate(ds)}
                className="text-left border rounded-md p-3 hover:bg-secondary/40 transition-colors"
              >
                <div className="text-xs uppercase text-muted-foreground">
                  {format(d, "EEE", { locale: da })}
                </div>
                <div className="text-lg font-semibold">{format(d, "d/M")}</div>
                <div className="mt-2 space-y-1">
                  {ds_routes.length === 0 && (
                    <p className="text-xs text-muted-foreground italic">Ingen ruter</p>
                  )}
                  {ds_routes.map((r) => (
                    <div key={r.id} className="text-xs border-l-2 border-primary pl-2">
                      <p className="font-medium truncate">{r.name || "Rute"}</p>
                      {r.total_distance_km != null && r.total_distance_km > 0 && (
                        <p className="text-muted-foreground">{r.total_distance_km.toFixed(1)} km</p>
                      )}
                    </div>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </Card>
    </div>
  );
};

export default RoutePlanner;
