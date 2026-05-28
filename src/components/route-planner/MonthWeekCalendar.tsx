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
import { Loader2, Sparkles, Plus, Users, MapPin, ArrowDown, Repeat, Clock, Wallet, Lock, GitMerge } from "lucide-react";
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
import { memo, useMemo } from "react";
import { useTargetValidation, ringForSeverity, chipBgForSeverity } from "./drag-validation-context";
import RouteContextMenu from "./RouteContextMenu";

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
  capacityByDate?: Map<string, { load_pct: number; minutes_booked: number; minutes_capacity: number }>;
  /** Sæt af rute-ids hvor mindst én tildelt medarbejder mangler den
   *  færdighed et stop kræver. Vises som lille ⚠-ikon på rute-pillen. */
  mismatchedRouteIds?: Set<string>;
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
  if (n >= 10_000) return `${Math.round(n / 1000)}t kr`;
  if (n >= 1_000) return `${(n / 1000).toFixed(1).replace(".", ",")}t kr`;
  return `${Math.round(n)} kr`;
};

export const MonthWeekCalendar = ({
  view, anchorDate, routes, onSelectRoute, onSelectStop,
  onCreateRoute, onOptimizeRoute, onDeleteRoute, onShowHistory, optimizingRouteId, draggingType, draggingRouteId, weatherByDate,
  loadingRoutes, loadingWeather, weatherError, busyTargets, dateAlerts,
  selectedRouteIds, onToggleRouteSelection, capacityByDate, mismatchedRouteIds,
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
    <Card className="overflow-hidden flex flex-col h-full rounded-xl border-border/60 shadow-sm">
      {/* Weekday header */}
      <div
        className="grid border-b border-border/60 bg-gradient-to-b from-secondary/40 to-background shrink-0"
        style={{ gridTemplateColumns: "48px repeat(7, minmax(0, 1fr))" }}
      >
        <div className="border-r border-border/50 p-2 text-[10px] uppercase text-muted-foreground/70 font-semibold tracking-[0.14em] flex items-center justify-center">
          Uge
        </div>
        {weekdayLabels.map((wd, i) => {
          const isWeekend = i >= 5;
          return (
            <div
              key={wd}
              className={cn(
                "p-2 text-[11px] font-semibold tracking-[0.12em] uppercase text-center border-r border-border/50 last:border-r-0",
                isWeekend ? "text-muted-foreground/60" : "text-foreground/70",
              )}
            >
              {wd}
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
              className="grid border-b border-border/50 last:border-b-0"
              style={{ gridTemplateColumns: "48px repeat(7, minmax(0, 1fr))" }}
            >
              {/* Ugenummer */}
              <div className="border-r border-border/50 bg-secondary/15 flex items-start justify-center pt-2.5 text-[11px] font-semibold text-muted-foreground/70 tabular-nums">
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
  capacity?: { load_pct: number; minutes_booked: number; minutes_capacity: number } | null;
  /** Sæt af rute-ids der har skill-mismatch — videresendes til RoutePill. */
  mismatchedRouteIds?: Set<string>;
};

const DayCellInner = ({
  date, dateStr, routes, inMonth, today,
  onSelectRoute, onSelectStop, onCreateRoute, onOptimizeRoute, onDeleteRoute, onShowHistory, optimizingRouteId, compact, draggingType, draggingRouteId, weather,
  loadingRoutes, loadingWeather, weatherError, busy, busyRouteIds, alert,
  selectedRouteIds, onToggleRouteSelection, capacity, mismatchedRouteIds,
}: DayCellProps) => {
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
      className={cn(
        "border-r border-border/50 last:border-r-0 relative group flex flex-col gap-1 p-1.5 transition-all duration-200",
        compact ? "min-h-[110px]" : "min-h-[160px]",
        !inMonth && "bg-secondary/10",
        inMonth && isWeekend && !isPast && "bg-secondary/[0.06]",
        isPast && "bg-muted/15",
        inMonth && !isPast && !isDragActive && "hover:bg-secondary/20",
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
      {/* Stiplet "slip her" placeholder i bunden af cellen viser præcis
          hvor aftalen/ruten lander — gør drop-targettet håndgribeligt
          uden at flytte eksisterende indhold. */}
      {isOver && canReceiveDrop && !validation && emptyDay && (
        <div
          aria-hidden
          className="absolute inset-x-1.5 bottom-1.5 z-10 pointer-events-none h-7 rounded-lg border-2 border-dashed border-accent/80 bg-accent/15 flex items-center justify-center gap-1 animate-in fade-in zoom-in-95 duration-200 shadow-[0_2px_8px_-2px_hsl(var(--accent)/0.4)]"
        >
          <ArrowDown className="h-3 w-3 text-accent animate-bounce" />
          <span className="text-[10px] font-bold text-accent uppercase tracking-wider">Slip her</span>
        </div>
      )}
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
      <div className="flex items-center justify-between mb-0.5">
        <div className="flex items-center gap-1">
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full text-[12px] font-semibold tabular-nums transition-all duration-200",
              today
                ? "h-6 w-6 bg-accent text-accent-foreground shadow-[0_2px_8px_-2px_hsl(var(--accent)/0.55)]"
                : "h-6 w-6 text-foreground/85 group-hover:bg-secondary/70",
              !inMonth && !today && "text-muted-foreground/50",
              isPast && !today && "text-muted-foreground/60",
            )}
          >
            {format(date, "d")}
          </span>
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
            // Tomme dage i indeværende måned får en let synlig prik så
            // brugeren ved at cellen er klikbar. Travle dage / fortid /
            // udenfor-måned holder vi diskrete (kun ved hover).
            className={cn(
              "h-6 w-6 inline-flex items-center justify-center rounded-md transition-all focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-1 hover:bg-accent hover:text-accent-foreground",
              emptyDay && inMonth && !isPast
                ? "opacity-40 text-muted-foreground group-hover:opacity-100"
                : "opacity-0 group-hover:opacity-100 text-muted-foreground",
            )}
            aria-label={`Opret rute den ${format(date, "d. MMMM", { locale: da })}`}
            title="Opret tom rute denne dag"
          >
            <Plus className="h-3.5 w-3.5" />
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
                />
              ))}
              {overflow > 0 && (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onSelectRoute(routes[MAX_VISIBLE]); }}
                  className="inline-flex items-center gap-1 self-start text-[11px] font-semibold text-foreground bg-secondary/70 hover:bg-secondary rounded-md px-2 py-1 transition-colors focus-visible:ring-2 focus-visible:ring-accent focus-visible:outline-none"
                  aria-label={`Vis ${overflow} flere ruter`}
                  title={routes.slice(MAX_VISIBLE).map((r) => r.name || "Rute").join(", ")}
                >
                  <span className="text-[10px] opacity-60">+</span>
                  {overflow} {overflow === 1 ? "rute mere" : "ruter mere"}
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
      {capacity && capacity.minutes_capacity > 0 && inMonth && !isPast && (
        <div
          className="absolute bottom-0 left-0 right-0 h-1 bg-muted/40 overflow-hidden group/cap"
          title={`Belastning: ${Math.round(capacity.load_pct)}% — ${Math.round(capacity.minutes_booked / 60 * 10) / 10} af ${Math.round(capacity.minutes_capacity / 60)} timer booket`}
          aria-label={`Dagens belastning: ${Math.round(capacity.load_pct)} procent`}
        >
          <div
            className={cn(
              "h-full transition-all duration-500 rounded-r-full",
              capacity.load_pct >= 100
                ? "bg-destructive shadow-[0_0_6px_hsl(var(--destructive)/0.5)]"
                : capacity.load_pct >= 70
                ? "bg-amber-500"
                : "bg-emerald-500/80",
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
    prev.capacity?.minutes_capacity === next.capacity?.minutes_capacity &&
    prev.mismatchedRouteIds === next.mismatchedRouteIds
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
};

const RoutePillInner = ({
  route, onSelect, onSelectStop, onOptimize, onDelete, onShowHistory, optimizing, compact, jobDragActive, routeDragSourceId,
  busy, isPast, selected, anySelected, onToggleSelect, hasSkillMismatch,
}: RoutePillProps) => {
  const isVirtual = !!route.isVirtual;
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
  const travelMin = Number(route.total_duration_minutes || 0) || route.stops.reduce((sum, s) => sum + Number(s.travel_time_to_next_min || 0), 0);
  const revenue = route.stops.reduce((sum, s) => sum + Number((s as any).order_amount || 0), 0);
  // Kapacitets-bjælke pr. rute: arbejdstid (stop + transport) vs. ~8t pr.
  // tildelt medarbejder. Hurtig visuel indikator for overload uden ekstra
  // server-rundtur — bruger felter vi allerede har.
  const workMin = route.stops.reduce(
    (sum, s) => sum + Math.max(Number((s as any).duration_minutes || 30), 0),
    0,
  ) + (travelMin || 0);
  const empCount = Math.max(route.attachedEmployees.length || route.attachedEmployeeCount || 0, 1);
  const capacityMin = empCount * 480; // 8 timer pr. medarbejder
  const loadPct = workMin > 0 ? Math.min(150, Math.round((workMin / capacityMin) * 100)) : 0;
  const loadColor =
    loadPct >= 100 ? "bg-destructive"
      : loadPct >= 85 ? "bg-amber-500"
        : "bg-accent/70";
  // I månedsvisning er cellerne smalle (~110px). For at undgå at metadata-
  // rækken wrapper til 3-4 linjer (og dermed gør pillen + hele kalender-
  // rækken unødigt høj) viser vi færre felter og holder dem på én linje.
  const visibleEmployees = route.attachedEmployees.slice(0, compact ? 2 : 3);
  const extraEmployees = route.attachedEmployees.length - visibleEmployees.length;
  // Fjernet: grøn bundkant og "klar til udførelse"-logik efter ønske.

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
        "relative rounded-lg border-l-[3px] cursor-pointer overflow-hidden bg-card",
        "border border-border/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-200 ease-out hover:-translate-y-[1px] hover:shadow-[0_4px_12px_-3px_rgba(0,0,0,0.12)] hover:border-border",
        isDragging && "opacity-40",
        isVirtual && "border-dashed",
        isPast && "opacity-50 saturate-50 hover:opacity-90",
        // Under drag dæmpes fortids-ruter yderligere — de er ikke gyldige
        // drop-targets (kalender-cellen er disabled), så de skal heller
        // ikke visuelt invitere til drop.
        jobDragActive && isPast && "opacity-25 pointer-events-none",
        // Når en aftale er ved at blive sluppet på pillen — markér tydeligt
        !isVirtual && jobDragActive && !isOver && "ring-1 shadow-sm",
        !isVirtual && isOver && !validation && "ring-2 ring-accent shadow-[0_6px_16px_-4px_hsl(var(--accent)/0.45)]",
        !isVirtual && isOver && validation && cn(ringForSeverity(validation.severity), "shadow-[0_6px_16px_-4px_rgba(0,0,0,0.18)]"),
        // Når en ANDEN rute faktisk hovrer over denne pille, er det et merge.
        // Vi markerer derfor KUN ved reel hover, så en dato med en eksisterende
        // rute ikke fejlagtigt ligner et merge-target i sig selv.
        isMergeTarget && isOver && "ring-2 ring-accent shadow-[0_8px_20px_-4px_hsl(var(--accent)/0.5)] bg-accent/5",
        // Hvis denne pille selv er kilde i en rute-drag: dæmp + crosshatch-look
        routeDragSourceId === route.id && "opacity-50",
        // Hvis denne pille IKKE er et gyldigt flette-mål under route-drag (fx projiceret/fortid),
        // dæmp den så brugeren ikke prøver at slippe.
        routeDragSourceId && !isMergeTarget && routeDragSourceId !== route.id && "opacity-40 pointer-events-none",
        busy && "cursor-wait",
        // Multi-select visuelt — tydelig accent-ring på valgte piller, og
        // svag dæmpning på ikke-valgte piller mens man er i valg-tilstand,
        // så valget altid er let at scanne i en travl kalender.
        selected && "ring-2 ring-accent ring-offset-1 ring-offset-card shadow-[0_4px_12px_-3px_hsl(var(--accent)/0.35)]",
        anySelected && !selected && !isVirtual && !isPast && "opacity-70 hover:opacity-100",
        anySelected && (isVirtual || isPast) && "opacity-30",
      )}
      style={{
        borderLeftColor: route.color,
        borderLeftWidth: 3,
        ...(!isVirtual && jobDragActive && !isOver
          ? { boxShadow: `0 0 0 1px ${route.color}40, 0 1px 3px ${route.color}20` }
          : {}),
      }}
      title={
        validation?.topMessage
          ? validation.topMessage
          : isVirtual
          ? "Projiceret rute — klik åbner basisruten. Træk til en anden dato for at flytte netop denne ene forekomst (basisruten røres ikke)."
          : isPast
            ? "Tidligere rute — kan ikke flyttes"
            : undefined
      }
      aria-busy={busy || undefined}
    >
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
          "px-2 py-1 flex items-center justify-between gap-1",
          dragLocked ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
        )}
      >
        <div className="min-w-0 flex-1">
          <div className="text-[12px] font-semibold truncate text-foreground leading-tight flex items-center gap-1">
            {isVirtual && (
              <span
                className="inline-flex items-center gap-0.5 rounded-sm bg-muted px-1 py-px text-[9px] font-bold uppercase tracking-wide text-muted-foreground shrink-0"
                title="Projiceret rute — låst forekomst af en gentagende basisrute"
              >
                <Lock className="h-2 w-2" />
                Projiceret
              </span>
            )}
            <span className="truncate">{route.name || `Rute (${format(parseISO(route.route_date), "d. MMM", { locale: da })})`}</span>
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
              "mt-0.5 flex items-center gap-x-2 text-[11px] text-muted-foreground tabular-nums overflow-hidden",
              compact ? "flex-nowrap whitespace-nowrap" : "flex-wrap gap-y-0.5",
            )}
          >
            {stopCount > 0 && (
              <span className="inline-flex items-center gap-0.5 shrink-0">
                <MapPin className="h-3 w-3" />
                <span>
                  {completedCount > 0 && (
                    <span className="text-emerald-600 font-semibold">{completedCount}/</span>
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
                  className="h-5 w-5 rounded-full object-cover ring-1 ring-background"
                />
              ) : (
                <span
                  key={emp.id}
                  className="inline-block h-5 w-5 rounded-full ring-1 ring-background"
                  style={{ background: emp.color || "#64748b" }}
                  title={emp.name}
                  aria-label={emp.name}
                />
              ),
            )}
            {extraEmployees > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[1.25rem] px-0.5 rounded-full text-[9px] font-bold ring-1 ring-background bg-muted text-muted-foreground">
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
        {!isVirtual && stopCount >= 2 && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onOptimize(); }}
            disabled={optimizing}
            className="shrink-0 h-6 w-6 inline-flex items-center justify-center rounded hover:bg-accent/10 text-muted-foreground hover:text-accent disabled:opacity-50 transition-colors"
            aria-label="Optimér rækkefølge"
            title="Optimér rækkefølge — ændrer kun rækkefølgen, ikke medarbejdere"
          >
            {optimizing
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : <Sparkles className="h-3 w-3" />}
          </button>
        )}
      </div>

      {/* Kapacitets-bar: tynd stribe der viser belastning. Skjul ved 0 stops. */}
      {stopCount > 0 && (
        <div
          className="h-[3px] w-full bg-muted/40 overflow-hidden"
          title={`Belastning ${loadPct}% — ${Math.round(workMin / 60 * 10) / 10} t af ~${Math.round(capacityMin / 60)} t (${empCount} medarbejder${empCount === 1 ? "" : "e"})`}
          aria-label={`Belastning ${loadPct} procent`}
        >
          <div
            className={cn("h-full transition-all duration-500 rounded-r-full", loadColor)}
            style={{ width: `${Math.min(100, loadPct)}%` }}
          />
        </div>
      )}
      {/* Stops vises ikke under rute-pillen — åbn ruten ved at klikke for at se aftaler. */}
    </div>
  );

  const canDelete = !!onDelete && !isVirtual && !busy;
  const canOptimize = !isVirtual && stopCount >= 2 && !busy;
  const canHistory = !!onShowHistory && !isVirtual;

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
    prev.hasSkillMismatch === next.hasSkillMismatch
  );
});