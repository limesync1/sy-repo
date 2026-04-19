import { useMemo, useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyBusiness } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import {
  useRoutesForDate, useStopsForRoutes, useUnassignedJobs,
  useUpsertRoute, useAddStop, useUpdateStop, useDeleteStop,
  type RouteStop,
} from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  ChevronLeft, ChevronRight, Calendar as CalendarIcon, Trash2, MapPin, GripVertical,
  ArrowLeft,
} from "lucide-react";
import { format, addDays, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { toast } from "sonner";

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
  const businessId = business?.id;
  const routePlanningEnabled = !!(business?.settings as any)?.route_planning_enabled;

  const { data: employees = [] } = useEmployees(businessId);
  const activeEmployees = useMemo(() => employees.filter((e: any) => e.is_active), [employees]);

  const { data: routes = [] } = useRoutesForDate(businessId, date);
  const routeIds = useMemo(() => routes.map((r) => r.id), [routes]);
  const { data: stops = [] } = useStopsForRoutes(routeIds);
  const { data: unassigned = [] } = useUnassignedJobs(businessId);

  const upsertRoute = useUpsertRoute();
  const addStop = useAddStop();
  const updateStop = useUpdateStop();
  const deleteStop = useDeleteStop();

  const [draggingJob, setDraggingJob] = useState<any | null>(null);
  const [draggingStop, setDraggingStop] = useState<RouteStop | null>(null);

  /* Stops grouped by route — must be called BEFORE early returns */
  const stopsByRoute = useMemo(() => {
    const map = new Map<string, RouteStop[]>();
    for (const s of stops) {
      const arr = map.get(s.route_id) || [];
      arr.push(s);
      map.set(s.route_id, arr);
    }
    return map;
  }, [stops]);

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

  const routeForEmployee = (employeeId: string | null) =>
    routes.find((r) => r.employee_id === employeeId);


  /* Drop handler — drop a job onto an employee column */
  const handleDropOnEmployee = async (employeeId: string | null) => {
    if (draggingJob && businessId) {
      try {
        const route = await upsertRoute.mutateAsync({ business_id: businessId, employee_id: employeeId, route_date: date });
        const existingStops = stopsByRoute.get(route.id) || [];
        await addStop.mutateAsync({
          route_id: route.id,
          order_id: draggingJob.id,
          sequence: existingStops.length,
          customer_name: draggingJob.customer_name,
          customer_phone: draggingJob.customer_phone,
          service_summary: `Ordre · ${Math.round(Number(draggingJob.total_amount || 0))} kr`,
        });
        toast.success("Stop tilføjet til rute");
      } catch (e: any) {
        toast.error(e.message || "Kunne ikke tilføje stop");
      } finally {
        setDraggingJob(null);
      }
    } else if (draggingStop && businessId) {
      const currentRoute = routes.find((r) => r.id === draggingStop.route_id);
      if (currentRoute?.employee_id === employeeId) { setDraggingStop(null); return; }
      try {
        const route = await upsertRoute.mutateAsync({ business_id: businessId, employee_id: employeeId, route_date: date });
        const existingStops = stopsByRoute.get(route.id) || [];
        await updateStop.mutateAsync({ id: draggingStop.id, route_id: route.id, sequence: existingStops.length });
        toast.success("Stop flyttet");
      } catch (e: any) {
        toast.error(e.message || "Kunne ikke flytte stop");
      } finally {
        setDraggingStop(null);
      }
    }
  };

  const handleReorderInColumn = async (targetStop: RouteStop) => {
    if (!draggingStop || draggingStop.id === targetStop.id) { setDraggingStop(null); return; }
    if (draggingStop.route_id !== targetStop.route_id) {
      // Move to other column at target's position
      const targetRoute = routes.find((r) => r.id === targetStop.route_id);
      if (!targetRoute) return;
      try {
        await updateStop.mutateAsync({ id: draggingStop.id, route_id: targetStop.route_id, sequence: targetStop.sequence });
        // Bump target and others (best-effort: refresh)
        const colStops = stopsByRoute.get(targetStop.route_id) || [];
        await Promise.all(
          colStops
            .filter((s) => s.sequence >= targetStop.sequence)
            .map((s) => updateStop.mutateAsync({ id: s.id, sequence: s.sequence + 1 }))
        );
      } catch {}
    } else {
      // Reorder within column
      const colStops = (stopsByRoute.get(targetStop.route_id) || []).slice().sort((a, b) => a.sequence - b.sequence);
      const without = colStops.filter((s) => s.id !== draggingStop.id);
      const targetIdx = without.findIndex((s) => s.id === targetStop.id);
      const reordered = [...without.slice(0, targetIdx), draggingStop, ...without.slice(targetIdx)];
      try {
        await Promise.all(reordered.map((s, i) => s.sequence !== i ? updateStop.mutateAsync({ id: s.id, sequence: i }) : null));
      } catch {}
    }
    setDraggingStop(null);
  };

  return (
    <div className="min-h-screen bg-secondary/40">
      <header className="bg-background border-b sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center gap-3 flex-wrap">
          <Button asChild variant="ghost" size="sm"><Link to="/virksomhed"><ArrowLeft className="h-4 w-4 mr-1" />Tilbage</Link></Button>
          <h1 className="text-lg font-semibold">Ruteplanlægger</h1>
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setDate(format(addDays(parseISO(date), -1), "yyyy-MM-dd"))}><ChevronLeft className="h-4 w-4" /></Button>
            <div className="flex items-center gap-2">
              <CalendarIcon className="h-4 w-4 text-muted-foreground" />
              <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-[170px]" />
            </div>
            <Button variant="outline" size="icon" onClick={() => setDate(format(addDays(parseISO(date), 1), "yyyy-MM-dd"))}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" onClick={() => setDate(todayStr())}>I dag</Button>
          </div>
        </div>
        <div className="container mx-auto px-4 pb-2 text-sm text-muted-foreground">
          {format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da })}
        </div>
      </header>

      <div className="container mx-auto px-4 py-4 grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-4">
        {/* Unassigned jobs */}
        <aside>
          <Card className="p-3">
            <h2 className="font-semibold mb-2 text-sm">Ledige opgaver ({unassigned.length})</h2>
            <p className="text-xs text-muted-foreground mb-3">Træk en opgave over til en medarbejder.</p>
            <div className="space-y-2 max-h-[70vh] overflow-y-auto">
              {unassigned.length === 0 && (
                <p className="text-xs text-muted-foreground italic">Ingen ledige opgaver.</p>
              )}
              {unassigned.map((job: any) => (
                <div
                  key={job.id}
                  draggable
                  onDragStart={() => { setDraggingJob(job); setDraggingStop(null); }}
                  onDragEnd={() => setDraggingJob(null)}
                  className="rounded-md border bg-background p-2 cursor-grab active:cursor-grabbing hover:border-primary transition-colors"
                >
                  <div className="flex items-start gap-2">
                    <GripVertical className="h-3.5 w-3.5 text-muted-foreground mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{job.customer_name}</p>
                      <p className="text-xs text-muted-foreground truncate">{Math.round(Number(job.total_amount || 0))} kr · {job.status}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </aside>

        {/* Employee columns */}
        <main>
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.max(activeEmployees.length + 1, 1)}, minmax(220px, 1fr))` }}>
            {/* Unassigned-route column (no employee) */}
            <EmployeeColumn
              key="unassigned-route"
              label="Uden medarbejder"
              subtitle="Ruter uden tildeling"
              stops={(stopsByRoute.get(routeForEmployee(null)?.id || "") || [])}
              onDropColumn={() => handleDropOnEmployee(null)}
              onDragStartStop={(s) => { setDraggingStop(s); setDraggingJob(null); }}
              onDragEndStop={() => setDraggingStop(null)}
              onReorderTarget={handleReorderInColumn}
              onDeleteStop={(id) => deleteStop.mutate(id)}
            />
            {activeEmployees.map((emp: any) => (
              <EmployeeColumn
                key={emp.id}
                label={emp.name}
                subtitle={emp.title || emp.email}
                stops={(stopsByRoute.get(routeForEmployee(emp.id)?.id || "") || [])}
                onDropColumn={() => handleDropOnEmployee(emp.id)}
                onDragStartStop={(s) => { setDraggingStop(s); setDraggingJob(null); }}
                onDragEndStop={() => setDraggingStop(null)}
                onReorderTarget={handleReorderInColumn}
                onDeleteStop={(id) => deleteStop.mutate(id)}
              />
            ))}
            {activeEmployees.length === 0 && (
              <div className="col-span-full">
                <Card className="p-6 text-center text-sm text-muted-foreground">
                  Ingen aktive medarbejdere. Tilføj medarbejdere under <Link to="/virksomhed" className="underline">Medarbejdere</Link>.
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

/* ─── Single employee column ─── */
type ColProps = {
  label: string;
  subtitle?: string;
  stops: RouteStop[];
  onDropColumn: () => void;
  onDragStartStop: (s: RouteStop) => void;
  onDragEndStop: () => void;
  onReorderTarget: (target: RouteStop) => void;
  onDeleteStop: (id: string) => void;
};

const EmployeeColumn = ({ label, subtitle, stops, onDropColumn, onDragStartStop, onDragEndStop, onReorderTarget, onDeleteStop }: ColProps) => {
  const [over, setOver] = useState(false);
  const sorted = [...stops].sort((a, b) => a.sequence - b.sequence);
  return (
    <Card
      className={`p-3 transition-colors ${over ? "border-primary bg-primary/5" : ""}`}
      onDragOver={(e) => { e.preventDefault(); setOver(true); }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => { e.preventDefault(); setOver(false); onDropColumn(); }}
    >
      <div className="mb-3">
        <p className="font-semibold text-sm">{label}</p>
        {subtitle && <p className="text-xs text-muted-foreground truncate">{subtitle}</p>}
        <Badge variant="secondary" className="mt-1 text-xs">{sorted.length} stop</Badge>
      </div>
      <div className="space-y-2 min-h-[120px]">
        {sorted.length === 0 && <p className="text-xs text-muted-foreground italic text-center py-6">Slip opgaver her</p>}
        {sorted.map((s, i) => (
          <div
            key={s.id}
            draggable
            onDragStart={(e) => { e.stopPropagation(); onDragStartStop(s); }}
            onDragEnd={onDragEndStop}
            onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
            onDrop={(e) => { e.preventDefault(); e.stopPropagation(); onReorderTarget(s); }}
            className="rounded-md border bg-background p-2 cursor-grab active:cursor-grabbing hover:border-primary transition-colors"
          >
            <div className="flex items-start gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground text-[10px] font-semibold shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{s.customer_name || "Stop"}</p>
                {s.address && <p className="text-xs text-muted-foreground truncate flex items-center gap-1"><MapPin className="h-3 w-3" />{s.address}</p>}
                {s.service_summary && <p className="text-xs text-muted-foreground truncate">{s.service_summary}</p>}
              </div>
              <button onClick={() => onDeleteStop(s.id)} className="p-1 rounded hover:bg-destructive/10 text-muted-foreground hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RoutePlanner;
