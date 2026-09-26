import { formatPrice } from "@/lib/price-format";
// RouteEditSheet — rediger en rute: navn, farve, dato, medarbejdere.
// Bruges fra den nye måned/uge kalender.

import { useEffect, useMemo, useRef, useState, lazy, Suspense } from "react";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Loader2, Sparkles, Trash2, Check, CalendarRange, History, Award, Lock, RotateCcw, CheckCircle2, MapPinned } from "lucide-react";
import { Palette, CalendarDays, Pencil } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { toast } from "sonner";
import { toastRouteError } from "@/lib/route-errors";
import { cn, readableTextOn } from "@/lib/utils";
import {
  useDeleteRoute, useOptimizeRoute, useDirections,
  useRouteSeriesInfo, useMoveRouteSeries, useMoveProjectedOccurrence,
  useUpdateRouteSeriesAppearance,
  type Route, type RouteStop,
} from "@/hooks/useRoutes";
import { useReopenRoute } from "@/hooks/useRoutes";
import { Wallet } from "lucide-react";
import { DatePickerField } from "./DatePickerField";
import { Section, Field, SheetHeaderBlock, SheetFooterBar } from "./SheetSection";
import { MoveRouteDateDialog, type MoveRouteScope } from "./MoveRouteDateDialog";
import { MoveProjectedOccurrenceDialog } from "./MoveProjectedOccurrenceDialog";
import { MoveStopsDialog } from "./MoveStopsDialog";
const RouteHistoryDialog = lazy(() => import("./RouteHistoryDialog"));
import { RouteOccurrenceTimeline } from "./RouteOccurrenceTimeline";
import { SeriesScopeDialog, type SeriesScope } from "./SeriesScopeDialog";
import { logRouteAudit } from "@/lib/route-audit";
import { pushRouteUndo } from "@/lib/route-history";
import { toastSuccessWithUndo } from "@/lib/toast-undo";
import { useSeriesImpact } from "@/hooks/useSeriesImpact";
import { useDayConflicts } from "@/hooks/useDayConflicts";
import { Ban } from "lucide-react";
import { useCreateRouteSnapshot, useRouteSnapshots } from "@/hooks/useRouteSnapshots";
import { Camera, ChevronDown, Unlock } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { formatDistanceToNow } from "date-fns";
import { RouteCommunicationPanel } from "./RouteCommunicationPanel";
import { RouteLivePositionDialog } from "./RouteLivePositionDialog";
import { useRouteLivePositions } from "@/hooks/useRouteLivePositions";

export type RouteEmployeeOption = {
  id: string;
  name: string;
  avatar_url?: string | null;
  color?: string | null;
  email?: string | null;
  is_active?: boolean | null;
};

/**
 * Toggle pr. rute: tillad medarbejdere at udføre ruten FØR den faktiske dato
 * (eller efter). Tre-lags resolver i `src/lib/early-completion.ts` lader
 * også virksomhedens default eller medarbejderens egen indstilling slå
 * igennem — denne switch er den mest specifikke override.
 */
const RouteEarlyCompletionToggle = ({ route }: { route: Route }) => {
  const qc = useQueryClient();
  const [pending, setPending] = useState(false);
  const enabled = !!(route as any).allow_early_completion;
  const onToggle = async (next: boolean) => {
    setPending(true);
    try {
      const { error } = await supabase
        .from("routes")
        .update({ allow_early_completion: next } as any)
        .eq("id", route.id);
      if (error) throw error;
      await supabase
        .from("routes")
        .update({ allow_early_completion: next } as any)
        .eq("base_route_id", route.id);
      toast.success(next ? "Ruten kan nu udføres på forhånd" : "Ruten følger igen den planlagte dato");
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["routes-range"] });
      qc.invalidateQueries({ queryKey: ["route-calendar"] });
      qc.invalidateQueries({ queryKey: ["my-day-routes"] });
      qc.invalidateQueries({ queryKey: ["my-day-stops"] });
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke opdatere ruten");
    } finally {
      setPending(false);
    }
  };
  return (
    <div className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
      <div className="flex min-w-0 items-start gap-2.5">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-secondary text-foreground">
          <Unlock className="h-3.5 w-3.5" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-foreground">Tillad tidlig udførelse</p>
          <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
            Lås ruten op, så medarbejderen kan starte og afslutte den på en anden dag end den planlagte.
          </p>
        </div>
      </div>
      <Switch checked={enabled} onCheckedChange={onToggle} disabled={pending} />
    </div>
  );
};


type Props = {
  route: Route | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stopCount: number;
  /** Stops på ruten — bruges til at beregne live ETA for hele ruten. */
  stops?: RouteStop[];
  employees?: RouteEmployeeOption[];
  /**
   * Auto-genereret visningsnavn (fx "Wilhelm · Aarhus" eller "Kørsel 1").
   * Bruges til at pre-udfylde navne-inputtet med det navn brugeren ser på
   * kalender-pillen, så de kan redigere det direkte. Det auto-genererede
   * navn gemmes IKKE i databasen — kun ægte ændringer skrives ned.
   */
  autoGeneratedName?: string | null;
  /**
   * Når sheet'et åbnes for en projiceret (virtuel) forekomst af en
   * basis-rute. Vi skjuler destruktive/optimerings-knapper i footeren
   * fordi handlingerne giver mening på basis-ruten, ikke på en
   * fremtidig projektion.
   */
  isProjection?: boolean;
  /**
   * Når sheet'et er åbnet for en projiceret forekomst — datoen for netop
   * den forekomst (ikke basisrutens dato). Bruges som "fra"-dato hvis
   * brugeren vælger at flytte denne ene projicerede forekomst.
   */
  projectedDate?: string | null;
  /**
   * Kaldes hver gang brugeren vælger en ny farve i picker'en — før den
   * optimistiske mutation når at propagere. Bruges af forælderen til at
   * spejle farven i sideløbende paneler (fx RouteStopsPanel), så hele
   * UI'et skifter farve samtidig og ikke "halter" bagefter.
   */
  onColorPreview?: (color: string) => void;
  onNamePreview?: (name: string | null) => void;
  /**
   * Valider om en flytning til `newDate` er tilladt — samme logik som drag-drop
   * i kalenderen. Returnér `null` hvis ok, ellers et fejl-objekt der vises som
   * toast. Forælderen kender alle ruter (faktiske + projicerede) og kan
   * derfor se serie-kollisioner som denne komponent ikke har data til.
   */
  validateMoveTo?: (args: {
    routeId: string;
    baseRouteId: string | null;
    isProjection: boolean;
    newDate: string;
  }) => { message: string; description?: string } | null;
};

/** Navngivne farver — bruges i picker, til tooltips og demo-data. */
export const ROUTE_COLORS = [
  { name: "Teal",     value: "#14b8a6" },
  { name: "Blå",      value: "#3b82f6" },
  { name: "Indigo",   value: "#6366f1" },
  { name: "Violet",   value: "#8b5cf6" },
  { name: "Pink",     value: "#ec4899" },
  { name: "Rød",      value: "#ef4444" },
  { name: "Orange",   value: "#f97316" },
  { name: "Amber",    value: "#f59e0b" },
  { name: "Emerald",  value: "#10b981" },
  { name: "Cyan",     value: "#06b6d4" },
  { name: "Slate",    value: "#64748b" },
  { name: "Fuchsia",  value: "#d946ef" },
  // Udvidet palet — mørkere/lyse varianter for flere ruter
  { name: "Lime",         value: "#84cc16" },
  { name: "Grøn",         value: "#22c55e" },
  { name: "Sky",          value: "#0ea5e9" },
  { name: "Rose",         value: "#f43f5e" },
  { name: "Mørk blå",     value: "#015c96" },
  { name: "Mørk blå",     value: "#1d4ed8" },
  { name: "Mørk lilla",   value: "#7c3aed" },
  { name: "Mørk grøn",    value: "#15803d" },
  { name: "Mørk rød",     value: "#b91c1c" },
  { name: "Mørk orange",  value: "#c2410c" },
  { name: "Stone",        value: "#78716c" },
  { name: "Zinc",         value: "#52525b" },
] as const;

