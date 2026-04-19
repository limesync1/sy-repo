import { useEffect, useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import {
  useRoutesForDate, useStopsForRoutes, useUnassignedJobs,
  useUpsertRoute, useAddStop, useUpdateStop,
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
  pointerWithin, type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import RouteMap, { type MapRoute, type MapStop } from "@/components/route-planner/RouteMap";
import { UnassignedJobCard } from "@/components/route-planner/UnassignedJobCard";
import { StopDetailSheet } from "@/components/route-planner/StopDetailSheet";
import { CalendarPlanner, type CalendarColumn } from "@/components/route-planner/CalendarPlanner";
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

/** Convert a "HH:mm" slot time on a given date to ISO timestamp. */
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
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null);
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [geocoding, setGeocoding] = useState(false);
  const [showMap, setShowMap] = useState(true);

  const businessId = business?.id;
  const routePlanningEnabled = !!(business?.settings as any)?.route_planning_enabled;

  const { data: employees = [] } = useEmployees(businessId);
  const activeEmployees = useMemo(() => employees.filter((e: any) => e.is_active), [employees]);

  const { data: routes = [] } = useRoutesForDate(businessId, date);
  const routeIds = useMemo(() => routes.map((r) => r.id), [routes]);
  const { data: stops = [] } = useStopsForRoutes(routeIds);
  const { data: unassigned = [] } = useUnassignedJobs(businessId);

  const weekStart = useMemo(() => format(startOfWeek(parseISO(date), { weekStartsOn: 1 }), "yyyy-MM-dd"), [date]);
  const weekEnd = useMemo(() => format(addDays(parseISO(weekStart), 6), "yyyy-MM-dd"), [weekStart]);
  const { data: weekRoutes = [] } = useRoutesForRange(businessId, weekStart, weekEnd);

  const upsertRoute = useUpsertRoute();
  const addStop = useAddStop();
  // reorder via updateStop
  const updateStop = useUpdateStop();
  const optimizeRoute = useOptimizeRoute();
  const dispatchRoute = useDispatchRoute();
  const geocode = useGeocodeAddress();

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const stopsByRoute = useMemo(() => {
    const map = new Map<string, RouteStop[]>();
    for (const s of stops) {
      const arr = map.get(s.route_id) || [];
      arr.push(s);
      map.set(s.route_id, arr);
    }
    return map;
  }, [stops]);

  const colorForEmployee = (employeeId: string | null) => {
    if (!employeeId) return "hsl(220 13% 50%)";
    const idx = activeEmployees.findIndex((e: any) => e.id === employeeId);
    return ROUTE_COLORS[idx >= 0 ? idx % ROUTE_COLORS.length : 0];
  };

  const routeForEmployee = (employeeId: string | null): Route | undefined =>
    routes.find((r) => r.employee_id === employeeId);

  const filteredUnassigned = useMemo(() => {
    if (!search.trim()) return unassigned;
    const q = search.toLowerCase();
    return unassigned.filter((j: any) =>
      j.customer_name?.toLowerCase().includes(q) ||
      j.address?.toLowerCase().includes(q) ||
      j.city?.toLowerCase().includes(q),
    );
  }, [unassigned, search]);

  /* Build calendar columns */
  const calendarColumns: CalendarColumn[] = useMemo(() => {
    const cols: CalendarColumn[] = [];
    const noEmpRoute = routeForEmployee(null);
    if (noEmpRoute) {
      cols.push({
        routeId: noEmpRoute.id, employeeId: null,
        label: "Ikke tildelt", subtitle: "Uden medarbejder",
        color: colorForEmployee(null),
        stops: stopsByRoute.get(noEmpRoute.id) || [],
        totalKm: noEmpRoute.total_distance_km, totalMin: noEmpRoute.total_duration_minutes,
        routeStatus: noEmpRoute.status,
      });
    }
    for (const emp of activeEmployees) {
      const r = routeForEmployee(emp.id);
      cols.push({
        routeId: r?.id || "",
        employeeId: emp.id,
        label: emp.name,
        subtitle: emp.title || emp.email,
        color: colorForEmployee(emp.id),
        stops: r ? (stopsByRoute.get(r.id) || []) : [],
        totalKm: r?.total_distance_km, totalMin: r?.total_duration_minutes,
        routeStatus: r?.status,
        onOptimize: r ? () => handleOptimize(r.id) : undefined,
        onDispatch: r ? () => dispatchRoute.mutate(r.id) : undefined,
        optimizing: optimizeRoute.isPending,
        dispatching: dispatchRoute.isPending,
      });
    }
    return cols;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routes, stopsByRoute, activeEmployees, optimizeRoute.isPending, dispatchRoute.isPending]);

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

    // Drop on a calendar slot — assign or move stop to specific time
    if (overData?.type === "slot") {
      const targetEmployeeId: string | null = overData.employeeId;
      const slotIso = slotToIso(date, overData.slotTime);

      if (activeData?.type === "job") {
        const job = activeData.job;
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
          // Set planned arrival to slot time
          const created = await supabase.from("route_stops")
            .select("id").eq("route_id", route.id).eq("order_id", job.id)
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
        const currentRoute = routes.find((r) => r.id === draggedStop.route_id);
        try {
          if (currentRoute?.employee_id !== targetEmployeeId) {
            const targetRoute = await upsertRoute.mutateAsync({
              business_id: businessId, employee_id: targetEmployeeId, route_date: date,
            });
            const targetStops = stopsByRoute.get(targetRoute.id) || [];
            await updateStop.mutateAsync({
              id: draggedStop.id,
              route_id: targetRoute.id,
              sequence: targetStops.length,
              planned_arrival: slotIso,
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
        return;
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

  const handleAutoAssignAll = async () => {
    if (!businessId) return;
    if (activeEmployees.length === 0) {
      toast.error("Ingen aktive medarbejdere"); return;
    }
    const withCoords = unassigned.filter((j: any) => j.latitude != null && j.longitude != null);
    if (withCoords.length === 0) { toast.error("Ingen ledige opgaver med GPS"); return; }
    try {
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
          latitude: job.latitude, longitude: job.longitude,
          service_summary: `Ordre · ${Math.round(Number(job.total_amount || 0))} kr`,
        });
      }
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
              <Button variant="ghost" size="sm" className="h-7" onClick={() => setShowMap((v) => !v)}>
                <MapIcon className="h-3.5 w-3.5 mr-1" />{showMap ? "Skjul kort" : "Vis kort"}
              </Button>
              <Button size="sm" className="h-7 gap-1"
                onClick={handleAutoAssignAll}
                disabled={unassigned.length === 0 || activeEmployees.length === 0}>
                <Wand2 className="h-3.5 w-3.5" />Auto-fordel
              </Button>
            </div>
          </div>
        </header>

        {view === "day" ? (
          <div className="flex-1 grid gap-3 p-3 overflow-hidden"
            style={{
              gridTemplateColumns: showMap ? "260px 1fr 360px" : "260px 1fr",
              height: "calc(100vh - 50px)",
            }}>
            {/* Sidebar: ledige opgaver */}
            <aside className="overflow-hidden">
              <Card className="p-2.5 flex flex-col h-full">
                <h2 className="font-semibold text-sm mb-2 flex items-center justify-between">
                  Ledige opgaver
                  <Badge variant="secondary">{filteredUnassigned.length}</Badge>
                </h2>
                <div className="relative mb-2">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <Input
                    placeholder="Søg navn eller adresse..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-7 pl-7 text-xs"
                  />
                </div>
                {geocoding && (
                  <p className="text-[10px] text-muted-foreground mb-2 flex items-center gap-1">
                    <Loader2 className="h-2.5 w-2.5 animate-spin" />Finder GPS...
                  </p>
                )}
                <div className="flex-1 overflow-y-auto space-y-1.5 pr-1">
                  {filteredUnassigned.length === 0 && (
                    <p className="text-xs text-muted-foreground italic text-center py-8">Ingen ledige opgaver</p>
                  )}
                  {filteredUnassigned.map((job: any) => (
                    <UnassignedJobCard key={job.id} job={job} />
                  ))}
                </div>
              </Card>
            </aside>

            {/* Calendar */}
            <main className="overflow-hidden">
              {activeEmployees.length === 0 ? (
                <Card className="p-6 text-center text-sm text-muted-foreground h-full flex items-center justify-center">
                  Ingen aktive medarbejdere. Tilføj medarbejdere på{" "}
                  <Link to="/virksomhed" className="underline ml-1">virksomhedspanelet</Link>.
                </Card>
              ) : (
                <CalendarPlanner
                  routeDate={date}
                  columns={calendarColumns}
                  selectedStopId={selectedStopId}
                  onSelectStop={setSelectedStopId}
                />
              )}
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
            employees={activeEmployees}
            onPickDate={(d) => { setDate(d); setView("day"); }}
            colorForEmployee={colorForEmployee}
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
                  <button onClick={() => onPickDate(format(d, "yyyy-MM-dd"))}
                    className="hover:text-primary transition-colors">
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
                        <button onClick={() => onPickDate(format(d, "yyyy-MM-dd"))}
                          className="text-xs hover:text-primary">
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
