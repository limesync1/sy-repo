import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useIsMutating } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import {
  useRoutesForDate, useStopsForRoutes, useUnassignedJobs,
  useAddStop, useUpdateStop,
  useOptimizeRoute, useGeocodeAddress, useRoutesForRange,
  useDispatchRoute, useCreateRoute, useDeleteRoute,
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
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowLeft,
  Loader2, MapIcon, Search, Plus, Inbox, ArrowUpDown,
} from "lucide-react";
import { format, addDays, parseISO, startOfWeek, eachDayOfInterval } from "date-fns";
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
  const [view, setView] = useState<"day" | "week">("day");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<"date" | "price" | "name">("date");
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newRouteName, setNewRouteName] = useState("");

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

  const createRoute = useCreateRoute();
  const deleteRoute = useDeleteRoute();
  const addStop = useAddStop();
  const updateStop = useUpdateStop();
  const optimizeRoute = useOptimizeRoute();
  const autoAssign = useAutoAssignStops();
  const dispatchRoute = useDispatchRoute();
  const geocode = useGeocodeAddress();
  const attachEmp = useAddRouteEmployee();
  const detachEmp = useRemoveRouteEmployee();

  // Pr-rute "pending" state — kun den rute der faktisk optimeres viser spinner
  const [optimizingRouteId, setOptimizingRouteId] = useState<string | null>(null);
  const [autoAssigningRouteId, setAutoAssigningRouteId] = useState<string | null>(null);
  const [dispatchingRouteId, setDispatchingRouteId] = useState<string | null>(null);

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

  const filteredUnassigned = useMemo(() => {
    let list = unassigned;
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
        const ad = a.preferred_date || "9999-12-31";
        const bd = b.preferred_date || "9999-12-31";
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
        onOptimize: () => handleOptimize(r.id),
        onAttachEmployee: (eid) => attachEmp.mutate({ route_id: r.id, employee_id: eid }),
        onDetachEmployee: (eid) => detachEmp.mutate({ route_id: r.id, employee_id: eid }),
        onDispatchToEmployee: (eid) => dispatchRoute.mutate({ routeId: r.id, employeeId: eid }),
        onDeleteRoute: () => {
          if (confirm("Slet ruten og alle dens stops?")) deleteRoute.mutate(r.id);
        },
        onAssignStop: handleAssignStop,
        optimizing: optimizeRoute.isPending,
        dispatching: dispatchRoute.isPending,
      } satisfies CalendarColumn;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, stopsByRoute, employeesByRoute, employeeOptions, optimizeRoute.isPending, dispatchRoute.isPending]);

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

    if (overData?.type !== "slot") return;

    const targetRouteId: string = overData.routeId;
    const slotIso = slotToIso(date, overData.slotTime);

    if (activeData?.type === "job") {
      const job = activeData.job;
      try {
        const existingStops = stopsByRoute.get(targetRouteId) || [];
        await addStop.mutateAsync({
          route_id: targetRouteId,
          order_id: job.id,
          sequence: existingStops.length,
          customer_name: job.customer_name,
          customer_phone: job.customer_phone,
          address: job.address || [job.zip_code, job.city].filter(Boolean).join(" "),
          latitude: job.latitude,
          longitude: job.longitude,
          service_summary: `Ordre · ${Math.round(Number(job.total_amount || 0))} kr`,
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
        toast.success(`Tilføjet kl. ${overData.slotTime}`);
      } catch (err: any) {
        toast.error(err.message || "Kunne ikke tilføje stop");
      }
      return;
    }

    if (activeData?.type === "stop") {
      const draggedStop: RouteStop = activeData.stop;
      try {
        if (draggedStop.route_id !== targetRouteId) {
          const targetStops = stopsByRoute.get(targetRouteId) || [];
          await updateStop.mutateAsync({
            id: draggedStop.id,
            route_id: targetRouteId,
            sequence: targetStops.length,
            planned_arrival: slotIso,
            // Clear assignment when moved to different route
            assigned_employee_id: null,
          });
        } else {
          await updateStop.mutateAsync({
            id: draggedStop.id,
            planned_arrival: slotIso,
          });
        }
        toast.success(`Flyttet til kl. ${overData.slotTime}`);
      } catch (err: any) {
        toast.error(err.message || "Kunne ikke flytte stop");
      }
    }
  };

  const handleOptimize = async (routeId: string) => {
    try {
      const result = await optimizeRoute.mutateAsync(routeId);
      toast.success(`Optimeret: ${result.total_km.toFixed(1)} km · ${Math.round(result.total_minutes)} min`, {
        description: result.reasoning,
      });
    } catch { /* */ }
  };

  const handleCreateRoute = async () => {
    if (!businessId) return;
    try {
      await createRoute.mutateAsync({
        business_id: businessId,
        route_date: date,
        name: newRouteName.trim() || null,
      });
      toast.success("Rute oprettet");
      setNewRouteName("");
      setCreateOpen(false);
    } catch { /* toast handled in hook */ }
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
                <TabsTrigger value="day" className="text-xs h-5 px-2">Dag</TabsTrigger>
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
                    <DialogTitle>Opret ny rute for {format(parseISO(date), "EEEE d. MMMM", { locale: da })}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    <Label htmlFor="route-name">Navn på ruten (valgfrit)</Label>
                    <Input
                      id="route-name"
                      placeholder="fx Nord, Aarhus C, Mandag-team..."
                      value={newRouteName}
                      onChange={(e) => setNewRouteName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground">
                      Ruten starter fra virksomhedens adresse. Du kan tilkoble medarbejdere bagefter.
                    </p>
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

              <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowMap((v) => !v)}>
                <MapIcon className="h-3.5 w-3.5 mr-1" />{showMap ? "Skjul kort" : "Vis kort"}
              </Button>
            </div>
          </div>
        </header>

        {view === "day" ? (
          <div className="flex-1 grid gap-3 p-3 overflow-hidden"
            style={{
              gridTemplateColumns: showMap ? "300px 1fr 360px" : "300px 1fr",
              height: "calc(100vh - 50px)",
            }}>
            {/* Sidebar: ledige opgaver */}
            <aside className="overflow-hidden">
              <Card className="flex flex-col h-full overflow-hidden">
                {/* Header section */}
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
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Søg navn eller adresse..."
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="h-7 pl-7 pr-2 text-xs"
                    />
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

                {/* Scrollable list */}
                <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
                  {filteredUnassigned.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-12 px-4 text-center gap-2">
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                        <Inbox className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <p className="text-xs text-muted-foreground italic">
                        {search ? "Ingen opgaver matcher søgningen" : "Alle opgaver er planlagt 🎉"}
                      </p>
                    </div>
                  )}
                  {filteredUnassigned.map((job: any) => (
                    <UnassignedJobCard key={job.id} job={job} />
                  ))}
                </div>
              </Card>
            </aside>

            {/* Calendar */}
            <main className="overflow-hidden">
              <CalendarPlanner
                routeDate={date}
                columns={calendarColumns}
                selectedStopId={selectedStopId}
                onSelectStop={setSelectedStopId}
              />
            </main>

            {/* Map */}
            {showMap && (
              <aside className="overflow-hidden">
                <Card className="p-2 h-full flex flex-col">
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h2 className="font-semibold text-sm flex items-center gap-1.5">
                      <MapIcon className="h-4 w-4 text-primary" />Kort
                    </h2>
                    <p className="text-[10px] text-muted-foreground">
                      {mapRoutes.reduce((acc, r) => acc + r.stops.length, 0)} planlagt · {unassignedMapStops.length} ledige
                    </p>
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
              </aside>
            )}
          </div>
        ) : (
          <WeekView
            weekStart={weekStart}
            weekRoutes={weekRoutes}
            onPickDate={(d) => { setDate(d); setView("day"); }}
          />
        )}

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