/** Bagudkompatibel farve-array (kun hex-værdier). */
export const ROUTE_COLOR_PALETTE = ROUTE_COLORS.map((c) => c.value);

/** Find første farve der ikke er i `usedColors` — eller en tilfældig hvis alle er brugt. */
export const pickAvailableColor = (usedColors: string[]): string => {
  const used = new Set(usedColors);
  const free = ROUTE_COLORS.find((c) => !used.has(c.value));
  if (free) return free.value;
  return ROUTE_COLORS[Math.floor(Math.random() * ROUTE_COLORS.length)].value;
};

/** Datobaseret fallback-navn, fx "Rute (16. sep)". Bruges når hverken
 *  brugeren eller auto-navngivningen har givet ruten et navn. */
const defaultDateName = (dateStr: string | null | undefined): string => {
  if (!dateStr) return "Rute";
  try {
    return `Rute (${format(parseISO(dateStr), "d. MMM", { locale: da })})`;
  } catch {
    return "Rute";
  }
};

const isRouteEditPortalTarget = (target: EventTarget | null) => {
  if (!(target instanceof Element)) return false;
  return !!target.closest(
    '[data-radix-popper-content-wrapper],[data-radix-portal],[role="menu"],[role="listbox"],[role="dialog"],[role="alertdialog"],[role="tooltip"],[data-sonner-toaster]',
  );
};

const clearStaleRadixPointerLock = () => {
  if (typeof window === "undefined" || typeof document === "undefined") return;
  const clear = () => {
    if (document.body.style.pointerEvents === "none") {
      document.body.style.removeProperty("pointer-events");
    }
  };
  window.setTimeout(clear, 0);
  window.setTimeout(clear, 120);
  window.setTimeout(clear, 360);
};

