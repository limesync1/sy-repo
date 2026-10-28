import { MapCrashGuard } from "@/components/employee-route/MapCrashGuard";
import navigationCar from "@/assets/navigation-car.svg.asset.json";
import { EmployeeStopActions } from "@/components/employee/EmployeeStopActions";
import { markRouteStarted, getRouteStartedAt, formatClockTime, formatRunDuration, readArrival, saveArrival, readArrivalEstimate, saveArrivalEstimate } from "@/components/employee-route/route-run-clock";
import { runMetrics } from "@/components/employee-route/run-metrics";
import { StopTimeline } from "@/components/employee-route/StopTimeline";
import { RouteRunSummary } from "@/components/employee-route/RouteRunSummary";
import { NoItemsIcon } from "@/components/shared/NoItemsIcon";
import { forwardRef, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRouteData, useDirections, useUpdateStopStatus, type RouteStop, type Route } from "@/hooks/useRoutes";
import { useStartStopTime, useEndStopTime, useResetStopTime, useOptimizeRouteFromPosition, useReorderStops, useStopTimeEntries, useOrderForStop } from "@/hooks/useRoutes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft, Navigation, Phone, CheckCircle2, MapPin, List, Clock, Loader2,
  ChevronUp, ChevronDown, Play, Volume2, VolumeX, Crosshair, TrafficCone,
  Plus, Minus,
  Info, Check, Undo2,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import L from "leaflet";
import "leaflet-rotate";
import { roadProgress } from "@/components/employee-route/route-progress";
import { arrivalRadius, arrivalDwellMs, headingDelta } from "@/components/employee-route/navigation-policy";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BrandedIllustration } from "@/components/shared/BrandedIllustration";
import { stripPrices } from "@/lib/employee-display";
import { bearingDegrees, haversineMeters } from "@/lib/geo-distance";
import {
  unlockAudio, playArrivalChime, playStartChime, playSuccessChime, playCompleteFanfare, speak, stopSpeaking,
  playTurnCue, playApproachCue, playRerouteCue, playTrafficCue,
} from "@/lib/employee-audio";
import { usePageVisible } from "@/components/employee-route/usePageVisible";
import { ManeuverIcon, maneuverLabel } from "@/components/employee-route/ManeuverIcon";
import { RouteViewSkeleton } from "@/components/admin/shared/Skeletons";
import { useCurrentManeuver } from "@/components/employee-route/useCurrentManeuver";
import type { MotionSource } from "@/components/employee-route/motionTrack";
import { usePositionTrack } from "@/components/employee-route/positionEngine";
import { useDriveRecorder } from "@/components/employee-route/useDriveRecorder";
import { DriveTraceDialog } from "@/components/employee-route/DriveTraceDialog";
import { Switch } from "@/components/ui/switch";
import { RouteMapLine, resolveMapColor } from "@/components/employee-route/RouteMapLine";
import { navigationZoom } from "@/components/employee-route/camera-policy";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { pickDuration } from "@/components/route/EtaBreakdown";
import { StopDetailsContent } from "@/components/employee/StopDetailsContent";
import { StopDetailsSheetShell } from "@/components/employee/StopDetailsSheetShell";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import { useEmployeeRouteNotifications, useMarkRouteNotificationRead } from "@/hooks/useEmployeeRouteNotifications";
import { canCompleteEarly, type EarlyCompletionMode } from "@/lib/early-completion";
import RouteChecklistView from "@/components/employee-route/RouteChecklistView";
import { RouteWeatherStatus } from "@/components/employee/RouteWeatherStatus";
import RouteModeDialog from "@/components/employee-route/RouteModeDialog";
import { readRunMode, writeRunMode, buzz, type RouteRunMode } from "@/components/employee-route/RouteRunMode";
import { GeocodeServiceError, geocodeAddress } from "@/lib/geocode";
import {
  findSpeedOpportunity, minutesNow,
} from "@/components/employee-route/routeSlack";
import { ArrowUp, ArrowDown, Zap } from "lucide-react";
import { useDriveIssues, useWakeLock, useNightMode, useRootDark } from "@/components/employee-route/useDriveSafety";
import { Sun, Moon } from "lucide-react";
import { DriveIssueBanner } from "@/components/employee-route/DriveIssueBanner";
import { NightBasemap } from "@/components/employee-route/NightBasemap";
import { enqueueCompletion, flushQueue, isNetworkError, readQueue } from "@/lib/offline-stop-queue";
import { GoogleRouteMap, type GoogleRouteStop } from "@/components/employee-route/GoogleRouteMap";
import { googleMapsPreviouslyFailed, rememberGoogleMapsFailure, type GoogleMapsLoadError } from "@/lib/google-maps-loader";

/* ── Map icons ──────────────────────────────────────────────── */
const startIcon = L.divIcon({
  className: "route-map-marker",
  html: '<div class="route-map-pin route-map-pin-start"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M3 11l18-9-9 18-2-7-7-2z"/></svg></div>',
  iconSize: [36, 44], iconAnchor: [18, 44],
});
const stopIcons = new Map<string, L.DivIcon>();
const stopIcon = (n: number, state: "next" | "done" | "future", _color: string, highlighted = false) => {
  const key = `${n}-${state}-${highlighted}`;
  const existing = stopIcons.get(key);
  if (existing) return existing;
  const icon = L.divIcon({
    className: "route-map-marker",
    html: `<div class="route-map-pin route-map-pin-${state}${highlighted ? " route-map-pin-selected" : ""}"><span>${state === "done" ? '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 4 4L19 6"/></svg>' : n}</span></div>`,
    iconSize: [36, 44], iconAnchor: [18, 44],
  });
  if (stopIcons.size > 200) stopIcons.clear();
  stopIcons.set(key, icon);
  return icon;
};

/**
 * Serviceydere-stil navigation puck (blå accent).
 *
 * Vigtig detalje: vi opretter divIcon'et ÉN gang (stabil reference) — al
 * heading-rotation sker derefter via en CSS-transform på et indre element
 * med klasse `.nav-puck-rot`. Det gør at Leaflet IKKE re-renderer markøren
 * når headingen ændrer sig (hvilket ellers river DOM ned/op hver gang og
 * giver visuel hak under rute-opdateringer). Komponenten bruger en ref
 * til markøren og opdaterer transform direkte — samme pattern som Google
 * Maps' egen puck.
 */
const NAV_PUCK_ICON = L.divIcon({
  className: "",
  html: `<div class="nav-puck-rot"><img class="route-navigation-car" src="${navigationCar.url}" width="64" height="64" alt="Din bil" /></div>`,
  iconSize: [64, 64],
  iconAnchor: [32, 32],
});

/**
 * Stable nav puck marker — opretter Leaflet-markøren manuelt (uden
 * react-leaflet's <Marker>) så heading-opdateringer kan skrives direkte
 * på DOM via en CSS-transform. Position bliver også sat via setLatLng,
 * så der ikke sker re-mount per GPS-tick.
 */
const NavPuckMarker = ({
  track,
  fallback,
  moving,
}: {
  track: MotionSource;
  fallback: [number, number];
  /** Når false: vis kun prikken (ingen retningskegle, ingen rotation). */
  moving: boolean;
}) => {
  const map = useMap();
  const markerRef = useRef<LeafletMarker | null>(null);
  const movingRef = useRef(moving);
  movingRef.current = moving;

  // Mount marker once.
  useEffect(() => {
    const start = track.value?.pos ?? fallback;
    const m = L.marker(start, { icon: NAV_PUCK_ICON, interactive: false, keyboard: false, zIndexOffset: 1000 });
    m.addTo(map);
    markerRef.current = m;
    return () => {
      m.remove();
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Kegle-synlighed styres af React-state (ændrer sig sjældent).
  useEffect(() => {
    const el = markerRef.current?.getElement();
    const cone = el?.querySelector<HTMLElement>(".nav-puck-cone");
    if (cone) cone.style.opacity = moving ? "1" : "0";
  }, [moving]);

  // Position + rotation opdateres imperativt fra bevægelses-tracket, så
  // React aldrig re-renderer pr. frame.
  useEffect(() => {
    const shownHeading = { v: null as number | null };
    return track.subscribe(({ pos, heading }) => {
      const m = markerRef.current;
      if (!m) return;
      m.setLatLng(pos);
      if (heading == null || !movingRef.current) return;
      const prev = shownHeading.v;
      if (prev != null) {
        const delta = Math.abs(((heading - prev + 540) % 360) - 180);
        if (delta < 0.5) return;
      }
      const unwrapped = prev == null ? heading : prev + ((heading - prev + 540) % 360) - 180;
      shownHeading.v = unwrapped;
      const rot = m.getElement()?.querySelector<HTMLElement>(".nav-puck-rot");
      if (rot) rot.style.transform = `rotate(${unwrapped + map.getBearing()}deg)`;
    });
  }, [track]);

  return null;
};

const userDotIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:hsl(var(--info));border:3px solid hsl(var(--accent-foreground));box-shadow:0 0 0 7px hsl(var(--info) / 0.18),0 2px 6px rgba(0,0,0,.25);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/* ── Helpers ────────────────────────────────────────────────── */
const FitTo = ({ points, enabled }: { points: [number, number][]; enabled: boolean }) => {
  const map = useMap();
  const key = points.map((p) => p.join(",")).join(";");
  useEffect(() => {
    if (!enabled || !key) return;
    const coordinates = key.split(";").map((p) => p.split(",").map(Number) as [number, number]);
    map.stop();
    map.invalidateSize({ pan: false });
    map.fitBounds(L.latLngBounds(coordinates), { paddingTopLeft: [48, 65], paddingBottomRight: [48, 190], maxZoom: 16, animate: false });
  }, [key, map, enabled]);
  return null;
};

/**
 * Ét samlet kamera: center OG zoom styres af den samme komponent.
 *
 * Tidligere kørte pan (FollowUser) og zoom (useSmoothZoom) hver sin
 * Leaflet-animation. To overlappende animationer på samme kort giver
 * præcis den "rystende skærm" man oplevede. Her sætter vi i stedet
 * center+zoom i ét kald UDEN Leaflet-animation — positionen er allerede
 * blødt interpoleret af useSmoothPosition, så bevægelsen bliver jævn,
 * og der er ingen konkurrerende animationer at slås med.
 *
 * Desuden:
 *  - Vi opdaterer højst ~15 gange i sekundet og kun ved reel ændring
 *    (>1,5 m eller >0,08 zoomtrin) — det sparer batteri og varme.
 *  - Zoom følger farten (langsomt = tættere på), men glides med EMA så
 *    kortet ikke pumper ind og ud.
 *  - Står bilen stille, sker der ingenting overhovedet ("pause").
 */
const NavCamera = forwardRef<never, { active: boolean; track: MotionSource; speedMps: number; topHudRef?: React.RefObject<HTMLElement>; bottomHudRef?: React.RefObject<HTMLElement>; }>(({ active, track, speedMps, topHudRef, bottomHudRef }, _ref) => {
  const map = useMap();
  const speedRef = useRef(speedMps);
  speedRef.current = speedMps;

  useEffect(() => {
    if (!active) return;
    let last: { lat: number; lng: number; zoom: number } | null = null;
    let frame = 0;
    let zoom = 17;
    let pendingZoom = zoom;
    let pendingSince = 0;
    const unsubscribe = track.subscribe(({ pos, heading }) => {
      if (document.visibilityState === "hidden" || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const candidate = navigationZoom(speedRef.current, zoom);
        if (candidate !== pendingZoom) { pendingZoom = candidate; pendingSince = performance.now(); }
        if (candidate !== zoom && performance.now() - pendingSince > 6000) zoom = candidate;
        if (heading != null && speedRef.current > 1.2 && Math.abs(headingDelta(map.getBearing(), -heading)) > 0.5) map.setBearing(-heading);
        const moved = last ? haversineMeters(last.lat, last.lng, pos[0], pos[1]) : Infinity;
        if (last && moved < 0.05 && last.zoom === zoom) return;
        // Pan and puck consume the same sample, avoiding the previous 3–8 m catch-up jumps.
        // Keep the puck below the actual HUD, in the free map area (including on small phones).
        const stage = map.getContainer().parentElement;
        const top = map.getContainer().getBoundingClientRect().top;
        const hudBottom = topHudRef?.current ? topHudRef.current.getBoundingClientRect().bottom - top : 0;
        const bottom = Math.max(0, hudBottom);
        const height = map.getSize().y;
        const offset = Math.max(0, Math.min(height * 0.22, bottom / 2));
        map.stop();
        const projected = map.project(pos, zoom).subtract(L.point(0, offset));
        map.setView(map.unproject(projected, zoom), zoom, { animate: false });
        last = { lat: pos[0], lng: pos[1], zoom };
      });
    });
    return () => { unsubscribe(); cancelAnimationFrame(frame); };
  }, [active, map, track]);

  return null;
});
NavCamera.displayName = "NavCamera";

const DriveMapControls = forwardRef<never, { following: boolean; onFollow: () => void; onManualZoom: () => void }>(({ following, onFollow, onManualZoom }, _ref) => {
  const map = useMap();
  return (
    <div className="absolute right-3 top-1/2 z-[1000] flex -translate-y-1/2 flex-col overflow-hidden rounded-md border border-border/60 bg-card shadow-md sm:right-5">
      <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-none border-b border-border/60" onClick={() => { onManualZoom(); map.zoomIn(1); }} aria-label="Zoom ind">
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-none border-b border-border/60" onClick={() => { onManualZoom(); map.zoomOut(1); }} aria-label="Zoom ud">
        <Minus className="h-5 w-5" strokeWidth={2.5} />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-11 w-11 rounded-none" onClick={onFollow} aria-label="Centrer på min position">
        <Crosshair className="h-5 w-5" />
      </Button>
    </div>
  );
});
DriveMapControls.displayName = "DriveMapControls";

/** Pans (with light zoom) to a stop when the user taps it in the list. */
const FlyToStop = forwardRef<never, { target: [number, number] | null }>(({ target }, _ref) => {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.stop();
    map.setView(target, Math.max(Math.round(map.getZoom()), 16), { animate: false });
  }, [target?.[0], target?.[1], map]);
  return null;
});
FlyToStop.displayName = "FlyToStop";


const formatKm = (m: number | null) => (m == null ? "—" : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1).replace(".", ",")} km`);
/** Format total minutes as natural Danish route time, e.g. "3 t. 45 min.". */
const formatHoursMin = (mins: number | null | undefined): string => {
  if (mins == null || !Number.isFinite(mins)) return "—";
  const m = Math.max(0, Math.round(mins));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h} t.` : `${h} t. ${r} min.`;
};

const formatMin = (seconds: number | null) => {
  if (seconds == null) return "—";
  if (seconds < 60) return "<1 min";
  return formatHoursMin(seconds / 60);
};

/** Format absolute time (HH:mm) from Date in da-DK locale. */
const formatClock = (d: Date): string =>
  d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });

/** Format date as "ma. 25. apr". */
const formatDayDate = (d: Date): string =>
  d.toLocaleDateString("da-DK", { weekday: "short", day: "numeric", month: "short" });

const localDateKey = (d = new Date()): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/* ─────────────────────────────────────────────────────────── */
const EmployeeRoute = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { routeId } = useParams<{ routeId: string }>();

  if (loading) {
    return <RouteViewSkeleton />;
  }
  if (!user) return <Navigate to="/log-ind" replace />;
  if (!routeId) return <Navigate to="/medarbejder" replace />;

  return <RouteView routeId={routeId} onBack={() => navigate("/medarbejder")} />;
};

