import { formatPrice } from "@/lib/price-format";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3, ChevronDown, Calendar as CalendarIcon, Users, Palette,
  Inbox, AlertTriangle, TrendingUp,
} from "lucide-react";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval,
  format, eachDayOfInterval,
} from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { STOPS_PER_EMPLOYEE_DAY } from "./lib/stop-capacity";

/**
 * PlanningPanel — kompakt højrepanel for ruteplanlæggeren, åbnes via en knap
 * i topbaren. Viser planlagt omsætning, planlagt kørselstid pr. ugedag,
 * medarbejder-filter og en collapsible forklaringer-sektion (legend).
 *
 * Bruger udelukkende data som RoutePlanner allerede har hentet — ingen nye
 * DB-kald. Medarbejder-filteret er styret af parent (RoutePlanner) så det
 * deler state med det eksisterende filter.
 */
export type PlanningPanelStop = {
  id: string;
  route_id: string;
  order_id?: string | null;
  duration_minutes?: number | null;
  travel_time_to_next_min?: number | null;
};
export type PlanningPanelRoute = {
  id: string;
  route_date: string;
};
export type PlanningPanelEmployee = {
  id: string;
  name?: string | null;
  color?: string | null;
  avatar_url?: string | null;
};

const fmtKr = (n: number) =>
  formatPrice(n);

interface Props {
  businessId?: string;
  anchorDate: string; // yyyy-MM-dd
  stops: PlanningPanelStop[];
  routes: PlanningPanelRoute[];
  employees: PlanningPanelEmployee[];
  filterAssigneeIds: string[];
  onFilterAssigneeIds: (ids: string[]) => void;
  /** Antal aftaler i poolen som endnu ikke er lagt på en rute. */
  unassignedCount?: number;
  /** Bagudkompatibel prop. Belastning beregnes altid ud fra stop. */
  dailyCapacityMin?: number;
}

