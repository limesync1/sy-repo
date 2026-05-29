// Mobil ruteplanlægger — tap-baseret alternativ til desktop drag-and-drop.
// Aktiveres under 768px (telefoner). Genbruger de samme data- og
// mutations-hooks som desktop, men med en fingervenlig UI: dato-strip,
// dagens ruter fylder skærmen, og en fast bund-knap åbner en bottom-sheet
// med alle uplanlagte aftaler. Mønstret følger almindelige iOS/Android
// "action bar + bottom sheet" konventioner i stedet for en peek-drawer
// der konstant ændrer layoutet.
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
  Search,
} from "lucide-react";

import { AdminShell } from "@/components/admin/shared/AdminShell";
import SEO from "@/components/SEO";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
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
  const { data: business, isLoading: loadingBusiness } = useMyBusiness();
  const businessId = business?.id;

  const [date, setDate] = useState<string>(todayStr());
  const [search, setSearch] = useState("");
  const [assignJob, setAssignJob] = useState<any | null>(null);
  const [openRoute, setOpenRoute] = useState<Route | null>(null);
  const [creating, setCreating] = useState(false);
  // Bottom-sheet for uplanlagte aftaler. Lukket som standard; en fast
  // bund-knap viser antallet og åbner sheeten.
  const [unassignedOpen, setUnassignedOpen] = useState(false);

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

  // AdminShell forventer en indlæst virksomhed — vis skeleton imens.
  if (loadingBusiness || !business) {
    return (
      <div className="flex min-h-dvh flex-col gap-3 p-4">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
      </div>
    );
  }

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
        <div className="relative flex h-full min-h-0 flex-col bg-gradient-to-b from-background via-background to-secondary/20">
          {/* Dato-strip */}
          <div className="shrink-0 border-b border-border/60 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-3 pt-3 pb-2.5">
            <div className="mb-2.5 flex items-center justify-between">
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setDate(format(addDays(parseISO(date), -7), "yyyy-MM-dd"))}
                aria-label="Forrige uge"
              >
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <button
                type="button"
                onClick={() => setDate(todayStr())}
                className="rounded-full px-3 py-1 text-sm font-semibold capitalize tabular-nums text-foreground hover:bg-secondary transition-colors"
              >
                {weekLabel}
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setDate(format(addDays(parseISO(date), 7), "yyyy-MM-dd"))}
                aria-label="Næste uge"
              >
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>
            <div className="grid grid-cols-7 gap-1.5">
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
                      "relative flex flex-col items-center gap-0.5 rounded-xl py-2 transition-all",
                      isSel
                        ? "bg-foreground text-background shadow-sm scale-[1.02]"
                        : "hover:bg-secondary active:scale-95",
                    )}
                  >
                    <span className={cn("text-[10px] uppercase", isSel ? "text-background/70" : "text-muted-foreground")}>
                      {format(dt, "EEEEEE", { locale: da })}
                    </span>
                    <span className={cn("text-[15px] font-semibold tabular-nums leading-none", isToday && !isSel && "text-accent")}>
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

          {/* Hovedindhold: dagens ruter — fylder pladsen mellem dato-strip og bund-knap */}
          <div className="min-h-0 flex-1 overflow-y-auto px-3 pt-3 pb-24">
            <RoutesTab
              loading={loadingCalendar}
              date={date}
              routes={dayRoutes}
              stopsByRoute={stopsByRoute}
              onOpenRoute={setOpenRoute}
              onCreate={handleCreateRoute}
              creating={creating}
            />
          </div>

          {/* Fast bund-knap: åbner bottom-sheet med uplanlagte aftaler */}
          <UnassignedBottomBar
            total={unassigned.length}
            loading={loadingUnassigned}
            onOpen={() => setUnassignedOpen(true)}
          />
        </div>
      </AdminShell>

      {/* Bottom-sheet med søgning + fuld liste */}
      <UnassignedSheet
        open={unassignedOpen}
        onOpenChange={setUnassignedOpen}
        loading={loadingUnassigned}
        search={search}
        setSearch={setSearch}
        jobs={filteredUnassigned}
        total={unassigned.length}
        onAssign={(job) => {
          setAssignJob(job);
          setUnassignedOpen(false);
        }}
      />

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
          route={allRoutes.find((r) => r.id === openRoute.id) ?? openRoute}
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
      <div className="space-y-2.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {/* Dagsoverskrift */}
      <div className="flex items-center justify-between pb-1">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Dagens ruter
          </p>
          <p className="mt-0.5 text-base font-semibold capitalize text-foreground">
            {format(parseISO(date), "EEEE d. MMM", { locale: da })}
          </p>
        </div>
        <Button onClick={onCreate} disabled={creating} size="sm" className="gap-1.5 rounded-full">
          <Plus className="h-4 w-4" />
          Ny rute
        </Button>
      </div>

      {routes.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-card/40 py-14 text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
            <CalendarClock className="h-7 w-7 text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-foreground">Ingen ruter denne dag</p>
          <p className="mt-1 max-w-[18rem] text-xs leading-snug text-muted-foreground">
            Opret en rute, eller tildel aftaler fra panelet "Uden rute" nederst.
          </p>
        </div>
      ) : (
        routes.map((r) => {
          const stops = stopsByRoute.get(r.id) ?? [];
          const done = stops.filter((s) => s.status === "completed").length;
          const totalMin = r.total_duration_minutes ?? 0;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => onOpenRoute(r)}
              className="group flex w-full items-stretch gap-3 overflow-hidden rounded-2xl border border-border bg-card p-3 text-left shadow-sm transition-all hover:border-foreground/20 hover:shadow-md active:scale-[0.99]"
            >
              <span
                className="w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: r.color }}
                aria-hidden
              />
              <div className="min-w-0 flex-1 py-0.5">
                <p className="truncate text-[15px] font-semibold leading-tight text-foreground">
                  {r.name || "Rute uden navn"}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                  <span className="inline-flex items-center gap-1 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-foreground">
                    <MapPin className="h-3 w-3" />
                    {stops.length} stop
                  </span>
                  {r.total_distance_km != null && r.total_distance_km > 0 && (
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground">
                      {Math.round(r.total_distance_km)} km
                    </span>
                  )}
                  {totalMin > 0 && (
                    <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium tabular-nums text-foreground">
                      {formatDur(totalMin)}
                    </span>
                  )}
                  {done > 0 && (
                    <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium tabular-nums text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300">
                      {done} udført
                    </span>
                  )}
                </div>
              </div>
              <ChevronRight className="h-5 w-5 shrink-0 self-center text-muted-foreground transition-transform group-hover:translate-x-0.5" />
            </button>
          );
        })
      )}
    </div>
  );
}

