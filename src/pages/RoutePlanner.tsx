import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import {
  useRoutesForDate, useStopsForRoutes, useUnassignedJobs,
  useUpsertRoute, useAddStop, useReorderStops, useDeleteStop,
  useOptimizeRoute, useGeocodeAddress, useRoutesForRange,
  useDispatchRoute,
  type RouteStop, type Route,
} from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, ArrowLeft,
  Loader2, MapIcon, Search, Wand2,
} from "lucide-react";
import { format, addDays, parseISO, startOfWeek, eachDayOfInterval } from "date-fns";
import { da } from "date-fns/locale";
import { toast } from "sonner";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  closestCenter, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import RouteMap, { type MapRoute, type MapStop } from "@/components/route-planner/RouteMap";
import { UnassignedJobCard } from "@/components/route-planner/UnassignedJobCard";
import { EmployeeColumn } from "@/components/route-planner/EmployeeColumn";
import { StopDetailSheet } from "@/components/route-planner/StopDetailSheet";
import { supabase } from "@/integrations/supabase/client";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

// Distinct, accessible colors for employee routes
const ROUTE_COLORS = [
  "hsl(184 90% 35%)", // teal (brand)
  "hsl(24 90% 50%)",  // orange
  "hsl(260 70% 55%)", // purple
  "hsl(140 60% 40%)", // green
  "hsl(340 75% 50%)", // pink
  "hsl(50 90% 45%)",  // amber
  "hsl(210 80% 50%)", // blue
];

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
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [geocoding, setGeocoding] = useState(false);

  const businessId = business?.id;
  const routePlanningEnabled = !!(business?.settings as any)?.route_planning_enabled;

  const { data: employees = [] } = useEmployees(businessId);
  const activeEmployees = useMemo(() => employees.filter((e: any) => e.is_active), [employees]);

  const { data: routes = [] } = useRoutesForDate(businessId, date);
  const routeIds = useMemo(() => routes.map((r) => r.id), [routes]);
  const { data: stops = [] } = useStopsForRoutes(routeIds);
  const { data: unassigned = [] } = useUnassignedJobs(businessId);

  // Week view data
  const weekStart = useMemo(() => format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd"), [date]);
  const weekEnd = useMemo(() => format(addDays(parseISO(weekStart), 6), "yyyy-MM-dd"), [weekStart]);
  const { data: weekRoutes = [] } = useRoutesForRange(businessId, weekStart, weekEnd);

  const upsertRoute = useUpsertRoute();
  const addStop = useAddStop();
  const reorderStops = useReorderStops();
  const deleteStop = useDeleteStop();
  const optimizeRoute = useOptimizeRoute();
  const geocode = useGeocodeAddress();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  /* Stops grouped by route */
  const stopsByRoute = useMemo(() => {
    const map = new Map<string, RouteStop[]>();
    for (const s of stops) {
      const arr = map.get(s.route_id) || [];
      arr.push(s);
      map.set(s.route_id, arr);
    }
    return map;
  }, [stops]);

  /* Color per employee */
  const colorForEmployee = (employeeId: string | null) => {
    if (!employeeId) return "hsl(220 13% 50%)";
    const idx = activeEmployees.findIndex((e: any) => e.id === employeeId);
    return ROUTE_COLORS[idx >= 0 ? idx % ROUTE_COLORS.length : 0];
  };

  const routeForEmployee = (employeeId: string | null): Route | undefined =>
    routes.find((r) => r.employee_id === employeeId);

  /* Filtered unassigned by search */
  const filteredUnassigned = useMemo(() => {
    if (!search.trim()) return unassigned;
    const q = search.toLowerCase();
    return unassigned.filter((j: any) =>
      j.customer_name?.toLowerCase().includes(q) ||
      j.address?.toLowerCase().includes(q) ||
      j.city?.toLowerCase().includes(q),
    );
  }, [unassigned, search]);

  /* Map data — collect routes + unassigned with coords */
  const mapRoutes: MapRoute[] = useMemo(() => {
    const list: MapRoute[] = [];
    // Unassigned-route column (no employee)
    const noEmpRoute = routeForEmployee(null);
    if (noEmpRoute) {
      const colStops = (stopsByRoute.get(noEmpRoute.id) || [])
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
      if (colStops.length) list.push({ color: colorForEmployee(null), stops: colStops });
    }
    for (const emp of activeEmployees) {
      const r = routeForEmployee(emp.id);
      if (!r) continue;
      const colStops = (stopsByRoute.get(r.id) || [])
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
      if (colStops.length) list.push({ color: colorForEmployee(emp.id), stops: colStops });
    }
    return list;
  }, [routes, stopsByRoute, activeEmployees]);

  const unassignedMapStops: MapStop[] = useMemo(() =>
    filteredUnassigned
      .filter((j: any) => j.latitude != null && j.longitude != null)
      .map((j: any) => ({
        id: j.id,
        lat: Number(j.latitude),
        lng: Number(j.longitude),
        label: j.customer_name,
        sublabel: j.address,
        color: "hsl(220 13% 50%)",
      })),
  [filteredUnassigned]);

  /* Auto-geocode jobs that have address but no coords */
  useEffect(() => {
    if (!businessId || geocoding) return;
    const needsGeocode = unassigned.filter((j: any) =>
      (j.address || j.zip_code || j.city) && (j.latitude == null || j.longitude == null),
    );
    if (needsGeocode.length === 0) return;

    setGeocoding(true);
    (async () => {
      // Process up to 5 at a time to be polite to Nominatim
      for (const job of needsGeocode.slice(0, 5)) {
        try {
          const res = await geocode.mutateAsync({
            address: job.address || undefined,
            zip_code: job.zip_code || undefined,
            city: job.city || undefined,
          });
          if (res.found) {
            await supabase.from("orders").update({
              latitude: res.latitude,
              longitude: res.longitude,
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

  /* ─── DnD handlers ─── */
  const handleDragStart = (e: DragStartEvent) => {
    setActiveDragId(e.active.id as string);
    setActiveDragData(e.active.data.current);
  };

  const handleDragEnd = async (e: DragEndEvent) => {
    const active = e.active;
    const over = e.over;
    setActiveDragId(null);
    setActiveDragData(null);
    if (!over || !businessId) return;

    const activeData: any = active.data.current;
    const overData: any = over.data.current;

    // Case 1: dragging an unassigned job
    if (activeData?.type === "job") {
      const job = activeData.job;
      // Determine target column
      let targetEmployeeId: string | null | undefined;
      if (overData?.type === "column") targetEmployeeId = overData.employeeId;
      else if (overData?.type === "stop") {
        const targetRoute = routes.find((r) => r.id === overData.stop.route_id);
        targetEmployeeId = targetRoute?.employee_id ?? null;
      }
      if (targetEmployeeId === undefined) return;

      try {
        const route = await upsertRoute.mutateAsync({
          business_id: businessId, employee_id: targetEmployeeId, route_date: date,
        });
        const existingStops = stopsByRoute.get(route.id) || [];
        await addStop.mutateAsync({
          route_id: route.id,
          order_id: job.id,
          sequence: existingStops.length,
          customer_name: job.customer_name,
          customer_phone: job.customer_phone,
          address: job.address || [job.zip_code, job.city].filter(Boolean).join(" "),
          latitude: job.latitude,
          longitude: job.longitude,
          service_summary: `Ordre · ${Math.round(Number(job.total_amount || 0))} kr`,
        });
        toast.success("Stop tilføjet");
      } catch (err: any) {
        toast.error(err.message || "Kunne ikke tilføje stop");
      }
      return;
    }

    // Case 2: dragging an existing stop
    if (activeData?.type === "stop") {
      const draggedStop: RouteStop = activeData.stop;

      // Dropped on a column
      if (overData?.type === "column") {
        const targetEmployeeId = overData.employeeId;
        const currentRoute = routes.find((r) => r.id === draggedStop.route_id);
        if (currentRoute?.employee_id === targetEmployeeId) return; // same column, no-op
        try {
          const route = await upsertRoute.mutateAsync({
            business_id: businessId, employee_id: targetEmployeeId, route_date: date,
          });
          const existingStops = stopsByRoute.get(route.id) || [];
          await reorderStops.mutateAsync([
            { id: draggedStop.id, sequence: existingStops.length, route_id: route.id },
          ]);
          toast.success("Stop flyttet");
        } catch (err: any) {
          toast.error(err.message || "Kunne ikke flytte stop");
        }
        return;
      }

      // Dropped on another stop → reorder (within same column) or insert (across columns)
      if (overData?.type === "stop") {
        const targetStop: RouteStop = overData.stop;
        if (draggedStop.id === targetStop.id) return;

        if (draggedStop.route_id === targetStop.route_id) {
          // Reorder within same column
          const colStops = (stopsByRoute.get(draggedStop.route_id) || [])
            .slice()
            .sort((a, b) => a.sequence - b.sequence);
          const oldIdx = colStops.findIndex((s) => s.id === draggedStop.id);
          const newIdx = colStops.findIndex((s) => s.id === targetStop.id);
          if (oldIdx === -1 || newIdx === -1) return;
          const reordered = arrayMove(colStops, oldIdx, newIdx);
          await reorderStops.mutateAsync(
            reordered.map((s, i) => ({ id: s.id, sequence: i })),
          );
        } else {
          // Move across columns at target's position
          const targetRoute = routes.find((r) => r.id === targetStop.route_id);
          if (!targetRoute) return;
          try {
            const targetColStops = (stopsByRoute.get(targetStop.route_id) || [])
              .slice().sort((a, b) => a.sequence - b.sequence);
            const insertIdx = targetColStops.findIndex((s) => s.id === targetStop.id);
            const updates: { id: string; sequence: number; route_id?: string }[] = [
              { id: draggedStop.id, sequence: insertIdx, route_id: targetStop.route_id },
            ];
            for (let i = insertIdx; i < targetColStops.length; i++) {
              updates.push({ id: targetColStops[i].id, sequence: i + 1 });
            }
            await reorderStops.mutateAsync(updates);
            toast.success("Stop flyttet");
          } catch (err: any) {
            toast.error(err.message || "Kunne ikke flytte stop");
          }
        }
      }
    }
  };

  const handleOptimize = async (routeId: string) => {
    try {
      const result = await optimizeRoute.mutateAsync(routeId);
      toast.success(`Optimeret: ${result.total_km.toFixed(1)} km · ${Math.round(result.total_minutes)} min`, {
        description: result.reasoning,
      });
    } catch { /* error toast already shown */ }
  };

  const handleAutoAssignAll = async () => {
    if (!businessId) return;
    if (activeEmployees.length === 0) {
      toast.error("Ingen aktive medarbejdere at fordele opgaver til");
      return;
    }
    const withCoords = unassigned.filter((j: any) => j.latitude != null && j.longitude != null);
    if (withCoords.length === 0) {
      toast.error("Ingen ledige opgaver med GPS at fordele");
      return;
    }
    try {
      // Round-robin distribute
      for (let i = 0; i < withCoords.length; i++) {
        const job: any = withCoords[i];
        const emp = activeEmployees[i % activeEmployees.length];
        const route = await upsertRoute.mutateAsync({
          business_id: businessId, employee_id: emp.id, route_date: date,
        });
        const existingStops = (stopsByRoute.get(route.id) || []).length;
        await addStop.mutateAsync({
          route_id: route.id,
          order_id: job.id,
          sequence: existingStops + i,
          customer_name: job.customer_name,
          customer_phone: job.customer_phone,
          address: job.address || [job.zip_code, job.city].filter(Boolean).join(" "),
          latitude: job.latitude,
          longitude: job.longitude,
          service_summary: `Ordre · ${Math.round(Number(job.total_amount || 0))} kr`,
        });
      }
      // Optimize each employee route afterwards
      for (const emp of activeEmployees) {
        const r = routeForEmployee(emp.id);
        if (r) await optimizeRoute.mutateAsync(r.id).catch(() => {});
      }
      toast.success(`Fordelte ${withCoords.length} opgaver og optimerede ruterne`);
    } catch (e: any) {
      toast.error(e.message || "Kunne ikke auto-fordele");
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="min-h-screen bg-secondary/30">
        {/* Header */}
        <header className="bg-background border-b sticky top-0 z-30">
          <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
            <Button asChild variant="ghost" size="sm">
              <Link to="/virksomhed"><ArrowLeft className="h-4 w-4 mr-1" />Tilbage</Link>
            </Button>
            <h1 className="text-lg font-semibold flex items-center gap-2">
              <MapIcon className="h-5 w-5 text-primary" />
              Ruteplanlægger
            </h1>

            <Tabs value={view} onValueChange={(v) => setView(v as any)} className="ml-2">
              <TabsList className="h-8">
                <TabsTrigger value="day" className="text-xs h-6 px-3">Dag</TabsTrigger>
                <TabsTrigger value="week" className="text-xs h-6 px-3">Uge</TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="ml-auto flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="icon" className="h-8 w-8"
                onClick={() => setDate(format(addDays(parseISO(date), -1), "yyyy-MM-dd"))}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[160px] h-8" />
              </div>
              <Button variant="outline" size="icon" className="h-8 w-8"
                onClick={() => setDate(format(addDays(parseISO(date), 1), "yyyy-MM-dd"))}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" className="h-8" onClick={() => setDate(todayStr())}>I dag</Button>
              <Button
                size="sm" className="h-8 gap-1.5"
                onClick={handleAutoAssignAll}
                disabled={unassigned.length === 0 || activeEmployees.length === 0}
              >
                <Wand2 className="h-3.5 w-3.5" />
                Auto-fordel & optimér
              </Button>
            </div>
          </div>
          <div className="container mx-auto px-4 pb-2 text-sm text-muted-foreground capitalize">
            {format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da })}
          </div>
        </header>

        {view === "day" ? (
          <div className="container mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[280px_1fr_minmax(380px,40%)] gap-4 h-[calc(100vh-115px)]">
            {/* Unassigned jobs */}
            <aside className="overflow-hidden flex flex-col">
              <Card className="p-3 flex flex-col h-full">
                <h2 className="font-semibold text-sm mb-2 flex items-center justify-between">
                  Ledige opgaver
                  <Badge variant="secondary">{filteredUnassigned.length}</Badge>
                </h2>
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Søg..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-8 pl-7 text-sm"
                  />
                </div>
                {geocoding && (
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" />Finder GPS-koordinater...
                  </p>
                )}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                  {filteredUnassigned.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-8">Ingen ledige opgaver</p>
                  )}
                  {filteredUnassigned.map((job: any) => (
                    <UnassignedJobCard key={job.id} job={job} />
                  ))}
                </div>
              </Card>
            </aside>

            {/* Employee columns */}
            <main className="overflow-x-auto overflow-y-auto">
              <div
                className="grid gap-3 h-full pb-2"
                style={{ gridTemplateColumns: `repeat(${Math.max(activeEmployees.length + 1, 1)}, minmax(240px, 1fr))` }}
              >
                {(() => {
                  const r = routeForEmployee(null);
                  const colStops = r ? (stopsByRoute.get(r.id) || []) : [];
                  return (
                    <EmployeeColumn
                      key="unassigned-route"
                      routeId={r?.id || ""}
                      employeeId={null}
                      label="Ikke tildelt"
                      subtitle="Ruter uden medarbejder"
                      color={colorForEmployee(null)}
                      stops={colStops}
                      totalKm={r?.total_distance_km}
                      totalMin={r?.total_duration_minutes}
                      optimizing={optimizeRoute.isPending}
                      onOptimize={r ? () => handleOptimize(r.id) : undefined}
                      onSelectStop={setSelectedStopId}
                      selectedStopId={selectedStopId}
                    />
                  );
                })()}
                {activeEmployees.map((emp: any) => {
                  const r = routeForEmployee(emp.id);
                  const colStops = r ? (stopsByRoute.get(r.id) || []) : [];
                  return (
                    <EmployeeColumn
                      key={emp.id}
                      routeId={r?.id || ""}
                      employeeId={emp.id}
                      label={emp.name}
                      subtitle={emp.title || emp.email}
                      color={colorForEmployee(emp.id)}
                      stops={colStops}
                      totalKm={r?.total_distance_km}
                      totalMin={r?.total_duration_minutes}
                      optimizing={optimizeRoute.isPending}
                      onOptimize={r ? () => handleOptimize(r.id) : undefined}
                      onDeleteStop={(id) => deleteStop.mutate(id)}
                      onSelectStop={setSelectedStopId}
                      selectedStopId={selectedStopId}
                    />
                  );
                })}
                {activeEmployees.length === 0 && (
                  <Card className="p-6 text-center text-sm text-muted-foreground">
                    Ingen aktive medarbejdere. Tilføj medarbejdere på{" "}
                    <Link to="/virksomhed" className="underline">virksomhedspanelet</Link>.
                  </Card>
                )}
              </div>
            </main>

            {/* Map */}
            <aside className="overflow-hidden">
              <Card className="p-2 h-full flex flex-col">
                <div className="flex items-center justify-between mb-2 px-1">
                  <h2 className="font-semibold text-sm flex items-center gap-1.5">
                    <MapIcon className="h-4 w-4 text-primary" />Kort
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {mapRoutes.reduce((acc, r) => acc + r.stops.length, 0)} stop · {unassignedMapStops.length} ledige
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
          </div>
        ) : (
          <WeekView
            weekStart={weekStart}
            weekRoutes={weekRoutes}
            employees={activeEmployees}
            onPickDate={(d) => { setDate(d); setView("day"); }}
            colorForEmployee={colorForEmployee}
          />
        )}

        <DragOverlay>
          {activeDragId && activeDragData?.type === "job" && (
            <div className="rounded-md border bg-background p-2.5 shadow-lg w-[240px] opacity-90">
              <p className="text-sm font-medium truncate">{activeDragData.job.customer_name}</p>
            </div>
          )}
          {activeDragId && activeDragData?.type === "stop" && (
            <div className="rounded-md border bg-background p-2 shadow-lg w-[220px] opacity-90">
              <div className="flex items-center gap-2">
                <span className="h-5 w-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                  {activeDragData.stop.sequence + 1}
                </span>
                <p className="text-sm font-medium truncate">{activeDragData.stop.customer_name}</p>
              </div>
            </div>
          )}
        </DragOverlay>
      </div>
    </DndContext>
  );
};

/* ─── Week overview: km/duration per employee per day ─── */
const WeekView = ({
  weekStart, weekRoutes, employees, onPickDate, colorForEmployee,
}: {
  weekStart: string;
  weekRoutes: Route[];
  employees: any[];
  onPickDate: (d: string) => void;
  colorForEmployee: (id: string | null) => string;
}) => {
  const days = eachDayOfInterval({
    start: parseISO(weekStart),
    end: addDays(parseISO(weekStart), 6),
  });

  const routeFor = (empId: string | null, dateStr: string) =>
    weekRoutes.find((r) => r.employee_id === empId && r.route_date === dateStr);

  return (
    <div className="container mx-auto px-4 py-4">
      <Card className="p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2 px-2 font-semibold">Medarbejder</th>
              {days.map((d) => (
                <th key={d.toISOString()} className="text-center py-2 px-2 font-medium min-w-[110px]">
                  <button
                    onClick={() => onPickDate(format(d, "yyyy-MM-dd"))}
                    className="hover:text-primary transition-colors"
                  >
                    <div className="text-xs uppercase text-muted-foreground">
                      {format(d, "EEE", { locale: da })}
                    </div>
                    <div>{format(d, "d/M")}</div>
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map((emp: any) => (
              <tr key={emp.id} className="border-b hover:bg-secondary/30">
                <td className="py-2 px-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: colorForEmployee(emp.id) }} />
                    <span className="font-medium">{emp.name}</span>
                  </div>
                </td>
                {days.map((d) => {
                  const r = routeFor(emp.id, format(d, "yyyy-MM-dd"));
                  return (
                    <td key={d.toISOString()} className="text-center py-2 px-2">
                      {r ? (
                        <button
                          onClick={() => onPickDate(format(d, "yyyy-MM-dd"))}
                          className="text-xs hover:text-primary"
                        >
                          {r.total_distance_km != null ? `${r.total_distance_km.toFixed(0)} km` : "—"}
                          {r.total_duration_minutes != null && (
                            <div className="text-muted-foreground">
                              {Math.floor(r.total_duration_minutes / 60)}t {r.total_duration_minutes % 60}m
                            </div>
                          )}
                        </button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
            {employees.length === 0 && (
              <tr>
                <td colSpan={days.length + 1} className="text-center text-muted-foreground py-8 text-sm">
                  Ingen aktive medarbejdere
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
};

export default RoutePlanner;
