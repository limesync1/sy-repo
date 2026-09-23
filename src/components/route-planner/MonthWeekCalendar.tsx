import { formatPrice } from "@/lib/price-format";
// MonthWeekCalendar — klassisk kalender-overblik med måned/uge visning.
// - Ingen timer/tidsrum: hver dag er ét helt felt
// - Ugenumre vises i venstre side (ISO-uger)
// - Hver rute vises som farvet pille på sin route_date
// - Drag rute → ny dato (onMoveRoute)
// - Drag aftale fra aftalepool → ind på en rute eller tom dag
// - Klik rute → åbner rute-sheet (onSelectRoute)
// - Klik aftale → åbner stop-sheet (onSelectStop)

import { useDroppable, useDraggable } from "@dnd-kit/core";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Plus, Users, MapPin, ArrowDown, Repeat, Clock, Wallet, Lock, GitMerge, History, MoreHorizontal, Eye, Trash2, ArrowRightLeft, CalendarArrowDown } from "lucide-react";
import { CheckCircle2, AlertTriangle, XCircle } from "lucide-react";
import { CloudOff } from "lucide-react";
import {
  format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  addDays, eachDayOfInterval, getISOWeek, isSameMonth, isToday, isSameDay,
} from "date-fns";
import { da } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Route, RouteStop } from "@/hooks/useRoutes";
import { WeatherBadge } from "./WeatherBadge";
import type { WeatherDay } from "@/hooks/useWeather";
import { Skeleton } from "@/components/ui/skeleton";
import { memo, useMemo, useState } from "react";
import { useTargetValidation, ringForSeverity, chipBgForSeverity } from "./drag-validation-context";
import RouteContextMenu from "./RouteContextMenu";
import { PILL_BASE } from "./lib/card-styles";
import type { StopCapacity } from "./lib/stop-capacity";
import { stopCapacity } from "./lib/stop-capacity";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Filter, X as XIcon, Check } from "lucide-react";
import { toast } from "sonner";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export type CalendarRoute = Route & {
  stops: RouteStop[];
  attachedEmployeeCount: number;
  attachedEmployees: { id: string; name: string; avatar_url?: string | null; color?: string | null }[];
  /** Id på den rigtige basisrute når denne række kun er en kalender-projektion. */
  baseRouteId?: string;
  /** Aktive aftale-/abonnements-kilder for denne projicerede dato.
   *  Bruges af RoutePlanner til at filtrere basis-rutens stops til kun
   *  dem der faktisk udføres på den projicerede dag. */
  sourceKeys?: string[];
  /** Når true er ruten en projiceret fremtidig forekomst af en gentagende rute.
   *  Den vises dæmpet med lås-ikon, kan ikke trækkes/optimeres, og klik åbner
   *  basisruten på dens næste rigtige dato. */
  isVirtual?: boolean;
  /** Når true er ruten en *erstatnings-rute* — den er oprettet (eller flyttet hertil)
   *  som følge af at en anden forekomst blev flyttet via en `moved`-exception.
   *  Vises med et lille badge så planlæggeren kan se hvilke ruter der er
   *  resultat af en flytning vs. naturligt planlagte. */
  isReplacement?: boolean;
  /** Original-dato som denne erstatningsrute "kom fra" (yyyy-MM-dd). */
  replacedFromDate?: string;
};

type Props = {
  view: "month" | "week";
  /** Anchor-dato — week/month vises omkring denne. */
  anchorDate: string;
  routes: CalendarRoute[];
  onSelectRoute: (route: Route) => void;
  onSelectStop: (stop: RouteStop) => void;
  onCreateRoute: (date: string) => void;
  onOptimizeRoute: (routeId: string) => void;
  onDeleteRoute?: (route: CalendarRoute) => void;
  onShowHistory?: (route: CalendarRoute) => void;
  optimizingRouteId?: string | null;
  /** Sat til 'job' når brugeren trækker en aftale fra aftalepoolen — får drop-targets til at lyse op. */
  draggingType?: "job" | "route" | "stop" | null;
  /** Id på den rute der pt. trækkes (kun sat når draggingType === "route") — bruges til at
   *  markere andre ruter som mulige flette-mål visuelt, og til at undgå at markere kilden selv. */
  draggingRouteId?: string | null;
  /** Map fra yyyy-MM-dd → vejrudsigt for dagen. */
  weatherByDate?: Map<string, WeatherDay>;
  /** Vi henter stadig ruter/stops til perioden — vis skeleton-piller i hver dag-celle
   *  så layoutet ikke "hopper" når data lander. */
  loadingRoutes?: boolean;
  /** Vejrudsigten henter stadig — vis lille pulserende pille i højre hjørne. */
  loadingWeather?: boolean;
  /** Vejr-API fejlede — vis diskret fallback-ikon så brugeren ved at vejret er utilgængeligt. */
  weatherError?: boolean;
  /** Sæt af drop-target-nøgler (`route:<id>` eller `day:<yyyy-MM-dd>`) der
   *  pt. behandler en flytning. Targets i settet deaktiveres som drop-zone
   *  og viser en spinner, så brugeren ikke kan slippe igen ved et uheld. */
  busyTargets?: Set<string>;
  /** Proaktive konflikt-advarsler pr. dato: vises som farvet prik ved siden
   *  af dato-tallet INDEN brugeren prøver at trække noget hen. `error` =
   *  rød (fx dobbeltbooket medarbejder), `warning` = gul (fx helligdag). */
  dateAlerts?: Map<string, { severity: "warning" | "error"; label: string }>;
  /** Sæt med id'er på ruter der pt. er valgt i bulk-multi-select. Tomt sæt
   *  = ingen i valg-tilstand. Bruges til at tegne en tydelig ring rundt om
   *  valgte rute-piller, så brugeren altid kan se hvad der vil blive
   *  bulk-flyttet. */
  selectedRouteIds?: Set<string>;
  /** Toggle valg af en konkret rute. Kaldes når brugeren ⌘/Ctrl/Shift-klikker
   *  på en rute-pille, eller eksplicit på en valg-knap inde i pillen.
   *  Modtager `id` og evt. originalt event så implementationen kan se
   *  hvilken modifier-tast der blev brugt. */
  onToggleRouteSelection?: (id: string, e?: React.MouseEvent) => void;
  /** Dagligt kapacitetsoverblik — vises som tynd farve-bar i bunden af
   *  hver dag-celle. Grøn (<70%), gul (70-100%), rød (>100%). Hjælper
   *  brugeren med at se overbelastning før de tildeler endnu et stop. */
  capacityByDate?: Map<string, StopCapacity>;
  /** Sæt af rute-ids hvor mindst én tildelt medarbejder mangler den
   *  færdighed et stop kræver. Vises som lille ⚠-ikon på rute-pillen. */
  mismatchedRouteIds?: Set<string>;
  /** Sæt af rute-ids hvor en medarbejder har et tids-overlap med en
   *  anden rute samme dag. Vises som rødt "Konflikt"-badge på pillen
   *  så planlæggeren ser problemet uden at åbne ruten. */
  conflictedRouteIds?: Set<string>;
  /** Multi-select bulk-slet: valgte stop-ids. Viser visuel markering på stop. */
  selectedStopIds?: Set<string>;
};

const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const fmtRouteMin = (min: number) => min >= 60 ? `${Math.floor(min / 60)}t ${min % 60}m` : `${min}m`;
// Vis altid med dansk tusind-separator + "kr" — så et tal på et rute-kort
// aldrig kan misforstås som "antal" i stedet for "beløb".
const fmtRouteKr = (n: number) =>
  `${formatPrice(Math.round(n))}`;