/* ──────────────────────── Uden-rute bund-bar ────────────────────────
 * Fast knap nederst på skærmen der viser antallet af uplanlagte aftaler
 * og åbner en bottom-sheet med fuld liste + søgning. Et roligt, kendt
 * mobilmønster — ingen peek/expand-animationer der flytter layoutet.
 */
function UnassignedBottomBar({
  total,
  loading,
  onOpen,
}: {
  total: number;
  loading: boolean;
  onOpen: () => void;
}) {
  const empty = !loading && total === 0;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-0 z-30 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 bg-gradient-to-t from-background via-background/85 to-transparent">
      <button
        type="button"
        onClick={onOpen}
        disabled={empty}
        aria-label={empty ? "Alle aftaler er planlagt" : `Åbn ${total} aftaler uden rute`}
        className={cn(
          "pointer-events-auto flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left shadow-lg transition-all active:scale-[0.99]",
          empty
            ? "border-border bg-card/80 text-muted-foreground"
            : "border-foreground/10 bg-foreground text-background hover:bg-foreground/95",
        )}
      >
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
            empty ? "bg-secondary text-muted-foreground" : "bg-background/15 text-background",
          )}
        >
          <Inbox className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <p className={cn("text-[11px] font-semibold uppercase tracking-wider", empty ? "text-muted-foreground" : "text-background/70")}>
            Aftaler uden rute
          </p>
          <p className="truncate text-sm font-semibold">
            {loading
              ? "Henter…"
              : empty
              ? "Alt er planlagt"
              : `${total} ${total === 1 ? "aftale venter på en rute" : "aftaler venter på en rute"}`}
          </p>
        </div>
        {!empty && !loading && (
          <Badge
            variant="secondary"
            className="h-6 shrink-0 rounded-full bg-background/15 px-2.5 text-[12px] font-semibold tabular-nums text-background"
          >
            {total}
          </Badge>
        )}
      </button>
    </div>
  );
}