export const RouteEditSheet = ({
  route, open, onOpenChange, stopCount, stops = [], autoGeneratedName = null,
  employees = [],
  isProjection = false, projectedDate = null, onColorPreview, onNamePreview,
  validateMoveTo,
}: Props) => {
  const isCompact = useIsBelowBreakpoint(1024);
  const todayIso = format(new Date(), "yyyy-MM-dd");
  const effectiveRouteDate = isProjection && projectedDate ? projectedDate : route?.route_date;
  const isPast = !!effectiveRouteDate && effectiveRouteDate < todayIso;
  const [name, setName] = useState("");
  const [color, setColor] = useState<string>(ROUTE_COLOR_PALETTE[0]);
  const [date, setDate] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [liveMapOpen, setLiveMapOpen] = useState(false);
  const { data: livePositions = [] } = useRouteLivePositions(!isProjection ? route?.id : null);
  // Pending date-flytning — hvis ruten er del af en serie spørger vi
  // brugeren om kun denne ene eller alle fremtidige skal flyttes.
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  // Pending projected-date flytning — bekræftelses-dialog for at flytte
  // én projiceret fremtidig forekomst uden at røre basisruten.
  const [pendingProjectedDate, setPendingProjectedDate] = useState<string | null>(null);
  const [projectedMoveSyncStart, setProjectedMoveSyncStart] = useState(false);
  const [projectedMoveSyncNext, setProjectedMoveSyncNext] = useState(false);
  const [moveStopsOpen, setMoveStopsOpen] = useState(false);
  // Aflys-denne-forekomst dialog for projicerede ruter — opretter
  // `agreement_occurrence_overrides` med status="cancelled" så projektionen
  // skjuler forekomsten uden at røre basis-aftalen.
  const [cancelOccurrenceOpen, setCancelOccurrenceOpen] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);
  // Find første aftale-id på ruten — bruges til at vise konsekvens-tal i
  // "Aflys forekomst"-dialogen (alle stops på en projiceret rute deler typisk
  // samme cadence, så ét aftale-id giver et repræsentativt estimat).
  const cancelImpactAgreementId = useMemo<string | null>(() => {
    for (const s of stops) {
      const aid = (s as any).agreement_id as string | null | undefined;
      if (aid) return aid;
    }
    return null;
  }, [stops]);
  const { data: cancelImpact } = useSeriesImpact({
    agreementId: cancelImpactAgreementId,
    fromDate: route?.route_date ?? null,
    enabled: cancelOccurrenceOpen,
  });
  // Konflikter på *mål-datoen* for et flyt — bruges som advarsel i
  // MoveRouteDateDialog. Konflikter på *kilde-datoen* bruges i
  // "Aflys forekomst"-dialogen, så brugeren kan se hvilke andre stops
  // der ligger samme dag (måske skal de også flyttes).
  const { conflicts: moveTargetConflicts } = useDayConflicts(
    route?.business_id,
    pendingDate || undefined,
  );
  const { conflicts: sourceDayConflicts } = useDayConflicts(
    route?.business_id,
    cancelOccurrenceOpen ? route?.route_date : undefined,
  );
  const moveConflictWarnings = useMemo<string[]>(() => {
    return moveTargetConflicts
      .filter((c) => c.stops.length >= 2)
      .map((c) => {
        const names = Array.from(new Set(c.stops.map((s) => s.label).filter(Boolean))).slice(0, 3).join(", ");
        const overlap = c.overlapsTime ? " (tidsoverlap)" : "";
        return `Medarbejder har allerede ${c.stops.length} stops denne dag${overlap}${names ? `: ${names}` : ""}.`;
      });
  }, [moveTargetConflicts]);
  const { conflicts: projectedMoveTargetConflicts } = useDayConflicts(
    route?.business_id,
    pendingProjectedDate || undefined,
  );
  const projectedMoveConflictWarnings = useMemo<string[]>(() => {
    return projectedMoveTargetConflicts
      .filter((c) => c.stops.length >= 2)
      .map((c) => {
        const names = Array.from(new Set(c.stops.map((s) => s.label).filter(Boolean))).slice(0, 3).join(", ");
        const overlap = c.overlapsTime ? " (tidsoverlap)" : "";
        return `Medarbejder har allerede ${c.stops.length} stops denne dag${overlap}${names ? `: ${names}` : ""}.`;
      });
  }, [projectedMoveTargetConflicts]);
  // Simpel foreslået fri dato: hvis mål-datoen har konflikter, prøv ±1, ±2 …
  // Vi kan ikke nemt se medarbejder-konflikter på andre datoer uden flere
  // queries, så vi bumper bare datoen og lader brugeren se en advarsel
  // hvis den nye dato også har problemer.
  const projectedMoveSuggestedDate = useMemo<string | null>(() => {
    if (!pendingProjectedDate) return null;
    if (projectedMoveConflictWarnings.length === 0) return null;
    try {
      const base = new Date(pendingProjectedDate);
      const next = new Date(base.getTime() + 86400000);
      return next.toISOString().slice(0, 10);
    } catch { return null; }
  }, [pendingProjectedDate, projectedMoveConflictWarnings.length]);
  const cancelConflictWarnings = useMemo<string[]>(() => {
    return sourceDayConflicts
      .filter((c) => c.stops.length >= 2 && c.overlapsTime)
      .map((c) => `${c.stops.length} overlappende stops samme dag — tjek om de andre også skal aflyses.`);
  }, [sourceDayConflicts]);
  // Sporer om brugeren *aktivt* har ændret navn/farve i denne session af
  // sheet'et. Vi bruger den til at undgå at autosave skriver stale lokal
  // state tilbage til serveren når route-data refetches udefra (fx efter
  // series-move, projection refresh, osv.). Uden dette flag vil enhver
  // diff mellem lokal `name` og opdateret `route.name` trigge en autosave
  // og "fortryde" serverens ændring — hvilket giver oplevelsen af at
  // navnet hopper tilbage.
  const userEditedRef = useRef(false);
  // Snapshot af det auto-genererede navn da sheet'et blev åbnet for denne
  // rute. Bruges UDELUKKENDE til at afgøre om brugerens nuværende input
  // svarer til det auto-genererede navn (= skal gemmes som null så
  // auto-navngivningen forbliver dynamisk). Vi må ALDRIG sammenligne med
  // det live `autoGeneratedName` prop, fordi det ændrer sig hver gang
  // rutens navn opdateres i cachen — og det skaber en feedback-løkke der
  // skriver brugerens netop-gemte navn tilbage til null.
  const initialAutoNameRef = useRef<string>("");
  // Holder seneste payload klar til en synkron flush når sheet'et lukkes
  // før debounce-timeren har fået lov at fyre. Uden dette ville hurtige
  // edits efterfulgt af et "klik udenfor"/luk gå tabt.
  const pendingFlushRef = useRef<{ id: string; name?: string | null; color?: string } | null>(null);
  // Når datovælgeren åbner en portal-dialog oven på edit-sheet'et, må sheet'et
  // ikke tolke fokus/klik i dialogen som et outside-click og lukke sig selv.
  // Det var årsagen til at Radix kunne efterlade body med pointer-events: none.
  const nestedOverlayOpenRef = useRef(false);

  // Navn/farve skal altid slå igennem på hele serien (basisrute + alle
  // materialiserede børn + projicerede ruter). useUpdateRouteSeriesAppearance
  // skriver til basisruten OG nulstiller overrides på børnene, så alle
  // instanser pludselig viser den samme nye farve/navn.
  const updateAppearance = useUpdateRouteSeriesAppearance();
  const deleteRoute = useDeleteRoute();
  const optimize = useOptimizeRoute();
  const moveRouteSeries = useMoveRouteSeries();
  const moveProjected = useMoveProjectedOccurrence();
  const reopenRoute = useReopenRoute();
  const { data: seriesInfo } = useRouteSeriesInfo(route?.id ?? null, route?.route_date ?? null);
  const qc = useQueryClient();

  // Henter navnene på alle andre aktive ruter samme dag i samme virksomhed,
  // så vi kan blokere brugeren i at omdøbe denne rute til et navn der allerede
  // er taget. Database-indekset er den hårde garanti — det her er den venlige
  // UX der fanger fejlen FØR den når serveren.
  const sameDayNamesQ = useQuery({
    queryKey: ["route-names-same-day", route?.business_id, route?.route_date, route?.id],
    enabled: !!route?.business_id && !!route?.route_date,
    staleTime: 15_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("id, name")
        .eq("business_id", route!.business_id)
        .eq("route_date", route!.route_date)
        .is("archived_at", null)
        .is("deleted_at", null)
        .neq("id", route!.id);
      if (error) throw error;
      return (data || [])
        .map((r: any) => (r.name ? String(r.name).trim().toLowerCase() : ""))
        .filter(Boolean);
    },
  });
  const sameDayNameSet = useMemo(
    () => new Set(sameDayNamesQ.data ?? []),
    [sameDayNamesQ.data],
  );
  const nameDuplicate = useMemo(() => {
    const t = name.trim().toLowerCase();
    if (!t) return false;
    return sameDayNameSet.has(t);
  }, [name, sameDayNameSet]);

  useEffect(() => {
    if (!pendingProjectedDate) {
      setProjectedMoveSyncStart(false);
      setProjectedMoveSyncNext(false);
      return;
    }
    // Smart sync-default: ud fra seriens dominerende interval — store flytninger
    // sætter "forskyd hele rytmen", små flytninger sætter "kun næste besøg".
    const intv = (seriesInfo as any)?.dominantIntervalDays as number | null | undefined;
    const fromIso = projectedDate || "";
    if (!intv || intv <= 0 || !fromIso) {
      setProjectedMoveSyncStart(false);
      setProjectedMoveSyncNext(true);
      return;
    }
    let delta = 0;
    try {
      delta = Math.abs(
        Math.round((new Date(pendingProjectedDate).getTime() - new Date(fromIso).getTime()) / 86400000),
      );
    } catch {}
    if (delta >= intv) {
      setProjectedMoveSyncStart(true);
      setProjectedMoveSyncNext(false);
    } else {
      setProjectedMoveSyncStart(false);
      setProjectedMoveSyncNext(true);
    }
  }, [pendingProjectedDate, projectedDate, (seriesInfo as any)?.dominantIntervalDays]);

  useEffect(() => {
    if (!route) return;
    setName(route.name || autoGeneratedName || defaultDateName(route.route_date));
    setColor(route.color || ROUTE_COLOR_PALETTE[0]);
    // Når sheet'et er åbnet for en projiceret forekomst, viser vi datoen
    // for selve forekomsten — ikke basisrutens dato.
    setDate(isProjection && projectedDate ? projectedDate : route.route_date);
    userEditedRef.current = false;
    pendingFlushRef.current = null;
    initialAutoNameRef.current = (autoGeneratedName || defaultDateName(route.route_date)).trim();
  }, [route?.id, isProjection, projectedDate]);

  // Hvis serveren opdaterer route.name eller color (fx fra en anden klient
  // eller en bagudgående mutation) MENS brugeren ikke selv har redigeret,
  // skal vores lokale state følge med — ellers ville næste keystroke/klik
  // skrive den stale værdi tilbage.
  useEffect(() => {
    if (!route || userEditedRef.current) return;
    if (pendingFlushRef.current) return;
    setName(route.name || autoGeneratedName || defaultDateName(route.route_date));
    setColor(route.color || ROUTE_COLOR_PALETTE[0]);
  }, [route?.name, route?.color, autoGeneratedName]);

  // Beregn waypoints for hele ruten — start (hvis sat) + alle stop i rækkefølge.
  const waypoints = useMemo(() => {
    if (!route || stops.length < 1) return null;
    const sorted = [...stops]
      .filter((s) => s.latitude != null && s.longitude != null)
      .sort((a, b) => a.sequence - b.sequence)
      .map((s) => ({ lat: Number(s.latitude), lng: Number(s.longitude) }));
    if (route.start_latitude != null && route.start_longitude != null) {
      sorted.unshift({ lat: Number(route.start_latitude), lng: Number(route.start_longitude) });
    }
    return sorted.length >= 2 ? sorted : null;
  }, [route, stops]);


  // Estimeret omsætning = sum af aftalens beløb pr. stop.
  const estimatedRevenue = useMemo(
    () => stops.reduce((sum, s) => sum + Number((s as any).order_amount || 0), 0),
    [stops],
  );

  // Hvad skal sendes til serveren?
  //
  // Reglen: vi rører KUN ved navnet hvis brugeren faktisk har ændret det
  // i forhold til det navn der ligger i DB (route.name). Det forhindrer
  // den klassiske bug hvor et farveskift ved et uheld nuller et manuelt
  // navn — fordi det viste navn tilfældigvis matcher auto-fallback'et.
  //
  // - Hvis input er tomt → nuller navnet (eksplicit "ryd navn").
  // - Hvis input matcher det aktuelle DB-navn → udelades helt fra payload.
  // - Hvis input matcher det auto-genererede fallback OG der intet
  //   eksplicit DB-navn er → behold null (auto-navngivningen forbliver
  //   dynamisk).
  // - Ellers → send det nye navn.
  const trimmedName = name.trim();
  const persistedName = (route?.name ?? "").trim();

  let nameChange: { changed: true; value: string | null } | { changed: false } = { changed: false };
  if (trimmedName !== persistedName) {
    if (!trimmedName) {
      nameChange = { changed: true, value: null };
    } else if (!persistedName && trimmedName === initialAutoNameRef.current) {
      // Input står på fallback-navnet og DB var allerede null — ingen ændring.
      nameChange = { changed: false };
    } else {
      nameChange = { changed: true, value: trimmedName };
    }
  }
  const colorChanged = route?.color !== color;
  const dirty = nameChange.changed || colorChanged;
  // Hvis brugeren har skrevet et navn der allerede findes på en anden rute
  // samme dag, må vi ikke autosave navnet — så vi skipper hele autosaven
  // mens duplikatet står. Farve-ændringer er stadig OK.
  const blockNameSave = nameChange.changed && nameChange.value !== null && nameDuplicate;

  const pendingPayload = useMemo(() => {
    const payload: { id: string; name?: string | null; color?: string } = {
      id: route?.id ?? "",
    };
    if (nameChange.changed && !blockNameSave) payload.name = nameChange.value;
    if (colorChanged) payload.color = color;
    return payload;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route?.id, nameChange.changed, (nameChange as any).value, colorChanged, color, blockNameSave]);

  useEffect(() => {
    if (!route || !open || !dirty) return;
    // Hvis navne-ændringen er en dublet og der ikke er andre ændringer at
    // gemme, så stop her — undgå unødvendige mutations som alligevel ville
    // blive afvist af databasen.
    if (blockNameSave && !colorChanged) return;
    // Skip autosave hvis brugeren ikke selv har ændret noget — så undgår
    // vi at overskrive server-opdateringer der kom ind mens sheet'et var
    // åbent.
    if (!userEditedRef.current) return;

    // Debounce: kort for navn (skrivning), nul for farve (diskret klik).
    // Optimistiske patches fra useUpdateRoute.onMutate sørger for at både
    // kalender, basisrute-cache og projicerede ruter opdaterer øjeblikkeligt
    // — uden at brugeren behøver at lukke sheet'et.
    const delay = colorChanged ? 0 : 120;
    pendingFlushRef.current = pendingPayload;
    const timeout = window.setTimeout(() => {
      if (updateAppearance.isPending) {
        // Mutation kører — vent. Vi behøver ikke gøre noget her: effect'en
        // har `updateAppearance.isPending` i sin dep-liste, så den re-runs
        // automatisk når mutationen er færdig og fyrer en ny timer der
        // sender den ventende payload (incl. det navn brugeren nåede at
        // skrive mens en farve-mutation lå undervejs).
        return;
      }
      if (!route) return;
      const vars: { route: Route; name?: string | null; color?: string } = { route };
      if (pendingPayload.name !== undefined) vars.name = pendingPayload.name;
      if (pendingPayload.color !== undefined) vars.color = pendingPayload.color;
      updateAppearance.mutate(vars);
      pendingFlushRef.current = null;
    }, delay);

    return () => window.clearTimeout(timeout);
  }, [route, open, dirty, pendingPayload, updateAppearance, updateAppearance.isPending]);

  // Flush udestående ændringer øjeblikkeligt når sheet'et lukkes eller
  // unmounts — ellers ville ændringer foretaget i de sidste ~250 ms før
  // luk gå tabt fordi debounce-timeren cleanes op uden at fyre.
  const flushPending = () => {
    const payload = pendingFlushRef.current;
    if (!payload || !payload.id) return;
    pendingFlushRef.current = null;
    if (!route) return;
    const vars: { route: Route; name?: string | null; color?: string } = { route };
    if (payload.name !== undefined) vars.name = payload.name;
    if (payload.color !== undefined) vars.color = payload.color;
    updateAppearance.mutate(vars);
  };
  useEffect(() => {
    if (open) return;
    flushPending();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => () => { flushPending(); }, []); // unmount safety

  if (!route) return null;

  const handleDelete = async () => {
    try {
      await deleteRoute.mutateAsync(route.id);
      toast.success("Rute slettet");
      onOpenChange(false);
    } catch { /* */ }
    setConfirmDelete(false);
  };

  // Hvis brugeren ændrer datoen i picker → åbn scope-dialog i stedet for at autosave.
  const handleDateChange = (next: string) => {
    const releaseNestedOverlayGuard = () => {
      window.setTimeout(() => {
        if (!pendingDate && !pendingProjectedDate) nestedOverlayOpenRef.current = false;
        clearStaleRadixPointerLock();
      }, 120);
    };
    const currentFrom = isProjection && projectedDate ? projectedDate : route?.route_date;
    if (!route || !next || next === currentFrom) {
      setDate(next);
      releaseNestedOverlayGuard();
      return;
    }
    if (next < todayIso) {
      toast.error("Kan ikke flytte ruten bagud i tiden", {
        description: "Vælg en dato fra i dag eller frem.",
      });
      releaseNestedOverlayGuard();
      return;
    }
    // Samme serie-kollisions-checks som drag-drop på kalenderen, så datovælgeren
    // ikke kan smutte uden om guarderne der forhindrer to af samme rute samme dag.
    if (validateMoveTo) {
      const baseId =
        (route as any).base_route_id ?? (route as any).baseRouteId ?? route.id ?? null;
      const issue = validateMoveTo({
        routeId: route.id,
        baseRouteId: baseId,
        isProjection,
        newDate: next,
      });
      if (issue) {
        toast.error(issue.message, issue.description ? { description: issue.description } : undefined);
        releaseNestedOverlayGuard();
        return;
      }
    }
    if (isProjection) {
      // Projicerede ruter: vis en simpel bekræftelses-dialog i stedet for
      // scope-dialogen — vi flytter ALDRIG basisruten, kun denne ene
      // fremtidige forekomst.
      nestedOverlayOpenRef.current = true;
      setPendingProjectedDate(next);
      return;
    }
    nestedOverlayOpenRef.current = true;
    setPendingDate(next);
  };

  const handleConfirmMoveDate = async (
    scope: MoveRouteScope,
    moveLinkedSubscriptions: boolean,
  ) => {
    if (!route || !pendingDate) return;
    // VIGTIGT: Vi lukker AlertDialog'en FØR mutationen afventes.
    // Ellers risikerer vi en race: mutationen invaliderer queries → parent
    // fjerner ruten fra den valgte dato → Sheet'en lukker mens AlertDialog
    // stadig er åben → Radix låser body { pointer-events: none } og hele UI'et
    // bliver "død". Når dialogen lukkes først, unmountes den rent inden
    // Sheet'en evt. ryger.
    const newDate = pendingDate;
    setPendingDate(null);
    nestedOverlayOpenRef.current = false;
    const oldDate = route.route_date;
    try {
      const result = await moveRouteSeries.mutateAsync({
        routeId: route.id,
        newDate,
        scope,
        moveLinkedSubscriptions,
      });
      setDate(newDate);
      const movedRouteId = String((result as any)?.new_route_id || route.id);
      pushRouteUndo({
        label: scope === "future"
          ? `Forskydning af ruteserie til ${format(parseISO(newDate), "d. MMM", { locale: da })}`
          : `Flyt rute til ${format(parseISO(newDate), "d. MMM", { locale: da })}`,
        undo: async () => {
          await moveRouteSeries.mutateAsync({
            routeId: movedRouteId,
            newDate: oldDate,
            scope,
            moveLinkedSubscriptions,
          });
        },
      });
      toastSuccessWithUndo({
        message: scope === "future"
          ? `Ruteserien flyttet til ${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`
          : `Rute flyttet til ${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`,
        description: "Klik Fortryd for at rulle tilbage.",
      });
    } catch (e: any) {
      // Dialogen er allerede lukket, så vi kan ikke vise inline-fejl —
      // toast i stedet.
      toast.error(e?.message || "Kunne ikke flytte rute", {
        description: e?.hint || e?.details || undefined,
      });
    } finally {
      clearStaleRadixPointerLock();
    }
  };

  const handleConfirmMoveProjected = async () => {
    if (!route || !projectedDate || !pendingProjectedDate) return;
    // Lader fejl boble op til dialogens egen catch — så vises de inline i
    // stedet for kun som flygtig toast.
    const fromD = projectedDate;
    const toD = pendingProjectedDate;
    const baseId = route.id;
    await moveProjected.mutateAsync({
      baseRouteId: route.id,
      fromDate: projectedDate,
      toDate: pendingProjectedDate,
      agreementIds: seriesInfo?.agreementIds ?? [],
      subscriptionIds: seriesInfo?.recurringSubscriptionIds ?? [],
      orderIds: seriesInfo?.orderIds ?? [],
      moveStartDates: projectedMoveSyncStart,
      moveNextDates: projectedMoveSyncNext,
    });
    pushRouteUndo({
      label: `Flyt projiceret forekomst tilbage til ${format(parseISO(fromD), "d. MMM", { locale: da })}`,
      undo: async () => {
        await moveProjected.mutateAsync({
          baseRouteId: baseId,
          fromDate: toD,
          toDate: fromD,
        });
      },
    });
    toastSuccessWithUndo({
      message: `Forekomst flyttet til ${format(parseISO(toD), "EEEE d. MMM", { locale: da })}`,
      description: "Klik Fortryd for at lægge den tilbage på den oprindelige dato.",
    });
    setPendingProjectedDate(null);
    nestedOverlayOpenRef.current = false;
    clearStaleRadixPointerLock();
    onOpenChange(false);
  };

  const handleSheetOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && nestedOverlayOpenRef.current) {
      // Radix kan sende `onOpenChange(false)` på pointer-down i portal'ede
      // datepickers før kalenderens onSelect når at åbne flyt-dialogen.
      // I det tilfælde må sheet'et ikke lukkes — ellers står kalenderen tilbage
      // med en usynlig dismissable layer, og hele siden føles låst.
      return;
    }
    onOpenChange(nextOpen);
  };

  const handleOptimize = async () => {
    // Brug toast.promise så brugeren ser øjeblikkelig feedback mens vi
    // optimerer, og success-/info-toasten først dukker op NÅR ruten faktisk
    // er opdateret (efter mutationen og dens query-invalidering returnerer).
    const runner = (async () => {
      const result = await optimize.mutateAsync(route.id);
      const savedKm = Math.max(
        0,
        (result as any).saved_km ?? (((result as any).before_km ?? result.total_km) - result.total_km),
      );
      const savedMin = Math.max(
        0,
        (result as any).saved_minutes ?? (((result as any).before_minutes ?? result.total_minutes) - result.total_minutes),
      );
      const orderChanged = !!(result as any).order_changed;
      const meaningfulSavings = savedKm >= 0.05 || savedMin >= 1;
      return { result, savedKm, savedMin, orderChanged, meaningfulSavings };
    })();

    toast.promise(runner, {
      loading: "Optimerer rækkefølgen…",
      success: ({ savedKm, savedMin, orderChanged, meaningfulSavings }) => {
        if (meaningfulSavings) {
          const parts: string[] = [];
          if (savedKm >= 0.05) parts.push(`${savedKm.toFixed(1)} km`);
          if (savedMin >= 1) parts.push(formatTravelTime(Math.round(savedMin) * 60));
          return `Sparet ${parts.join(" · ")}${orderChanged ? " — rækkefølgen er opdateret" : ""}`;
        }
        if (orderChanged) {
          return "Rækkefølgen er optimeret — ingen målbar km-/tidsbesparelse";
        }
        return "Allerede den bedste rækkefølge — ingen ændringer foretaget";
      },
      error: (e: any) => e?.message || "Kunne ikke optimere ruten",
    });

    try { await runner; } catch { /* fejl håndteres af toast.promise */ }
  };

  /**
   * Skriv rejsetid på almindeligt dansk:
   *  - <60 min  → "34 min"
   *  - =60 min  → "1 time"
   *  - >60 min  → "1 time og 12 min" / "2 timer og 5 min"
   */
  const formatTravelTime = (s: number): string => {
    const m = Math.max(0, Math.round(s / 60));
    if (m < 60) return `${m} min`;
    const h = Math.floor(m / 60);
    const r = m % 60;
    const hourLabel = h === 1 ? "1 time" : `${h} timer`;
    if (r === 0) return hourLabel;
    return `${hourLabel} og ${r} min`;
  };

  return (
    <>
      <Sheet open={open} onOpenChange={handleSheetOpenChange} modal={isCompact}>
        <SheetContent
          side={isCompact ? "bottom" : "right"}
          className={cn(
            "planner-overlay flex flex-col p-0 shadow-sm",
            isCompact ? "h-[92dvh] max-h-[92dvh] rounded-t-md" : "w-full sm:max-w-md",
          )}
          hideOverlay={!isCompact}
          hideCloseButton={false}
          onOpenAutoFocus={(e) => e.preventDefault()}
          /* Når sheet'en er non-modal (desktop) registrerer Radix klik på
             portal'ede børn (dropdowns, popovers, tooltips, datepicker) som
             "klik udenfor" og lukker. Det betød at brugere ikke kunne klikke
             på menupunkter, kalenderdage osv. i sheet'en. Vi blokerer derfor
             outside-close når target er inde i et Radix portal — Esc og X
             lukker stadig som forventet. */
          onPointerDownOutside={(e) => {
            if (nestedOverlayOpenRef.current || isRouteEditPortalTarget(e.target)) {
              e.preventDefault();
            }
          }}
          onInteractOutside={(e) => {
            if (nestedOverlayOpenRef.current || isRouteEditPortalTarget(e.target)) {
              e.preventDefault();
            }
          }}
        >
          <SheetHeader
            className="planner-overlay-header relative px-5 py-4 pr-14 border-b shrink-0 space-y-0 text-left bg-card"
          >
            <SheetHeaderBlock
              icon={<Pencil className="h-4 w-4" />}
              title={
                <SheetTitle className="text-base flex items-center gap-2">
                  Rediger rute
                  {isPast && (
                    <Badge variant="secondary" className="gap-1 text-[10px] font-medium">
                      <History className="h-2.5 w-2.5" /> Kørt
                    </Badge>
                  )}
                </SheetTitle>
              }
              description={
                <SheetDescription className="text-xs">
                  {date ? format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da }) : ""}
                  {stopCount > 0 && <> · {stopCount} stop</>}
                </SheetDescription>
              }
            />
          </SheetHeader>

          <div className="planner-overlay-body flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-secondary/20">
            {/* Tidslinje: viser udførte kørsler + næste planlagte for tilbagevendende
                aftaler på basisruten. Skjules på projektioner (de viser kun én dag). */}
            {!isProjection && route?.id && (seriesInfo?.recurringAppointmentCount ?? 0) > 0 && (
              <RouteOccurrenceTimeline routeId={route.id} />
            )}
            {/* Navn */}
            <Section
              icon={<Pencil className="h-3.5 w-3.5" />}
              title="Navn"
              hint={
                isProjection
                  ? "Låst — redigér originalruten"
                  : !route.name && autoGeneratedName
                  ? "Auto-genereret — redigér frit"
                  : undefined
              }
            >
              <Input
                id="route-edit-name"
                value={name}
                onChange={(e) => {
                  userEditedRef.current = true;
                  setName(e.target.value);
                  onNamePreview?.(e.target.value.trim() || null);
                }}
                placeholder="fx Nord, Aarhus C, Mandag-team..."
                className={cn(
                  "h-9",
                  nameDuplicate && "border-destructive focus-visible:ring-destructive/40",
                )}
                disabled={isProjection}
                readOnly={isProjection}
                aria-invalid={nameDuplicate || undefined}
              />
              {nameDuplicate && (
                <p className="mt-1.5 text-[11.5px] font-medium text-destructive">
                  Der findes allerede en rute der hedder &ldquo;{name.trim()}&rdquo; denne dag. Vælg et andet navn.
                </p>
              )}
            </Section>

            {/* Farve */}
            <Section
              icon={<Palette className="h-3.5 w-3.5" />}
              title="Farve"
              hint={isProjection
                ? "Låst — redigér originalruten"
                : ROUTE_COLORS.find((c) => c.value === color)?.name || "Brugerdefineret"}
            >
              <div className={cn("grid grid-cols-12 gap-1.5", isProjection && "pointer-events-none opacity-60")}>
                {ROUTE_COLORS.map((c) => {
                  const selected = color === c.value;
                  return (
                    <button
                      key={c.value}
                      type="button"
                      disabled={isProjection}
                      onClick={() => {
                        userEditedRef.current = true;
                        setColor(c.value);
                        onColorPreview?.(c.value);
                        // Affyr farve-skiftet med det samme — ikke gennem
                        // autosave-debouncen. Hurtige klik (blå → rød →
                        // grøn) skal alle nå frem; mutation-køen serialiserer
                        // dem i klikrækkefølgen og seneste optimistiske
                        // patch vinder. Det forhindrer at en igangværende
                        // mutation "spiser" det næste klik via isPending-
                        // guarden i autosave-effekten.
                        if (route && !isProjection && route.color !== c.value) {
                          pendingFlushRef.current = null;
                          updateAppearance.mutate({ route, color: c.value });
                        }
                      }}
                      title={c.name}
                      className={cn(
                        "relative aspect-square rounded-md transition-all hover:scale-110 ring-offset-1 ring-offset-background flex items-center justify-center",
                        selected ? "ring-2 ring-foreground shadow-md" : "hover:ring-1 hover:ring-foreground/30",
                      )}
                      style={{ background: c.value }}
                      aria-label={`Vælg farve ${c.name}`}
                    >
                      {selected && <Check className="h-2.5 w-2.5 drop-shadow" style={{ color: readableTextOn(c.value) }} strokeWidth={4} />}
                    </button>
                  );
                })}
              </div>
            </Section>

            {/* Dato — på projicerede forekomster åbner ændring en bekræftelses-
                dialog der materialiserer netop denne ene forekomst på den nye
                dato (basisruten røres aldrig). */}
            {(
              <Section
                icon={<CalendarDays className="h-3.5 w-3.5" />}
                title="Dato"
                hint={isProjection
                  ? "Flytter kun denne ene forekomst"
                  : (seriesInfo?.recurringAppointmentCount ?? 0) >= 1 ? "Del af fast rute" : "Træk i kalenderen for hurtigt skift"}
              >
                <DatePickerField
                  value={date}
                  onChange={handleDateChange}
                  onCalendarOpenChange={(isOpen) => {
                    if (isOpen) nestedOverlayOpenRef.current = true;
                    else window.setTimeout(() => {
                      if (!pendingDate && !pendingProjectedDate) nestedOverlayOpenRef.current = false;
                    }, 180);
                  }}
                  minDate={todayIso}
                />
              </Section>
            )}

            {!isProjection && route && (
              <div className="space-y-2">
                {livePositions.length > 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 w-full justify-between gap-3 border-accent/35 bg-accent/5 px-3 text-foreground hover:bg-accent/10"
                    onClick={() => setLiveMapOpen(true)}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <MapPinned className="h-4 w-4 shrink-0 text-accent" />
                      <span className="truncate font-semibold">Se live-position</span>
                    </span>
                    <span className="shrink-0 text-xs font-medium text-success">{livePositions.length} online</span>
                  </Button>
                )}
                <RouteCommunicationPanel route={route} stops={stops} employees={employees} />
              </div>
            )}

            {/* Kørt-opsummering: vis medarbejdere og indtjening for udførte stops */}
            {isPast && route && (
              <CompletedRouteSummary routeId={route.id} />
            )}

            {/* Omsætning — sum af aftaler på ruten. */}
            {!isPast && stops.length > 0 && (
              <Section
                icon={<Wallet className="h-3.5 w-3.5" />}
                title="Omsætning"
                tone="emerald"
                hint={`${stops.length} ${stops.length === 1 ? "aftale" : "aftaler"}`}
              >
                <RouteRevenueBreakdown
                  stops={stops}
                  total={estimatedRevenue}
                  routeDate={date}
                />
              </Section>
            )}
          </div>

          {/* Footer actions */}
          <SheetFooterBar className="space-y-2 bg-card">
            {!isProjection && stopCount >= 2 && (
              <Button
                className="w-full bg-accent text-accent-foreground hover:bg-accent/90 shadow-sm"
                onClick={handleOptimize}
                disabled={optimize.isPending}
              >
                {optimize.isPending
                  ? <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  : <Sparkles className="h-4 w-4 mr-2" />}
                Optimér rækkefølge
              </Button>
            )}
            {!isProjection && (stopCount >= 1 || true) && (
              <div className="grid grid-cols-2 gap-2">
                {stopCount >= 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setMoveStopsOpen(true)}
                  >
                    <CalendarRange className="h-4 w-4 mr-2" />
                    Flyt aftaler
                  </Button>
                )}
                <Button
                  variant="outline"
                  className={cn(
                    "text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30",
                    stopCount < 1 && "col-span-2",
                  )}
                  onClick={() => {
                    if (stopCount > 0) {
                      toast.info("Flyt aftalerne først", {
                        description: "Vælg en ny dato for aftalerne — ruten slettes automatisk når den er tom.",
                      });
                      setMoveStopsOpen(true);
                    } else {
                      setConfirmDelete(true);
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1.5" />
                  {stopCount > 0 ? "Slet rute" : "Slet rute"}
                </Button>
              </div>
            )}
            {!isProjection && route?.id && (
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground border-border/70"
                onClick={() => setHistoryOpen(true)}
                title="Se hvem der har ændret ruten, og hvornår — fx flyttet, tilføjet stop eller optimeret"
              >
                <History className="h-3.5 w-3.5" />
                Vis ændringshistorik
              </Button>
            )}
            {!isProjection && route?.id && (route as any)?.status === "completed" && (
              <div className="flex items-start gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2.5 text-xs text-foreground">
                <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold mb-0.5">Ruten er udført</div>
                  <div className="text-muted-foreground mb-2">
                    Alle stop er markeret som færdige. Genåbn ruten hvis noget skal rettes eller udføres igen.
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2 border-emerald-500/40 hover:bg-emerald-500/10"
                    disabled={reopenRoute.isPending}
                    onClick={async () => {
                      try {
                        await reopenRoute.mutateAsync(route!.id);
                        toast.success("Ruten er genåbnet");
                      } catch {/* hook viser toast */}
                    }}
                  >
                    {reopenRoute.isPending ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                    Genåbn rute
                  </Button>
                </div>
              </div>
            )}
            {!isProjection && route?.id && (
              <>
                <RouteEarlyCompletionToggle route={route} />
                <RouteSnapshotSection routeId={route.id} />
              </>
            )}
            {isProjection && (
              <>
                <div className="flex items-start gap-2 rounded-lg border border-dashed border-muted-foreground/40 bg-muted/50 px-3 py-2.5 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground/70" />
                  <div>
                    <div className="font-semibold text-foreground mb-0.5">Projiceret forekomst</div>
                    Denne rute er automatisk genereret ud fra basisruten. Ændringer i rækkefølge,
                    dato eller sletning gælder kun denne ene dag — for at ændre serien skal du
                    redigere basisruten.
                  </div>
                </div>
                {stops.some((s) => (s as any).agreement_id) && (
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 border-destructive/30"
                    onClick={() => setCancelOccurrenceOpen(true)}
                  >
                    <Ban className="h-4 w-4 mr-1.5" />
                    Aflys denne forekomst
                  </Button>
                )}
              </>
            )}
          </SheetFooterBar>
        </SheetContent>
      </Sheet>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Slet rute?</AlertDialogTitle>
            <AlertDialogDescription>
              Ruten er tom og slettes permanent.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annullér</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Slet rute
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {route?.id && historyOpen && (
        <Suspense fallback={null}>
          <RouteHistoryDialog
            open={historyOpen}
            onOpenChange={setHistoryOpen}
            routeId={route.id}
            routeName={route.name || autoGeneratedName || undefined}
          />
        </Suspense>
      )}

      {!isProjection && route && liveMapOpen && livePositions.length > 0 && (
        <RouteLivePositionDialog
          open={liveMapOpen}
          onOpenChange={setLiveMapOpen}
          route={route}
          stops={stops}
          employees={employees}
          positions={livePositions}
        />
      )}

      <MoveRouteDateDialog
        open={!!pendingDate}
        onOpenChange={(o) => {
          if (!o) {
            setPendingDate(null);
            nestedOverlayOpenRef.current = false;
            clearStaleRadixPointerLock();
          }
        }}
        routeName={route.name || "Rute"}
        fromDate={route.route_date}
        toDate={pendingDate || ""}
        recurringAppointmentCount={seriesInfo?.recurringAppointmentCount ?? 0}
        linkedSubscriptionCount={seriesInfo?.linkedSubscriptionCount ?? 0}
        loading={moveRouteSeries.isPending}
        warnings={moveConflictWarnings}
        disabledFutureReasons={(() => {
          const reasons: string[] = [];
          const today = new Date().toISOString().slice(0, 10);
          if ((seriesInfo?.recurringAppointmentCount ?? 0) < 1) {
            reasons.push("Ruten har ingen tilbagevendende aftaler — der er ingen serie at forskyde.");
          }
          if ((route as any).base_route_id) {
            reasons.push("Denne dato er allerede en enkelt-flytning fra en serie. Flyt grundruten i stedet for at justere alle fremtidige.");
          }
          if (pendingDate && pendingDate < today) {
            reasons.push("Den nye dato ligger i fortiden — fremtidige aftaler kan ikke forskydes baglæns.");
          }
          if ((seriesInfo?.recurringAppointmentCount ?? 0) >= 1 && !seriesInfo?.dominantIntervalDays) {
            reasons.push("Aftalerne på ruten har ingen fælles rytme (interval) at forskyde efter.");
          }
          return reasons;
        })()}
        onConfirm={handleConfirmMoveDate}
      />

      {/* Bekræftelse: flyt EN projiceret forekomst til ny dato. */}
      <MoveProjectedOccurrenceDialog
        open={!!pendingProjectedDate}
        onOpenChange={(o) => {
          if (!o && !moveProjected.isPending) {
            setPendingProjectedDate(null);
            nestedOverlayOpenRef.current = false;
            clearStaleRadixPointerLock();
          }
        }}
        routeName={route.name || "Rute"}
        fromDate={projectedDate || ""}
        toDate={pendingProjectedDate || ""}
        recurringAppointmentCount={seriesInfo?.recurringAppointmentCount ?? 0}
        syncNext={projectedMoveSyncNext}
        onSyncNextChange={setProjectedMoveSyncNext}
        syncStart={projectedMoveSyncStart}
        onSyncStartChange={setProjectedMoveSyncStart}
        warnings={projectedMoveConflictWarnings}
        suggestedFreeDate={projectedMoveSuggestedDate}
        onPickSuggestedDate={(iso) => setPendingProjectedDate(iso)}
        loading={moveProjected.isPending}
        onConfirm={handleConfirmMoveProjected}
      />

      <MoveStopsDialog
        open={moveStopsOpen}
        onOpenChange={setMoveStopsOpen}
        route={route}
        stops={stops}
      />

      <SeriesScopeDialog
        open={cancelOccurrenceOpen}
        onOpenChange={setCancelOccurrenceOpen}
        title="Aflys forekomst?"
        description={`Aflys aftalerne på denne rute den ${date ? format(parseISO(date), "d. MMMM yyyy", { locale: da }) : ""}. Basis-aftalen og fremtidige forekomster fortsætter uændret.`}
        allowedScopes={["single"]}
        defaultScope="single"
        confirmLabel="Aflys forekomst"
        loading={cancelLoading}
        futureCount={cancelImpact?.futureCount}
        totalCount={cancelImpact?.totalCount}
        warnings={cancelConflictWarnings}
        onConfirm={async (_scope: SeriesScope) => {
          if (!route) return;
          setCancelLoading(true);
          try {
            const agreementIds = Array.from(
              new Set(
                stops
                  .map((s) => (s as any).agreement_id as string | null | undefined)
                  .filter((v): v is string => !!v),
              ),
            );
            if (agreementIds.length === 0) {
              toast.info("Ingen aftaler på denne forekomst at aflyse");
              setCancelOccurrenceOpen(false);
              return;
            }
            const { data: userRes } = await supabase.auth.getUser();
            const rows = agreementIds.map((aid) => ({
              agreement_id: aid,
              business_id: route.business_id,
              original_date: route.route_date,
              status: "cancelled" as const,
              created_by: userRes.user?.id ?? null,
            }));
            const { error } = await supabase
              .from("agreement_occurrence_overrides")
              .upsert(rows, { onConflict: "agreement_id,original_date" });
            if (error) throw error;
            // Audit-log pr. aftale så vi kan se hvem der aflyste hvad og hvornår.
            await Promise.all(
              agreementIds.map((aid) =>
                logRouteAudit({
                  business_id: route.business_id,
                  route_id: route.id,
                  agreement_id: aid,
                  action: "occurrence.cancel",
                  scope: "single",
                  affected_count: 1,
                  after: { original_date: route.route_date, status: "cancelled" },
                }),
              ),
            );
            await qc.invalidateQueries({ queryKey: ["agreement-occurrence-overrides"] });
            await qc.invalidateQueries({ queryKey: ["routes"] });
            toast.success(`Forekomsten er aflyst (${agreementIds.length} ${agreementIds.length === 1 ? "aftale" : "aftaler"})`);
            setCancelOccurrenceOpen(false);
            onOpenChange(false);
          } catch (e: any) {
            toastRouteError(e, toast.error, { titleFallback: "Kunne ikke aflyse forekomsten" });
          } finally {
            setCancelLoading(false);
          }
        }}
      />
    </>
  );
};

