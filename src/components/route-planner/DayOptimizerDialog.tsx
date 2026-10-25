// Optimér dagen: finder den hurtigste rækkefølge for alle dagens ruter og
// viser køretiden pr. medarbejder før og efter.
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Car, Gauge, Loader2, Route as RouteIcon, Sparkles, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Section, SheetFooterBar, SheetHeaderBlock } from "./SheetSection";
import { useOptimizeRoute } from "@/hooks/useRoutes";
import { toast } from "sonner";
import PlannerDialogHeader from "./PlannerDialogHeader";

type Props = { open: boolean; onOpenChange: (v: boolean) => void; businessId: string | null | undefined; date: string };

type RouteRow = { id: string; name: string | null; employee_id: string | null; color: string | null };
type Totals = { minutes: number; km: number; stops: number };
type EmployeeRow = { key: string; name: string; color: string | null; routes: RouteRow[]; totals: Totals };

const fmtMin = (m: number) => {
  const r = Math.round(m);
  return r >= 60 ? `${Math.floor(r / 60)} t ${r % 60} min` : `${r} min`;
};

function useDayData(businessId: string | null | undefined, date: string, enabled: boolean) {
  return useQuery({
    queryKey: ["day-optimizer", businessId, date],
    enabled: enabled && !!businessId,
    queryFn: async () => {
      if (!businessId) throw new Error("Virksomhed mangler");
      const { data: routes, error } = await supabase
        .from("routes")
        .select("id, name, employee_id, color")
        .eq("business_id", businessId)
        .eq("route_date", date)
        .is("deleted_at", null)
        .is("archived_at", null);
      if (error) throw error;
      const ids = (routes ?? []).map((r) => r.id);
      if (ids.length === 0) return { routes: [] as RouteRow[], stops: [], employees: [], links: [] };
      const [{ data: stops, error: e1 }, { data: links, error: e2 }] = await Promise.all([
        supabase.from("route_stops").select("id, route_id, status, assigned_employee_id, travel_time_to_next_min, distance_to_next_km").in("route_id", ids),
        supabase.from("route_employees").select("route_id, employee_id").in("route_id", ids),
      ]);
      if (e1) throw e1; if (e2) throw e2;
      // Udførte stop tæller ikke med, og fuldt udførte ruter er ikke til at optimere.
      const openStops = (stops ?? []).filter((s: any) => s.status !== "completed");
      const openRouteIds = new Set(openStops.map((s: any) => s.route_id));
      const liveRoutes = (routes ?? []).filter((r) => openRouteIds.has(r.id));
      // Medarbejdere sidder oftest på de enkelte stop, ikke på selve ruten.
      const stopIds = openStops.map((s: any) => s.id);
      const { data: stopAssignees } = stopIds.length
        ? await supabase.from("route_stop_assignees").select("stop_id, employee_id").in("stop_id", stopIds)
        : { data: [] as { stop_id: string; employee_id: string }[] };
      const routeOfStop = new Map(openStops.map((s: any) => [s.id, s.route_id]));
      const allLinks = [
        ...(links ?? []),
        ...openStops.filter((s: any) => s.assigned_employee_id).map((s: any) => ({ route_id: s.route_id, employee_id: s.assigned_employee_id })),
        ...(stopAssignees ?? []).map((a) => ({ route_id: routeOfStop.get(a.stop_id) as string, employee_id: a.employee_id })),
      ];
      const empIds = Array.from(new Set([...liveRoutes.map((r) => r.employee_id), ...allLinks.map((l) => l.employee_id)].filter(Boolean))) as string[];
      const { data: employees } = empIds.length
        ? await supabase.from("employees").select("id, name, color").in("id", empIds)
        : { data: [] as { id: string; name: string; color: string | null }[] };
      return { routes: liveRoutes as RouteRow[], stops: openStops, employees: employees ?? [], links: allLinks };
    },
  });
}

function buildRows(d: ReturnType<typeof useDayData>["data"]): EmployeeRow[] {
  if (!d) return [];
  const perRoute = new Map<string, Totals>();
  for (const s of d.stops) {
    const t = perRoute.get(s.route_id) ?? { minutes: 0, km: 0, stops: 0 };
    t.minutes += Number(s.travel_time_to_next_min) || 0;
    t.km += Number(s.distance_to_next_km) || 0;
    t.stops += 1;
    perRoute.set(s.route_id, t);
  }
  const empById = new Map(d.employees.map((e) => [e.id, e]));
  const rows = new Map<string, EmployeeRow>();
  for (const r of d.routes) {
    const empIds = new Set<string>([r.employee_id, ...d.links.filter((l) => l.route_id === r.id).map((l) => l.employee_id)].filter(Boolean) as string[]);
    const keys = empIds.size ? [...empIds] : ["__none"];
    for (const k of keys) {
      const e = empById.get(k);
      const row = rows.get(k) ?? { key: k, name: e?.name ?? "Uden medarbejder", color: e?.color ?? null, routes: [], totals: { minutes: 0, km: 0, stops: 0 } };
      row.routes.push(r);
      const t = perRoute.get(r.id) ?? { minutes: 0, km: 0, stops: 0 };
      row.totals = { minutes: row.totals.minutes + t.minutes, km: row.totals.km + t.km, stops: row.totals.stops + t.stops };
      rows.set(k, row);
    }
  }
  return [...rows.values()].sort((a, b) => b.totals.minutes - a.totals.minutes);
}