/* ──────────────────────── Uden-rute bottom-sheet ──────────────────────── */
function UnassignedSheet({
  open,
  onOpenChange,
  loading,
  search,
  setSearch,
  jobs,
  total,
  onAssign,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  loading: boolean;
  search: string;
  setSearch: (v: string) => void;
  jobs: any[];
  total: number;
  onAssign: (job: any) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="flex h-[85dvh] flex-col gap-0 p-0"
      >
        <SheetHeader className="space-y-2 border-b border-border/60 px-4 pb-3 pt-5 text-left">
          <div className="mx-auto -mt-2 mb-1 h-1 w-10 rounded-full bg-muted-foreground/30" aria-hidden />
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary">
              <Inbox className="h-4 w-4 text-foreground" />
            </div>
            <div className="min-w-0 flex-1">
              <SheetTitle className="text-base font-semibold leading-tight">
                Aftaler uden rute
              </SheetTitle>
              <p className="text-xs text-muted-foreground">
                {total === 0
                  ? "Alle aftaler er planlagt"
                  : `${total} ${total === 1 ? "aftale" : "aftaler"} mangler en rute`}
              </p>
            </div>
          </div>
          {total > 0 && (
            <div className="relative pt-1">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 mt-0.5 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Søg kunde eller adresse"
                className="h-10 rounded-full pl-8"
              />
            </div>
          )}
        </SheetHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-6 pt-3">
          {loading ? (
            <div className="space-y-2">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-2xl" />
              ))}
            </div>
          ) : total === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary">
                <Inbox className="h-7 w-7 text-muted-foreground" />
              </div>
              <p className="text-sm font-semibold text-foreground">Alle aftaler er planlagt</p>
              <p className="mt-1 max-w-[18rem] text-xs text-muted-foreground">
                Når nye aftaler kommer ind dukker de op her, klar til at blive tildelt en rute.
              </p>
            </div>
          ) : jobs.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Ingen aftaler matcher søgningen.
            </div>
          ) : (
            <div className="space-y-2">
              {jobs.map((job) => (
                <UnassignedCard key={job.id} job={job} onAssign={onAssign} />
              ))}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function UnassignedCard({ job, onAssign }: { job: any; onAssign: (job: any) => void }) {
  const pending = isJobPending(job);
  const wishDate = effectiveJobDate(job);
  return (
    <div className="rounded-2xl border border-border bg-card p-3 shadow-sm">
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
          <Badge variant="outline" className="shrink-0 rounded-full px-2 text-[10px] font-medium tabular-nums">
            Ønsket {format(parseISO(wishDate), "d. MMM", { locale: da })}
          </Badge>
        )}
      </div>
      <p className="mt-1.5 line-clamp-2 text-xs text-muted-foreground">
        {serviceSummaryForJob(job)}
      </p>
      {pending ? (
        <div className="mt-2.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
          Aftalen kan først planlægges når kunden har godkendt tilbuddet.
        </div>
      ) : (
        <Button
          onClick={() => onAssign(job)}
          className="mt-2.5 w-full gap-2 rounded-full"
          size="sm"
        >
          <Plus className="h-4 w-4" />
          Tildel til rute
        </Button>
      )}
    </div>
  );
}

export { formatDur };