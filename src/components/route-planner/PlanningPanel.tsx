import { useMemo, useState } from "react";
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import {
  BarChart3, ChevronDown, Calendar as CalendarIcon, Clock, Users, Palette,
} from "lucide-react";
import {
  startOfWeek, endOfWeek, startOfMonth, endOfMonth, parseISO, isWithinInterval,
  format, eachDayOfInterval,
} from "date-fns";
import { da } from "date-fns/locale";
import { formatDurationMin } from "@/lib/duration-format";

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
  duration_minutes?: number | null;
  travel_time_to_next_min?: number | null;
};
export type PlanningPanelRoute = {
  id: string;
  route_date: string;
  total_amount?: number | null;
  assignedEmployeeIds?: string[];
};
export type PlanningPanelEmployee = {
  id: string;
  name?: string | null;
  color?: string | null;
};

const fmtKr = (n: number) =>
  `${Math.round(n).toLocaleString("da-DK")} kr`;

interface Props {
  anchorDate: string; // yyyy-MM-dd
  stops: PlanningPanelStop[];
  routes: PlanningPanelRoute[];
  employees: PlanningPanelEmployee[];
  filterAssigneeIds: string[];
  onFilterAssigneeIds: (ids: string[]) => void;
}

export const PlanningPanel = ({
  anchorDate, stops, routes, employees, filterAssigneeIds, onFilterAssigneeIds,
}: Props) => {
  const [open, setOpen] = useState(false);
  const [explanationsOpen, setExplanationsOpen] = useState(false);

  const stats = useMemo(() => {
    const now = parseISO(anchorDate);
    const wStart = startOfWeek(now, { weekStartsOn: 1 });
    const wEnd = endOfWeek(now, { weekStartsOn: 1 });
    const mStart = startOfMonth(now);
    const mEnd = endOfMonth(now);

    const routesById = new Map(routes.map((r) => [r.id, r]));
    const stopsByDate = new Map<string, PlanningPanelStop[]>();

    let weekRevenue = 0, monthRevenue = 0;
    for (const r of routes) {
      if (!r.route_date) continue;
      const d = parseISO(r.route_date.slice(0, 10));
      const amt = Number(r.total_amount) || 0;
      if (isWithinInterval(d, { start: wStart, end: wEnd })) weekRevenue += amt;
      if (isWithinInterval(d, { start: mStart, end: mEnd })) monthRevenue += amt;
    }
    for (const s of stops) {
      const r = routesById.get(s.route_id);
      if (!r?.route_date) continue;
      const dateKey = r.route_date.slice(0, 10);
      const arr = stopsByDate.get(dateKey) || [];
      arr.push(s);
      stopsByDate.set(dateKey, arr);
    }

    // Kørselstid pr. ugedag i den viste uge
    const days = eachDayOfInterval({ start: wStart, end: wEnd });
    const drivePerDay = days.map((d) => {
      const key = format(d, "yyyy-MM-dd");
      const dayStops = stopsByDate.get(key) || [];
      const driveMin = dayStops.reduce(
        (acc, s) => acc + (Number(s.travel_time_to_next_min) || 0),
        0,
      );
      const workMin = dayStops.reduce(
        (acc, s) => acc + (Number(s.duration_minutes) || 0),
        0,
      );
      return { date: d, key, driveMin, workMin, stopCount: dayStops.length };
    }).filter((d) => d.driveMin > 0 || d.workMin > 0 || d.stopCount > 0);

    const weekDriveTotal = drivePerDay.reduce((acc, d) => acc + d.driveMin, 0);

    return { weekRevenue, monthRevenue, drivePerDay, weekDriveTotal };
  }, [anchorDate, routes, stops]);

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
        <Button variant="outline" size="sm" className="h-7 gap-1.5">
          <BarChart3 className="h-3.5 w-3.5" />
          Planlægning
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-[320px] sm:max-w-sm p-0 overflow-y-auto">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="text-base">Planlægning</SheetTitle>
          <SheetDescription className="text-xs">
            Overblik for {format(parseISO(anchorDate), "MMMM yyyy", { locale: da })}
          </SheetDescription>
        </SheetHeader>

        <div className="px-5 py-4 space-y-5">
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
          {stats.drivePerDay.length > 0 && (
            <section>
              <SectionLabel icon={<Clock className="h-3.5 w-3.5" />}>
                Planlagt kørsel
              </SectionLabel>
              <dl className="mt-2 space-y-1 text-sm">
                {stats.drivePerDay.map((d) => (
                  <Row
                    key={d.key}
                    label={format(d.date, "EEE", { locale: da }).replace(".", "")}
                    value={d.driveMin > 0 ? formatDurationMin(d.driveMin, { short: true }) : "—"}
                  />
                ))}
                <Separator className="my-2" />
                <Row label="Total" value={formatDurationMin(stats.weekDriveTotal, { short: true })} bold />
              </dl>
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
                        {e.color && (
                          <span
                            className="h-2.5 w-2.5 rounded-full ring-1 ring-border"
                            style={{ background: e.color }}
                            aria-hidden
                          />
                        )}
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
                <LegendGroup title="Ordretype">
                  <LegendBadge symbol="A" label="Abonnement / gentagende" />
                  <LegendBadge symbol="O" label="Online bestilling" />
                  <LegendBadge symbol="M" label="Manuel oprettet" />
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

const LegendBadge = ({ symbol, label }: { symbol: string; label: string }) => (
  <li className="flex items-center gap-2 text-foreground">
    <span className="inline-flex h-4 w-4 items-center justify-center rounded-sm border border-border bg-card text-[9px] font-bold tabular-nums">
      {symbol}
    </span>
    {label}
  </li>
);

export default PlanningPanel;