/* ─── CompletedRouteSummary ──────────────────────────────────────────
 * Vises i RouteEditSheet for ruter hvis dato ligger bagud. Henter
 * snapshots fra employee_completed_stops så vi kan vise hvem der
 * kørte ruten, hvad de tjente og hvilke aftaler de udførte — selv hvis
 * stoppet senere skulle blive slettet.
 * ─────────────────────────────────────────────────────────────────── */
const CompletedRouteSummary = ({ routeId }: { routeId: string }) => {
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["route-completed-snapshots", routeId],
    enabled: !!routeId,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_completed_stops")
        .select("employee_id, earnings, order_amount, customer_name, service_summary, completed_at, duration_minutes")
        .eq("route_id", routeId)
        .order("completed_at", { ascending: true });
      if (error) throw error;
      return (data || []) as any[];
    },
  });

  const { data: empMap = new Map<string, any>() } = useQuery({
    queryKey: ["route-completed-employees", routeId, rows.length],
    enabled: rows.length > 0,
    staleTime: 60_000,
    queryFn: async () => {
      const ids = Array.from(new Set(rows.map((r) => r.employee_id))).filter(Boolean);
      if (ids.length === 0) return new Map();
      const { data } = await supabase.from("employees").select("id, name, avatar_url, color").in("id", ids);
      const m = new Map<string, any>();
      (data || []).forEach((e: any) => m.set(e.id, e));
      return m;
    },
  });

  const byEmployee = useMemo(() => {
    const m = new Map<string, { stops: any[]; earnings: number; revenue: number }>();
    for (const r of rows) {
      const cur = m.get(r.employee_id) || { stops: [], earnings: 0, revenue: 0 };
      cur.stops.push(r);
      cur.earnings += Number(r.earnings || 0);
      cur.revenue += Number(r.order_amount || 0);
      m.set(r.employee_id, cur);
    }
    return Array.from(m.entries());
  }, [rows]);

  return (
    <Section
      icon={<Award className="h-3.5 w-3.5" />}
      title="Kørt – opsummering"
      hint={isLoading ? "Henter…" : rows.length > 0 ? `${rows.length} udført` : "Ingen registreret"}
    >
      {!isLoading && rows.length === 0 && (
        <p className="text-xs text-muted-foreground italic">
          Ingen udførte aftaler er registreret for denne rute.
        </p>
      )}
      {byEmployee.length > 0 && (
        <div className="space-y-2.5">
          {byEmployee.map(([empId, info]) => {
            const emp = (empMap as Map<string, any>).get(empId);
            return (
              <div key={empId} className="rounded-lg border bg-card overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-secondary/40 border-b">
                  {emp?.avatar_url ? (
                    <img src={emp.avatar_url} alt={emp.name} className="h-6 w-6 rounded-full object-cover" />
                  ) : (
                    <span
                      className="inline-flex h-6 w-6 rounded-full items-center justify-center text-[10px] font-bold"
                      style={{ background: emp?.color || "#64748b", color: readableTextOn(emp?.color || "#64748b") }}
                    >
                      {(emp?.name || "?").slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{emp?.name || "Ukendt medarbejder"}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {info.stops.length} {info.stops.length === 1 ? "aftale" : "aftaler"} udført
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold tabular-nums text-emerald-600 dark:text-emerald-400">
                      {formatPrice(Math.round(info.earnings))}
                    </p>
                    <p className="text-[10px] text-muted-foreground">indtjening</p>
                  </div>
                </div>
                <ul className="divide-y">
                  {info.stops.map((s, i) => (
                    <li key={i} className="px-3 py-1.5 flex items-start justify-between gap-2 text-xs">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{s.customer_name || "Aftale"}</p>
                        {s.service_summary && (
                          <p className="text-[10px] text-muted-foreground truncate">{s.service_summary}</p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="font-semibold tabular-nums">
                          {/* formatPrice håndterer selv dansk formatering — et
                              forudgående toLocaleString ville give dobbelt-
                              konvertering ("12.500" → 12.5 → "12,50 kr."). */}
                          {formatPrice(Math.round(Number(s.earnings || 0)))}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </Section>
  );
};

/* ─── RouteRevenueBreakdown ──────────────────────────────────────────
 * Lille tabel under "Omsætning" på en kommende rute: pr.-stop nedbrydning
 * + tydeligt "Estimat for perioden"-label, så brugeren ved hvilken
 * tidsramme tallet dækker. Tom-tilstand vises hvis ingen aftaler har
 * beløb endnu.
 * ─────────────────────────────────────────────────────────────────── */
const RouteRevenueBreakdown = ({
  stops, total, routeDate,
}: { stops: RouteStop[]; total: number; routeDate: string }) => {
  const sorted = useMemo(
    () => [...stops].sort((a, b) => a.sequence - b.sequence),
    [stops],
  );
  const withAmounts = sorted.filter((s) => Number((s as any).order_amount || 0) > 0);
  const periodLabel = routeDate
    ? format(parseISO(routeDate), "EEEE d. MMMM yyyy", { locale: da })
    : "valgte dato";

  return (
    <div className="space-y-2.5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            Estimat for perioden
          </p>
          <p className="text-[11px] text-muted-foreground">{periodLabel}</p>
        </div>
        <p className="text-2xl font-bold tabular-nums text-foreground">
          {formatPrice(Math.round(total))}
        </p>
      </div>

      {withAmounts.length === 0 ? (
        <div className="rounded-md border border-dashed bg-secondary/30 px-3 py-3 text-center text-[11px] text-muted-foreground">
          Aftalerne på ruten har endnu ingen beløb — beløb sættes på selve bestillingen.
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border bg-card">
          <ul className="divide-y text-xs">
            {sorted.map((s, i) => {
              const amount = Number((s as any).order_amount || 0);
              return (
                <li key={s.id || i} className="flex items-center justify-between gap-2 px-2.5 py-1.5">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-secondary text-[10px] font-bold tabular-nums text-foreground">
                      {i + 1}
                    </span>
                    <span className="truncate text-foreground">{s.customer_name || "Aftale"}</span>
                  </div>
                  <span className={cn(
                    "shrink-0 tabular-nums",
                    amount > 0 ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}>
                    {amount > 0 ? `${formatPrice(Math.round(amount))}` : "—"}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <p className="text-[11px] text-muted-foreground">
        Estimeret omsætning — summen af aftalens beløb. Faktisk beløb registreres når aftalen afsluttes.
      </p>
    </div>
  );
};

/**
 * RouteSnapshotButton — Bølge 4 / 4.3 i .lovable/plan.md
 * -----------------------------------------------------------------------------
 * Knappe-affordance til at låse ("snapshot'e") en rute som immutable
 * point-in-time payload. Bruges af reklamationer + audit-spor. Viser
 * antallet af eksisterende snapshots så brugeren ved om ruten allerede er låst.
 */
const RouteSnapshotSection = ({ routeId }: { routeId: string }) => {
  const { data: snapshots } = useRouteSnapshots(routeId);
  const create = useCreateRouteSnapshot();
  const [expanded, setExpanded] = useState(false);
  // Skjul hele sektionen bag en "Avanceret"-toggle — det er en intern
  // audit/revision-feature der forvirrer almindelige brugere.
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const count = snapshots?.length ?? 0;
  const onClick = async () => {
    try {
      const id = await create.mutateAsync({ routeId, reason: "manual_lock" });
      if (id) toast.success("Referencepunkt gemt — ruten er nu låst som dokumentation");
      else toast.info("Der er allerede gemt et referencepunkt for ruten i dag");
    } catch (err) {
      toastRouteError(err, toast.error, { titleFallback: "Kunne ikke låse rute" });
    }
  };
  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={() => setAdvancedOpen((v) => !v)}
        className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        aria-expanded={advancedOpen}
      >
        <ChevronDown className={cn("h-3 w-3 transition-transform", advancedOpen && "rotate-180")} />
        {advancedOpen ? "Skjul avanceret" : `Avanceret${count > 0 ? ` (${count} referencepunkt${count === 1 ? "" : "er"})` : ""}`}
      </button>
      {advancedOpen && (
        <>
          <p className="text-[11px] text-muted-foreground leading-snug">
            Gem et øjebliksbillede af ruten — bruges hvis du senere skal kunne dokumentere præcis
            hvad planen var (fx ved reklamationer eller intern revision). Påvirker IKKE den
            kørende rute.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground border-border/70"
            onClick={onClick}
            disabled={create.isPending}
            title="Gemmer et øjebliksbillede du senere kan sammenligne med"
          >
            {create.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Camera className="h-3.5 w-3.5" />}
            Gem som referencepunkt
            {count > 0 && <span className="text-[11px] text-muted-foreground">({count})</span>}
          </Button>
        </>
      )}
      {count > 0 && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
          {expanded ? "Skjul referencepunkter" : `Vis ${count} referencepunkt${count === 1 ? "" : "er"}`}
        </button>
      )}
      {expanded && snapshots && (
        <ul className="flex flex-col gap-1 rounded-md border border-border/60 bg-muted/30 p-2 text-[11px]">
          {snapshots.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-2">
              <span className="font-medium text-foreground/90">
                {format(parseISO(s.snapshot_date), "d. MMM yyyy", { locale: da })}
              </span>
              <span className="text-muted-foreground truncate">{s.reason}</span>
              <span className="text-muted-foreground/80 tabular-nums shrink-0">
                {formatDistanceToNow(parseISO(s.locked_at), { addSuffix: true, locale: da })}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};