export default function DayOptimizerDialog({ open, onOpenChange, businessId, date }: Props) {
  const qc = useQueryClient();
  const optimize = useOptimizeRoute();
  const { data, isLoading, error, refetch } = useDayData(businessId, date, open);
  const rows = useMemo(() => buildRows(data), [data]);
  const [before, setBefore] = useState<Map<string, Totals> | null>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const routeCount = data?.routes.length ?? 0;

  const run = async () => {
    if (!data || routeCount === 0) return;
    setBusy(true); setProgress(0);
    setBefore(new Map(rows.map((r) => [r.key, r.totals])));
    let failed = 0;
    for (const r of data.routes) {
      try { await optimize.mutateAsync(r.id); } catch { failed++; }
      setProgress((p) => p + 1);
    }
    await refetch();
    qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
    setBusy(false);
    if (failed) toast.error(`${failed} af ${routeCount} ruter kunne ikke optimeres`, { description: "Tjek at alle adresser har en placering, og prøv igen." });
    else toast.success("Alle ruter har nu den hurtigste rækkefølge");
  };

  const totalNow = rows.reduce((s, r) => s + r.totals.minutes, 0);
  const totalBefore = before ? [...before.values()].reduce((s, t) => s + t.minutes, 0) : null;
  const dateLabel = format(parseISO(date), "EEEE d. MMMM", { locale: da });

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) { onOpenChange(v); if (!v) setBefore(null); } }}>
      <DialogContent className="appointment-details-overlay planner-overlay w-[calc(100vw-1rem)] max-w-xl sm:max-w-xl max-h-[calc(100dvh-1rem)] flex flex-col rounded-md p-0 pb-0 sm:p-0 overflow-hidden gap-0">
        <PlannerDialogHeader icon="optimizeDay" title="Optimér dagen" description={<span className="first-letter:uppercase">{dateLabel} · Hurtigste rækkefølge og køretid pr. medarbejder</span>} />

        <div className="planner-overlay-body min-h-0 flex-1 overflow-y-auto space-y-4 bg-secondary/20 p-4 sm:p-5">
          <Section icon={<Car className="h-4 w-4" />} title="Samlet køretid" tone="sky" hint={`${routeCount} rute${routeCount === 1 ? "" : "r"}`}>
            <div className="flex flex-wrap items-baseline gap-3 tabular-nums">
              {totalNow === 0 && totalBefore == null && rows.every((r) => r.totals.km === 0)
                ? <span className="text-base font-semibold text-muted-foreground">Ikke beregnet endnu — tryk «Find hurtigste ruter»</span>
                : <span className="text-2xl font-bold text-foreground">{fmtMin(totalNow)}</span>}
              {totalBefore != null && totalBefore - totalNow >= 1 && (
                <span className="text-sm font-semibold text-success">sparet {fmtMin(totalBefore - totalNow)}</span>
              )}
              {totalBefore != null && totalBefore - totalNow < 1 && !busy && (
                <span className="text-sm text-muted-foreground">Allerede den hurtigste rækkefølge</span>
              )}
            </div>
          </Section>

          <Section icon={<Users className="h-4 w-4" />} title="Køretid pr. medarbejder" tone="primary">
            {isLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" />Henter dagens ruter…</p>}
            {error && <p className="text-sm text-destructive">Kunne ikke hente ruterne. Prøv igen om lidt.</p>}
            {!isLoading && !error && rows.length === 0 && <p className="text-sm text-muted-foreground">Der er ingen ruter denne dag.</p>}
            <ul className="divide-y divide-border">
              {rows.map((r) => {
                const b = before?.get(r.key);
                const saved = b ? b.minutes - r.totals.minutes : 0;
                return (
                  <li key={r.key} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                    <span className="h-8 w-1.5 shrink-0 rounded-full bg-muted" style={r.color ? { background: r.color } : undefined} aria-hidden />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-foreground">{r.name}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {r.routes.length} rute{r.routes.length === 1 ? "" : "r"} · {r.totals.stops} stop · {r.totals.km.toFixed(1)} km
                      </p>
                    </div>
                    <div className="text-right tabular-nums">
                      <p className="text-sm font-bold text-foreground">{r.totals.minutes === 0 && r.totals.km === 0 && !b ? "—" : fmtMin(r.totals.minutes)}</p>
                      {b && saved >= 1 && <p className="text-xs font-medium text-success">−{fmtMin(saved)}</p>}
                      {b && saved < 1 && <p className="text-xs text-muted-foreground">uændret</p>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </Section>
          <p className="flex items-start gap-2 text-xs leading-snug text-muted-foreground">
            <RouteIcon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Hver rute beholder sin medarbejder og sine faste stop. Kun rækkefølgen ændres, og du kan fortryde i rutens historik.
          </p>
        </div>

        <SheetFooterBar className="flex items-center gap-2 bg-card">
          <Button variant="outline" className="h-11" disabled={busy} onClick={() => onOpenChange(false)}>Luk</Button>
          <div className="flex-1" />
          <Button className="h-11 gap-2" disabled={busy || routeCount === 0 || isLoading} onClick={() => void run()}>
            {busy ? <><Loader2 className="h-4 w-4 animate-spin" />Optimerer {progress}/{routeCount}</> : <><Sparkles className="h-4 w-4" />Find hurtigste ruter</>}
          </Button>
        </SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
}
