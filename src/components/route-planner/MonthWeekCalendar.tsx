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
import { Loader2, Sparkles, Plus, Users, MapPin, ArrowDown, Repeat, Clock, Wallet } from "lucide-react";
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
import { memo, useMemo } from "react";

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
  optimizingRouteId?: string | null;
  /** Sat til 'job' når brugeren trækker en aftale fra aftalepoolen — får drop-targets til at lyse op. */
  draggingType?: "job" | "route" | "stop" | null;
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
};

const ymd = (d: Date) => format(d, "yyyy-MM-dd");
const fmtRouteMin = (min: number) => min >= 60 ? `${Math.floor(min / 60)}t ${min % 60}m` : `${min}m`;
// Vis altid med dansk tusind-separator + "kr" — så et tal på et rute-kort
// aldrig kan misforstås som "antal" i stedet for "beløb".
const fmtRouteKr = (n: number) =>
  `${Math.round(n).toLocaleString("da-DK")} kr`;
// Kompakt valuta til smalle månedsceller: viser stadig "kr" så betydningen
// er entydig. "1,5k kr" / "760 kr" — ingen tvivl om at det er penge.
const fmtRouteKrCompact = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")} mio kr`;
  if (n >= 10_000) return `${Math.round(n / 1000)}k kr`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(".", ",")}k kr`;
  return `${Math.round(n)} kr`;
};

export const MonthWeekCalendar = ({
  view, anchorDate, routes, onSelectRoute, onSelectStop,
  onCreateRoute, onOptimizeRoute, optimizingRouteId, draggingType, weatherByDate,
  loadingRoutes, loadingWeather, weatherError, busyTargets,
}: Props) => {
  const anchor = parseISO(anchorDate);

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
    for (const r of routes) {
      const arr = m.get(r.route_date) || [];
      arr.push(r);
      m.set(r.route_date, arr);
    }
    // Sortér ruterne i hver dag deterministisk så projicerede (virtuelle)
    // ruter ikke ender "bagved" den originale basisrute pga. tilfældig
    // insertion-rækkefølge. Primært på planlagt starttid, sekundært på
    // navn, og virtuelle ruter placeres FØR de rigtige ved tie — så
    // brugeren altid kan se den projicerede forekomst først.
    for (const [k, arr] of m) {
      arr.sort((a, b) => {
        const at = (a as any).planned_start_time || "";
        const bt = (b as any).planned_start_time || "";
        if (at !== bt) {
          if (!at) return 1;
          if (!bt) return -1;
          return at < bt ? -1 : 1;
        }
        const av = a.isVirtual ? 0 : 1;
        const bv = b.isVirtual ? 0 : 1;
        if (av !== bv) return av - bv;
        return (a.name || "").localeCompare(b.name || "");
      });
      m.set(k, arr);
    }
    return m;
  }, [routes]);

  const weekdayLabels = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

  return (
    <Card className="overflow-hidden flex flex-col h-full">
      {/* Weekday header */}
      <div className="grid border-b bg-secondary/30 shrink-0" style={{ gridTemplateColumns: "48px repeat(7, minmax(0, 1fr))" }}>
        <div className="border-r p-2 text-[10px] uppercase text-muted-foreground font-semibold flex items-center justify-center">
          Uge
        </div>
        {weekdayLabels.map((wd) => (
          <div key={wd} className="p-2 text-[11px] uppercase text-muted-foreground font-semibold text-center border-r last:border-r-0">
            {wd}
          </div>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {weeks.map((week, wi) => {
          const weekNum = getISOWeek(week[0]);
          return (
            <div
              key={wi}
              className="grid border-b last:border-b-0"
              style={{ gridTemplateColumns: "48px repeat(7, minmax(0, 1fr))" }}
            >
              {/* Ugenummer */}
              <div className="border-r bg-secondary/20 flex items-start justify-center pt-2 text-xs font-bold text-muted-foreground tabular-nums">
                {weekNum}
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
                    onOptimizeRoute={onOptimizeRoute}
                    optimizingRouteId={optimizingRouteId}
                    compact={view === "month"}
                    draggingType={draggingType}
                    weather={weatherByDate?.get(dateStr) ?? null}
                    loadingRoutes={!!loadingRoutes}
                    loadingWeather={!!loadingWeather}
                    weatherError={!!weatherError}
                    busy={!!busyTargets?.has(`day:${dateStr}`)}
                    busyRouteIds={busyTargets}
                  />
                );
              })}
            </div>
          );
        })}
      </div>
    </Card>
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
  onOptimizeRoute: (routeId: string) => void;
  optimizingRouteId?: string | null;
  compact: boolean;
  draggingType?: "job" | "route" | "stop" | null;
  weather?: WeatherDay | null;
  loadingRoutes?: boolean;
  loadingWeather?: boolean;
  weatherError?: boolean;
  /** True hvis dagens drop-zone pt. behandler en flytning. */
  busy?: boolean;
  /** Sæt med alle busy targets — videresendes til RoutePill for rute-niveau. */
  busyRouteIds?: Set<string>;
};

const DayCellInner = ({
  date, dateStr, routes, inMonth, today,
  onSelectRoute, onSelectStop, onCreateRoute, onOptimizeRoute, optimizingRouteId, compact, draggingType, weather,
  loadingRoutes, loadingWeather, weatherError, busy, busyRouteIds,
}: DayCellProps) => {
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const isPast = dateStr < todayIso;
  const { setNodeRef, isOver } = useDroppable({
    id: `day:${dateStr}`,
    data: { type: "day", date: dateStr },
    disabled: !!busy || isPast,
  });

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
    if (draggingType === "job") return emptyDay ? "Opret ny rute" : "Tilføj til rute";
    if (draggingType === "stop") return "Flyt stop hertil";
    if (draggingType === "route") return "Flyt rute hertil";
    return null;
  })();

  return (
    <div
      ref={setNodeRef}
      data-route-drop-date={canReceiveDrop ? dateStr : undefined}
      className={cn(
        "border-r last:border-r-0 relative group flex flex-col gap-1 p-1.5 transition-colors",
        compact ? "min-h-[110px]" : "min-h-[160px]",
        !inMonth && "bg-secondary/10",
        isPast && "bg-muted/20",
        // Når en aftale/rute trækkes:
        //  - Gyldige drop-dage (i måneden, ikke fortid, ikke optaget) får
        //    en subtil accent-ring så brugeren ser hvor der KAN droppes.
        //  - Fortid/udenfor-måned dæmpes så de visuelt træder i baggrunden
        //    og ikke konkurrerer om opmærksomheden under drag.
        canReceiveDrop && !isOver && "ring-1 ring-accent/40 ring-inset",
        isDragActive && isPast && "opacity-40",
        isDragActive && !inMonth && "opacity-50",
        // Eksplicit cursor-feedback: brugeren kan se INDEN drop om dagen
        // accepterer slip eller ej. Sparer en mislykket drop-cyklus.
        isDragActive && isPast && "cursor-not-allowed",
        canReceiveDrop && "cursor-copy",
        // Når man hovrer over en gyldig dag — tydeligt highlight
        isOver && canReceiveDrop && "bg-accent/20 ring-2 ring-accent ring-inset shadow-inner",
        busy && "opacity-90 cursor-wait",
      )}
      aria-busy={busy || undefined}
    >
      {/* ─── Drop-target floating label ─── */}
      {/* Vises kun mens brugeren hovrer over en gyldig drop-dag. Fortæller
          eksplicit hvad der sker ved slip + præcis dato — så brugeren
          aldrig er i tvivl om udfaldet før de slipper. */}
      {dropVerb && (
        <div
          className="absolute top-1 right-1 z-30 pointer-events-none rounded-md bg-accent text-accent-foreground px-1.5 py-0.5 shadow-lg text-[10px] font-semibold flex items-center gap-1 animate-in fade-in slide-in-from-top-1 duration-150"
          role="status"
        >
          <ArrowDown className="h-3 w-3" />
          <span>{dropVerb}</span>
        </div>
      )}
      {busy && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-background/60 backdrop-blur-[1px] rounded-sm pointer-events-none">
          <Loader2 className="h-5 w-5 animate-spin text-accent" />
        </div>
      )}
      {/* Dato-header */}
      <div className="flex items-center justify-between mb-0.5">
        <span
          className={cn(
            "inline-flex items-center justify-center rounded-full text-xs font-semibold tabular-nums",
            today ? "h-6 w-6 bg-accent text-accent-foreground" : "h-6 w-6 text-foreground",
            !inMonth && !today && "text-muted-foreground/50",
          )}
        >
          {format(date, "d")}
        </span>
        <div className="flex items-center gap-1">
          {weather && (
            <WeatherBadge weather={weather} size={compact ? "compact" : "full"} />
          )}
          {!weather && loadingWeather && (
            <Skeleton className={cn("rounded-md", compact ? "h-4 w-8" : "h-5 w-12")} />
          )}
          {!weather && !loadingWeather && weatherError && inMonth && (
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
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onCreateRoute(dateStr); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity h-5 w-5 inline-flex items-center justify-center rounded hover:bg-accent/10 text-muted-foreground hover:text-accent"
            aria-label="Opret rute"
            title="Opret rute denne dag"
          >
            <Plus className="h-3 w-3" />
          </button>
        </div>
      </div>

      {/* Rute-piller */}
      <div className="flex-1 flex flex-col gap-1 min-h-0">
        {/* Skeleton pille mens vi henter ruter — kun synlig på dage i den
            aktive måned, så "udenfor"-dage ikke larmer.  Holder layoutet
            stabilt mellem måned/uge-skift. */}
        {loadingRoutes && routes.length === 0 && inMonth && (
          <>
            {/* Vis 1–2 realistiske skeleton-piller pr. dag — varieret bredde
                så kalenderen ligner rigtigt indhold mens data hentes, og
                layoutet ikke pop'er når ruterne lander. */}
            <div className="flex items-center gap-1 rounded-md border border-border/60 bg-card/80 px-2 py-1">
              <div className="h-2.5 w-2 rounded-sm bg-muted-foreground/20" />
              <div className="h-2.5 flex-1 rounded bg-muted/70 animate-pulse" />
              <div className="h-3 w-3 rounded-full bg-muted/70 animate-pulse" />
            </div>
            {!compact && (
              <div className="flex items-center gap-1 rounded-md border border-border/60 bg-card/80 px-2 py-1 w-4/5">
                <div className="h-2.5 w-2 rounded-sm bg-muted-foreground/20" />
                <div className="h-2.5 flex-1 rounded bg-muted/60 animate-pulse" />
              </div>
            )}
          </>
        )}
        {(() => {
          // I månedsvisning kapper vi antallet af synlige piller pr. dag, så travle
          // dage ikke "blæser" cellen op og forvrænger hele kalender-rækken.
          // I uge-visning er der masser af plads, så vi viser alle.
          const MAX_VISIBLE = compact ? 3 : 99;
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
                  optimizing={optimizingRouteId === r.id}
                  compact={compact}
                  jobDragActive={isJobDragActive}
                  busy={!!busyRouteIds?.has(`route:${r.id}`)}
                  isPast={isPast}
                />
              ))}
              {overflow > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSelectRoute(routes[MAX_VISIBLE]); }}
                  className="text-[10px] font-medium text-muted-foreground hover:text-accent hover:bg-accent/10 rounded px-1.5 py-0.5 text-left transition-colors"
                  aria-label={`Vis ${overflow} flere ruter`}
                  title={routes.slice(MAX_VISIBLE).map((r) => r.name || "Rute").join(", ")}
                >
                  +{overflow} {overflow === 1 ? "mere" : "flere"}
                </button>
              )}
            </>
          );
        })()}

        {/* "Slip her" overlay på tomme dage når en aftale trækkes */}
        {isJobDragActive && emptyDay && canReceiveDrop && (
          <div
            className={cn(
              "flex-1 flex flex-col items-center justify-center gap-1 rounded-md border-2 border-dashed transition-all",
              isOver
                ? "border-accent bg-accent/15 text-accent scale-[1.02]"
                : "border-accent/40 bg-accent/5 text-accent/70",
            )}
          >
            <ArrowDown className={cn("h-4 w-4", isOver && "animate-bounce")} />
            <span className="text-[10px] font-medium leading-tight text-center px-1">
              {isOver
                ? `Opret rute · ${format(date, "EEEE d. MMM", { locale: da })}`
                : "Slip for ny rute"}
            </span>
          </div>
        )}
      </div>
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
    prev.optimizingRouteId === next.optimizingRouteId &&
    prev.loadingRoutes === next.loadingRoutes &&
    prev.loadingWeather === next.loadingWeather &&
    prev.weatherError === next.weatherError &&
    prev.busy === next.busy &&
    prev.busyRouteIds === next.busyRouteIds
  );
});

/* ─── Rute-pille (drag + drop target for aftaler) ─── */
type RoutePillProps = {
  route: CalendarRoute;
  onSelect: () => void;
  onSelectStop: (stop: RouteStop) => void;
  onOptimize: () => void;
  optimizing: boolean;
  compact: boolean;
  jobDragActive?: boolean;
  /** True hvis ruten pt. behandler en flytning — drop deaktiveres + spinner. */
  busy?: boolean;
  /** True hvis rutens dato ligger før i dag — vis dæmpet visuel stil. */
  isPast?: boolean;
};

const RoutePillInner = ({ route, onSelect, onSelectStop, onOptimize, optimizing, compact, jobDragActive, busy, isPast }: RoutePillProps) => {
  const isVirtual = !!route.isVirtual;
  // Drag-handle: hele pillen kan trækkes til ny dato (kun rigtige ruter).
  // Fortids-ruter og projicerede (virtuelle) ruter kan ALDRIG flyttes —
  // det giver ingen mening at re-planlægge noget der allerede er kørt,
  // og en projektion ER ikke en rigtig rute (den lever af basisruten).
  const dragLocked = isVirtual || !!busy || !!isPast;
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

  // Combined ref
  const setRefs = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const stopCount = route.stops.length;
  const completedCount = route.stops.filter((s) => s.status === "completed").length;
  const travelMin = Number(route.total_duration_minutes || 0) || route.stops.reduce((sum, s) => sum + Number(s.travel_time_to_next_min || 0), 0);
  const revenue = route.stops.reduce((sum, s) => sum + Number((s as any).order_amount || 0), 0);
  // I månedsvisning er cellerne smalle (~110px). For at undgå at metadata-
  // rækken wrapper til 3-4 linjer (og dermed gør pillen + hele kalender-
  // rækken unødigt høj) viser vi færre felter og holder dem på én linje.
  const visibleEmployees = route.attachedEmployees.slice(0, compact ? 2 : 3);
  const extraEmployees = route.attachedEmployees.length - visibleEmployees.length;
  // Fjernet: grøn bundkant og "klar til udførelse"-logik efter ønske.

  return (
    <div
      ref={setRefs}
      data-route-drop-route-id={!isVirtual && !isPast ? route.id : undefined}
      data-route-drop-date={!isVirtual && !isPast ? route.route_date : undefined}
      onClick={(e) => { e.stopPropagation(); if (!isDragging) onSelect(); }}
      className={cn(
        "relative rounded-md border-l-[3px] cursor-pointer transition-all overflow-hidden bg-card hover:shadow-sm",
        "border border-border/60",
        isDragging && "opacity-40",
        isVirtual && "border-dashed",
        isPast && "opacity-50 saturate-50 hover:opacity-90",
        // Under drag dæmpes fortids-ruter yderligere — de er ikke gyldige
        // drop-targets (kalender-cellen er disabled), så de skal heller
        // ikke visuelt invitere til drop.
        jobDragActive && isPast && "opacity-25 pointer-events-none",
        // Når en aftale er ved at blive sluppet på pillen — markér tydeligt
        !isVirtual && jobDragActive && !isOver && "ring-1 shadow-sm",
        !isVirtual && isOver && "ring-2 ring-accent shadow-md scale-[1.02]",
        busy && "cursor-wait",
      )}
      style={{
        borderLeftColor: route.color,
        borderLeftWidth: 3,
        ...(!isVirtual && jobDragActive && !isOver
          ? { boxShadow: `0 0 0 1px ${route.color}40, 0 1px 3px ${route.color}20` }
          : {}),
      }}
      title={
        isVirtual
          ? "Projiceret rute — klik åbner basisruten; flytning kræver eksplicit træk af en rigtig rute"
          : isPast
            ? "Tidligere rute — kan ikke flyttes"
            : undefined
      }
      aria-busy={busy || undefined}
    >
      {busy && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70 backdrop-blur-[1px] pointer-events-none">
          <Loader2 className="h-3.5 w-3.5 animate-spin text-accent" />
        </div>
      )}
      <div
        {...(dragLocked ? {} : listeners)}
        {...(dragLocked ? {} : attributes)}
        className={cn(
          "px-2 py-1 flex items-center justify-between gap-1",
          dragLocked ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold truncate text-foreground leading-tight flex items-center gap-1">
            {isVirtual && <Repeat className="h-2.5 w-2.5 shrink-0 text-muted-foreground" />}
            <span className="truncate">{route.name || `Rute (${format(parseISO(route.route_date), "d. MMM", { locale: da })})`}</span>
          </div>
          <div
            className={cn(
              "mt-0.5 flex items-center gap-x-1.5 text-[9px] text-muted-foreground tabular-nums sm:text-[10px] overflow-hidden",
              compact ? "flex-nowrap whitespace-nowrap" : "flex-wrap gap-y-0.5",
            )}
          >
            {stopCount > 0 && <span className="inline-flex items-center gap-0.5 shrink-0"><MapPin className="h-2.5 w-2.5" />{stopCount}</span>}
            {completedCount > 0 && <span className="text-emerald-600 shrink-0">{completedCount}✓</span>}
            {travelMin > 0 && (!compact || revenue <= 0) && (
              <span className="inline-flex items-center gap-0.5 shrink-0"><Clock className="h-2.5 w-2.5" />{fmtRouteMin(travelMin)}</span>
            )}
            {revenue > 0 && (
              <span className="inline-flex items-center gap-0.5 shrink-0">
                <Wallet className="h-2.5 w-2.5 shrink-0" />
                {compact ? fmtRouteKrCompact(revenue) : fmtRouteKr(revenue)}
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
                  className="h-4 w-4 rounded-full object-cover ring-1 ring-background"
                />
              ) : (
                <span
                  key={emp.id}
                  className="inline-block h-4 w-4 rounded-full ring-1 ring-background"
                  style={{ background: emp.color || "#64748b" }}
                  title={emp.name}
                  aria-label={emp.name}
                />
              ),
            )}
            {extraEmployees > 0 && (
              <span className="inline-flex items-center justify-center h-4 min-w-[1rem] px-0.5 rounded-full text-[8px] font-bold ring-1 ring-background bg-muted text-muted-foreground">
                +{extraEmployees}
              </span>
            )}
          </div>
        )}
        {visibleEmployees.length === 0 && route.attachedEmployeeCount === 0 && !compact && (
          <span className="text-[9px] text-muted-foreground italic flex items-center gap-0.5 shrink-0">
            <Users className="h-2.5 w-2.5" />0
          </span>
        )}
        {!isVirtual && stopCount >= 2 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOptimize(); }}
            disabled={optimizing}
            className="shrink-0 h-5 w-5 inline-flex items-center justify-center rounded hover:bg-accent/10 text-muted-foreground hover:text-accent disabled:opacity-50"
            aria-label="Optimér rækkefølge"
            title="Optimér rækkefølge — ændrer kun rækkefølgen, ikke medarbejdere"
          >
            {optimizing
              ? <Loader2 className="h-2.5 w-2.5 animate-spin" />
              : <Sparkles className="h-2.5 w-2.5" />}
          </button>
        )}
      </div>

      {/* Stops vises ikke under rute-pillen — åbn ruten ved at klikke for at se aftaler. */}
    </div>
  );
};

const RoutePill = memo(RoutePillInner, (prev, next) => {
  return (
    prev.route === next.route &&
    prev.optimizing === next.optimizing &&
    prev.compact === next.compact &&
    prev.jobDragActive === next.jobDragActive &&
    prev.busy === next.busy
  );
});