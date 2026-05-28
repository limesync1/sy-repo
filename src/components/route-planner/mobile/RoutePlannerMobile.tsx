// Mobil ruteplanlægger — tap-baseret alternativ til desktop drag-and-drop.
// Aktiveres under 900px (telefon / tablet i portræt). Genbruger de samme
// data- og mutations-hooks som desktop-planlæggeren, men med en
// fingervenlig UI: dato-strip, faner for ruter/uden-rute, og bottom-sheets
// til tildeling og detaljer.
import { useMemo, useState } from "react";
import {
  addDays,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { da } from "date-fns/locale";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  Inbox,
  MapPin,
  Plus,
  Route as RouteIcon,
  Search,
} from "lucide-react";

import { AdminShell } from "@/components/admin/shared/AdminShell";
import SEO from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { useMyBusiness } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import {
  useCalendarData,
  useCreateRoute,
  useUnassignedJobs,
  type Route,
  type RouteStop,
} from "@/hooks/useRoutes";
import ThemeToggle, { usePlannerThemeEffect } from "@/components/route-planner/ThemeToggle";
import { pickAvailableColor } from "@/components/route-planner/RouteEditSheet";
import { toast } from "sonner";

import {
  effectiveJobDate,
  isJobPending,
  jobAddress,
  serviceSummaryForJob,
} from "./mobile-helpers";
import { MobileAssignSheet } from "./MobileAssignSheet";
import { MobileRouteDetailSheet } from "./MobileRouteDetailSheet";

const todayStr = () => format(new Date(), "yyyy-MM-dd");

const formatDur = (min: number) => {
  if (!min) return "0 min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h} t`;
  return `${h} t ${m} min`;
};