// Kompakt valuta til smalle månedsceller: viser stadig "kr" så betydningen
// er entydig. "1,5k kr" / "760 kr" — ingen tvivl om at det er penge.
const fmtRouteKrCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} mio kr`;
  if (n >= 10_000) return `${Math.round(n / 1000)}t kr`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(".", ",")}t kr`;
  return `${formatPrice(Math.round(n))}`;
};
const initials = (name: string) => name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
const readableTokenOn = (color?: string | null) => {
  const hex = color?.trim().match(/^#?([0-9a-f]{6})$/i)?.[1];
  if (!hex) return "hsl(var(--background))";
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.62 ? "hsl(var(--foreground))" : "hsl(var(--background))";
};
// Tilføj en svag tint i rutens farve som baggrund på pillen — giver
// kalenderen mere "farve-personlighed" uden at gå på kompromis med
// læsbarhed. Bruger rgba med lav alpha så det fungerer ens i begge temaer.
const tintBgFrom = (color?: string | null) => {
  const hex = color?.trim().match(/^#?([0-9a-f]{6})$/i)?.[1];
  if (!hex) return undefined;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return `linear-gradient(90deg, rgba(${r},${g},${b},0.10) 0%, rgba(${r},${g},${b},0.04) 22%, transparent 60%)`;
};

/* ─── Dagens overblik (sheet) ─── */
/** Klik på et dato-tal eller "+N ruter"-knappen åbner denne sheet, så
 *  brugeren kan se alle dagens ruter, en samlet opsummering og hurtigt
 *  navigere ind på en konkret rute eller oprette en ny.  Denne komponent
 *  er bevidst frakoblet dnd — den genbruger ikke RoutePill (som er
 *  drag-source) for at undgå at trække ruter ud af sheet'en ved et uheld. */
const DayOverviewSheet = ({
  date, routes, capacity, weather, onClose, onSelectRoute, onSelectStop, onCreateRoute,
  selectedStopIds,
}: {
  date: string;
  routes: CalendarRoute[];
  capacity: StopCapacity | null;
  weather: WeatherDay | null;
  onClose: () => void;
  onSelectRoute: (route: Route) => void;
  onSelectStop: (stop: RouteStop) => void;
  onCreateRoute: (date: string) => void;
  selectedStopIds?: Set<string>;
}) => {
  const day = parseISO(date);
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const isPast = date < todayIso;
  const isToday = date === todayIso;

  // Aggregeret opsummering — så brugeren får et tal-overblik over hele
  // dagen uden at skulle scanne hver pille.
  const totalStops = routes.reduce((sum, r) => sum + r.stops.length, 0);
  const completedStops = routes.reduce(
    (sum, r) => sum + r.stops.filter((s) => s.status === "completed").length,
    0,
  );
  const pendingStops = totalStops - completedStops;
  const totalRevenue = routes.reduce(
    (sum, r) => sum + r.stops.reduce((s2, s) => s2 + Number((s as any).order_amount || 0), 0),
    0,
  );
  const employees = (() => {
    const m = new Map<string, { id: string; name: string; color?: string | null; avatar_url?: string | null }>();
    for (const r of routes) for (const e of r.attachedEmployees) if (!m.has(e.id)) m.set(e.id, e);
    return Array.from(m.values());
  })();

  return (
    <Sheet open onOpenChange={(o) => { if (!o) onClose(); }}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-3 border-b border-border/70 space-y-1">
          <div className="flex items-center gap-2">
            <span className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-lg text-base font-bold tabular-nums",
              isToday ? "bg-foreground text-background" : "bg-secondary text-foreground",
            )}>
              {format(day, "d")}
            </span>
            <div className="min-w-0">
              <SheetTitle className="text-lg leading-tight">
                {format(day, "EEEE d. MMMM yyyy", { locale: da })}
              </SheetTitle>
              <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                <span>Uge {getISOWeek(day)}</span>
                {isToday && <span className="text-foreground font-semibold">· I dag</span>}
                {isPast && !isToday && <span>· Tidligere dag</span>}
                {weather && (
                  <span className="inline-flex items-center gap-1">
                    · {Math.round(weather.tempMax ?? weather.tempMin ?? 0)}°
                  </span>
                )}
              </div>
            </div>
          </div>
        </SheetHeader>

        {/* Opsummering */}
        <div className="px-5 py-4 grid grid-cols-2 gap-2 border-b border-border/70">
          <div className="rounded-lg border border-border/70 bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Ruter</div>
            <div className="text-xl font-bold tabular-nums">{routes.length}</div>
          </div>
          <div className="rounded-lg border border-border/70 bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Stop</div>
            <div className="text-xl font-bold tabular-nums">
              {completedStops > 0 && (
                <span className="text-emerald-600 dark:text-emerald-400">{completedStops}/</span>
              )}
              {totalStops}
            </div>
            {pendingStops > 0 && completedStops > 0 && (
              <div className="text-[10px] text-muted-foreground">{pendingStops} mangler</div>
            )}
          </div>
          <div className="rounded-lg border border-border/70 bg-card p-3">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Omsætning</div>
            <div className="text-xl font-bold tabular-nums">{fmtRouteKr(totalRevenue)}</div>
          </div>
           <div className="rounded-md border border-border/70 bg-card p-3">
             <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Kapacitet</div>
             <div className="text-xl font-bold tabular-nums">{capacity ? `${capacity.stops_booked}/${capacity.stops_capacity}` : totalStops}</div>
             <div className="text-[10px] text-muted-foreground">stop</div>
          </div>
        </div>

        {capacity && capacity.stops_capacity > 0 && (
          <div className="px-5 py-3 border-b border-border/70 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
              <span>Stopkapacitet</span>
              <span className="tabular-nums font-semibold text-foreground">
                {capacity.stops_booked} af {capacity.stops_capacity} stop
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-border/40 overflow-hidden">
              <div
                className={cn(
                  "h-full transition-[width] duration-300",
                  capacity.load_pct >= 100 ? "bg-destructive"
                    : capacity.load_pct >= 85 ? "bg-amber-500"
                    : "bg-foreground/40",
                )}
                style={{ width: `${Math.min(100, capacity.load_pct)}%` }}
              />
            </div>
          </div>
        )}

        {employees.length > 0 && (
          <div className="px-5 py-3 border-b border-border/70">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-1.5">
              Medarbejdere på dagen ({employees.length})
            </div>
            <div className="flex flex-wrap gap-1.5">
              {employees.map((e) => (
                <span
                  key={e.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium"
                >
                  {e.avatar_url ? (
                    <img src={e.avatar_url} alt={e.name} className="h-4 w-4 rounded-full object-cover" />
                  ) : (
                    <span
                      className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[8px] font-bold"
                      style={{ background: e.color || "hsl(var(--muted-foreground))", color: readableTokenOn(e.color) }}
                    >
                      {initials(e.name)}
                    </span>
                  )}
                  <span className="truncate max-w-[140px]">{e.name}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Liste over dagens ruter — i planlagt rækkefølge */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {routes.length === 0 ? (
            <div className="text-center text-sm text-muted-foreground py-12">
              Ingen ruter på denne dag endnu.
            </div>
          ) : (
            routes.map((r) => {
              const stopCount = r.stops.length;
              const completed = r.stops.filter((s) => s.status === "completed").length;
              const revenue = r.stops.reduce((sum, s) => sum + Number((s as any).order_amount || 0), 0);
              const isVirtual = !!r.isVirtual;
              const isCompleted = (r as any).status === "completed";
              return (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onSelectRoute(r)}
                  className={cn(
                    "group w-full text-left rounded-lg border border-border/70 bg-card p-3 hover:border-foreground/30 hover:shadow-sm transition-all relative overflow-hidden",
                    isVirtual && "border-dashed bg-muted/40",
                  )}
                >
                  <span aria-hidden className="absolute inset-y-0 left-0 w-[3px]" style={{ background: r.color }} />
                  <div className="pl-2 flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isVirtual && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-foreground/[0.06] ring-1 ring-inset ring-foreground/10 px-1 py-px text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
                            <Lock className="h-2 w-2" />
                            {date > todayIso ? "Låst" : date === todayIso ? "I dag" : "Historisk"}
                          </span>
                        )}
                        {isCompleted && (
                          <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/30 px-1 py-px text-[9px] font-bold uppercase tracking-wider">
                            <CheckCircle2 className="h-2 w-2" /> Udført
                          </span>
                        )}
                        {!isVirtual && r.isReplacement && (
                          <span
                            className="inline-flex items-center gap-0.5 rounded bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/30 px-1 py-px text-[9px] font-bold uppercase tracking-wider"
                            title={r.replacedFromDate
                              ? `Flyttet hertil fra ${format(parseISO(r.replacedFromDate), "EEEE d. MMM", { locale: da })}`
                              : "Flyttet hertil fra en anden dato"}
                          >
                            <ArrowRightLeft className="h-2 w-2" /> Flyttet
                          </span>
                        )}
                        <span className={cn("text-sm font-semibold truncate", isVirtual && "italic text-muted-foreground")}>
                          {r.name || `Rute (${format(parseISO(r.route_date), "d. MMM", { locale: da })})`}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-x-3 gap-y-0.5 flex-wrap text-[11px] text-muted-foreground tabular-nums">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {completed > 0 && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{completed}/</span>
                          )}
                          {stopCount} stop
                        </span>
                        {revenue > 0 && (
                          <span className="inline-flex items-center gap-1 font-semibold text-foreground/80">
                            <Wallet className="h-3 w-3" /> {fmtRouteKr(revenue)}
                          </span>
                        )}
                        {r.attachedEmployees.length > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Users className="h-3 w-3" /> {r.attachedEmployees.length}
                          </span>
                        )}
                      </div>
                      {/* Hurtigt stop-overblik (max 4) */}
                      {r.stops.length > 0 && (
                        <ul className="mt-2 space-y-1">
                          {r.stops.slice(0, 4).map((s, i) => (
                            <li
                              key={s.id}
                              role="button"
                              tabIndex={0}
                              onClick={(e) => { e.stopPropagation(); onSelectStop(s); }}
                              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onSelectStop(s); } }}
                              className={cn(
                                "flex items-center gap-2 text-[11px] rounded px-1 -mx-1 py-0.5 cursor-pointer",
                                selectedStopIds?.has(s.id)
                                  ? "text-foreground bg-accent/[0.06] ring-1 ring-accent/40"
                                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60",
                              )}
                            >
                              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full bg-secondary text-[9px] font-bold text-foreground shrink-0">
                                {i + 1}
                              </span>
                              <span className="truncate flex-1">
                                {(s as any).customer_name || (s as any).address || "Stop"}
                              </span>
                              {s.status === "completed" && (
                                <CheckCircle2 className="h-3 w-3 text-emerald-500 shrink-0" />
                              )}
                            </li>
                          ))}
                          {r.stops.length > 4 && (
                            <li className="text-[10.5px] text-muted-foreground/80 italic pl-6">
                              + {r.stops.length - 4} flere stop…
                            </li>
                          )}
                        </ul>
                      )}
                    </div>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {!isPast && (
          <div className="border-t border-border/70 px-5 py-3 bg-card">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => onCreateRoute(date)}
            >
              <Plus className="h-4 w-4 mr-2" /> Opret ny rute denne dag
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export const MonthWeekCalendar = ({
  view, anchorDate, routes, onSelectRoute, onSelectStop,
  onCreateRoute, onOptimizeRoute, onDeleteRoute, onShowHistory, optimizingRouteId, draggingType, draggingRouteId, weatherByDate,
  loadingRoutes, loadingWeather, weatherError, busyTargets, dateAlerts,
  selectedRouteIds, onToggleRouteSelection, capacityByDate, mismatchedRouteIds, conflictedRouteIds,
  selectedStopIds,
}: Props) => {
  const anchor = parseISO(anchorDate);

  /** Dato (yyyy-MM-dd) for "dagens overblik"-sheet. Sat når brugeren
   *  klikker på dato-tallet eller "+N ruter"-knappen. */
  const [overviewDate, setOverviewDate] = useState<string | null>(null);

  // ─── Hurtig filtrering (status + medarbejder) ───
  // Lokal state — overlever ikke reload (med vilje: en filtrering på "klar"
  // skal ikke forvirre næste gang man åbner planneren). Filteret anvendes
  // KUN i kalender-visningen og påvirker ikke det data RoutePlanner ser.
  type StatusFilter = "all" | "planned" | "ready" | "completed";
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [employeeFilter, setEmployeeFilter] = useState<Set<string>>(new Set());

  // Saml unikke medarbejdere på tværs af alle synlige ruter — bruges til
  // medarbejder-filterets multi-select. Beregnes kun når routes ændrer sig.
  const allEmployees = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color?: string | null; avatar_url?: string | null }>();
    for (const r of routes) for (const e of r.attachedEmployees) if (!map.has(e.id)) map.set(e.id, e);
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "da"));
  }, [routes]);

  const routeMatchesStatus = (r: CalendarRoute): boolean => {
    if (statusFilter === "all") return true;
    const status = ((r as any).status || "planned").toLowerCase();
    // Projicerede forekomster har ingen rigtig server-status; tæl dem som
    // "planned" så de ikke forsvinder ved status-filter på fremtidige dage.
    if (r.isVirtual) return statusFilter === "planned";
    // Afled også status fra stop-fremdrift, da route.status ikke altid
    // sættes til "completed"/"in_progress" når alle stops er færdige.
    const stopCount = r.stops.length;
    const doneCount = r.stops.filter((s) => s.status === "completed").length;
    const allDone = stopCount > 0 && doneCount === stopCount;
    if (statusFilter === "completed") {
      return status === "completed" || allDone;
    }
    if (statusFilter === "ready") {
      return status === "ready" || status === "confirmed";
    }
    // "planned" = ikke startet og ikke udført
    if (statusFilter === "planned") {
      return (status === "planned" || status === "") && doneCount === 0;
    }
    return status === statusFilter;
  };
  const routeMatchesEmployee = (r: CalendarRoute): boolean => {
    if (employeeFilter.size === 0) return true;
    return r.attachedEmployees.some((e) => employeeFilter.has(e.id));
  };
  const filteredRoutes = useMemo(
    () => routes.filter((r) => routeMatchesStatus(r) && routeMatchesEmployee(r)),
    [routes, statusFilter, employeeFilter],
  );
  const activeFilterCount = (statusFilter === "all" ? 0 : 1) + employeeFilter.size;
  const hiddenCount = routes.length - filteredRoutes.length;

  // Memo: beregn synlige uger og rute-mapping kun når input ændrer sig.  Tidligere
  // blev disse rebygget hver render (= hver gang vejret eller drag-tilstand
  // ændrede sig), hvilket gjorde at hele kalenderen rerender'ede selv ved
  // bagatel-opdateringer.  Sammen med React.memo på DayCell/RoutePill gør det
  // bladring og drag-and-drop spækfedt.
  const weeks = useMemo<Date[][]>(() => {
    const days: Date[] = view === "week"
      ? eachDayOfInterval({ start: startOfWeek(anchor, { weekStartsOn: 1 }), end: addDays(startOfWeek(anchor, { weekStartsOn: 1 }), 6) })
      : eachDayOfInterval({
          start: startOfWeek(startOfMonth(anchor), { weekStartsOn: 1 }),
          end: endOfWeek(endOfMonth(anchor), { weekStartsOn: 1 }),
        });
    const out: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) out.push(days.slice(i, i + 7));
    return out;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchorDate]);

  const routesByDate = useMemo(() => {
    const m = new Map<string, CalendarRoute[]>();
    for (const r of filteredRoutes) {
      const arr = m.get(r.route_date) || [];
      arr.push(r);
      m.set(r.route_date, arr);
    }
    // Sortér deterministisk uden at bruge aftalernes udførelsestid.
    for (const [k, arr] of m) {
      arr.sort((a, b) => {
        const av = a.isVirtual ? 0 : 1;
        const bv = b.isVirtual ? 0 : 1;
        if (av !== bv) return av - bv;
        return (a.name || "").localeCompare(b.name || "");
      });
      m.set(k, arr);
    }
    return m;
  }, [filteredRoutes]);

  const weekdayLabels = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
  // Indeks (0–6) for "i dag" i mandags-uge — bruges til at fremhæve dagens
  // kolonne i header'en så brugerens øje straks finder den rigtige spalte.
  const todayDow = (() => {
    const now = new Date();
    if (view === "month" && !isSameMonth(now, anchor)) return -1;
    if (view === "week") {
      const start = startOfWeek(anchor, { weekStartsOn: 1 });
      const end = addDays(start, 6);
      if (now < start || now > end) return -1;
    }
    const d = now.getDay(); // 0=Sun..6=Sat
    return d === 0 ? 6 : d - 1;
  })();

  return (
    <>
    <Card className="overflow-hidden flex flex-col h-full rounded-none border-0 bg-card shadow-none">
      {/* ─── Hurtig filtrering ───
          Status-chips + medarbejder-popover. Ensartet chip/dropdown-stil:
          alle triggere har samme højde (h-7), pill-form (rounded-full),
          ring-1 i hvile og ring-2/accent når aktiv. Aktive piller bruger
          accent (jf. design-memory: accent kun til emphasis som aktive
          filter-piller, links og focus-rings — ikke generel hover). */}
      <div className="shrink-0 flex items-center flex-wrap gap-2 px-3 py-2 border-b border-border/70 bg-secondary/25 text-[11.5px]">
        <span className="inline-flex items-center gap-1.5 text-muted-foreground font-semibold uppercase tracking-[0.12em] text-[10px] pr-1 select-none">
          <Filter className="h-3 w-3" /> Filter
        </span>
        <div className="inline-flex items-center gap-0.5 rounded-[4px] bg-background ring-1 ring-border/70 p-0.5">
        {([
          { key: "all", label: "Alle" },
          { key: "planned", label: "Planlagt" },
          { key: "ready", label: "Klar" },
          { key: "completed", label: "Udført" },
        ] as { key: StatusFilter; label: string }[]).map((opt) => {
          const active = statusFilter === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setStatusFilter(opt.key)}
              className={cn(
                "h-6 px-2.5 rounded-[3px] text-[11px] font-semibold transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                active
                  ? "bg-foreground text-background"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary",
              )}
              aria-pressed={active}
            >
              {opt.label}
            </button>
          );
        })}
        </div>
        <span className="h-5 w-px bg-border/70" aria-hidden />
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "h-7 pl-2.5 pr-2 rounded-full text-[11px] font-semibold transition-[background-color,color,box-shadow,transform] duration-150 active:scale-[0.97] inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
                employeeFilter.size > 0
                  ? "bg-accent text-accent-foreground ring-0 shadow-[0_1px_3px_-1px_hsl(var(--accent)/0.55)]"
                  : "bg-background/60 text-muted-foreground ring-1 ring-border/70 hover:text-foreground hover:bg-secondary",
              )}
              aria-label="Filtrer på medarbejder"
            >
              <Users className="h-3 w-3" />
              Medarbejder
              {employeeFilter.size > 0 && (
                <span className="inline-flex items-center justify-center h-4 min-w-4 px-1 rounded-full bg-accent-foreground/20 text-[10px] tabular-nums font-bold">
                  {employeeFilter.size}
                </span>
              )}
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-64 p-1.5 max-h-72 overflow-auto">
            {allEmployees.length === 0 ? (
              <p className="px-2 py-2 text-xs text-muted-foreground">Ingen medarbejdere på ruterne</p>
            ) : (
              <ul className="space-y-0.5">
                {allEmployees.map((emp) => {
                  const checked = employeeFilter.has(emp.id);
                  return (
                    <li key={emp.id}>
                      <button
                        type="button"
                        onClick={() => {
                          setEmployeeFilter((prev) => {
                            const next = new Set(prev);
                            if (next.has(emp.id)) next.delete(emp.id);
                            else next.add(emp.id);
                            return next;
                          });
                        }}
                        className={cn(
                          "w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-left transition-colors",
                          checked ? "bg-secondary text-foreground" : "hover:bg-secondary/60",
                        )}
                      >
                        <span
                          className={cn(
                            "h-4 w-4 rounded border flex items-center justify-center shrink-0",
                            checked ? "bg-foreground border-foreground text-background" : "border-border",
                          )}
                        >
                          {checked && <Check className="h-3 w-3" />}
                        </span>
                        {emp.avatar_url ? (
                          <img src={emp.avatar_url} alt="" className="h-5 w-5 rounded-full object-cover" />
                        ) : (
                          <span
                            className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-bold"
                            style={{ background: emp.color || "hsl(var(--muted-foreground))", color: readableTokenOn(emp.color) }}
                          >
                            {initials(emp.name)}
                          </span>
                        )}
                        <span className="truncate font-medium">{emp.name}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
            {employeeFilter.size > 0 && (
              <button
                type="button"
                onClick={() => setEmployeeFilter(new Set())}
                className="mt-1 w-full text-xs text-muted-foreground hover:text-foreground py-1.5 rounded-md hover:bg-secondary"
              >
                Nulstil
              </button>
            )}
          </PopoverContent>
        </Popover>
        {activeFilterCount > 0 && (
          <>
            <span className="text-muted-foreground text-[11px] ml-auto tabular-nums">
              {hiddenCount > 0 ? (
                <><span className="font-semibold text-foreground">{hiddenCount}</span> {hiddenCount === 1 ? "rute" : "ruter"} skjult</>
              ) : "Ingen skjult"}
            </span>
            <button
              type="button"
              onClick={() => { setStatusFilter("all"); setEmployeeFilter(new Set()); }}
              className="inline-flex items-center gap-1 h-7 px-2.5 rounded-full text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
              title="Nulstil alle filtre"
            >
              <XIcon className="h-3 w-3" /> Nulstil
            </button>
          </>
        )}
      </div>
      {/* Weekday header */}
      <div
        className="grid border-b border-border/70 bg-card shrink-0"
        style={{ gridTemplateColumns: "44px repeat(7, minmax(0, 1fr))" }}
      >
        <div className="border-r border-border/70 p-2 text-[9.5px] uppercase text-muted-foreground/45 font-semibold tracking-[0.16em] flex items-center justify-center bg-secondary/20">
          Uge
        </div>
        {weekdayLabels.map((wd, i) => {
          const isWeekend = i >= 5;
          const isTodayCol = i === todayDow;
          return (
            <div
              key={wd}
              className={cn(
                "p-2 text-[10px] font-semibold tracking-[0.18em] uppercase text-center border-r border-border/70 last:border-r-0 relative",
                isWeekend ? "text-muted-foreground/45" : "text-muted-foreground/75",
                isTodayCol && "text-foreground bg-foreground/[0.08]",
              )}
            >
              {wd}
              {isTodayCol && (
                <span
                  aria-hidden
                  className="absolute left-1/2 -translate-x-1/2 bottom-0 h-[2px] w-8 rounded-full bg-foreground"
                />
              )}
            </div>
          );
        })}
      </div>

      <div className="flex-1 overflow-y-auto">
        {weeks.map((week, wi) => {
          const weekNum = getISOWeek(week[0]);
          return (
            <div
              key={wi}
              className="grid border-b border-border/70 last:border-b-0"
              style={{ gridTemplateColumns: "44px repeat(7, minmax(0, 1fr))" }}
            >
              {/* Ugenummer */}
              <div className="border-r border-border/70 bg-secondary/20 flex items-start justify-center pt-3 tabular-nums">
                <span className="inline-flex items-center justify-center min-w-[24px] h-[22px] px-1 rounded-md text-[11.5px] font-bold leading-none text-muted-foreground/70 bg-background/60 ring-1 ring-border/50">
                  {weekNum}
                </span>
              </div>
              {week.map((day) => {
                const dateStr = ymd(day);
                const dayRoutes = routesByDate.get(dateStr) || [];
                const inMonth = view === "week" ? true : isSameMonth(day, anchor);
                const today = isToday(day);
                return (
                  <DayCell
                    key={dateStr}
                    date={day}
                    dateStr={dateStr}
                    routes={dayRoutes}
                    inMonth={inMonth}
                    today={today}
                    onSelectRoute={onSelectRoute}
                    onSelectStop={onSelectStop}
                    onCreateRoute={onCreateRoute}
                    onOpenDayOverview={setOverviewDate}
                    onOptimizeRoute={onOptimizeRoute}
                    onDeleteRoute={onDeleteRoute}
                    onShowHistory={onShowHistory}
                    optimizingRouteId={optimizingRouteId}
                    compact={view === "month"}
                    draggingType={draggingType}
                    draggingRouteId={draggingRouteId ?? null}
                    weather={weatherByDate?.get(dateStr) ?? null}
                    loadingRoutes={!!loadingRoutes}
                    loadingWeather={!!loadingWeather}
                    weatherError={!!weatherError}
                    busy={!!busyTargets?.has(`day:${dateStr}`)}
                    busyRouteIds={busyTargets}
                    alert={dateAlerts?.get(dateStr) ?? null}
                    selectedRouteIds={selectedRouteIds}
                    onToggleRouteSelection={onToggleRouteSelection}
                    capacity={capacityByDate?.get(dateStr) ?? null}
                    mismatchedRouteIds={mismatchedRouteIds}
                    conflictedRouteIds={conflictedRouteIds}
                    selectedStopIds={selectedStopIds}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </Card>
    {overviewDate && (
      <DayOverviewSheet
        date={overviewDate}
        routes={routesByDate.get(overviewDate) || []}
        capacity={capacityByDate?.get(overviewDate) ?? null}
        weather={weatherByDate?.get(overviewDate) ?? null}
        onClose={() => setOverviewDate(null)}
        onSelectRoute={(r) => { setOverviewDate(null); onSelectRoute(r); }}
        onSelectStop={(s) => { setOverviewDate(null); onSelectStop(s); }}
        onCreateRoute={(d) => { setOverviewDate(null); onCreateRoute(d); }}
      />
    )}
    </>
  );
};

/* ─── Dag-celle ─── */
type DayCellProps = {
  date: Date;
  dateStr: string;
  routes: CalendarRoute[];
  inMonth: boolean;
  today: boolean;
  onSelectRoute: (route: Route) => void;
  onSelectStop: (stop: RouteStop) => void;
  onCreateRoute: (date: string) => void;
  /** Åbner "dagens overblik"-sheet med alle ruter for datoen. */
  onOpenDayOverview: (date: string) => void;
  onOptimizeRoute: (routeId: string) => void;
  onDeleteRoute?: (route: CalendarRoute) => void;
  onShowHistory?: (route: CalendarRoute) => void;
  optimizingRouteId?: string | null;
  compact: boolean;
  draggingType?: "job" | "route" | "stop" | null;
  draggingRouteId?: string | null;
  weather?: WeatherDay | null;
  loadingRoutes?: boolean;
  loadingWeather?: boolean;
  weatherError?: boolean;
  /** True hvis dagens drop-zone pt. behandler en flytning. */
  busy?: boolean;
  /** Sæt med alle busy targets — videresendes til RoutePill for rute-niveau. */
  busyRouteIds?: Set<string>;
  /** Forhåndsdetekteret konflikt på dagen (helligdag / dobbeltbooking). */
  alert?: { severity: "warning" | "error"; label: string } | null;
  /** Multi-select bulk-flyt: valgte rute-ids. Videresendes til RoutePill. */
  selectedRouteIds?: Set<string>;
  /** Toggle af bulk-valg på rute-pille. */
  onToggleRouteSelection?: (id: string, e?: React.MouseEvent) => void;
  /** Kapacitetsinfo for denne dag — render som tynd farve-bar i bunden. */
  capacity?: StopCapacity | null;
  /** Sæt af rute-ids der har skill-mismatch — videresendes til RoutePill. */
  mismatchedRouteIds?: Set<string>;
  /** Sæt af rute-ids med medarbejder-tids-konflikt — videresendes til RoutePill. */
  conflictedRouteIds?: Set<string>;
  /** Multi-select bulk-slet: valgte stop-ids. Viser visuel markering. */
  selectedStopIds?: Set<string>;
};

const DayCellInner = ({
  date, dateStr, routes, inMonth, today,
  onSelectRoute, onSelectStop, onCreateRoute, onOpenDayOverview, onOptimizeRoute, onDeleteRoute, onShowHistory, optimizingRouteId, compact, draggingType, draggingRouteId, weather,
  loadingRoutes, loadingWeather, weatherError, busy, busyRouteIds, alert,
  selectedRouteIds, onToggleRouteSelection, capacity, mismatchedRouteIds, conflictedRouteIds,
  selectedStopIds,
}: DayCellProps) => {
  // Lokal toggle for "vis alle ruter" i en travl dag — i stedet for at
  // åbne hele dagens overblik bare for at se 1-2 ekstra piller.
  const [expanded, setExpanded] = useState(false);
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const isPast = dateStr < todayIso;
  const dow = date.getDay(); // 0=Sun, 6=Sat
  const isWeekend = dow === 0 || dow === 6;
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dateStr}`,
    data: { type: "day", date: dateStr },
    disabled: !!busy || isPast,
  });

  // Live-validering for netop denne dag — sat af RoutePlanner.handleDragOver.
  // Hvis et drag svæver over cellen, fortæller vi brugeren INDEN slip om
  // dropet er gyldigt (grøn), advarsel (gul) eller blokeret (rød).
  const validation = useTargetValidation(`day:${dateStr}`);

  const isDragActive = !!draggingType;
  const isJobDragActive = draggingType === "job";
  const emptyDay = routes.length === 0;
  // ─── Drop-affordance ───
  // Dage før i dag kan ALDRIG modtage et drop (se `useDroppable.disabled`),
  // så vi dæmper dem visuelt under drag og fjerner ring/hover-cues. Det
  // gør det entydigt for brugeren hvor man faktisk kan slippe.
  const canReceiveDrop = isDragActive && inMonth && !isPast && !busy;

  // ─── Kontekst-følsom drop-label ───
  // Når brugeren hovrer over en dag mid-drag, fortæller vi præcis hvad
  // der vil ske: "Flyt rute til torsdag d. 23. maj" eller "Tilføj
  // aftale". Bruger samme dato-format som resten af planlæggeren.
  const dropVerb = (() => {
    if (!isOver || !canReceiveDrop) return null;
    if (validation?.topMessage) return validation.topMessage;
    if (draggingType === "job") return emptyDay ? "Opret ny rute" : "Tilføj til rute";
    if (draggingType === "stop") return "Flyt stop hertil";
    if (draggingType === "route") {
      return "Flyt rute hertil";
    }
    return null;
  })();

  return (
    <div
      ref={setNodeRef}
      data-route-drop-date={canReceiveDrop ? dateStr : undefined}
      data-density-target="day"
      className={cn(
        "border-r border-border/70 last:border-r-0 relative group flex flex-col gap-1.5 p-2.5 transition-all duration-200",
        compact ? "min-h-[118px]" : "min-h-[170px]",
        !inMonth && "bg-muted/10",
        // Lidt kraftigere weekend-tint så uge-rytmen er nem at scanne i
        // måneds-view. Stadig subtil nok til ikke at konkurrere med selve
        // rute-pillerne. Bibeholdes ikke for fortidsdage (de dæmpes alligevel).
        inMonth && isWeekend && !isPast && "bg-secondary/30",
        isPast && "bg-muted/15",
        today && "bg-foreground/[0.035] ring-1 ring-inset ring-foreground/20",
        inMonth && !isPast && !isDragActive && "hover:bg-secondary/30",
        // Når en aftale/rute trækkes:
        //  - Gyldige drop-dage (i måneden, ikke fortid, ikke optaget) får
        //    en subtil accent-ring så brugeren ser hvor der KAN droppes.
        //  - Fortid/udenfor-måned dæmpes så de visuelt træder i baggrunden
        //    og ikke konkurrerer om opmærksomheden under drag.
        canReceiveDrop && !isOver && "ring-1 ring-accent/30 ring-inset bg-accent/[0.03]",
        isDragActive && isPast && "opacity-40",
        isDragActive && !inMonth && "opacity-50",
        // Eksplicit cursor-feedback: brugeren kan se INDEN drop om dagen
        // accepterer slip eller ej. Sparer en mislykket drop-cyklus.
        isDragActive && isPast && "cursor-not-allowed",
        canReceiveDrop && "cursor-copy",
        // Når man hovrer over en gyldig dag — tydeligt highlight. Hvis
        // live-validering har en severity (grøn/gul/rød) trumfer den
        // standard-accent-ringen, så brugeren ser den korrekte status.
        isOver && canReceiveDrop && !validation && "bg-accent/15 ring-2 ring-accent ring-inset shadow-[inset_0_0_0_1px_hsl(var(--accent)/0.3)]",
        isOver && canReceiveDrop && validation && ringForSeverity(validation.severity),
        busy && "opacity-90 cursor-wait",
      )}
      aria-busy={busy || undefined}
    >
      {/* ─── Plads-markør under drag ─── */}
      {/* Selve cellen får allerede en accent-ring (linje ~912) når den er
          gyldig drop-target, og tomme dage får en stor "Slip her"-overlay
          længere nede (linje ~1111). Tidligere stod der her også en lille
          stiplet pille i bunden + top/bund snap-linjer — det blev til 4-5
          samtidige indikatorer på samme celle, så de er fjernet for ro. */}
      {/* ─── Drop-target floating label ─── */}
      {/* Vises kun mens brugeren hovrer over en gyldig drop-dag. Fortæller
          eksplicit hvad der sker ved slip + præcis dato — så brugeren
          aldrig er i tvivl om udfaldet før de slipper. */}
      {dropVerb && (
        <div
          className={cn(
            "absolute top-1 right-1 z-30 pointer-events-none rounded-md px-1.5 py-0.5 shadow-lg text-[10px] font-semibold flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150 max-w-[90%]",
            chipBgForSeverity(validation?.severity),
          )}
          role="status"
        >
          <ArrowDown className="h-3 w-3" />
          <span className="truncate">{dropVerb}</span>
        </div>
      )}
      {busy && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-sm pointer-events-none">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      )}
      {/* Dato-header */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOpenDayOverview(dateStr); }}
            aria-label={`Vis dagens overblik for ${format(date, "EEEE d. MMMM", { locale: da })}`}
            title="Åbn dagens overblik"
            className={cn(
              "inline-flex items-center justify-center rounded-md text-[12.5px] font-bold tabular-nums transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
              today
                ? "h-7 w-7 text-foreground ring-2 ring-foreground/80 hover:bg-foreground hover:text-background"
                : "h-6 w-6 text-foreground/90 hover:bg-secondary group-hover:bg-secondary/70 group-hover:text-foreground",
              !inMonth && !today && "text-muted-foreground/40",
              isPast && !today && "text-muted-foreground/55",
            )}
          >
            {format(date, "d")}
          </button>
          {alert && inMonth && (
            <span
              className={cn(
                "h-2 w-2 rounded-full ring-2 ring-background",
                alert.severity === "error" ? "bg-destructive" : "bg-amber-500",
              )}
              title={alert.label}
              aria-label={alert.label}
            />
          )}
        </div>
        <div className="flex items-center gap-1">
          {weather && (
            <WeatherBadge weather={weather} size={compact ? "compact" : "full"} />
          )}
          {!weather && loadingWeather && (
            <Skeleton className={cn("rounded-md", compact ? "h-4 w-8" : "h-5 w-12")} />
          )}
          {!weather && !loadingWeather && weatherError && inMonth && !compact && (
            <span
              className={cn(
                "inline-flex items-center justify-center rounded-md bg-muted/60 text-muted-foreground ring-1 ring-border/60",
                compact ? "h-4 w-4" : "h-5 w-5",
              )}
              title="Vejrudsigt utilgængelig — prøv igen senere"
              aria-label="Vejrudsigt utilgængelig"
            >
              <CloudOff className={compact ? "h-2.5 w-2.5" : "h-3 w-3"} />
            </span>
          )}
          {!isPast && inMonth && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCreateRoute(dateStr); }}
            // Tomme dage får et meget diskret hint så brugeren ved at
            // cellen er klikbar — uden at + tegnet konkurrerer med
            // selve indholdet i kalenderen. Tydeligere på direkte hover.
            className={cn(
              "h-6 w-6 inline-flex items-center justify-center rounded-md border border-transparent transition-[background-color,color,border-color,transform] duration-150 active:scale-[0.92] focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 focus-visible:ring-offset-1 hover:bg-secondary hover:text-foreground hover:border-border",
              emptyDay
                ? "opacity-0 text-muted-foreground/80 group-hover:opacity-100"
                : "opacity-0 group-hover:opacity-90 text-muted-foreground",
            )}
            aria-label={`Opret rute den ${format(date, "d. MMMM", { locale: da })}`}
            title="Opret rute denne dag"
          >
            <Plus className="h-3.5 w-3.5" />
          </button>
          )}
        </div>
      </div>

      {/* Rute-piller */}
      <div className="flex-1 flex flex-col gap-1.5 min-h-0">
        {/* Skeleton pille mens vi henter ruter — kun synlig på dage i den
            aktive måned, så "udenfor"-dage ikke larmer.  Holder layoutet
            stabilt mellem måned/uge-skift. */}
        {loadingRoutes && routes.length === 0 && inMonth && (
          <>
            {/* Vis 1–2 realistiske skeleton-piller pr. dag — varieret bredde
                så kalenderen ligner rigtigt indhold mens data hentes, og
                layoutet ikke pop'er når ruterne lander. */}
            <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card px-2 py-1 shadow-sm">
              <div className="h-2.5 w-2 rounded-sm bg-muted-foreground/20" />
              <div className="h-2.5 flex-1 rounded bg-muted/70 animate-pulse" />
              <div className="h-3 w-3 rounded-full bg-muted/70 animate-pulse" />
            </div>
            {!compact && (
              <div className="flex items-center gap-1 rounded-lg border border-border/60 bg-card px-2 py-1 shadow-sm w-4/5">
                <div className="h-2.5 w-2 rounded-sm bg-muted-foreground/20" />
                <div className="h-2.5 flex-1 rounded bg-muted/60 animate-pulse" />
              </div>
            )}
          </>
        )}
        {(() => {
          // I månedsvisning kapper vi antallet af synlige piller pr. dag, så travle
          // dage ikke "blæser" cellen op og forvrænger hele kalender-rækken.
          // Brugeren kan klikke "+N ruter" for at folde de resterende ud inline.
          // I uge-visning er der masser af plads, så vi viser alle.
          const MAX_VISIBLE = compact && !expanded ? 3 : 99;
          const visible = routes.slice(0, MAX_VISIBLE);
          const overflow = routes.length - visible.length;
          return (
            <>
              {visible.map((r) => (
                <RoutePill
                  key={r.id}
                  route={r}
                  onSelect={() => onSelectRoute(r)}
                  onSelectStop={onSelectStop}
                  onOptimize={() => onOptimizeRoute(r.id)}
                  onDelete={onDeleteRoute ? () => onDeleteRoute(r) : undefined}
                  onShowHistory={onShowHistory ? () => onShowHistory(r) : undefined}
                  optimizing={optimizingRouteId === r.id}
                  compact={compact}
                  jobDragActive={isJobDragActive}
                  routeDragSourceId={draggingType === "route" ? (draggingRouteId ?? null) : null}
                  busy={!!busyRouteIds?.has(`route:${r.id}`)}
                  isPast={isPast}
                  selected={!!selectedRouteIds?.has(r.id)}
                  anySelected={!!selectedRouteIds && selectedRouteIds.size > 0}
                  onToggleSelect={onToggleRouteSelection
                    ? (e) => onToggleRouteSelection(r.id, e)
                    : undefined}
                  hasSkillMismatch={!!mismatchedRouteIds?.has(r.id)}
                  hasAssigneeConflict={!!conflictedRouteIds?.has(r.id)}
                />
              ))}
              {overflow > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
                  className="inline-flex items-center gap-1 self-start text-[10.5px] font-bold text-muted-foreground hover:text-foreground bg-card hover:bg-secondary border border-dashed border-border/70 hover:border-border rounded-md px-2 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none shadow-sm"
                  aria-label={`Vis ${overflow} flere ruter`}
                  title={routes.slice(MAX_VISIBLE).map((r) => r.name || "Rute").join(", ")}
                >
                  +{overflow} {overflow === 1 ? "rute" : "ruter"}
                </button>
              )}
              {expanded && compact && routes.length > 3 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setExpanded(false); }}
                  className="inline-flex items-center gap-1 self-start text-[10.5px] font-semibold text-muted-foreground hover:text-foreground bg-card hover:bg-secondary border border-border/60 rounded-md px-2 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                  aria-label="Skjul ekstra ruter"
                >
                  − skjul
                </button>
              )}
            </>
          );
        })()}

        {/* "Slip her" overlay på tomme dage når en aftale trækkes */}
        {isJobDragActive && emptyDay && canReceiveDrop && (
          <div
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed transition-all duration-200 min-h-[60px]",
              isOver
                ? "border-accent bg-accent/15 text-accent shadow-[0_4px_16px_-4px_hsl(var(--accent)/0.45)]"
                : "border-accent/40 bg-accent/[0.04] text-accent/70 hover:border-accent/60 hover:bg-accent/[0.08]",
            )}
          >
            <ArrowDown className={cn("h-5 w-5 transition-transform", isOver && "animate-bounce")} />
            <span className="text-[11px] font-semibold leading-tight text-center px-1.5">
              {isOver
                ? `Opret rute · ${format(date, "EEEE d. MMM", { locale: da })}`
                : "Slip her for ny rute"}
            </span>
          </div>
        )}
      </div>
      {/* Kapacitetsbar — viser hvor stor en del af dagens medarbejder-
          kapacitet der allerede er booket. Grøn (<70%), gul (70-100%),
          rød (>100%). Skjules på dage uden kapacitet (= ingen aktive
          medarbejdere), helt tomme dage og fortid. */}
      {capacity && capacity.stops_capacity > 0 && inMonth && !isPast && (
        <div
          className="absolute bottom-0 left-0 right-0 h-[3px] bg-border/40 overflow-hidden group/cap"
          title={`${capacity.stops_booked} af ${capacity.stops_capacity} stop planlagt`}
          aria-label={`${capacity.stops_booked} af ${capacity.stops_capacity} stop planlagt`}
        >
          <div
            className={cn(
              "h-full transition-[width] duration-300",
              // Flad indikator — kun tydelig farve ved reelle problemer.
              // Tærsklerne sænket en smule så advarsler kommer i god tid:
              //   ≥110% + reelt booket    → rød (overbooket)
              //   ≥90%                     → gul (tæt på fuldt)
              //   ellers                    → neutral foreground-tone
              capacity.stops_booked > capacity.stops_capacity
                ? "bg-destructive"
                : capacity.load_pct >= 90
                ? "bg-amber-500/80"
                : "bg-foreground/45",
            )}
            style={{ width: `${Math.min(100, capacity.load_pct)}%` }}
          />
        </div>
      )}
    </div>
  );
};

/** memo: en dag-celle skal kun rerender når dens egen data ændrer sig
 *  (rute-array, vejret, drag-tilstand).  Det betyder at kalenderens 42 celler
 *  ikke alle re-rendrer hver gang vejret for én anden dag opdateres. */
const DayCell = memo(DayCellInner, (prev, next) => {
  return (
    prev.dateStr === next.dateStr &&
    prev.inMonth === next.inMonth &&
    prev.today === next.today &&
    prev.compact === next.compact &&
    prev.routes === next.routes &&
    prev.weather === next.weather &&
    prev.draggingType === next.draggingType &&
    prev.draggingRouteId === next.draggingRouteId &&
    prev.optimizingRouteId === next.optimizingRouteId &&
    prev.loadingRoutes === next.loadingRoutes &&
    prev.loadingWeather === next.loadingWeather &&
    prev.weatherError === next.weatherError &&
    prev.busy === next.busy &&
    prev.busyRouteIds === next.busyRouteIds &&
    prev.alert?.severity === next.alert?.severity &&
    prev.alert?.label === next.alert?.label &&
    prev.selectedRouteIds === next.selectedRouteIds &&
    prev.onToggleRouteSelection === next.onToggleRouteSelection &&
    prev.capacity?.load_pct === next.capacity?.load_pct &&
    prev.capacity?.stops_capacity === next.capacity?.stops_capacity &&
    prev.mismatchedRouteIds === next.mismatchedRouteIds &&
    prev.conflictedRouteIds === next.conflictedRouteIds
  );
});

/* ─── Rute-pille (drag + drop target for aftaler) ─── */
type RoutePillProps = {
  route: CalendarRoute;
  onSelect: () => void;
  onSelectStop: (stop: RouteStop) => void;
  onOptimize: () => void;
  onDelete?: () => void;
  onShowHistory?: () => void;
  optimizing: boolean;
  compact: boolean;
  jobDragActive?: boolean;
  /** Id på den rute der pt. trækkes — bruges til at vise denne pille som flette-mål.
   *  Null/undefined hvis ingen rute er under drag eller hvis denne pille selv er kilden. */
  routeDragSourceId?: string | null;
  /** True hvis ruten pt. behandler en flytning — drop deaktiveres + spinner. */
  busy?: boolean;
  /** True hvis rutens dato ligger før i dag — vis dæmpet visuel stil. */
  isPast?: boolean;
  /** True hvis ruten er valgt i bulk-multi-select. Tegner tydelig ring. */
  selected?: boolean;
  /** True hvis ÉN ELLER FLERE ruter er valgt — bruges til at vise en svag
   *  checkbox-affordance på ikke-valgte piller så brugeren forstår at de
   *  også kan vælges. */
  anySelected?: boolean;
  /** Toggle valg/fravalg af denne rute (kaldes ved ⌘/Ctrl/Shift-klik eller
   *  via eksplicit valg-knap). Når undefined er multi-select deaktiveret. */
  onToggleSelect?: (e: React.MouseEvent) => void;
  /** True hvis ruten har mindst én service hvor ingen tildelt medarbejder
   *  har den krævede færdighed. Vises som lille ⚠ ved siden af titlen. */
  hasSkillMismatch?: boolean;
  /** True hvis en tildelt medarbejder på ruten har et tids-overlap med
   *  en anden rute samme dag. Vises som rødt "Konflikt"-badge. */
  hasAssigneeConflict?: boolean;
};

const RoutePillInner = ({
  route, onSelect, onSelectStop, onOptimize, onDelete, onShowHistory, optimizing, compact, jobDragActive, routeDragSourceId,
  busy, isPast, selected, anySelected, onToggleSelect, hasSkillMismatch, hasAssigneeConflict,
}: RoutePillProps) => {
  const isVirtual = !!route.isVirtual;
  // En "basis"-rute er en rigtig rute der fungerer som skabelon for en
  // gentagende serie: mindst ét stop er knyttet til et abonnement eller en
  // aftale med interval. Vi markerer disse tydeligt så brugeren kan skelne
  // basisruten (kilden) fra de projicerede forekomster (kopierne).
  const isBaseRecurring = !isVirtual && route.stops.some(
    (s: any) => !!(s?.subscription_id || s?.agreement_id || s?.agreement_interval),
  );
  // Er denne pille et gyldigt flette-mål for den rute der pt. trækkes?
  // - kilden må aldrig være sit eget mål
  // - projicerede ruter må aldrig modtage en merge (de findes ikke fysisk endnu)
  // - fortids-ruter må ikke modtage merge
  const isMergeTarget =
    !!routeDragSourceId && routeDragSourceId !== route.id && !isVirtual && !isPast && !busy;
  // Drag-handle: hele pillen kan trækkes til ny dato.
  // - Fortids-ruter er altid låst (giver ingen mening at re-planlægge noget der er kørt).
  // - Projicerede (virtuelle) ruter må trækkes til ny dato — drop håndteres af
  //   RoutePlanner via shift_projected_occurrence (ingen materialisering).
  // - Når brugeren er i bulk-valg-tilstand låser vi også drag, så det er
  //   tydeligt at klik=valg og ikke flyt — undgår overraskelser hvor en
  //   ⌘-klik ved et uheld ender med at trække ruten i stedet for at vælge.
  const dragLocked = !!busy || !!isPast || !!anySelected;
  const { attributes, listeners, setNodeRef: setDragRef, isDragging } = useDraggable({
    id: `route:${route.id}`,
    data: { type: "route", route },
    disabled: dragLocked,
  });

  // Drop-zone: aftaler kan slippes på pillen for at blive tilføjet til ruten.
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `route-drop:${route.id}`,
    data: { type: "route", routeId: route.id, date: route.route_date },
    // Også fortids-ruter er låst som drop-target — RoutePlanner.handleDragEnd
    // afviser dem alligevel med toast, men at deaktivere her sparer brugeren
    // for at få fejlen og gør drop-zonen klart "ikke-tilgængelig".
    disabled: isVirtual || !!busy || !!isPast,
  });

  // Live drag-validering for denne rute — sat af RoutePlanner.handleDragOver
  // når en aftale eller en anden rute svæver over pillen.
  const validation = useTargetValidation(`route:${route.id}`);

  // Combined ref
  const setRefs = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const stopCount = route.stops.length;
  const completedCount = route.stops.filter((s) => s.status === "completed").length;
  // Hele ruten markeret som udført (server-side status). Vises med grønt
  // badge så brugeren straks kan se den ikke skal udføres igen. Den
  // forbliver i kalenderen — vi fjerner den IKKE.
  // Virtuelle/projicerede forekomster må aldrig vise "Udført" — hver
  // projiceret dato er en frisk udførsel selvom basisrutens
  // status kan have være sat til completed (vi rydder også feltet
  // i useProjectedCalendar, men gardere os her som backup).
  const isRouteCompleted = !isVirtual && (route as any).status === "completed";
  // Lokal "alle stop udført"-tilstand: bruges KUN visuelt på piller i kalenderen,
  // så en rute der reelt er fuldført (men hvis server-status endnu ikke er
  // sat til 'completed') også fremstår tydeligt færdig.
  const allStopsDone = !isVirtual && stopCount > 0 && completedCount === stopCount;
  const showAsCompleted = isRouteCompleted || allStopsDone;
  // Tre tilstande for projicerede (virtuelle) ruter:
  //  - future  → låst indtil dagen er aktuel (vises med hængelås)
  //  - today   → aktiv projektion, kan udføres eller flyttes nu
  //  - past    → historisk projektion (allerede passeret, kun til indsigt)
  // De skal aldrig vise modstridende ikoner/tekster (fx "låst" på en
  // forrige dato), så vi beregner én kanonisk tilstand her og bruger den
  // konsekvent til badge, tooltip og aria-label.
  const todayStr = new Date().toISOString().slice(0, 10);
  const projectedKind: "future" | "today" | "past" | null = isVirtual
    ? route.route_date > todayStr
      ? "future"
      : route.route_date === todayStr
        ? "today"
        : "past"
    : null;
  const isFutureProjected = projectedKind === "future";
  const travelMin = Number(route.total_duration_minutes || 0) || route.stops.reduce((sum, s) => sum + Number(s.travel_time_to_next_min || 0), 0);
  const revenue = route.stops.reduce((sum, s) => sum + Number((s as any).order_amount || 0), 0);
  // Kapacitetsbjælken beregnes alene ud fra antal stop pr. medarbejder.
  const empCount = Math.max(route.attachedEmployees.length || route.attachedEmployeeCount || 0, 1);
  const routeCapacity = stopCapacity(stopCount, empCount);
  const loadPct = routeCapacity.load_pct;
  const loadColor =
    loadPct >= 100 ? "bg-destructive"
      : loadPct >= 85 ? "bg-amber-500"
        : "bg-foreground/40";
  // I månedsvisning er cellerne smalle (~110px). For at undgå at metadata-
  // rækken wrapper til 3-4 linjer (og dermed gør pillen + hele kalender-
  // rækken unødigt høj) viser vi færre felter og holder dem på én linje.
  const visibleEmployees = route.attachedEmployees.slice(0, compact ? 2 : 3);
  const extraEmployees = route.attachedEmployees.length - visibleEmployees.length;
  // Fjernet: grøn bundkant og "klar til udførelse"-logik efter ønske.
  const canDelete = !!onDelete && !isVirtual && !busy;
  const canOptimize = !isVirtual && stopCount >= 2 && !busy;
  const canHistory = !!onShowHistory && !isVirtual;

  const pill = (
    <div
      ref={setRefs}
      data-route-drop-route-id={!isVirtual && !isPast ? route.id : undefined}
      data-route-drop-date={!isVirtual && !isPast ? route.route_date : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (isDragging) return;
        // Multi-select: ⌘/Ctrl/Shift-klik toggler valg i stedet for at
        // åbne ruten. Når mindst én rute allerede er valgt opfører ALLE
        // klik sig som "toggle" så brugeren kan udvide valget uden at
        // skulle holde en modifier-tast hele tiden. Klik på en pille
        // udenfor valg-tilstand åbner som før.
        if (onToggleSelect && (e.metaKey || e.ctrlKey || e.shiftKey || anySelected)) {
          // Virtuelle/fortids-ruter er låst for bulk-flyt — vi ignorerer
          // valg-toggle på dem så valget altid kun indeholder ruter der
          // faktisk kan flyttes.
          if (isVirtual || isPast) return;
          onToggleSelect(e);
          return;
        }
        onSelect();
      }}
      className={cn(
        // Fælles design-tokens — deles 1:1 med UnassignedJobCard og stop-rækker
        // i RouteStopsPanel. Justér ét sted (card-styles.ts) → ens look overalt.
        PILL_BASE,
        "cursor-pointer",
        isDragging && "opacity-40",
        // Projicerede ruter: kraftig visuel adskillelse — stiplet kant hele
        // vejen rundt, dæmpet baggrund og en diagonal-stribe så de aldrig
        // forveksles med den rigtige basisrute.
        isVirtual && "border-dashed border-foreground/30 bg-muted/40 [background-image:repeating-linear-gradient(135deg,transparent_0_6px,hsl(var(--muted-foreground)/0.06)_6px_7px)]",
        // Basisruter (kilden til en gentagende serie) får en lille ring-
        // accent så de tydeligt skiller sig ud fra både engangsruter og
        // projicerede forekomster — uden at flytte indholdet i pillen.
        isBaseRecurring && !isVirtual && "shadow-[inset_0_0_0_1px_hsl(var(--accent)/0.35)]",
        isPast && "opacity-50 saturate-50 hover:opacity-90",
        // Helt udført rute: emerald-tint på baggrunden, dæmpet skrift —
        // gør "færdig" til den klart mest scanbare tilstand i kalenderen.
        showAsCompleted && !isPast && "bg-emerald-500/[0.07] hover:bg-emerald-500/[0.12]",
        // Under drag dæmpes fortids-ruter yderligere — de er ikke gyldige
        // drop-targets (kalender-cellen er disabled), så de skal heller
        // ikke visuelt invitere til drop.
        jobDragActive && isPast && "opacity-25 pointer-events-none",
        // Når en aftale er ved at blive sluppet på pillen — markér tydeligt
        // Trin 3 — alle gyldige drop-targets får ensartet subtil ring under drag,
        //         så brugeren ser hvor man KAN slippe (ikke kun hvor man hovrer).
        !isVirtual && jobDragActive && !isPast && !isOver && "border-dashed ring-1 ring-accent/25 ring-inset",
        // Ugyldige pille-targets (projiceret/fortid) dæmpes klart under drag.
        (isVirtual || isPast) && jobDragActive && "opacity-40",
        !isVirtual && isOver && !validation && "ring-1 ring-accent border-accent",
        !isVirtual && isOver && validation && ringForSeverity(validation.severity),
        // Når en ANDEN rute faktisk hovrer over denne pille, er det et merge.
        // Vi markerer derfor KUN ved reel hover, så en dato med en eksisterende
        // rute ikke fejlagtigt ligner et merge-target i sig selv.
        isMergeTarget && isOver && "ring-1 ring-accent bg-accent/5",
        // Hvis denne pille selv er kilde i en rute-drag: dæmp + crosshatch-look
        routeDragSourceId === route.id && "opacity-50",
        // Hvis denne pille IKKE er et gyldigt flette-mål under route-drag (fx projiceret/fortid),
        // dæmp den så brugeren ikke prøver at slippe.
        routeDragSourceId && !isMergeTarget && routeDragSourceId !== route.id && "opacity-40 pointer-events-none",
        busy && "cursor-wait",
        // Multi-select visuelt — tydelig accent-ring på valgte piller, og
        // svag dæmpning på ikke-valgte piller mens man er i valg-tilstand,
        // så valget altid er let at scanne i en travl kalender.
        selected && "ring-1 ring-accent border-accent",
        anySelected && !selected && !isVirtual && !isPast && "opacity-70 hover:opacity-100",
        anySelected && (isVirtual || isPast) && "opacity-30",
      )}
      title={
        validation?.topMessage
          ? validation.topMessage
          : projectedKind === "future"
            ? `Låst projektion — oplåses ${format(parseISO(route.route_date), "d. MMM yyyy", { locale: da })}. Klik åbner originalruten; træk for at flytte netop denne forekomst.`
            : projectedKind === "today"
              ? "Projiceret forekomst — aktiv i dag. Klik åbner originalruten; træk for at flytte netop denne forekomst."
              : projectedKind === "past"
                ? "Historisk projektion — datoen er passeret. Klik åbner originalruten."
                : isPast
            ? "Tidligere rute — kan ikke flyttes"
            : "Klik åbner ruten · træk for at flytte · ⌘/Shift-klik for at vælge flere"
      }
      aria-busy={busy || undefined}
    >
      {/* Venstre farve-rail (3px, blød afslutning) + svag tint-glow indad —
          giver ruten en tydelig farve-signatur uden at overdøve indholdet.
          På projicerede ruter dropper vi tinten (stripes håndterer det). */}
      <span
        aria-hidden
        className="absolute inset-y-0 left-0 w-[3px] pointer-events-none rounded-l-lg"
        style={{ background: route.color }}
      />
      {!isVirtual && (
        <span
          aria-hidden
          className="absolute inset-y-0 left-[3px] right-0 pointer-events-none opacity-90"
          style={{ background: tintBgFrom(route.color) }}
        />
      )}
      {/* L2 — Live drop-validering chip på rute-pille.
          Vises kun mens et drag svæver over pillen og en validering er
          aktiv, så brugeren ser præcis hvorfor dropet er ok/advarsel/fejl
          INDEN slip. Matcher chip-stilen på DayCell for konsistens. */}
      {isOver && validation && (
        <div
          className={cn(
            "absolute -top-1 right-1 z-20 pointer-events-none rounded-md px-1.5 py-0.5 shadow-md text-[10px] font-semibold flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150 max-w-[95%]",
            chipBgForSeverity(validation.severity),
          )}
          role="status"
        >
          {validation.severity === "error" ? (
            <XCircle className="h-3 w-3 shrink-0" />
          ) : validation.severity === "warning" ? (
            <AlertTriangle className="h-3 w-3 shrink-0" />
          ) : (
            <CheckCircle2 className="h-3 w-3 shrink-0" />
          )}
          <span className="truncate">{validation.topMessage ?? (validation.severity === "ok" ? (routeDragSourceId ? "Slip her for at flette ruterne" : "Tilføj til rute") : "")}</span>
        </div>
      )}
      {/* Merge-target chip: vises kun ved reel hover på selve rute-pillen.
          Drop på dagen = flytning; drop på pillen = fletning. */}
      {isMergeTarget && isOver && !validation && (
        <div
          className="absolute -top-1 right-1 z-20 pointer-events-none rounded-md px-1.5 py-0.5 shadow-md text-[10px] font-semibold flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150 max-w-[95%] bg-accent text-accent-foreground"
          role="status"
        >
          <GitMerge className="h-3 w-3 shrink-0" />
          <span className="truncate">Slip her for at flette</span>
        </div>
      )}
      {busy && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[1px] pointer-events-none">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
        </div>
      )}
      <div
        {...(dragLocked ? {} : listeners)}
        {...(dragLocked ? {} : attributes)}
        className={cn(
          // Lidt mere højre-padding når der er medarbejder-avatarer på
          // pillen, så ring-2 ring-card-haloen ikke "klipper" mod
          // pillens højre kant i smalle måneds-celler.
          "relative z-[1] pl-3 py-1.5 flex items-center justify-between gap-1.5",
          (visibleEmployees.length > 0 || extraEmployees > 0) ? "pr-2.5" : "pr-2",
          isPast && !isVirtual ? "cursor-not-allowed"
            : dragLocked ? "cursor-pointer"
            : "cursor-grab active:cursor-grabbing",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold truncate text-foreground leading-tight flex items-center gap-1 tracking-tight">
            {projectedKind && (() => {
              const unlockLabel = format(parseISO(route.route_date), "d. MMM yyyy", { locale: da });
              const meta = projectedKind === "future"
                ? {
                    Icon: Lock,
                    text: "Låst",
                    title: `Projiceret rute — låst indtil ${unlockLabel}. Oplåses automatisk på dagen og kan derefter udføres af tildelt medarbejder.`,
                    aria: `Projiceret, låst indtil ${unlockLabel}`,
                  }
                : projectedKind === "today"
                ? {
                    Icon: Sparkles,
                    text: "I dag",
                    title: "Projiceret forekomst — aktiv i dag. Kan udføres af tildelt medarbejder eller flyttes til en anden dato.",
                    aria: "Projiceret, aktiv i dag",
                  }
                : {
                    Icon: History,
                    text: "Historisk",
                    title: "Historisk projektion — datoen er passeret. Vises kun til indsigt; udførsel/ændring skal ske på originalruten.",
                    aria: "Historisk projiceret forekomst",
                  };
              const { Icon, text, title: t, aria } = meta;
              return (
                <span
                  className={cn(
                    "inline-flex items-center gap-0.5 rounded-[3px] bg-foreground/[0.06] ring-1 ring-inset ring-foreground/10 text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground shrink-0",
                    compact ? "px-1 py-px" : "px-1.5 py-px",
                  )}
                  title={t}
                  aria-label={aria}
                >
                  <Icon className="h-2 w-2 opacity-80" />
                  {!compact && text}
                </span>
              );
            })()}
            {/* Tidligere (ikke-projicerede) ruter er låste for flyt/redigér.
                Vis et lille Lås-badge så brugeren ser det INDEN drag-forsøg —
                samme stil som projicerede badges for konsistens. */}
            {isPast && !isVirtual && !projectedKind && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-[3px] bg-foreground/[0.06] ring-1 ring-inset ring-foreground/10 text-[9px] font-bold uppercase tracking-[0.06em] text-muted-foreground shrink-0",
                  compact ? "px-1 py-px" : "px-1.5 py-px",
                )}
                title="Tidligere rute — kan ikke flyttes. Klik åbner detaljer."
                aria-label="Låst — tidligere rute"
              >
                <Lock className="h-2 w-2 opacity-80" />
                {!compact && "Låst"}
              </span>
            )}
            {isBaseRecurring && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-[3px] bg-foreground text-background text-[9px] font-bold uppercase tracking-[0.06em] shadow-sm shrink-0",
                  compact ? "px-1 py-px" : "px-1.5 py-px",
                )}
                title="Originalrute — kilde til en gentagende serie. Ændringer her arves af alle projicerede forekomster."
                aria-label="Originalrute"
              >
                <Repeat className="h-2 w-2" />
                {!compact && "Original"}
              </span>
            )}
            {showAsCompleted && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-[3px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-inset ring-emerald-500/30 text-[9px] font-bold uppercase tracking-[0.06em] shrink-0",
                  compact ? "px-1 py-px" : "px-1.5 py-px",
                )}
                title="Ruten er udført — åbn for at se detaljer eller genåbn"
                aria-label="Udført"
              >
                <CheckCircle2 className="h-2 w-2" />
                {!compact && "Udført"}
              </span>
            )}
            {!isVirtual && route.isReplacement && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-[3px] bg-amber-500/15 text-amber-700 dark:text-amber-300 ring-1 ring-inset ring-amber-500/30 text-[9px] font-bold uppercase tracking-[0.06em] shrink-0",
                  compact ? "px-1 py-px" : "px-1.5 py-px",
                )}
                title={route.replacedFromDate
                  ? `Erstatningsrute — flyttet hertil fra ${format(parseISO(route.replacedFromDate), "EEEE d. MMM", { locale: da })}`
                  : "Erstatningsrute — flyttet hertil fra en anden dato"}
                aria-label="Erstatningsrute — flyttet hertil"
              >
                <CalendarArrowDown className="h-2 w-2" />
                {!compact && "Flyttet"}
              </span>
            )}
            {!isVirtual && hasAssigneeConflict && (
              <span
                className={cn(
                  "inline-flex items-center gap-0.5 rounded-[3px] bg-destructive/15 text-destructive ring-1 ring-inset ring-destructive/30 text-[9px] font-bold uppercase tracking-[0.06em] shrink-0",
                  compact ? "px-1 py-px" : "px-1.5 py-px",
                )}
                title="Konflikt: en tildelt medarbejder er booket til to ting samtidig samme dag"
                aria-label="Medarbejder-konflikt"
              >
                <AlertTriangle className="h-2 w-2" />
                {!compact && "Konflikt"}
              </span>
            )}
            <span className={cn("truncate", isVirtual && "italic text-muted-foreground")}>
              {route.name || `Rute (${format(parseISO(route.route_date), "d. MMM", { locale: da })})`}
            </span>
            {hasSkillMismatch && (
              <span
                className="shrink-0 inline-flex"
                title="En tildelt medarbejder mangler en færdighed for et af stoppene"
                aria-label="Skill-mismatch"
              >
                <AlertTriangle className="h-3 w-3 text-amber-500" />
              </span>
            )}
          </div>
          <div
            className={cn(
              "mt-1 flex items-center gap-x-2 text-[11px] text-muted-foreground tabular-nums overflow-hidden",
              compact ? "flex-nowrap whitespace-nowrap" : "flex-wrap gap-y-0.5",
            )}
          >
            {stopCount > 0 && (
              <span className="inline-flex items-center gap-0.5 shrink-0">
                <MapPin className="h-3 w-3" />
                <span>
                  {completedCount > 0 && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">{completedCount}/</span>
                  )}
                  {stopCount} {stopCount === 1 ? "stop" : "stop"}
                </span>
              </span>
            )}
            {revenue > 0 && (
              <span className="inline-flex items-center gap-0.5 shrink-0 font-semibold text-foreground/80">
                <Wallet className="h-3 w-3 shrink-0" />
                {compact ? fmtRouteKrCompact(revenue) : fmtRouteKr(revenue)}
              </span>
            )}
            {travelMin > 0 && !compact && (
              <span className="inline-flex items-center gap-0.5 shrink-0">
                <Clock className="h-3 w-3" />{fmtRouteMin(travelMin)}
              </span>
            )}
          </div>
        </div>
        {/* Medarbejder-avatarer */}
        {visibleEmployees.length > 0 && (
          <div className="flex -space-x-1 shrink-0" title={route.attachedEmployees.map((e) => e.name).join(", ")}>
            {visibleEmployees.map((emp) =>
              emp.avatar_url ? (
                <img
                  key={emp.id}
                  src={emp.avatar_url}
                  alt={emp.name}
                  title={emp.name}
                  loading="lazy"
                  className="h-5 w-5 rounded-full object-cover ring-2 ring-card"
                />
              ) : (
                <span
                  key={emp.id}
                  className="inline-flex h-5 w-5 items-center justify-center rounded-full ring-2 ring-card text-[9px] font-bold leading-none"
                  style={{ background: emp.color || "hsl(var(--muted-foreground))", color: readableTokenOn(emp.color) }}
                  title={emp.name}
                  aria-label={emp.name}
                >
                  {initials(emp.name)}
                </span>
              ),
            )}
            {extraEmployees > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-0.5 rounded-full text-[9px] font-bold ring-2 ring-card bg-muted text-muted-foreground">
                +{extraEmployees}
              </span>
            )}
          </div>
        )}
        {visibleEmployees.length === 0 && route.attachedEmployeeCount === 0 && !compact && (
          <span className="text-[10px] text-muted-foreground italic flex items-center gap-0.5 shrink-0">
            <Users className="h-3 w-3" />0
          </span>
        )}
        {/* Handlings-cluster: optimér + ⋯-menu vises i en samlet ramme på
            hover, så de fremstår som ÉN handlingsgruppe og ikke som løse
            ikoner spredt langs højre kant. */}
        {(canOptimize || canDelete || canHistory) && (
          <div className="shrink-0 flex items-center gap-px rounded-md opacity-0 group-hover:opacity-100 focus-within:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity duration-150">
        {!isVirtual && stopCount >= 2 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOptimize(); }}
            disabled={optimizing}
            className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary active:scale-[0.92] disabled:opacity-50 transition-[background-color,color,transform] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
            aria-label="Optimér rækkefølge"
            title="Optimér rækkefølge — ændrer kun rækkefølgen, ikke medarbejdere"
          >
            {optimizing
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Sparkles className="h-3 w-3" />}
          </button>
        )}
        {/* ⋯-menu: synlig hurtig-handlingstrigger så brugeren ikke skal højre-
            klikke. Samme handlinger som højreklik-menuen. */}
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                onClick={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                disabled={busy}
                className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded-md text-muted-foreground opacity-40 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100 hover:text-foreground hover:bg-secondary active:scale-[0.92] transition-[background-color,color,transform,opacity] duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 data-[state=open]:bg-secondary data-[state=open]:text-foreground"
                aria-label="Flere handlinger"
                title="Flere handlinger"
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <MoreHorizontal className="h-3.5 w-3.5" />}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48" onClick={(e) => e.stopPropagation()}>
              <DropdownMenuItem
                onSelect={(e) => {
                  // FIX: når brugeren vælger "Åbn rute" via dropdown'en,
                  // lukker Radix-menuen og bobler et pointer-event op til
                  // den netop åbnede Sheet — som derefter tolker det som
                  // "klik udenfor" og lukker sig selv igen. Vi udskyder
                  // åbningen ét frame så menuens close-event er færdig
                  // FØR sheet'en mountes.
                  e.preventDefault();
                  requestAnimationFrame(() => {
                    try { onSelect(); } catch (err) {
                      console.error(err);
                      toast.error("Kunne ikke åbne ruten");
                    }
                  });
                }}
              >
                <Eye className="h-3.5 w-3.5 mr-2" /> Åbn rute
              </DropdownMenuItem>
              {canOptimize && (
                <DropdownMenuItem
                  disabled={optimizing}
                  onSelect={(e) => {
                    e.preventDefault();
                    requestAnimationFrame(() => {
                      try { onOptimize(); } catch (err) {
                        console.error(err);
                        toast.error("Kunne ikke optimere ruten");
                      }
                    });
                  }}
                >
                  {optimizing
                    ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5 mr-2" />}
                  {optimizing ? "Optimerer …" : "Optimér rækkefølge"}
                </DropdownMenuItem>
              )}
              {canHistory && (
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    requestAnimationFrame(() => {
                      try { onShowHistory!(); } catch (err) {
                        console.error(err);
                        toast.error("Kunne ikke åbne historik");
                      }
                    });
                  }}
                >
                  <History className="h-3.5 w-3.5 mr-2" /> Vis historik
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive"
                    onSelect={(e) => {
                      e.preventDefault();
                      requestAnimationFrame(() => {
                        try { onDelete!(); } catch (err) {
                          console.error(err);
                          toast.error("Kunne ikke slette ruten");
                        }
                      });
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Slet rute…
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
        </DropdownMenu>
          </div>
        )}
      </div>

      {/* Kapacitets-bar: tynd stribe der viser belastning. Skjul ved 0 stops. */}
      {/* Trin 4 — Hover-preview: når en aftale svæver over pillen viser vi et
          floating "ghost stop" der indikerer indsættelses-position. Vises kun
          for gyldige drop (ingen error-severity) for at undgå falske signaler. */}
      {jobDragActive && isOver && !isVirtual && !isPast && validation?.severity !== "error" && (
        <div
          aria-hidden
          className="px-2 pb-1 -mt-0.5 animate-in fade-in slide-in-from-top-1 duration-150"
        >
          <div className="flex items-center gap-1 rounded-sm border border-dashed border-accent/70 bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
            <Plus className="h-2.5 w-2.5" />
            <span className="truncate">Ny stop på rute</span>
          </div>
        </div>
      )}
      {stopCount > 0 && (
        <div
          className={cn(
            "relative h-1 w-full overflow-hidden bg-muted/40",
            // Lidt højere bar når ruten har fremdrift, så den er let at se på
            // afstand. Helt udførte ruter får emerald-stribe.
            completedCount > 0 && "h-1.5",
          )}
          title={completedCount > 0
            ? `${completedCount} af ${stopCount} stop udført · ${stopCount} af ${routeCapacity.stops_capacity} stop planlagt`
            : `${stopCount} af ${routeCapacity.stops_capacity} stop planlagt (${empCount} medarbejder${empCount === 1 ? "" : "e"})`}
          aria-label={
            completedCount > 0
              ? `${completedCount} af ${stopCount} stop udført`
              : `${stopCount} af ${routeCapacity.stops_capacity} stop planlagt`
          }
        >
          {/* Belastnings-baggrund (subtil) */}
          <div
            className={cn(
              "absolute inset-y-0 left-0 transition-all duration-300 opacity-50",
              loadPct >= 100
                ? "bg-destructive"
                : loadPct >= 85
                ? "bg-amber-500"
                : "bg-foreground/25",
            )}
            style={{ width: `${Math.min(100, loadPct)}%` }}
          />
          {/* Fremdrift OVER belastning — emerald, så "udført" er det tydeligste. */}
          {completedCount > 0 && (
            <div
              className="absolute inset-y-0 left-0 bg-emerald-500 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.round((completedCount / stopCount) * 100))}%` }}
            />
          )}
        </div>
      )}
      {/* Stops vises ikke under rute-pillen — åbn ruten ved at klikke for at se aftaler. */}
    </div>
  );

  return (
    <RouteContextMenu
      hide={{
        duplicate: true,
        move: true,
        "show-on-map": true,
        optimize: !canOptimize,
        delete: !canDelete,
        history: !canHistory,
      }}
      onAction={(action) => {
        if (action === "view") onSelect();
        else if (action === "optimize" && canOptimize) onOptimize();
        else if (action === "delete" && canDelete) onDelete!();
        else if (action === "history" && canHistory) onShowHistory!();
      }}
    >
      {pill}
    </RouteContextMenu>
  );
};

const RoutePill = memo(RoutePillInner, (prev, next) => {
  return (
    prev.route === next.route &&
    prev.optimizing === next.optimizing &&
    prev.compact === next.compact &&
    prev.jobDragActive === next.jobDragActive &&
    prev.routeDragSourceId === next.routeDragSourceId &&
    prev.busy === next.busy &&
    prev.selected === next.selected &&
    prev.anySelected === next.anySelected &&
    prev.onToggleSelect === next.onToggleSelect &&
    prev.hasSkillMismatch === next.hasSkillMismatch &&
    prev.hasAssigneeConflict === next.hasAssigneeConflict
  );
});