const RouteView = ({ routeId, onBack }: { routeId: string; onBack: () => void }) => {
  const topHudRef = useRef<HTMLDivElement>(null);
  const bottomHudRef = useRef<HTMLDivElement>(null);
  const { data, isLoading, isError: routeLoadError, refetch: retryRoute } = useMyRouteData(routeId);
  const updateStatus = useUpdateStopStatus();
  const startStopTime = useStartStopTime();
  const endStopTime = useEndStopTime();
  const resetStopTime = useResetStopTime();
  const optimizeLive = useOptimizeRouteFromPosition();
  const autoOptimizeRef = useRef(false);
  const navigate = useNavigate();
  // Tidlig udførelse — afgør om "Markér udført" må trykkes på fremtidige
  // rutedatoer. Samme resolver som EmployeeApp bruger på dagslisten.
  const { data: meEmp } = useMyEmployee();
  const { data: employeeNotifications = [] } = useEmployeeRouteNotifications();
  const markNotificationRead = useMarkRouteNotificationRead();
  const empMode = ((meEmp as any)?.early_completion_mode || "inherit") as EarlyCompletionMode;
  const { data: bizEarlyDefault = false } = useQuery({
    queryKey: ["business-early-default", meEmp?.business_id],
    enabled: !!meEmp?.business_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses")
        .select("allow_early_completion_default")
        .eq("id", meEmp?.business_id ?? "")
        .maybeSingle();
      return !!(data as any)?.allow_early_completion_default;
    },
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [listOpen, setListOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  // Default: kompakt (kun header) — så medarbejderen ALTID kan se kortet/ruten.
  // Detaljer kan udvides med ét tap på kortet.
  const [collapsed, setCollapsed] = useState(() => typeof window === "undefined" || window.innerWidth < 1024);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  // Rå GPS-fix fra browseren — sendes gennem useGpsFilter som udjævner
  // jitter inden vi bruger positionen til map/animation/distance-tjek.
  const [rawFix, setRawFix] = useState<{
    lat: number; lng: number; accuracy: number;
    heading: number | null; speed: number | null; t: number;
  } | null>(null);
  const [routeStarted, setRouteStarted] = useState(false);
  const [routeStartedAt, setRouteStartedAt] = useState<number | null>(null);
  const [clockNow, setClockNow] = useState(() => Date.now());
  useEffect(() => {
    if (!routeStarted) return;
    setClockNow(Date.now());
    const t = window.setInterval(() => setClockNow(Date.now()), 15_000);
    return () => window.clearInterval(t);
  }, [routeStarted]);
  // Tjekliste eller kørselsguide. Valget spørges første gang man starter en
  // rute og huskes derefter pr. enhed — men kan altid skiftes undervejs.
  const [runMode, setRunMode] = useState<RouteRunMode>(() => readRunMode() ?? "guide");
  const [modeDialogOpen, setModeDialogOpen] = useState(true);
  const [pendingStopId, setPendingStopId] = useState<string | null>(null);
  const [followMode, setFollowMode] = useState(true);
  const [nightMapFailed, setNightMapFailed] = useState(false);
  const [nightMapRetry, setNightMapRetry] = useState(0);
  const reportNightMapFailure = useCallback((failed: boolean) => setNightMapFailed(failed), []);
  // Google Maps first; the open map is a remembered per-session fallback so a rejected key never loops.
  // The key may arrive at runtime (business's own key), so always try Google unless it already failed this session.
  const [mapProvider, setMapProvider] = useState<"google" | "leaflet">(() => !googleMapsPreviouslyFailed() ? "google" : "leaflet");
  const [googleMapError, setGoogleMapError] = useState<string | null>(null);
  const handleGoogleFailure = useCallback((err: GoogleMapsLoadError) => {
    console.warn("Google Maps fallback:", err.reason, err.message);
    rememberGoogleMapsFailure(true);
    setGoogleMapError(err.reason === "auth" ? "Google-kortet er ikke tilladt på dette domæne endnu. Viser reservekortet." : err.reason === "timeout" ? "Google-kortet svarede ikke. Viser reservekortet." : "Google-kortet kunne ikke indlæses. Viser reservekortet.");
    setMapProvider("leaflet");
  }, []);
  const retryGoogleMap = useCallback(() => { rememberGoogleMapsFailure(false); setGoogleMapError(null); setMapProvider("google"); }, []);
  // Lyd-indstilling persistes i localStorage så valget overlever app-genstart
  // og lange perioder uden brug.  Initial værdi læses synkront for at undgå
  // at brugeren først ser "lyd til" og bagefter et flicker.
  const AUDIO_PREF_KEY = "serviceydere:employee-route:audio-enabled";
  const [audioEnabled, setAudioEnabledState] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    try {
      const stored = window.localStorage.getItem(AUDIO_PREF_KEY);
      if (stored === null) return true; // default = lyd til
      return stored === "1";
    } catch {
      return true;
    }
  });
  const setAudioEnabled = (next: boolean | ((prev: boolean) => boolean)) => {
    setAudioEnabledState((prev) => {
      const value = typeof next === "function" ? (next as (p: boolean) => boolean)(prev) : next;
      try {
        window.localStorage.setItem(AUDIO_PREF_KEY, value ? "1" : "0");
      } catch { /* ignorer storage-fejl (privacy mode etc.) */ }
      return value;
    });
  };
  const [undoPending, setUndoPending] = useState(false);
  const arrivedAnnouncedRef = useRef<Set<string>>(new Set());
  const finishedAnnouncedRef = useRef(false);
  const lastSpokenStepRef = useRef<string | null>(null);
  // Sticky step pointer — sikrer at turn-by-turn aldrig går baglæns ved GPS-jitter.
  const minStepIndexRef = useRef<{ stopId: string | null; idx: number }>({ stopId: null, idx: 0 });
  const [minStepIndex, setMinStepIndex] = useState(0);
  // Stabil rute-origin: kun opdateret når brugeren har bevæget sig markant.
  // Ellers ville useDirections refetche hver eneste GPS-tick → maneuver-banner ville flimre.
  const stableOriginRef = useRef<{ lat: number; lng: number } | null>(null);
  const originStopRef = useRef<string | null>(null);
  // Trafik-baseline kræver flere stabile målinger inden vi låser et "normalt" estimat.
  const baselineRef = useRef<{
    stopId: string;
    samples: { durationS: number; distanceM: number; t: number }[];
    baseDurationS: number | null;
    baseDistanceM: number | null;
    lockedAt: number | null;
  } | null>(null);
  const [trafficAlert, setTrafficAlert] = useState<
    | { addedMin: number; severity: "let" | "moderat" | "tæt" }
    | null
  >(null);
  const trafficSpokenRef = useRef<string | null>(null);

  /* ── Skærm slukket / app i baggrunden ──────────────────────────────
   * Vi pauser alt der bruger strøm (GPS-watch, positions-interpolation,
   * kort-kamera) og stopper tale.  Når skærmen kommer tilbage nulstiller
   * vi de "sidst sagte"-markører og holder munden lukket i et par
   * sekunder, indtil der er kommet et friskt GPS-fix — ellers ville
   * guiden læse instruktioner op fra før pausen ("drej til venstre" fra
   * en position man for længst har forladt). */
  const { visible: pageVisible, resumeToken } = usePageVisible();
  const speechGateRef = useRef(0);
  const voice = (text: string) => {
    if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
    if (Date.now() < speechGateRef.current) return;
    speak(text);
  };
  useEffect(() => {
    if (pageVisible) return;
    stopSpeaking();
  }, [pageVisible]);
  useEffect(() => {
    if (resumeToken === 0) return;
    stopSpeaking();
    // Gamle oplæsninger må ikke gentages, og nye må først komme når vi har
    // en frisk position (typisk 2-5 sek. efter at skærmen tændes igen).
    speechGateRef.current = Date.now() + 5000;
    lastSpokenStepRef.current = null;
    trafficSpokenRef.current = null;
    rerouteSpokenStopRef.current = null;
    setTrafficAlert(null);
    baselineRef.current = null;
    // Tving frisk beregning af næste ben ud fra den position vi nu står på.
    stableOriginRef.current = null;
    lastFixRef.current = null;
  }, [resumeToken]);


  // Off-route detection — vi tæller hvor mange GPS-fixes i træk vi har set
  // brugeren langt fra ruten, så vi kun kalder en reroute når der er reel
  // afvigelse (ikke et enkelt jitter-fix).
  const queryClient = useQueryClient();
  const offRouteStreakRef = useRef(0);
  const lastRerouteAtRef = useRef(0);
  const rerouteSpokenStopRef = useRef<string | null>(null);
  const [isRerouting, setIsRerouting] = useState(false);
  const [geocodeState, setGeocodeState] = useState<"idle" | "pending" | "done" | "failed">("idle");
  const [geocodeAttempt, setGeocodeAttempt] = useState(0);
  const [unresolvedAddresses, setUnresolvedAddresses] = useState<string[]>([]);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  /* Geolocation permission — husk på tværs af sessioner.
   * Browseren persisterer selv "granted/denied" pr. origin, men hvis
   * tilstanden er "granted" ønsker vi at starte watcheren med det samme,
   * så vi har en position klar når brugeren trykker "Start rute" — uden
   * at vise endnu en prompt. */
  const [gpsErrorCode, setGpsErrorCode] = useState<number | null>(null);
  const setGpsError = (_: null) => setGpsErrorCode(null);
  const reportGpsError = (error: GeolocationPositionError) => setGpsErrorCode(error.code);
  const [gpsRetry, setGpsRetry] = useState(0);
  const [lastFixAt, setLastFixAt] = useState<number | null>(null);
  const retryGps = () => {
    setGpsErrorCode(null);
    lastFixRef.current = null;
    setGpsRetry((n) => n + 1);
    navigator.geolocation?.getCurrentPosition(() => setLastFixAt(Date.now()), reportGpsError, { enableHighAccuracy: true, timeout: 12000 });
  };
  const [geoPermission, setGeoPermission] = useState<"granted" | "denied" | "prompt" | "unknown">("unknown");
  useEffect(() => {
    if (!("permissions" in navigator)) { setGeoPermission("unknown"); return; }
    let cancelled = false;
    (async () => {
      try {
        const status = await (navigator.permissions as any).query({ name: "geolocation" });
        if (cancelled) return;
        setGeoPermission(status.state);
        status.onchange = () => setGeoPermission(status.state);
      } catch {
        setGeoPermission("unknown");
      }
    })();
    return () => { cancelled = true; };
  }, []);

  /* Geolocation watcher — aktiv når kørselsguiden er i brug.
   *
   * Strøm og varme: vi drosler hvor ofte et fix bliver til en re-render.
   * Browseren leverer gerne 1-2 fixes i sekundet; det er langt mere end
   * kortet og ETA'en har brug for. Vi lukker derfor kun et fix igennem
   * hvert 2. sekund — eller med det samme hvis brugeren reelt har flyttet
   * sig mere end 25 m. Når fanen er skjult (telefonen i lommen) skipper vi
   * helt, så hverken kort eller animationer arbejder i baggrunden. */
  const lastFixRef = useRef<{ t: number; lat: number; lng: number } | null>(null);
  // Tjeklisten har intet kort, men virksomheden skal stadig kunne se, hvilken
  // aftale medarbejderen er ved. Vi henter derfor et enkelt, strømbesparende
  // fix hvert 30. sekund i stedet for kontinuerlig GPS.
  useEffect(() => {
    if (runMode !== "list" || !pageVisible || !routeStarted || !navigator.geolocation) return;
    const poll = () => navigator.geolocation.getCurrentPosition(
      (pos) => setRawFix({
        lat: pos.coords.latitude,
        lng: pos.coords.longitude,
        accuracy: typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : 50,
        heading: null,
        speed: null,
        t: pos.timestamp ?? Date.now(),
      }),
      () => {},
      { enableHighAccuracy: false, maximumAge: 20_000, timeout: 15_000 },
    );
    poll();
    const timer = window.setInterval(poll, 30_000);
    return () => window.clearInterval(timer);
  }, [runMode, pageVisible, routeStarted, geoPermission]);
  useEffect(() => {
    if (runMode === "list") return;
    // Skærmen slukket / app i baggrunden → ingen GPS overhovedet.
    // Watcheren nedlægges helt (ikke bare ignoreres), så radioen får ro
    // og telefonen hverken bliver varm eller tapper batteri.
    if (!pageVisible) return;
    const shouldWatch = routeStarted;
    if (!shouldWatch) return;
    if (!navigator.geolocation) return;
    const MIN_INTERVAL_MS = 750;
    const SIGNIFICANT_MOVE_M = 15;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
        setGpsError(null);
        setLastFixAt(Date.now());
        const now = pos.timestamp ?? Date.now();
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const prev = lastFixRef.current;
        if (prev) {
          const moved = haversineMeters(prev.lat, prev.lng, lat, lng);
          if (now - prev.t < MIN_INTERVAL_MS && moved < SIGNIFICANT_MOVE_M) return;
        }
        lastFixRef.current = { t: now, lat, lng };
        // Send rå fix gennem GPS-filteret nedenfor.  Vi bevarer adgangen
        // til accuracy + speed så filtret kan adaptive sin smoothing.
        setRawFix({
          lat,
          lng,
          accuracy: typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : 20,
          heading: typeof pos.coords.heading === "number" && !Number.isNaN(pos.coords.heading)
            ? pos.coords.heading : null,
          speed: typeof pos.coords.speed === "number" && !Number.isNaN(pos.coords.speed)
            ? pos.coords.speed : null,
          t: now,
        });
      },
      reportGpsError,
      { enableHighAccuracy: true, maximumAge: 0, timeout: 12000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [routeStarted, geoPermission, runMode, pageVisible, gpsRetry]);

  // Kør rå GPS-fixes gennem jitter-filteret.  Output er en udjævnet
  // position + heading + estimeret hastighed (sidstnævnte bruges også
  // til den hastigheds-adaptive zoom).
  // Positionsmotoren er eneste kilde til bilens position: den matcher fixes
  // til rutelinjen, afviser umulige spring og kører videre i tunneler.
  const { track: positionTrack, state: engineState, setRoute: setEngineRoute } = usePositionTrack(rawFix, routeStarted && pageVisible);
  useEffect(() => {
    if (!engineState) return;
    setUserPos((p) => (p && p[0] === engineState.pos[0] && p[1] === engineState.pos[1] ? p : engineState.pos));
    if (engineState.heading != null) setUserHeading(engineState.heading);
  }, [engineState]);
  const [recordDrive, setRecordDrive] = useState(() => { try { return sessionStorage.getItem("serviceydere:record-drive") === "1"; } catch { return false; } });
  const [traceOpen, setTraceOpen] = useState(false);
  useEffect(() => { try { sessionStorage.setItem("serviceydere:record-drive", recordDrive ? "1" : "0"); } catch { /* privat tilstand */ } }, [recordDrive]);
  useDriveRecorder(routeId, recordDrive && routeStarted, rawFix, positionTrack);
  const userSpeedMps = engineState?.speedMps ?? 0;
  const userAccuracyM = engineState?.accuracyM ?? null;
  const driving = routeStarted && runMode !== "list";
  useWakeLock(driving && pageVisible);
  const driveIssues = useDriveIssues({ active: !!routeStarted, permission: geoPermission, gpsErrorCode, lastFixAt: driving ? lastFixAt : null, accuracyM: driving ? userAccuracyM : null });
  const { night, toggle: toggleNight } = useNightMode();
  useRootDark(night);
  // Kortet bliver, hvor brugeren har lagt det; "Centrér" genoptager følgning.

  /* Bryd follow ved manuel kortinteraktion */
  const [mapTouchTick, setMapTouchTick] = useState(0);
  const breakFollow = () => { setMapTouchTick((t) => t + 1); if (followMode) setFollowMode(false); };

  const route = data?.route as (Route & { businesses?: { name?: string } }) | undefined;
  const stops = data?.stops || [];
  const routeDateKey = route?.route_date ? String(route.route_date).slice(0, 10) : null;
  const earlyAllowedForRoute = canCompleteEarly({
    routeAllow: (route as any)?.allow_early_completion,
    employeeMode: empMode,
    businessDefault: bizEarlyDefault,
  });
  const routeDateLocked = !!routeDateKey && routeDateKey > localDateKey() && !earlyAllowedForRoute;

  const sortedStops = useMemo(() => [...stops].sort((a, b) => a.sequence - b.sequence), [stops]);
  // Retain content through the sheet's exit animation and query refreshes.
  const selectedStopRef = useRef<RouteStop | null>(null);
  const selectedStop = sortedStops.find((stop) => stop.id === selectedId);
  if (selectedStop) selectedStopRef.current = selectedStop;
  useEffect(() => {
    const stopId = searchParams.get("stop");
    if (!stopId || !sortedStops.some((stop) => stop.id === stopId)) return;
    setHighlightedId(stopId);
    setFollowMode(false);
    setSelectedId(stopId);
    const next = new URLSearchParams(searchParams);
    next.delete("stop");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, sortedStops]);
  const validStops = useMemo(
    () => sortedStops.filter((s) => s.latitude != null && s.longitude != null),
    [sortedStops],
  );

  // Geokod stop der mangler koordinater via appens loginbeskyttede opslag.
  // Resultatet forsøges gemt på stoppet, så adressen kun slås op én gang.
  const geocodingRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    const missing = sortedStops.filter(
      (s) => (s.latitude == null || s.longitude == null) && (s.full_address || s.address) && !geocodingRef.current.has(s.id),
    );
    const routeNeedsCoordinates = !!route?.start_address && (route.start_latitude == null || route.start_longitude == null);
    if (missing.length === 0 && !routeNeedsCoordinates) {
      setGeocodeState("done");
      return;
    }
    setGeocodeState("pending");
    setGeocodeError(null);
    missing.forEach((s) => geocodingRef.current.add(s.id));
    let cancelled = false;
    (async () => {
      let foundCoordinates = false;
      let routeHit: Awaited<ReturnType<typeof geocodeAddress>> = null;
      const stopHits = new Map<string, NonNullable<Awaited<ReturnType<typeof geocodeAddress>>>>();
      let resolvedRoute: Awaited<ReturnType<typeof geocodeAddress>> = null;
      let resolvedStops: Array<Awaited<ReturnType<typeof geocodeAddress>>> = [];
      try {
        [resolvedRoute, ...resolvedStops] = await Promise.all([
          routeNeedsCoordinates && route?.start_address ? geocodeAddress(route.start_address) : Promise.resolve(null),
          ...missing.map((stop) => geocodeAddress(stop.full_address || stop.address || "")),
        ]);
      } catch (error) {
        if (!cancelled) {
          setGeocodeError(error instanceof GeocodeServiceError ? error.message : "Adresseopslaget mislykkedes");
          setGeocodeState("failed");
        }
        return;
      }
      routeHit = resolvedRoute;
      if (routeHit) foundCoordinates = true;
      const unresolved: string[] = [];
      missing.forEach((stop, index) => {
        const hit = resolvedStops[index];
        if (hit) {
          foundCoordinates = true;
          stopHits.set(stop.id, hit);
        } else {
          unresolved.push(stop.full_address || stop.address || stop.customer_name || `Stop ${index + 1}`);
        }
      });
      if (cancelled) return;
      setUnresolvedAddresses(unresolved);
      queryClient.setQueriesData<any>({ queryKey: ["my-route-data", routeId] }, (old: any) =>
        old
          ? {
              ...old,
              route: routeHit
                ? { ...old.route, start_latitude: routeHit.latitude, start_longitude: routeHit.longitude }
                : old.route,
              stops: (old.stops || []).map((x: RouteStop) => {
                const hit = stopHits.get(x.id);
                return hit ? { ...x, latitude: hit.latitude, longitude: hit.longitude } : x;
              }),
            }
          : old,
      );
      if (routeHit) {
        try {
          await supabase.from("routes").update({ start_latitude: routeHit.latitude, start_longitude: routeHit.longitude }).eq("id", routeId);
        } catch {
          // Ikke fatalt — kortet bruger koordinaterne fra cachen.
        }
      }
      for (const [stopId, hit] of stopHits) {
        try {
          await supabase.from("route_stops").update({ latitude: hit.latitude, longitude: hit.longitude }).eq("id", stopId);
        } catch {
          // Ikke fatalt — kortet bruger koordinaterne fra cachen.
        }
      }
      if (!cancelled) setGeocodeState(foundCoordinates ? "done" : "failed");
    })();
    return () => { cancelled = true; };
  }, [sortedStops, route?.start_address, route?.start_latitude, route?.start_longitude, queryClient, routeId, geocodeAttempt]);

  const retryGeocoding = () => {
    geocodingRef.current.clear();
    setUnresolvedAddresses([]);
    setGeocodeError(null);
    setGeocodeState("idle");
    setGeocodeAttempt((attempt) => attempt + 1);
  };
  const nextStopIdx = sortedStops.findIndex((s) => s.status !== "completed");
  const nextStop: RouteStop | undefined = nextStopIdx >= 0 ? sortedStops[nextStopIdx] : undefined;
  const { data: nextStopOrder } = useOrderForStop(nextStop?.order_id ?? null);
  const { data: nextStopTimeEntries = [], isLoading: timeLoading, isError: timeError } = useStopTimeEntries(sortedStops.map(s => s.id));
  const activeNextStopEntry = nextStopTimeEntries.find(
    (entry) => entry.stop_id === nextStop?.id && entry.employee_id === meEmp?.id && !entry.ended_at,
  );
  const activeRouteEntry = nextStopTimeEntries.find(
    (entry) => entry.employee_id === meEmp?.id && !entry.ended_at,
  );
  const activeRouteStop = activeRouteEntry ? sortedStops.find((stop) => stop.id === activeRouteEntry.stop_id) : undefined;
  const [timerNow, setTimerNow] = useState(() => Date.now());
  useEffect(() => {
    if (!activeRouteEntry) return;
    setTimerNow(Date.now());
    const timer = window.setInterval(() => setTimerNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [activeRouteEntry?.id]);
  const activeNextStopSeconds = activeRouteEntry
    ? Math.max(0, Math.floor((timerNow - new Date(activeRouteEntry.started_at).getTime()) / 1000))
    : null;
  const activeNextStopLabel = activeNextStopSeconds == null
    ? null
    : [Math.floor(activeNextStopSeconds / 3600), Math.floor((activeNextStopSeconds % 3600) / 60), activeNextStopSeconds % 60]
        .map((value) => String(value).padStart(2, "0"))
        .join(":");
  // Knyt kun live-positionen til et stop, når medarbejderen faktisk er ved
  // adressen. Det forhindrer, at næste aftale markeres grøn under hele køreturen.
  const liveStopId = useMemo(() => {
    if (!engineState) return null;
    const accuracyAllowance = Math.min(Math.max(engineState.accuracyM, 0), 40);
    const arrivalRadiusM = Math.max(100, 60 + accuracyAllowance);
    let nearest: { id: string; distanceM: number } | null = null;
    for (const stop of sortedStops) {
      if (stop.status === "completed" || stop.latitude == null || stop.longitude == null) continue;
      const distanceM = haversineMeters(
        engineState.pos[0],
        engineState.pos[1],
        Number(stop.latitude),
        Number(stop.longitude),
      );
      if (!nearest || distanceM < nearest.distanceM) nearest = { id: stop.id, distanceM };
    }
    return nearest && nearest.distanceM <= arrivalRadiusM ? nearest.id : null;
  }, [engineState, sortedStops]);
  const routeNotifications = employeeNotifications.filter((item) => item.route_id === routeId && !item.read_at);

  useEffect(() => {
    if (!routeStarted || !pageVisible || !engineState || !meEmp?.id || !route) return;
    let cancelled = false;
    const pushPosition = async () => {
      if (cancelled) return;
      const { error } = await supabase.rpc("report_route_position", {
        _route_id: routeId,
        _latitude: engineState.pos[0],
        _longitude: engineState.pos[1],
        _heading: engineState.heading ?? undefined,
        _accuracy_m: engineState.accuracyM ?? undefined,
        _speed_mps: engineState.speedMps ?? undefined,
        _current_stop_id: liveStopId ?? undefined,
      });
      if (error) console.warn("[live-position] kunne ikke sendes", error.message);
    };
    void pushPosition();
    const timer = window.setInterval(pushPosition, 5_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [routeStarted, pageVisible, routeId, route?.id, meEmp?.id, liveStopId, engineState?.pos[0], engineState?.pos[1]]);

  useEffect(() => {
    return () => { void supabase.rpc("clear_route_position", { _route_id: routeId }); };
  }, [routeId]);

  const startCoord: [number, number] | null = useMemo(() => {
    if (!route) return null;
    return route.start_latitude != null && route.start_longitude != null
      ? [Number(route.start_latitude), Number(route.start_longitude)]
      : null;
  }, [route]);

  const lastCompleted = useMemo(
    () => [...sortedStops].reverse().find((s) => s.status === "completed" && s.latitude != null && s.longitude != null),
    [sortedStops],
  );

  // Rutens startpunkt sættes kun ved første fix, når næste stop skifter og
  // ved afvigelse (reroute). Tidligere blev det flyttet hver 120 m, så
  // rutelinjen blev udskiftet og hentet igen konstant under kørsel — det gav
  // hop i bilen og mange unødige rutekald. Positionsmotoren følger nu linjen.
  if (userPos) {
    const nextId = nextStop?.id ?? null;
    if (!stableOriginRef.current || originStopRef.current !== nextId) {
      stableOriginRef.current = { lat: userPos[0], lng: userPos[1] };
      originStopRef.current = nextId;
    }
  }
  const legOrigin: { lat: number; lng: number } | null = stableOriginRef.current
    ? stableOriginRef.current
    : lastCompleted
      ? { lat: Number(lastCompleted.latitude), lng: Number(lastCompleted.longitude) }
      : startCoord
        ? { lat: startCoord[0], lng: startCoord[1] }
        : null;

  const legWaypoints = useMemo(() => {
    if (!nextStop || nextStop.latitude == null || nextStop.longitude == null || !legOrigin) return null;
    return [legOrigin, { lat: Number(nextStop.latitude), lng: Number(nextStop.longitude) }];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [legOrigin?.lat, legOrigin?.lng, nextStop?.latitude, nextStop?.longitude]);

  const { data: directions, isError: directionsError, refetch: retryDirections } = useDirections(legWaypoints, {
    businessId: route?.business_id,
    navigation: true,
  });

  /* ── Preview directions: hele den planlagte rute, vist FØR brugeren
   * starter med at køre, så medarbejderen tydeligt kan se hele turen
   * (ikke kun næste leg). Bygges fra startCoord + alle ikke-færdige stop
   * i rækkefølge. Vi henter den kun når routeStarted=false så vi ikke
   * dobbelt-fetch'er undervejs.
   */
  const previewWaypoints = useMemo(() => {
    const wps: { lat: number; lng: number }[] = [];
    // Før start: hele turen fra startadressen. Under kørsel: resten af
    // dagen fra næste stop og frem, så en ny rækkefølge straks kan ses
    // på kortet (det aktive ben tegnes ovenpå).
    if (!routeStarted && startCoord) wps.push({ lat: startCoord[0], lng: startCoord[1] });
    for (const s of sortedStops) {
      if (s.status === "completed") continue;
      if (s.latitude == null || s.longitude == null) continue;
      wps.push({ lat: Number(s.latitude), lng: Number(s.longitude) });
    }
    return wps.length >= 2 ? wps : null;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeStarted, startCoord?.[0], startCoord?.[1], sortedStops]);
  const { data: previewDirections } = useDirections(previewWaypoints, {
    businessId: route?.business_id,
  });
  const previewLine: [number, number][] = useMemo(() => {
    if (!previewDirections?.geometry?.coordinates || previewDirections.provider === "fallback") return [];
    const raw = previewDirections.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
    // Spline-glat ruten så drej og bløde sving fremstår uden "knæk".
    return raw;
  }, [previewDirections]);

  const distanceToNextM: number | null = useMemo(() => {
    if (!userPos || !nextStop || nextStop.latitude == null || nextStop.longitude == null) return null;
    return haversineMeters(userPos[0], userPos[1], Number(nextStop.latitude), Number(nextStop.longitude));
  }, [userPos, nextStop?.id, nextStop?.latitude, nextStop?.longitude]);

  // Recognize parking near an entrance, but require low speed and usable GPS.
  const arrivalThresholdM = arrivalRadius(userAccuracyM);
  // Hysterese: vi træder IND i ankomstzonen ved radius, men træder først
  // UD igen ved 1,8 × radius.  Uden det skifter kortet mellem "fremme" og
  // "kør videre" hver gang GPS sitrer et par meter — præcis den "frem og
  // tilbage"-opførsel der gør guiden forvirrende at stå med i hånden.
  const wasInArrivalRef = useRef(false);
  const arrivalStopIdRef = useRef<string | undefined>(undefined);
  const inArrivalRadius = useMemo(() => {
    if (arrivalStopIdRef.current !== nextStop?.id) {
      wasInArrivalRef.current = false;
      arrivalStopIdRef.current = nextStop?.id;
    }
    if (distanceToNextM == null || userSpeedMps > 3 || (userAccuracyM ?? 20) > 100) return false;
    const exit = arrivalThresholdM * 1.4;
    const next = wasInArrivalRef.current
      ? distanceToNextM <= exit
      : distanceToNextM <= arrivalThresholdM;
    wasInArrivalRef.current = next;
    return next;
  }, [distanceToNextM, arrivalThresholdM, nextStop?.id, userSpeedMps, userAccuracyM]);

  // Stabiliseret ankomst — kræv at vi har været inden for radius i et par
  // sekunder før vi flipper "fremme" til true.  Det forhindrer at en enkelt
  // jitter-måling udløser ankomst, men føles stadig øjeblikkeligt når man
  // holder ind foran adressen.
  const ARRIVAL_DWELL_MS = arrivalDwellMs(distanceToNextM, userSpeedMps, userAccuracyM);
  const arrivalEnteredAtRef = useRef<number | null>(null);
  const arrivalStableForStopRef = useRef<string | null>(null);
  const [stableArrival, setStableArrival] = useState<string | null>(null);

  useEffect(() => {
    // Skift af stop nulstiller dvælet og den stabile flag.
    arrivalEnteredAtRef.current = null;
    wasInArrivalRef.current = false;
    arrivalStableForStopRef.current = null;
    setStableArrival(null);
  }, [nextStop?.id]);

  useEffect(() => {
    if (!nextStop) return;
    if (!inArrivalRadius) {
      // Ude af radius — nulstil timer og evt. tidligere stabil tilstand.
      arrivalEnteredAtRef.current = null;
      if (stableArrival) setStableArrival(null);
      arrivalStableForStopRef.current = null;
      return;
    }
    // Inde i radius — hvis vi allerede er stabil, gør intet.
    if (arrivalStableForStopRef.current === nextStop.id) return;

    if (arrivalEnteredAtRef.current == null) {
      arrivalEnteredAtRef.current = Date.now();
    }
    const elapsed = Date.now() - arrivalEnteredAtRef.current;
    // Parkeret: under 1 km/t inden for 35 m — genkend ankomst med det samme.
    const parked = ARRIVAL_DWELL_MS === 0;
    if (parked || elapsed >= ARRIVAL_DWELL_MS) {
      arrivalStableForStopRef.current = nextStop.id;
      setStableArrival(nextStop.id);
      return;
    }
    // Polling-tjek så vi flipper præcis når dvælet er opfyldt, selv om
    // GPS ikke leverer et nyt fix lige i tide.
    const remaining = ARRIVAL_DWELL_MS - elapsed;
    const timeout = window.setTimeout(() => {
      if (arrivalEnteredAtRef.current != null && nextStop) {
        arrivalStableForStopRef.current = nextStop.id;
        setStableArrival(nextStop.id);
      }
    }, remaining + 50);
    return () => window.clearTimeout(timeout);
  }, [inArrivalRadius, nextStop?.id, stableArrival, distanceToNextM, userSpeedMps, ARRIVAL_DWELL_MS]);

  // An arrival for the previous stop must never start the next appointment.
  const isAtNextStop = !!nextStop && stableArrival === nextStop.id;

  /* Ankomstlyd */
  useEffect(() => {
    if (!isAtNextStop || !nextStop || !audioEnabled) return;
    if (arrivedAnnouncedRef.current.has(nextStop.id)) return;
    arrivedAnnouncedRef.current.add(nextStop.id);
    playArrivalChime();
    const name = nextStop.customer_name || "stoppet";
    setTimeout(() => voice(`Du er ankommet til ${name}`), 600);
  }, [isAtNextStop, nextStop?.id, audioEnabled]);

  // Parking records arrival only. Work time starts with the explicit Start work action.

  const legLine: [number, number][] = useMemo(() => {
    if (!directions?.geometry?.coordinates || directions.provider === "fallback") return [];
    const raw = directions.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
    return raw;
  }, [directions]);
  useEffect(() => { setEngineRoute(legLine); }, [legLine, setEngineRoute]);
  // Google traffic intervals (index ranges on the leg geometry) → coloured segments like Google Maps.
  const trafficSegments = useMemo(() => {
    const t = (directions as { traffic?: { start: number; end: number; speed: string }[] } | undefined)?.traffic;
    if (!t?.length || legLine.length < 2) return [];
    return t.filter((x) => x.speed !== "NORMAL" && x.end > x.start)
      .map((x) => ({ speed: x.speed as "SLOW" | "TRAFFIC_JAM", points: legLine.slice(x.start, x.end + 1) }))
      .filter((x) => x.points.length > 1);
  }, [directions, legLine]);

  /* ── Off-route detection (Google-Maps-stil rerouting) ──────────────
   * Når brugeren afviger >40 m fra ruten i 3+ konsekutive GPS-fixes
   * tvinger vi en ny rute fra den nuværende position. Vi venter mindst
   * 8 sek mellem reroutes for ikke at hamre på endpointet ved jitter
   * eller når man netop har drejet væk.
   *
   * Reroute = opdater stableOriginRef + invalidér den gamle
   * directions-cache, så useDirections automatisk fetcher nyt geometri.
   */
  const liveRoadProgress = useMemo(() => userPos && legLine.length > 1 ? roadProgress(userPos, legLine) : null, [userPos, legLine]);
  const liveDistanceM = liveRoadProgress && liveRoadProgress.offRoad < 60 ? liveRoadProgress.remaining : directions?.distance_m ?? distanceToNextM;
  const liveDurationS = directions?.duration_s != null && liveRoadProgress && liveRoadProgress.total > 0
    ? directions.duration_s * Math.min(1, liveRoadProgress.remaining / liveRoadProgress.total)
    : directions?.duration_s ?? null;

  const OFF_ROUTE_STREAK = 3;
  const REROUTE_COOLDOWN_MS = 8000;
  useEffect(() => {
    if (!routeStarted || !userPos || legLine.length < 2 || !nextStop) {
      offRouteStreakRef.current = 0;
      return;
    }
    // Hvis vi er meget tæt på destinationen, så er rerouting irrelevant —
    // ankomstlogikken overtager.
    if (distanceToNextM != null && distanceToNextM < 120) {
      offRouteStreakRef.current = 0;
      return;
    }
    // Motoren afgør afvigelse med hysterese (3 fixes over 45 m); den viste
    // position er trukket ind på vejen, så den kan ikke bruges til afstand.
    if (engineState && !engineState.onRoute && engineState.offRouteFixes >= OFF_ROUTE_STREAK) {
      offRouteStreakRef.current = engineState.offRouteFixes;
    } else {
      offRouteStreakRef.current = 0;
      if (isRerouting) setIsRerouting(false);
      return;
    }
    const now = Date.now();
    if (
      offRouteStreakRef.current >= OFF_ROUTE_STREAK &&
      now - lastRerouteAtRef.current > REROUTE_COOLDOWN_MS
    ) {
      lastRerouteAtRef.current = now;
      offRouteStreakRef.current = 0;
      setIsRerouting(true);
      // Opdatér også resten af stoprækkefølgen diskret, når bilen reelt har
      // forladt den beregnede vej. Det aktive stop bevares tæt på adressen.
      void reoptRef.current?.({ silent: true, excludeId: distanceToNextM != null && distanceToNextM < 200 ? nextStop.id : undefined });
      // Tving en ny origin — det invaliderer legWaypoints og udløser ny fetch.
      stableOriginRef.current = { lat: userPos[0], lng: userPos[1] };
      // Drop cache for directions så vi ikke får et stalt geometri tilbage.
      queryClient.invalidateQueries({ queryKey: ["directions"] });
      // Reset turn-by-turn pointer så vi ikke holder fast i et gammelt step.
      minStepIndexRef.current = { stopId: nextStop.id, idx: 0 };
      setMinStepIndex(0);
      // Reset trafik-baseline — den gamle baseline gælder ikke for ny rute.
      baselineRef.current = null;
      setTrafficAlert(null);
      // Brugerfeedback à la Google Maps.
      toast.message("Genberegner rute…", { duration: 2500 });
      if (audioEnabled && rerouteSpokenStopRef.current !== nextStop.id) {
        rerouteSpokenStopRef.current = nextStop.id;
        playRerouteCue();
      }
      // Auto-skjul "rerouting" indikator efter 3 sek selv hvis der ikke er
      // landet et nyt directions-svar (typisk ankommer det inden for 1-2 sek).
      setTimeout(() => setIsRerouting(false), 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [engineState, legLine, nextStop?.id, distanceToNextM, routeStarted, audioEnabled]);

  // Reset reroute-spoken pointer når næste stop ændrer sig så vi får
  // ny stemmebesked ved næste reroute event.
  useEffect(() => {
    rerouteSpokenStopRef.current = null;
  }, [nextStop?.id]);

  /* Er vi reelt i bevægelse?  Bruges til at fastfryse pilen når bilen
   * holder stille — ellers snurrer den rundt på ren GPS-støj. */
  const isMoving = engineState?.moving ?? false;
  const lastHeadingRef = useRef<number | null>(null);
  const derivedHeading = useMemo(() => {
    // 1) Filtreret GPS-heading er altid bedst når den findes.
    if (userHeading != null) {
      lastHeadingRef.current = userHeading;
      return userHeading;
    }
    // Ingen "lige linje mod næste stop": den peger hen over marker.
    // 3) Holder vi stille: behold den sidst kendte retning.
    return lastHeadingRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userHeading]);

  // Blød bevægelse mellem GPS-fixes. Interpolationen sker UDEN for React
  // (MotionTrack) og skrives direkte på Leaflet-markøren og kameraet — så
  // siden kun re-renderer når der kommer et nyt fix. Det var tidligere
  // ~60 re-renders i sekundet, hvilket gjorde telefonen varm.
  const motionTrack = positionTrack;
  const displayPos = userPos;
  const displayHeading = derivedHeading;

  const allPoints: [number, number][] = useMemo(() => {
    const pts: [number, number][] = [];
    if (startCoord) pts.push(startCoord);
    for (const s of validStops) pts.push([Number(s.latitude), Number(s.longitude)]);
    return pts;
  }, [startCoord, validStops]);
  const hasMapPoint = allPoints.length > 0 || userPos !== null;

  const completedCount = sortedStops.filter((s) => s.status === "completed").length;
  const allDone = sortedStops.length > 0 && completedCount === sortedStops.length;
  const latestCompleted = sortedStops.filter(s => s.status === "completed").sort((a, b) => (b.completed_at ?? "").localeCompare(a.completed_at ?? ""))[0];
  const finishedAt = allDone && latestCompleted?.completed_at ? new Date(latestCompleted.completed_at).getTime() : null;
  const runStart = routeStartedAt ?? getRouteStartedAt(routeId);
  const metrics = runMetrics(runStart, finishedAt ?? Math.max(clockNow, timerNow), nextStopTimeEntries, meEmp?.id);
  const actualArrival = nextStop ? readArrival(routeId, nextStop.id) : null;
  const [arrivalRevision, setArrivalRevision] = useState(0);
  useEffect(() => {
    if (isAtNextStop && nextStop && !readArrival(routeId, nextStop.id)) {
      saveArrival(routeId, nextStop.id, Date.now());
      setArrivalRevision(v => v + 1);
    }
  }, [isAtNextStop, nextStop?.id, routeId]);
  const progress = sortedStops.length > 0 ? (completedCount / sortedStops.length) * 100 : 0;
  useEffect(() => {
    if (!allDone || !routeStarted) return;
    void supabase.rpc("clear_route_position", { _route_id: routeId });
  }, [allDone, routeStarted, routeId]);
  // Brug Serviceydere accent (dark-blue) som primær handlings-farve i kort-UI'et.
  // route.color beholdes til badges/rute-identifikation i kalenderen.
  const googleStops: GoogleRouteStop[] = useMemo(() => sortedStops.flatMap((s, i) => s.latitude == null || s.longitude == null ? [] : [{
    id: s.id, name: s.customer_name || undefined, n: i + 1, pos: [Number(s.latitude), Number(s.longitude)] as [number, number],
    state: (s.status === "completed" ? "done" : s.id === nextStop?.id ? "next" : "future") as GoogleRouteStop["state"],
    highlighted: s.id === highlightedId,
  }]), [sortedStops, nextStop?.id, highlightedId]);
  const nextPoint: [number, number] | null = nextStop?.latitude != null && nextStop?.longitude != null ? [Number(nextStop.latitude), Number(nextStop.longitude)] : null;
  const googleHintLine = useMemo(() => {
    if (!displayPos || !nextPoint) return null;
    if (isAtNextStop) return { points: [displayPos, nextPoint], kind: "arrival" as const };
    if (routeStarted && legLine.length < 2) return { points: [displayPos, nextPoint], kind: "direction" as const };
    return null;
  }, [displayPos?.[0], displayPos?.[1], nextPoint?.[0], nextPoint?.[1], isAtNextStop, routeStarted, legLine.length]);
  const highlightedPoint: [number, number] | null = useMemo(() => {
    const h = sortedStops.find((s) => s.id === highlightedId);
    return h && h.latitude != null && h.longitude != null ? [Number(h.latitude), Number(h.longitude)] : null;
  }, [sortedStops, highlightedId]);
  const themeColor = "hsl(var(--accent))";
  // Leaflet sætter pathOptions som SVG-attributter, hvor var() ikke opløses —
  // derfor slås tokens op til konkrete farver til kortlinjerne.
  const mapAccentColor = resolveMapColor("--accent", "hsl(184 90% 42%)");
  const mapSuccessColor = resolveMapColor("--success", "hsl(142 71% 38%)");
  const routeBadgeColor = route?.color || "hsl(var(--accent))";

  /* Fanfare ved dagsfærdig */
  useEffect(() => {
    if (!allDone || finishedAnnouncedRef.current || !audioEnabled) return;
    finishedAnnouncedRef.current = true;
    playCompleteFanfare();
  }, [allDone, audioEnabled]);

  // One stop-scoped estimate survives view switches and reloads. A route's
  // scheduled time is never substituted for a GPS-based arrival estimate.
  useEffect(() => {
    if (!driving || !nextStop || liveDurationS == null || !lastFixAt || Date.now() - lastFixAt > 60_000) return;
    saveArrivalEstimate(routeId, nextStop.id, Date.now() + liveDurationS * 1000);
    setArrivalRevision(v => v + 1);
  }, [driving, routeId, nextStop?.id, liveDurationS, lastFixAt]);
  const etaLabel = useMemo(() => {
    const eta = nextStop ? readArrivalEstimate(routeId, nextStop.id) : null;
    return eta == null ? null : formatClockTime(eta);
  }, [routeId, nextStop?.id, arrivalRevision, clockNow]);

  /* Resterende stop bruges til ruteoptimering og navigation. */
  const remainingStops = useMemo(
    () => sortedStops.filter((s) => s.status !== "completed"),
    [sortedStops],
  );

  /* Find en kortere rækkefølge lokalt, så det også virker uden dækning. */
  const [clockTick, setClockTick] = useState(0);
  useEffect(() => {
    if (!pageVisible) return;
    const t = setInterval(() => setClockTick((v) => v + 1), 60_000);
    return () => clearInterval(t);
  }, [pageVisible]);

  // Kvantisér positionen til ~100 m, så tallene ikke hopper ved GPS-støj.
  const flexOrigin: [number, number] | null = useMemo(() => {
    const p = userPos ?? startCoord;
    if (!p) return null;
    return [Math.round(p[0] * 1000) / 1000, Math.round(p[1] * 1000) / 1000];
  }, [userPos?.[0], userPos?.[1], startCoord?.[0], startCoord?.[1]]);

  const speedOpp = useMemo(
    () => findSpeedOpportunity(remainingStops, flexOrigin, minutesNow()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [remainingStops, flexOrigin?.[0], flexOrigin?.[1], clockTick],
  );
  const reorderStops = useReorderStops();
  const reoptRef = useRef<((o?: { silent?: boolean; excludeId?: string }) => Promise<void>) | null>(null);
  const lastAutoOptRef = useRef(0);

  /* Automatisk omlægning under kørsel — kun når der er meget at hente,
   * man ikke er lige ved at køre ind til næste stop, og højst hvert 5. min. */
  useEffect(() => {
    if (!routeStarted || runMode !== "guide" || !pageVisible) return;
    if (!speedOpp.worth || (speedOpp.savedMin < 15 && speedOpp.fixesViolations === 0)) return;
    if (optimizeLive.isPending || !reoptRef.current) return;
    if (distanceToNextM != null && distanceToNextM < 500) return;
    if (Date.now() - lastAutoOptRef.current < 5 * 60_000) return;
    lastAutoOptRef.current = Date.now();
    void reoptRef.current({ silent: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [speedOpp.worth, speedOpp.savedMin, speedOpp.fixesViolations, routeStarted, runMode, pageVisible]);
  const todayLabel = useMemo(() => formatDayDate(new Date()), []);

  /* Trafik-overvågning — robust mod GPS-jitter, omkørsel og korte ture.
   *
   * Vi vil kun vise "trafik" når den ekstra ventetid med stor sandsynlighed
   * skyldes faktisk forsinkelse — ikke at brugeren har bevæget sig væk fra
   * stoppet (omkørsel/forkert vej) eller at GPS-fixet hopper.
   *
   * Regler:
   *   1. Saml mindst 3 målinger over ≥30 sek før vi låser baseline.
   *   2. Baseline = mediandurationen blandt målingerne.
   *   3. Trafik kun når dist-til-stop er nogenlunde uændret (±15 %).
   *   4. Ekstra tid skal være ≥3 min OG ≥30 % over baseline OG turen
   *      skal i forvejen være ≥10 min — undgår 1138 %-skud på små ture.
   *   5. Kvalitativ severity: let / moderat / tæt — ingen procenter i UI.
   *   6. Auto-clear når delta falder under 90 sek.
   */
  useEffect(() => {
    if (!routeStarted || !nextStop || !directions?.duration_s) return;
    const curDur = directions.duration_s;
    const curDist = directions.distance_m ?? 0;
    const now = Date.now();

    let state = baselineRef.current;
    if (!state || state.stopId !== nextStop.id) {
      state = {
        stopId: nextStop.id,
        samples: [],
        baseDurationS: null,
        baseDistanceM: null,
        lockedAt: null,
      };
      baselineRef.current = state;
      setTrafficAlert(null);
    }

    // Indsæt sample, behold de seneste ~12.
    state.samples.push({ durationS: curDur, distanceM: curDist, t: now });
    if (state.samples.length > 12) state.samples.shift();

    // Lås baseline når vi har nok stabile data.
    if (!state.lockedAt && state.samples.length >= 3) {
      const oldest = state.samples[0];
      if (now - oldest.t >= 30_000) {
        const sortedDur = [...state.samples].map((s) => s.durationS).sort((a, b) => a - b);
        const sortedDist = [...state.samples].map((s) => s.distanceM).sort((a, b) => a - b);
        state.baseDurationS = sortedDur[Math.floor(sortedDur.length / 2)];
        state.baseDistanceM = sortedDist[Math.floor(sortedDist.length / 2)];
        state.lockedAt = now;
      }
    }

    if (!state.lockedAt || state.baseDurationS == null || state.baseDistanceM == null) return;

    // Tillad at baseline ned-justeres naturligt når man nærmer sig stoppet.
    if (curDur < state.baseDurationS && curDist < state.baseDistanceM) {
      state.baseDurationS = curDur;
      state.baseDistanceM = curDist;
    }

    const baseDur = state.baseDurationS;
    const baseDist = state.baseDistanceM;
    const distRatio = baseDist > 0 ? curDist / baseDist : 1;

    // Hvis distancen er steget markant, er det IKKE trafik — det er omkørsel/væk fra stop.
    if (distRatio > 1.15) {
      setTrafficAlert(null);
      return;
    }

    const deltaSec = curDur - baseDur;
    const deltaMin = deltaSec / 60;
    const deltaPct = (deltaSec / Math.max(baseDur, 60)) * 100;

    // Auto-clear ved lav delta.
    if (deltaSec < 90) {
      setTrafficAlert(null);
      return;
    }

    // Krav til faktisk visning: kun ved længere ture og rimelig procent-stigning.
    const baseDurMin = baseDur / 60;
    const significant =
      baseDurMin >= 10 && // kun ved ture på 10+ min — 1 min ekstra på en 3-min-tur er meningsløst
      deltaMin >= 3 &&
      deltaPct >= 30 &&
      deltaPct <= 200; // hvis det er over 200% er det helt sikkert et datafix-issue, ikke trafik

    if (!significant) return;

    let severity: "let" | "moderat" | "tæt";
    if (deltaMin < 5) severity = "let";
    else if (deltaMin < 12) severity = "moderat";
    else severity = "tæt";

    setTrafficAlert({ addedMin: Math.round(deltaMin), severity });
  }, [directions?.duration_s, directions?.distance_m, nextStop?.id, routeStarted]);

  /* Stemmeadvarsel ved trafik — kun én gang pr. stop pr. severity-niveau */
  useEffect(() => {
    if (!trafficAlert || !audioEnabled || !routeStarted || !nextStop) return;
    const key = `${nextStop.id}-${trafficAlert.severity}`;
    if (trafficSpokenRef.current === key) return;
    trafficSpokenRef.current = key;
    const sevText =
      trafficAlert.severity === "let" ? "lidt trafik" :
      trafficAlert.severity === "moderat" ? "moderat trafik" : "tæt trafik";
    void sevText;
    playTrafficCue();
  }, [trafficAlert?.severity, trafficAlert?.addedMin, audioEnabled, routeStarted, nextStop?.id]);

  /* Turn-by-turn */
  const maneuver = useCurrentManeuver(directions?.steps, userPos, minStepIndex);
  // A fresh directions response has its own step indices (even for the same stop).
  useEffect(() => {
    minStepIndexRef.current = { stopId: nextStop?.id ?? null, idx: 0 };
    setMinStepIndex(0);
  }, [directions]);
  // Fastlås step-pointer: når useCurrentManeuver vælger et nyt højere step,
  // gemmer vi det så vi aldrig går tilbage. Reset når næste stop ændrer sig.
  useEffect(() => {
    if (!nextStop) return;
    const cur = minStepIndexRef.current;
    if (cur.stopId !== nextStop.id) {
      minStepIndexRef.current = { stopId: nextStop.id, idx: 0 };
      setMinStepIndex(0);
    }
  }, [nextStop?.id]);
  useEffect(() => {
    if (!maneuver) return;
    if (maneuver.stepIndex > minStepIndexRef.current.idx) {
      minStepIndexRef.current.idx = maneuver.stepIndex;
      setMinStepIndex(maneuver.stepIndex);
    }
  }, [maneuver?.stepIndex]);
  // Banneret skal kun vises når der reelt er en kommende manøvre tæt på.
  // Når man cykler langt mellem to drej skal banneret IKKE blokere skærmen.
  // Vi viser det når næste manøvre er <800 m væk, OG den ikke er en "depart"
  // (kør ud) som kun giver mening de første sekunder af turen.
  // Når brugeren er tæt på næste stop er turn-by-turn irrelevant — vis kun
  // stop-kortet, ikke et "Du er fremme"-banner oveni der modsiger kortets
  // afstand.  Matcher Google Maps' adfærd.
  const nearNextStop = distanceToNextM != null && distanceToNextM <= arrivalThresholdM;
  // Altid synlig vejvisning undervejs — lange stræk vises som "Fortsæt".
  const showManeuverBanner = !!maneuver
    && !isAtNextStop
    && !nearNextStop
    && (maneuver.currentStep.maneuver.type || "").toLowerCase() !== "arrive";
  useEffect(() => {
    if (!audioEnabled || !maneuver || !routeStarted) return;
    const type = (maneuver.currentStep.maneuver.type || "").toLowerCase();
    // "Du er fremme" siges af ankomstlyden — ikke som et drej-oplæg.
    if (type === "arrive" || type === "depart") return;
    const stepKey = `${maneuver.stepIndex}-${type}-${maneuver.currentStep.name}`;
    if (lastSpokenStepRef.current === stepKey) return;
    if (maneuver.distanceToManeuverM > 250) return;
    lastSpokenStepRef.current = stepKey;
    playTurnCue();
  }, [maneuver?.stepIndex, maneuver?.distanceToManeuverM, audioEnabled, routeStarted]);

  /* Tæt-på-lyd ca. 300 m før stoppet — én gang pr. stop */
  const approachCuedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!audioEnabled || !routeStarted || !nextStop || liveDistanceM == null) return;
    if (liveDistanceM > 300 || liveDistanceM < 80) return;
    if (approachCuedRef.current.has(nextStop.id)) return;
    approachCuedRef.current.add(nextStop.id);
    playApproachCue();
  }, [liveDistanceM, nextStop?.id, audioEnabled, routeStarted]);

  // Chooseren ("Hvordan vil du køre ruten?") må vises med det samme ud fra
  // kun route-id'et — vi venter ikke på hele useMyRouteData-loadet.
  // Kun når hentningen er FÆRDIG og intet blev fundet, viser vi fejlsiden.
  if (!isLoading && !route) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>{routeLoadError ? "Ruten kunne ikke hentes. Tjek forbindelsen og prøv igen." : "Rute ikke fundet eller du har ikke adgang."}</p>
        {routeLoadError && <Button onClick={() => void retryRoute()}>Prøv igen</Button>}
        <Button variant="outline" onClick={onBack}>Tilbage</Button>
      </div>
    );
  }

  const handleNavigate = (s: RouteStop) => {
    // Åbn vores egen kørselsguide på kortet i stedet for at sende
    // medarbejderen ud til Google Maps.
    setHighlightedId(null);
    setSelectedId(null);
    setFollowMode(true);
    if (runMode !== "guide") {
      setRunMode("guide");
      writeRunMode("guide", !!readRunMode());
    }
  };

  /** Hent én position — bruges når vi ikke sporer GPS (tjekliste-tilstand). */
  const getPositionOnce = (): Promise<[number, number] | null> =>
    new Promise((resolve) => {
      if (!navigator.geolocation) return resolve(null);
      navigator.geolocation.getCurrentPosition(
        (p) => resolve([p.coords.latitude, p.coords.longitude]),
        () => resolve(null),
        { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8000 },
      );
    });

  /**
   * Læg de resterende stop i den rækkefølge der er hurtigst FRA hvor
   * bilen står lige nu. Uden dette planlægges dagen altid fra
   * startadressen, og man kan ende med at køre langt væk og tilbage igen.
   */
  const reoptimizeFromHere = async (opts: { silent?: boolean; excludeId?: string } = {}) => {
    if (autoOptimizeRef.current) return;
    const remaining = sortedStops.filter(
      (x) => x.status !== "completed" && x.id !== opts.excludeId && x.latitude != null && x.longitude != null,
    );
    if (remaining.length < 2) return;
    autoOptimizeRef.current = true;
    try {
      const pos = userPos ?? (await getPositionOnce());
      if (!pos) {
        if (!opts.silent) {
          toast.error("Vi kunne ikke finde din position", {
            description: "Slå lokation til for at få rækkefølgen tilpasset hvor du er.",
          });
        }
        return;
      }
      // Står man allerede ved (eller tæt på) næste stop, må rækkefølgen ikke
      // ændres — ellers flyttes stoppet man er fremme ved bagerst i køen.
      const head = remaining[0];
      if (head && head.latitude != null && head.longitude != null) {
        const dLat = (head.latitude - pos[0]) * 111_320;
        const dLng = (head.longitude - pos[1]) * 111_320 * Math.cos((pos[0] * Math.PI) / 180);
        if (Math.hypot(dLat, dLng) < 250) {
          if (!opts.silent) toast.success("Du er ved næste stop — rækkefølgen er uændret");
          return;
        }
      }
      const res = await optimizeLive.mutateAsync({ routeId, lat: pos[0], lng: pos[1] });
      if (res.order_changed && !opts.silent) {
        const savedKm = Math.round(res.saved_km ?? 0);
        const savedMin = Math.round(res.saved_minutes ?? 0);
        toast.success("Rækkefølgen er tilpasset hvor du er nu", {
          description: savedKm > 0 || savedMin > 0
            ? `Du sparer ca. ${savedKm} km og ${savedMin} min på resten af dagen.`
            : "Nærmeste stop kommer først.",
        });
      } else if (!opts.silent) {
        toast.success("Rækkefølgen er allerede den bedste herfra");
      }
    } catch {
      if (!opts.silent) {
        toast.error("Kunne ikke tilpasse rækkefølgen", { description: "Prøv igen om lidt." });
      }
    } finally {
      autoOptimizeRef.current = false;
    }
  };
  reoptRef.current = reoptimizeFromHere;

  /** Flyt ét stop op/ned i rækkefølgen mens man kører. */
  const handleMoveStop = async (stopId: string, dir: -1 | 1) => {
    const list = remainingStops;
    const from = list.findIndex((s) => s.id === stopId);
    const to = from + dir;
    if (from < 0 || to < 0 || to >= list.length) return;
    const reordered = [...list];
    const [moved] = reordered.splice(from, 1);
    if (!moved) return;
    reordered.splice(to, 0, moved);
    const completed = sortedStops.filter((s) => s.status === "completed");
    const updates = [...completed, ...reordered].map((s, i) => ({ id: s.id, sequence: i + 1 }));
    try {
      await reorderStops.mutateAsync(updates);
      buzz(14);
      toast.success("Rækkefølgen er ændret");
    } catch {
      toast.error("Kunne ikke ændre rækkefølgen", { description: "Prøv igen om lidt." });
    }
  };



  const markLocallyDone = (stopId: string, completedAt: string, notes?: string) => {
    queryClient.setQueriesData<any>({ queryKey: ["my-route-data"] }, (old: any) => old?.stops ? {
      ...old, stops: old.stops.map((x: RouteStop) => x.id === stopId ? { ...x, status: "completed", completed_at: completedAt, notes: notes ?? x.notes } : x),
    } : old);
  };

  const handleComplete = async (s: RouteStop) => {
    if (routeDateLocked) {
      toast.error("Ruten kan først udføres på selve dagen");
      return;
    }
    setPendingStopId(s.id);
    const queueOffline = () => {
      const completedAt = new Date().toISOString();
      enqueueCompletion({ stopId: s.id, completedAt, notes: noteDraft[s.id], employeeId: meEmp?.id ?? null });
      markLocallyDone(s.id, completedAt, noteDraft[s.id]);
      setPendingSync(readQueue().length);
      buzz(22);
      toast.success(`${s.customer_name || "Stop"} udført — gemt på telefonen`, {
        description: "Ingen dækning lige nu. Det sendes automatisk, når forbindelsen er tilbage.",
        duration: 8000,
      });
      setSelectedId(null);
    };
    if (navigator.onLine === false) { queueOffline(); setPendingStopId(null); return; }
    try {
      // Stop tidsregistrering for den loggede medarbejder på denne aftale
      try {
        if (meEmp?.id) {
          await endStopTime.mutateAsync({ stop_id: s.id, employee_id: meEmp.id });
        }
      } catch (e) {
        if (isNetworkError(e)) throw e;
        throw new Error("Tidsregistreringen kunne ikke afsluttes");
      }
      await updateStatus.mutateAsync({ id: s.id, status: "completed", notes: noteDraft[s.id] });
      const doneNow = completedCount + 1;
      const total = sortedStops.length;
      const finished = doneNow >= total;
      // Lille kvittering i hånden: ét bump pr. stop, tre ved sidste stop.
      buzz(finished ? [30, 60, 30, 60, 60] : 22);
      if (audioEnabled) {
        if (finished) playCompleteFanfare();
        else playSuccessChime();
      }
      toast.success(
        finished
          ? `Sidste stop klaret — hele ruten er kørt! 🎉`
          : `${s.customer_name || "Stop"} udført — ${doneNow} af ${total} klaret`,
        {
          description: finished ? undefined : `${total - doneNow} stop tilbage på ruten.`,
          duration: 8000,
          action: { label: "Fortryd", onClick: () => void handleUndo(s) },
        },
      );
      setSelectedId(null);
      const remaining = sortedStops.filter((x) => x.status !== "completed" && x.id !== s.id);
      if (remaining.length > 0 && audioEnabled && runMode === "guide") {
        const next = remaining[0];
        setTimeout(() => voice(`Næste stop: ${next.customer_name || "ukendt kunde"}`), 900);
      }
      // Planlæg resten af dagen forfra — ud fra hvor vi holder nu.
      void reoptimizeFromHere({ silent: true, excludeId: s.id });
    } catch {
      toast.error("Vi kunne ikke gemme markeringen", {
        description: "Tjek din forbindelse og prøv igen — stoppet står stadig som ikke udført.",
      });
    } finally {
      setPendingStopId(null);
    }
  };

  const handleUndo = async (s: RouteStop) => {
    if (undoPending) return;
    setUndoPending(true);
    try {
      if (meEmp?.id) {
        await resetStopTime.mutateAsync({ stop_id: s.id, employee_id: meEmp.id });
      }
      await updateStatus.mutateAsync({ id: s.id, status: "pending" });
      setRouteStarted(true);
      setRouteStartedAt(getRouteStartedAt(routeId));
      finishedAnnouncedRef.current = false;
      toast.success("Markering fortrudt");
    } catch {
      toast.error("Kunne ikke fortryde markeringen", {
        description: "Prøv igen om et øjeblik.",
      });
    } finally { setUndoPending(false); }
  };

  /** Selve starten — kaldes når tilstanden (tjekliste/guide) er valgt. */
  const beginRoute = (mode: RouteRunMode) => {
    setRunMode(mode);
    unlockAudio();
    setRouteStartedAt(markRouteStarted(routeId));
    setRouteStarted(true);
    setFollowMode(true);
    setCollapsed(window.innerWidth < 1024);
    if (mode === "guide" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPos([pos.coords.latitude, pos.coords.longitude]);
          if (typeof pos.coords.heading === "number" && !Number.isNaN(pos.coords.heading)) {
            setUserHeading(pos.coords.heading);
          }
        },
        reportGpsError,
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 },
      );
    }
    // Ved start: læg dagens rækkefølge efter hvor medarbejderen faktisk er.
    setTimeout(() => void reoptimizeFromHere({ silent: true }), 1500);
  };

  /* ── Tjekliste-tilstand: den simple visning uden kort og GPS ── */
  if (routeStarted && runMode === "list") {
    if (!route) return <RouteViewSkeleton />;
    return (
      <>
      <RouteChecklistView
        routeId={routeId}
        routeName={route.name || "Rute"}
        weather={<RouteWeatherStatus routeId={route.id} date={route.route_date} stops={sortedStops} />}
        themeColor={themeColor}
        stops={sortedStops}
        pendingId={pendingStopId}
        locked={routeDateLocked}
        onComplete={handleComplete}
        onUndo={handleUndo}
        startedAt={routeStartedAt ?? getRouteStartedAt(routeId)}
        etaLabel={etaLabel}
        arrivalLabel={actualArrival ? formatClockTime(actualArrival) : null}
        driveEstimateSeconds={timeError || timeLoading ? null : metrics.driveEstimateSeconds}
        summary={<RouteRunSummary count={sortedStops.length} startedAt={runStart} finishedAt={finishedAt} {...metrics} loading={timeLoading} error={timeError} pending={undoPending} onBack={onBack} onUndo={latestCompleted ? () => void handleUndo(latestCompleted) : undefined} onInfo={() => { setRunMode("guide"); setSelectedId(latestCompleted?.id ?? null); }} />}
        onNavigate={handleNavigate}
        onOpenDetails={(stop) => setSelectedId(stop.id)}
        routeDate={route.route_date}
        onSwitchToGuide={() => {
          setRunMode("guide");
          writeRunMode("guide", !!readRunMode());
        }}
        onFinish={onBack}
        onMoveStop={handleMoveStop}
        reordering={reorderStops.isPending}
        notification={routeNotifications[0] ? {
          title: routeNotifications[0].route_stops?.customer_name
            ? `Aftale · ${routeNotifications[0].route_stops.customer_name}`
            : `Rute · ${routeNotifications[0].routes?.name || route.name || "Dagens rute"}`,
          message: routeNotifications[0].message,
        } : null}
        onMarkNotificationRead={routeNotifications.length > 0
          ? () => routeNotifications.forEach((item) => markNotificationRead.mutate(item.id))
          : undefined}
        audioEnabled={audioEnabled}
        night={night}
        onToggleNight={toggleNight}
        onToggleAudio={() => {
          unlockAudio();
          setAudioEnabled((value) => !value);
          if (!audioEnabled) playStartChime();
        }}
      />
      <StopDetailsSheetShell open={!!selectedId} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
        {selectedStop ? (
          <StopDetailsContent
            stop={selectedStop}
            index={Math.max(0, sortedStops.findIndex((stop) => stop.id === selectedStop.id))}
            themeColor={themeColor}
            route={{ name: route.name, color: route.color, date: route.route_date, allowEarly: earlyAllowedForRoute }}
            noteDraft={noteDraft[selectedStop.id] ?? selectedStop.notes ?? ""}
            onNoteChange={(value) => setNoteDraft((drafts) => ({ ...drafts, [selectedStop.id]: value }))}
            onComplete={() => handleComplete(selectedStop)}
            onUndo={() => handleUndo(selectedStop)}
            onNavigate={() => handleNavigate(selectedStop)}
            isPending={updateStatus.isPending}
            pendingTimeLabel="Tryk Start for at registrere arbejdstid"
          />
        ) : null}
      </StopDetailsSheetShell>
      </>
    );
  }

  /* Kortet må ikke monteres, før medarbejderen aktivt har valgt
     kørselsform. Det undgår både kort-flash, unødige flisekald og GPS-arbejde,
     når medarbejderen i stedet vil bruge den strømbesparende tjekliste. */
  if (!routeStarted && !allDone) {
    return (
      <div className="employee-route-run fixed inset-0 flex min-h-dvh items-center justify-center overflow-hidden bg-secondary/35 px-3 py-[max(0.75rem,env(safe-area-inset-top))]">
        <div className="w-full max-w-md rounded-md border border-border bg-card p-4 text-center shadow-sm">
          <p className="text-xs font-semibold uppercase text-muted-foreground">{todayLabel}</p>
          <h1 className="mt-1 truncate text-lg font-semibold text-foreground">{route?.name || "Dagens rute"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{remainingStops.length} stop klar</p>
          {routeDateLocked && (
            <div className="mt-4 rounded-md border border-warning/35 bg-warning/10 px-3 py-3 text-sm text-warning-foreground">
              Ruten kan først startes på selve dagen.
            </div>
          )}
          <Button variant="outline" className="mt-4 h-11 w-full" onClick={onBack}>Tilbage til Min dag</Button>
        </div>
        {!routeDateLocked && (
          <RouteModeDialog
            open={modeDialogOpen}
            onOpenChange={(open) => {
              setModeDialogOpen(open);
              if (!open) onBack();
            }}
            onChoose={(mode, remember) => {
              writeRunMode(mode, remember);
              setModeDialogOpen(false);
              beginRoute(mode);
            }}
          />
        )}
      </div>
    );
  }

  if (!route) {
    return <RouteViewSkeleton />;
  }

  return (
    <div className={cn("employee-route-run fixed inset-0 flex flex-col bg-background overflow-hidden", night && "dark route-night")}>
      {/* ─── Compact header — admin-stil (h-14, neutral palette).  Kun
          synlig før rute starter eller ved færdig.  Lyd-knappen findes
          som floating control under kørsel — ingen dubletter her. ─── */}
      {(!routeStarted || allDone) && (
        <header className="relative shrink-0 z-30 bg-card border-b border-border pt-[env(safe-area-inset-top)]">
          <div className="flex min-h-14 items-center gap-3 px-4 py-2">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-11 w-11 shrink-0 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              <Link to="/medarbejder" aria-label="Tilbage">
                <ArrowLeft className="h-4 w-4" />
              </Link>
            </Button>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full shrink-0"
                  style={{ background: routeBadgeColor }}
                  aria-hidden
                />
                <h1 className="text-sm font-semibold text-foreground truncate">
                  {route.name || "Rute"}
                </h1>
              </div>
              <p className="text-[11px] text-muted-foreground tabular-nums">
                {completedCount} af {sortedStops.length} stop udført
              </p>
              <RouteWeatherStatus routeId={route.id} date={route.route_date} stops={sortedStops} />
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => setListOpen((v) => !v)}
              aria-label="Vis liste"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-11 w-11 rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground"
              onClick={() => setAudioEnabled((v) => !v)}
              aria-label={audioEnabled ? "Slå lyd fra" : "Slå lyd til"}
              aria-pressed={!audioEnabled}
            >
              {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            </Button>
          </div>

          {/* Progress bar — neutral baggrund + rute-farve indikator */}
          <div className="h-1 w-full bg-secondary" aria-hidden>
            <div
              className="h-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%`, background: themeColor }}
            />
          </div>
        </header>
      )}
      {routeNotifications.length > 0 && (
        <div className={cn(
          "z-[1003] shrink-0",
          routeStarted && !allDone
            ? "drive-route-notification relative border-b border-border bg-card px-3 py-2 max-h-[14dvh] overflow-y-auto overscroll-contain"
            : "relative border-b border-destructive/25 bg-destructive/5 px-3 py-2",
        )}>
          <div className={cn("mx-auto flex max-w-3xl items-start gap-2", routeStarted && !allDone && "rounded-md border border-destructive/25 bg-card/95 p-2.5 shadow-lg backdrop-blur-md")}>
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold uppercase text-destructive">
                {routeNotifications[0].route_stops?.customer_name
                  ? `Aftale · ${routeNotifications[0].route_stops.customer_name}`
                  : `Rute · ${routeNotifications[0].routes?.name || route.name || "Dagens rute"}`}
              </p>
              <p className="line-clamp-3 break-words text-xs font-medium text-foreground">{routeNotifications[0].message}</p>
            </div>
            <Button size="sm" variant="outline" className="h-8 shrink-0 text-xs" onClick={() => routeNotifications.forEach((item) => markNotificationRead.mutate(item.id))}>Markér som læst</Button>
          </div>
        </div>
      )}

      {night && nightMapFailed && (
        <DriveIssueBanner
          placement="inline"
          issues={[{ id: "night-map", tone: "warning", title: "Natkortet kunne ikke hentes", body: "Reservekort vises. Vejvisningen fortsætter.", action: "retry" }]}
          onRetry={() => { setNightMapFailed(false); setNightMapRetry(v => v + 1); }}
        />
      )}

      <div className="shrink-0 max-h-[14dvh] overflow-y-auto overscroll-contain">
            {geocodeError && <div role="alert" className="relative shrink-0 rounded-md border border-destructive/25 bg-card p-3 text-xs shadow-lg"><p className="font-semibold text-destructive">{geocodeError}</p><Button variant="outline" size="sm" className="mt-2" onClick={retryGeocoding}>Prøv adresseopslaget igen</Button></div>}
            {unresolvedAddresses.length > 0 && (
              <div className="relative shrink-0 rounded-md border border-destructive/25 bg-card/95 p-2 text-[11px] leading-5 text-muted-foreground shadow-lg backdrop-blur-md ">
                <p className="font-semibold text-destructive">{unresolvedAddresses.length === 1 ? "1 adresse kunne ikke findes" : `${unresolvedAddresses.length} adresser kunne ikke findes`}</p>
                <ul className="mt-0.5 space-y-0.5">
                  {unresolvedAddresses.slice(0, 3).map((addr) => (
                    <li key={addr}>Adressen kunne ikke findes: {addr}</li>
                  ))}
                </ul>
              </div>
            )}
      </div>
        {routeStarted && (directionsError || directions?.provider === "fallback") && (
          <div className="relative shrink-0 rounded-md border border-border bg-card/95 p-3 shadow-lg backdrop-blur-md ">
            <p className="text-sm font-semibold text-foreground">Vejvisningen kunne ikke hentes</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Den stiplede linje viser kun retningen — ikke en kørbar vej.</p>
            <Button type="button" variant="outline" size="sm" className="mt-2 h-9" onClick={() => retryDirections()}>Prøv igen</Button>
          </div>
        )}

      {/* ─── Map fills everything ─── */}
      <div className={cn("route-map-stage relative flex-1 min-h-0", routeStarted && !allDone && "route-map-stage-driving")}>
        <DriveIssueBanner issues={driveIssues} onRetry={retryGps} />
        {!hasMapPoint && (isLoading || geocodeState === "idle" || geocodeState === "pending") ? (
          <div className="flex h-full items-center justify-center p-6 text-center text-muted-foreground">
            <div className="space-y-2">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" aria-hidden />
              <p className="text-sm">Henter koordinater til kortet…</p>
            </div>
          </div>
        ) : !hasMapPoint ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="max-w-sm space-y-3">
              <BrandedIllustration name="drivingGuide" className="mx-auto h-16 w-16" alt="" />
              <div>
                <p className="text-sm font-semibold text-foreground">{geocodeError ? "Korttjenesten er midlertidigt utilgængelig" : "Kortet kunne ikke finde adresserne"}</p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{geocodeError ? geocodeError : "Kontrollér, at vej, husnummer, postnummer og by står på aftalen, og prøv igen."}</p>
                {!geocodeError && unresolvedAddresses.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-left text-[11px] text-muted-foreground">
                    {unresolvedAddresses.map((addr) => (
                      <li key={addr}>Adressen kunne ikke findes: {addr}</li>
                    ))}
                  </ul>
                )}
              </div>
              <Button type="button" variant="outline" size="sm" onClick={retryGeocoding}>Prøv igen</Button>
            </div>
          </div>
        ) : mapProvider === "google" ? (
          <MapCrashGuard onCrash={(e) => handleGoogleFailure({ reason: "network", message: e.message } as unknown as GoogleMapsLoadError)}>
          <GoogleRouteMap key={night ? "gmap-night" : "gmap-day"}
            topOverlayRef={topHudRef}
            bottomOverlayRef={bottomHudRef}
            stops={googleStops}
            start={startCoord ?? null}
            overview={allPoints}
            previewLine={previewLine}
            legLine={!isAtNextStop ? legLine : []}
            hintLine={googleHintLine}
            userPos={displayPos}
            routeStarted={routeStarted}
            moving={isMoving}
            track={motionTrack}
            speedMps={userSpeedMps}
            followActive={routeStarted && followMode && pageVisible}
            fitEnabled={!routeStarted && !highlightedId}
            flyTo={highlightedPoint}
            night={night}
            maneuverDistanceM={maneuver?.distanceToManeuverM ?? null}
            trafficSegments={!isAtNextStop ? trafficSegments : []}
            onInteract={breakFollow}
            onRecenter={() => { setHighlightedId(null); setFollowMode(true); }}
            onSelectStop={(id) => { setFollowMode(false); setHighlightedId(id); setSelectedId(id); }}
            onFailure={handleGoogleFailure}
          />
          </MapCrashGuard>
        ) : (
          <>
          {googleMapError && (
            <div className={cn("route-google-fallback absolute left-3 right-3 z-[1001] flex items-center justify-between gap-2 rounded-md border border-border bg-card/95 p-2 pl-3 text-[11px] text-foreground shadow-md sm:left-auto sm:max-w-sm", routeStarted && !allDone ? "bottom-3" : "top-3")} role="status">
              <span className="line-clamp-2">{googleMapError}</span>
              <Button type="button" variant="outline" size="icon" className="h-10 w-10 shrink-0" onClick={retryGoogleMap} aria-label="Prøv Google-kortet igen" title="Prøv Google-kortet igen"><Crosshair className="h-4 w-4" /></Button>
            </div>
          )}
          <MapContainer
            center={userPos ?? allPoints[0] ?? [56.1, 10.2]}
            zoom={13}
            rotate
            rotateControl={false}
            touchRotate={false}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
            doubleClickZoom
            touchZoom
            boxZoom
            dragging
            zoomControl={false}
            attributionControl
            zoomSnap={1}
            zoomDelta={1}
            wheelDebounceTime={80}
            wheelPxPerZoomLevel={120}
            zoomAnimation={false}
            fadeAnimation={false}
            markerZoomAnimation={false}
            inertia
            inertiaDeceleration={2400}
            preferCanvas
          >
            {/* Day tiles double as a dim reserve while the vector night style loads. */}
            <TileLayer
              key={night ? "night" : "day"}
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              className={night ? "route-tiles-night" : undefined}
              attribution="&copy; OpenStreetMap-bidragydere"
              updateWhenIdle={false}
              updateWhenZooming={false}
              keepBuffer={4}
              zIndex={1}
              maxZoom={20}
              maxNativeZoom={19}
            />
            {night && <NightBasemap retry={nightMapRetry} onFailure={reportNightMapFailure} />}

            {/* Fit overview when not started */}
            <FitTo points={allPoints} enabled={!routeStarted && !highlightedId} />
            {/* Ét samlet kamera: følger positionen og justerer zoom efter farten. */}
            <NavCamera topHudRef={topHudRef} bottomHudRef={bottomHudRef}
              active={routeStarted && followMode && pageVisible}
              track={motionTrack}
              speedMps={userSpeedMps}
            />


            {startCoord && <Marker position={startCoord} icon={startIcon} />}

            {!routeStarted && previewLine.length > 1 && <RouteMapLine points={previewLine} />}
            {legLine.length > 1 && !isAtNextStop && <RouteMapLine points={legLine} />}

            {/* Hvis vejberegningen mangler, vises retningen stadig tydeligt. */}
            {routeStarted && legLine.length < 2 && displayPos && nextStop?.latitude != null && nextStop?.longitude != null && (
              <Polyline
                positions={[displayPos, [Number(nextStop.latitude), Number(nextStop.longitude)]]}
                pathOptions={{ color: mapAccentColor, weight: 6, opacity: 0.75, dashArray: "8 10", lineCap: "round" }}
              />
            )}

            {/* Ankomst-indikator: lille stiplet linje fra puck til pin
                så det er entydigt hvilken adresse man er ankommet til,
                også når rutens vejgeometri ville pege en anden vej. */}
            {isAtNextStop && displayPos && nextStop?.latitude != null && nextStop?.longitude != null && (
              <Polyline
                positions={[displayPos, [Number(nextStop.latitude), Number(nextStop.longitude)]]}
                pathOptions={{
                  color: mapSuccessColor,
                  weight: 4,
                  opacity: 0.9,
                  dashArray: "2 8",
                  lineCap: "round",
                }}
              />
            )}

            {/* Other stops */}
            {sortedStops.map((s, i) => {
              if (s.latitude == null || s.longitude == null) return null;
              const state: "next" | "done" | "future" =
                s.status === "completed" ? "done" : s.id === nextStop?.id ? "next" : "future";
              return (
                <Marker
                  key={s.id}
                  position={[Number(s.latitude), Number(s.longitude)]}
                  icon={stopIcon(
                    i + 1,
                    state,
                    themeColor,
                    s.id === highlightedId,
                  )}
                  eventHandlers={{ click: () => { setFollowMode(false); setHighlightedId(s.id); setSelectedId(s.id); } }}
                />
              );
            })}

            {/* User position — Google Maps-stil puck når man kører.
                NavPuckMarker er stabil: kun CSS-transform ændres ved heading-skift,
                ingen re-mount af DOM = ingen flicker under reroutes. */}
            {displayPos && routeStarted && (
              <NavPuckMarker track={motionTrack} fallback={displayPos} moving={isMoving} />
            )}
            {displayPos && !routeStarted && (
              <Marker position={displayPos} icon={userDotIcon} />
            )}

            {/* Detect manual user interaction to break follow */}
            <MapInteractionWatcher onInteract={breakFollow} />

            {/* Smooth fly to a tapped stop in the list */}
            {(() => {
              const h = sortedStops.find((s) => s.id === highlightedId);
              const t: [number, number] | null = h && h.latitude != null && h.longitude != null
                ? [Number(h.latitude), Number(h.longitude)]
                : null;
              return <FlyToStop target={t} />;
            })()}
          </MapContainer>
          </>
        )}

        {/* ─── "Ruten kan køres hurtigere" — vises kun når der reelt er
             minutter at hente i en anden rækkefølge. ─── */}


        {/* ─── Aktiv kørselsbjælke: alle primære kontroller samlet ét sted ─── */}
        {routeStarted && !allDone && (
          <>
            <div ref={topHudRef} className="route-hud-stack pointer-events-none absolute left-2 right-2 top-[max(0.5rem,env(safe-area-inset-top))] z-[1002] flex flex-col gap-2 sm:left-4 sm:right-auto sm:w-[min(30rem,calc(100vw-2rem))] lg:w-[min(28rem,calc(42vw-2rem))] xl:w-[30rem]">
            <div className="pointer-events-auto">
              <div className="flex h-12 w-full items-center gap-1 rounded-md border border-border bg-card/95 px-1 text-foreground shadow-lg backdrop-blur-md">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  aria-label="Tilbage til tjekliste"
                  onClick={() => {
                    setRunMode("list");
                    writeRunMode("list", !!readRunMode());
                  }}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="min-w-0 flex-1 border-l border-border pl-3">
                  <p className="truncate text-[13px] font-semibold leading-tight text-foreground">{route.name || "Dagens rute"}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
                    <span className="tabular-nums">{completedCount} af {sortedStops.length} stop udført</span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("h-11 w-11 shrink-0", listOpen && "bg-secondary")}
                  onClick={() => setListOpen((value) => !value)}
                  aria-label="Vis alle stop" title="Vis alle stop"
                  aria-pressed={listOpen}
                >
                  <List className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={toggleNight}
                  aria-label={night ? "Skift til dagkort" : "Skift til natkort"}
                  aria-pressed={night}
                >
                  {night ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-11 w-11 shrink-0"
                  onClick={() => setAudioEnabled((value) => !value)}
                  aria-label={audioEnabled ? "Slå lyd fra" : "Slå lyd til"}
                  aria-pressed={!audioEnabled}
                >
                  {audioEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            {/* Næste manøvre — hvidt HUD-kort i Google Maps-stil */}
            {!isRerouting && !directionsError && directions?.provider !== "fallback" && showManeuverBanner && maneuver && nextStop && (() => {
              const thenStep = directions?.steps?.[maneuver.stepIndex + 1];
              const thenType = (thenStep?.maneuver?.type || "").toLowerCase();
              const showThen = thenStep && thenType !== "arrive" && maneuver.distanceToManeuverM < 500;
              const curType = (maneuver.currentStep.maneuver.type || "").toLowerCase();
              const longStretch = maneuver.distanceToManeuverM > 2000 || curType === "depart";
              const road = maneuver.currentStep.name;
              return (
                <div className="route-maneuver relative">
                  <div className="overflow-hidden rounded-md border border-border bg-card text-foreground shadow-lg" aria-live="polite">
                    <div className="flex items-center gap-3 px-3 py-2">
                      {longStretch
                        ? <Navigation className="h-7 w-7 shrink-0 text-foreground" aria-hidden="true" />
                        : <ManeuverIcon type={maneuver.currentStep.maneuver.type} modifier={maneuver.currentStep.maneuver.modifier} className="h-8 w-8 shrink-0" />}
                      <div className="min-w-0 flex-1">
                        <p className="text-xl font-bold leading-none tabular-nums">{formatKm(maneuver.distanceToManeuverM)}</p>
                        <p className="mt-1 line-clamp-3 break-words text-sm font-semibold leading-snug">
                          {maneuver.currentStep.maneuver.instruction && !longStretch
                            ? maneuver.currentStep.maneuver.instruction
                            : <>{longStretch ? "Fortsæt ligeud" : maneuverLabel(maneuver.currentStep.maneuver.type, maneuver.currentStep.maneuver.modifier)}
                              {road ? <span className="font-normal text-muted-foreground"> ad {road}</span> : null}</>}
                        </p>
                      </div>
                    </div>
                    {showThen && (
                      <div className="route-maneuver-then flex items-center gap-2 border-t border-border bg-secondary/50 px-3.5 py-1.5 text-xs text-muted-foreground">
                        <span className="font-medium">Derefter</span>
                        <ManeuverIcon type={thenStep.maneuver.type} modifier={thenStep.maneuver.modifier} className="h-4 w-4 shrink-0" />
                        <span className="truncate">{thenStep.maneuver.instruction || thenStep.name || maneuverLabel(thenStep.maneuver.type, thenStep.maneuver.modifier)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* Reroute-banner — Google Maps-stil "genberegner" prompt */}
            {isRerouting && (
              <div className="relative">
                <div
                  className="flex items-center gap-3 rounded-md border bg-background/95 px-3 py-2.5 shadow-xl backdrop-blur animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md"
                    style={{ background: themeColor }}
                  >
                    <Loader2 className="h-4.5 w-4.5 animate-spin text-background" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold leading-tight">Genberegner rute</p>
                    <p className="text-[11px] text-muted-foreground leading-tight mt-0.5">
                      Du afveg fra ruten — finder bedste vej fra din nuværende position
                    </p>
                  </div>
                </div>
              </div>
            )}

            {!isRerouting && !isAtNextStop && trafficAlert && (
              <div role="status" className="pointer-events-auto relative flex items-center gap-2 rounded-md border border-warning/30 bg-card px-3 py-1 text-xs text-foreground">
                <TrafficCone className="h-4 w-4 shrink-0 text-warning" />
                <span className="min-w-0 flex-1">Trafik · ca. {trafficAlert.addedMin} min ekstra</span>
                <Button variant="ghost" size="sm" className="h-11" onClick={() => setTrafficAlert(null)}>Luk</Button>
              </div>
            )}
            </div>
          </>
        )}

        {/* ─── Active driving card ─── */}
        {routeStarted && !allDone && nextStop && (
          <div ref={bottomHudRef} className="route-active-stop pointer-events-none absolute bottom-[calc(52px+env(safe-area-inset-bottom))] inset-x-0 z-[1000] p-2 sm:bottom-[calc(60px+env(safe-area-inset-bottom))] sm:left-auto sm:right-4 sm:w-[min(34rem,calc(100vw-2rem))] sm:p-0 lg:left-4 lg:right-auto lg:w-[min(30rem,calc(42vw-2rem))] xl:w-[30rem]">
            <Card className="route-drive-dock pointer-events-auto mx-auto max-w-xl overflow-hidden rounded-md border-border/80 bg-card shadow-lg sm:max-md:max-w-none md:max-w-none">
              {/* Opsummering i Google Maps-stil: stor restid, derefter afstand og ankomst. */}
              <button type="button" className="route-dock-summary flex min-h-12 w-full items-center justify-between gap-2 border-b border-border px-3.5 py-1.5 text-left tabular-nums transition-colors hover:bg-secondary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring" aria-label={collapsed ? "Vis ruteoverblik" : "Skjul ruteoverblik"} aria-expanded={!collapsed} onClick={() => setCollapsed(v => !v)}>
                <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5" role="status">
                  {activeNextStopLabel ? <><b className="font-mono text-lg font-bold leading-tight text-success">{activeNextStopLabel}</b><span className="truncate text-xs text-muted-foreground">hos {activeRouteStop?.customer_name || "kunden"}</span></>
                    : isAtNextStop ? <><b className="text-lg font-bold leading-tight text-success">Fremme</b><span className="text-xs text-muted-foreground">{actualArrival ? `ankom ${formatClockTime(actualArrival)}` : "klar til at starte"}</span></>
                    : <><b className="text-lg font-bold leading-tight text-success">{liveDurationS != null ? formatMin(liveDurationS) : "—"}</b><span className="text-xs text-muted-foreground">{liveDistanceM != null ? `${formatKm(liveDistanceM)} · ` : ""}ankomst {etaLabel ?? "—"}</span></>}
                </span>
                <span className="flex shrink-0 items-center gap-1 text-[11px] font-medium text-muted-foreground">
                  <span className="hidden min-[380px]:inline">{nextStopIdx + 1}/{sortedStops.length}</span>
                  {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </button>
              {!collapsed && <StopTimeline stops={sortedStops} currentIndex={nextStopIdx} arrived={isAtNextStop} />}
              {!collapsed && <div className="px-3.5 py-1"><RouteWeatherStatus routeId={route.id} date={route.route_date} stops={sortedStops} /></div>}
              {/* Tidsregistrering — én kompakt linje */}
              {!collapsed && routeStartedAt && (
                <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 px-3.5 pb-1 pt-1.5 text-xs tabular-nums text-muted-foreground">
                  <span>Start <b className="font-semibold text-foreground">{formatClockTime(routeStartedAt)}</b></span>
                  <span>Køretid · ca. <b className="font-semibold text-foreground">{timeError || timeLoading || metrics.driveEstimateSeconds == null ? "—" : formatRunDuration(metrics.driveEstimateSeconds)}</b></span>
                  <span>{actualArrival ? "Ankommet" : "Ankomst · ca."} <b className="font-semibold text-foreground">{actualArrival ? formatClockTime(actualArrival) : etaLabel ?? "—"}</b></span>
                  {activeNextStopLabel && <span>Tidsregistrering <b className="font-mono font-semibold text-success">{activeNextStopLabel}</b></span>}
                </p>
              )}
              <div className="route-dock-body sm:max-md:grid sm:max-md:grid-cols-[minmax(0,1fr)_minmax(0,24rem)] sm:max-md:items-center">
              <Button
                type="button"
                variant="ghost"
                className="group h-auto min-h-11 w-full flex-nowrap justify-start rounded-none border-t border-border/50 px-3 py-1.5 hover:bg-secondary/50 active:bg-secondary/70"
                onClick={() => setSelectedId(nextStop.id)}
                aria-label="Vis aftalens oplysninger"
              >
                <span
                   className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-accent bg-card text-foreground text-sm font-bold tabular-nums shrink-0"
                >
                  {nextStopIdx + 1}
                </span>
                <div className="flex-1 text-left min-w-0">
                  <p
                    className="font-semibold text-[14px] text-foreground truncate leading-tight"
                    title={nextStop.customer_name || undefined}
                  >
                    {nextStop.customer_name || "Stop"}
                  </p>
                  {(nextStop.full_address || nextStop.address) ? (
                    <p
                      className="text-[11.5px] text-muted-foreground truncate flex items-center gap-1 mt-0.5"
                      title={nextStop.full_address || nextStop.address || undefined}
                    >
                      <MapPin className="h-3 w-3 shrink-0" />
                      {nextStop.full_address || nextStop.address}
                    </p>
                  ) : (
                    <p className="text-[11px] text-muted-foreground tabular-nums">
                      Stop {nextStopIdx + 1} af {sortedStops.length}
                    </p>
                  )}
                </div>
                {activeNextStopLabel && (
                  <Badge variant="outline" className="inline-flex h-7 shrink-0 border-success/30 bg-success/10 px-2 font-mono text-[11px] font-semibold tabular-nums text-success">
                    {activeNextStopLabel}
                  </Badge>
                )}
                {isAtNextStop ? (
                  <Badge className="gap-1 text-[10px] h-6 px-2 border-0 font-semibold uppercase tracking-wide bg-success/15 text-success">
                    Fremme
                  </Badge>
                ) : nearNextStop && distanceToNextM != null ? (
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground tabular-nums leading-tight">
                      {/* Tæt på stoppet er vejafstanden misvisende (den peger
                          rundt om bygningen) — der viser vi den direkte
                          afstand, ellers vejafstanden fra ruten. */}
                      {formatKm(nearNextStop ? distanceToNextM : liveDistanceM)}
                    </p>
                    {/* Én linje under afstanden: enten "Ved adressen", en
                        tydelig forsinkelse, eller hvornår du er fremme.
                        Aldrig "96 min i god tid" — det siger intet brugbart. */}
                    {nearNextStop ? (
                    <p className="text-[10px] leading-tight font-semibold text-success">
                      Ved adressen
                    </p>
                  ) : directions?.duration_s != null ? (
                    <p className="text-[10px] text-muted-foreground leading-tight tabular-nums">
                      {formatMin(liveDurationS)}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      til næste
                    </p>
                  )}
                  </div>
                ) : null}
              </Button>

              {/* Altid synlig: kompakt CTA-rad — så medarbejderen kan markere
                  udført / navigere uden at åbne detaljer (og uden at miste
                  kortvisningen). */}
                <div className="border-t border-border/60 bg-secondary/25 px-2.5 py-1.5 sm:max-md:h-full sm:max-md:border-l sm:max-md:border-t-0">
                  {activeNextStopEntry ? (
                    <Button
                      onClick={() => handleComplete(nextStop)}
                      variant="complete" className="h-11 w-full gap-2 rounded-md text-sm font-semibold shadow-sm"
                      disabled={updateStatus.isPending || routeDateLocked}
                    >
                      {updateStatus.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Markér udført
                    </Button>
                  ) : isAtNextStop ? (
                    <Button
                      onClick={async () => {
                        if (!meEmp?.id) return;
                        try {
                          await startStopTime.mutateAsync({ stop_id: nextStop.id, employee_id: meEmp.id });
                          buzz(22);
                        } catch {
                          toast.error("Aftalen kunne ikke startes", { description: "Tjek din forbindelse og prøv igen." });
                        }
                      }}
                      className="brand-blue-action h-11 w-full gap-2 rounded-md text-sm font-semibold shadow-sm"
                      disabled={startStopTime.isPending || routeDateLocked || !meEmp?.id}
                    >
                      {startStopTime.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                      Start aftale
                    </Button>
                  ) : null}
                  {/* Én række handlinger — aldrig scroll i panelet. Under kørsel kun det,
                      man har brug for; Ret/Ny aftale vises når man er hos kunden. */}
                  <div className={cn("route-dock-actions flex min-w-0 gap-1", (activeNextStopEntry || isAtNextStop) && "mt-1.5")}>
                  <Button onClick={() => setSelectedId(nextStop.id)} variant="outline" aria-label="Oplysninger" title="Oplysninger" className="route-dock-tile"><Info className="h-5 w-5 shrink-0" /><span className="route-dock-tile-label">Info</span></Button>
                  <EmployeeStopActions stopId={nextStop.id} order={nextStopOrder ?? null} completed={nextStop.status === "completed"} noteOnly routeDate={route?.route_date ?? null} compact />
                  {nextStop.customer_phone ? (
                    <Button asChild variant="outline" aria-label="Ring til kunde" title="Ring til kunde" className="route-dock-tile">
                      <a href={`tel:${nextStop.customer_phone}`}><Phone className="h-5 w-5 shrink-0" /><span className="route-dock-tile-label">Ring</span></a>
                    </Button>
                  ) : null}
                  {latestCompleted && <Button variant="undo" aria-label={`Fortryd ${latestCompleted.customer_name || "seneste stop"}`} title={`Fortryd ${latestCompleted.customer_name || "seneste stop"}`} className="route-dock-tile" disabled={undoPending} onClick={() => void handleUndo(latestCompleted)}><Undo2 className="h-5 w-5 shrink-0" /><span className="route-dock-tile-label">Fortryd</span></Button>}
                  </div>
                </div>
              </div>
              {isAtNextStop && nextStop.notes?.trim() && <p className="max-h-16 overflow-y-auto border-t border-border px-3 py-2 text-xs leading-5 text-foreground">{nextStop.notes}</p>}
            </Card>
          </div>
        )}

        {/* ─── Done state ─── */}
        {allDone && (
          <div ref={bottomHudRef} className="absolute bottom-[calc(52px+env(safe-area-inset-bottom))] inset-x-0 z-[1000] p-2 sm:p-4 md:left-auto md:right-4 md:w-[24rem] md:p-0 lg:bottom-[60px] lg:w-[26rem] xl:w-[28rem] 2xl:w-[30rem]">
            <Card className="mx-auto max-w-xl lg:max-w-none overflow-hidden rounded-md border-border bg-card shadow-lg backdrop-blur-md">
              <RouteRunSummary count={sortedStops.length} startedAt={runStart} finishedAt={finishedAt} {...metrics} loading={timeLoading} error={timeError} pending={undoPending} onBack={onBack} onUndo={latestCompleted ? () => void handleUndo(latestCompleted) : undefined} onInfo={() => setSelectedId(latestCompleted?.id ?? null)} />
            </Card>
          </div>
        )}
      </div>

      {/* ─── Stop detail sheet ─── */}
      <StopDetailsSheetShell
        open={!!selectedId}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedId(null);
          }
        }}
      >
          {(() => {
            const s = selectedStop ?? (selectedStopRef.current?.id === selectedId ? selectedStopRef.current : null);
            if (!s) return null;
            const idx = Math.max(0, sortedStops.findIndex((stop) => stop.id === s.id));
            return (
              <StopDetailsContent
                stop={s}
                index={idx}
                themeColor={themeColor}
                route={route ? {
                  name: route.name,
                  color: route.color,
                  date: route.route_date,
                  allowEarly: earlyAllowedForRoute,
                } : undefined}
                noteDraft={noteDraft[s.id] ?? s.notes ?? ""}
                onNoteChange={(v) => setNoteDraft((d) => ({ ...d, [s.id]: v }))}
                onComplete={() => handleComplete(s)}
                onUndo={() => handleUndo(s)}
                onNavigate={() => handleNavigate(s)}
                isPending={updateStatus.isPending}
                pendingTimeLabel="Tryk Start for at registrere arbejdstid"
              />
            );
          })()}
      </StopDetailsSheetShell>

      {/* ─── Persistent collapsible bottom stop-list ─── */}
      {(listOpen || !routeStarted || allDone) && <StopListPanel
        open={listOpen}
        onToggle={() => setListOpen((v) => !v)}
        stops={sortedStops}
        nextStopId={nextStop?.id}
        highlightedId={highlightedId}
        themeColor={themeColor}
        onSelectStop={(s) => {
          setHighlightedId(s.id);
          if (s.latitude != null && s.longitude != null) setFollowMode(false);
        }}
        onOpenDetails={(s) => setSelectedId(s.id)}
        canReorder={!allDone}
        reordering={reorderStops.isPending}
        onMoveStop={handleMoveStop}
        footer={
          <div className="mt-1 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2">
            <label htmlFor="record-drive" className="flex min-h-11 flex-1 cursor-pointer items-center gap-3 text-sm font-medium text-foreground">
              <Switch id="record-drive" checked={recordDrive} onCheckedChange={setRecordDrive} />
              <span>Optag kørsel<span className="block text-xs font-normal text-muted-foreground">Gemmer GPS og bilens position i 14 dage</span></span>
            </label>
            <Button type="button" variant="outline" className="min-h-11" onClick={() => setTraceOpen(true)}>Se optagelse</Button>
          </div>
        }
      />}
      {routeId && <DriveTraceDialog routeId={routeId} open={traceOpen} onOpenChange={setTraceOpen} />}
    </div>
  );
};

const MapInteractionWatcher = forwardRef<never, { onInteract: () => void }>(({ onInteract }, _ref) => {
  const map = useMap();
  useEffect(() => {
    // Vi vil KUN bryde follow-mode ved ægte brugerinput — ikke når vores
    // egen kode kalder panTo/setView, og ikke når layoutet ændrer sig
    // (f.eks. når et bottom-sheet åbner og kortet får invalidateSize).
    // Tidligere lyttede vi på "zoomstart"/"dragstart" generelt, hvilket
    // betød at programmatiske kortbevægelser også slog follow fra og gav
    // et "glitch"-look når moduler kom ind over kortet.
    const handler = (e: any) => {
      // Leaflet sætter originalEvent når interaktionen kommer fra DOM.
      if (e?.originalEvent) onInteract();
    };
    map.on("dragstart", handler);
    map.on("zoomstart", handler);
    map.on("mousedown", handler);
    map.on("touchstart", handler);
    const wheel = () => onInteract();
    const container = map.getContainer();
    container.addEventListener("wheel", wheel, { passive: true });
    return () => {
      map.off("dragstart", handler);
      map.off("zoomstart", handler);
      map.off("mousedown", handler);
      map.off("touchstart", handler);
      container.removeEventListener("wheel", wheel);
    };
  }, [map, onInteract]);
  return null;
});
MapInteractionWatcher.displayName = "MapInteractionWatcher";

/* ─── Collapsible bottom stop-list with live status & map sync ─── */
const StopListPanel = forwardRef<HTMLDivElement, {
  open: boolean;
  onToggle: () => void;
  stops: RouteStop[];
  nextStopId?: string;
  highlightedId: string | null;
  themeColor: string;
  onSelectStop: (s: RouteStop) => void;
  onOpenDetails: (s: RouteStop) => void;
  canReorder: boolean;
  reordering: boolean;
  onMoveStop: (stopId: string, dir: -1 | 1) => void;
  footer?: React.ReactNode;
}>(({
  open, onToggle, stops, nextStopId, highlightedId, themeColor, onSelectStop, onOpenDetails,
  canReorder, reordering, onMoveStop, footer,
}, ref) => {
  const remainingIds = stops.filter((s) => s.status !== "completed").map((s) => s.id);
  const total = stops.length;
  const done = stops.filter((s) => s.status === "completed").length;

  const statusMeta = (s: RouteStop): { label: string; bg: string; text: string; dot: string } => {
    if (s.status === "completed") return {
      label: "Udført",
      bg: "hsl(var(--muted))",
      text: "hsl(var(--muted-foreground))",
      dot: "hsl(142 71% 45%)",
    };
    if (s.id === nextStopId) return {
      label: "Næste",
      bg: "hsl(var(--secondary))",
      text: "hsl(var(--foreground))",
      dot: "hsl(var(--foreground))",
    };
    return {
      label: "Klar",
      bg: "hsl(var(--muted))",
      text: "hsl(var(--muted-foreground))",
      dot: "hsl(var(--muted-foreground))",
    };
  };

  return (
    <div
      ref={ref}
      className="absolute left-0 right-0 bottom-0 z-[1100] pointer-events-none"
      aria-hidden={false}
    >
      <div
        className="pointer-events-auto mx-auto w-full max-w-3xl rounded-t-md border-x border-t border-border bg-card shadow-xl transition-transform duration-300 ease-out md:mr-4 md:max-w-[24rem] lg:max-w-[26rem] xl:max-w-[28rem] 2xl:max-w-[30rem]"
        style={{
          transform: open ? "translateY(0)" : "translateY(calc(100% - 52px))",
          maxHeight: "min(68dvh, 42rem)",
        }}
      >
        {/* Kompakt rail — kun 46px høj når lukket */}
        <Button
          type="button"
          variant="ghost"
          onClick={onToggle}
          className="relative flex h-[52px] w-full items-center justify-start gap-2.5 rounded-t-md px-4 transition-colors hover:bg-secondary/60 active:bg-secondary"
          aria-expanded={open}
          aria-label={open ? "Skjul stop-liste" : "Vis stop-liste"}
        >
          <span className="h-1 w-10 rounded-full bg-muted-foreground/40 absolute left-1/2 -translate-x-1/2 top-1.5" />
          <List className="h-[15px] w-[15px] text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">Alle stop</span>
          <Badge variant="secondary" className="tabular-nums text-[10px] h-5 px-1.5 font-bold rounded-md">
            {done}/{total}
          </Badge>
          <span className="flex-1" />
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </Button>

        <div
          className="space-y-1.5 overflow-y-auto border-t bg-secondary/20 p-2 sm:p-2.5"
          aria-hidden={!open}
          ref={(body) => {
            if (!body) return;
            if (open) body.removeAttribute("inert");
            else body.setAttribute("inert", "");
          }}
          style={{ maxHeight: "calc(min(68dvh, 42rem) - 52px)" }}
        >
          {stops.length === 0 && (
            <div className="py-6 text-center text-sm text-muted-foreground"><NoItemsIcon className="mb-2 h-12 w-12" />Ingen stop på denne rute.</div>
          )}
          {stops.map((s, i) => {
            const isHl = s.id === highlightedId;
            const isDone = s.status === "completed";
            const isNext = s.id === nextStopId;
            const meta = statusMeta(s);
            const posInRemaining = remainingIds.indexOf(s.id);
            return (
              <div
                key={s.id}
                role="button"
                tabIndex={0}
                onClick={() => onSelectStop(s)}
                onDoubleClick={() => onOpenDetails(s)}
                onKeyDown={(e) => {
                  if (e.target !== e.currentTarget) return;
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectStop(s);
                  }
                }}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-md border px-2.5 py-2 text-left transition-colors hover:bg-secondary/50 active:bg-secondary ${
                  isHl ? "ring-2 ring-ring ring-offset-1" : ""
                } ${isNext ? "border-accent/50 bg-accent/[0.06]" : "border-border bg-card"}`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold tabular-nums ${
                    isDone ? "border-success bg-success text-success-foreground" : isNext ? "border-accent bg-card text-foreground" : "border-border bg-card text-muted-foreground"
                  }`}
                >
                  {isDone ? <Check className="h-4 w-4" /> : i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className={`truncate text-sm font-semibold ${isDone ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {s.customer_name || "Stop"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {isNext ? <span className="font-semibold text-accent">Næste · </span> : isDone ? <span className="font-medium text-success">Udført · </span> : null}
                    {s.full_address || s.address || meta.label}
                  </p>
                </div>
                {canReorder && !isDone && (
                  <div className="flex shrink-0 items-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Flyt stoppet tidligere på ruten"
                      disabled={reordering || posInRemaining <= 0}
                      onClick={(e) => { e.stopPropagation(); onMoveStop(s.id, -1); }}
                      className="h-11 w-11 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-25"
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Flyt stoppet senere på ruten"
                      disabled={reordering || posInRemaining < 0 || posInRemaining >= remainingIds.length - 1}
                      onClick={(e) => { e.stopPropagation(); onMoveStop(s.id, 1); }}
                      className="h-11 w-11 text-muted-foreground hover:bg-secondary hover:text-foreground disabled:opacity-25"
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Vis detaljer for stoppet"
                  onClick={(e) => { e.stopPropagation(); onOpenDetails(s); }}
                  className="h-11 w-11 shrink-0 text-muted-foreground hover:bg-secondary hover:text-foreground"
                >
                  <Info className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          {footer}
        </div>
      </div>
    </div>
  );
});
StopListPanel.displayName = "StopListPanel";

export default EmployeeRoute;