export default function RoutePlannerMobile() {
  // Mørk-tilstand for hele siden mens planlæggeren er åben.
  usePlannerThemeEffect();
  const { data: business } = useMyBusiness();
  const businessId = business?.id;

  const [date, setDate] = useState<string>(todayStr());
  const [tab, setTab] = useState<"routes" | "unassigned">("routes");
  const [search, setSearch] = useState("");
  const [assignJob, setAssignJob] = useState<any | null>(null);
  const [openRoute, setOpenRoute] = useState<Route | null>(null);
  const [creating, setCreating] = useState(false);

  const { data: employees = [] } = useEmployees(businessId);

  // Hent ugen omkring den valgte dato, så dato-strippen kan vise rute-antal pr. dag.
  const weekRange = useMemo(() => {
    const ws = startOfWeek(parseISO(date), { weekStartsOn: 1 });
    return {
      start: format(ws, "yyyy-MM-dd"),
      end: format(addDays(ws, 6), "yyyy-MM-dd"),
      days: Array.from({ length: 7 }, (_, i) => format(addDays(ws, i), "yyyy-MM-dd")),
    };
  }, [date]);

  const { data: calendarData, isLoading: loadingCalendar } = useCalendarData(
    businessId,
    weekRange.start,
    weekRange.end,
  );
  const { data: unassigned = [], isLoading: loadingUnassigned } = useUnassignedJobs(businessId);

  const createRoute = useCreateRoute();

  const allRoutes = (calendarData?.routes ?? []).filter((r) => !(r as any).isVirtual);
  const allStops = calendarData?.stops ?? [];

  const routeCountByDate = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of allRoutes) m.set(r.route_date, (m.get(r.route_date) ?? 0) + 1);
    return m;
  }, [allRoutes]);

  const stopsByRoute = useMemo(() => {
    const m = new Map<string, RouteStop[]>();
    for (const s of allStops) {
      const arr = m.get(s.route_id) ?? [];
      arr.push(s);
      m.set(s.route_id, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.sequence - b.sequence);
    return m;
  }, [allStops]);

  const dayRoutes = useMemo(
    () =>
      allRoutes
        .filter((r) => r.route_date === date)
        .sort((a, b) => (a.name || "").localeCompare(b.name || "")),
    [allRoutes, date],
  );

  const filteredUnassigned = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return unassigned as any[];
    return (unassigned as any[]).filter(
      (j) =>
        j.customer_name?.toLowerCase().includes(q) ||
        j.address?.toLowerCase().includes(q) ||
        j.city?.toLowerCase().includes(q) ||
        j.zip_code?.toLowerCase().includes(q),
    );
  }, [unassigned, search]);

  const handleCreateRoute = async () => {
    if (!businessId || creating) return;
    setCreating(true);
    try {
      const usedColors = dayRoutes.map((r) => r.color);
      const created = await createRoute.mutateAsync({
        business_id: businessId,
        route_date: date,
        name: null,
        color: pickAvailableColor(usedColors),
      });
      toast.success("Ny rute oprettet");
      setOpenRoute(created);
    } catch (err: any) {
      toast.error("Kunne ikke oprette rute", { description: err?.message });
    } finally {
      setCreating(false);
    }
  };

  const weekLabel = `Uge ${format(parseISO(date), "I", { locale: da })} · ${format(parseISO(date), "MMM yyyy", { locale: da })}`;

  return (
    <>
      <SEO
        title="Ruteplanlægger – Serviceydere"
        description="Planlæg ruter på farten med den mobile ruteplanlægger."
        noIndex
      />
      <AdminShell
        business={business}
        activeTab="routes"
        contentPadding={false}
        contentClassName="flex flex-col overflow-hidden"
        topbarRight={<ThemeToggle />}
      >
        <div className="flex h-full min-h-0 flex-col bg-background">
          {/* Dato-strip */}
          <div className="shrink-0 border-b border-border bg-card px-3 pt-3 pb-2">
            <div className="mb-2 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setDate(format(addDays(parseISO(date), -7), "yyyy-MM-dd"))}
                aria-label="Forrige uge"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <button
                type="button"
                onClick={() => setDate(todayStr())}
                className="text-sm font-semibold capitalize tabular-nums text-foreground"
              >
                {weekLabel}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setDate(format(addDays(parseISO(date), 7), "yyyy-MM-dd"))}
                aria-label="Næste uge"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {weekRange.days.map((d) => {
                const dt = parseISO(d);
                const isSel = d === date;
                const isToday = d === todayStr();
                const count = routeCountByDate.get(d) ?? 0;
                return (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setDate(d)}
                    className={cn(
                      "flex flex-col items-center gap-0.5 rounded-lg py-1.5 transition-colors",
                      isSel ? "bg-foreground text-background" : "hover:bg-secondary",
                    )}
                  >
                    <span className={cn("text-[10px] uppercase", isSel ? "text-background/70" : "text-muted-foreground")}>
                      {format(dt, "EEEEEE", { locale: da })}
                    </span>
                    <span className={cn("text-sm font-semibold tabular-nums", isToday && !isSel && "text-accent")}>
                      {format(dt, "d")}
                    </span>
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        count > 0
                          ? isSel
                            ? "bg-background"
                            : "bg-accent"
                          : "bg-transparent",
                      )}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Faner */}
          <div className="grid shrink-0 grid-cols-2 border-b border-border bg-card">
            <button
              type="button"
              onClick={() => setTab("routes")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
                tab === "routes"
                  ? "border-b-2 border-foreground text-foreground"
                  : "border-b-2 border-transparent text-muted-foreground",
              )}
            >
              <RouteIcon className="h-4 w-4" />
              Ruter
            </button>
            <button
              type="button"
              onClick={() => setTab("unassigned")}
              className={cn(
                "flex items-center justify-center gap-1.5 py-2.5 text-sm font-medium transition-colors",
                tab === "unassigned"
                  ? "border-b-2 border-foreground text-foreground"
                  : "border-b-2 border-transparent text-muted-foreground",
              )}
            >
              <Inbox className="h-4 w-4" />
              Uden rute
              {unassigned.length > 0 && (
                <Badge variant="secondary" className="ml-0.5 h-5 px-1.5 text-[11px] tabular-nums">
                  {unassigned.length}
                </Badge>
              )}
            </button>
          </div>

          {/* Indhold */}
          <div className="min-h-0 flex-1 overflow-y-auto p-3">
            {tab === "routes" ? (
              <RoutesTab
                loading={loadingCalendar}
                date={date}
                routes={dayRoutes}
                stopsByRoute={stopsByRoute}
                onOpenRoute={setOpenRoute}
                onCreate={handleCreateRoute}
                creating={creating}
              />
            ) : (
              <UnassignedTab
                loading={loadingUnassigned}
                search={search}
                setSearch={setSearch}
                jobs={filteredUnassigned}
                total={unassigned.length}
                onAssign={setAssignJob}
              />
            )}
          </div>
        </div>
      </AdminShell>

      {/* Sheets */}
      {assignJob && businessId && (
        <MobileAssignSheet
          open={!!assignJob}
          onOpenChange={(o) => !o && setAssignJob(null)}
          job={assignJob}
          businessId={businessId}
          initialDate={effectiveJobDate(assignJob) || date}
        />
      )}
      {openRoute && businessId && (
        <MobileRouteDetailSheet
          open={!!openRoute}
          onOpenChange={(o) => !o && setOpenRoute(null)}
          route={openRoute}
          businessId={businessId}
          employees={employees as any[]}
          stops={stopsByRoute.get(openRoute.id) ?? []}
        />
      )}
    </>
  );
}