export const PlanningPanel = ({
  businessId, anchorDate, stops, routes, employees, filterAssigneeIds, onFilterAssigneeIds,
  unassignedCount = 0,
}: Props) => {
  const [open, setOpen] = useState(false);
  // Forklaringer er åbnet by-default — brugeren skal kunne se farve-
  // legenden uden et ekstra klik hver gang planlægningspanelet åbnes.
  const [explanationsOpen, setExplanationsOpen] = useState(true);

  // Hent total_amount for de ordrer der ligger som stops i det viste vindue.
  // Lazy: kun når panelet er åbnet første gang. Resultatet cacher pr.
  // (businessId + sorterede order-id'er).
  const orderIds = useMemo(
    () => Array.from(new Set(stops.map((s) => s.order_id).filter(Boolean))) as string[],
    [stops],
  );
  const { data: amountByOrder } = useQuery({
    queryKey: ["planning-panel-amounts", businessId, [...orderIds].sort().join(",")],
    enabled: open && !!businessId && orderIds.length > 0,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("id, total_amount, adjusted_amount, customer_response, status")
        .in("id", orderIds);
      if (error) throw error;
      const map = new Map<string, number>();
      for (const o of (data || []) as any[]) {
        if (["cancelled", "rejected"].includes(o.status)) continue;
        const amt = o.customer_response === "accepted" && o.adjusted_amount != null
          ? Number(o.adjusted_amount)
          : Number(o.total_amount);
        map.set(o.id, amt || 0);
      }
      return map;
    },
  });

  const stats = useMemo(() => {
    const now = parseISO(anchorDate);
    const wStart = startOfWeek(now, { weekStartsOn: 1 });
    const wEnd = endOfWeek(now, { weekStartsOn: 1 });
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);

    const routesById = new Map(routes.map((r) => [r.id, r]));
    const stopsByDate = new Map<string, PlanningPanelStop[]>();

    let weekRevenue = 0, monthRevenue = 0;
    for (const s of stops) {
      const r = routesById.get(s.route_id);
      if (!r?.route_date) continue;
      const dateKey = r.route_date.slice(0, 10);
      const arr = stopsByDate.get(dateKey) || [];
      arr.push(s);
      stopsByDate.set(dateKey, arr);
      const amt = s.order_id ? (amountByOrder?.get(s.order_id) || 0) : 0;
      const d = parseISO(dateKey);
      if (isWithinInterval(d, { start: wStart, end: wEnd })) weekRevenue += amt;
      if (isWithinInterval(d, { start: mStart, end: mEnd })) monthRevenue += amt;
    }

    const days = eachDayOfInterval({ start: wStart, end: wEnd });
    const loadPerDay = days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const dayStops = stopsByDate.get(key) || [];
      const capacity = Math.max(1, employees.length) * STOPS_PER_EMPLOYEE_DAY;
      return { date: d, key, stopCount: dayStops.length, capacity };
    }).filter((d) => d.stopCount > 0);

    // Aggregater til topkortene
    const weekStopCount = loadPerDay.reduce((acc, d) => acc + d.stopCount, 0);
    const activeDays = loadPerDay.length;
    const avgStopsPerDay = activeDays > 0 ? weekStopCount / activeDays : 0;
    const overbookedDays = loadPerDay.filter((d) => d.stopCount > d.capacity);

    return {
      weekRevenue, monthRevenue, loadPerDay,
      weekStopCount, avgStopsPerDay, overbookedDays,
    };
  }, [anchorDate, routes, stops, amountByOrder, employees.length]);

  const toggleEmployee = (id: string) => {
    if (filterAssigneeIds.includes(id)) {
      onFilterAssigneeIds(filterAssigneeIds.filter((x) => x !== id));
    } else {
      onFilterAssigneeIds([...filterAssigneeIds, id]);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-8 gap-1.5 rounded-md border-border/70 font-semibold hover:bg-secondary hover:text-foreground transition-colors"
          title="Overblik over uge, kapacitet og uplanlagte aftaler"
        >
          <BarChart3 className="h-3.5 w-3.5" />
          Overblik
          {(unassignedCount > 0) && (
            <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 rounded-full bg-feature-warm/15 text-feature-warm-foreground text-[10px] font-bold tabular-nums">
              {unassignedCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[360px] sm:max-w-sm p-0 overflow-y-auto bg-background">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/70 bg-card">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-secondary ring-1 ring-border/70">
              <BarChart3 className="h-3.5 w-3.5 text-foreground" />
            </span>
            <div>
              <SheetTitle className="text-base tracking-tight leading-none font-bold">Overblik</SheetTitle>
              <SheetDescription className="text-[11px] mt-1 capitalize">
                {format(parseISO(anchorDate), "MMMM yyyy", { locale: da })}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="px-5 py-4 space-y-5 bg-secondary/[0.12]">
          {/* Hurtigt overblik øverst — viser umiddelbart hvad der kræver
              opmærksomhed (uplanlagte aftaler, overbookede dage). */}
          {(unassignedCount > 0 || stats.overbookedDays.length > 0) && (
            <section className="space-y-2">
              {unassignedCount > 0 && (
                <div className="flex items-center gap-2 rounded-md border border-feature-warm/40 bg-feature-warm/10 px-3 py-2 text-xs">
                  <Inbox className="h-4 w-4 shrink-0 text-feature-warm-foreground" />
                  <span className="flex-1 text-foreground">
                    <strong className="font-semibold">{unassignedCount}</strong> aftale{unassignedCount === 1 ? "" : "r"} venter på en rute
                  </span>
                </div>
              )}
              {stats.overbookedDays.length > 0 && (
                <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  <div className="flex-1">
                    <p className="font-semibold text-foreground">
                      {stats.overbookedDays.length} overbooked dag{stats.overbookedDays.length === 1 ? "" : "e"}
                    </p>
                    <p className="text-muted-foreground">
                       {stats.overbookedDays.map((d) => format(d.date, "EEE d.", { locale: da })).join(", ")} — flere stop end dagens kapacitet
                    </p>
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Nøgletal denne uge */}
          <section>
            <SectionLabel icon={<TrendingUp className="h-3.5 w-3.5" />}>
              Denne uge
            </SectionLabel>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <MiniStat label="Aftaler" value={String(stats.weekStopCount)} />
              <MiniStat label="Snit/dag" value={stats.avgStopsPerDay > 0 ? stats.avgStopsPerDay.toFixed(1) : "—"} />
               <MiniStat label="Kapacitet/dag" value={`${Math.max(1, employees.length) * STOPS_PER_EMPLOYEE_DAY} stop`} />
            </div>
          </section>

          {/* Planlagt omsætning */}
          <section>
            <SectionLabel icon={<CalendarIcon className="h-3.5 w-3.5" />}>
              Planlagt omsætning
            </SectionLabel>
            <dl className="mt-2 space-y-1.5 text-sm">
              <Row label={`Uge ${format(parseISO(anchorDate), "I", { locale: da })}`} value={fmtKr(stats.weekRevenue)} />
              <Row label={format(parseISO(anchorDate), "MMMM", { locale: da })} value={fmtKr(stats.monthRevenue)} bold />
            </dl>
          </section>

          {/* Planlagt kørsel */}
           {stats.loadPerDay.length > 0 && (
            <section>
              <SectionLabel icon={<Clock className="h-3.5 w-3.5" />}>
                Belastning pr. dag
              </SectionLabel>
              <ul className="mt-2 space-y-1.5">
                 {stats.loadPerDay.map((d) => {
                   const pct = Math.min(100, Math.round((d.stopCount / d.capacity) * 100));
                   const over = d.stopCount > d.capacity;
                  return (
                    <li key={d.key} className="space-y-1">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="capitalize text-muted-foreground">
                          {format(d.date, "EEE d.", { locale: da }).replace(".", ".")}
                        </span>
                        <span className={cn("tabular-nums", over ? "font-semibold text-destructive" : "text-foreground")}>
                           {d.stopCount} af {d.capacity} stop
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary/60 ring-1 ring-inset ring-border/30">
                        <div
                          className={cn(
                            "h-full rounded-full transition-all",
                            over
                              ? "bg-gradient-to-r from-destructive/80 to-destructive shadow-[0_0_8px_hsl(var(--destructive)/0.55)]"
                              : pct > 75
                              ? "bg-gradient-to-r from-feature-warm/80 to-feature-warm"
                              : "bg-gradient-to-r from-foreground/70 to-foreground",
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 text-[11px] text-muted-foreground">
                 Kapaciteten er {STOPS_PER_EMPLOYEE_DAY} stop pr. aktiv medarbejder.
              </p>
            </section>
          )}

          {/* Medarbejder-filter */}
          {employees.length > 0 && (
            <section>
              <SectionLabel icon={<Users className="h-3.5 w-3.5" />}>
                Medarbejdere
              </SectionLabel>
              <p className="mt-1 text-[11px] text-muted-foreground">
                Vis kun ruter tildelt valgte medarbejdere. Tom = vis alle.
              </p>
              <ul className="mt-2 space-y-1">
                {employees.map((e) => {
                  const checked = filterAssigneeIds.includes(e.id);
                  return (
                    <li key={e.id}>
                      <label className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-secondary cursor-pointer text-sm">
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => toggleEmployee(e.id)}
                        />
                        <EmployeeAvatarChip employee={e} />
                        <span className="truncate">{e.name || "Uden navn"}</span>
                      </label>
                    </li>
                  );
                })}
              </ul>
              {filterAssigneeIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => onFilterAssigneeIds([])}
                  className="mt-2 text-[11px] font-medium text-muted-foreground hover:text-foreground"
                >
                  Ryd filter
                </button>
              )}
            </section>
          )}

          {/* Forklaringer */}
          <section>
            <button
              type="button"
              onClick={() => setExplanationsOpen((v) => !v)}
              className="flex w-full items-center justify-between text-left"
            >
              <SectionLabel icon={<Palette className="h-3.5 w-3.5" />}>
                Forklaringer
              </SectionLabel>
              <ChevronDown
                className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${explanationsOpen ? "rotate-180" : ""}`}
              />
            </button>
            {explanationsOpen && (
              <div className="mt-2 space-y-3 text-xs">
                <LegendGroup title="Ordrestatus">
                  <LegendDot color="hsl(220 14% 70%)" label="Afventer" />
                  <LegendDot color="hsl(217 91% 60%)" label="Bekræftet" />
                  <LegendDot color="hsl(43 96% 56%)" label="I gang" />
                  <LegendDot color="hsl(142 71% 45%)" label="Afsluttet" />
                  <LegendDot color="hsl(0 84% 60%)" label="Annulleret" />
                </LegendGroup>
              </div>
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
};

const SectionLabel = ({ icon, children }: { icon?: React.ReactNode; children: React.ReactNode }) => (
  <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
    {icon}
    {children}
  </h3>
);

const Row = ({ label, value, bold }: { label: string; value: string; bold?: boolean }) => (
  <div className="flex items-center justify-between gap-3">
    <dt className={`capitalize ${bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{label}</dt>
    <dd className={`tabular-nums ${bold ? "font-semibold text-foreground" : "text-foreground"}`}>{value}</dd>
  </div>
);

const LegendGroup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div>
    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
    <ul className="space-y-1">{children}</ul>
  </div>
);

const LegendDot = ({ color, label }: { color: string; label: string }) => (
  <li className="flex items-center gap-2 text-foreground">
    <span className="h-2.5 w-2.5 rounded-sm ring-1 ring-border" style={{ background: color }} aria-hidden />
    {label}
  </li>
);

const MiniStat = ({ label, value }: { label: string; value: string }) => (
  <div className="rounded-lg border border-border/70 bg-card px-2.5 py-2.5 shadow-[0_1px_2px_hsl(var(--foreground)/0.03)] hover:border-foreground/25 hover:shadow-[0_6px_14px_-6px_hsl(var(--foreground)/0.18)] transition-all">
    <p className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</p>
    <p className="mt-0.5 text-base font-bold tabular-nums text-foreground tracking-tight">{value}</p>
  </div>
);

const LegendBadge = ({ symbol, label }: { symbol: string; label: string }) => (
  <li className="flex items-center gap-2 text-foreground">
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-border bg-card text-[9px] font-bold tabular-nums">
      {symbol}
    </span>
    {label}
  </li>
);

export default PlanningPanel;

/** Avatar-chip til medarbejder-filter. Bruger profilbillede hvis sat,
 *  ellers initialer på medarbejderens farve som fallback. */
const EmployeeAvatarChip = ({ employee }: { employee: PlanningPanelEmployee }) => {
  const name = employee.name || "?";
  const initials = name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  if (employee.avatar_url) {
    return (
      <img
        src={employee.avatar_url}
        alt={name}
        loading="lazy"
        className="h-5 w-5 rounded-full object-cover ring-1 ring-border"
      />
    );
  }
  return (
    <span
      className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-1 ring-border text-background text-[9px] font-semibold"
      style={{ background: employee.color || "hsl(220 13% 46%)" }}
      aria-hidden
    >
      {initials}
    </span>
  );
};