/* ─────────────────────────── Ruter-fane ─────────────────────────── */
function RoutesTab({
  loading,
  date,
  routes,
  stopsByRoute,
  onOpenRoute,
  onCreate,
  creating,
}: {
  loading: boolean;
  date: string;
  routes: Route[];
  stopsByRoute: Map<string, RouteStop[]>;
  onOpenRoute: (r: Route) => void;
  onCreate: () => void;
  creating: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      <Button onClick={onCreate} disabled={creating} className="w-full gap-2" size="lg">
        <Plus className="h-4 w-4" />
        Opret rute den {format(parseISO(date), "d. MMM", { locale: da })}
      </Button>

      {routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <CalendarClock className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Ingen ruter denne dag</p>
          <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">
            Opret en rute, eller tildel aftaler fra fanen "Uden rute".
          </p>
        </div>
      ) : (
        routes.map((r) => {
          const stops = stopsByRoute.get(r.id) ?? [];
          const done = stops.filter((s) => s.status === "completed").length;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onOpenRoute(r)}
              className="flex w-full items-center gap-3 rounded-xl border border-border bg-card p-3 text-left transition-colors hover:bg-secondary/50 active:scale-[0.99]"
            >
              <span
                className="h-10 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: r.color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-foreground">
                  {r.name || "Rute uden navn"}
                </p>
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />
                    {stops.length} stop
                  </span>
                  {done > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400">{done} udført</span>
                  )}
                  {r.total_distance_km != null && r.total_distance_km > 0 && (
                    <span className="tabular-nums">{Math.round(r.total_distance_km)} km</span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
            </button>
          );
        })
      )}
    </div>
  );
}

/* ──────────────────────── Uden-rute-fane ──────────────────────── */
function UnassignedTab({
  loading,
  search,
  setSearch,
  jobs,
  total,
  onAssign,
}: {
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  jobs: any[];
  total: number;
  onAssign: (job: any) => void;
}) {
  return (
    <div className="space-y-2.5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Søg kunde eller adresse"
          className="h-10 pl-8"
        />
      </div>

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : total === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-12 text-center">
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
            <Inbox className="h-6 w-6 text-muted-foreground" />
          </div>
          <p className="text-sm font-medium text-foreground">Alle aftaler er planlagt</p>
          <p className="mt-1 max-w-[16rem] text-xs text-muted-foreground">
            Der er ingen aftaler uden en rute lige nu.
          </p>
        </div>
      ) : jobs.length === 0 ? (
        <div className="py-10 text-center text-sm text-muted-foreground">
          Ingen aftaler matcher søgningen.
        </div>
      ) : (
        jobs.map((job) => {
          const pending = isJobPending(job);
          const wishDate = effectiveJobDate(job);
          return (
            <div
              key={job.id}
              className="rounded-xl border border-border bg-card p-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {job.customer_name || "Ukendt kunde"}
                  </p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {jobAddress(job)}
                  </p>
                </div>
                {wishDate && (
                  <Badge variant="outline" className="shrink-0 text-[10px] tabular-nums">
                    {format(parseISO(wishDate), "d. MMM", { locale: da })}
                  </Badge>
                )}
              </div>
              <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
                {serviceSummaryForJob(job)}
              </p>
              {pending ? (
                <div className="mt-2.5 rounded-md bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
                  Aftalen kan først planlægges når kunden har godkendt tilbuddet.
                </div>
              ) : (
                <Button
                  onClick={() => onAssign(job)}
                  className="mt-2.5 w-full gap-2"
                  size="sm"
                >
                  <Plus className="h-4 w-4" />
                  Tildel til rute
                </Button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

export { formatDur };