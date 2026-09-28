import { forwardRef, useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, Link, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRouteData, useDirections, useUpdateStopStatus, type RouteStop, type Route } from "@/hooks/useRoutes";
import { useStartStopTime, useEndStopTime, useResetStopTime, useOptimizeRouteFromPosition, useReorderStops } from "@/hooks/useRoutes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft, Navigation, Phone, CheckCircle2, MapPin, List, Clock, Loader2,
  ChevronUp, ChevronDown, Play, Volume2, VolumeX, Crosshair, TrafficCone,
  Plus, Minus,
  Info,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { stripPrices } from "@/lib/employee-display";
import { bearingDegrees, haversineMeters, pointToPolylineMeters } from "@/lib/geo-distance";
import {
  unlockAudio, playArrivalChime, playSuccessChime, playCompleteFanfare, speak, stopSpeaking,
} from "@/lib/employee-audio";
import { usePageVisible } from "@/components/employee-route/usePageVisible";
import { ManeuverIcon, maneuverLabel } from "@/components/employee-route/ManeuverIcon";
import { RouteViewSkeleton } from "@/components/admin/shared/Skeletons";
import { useCurrentManeuver } from "@/components/employee-route/useCurrentManeuver";
import { useMotionTrack, type MotionTrack } from "@/components/employee-route/motionTrack";
import { useGpsFilter, type FilteredFix } from "@/components/employee-route/useGpsFilter";
import { smoothPolyline } from "@/components/employee-route/smoothPolyline";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { pickDuration } from "@/components/route/EtaBreakdown";
import { StopDetailsContent } from "@/components/employee/StopDetailsContent";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import { useEmployeeRouteNotifications, useMarkRouteNotificationRead } from "@/hooks/useEmployeeRouteNotifications";
import { canCompleteEarly, type EarlyCompletionMode } from "@/lib/early-completion";
import RouteChecklistView from "@/components/employee-route/RouteChecklistView";
import RouteModeDialog from "@/components/employee-route/RouteModeDialog";
import { readRunMode, writeRunMode, buzz, type RouteRunMode } from "@/components/employee-route/RouteRunMode";
import {
  evaluateMove, findSpeedOpportunity, minutesNow,
} from "@/components/employee-route/routeSlack";
import { ArrowUp, ArrowDown, Zap } from "lucide-react";

/* ── Map icons ──────────────────────────────────────────────── */
const startIcon = L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:38px;height:46px;">
      <div style="position:absolute;top:0;left:0;width:38px;height:38px;border-radius:50%;background:hsl(0 0% 13%);display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 4px 12px rgba(0,0,0,.25);">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11l18-9-9 18-2-7-7-2z"/></svg>
      </div>
      <div style="position:absolute;bottom:-2px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:6px solid transparent;border-right:6px solid transparent;border-top:8px solid hsl(0 0% 13%);"></div>
    </div>`,
  iconSize: [38, 46],
  iconAnchor: [19, 44],
});

const stopIcon = (
  n: number,
  state: "next" | "done" | "future",
  color: string,
  highlighted = false,
) => {
  // Admin-panel-stil: neutral foreground for "next", muted-grå for "future",
  // grøn for "done".  Vi bruger samme palette som AdminShell/StatCard så
  // medarbejder-appen visuelt er en del af samme design-system — ikke en
  // separat brand-farve.
  const bg =
    state === "done"
      ? "hsl(var(--success))"
      : state === "next"
        ? "hsl(var(--foreground))"
        : "hsl(var(--muted-foreground))";
  const opacity = state === "future" ? 0.9 : 1;
  const ring = state === "next"
    ? `0 0 0 4px hsl(var(--foreground) / 0.15), 0 0 0 9px hsl(var(--foreground) / 0.06)`
    : "none";
  // Highlighted: neutral foreground-ring i stedet for accent.
  const hlRing = highlighted ? `, 0 0 0 4px hsl(var(--foreground)), 0 0 0 8px hsl(var(--foreground) / 0.18)` : "";
  const size = highlighted ? 44 : state === "next" ? 42 : 34;
  const fontSize = state === "next" ? 15 : 12;
  const inner =
    state === "done"
      ? `<svg width="${Math.round(size * 0.5)}" height="${Math.round(size * 0.5)}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`
      : `<span style="color:white;font-weight:800;font-size:${fontSize}px;line-height:1;font-feature-settings:'tnum';">${n}</span>`;
  return L.divIcon({
    className: "",
    html: `
      <div style="position:relative;width:${size}px;height:${Math.round(size * 1.18)}px;opacity:${opacity};">
        <div style="
          width:${size}px;height:${size}px;border-radius:50% 50% 50% 50% / 55% 55% 45% 45%;
          background:${bg};
          display:flex;align-items:center;justify-content:center;
          border:2.5px solid white;
          box-shadow:0 4px 12px rgba(0,0,0,.28)${hlRing};
          ${ring !== "none" ? `outline-offset:0;box-shadow:0 4px 12px rgba(0,0,0,.28), ${ring}${hlRing};` : ""}
        ">${inner}</div>
        <div style="position:absolute;left:50%;top:${size - 4}px;transform:translateX(-50%);width:0;height:0;border-left:5px solid transparent;border-right:5px solid transparent;border-top:7px solid ${bg};filter:drop-shadow(0 1px 1px rgba(0,0,0,.15));"></div>
      </div>`,
    iconSize: [size, Math.round(size * 1.18)],
    iconAnchor: [size / 2, Math.round(size * 1.15)],
  });
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
  html: `
    <div class="nav-puck-rot" style="position:relative;width:64px;height:64px;transform:rotate(0deg);transform-origin:center;will-change:transform;transition:transform 420ms cubic-bezier(0.22, 1, 0.36, 1);">
      <div class="nav-puck-cone" style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:20px solid transparent;border-right:20px solid transparent;border-bottom:34px solid hsl(217 91% 60% / 0.45);opacity:0;transition:opacity 240ms linear;"></div>
      <div style="position:absolute;top:18px;left:18px;width:28px;height:28px;border-radius:50%;background:hsl(217 91% 60%);border:4px solid white;box-shadow:0 4px 14px hsl(217 91% 60% / 0.45), 0 2px 6px rgba(0,0,0,.25);"></div>
    </div>`,
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
  track: MotionTrack;
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
        if (delta < 2) return;
      }
      shownHeading.v = heading;
      const rot = m.getElement()?.querySelector<HTMLElement>(".nav-puck-rot");
      if (rot) rot.style.transform = `rotate(${heading}deg)`;
    });
  }, [track]);

  return null;
};

const userDotIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:hsl(217 91% 60%);border:3px solid white;box-shadow:0 0 0 7px hsl(217 91% 60% / 0.22),0 2px 6px rgba(0,0,0,.25);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

/* ── Helpers ────────────────────────────────────────────────── */
const FitTo = ({ points, enabled }: { points: [number, number][]; enabled: boolean }) => {
  const map = useMap();
  useEffect(() => {
    if (!enabled || points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15, { animate: true });
    } else {
      map.fitBounds(L.latLngBounds(points.map((p) => L.latLng(p[0], p[1]))), {
        padding: [80, 80], maxZoom: 15, animate: true,
      });
    }
    setTimeout(() => map.invalidateSize(), 100);
  }, [points, map, enabled]);
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
const MIN_NAV_ZOOM = 16;
const MAX_NAV_ZOOM = 18.5;
const zoomForSpeed = (mps: number): number => {
  const SLOW = 2, FAST = 18;
  if (mps <= SLOW) return MAX_NAV_ZOOM;
  if (mps >= FAST) return MIN_NAV_ZOOM;
  return MAX_NAV_ZOOM + (MIN_NAV_ZOOM - MAX_NAV_ZOOM) * ((mps - SLOW) / (FAST - SLOW));
};

const NavCamera = forwardRef<never, { active: boolean; track: MotionTrack; speedMps: number }>(({
  active, track, speedMps,
}, _ref) => {
  const map = useMap();
  const speedRef = useRef(speedMps);
  speedRef.current = speedMps;

  useEffect(() => {
    if (!active) return;
    let init = false;
    let last: { t: number; lat: number; lng: number; zoom: number } | null = null;
    let zoom = MAX_NAV_ZOOM;

    return track.subscribe(({ pos }) => {
      if (document.visibilityState === "hidden") return;
      if (!init) {
        zoom = zoomForSpeed(speedRef.current);
        map.setView(pos, zoom, { animate: false });
        init = true;
        last = { t: performance.now(), lat: pos[0], lng: pos[1], zoom };
        return;
      }
      const now = performance.now();
      if (last && now - last.t < 100) return; // maks ~10 fps kamerabevægelse

      const targetZoom = zoomForSpeed(speedRef.current);
      zoom = zoom + (targetZoom - zoom) * 0.12;
      const snapped = Math.round(zoom * 20) / 20;

      const movedM = last ? haversineMeters(last.lat, last.lng, pos[0], pos[1]) : Infinity;
      const zoomChanged = !last || Math.abs(snapped - last.zoom) >= 0.08;
      if (movedM < 1.5 && !zoomChanged) return; // står stille → rør ikke kortet

      map.setView(pos, snapped, { animate: false });
      last = { t: now, lat: pos[0], lng: pos[1], zoom: snapped };
    });
  }, [active, map, track]);

  return null;
});
NavCamera.displayName = "NavCamera";

const DriveMapControls = forwardRef<never, { following: boolean; onFollow: () => void }>(({ following, onFollow }, _ref) => {
  const map = useMap();
  return (
    <div className="absolute right-3 top-1/2 z-[1000] flex -translate-y-1/2 flex-col overflow-hidden rounded-md border border-border/80 bg-card/95 shadow-lg backdrop-blur-md sm:right-5">
      <Button type="button" variant="ghost" size="icon" className="h-12 w-12 rounded-none border-b border-border" onClick={() => map.zoomIn(1)} aria-label="Zoom ind">
        <Plus className="h-5 w-5" strokeWidth={2.5} />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-12 w-12 rounded-none border-b border-border" onClick={() => map.zoomOut(1)} aria-label="Zoom ud">
        <Minus className="h-5 w-5" strokeWidth={2.5} />
      </Button>
      <Button type="button" variant={following ? "default" : "ghost"} size="icon" className="h-12 w-12 rounded-none" onClick={onFollow} aria-label="Centrer på min position">
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
    // easeLinearity tæt på 0.25 giver en mere blød ind-/udfasning end
    // default 0.5 — føles som Google Maps' "fly to" overgang.
    map.flyTo(target, Math.max(map.getZoom(), 16), {
      animate: true,
      duration: 1.1,
      easeLinearity: 0.25,
    });
  }, [target, map]);
  return null;
});
FlyToStop.displayName = "FlyToStop";


const formatKm = (m: number | null) => (m == null ? "—" : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
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
  const { data, isLoading } = useMyRouteData(routeId);
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
  const [collapsed, setCollapsed] = useState(true);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  // Rå GPS-fix fra browseren — sendes gennem useGpsFilter som udjævner
  // jitter inden vi bruger positionen til map/animation/distance-tjek.
  const [rawFix, setRawFix] = useState<{
    lat: number; lng: number; accuracy: number;
    heading: number | null; speed: number | null; t: number;
  } | null>(null);
  const [routeStarted, setRouteStarted] = useState(false);
  // Tjekliste eller kørselsguide. Valget spørges første gang man starter en
  // rute og huskes derefter pr. enhed — men kan altid skiftes undervejs.
  const [runMode, setRunMode] = useState<RouteRunMode>(() => readRunMode() ?? "guide");
  const [modeDialogOpen, setModeDialogOpen] = useState(true);
  const [pendingStopId, setPendingStopId] = useState<string | null>(null);
  const [followMode, setFollowMode] = useState(true);
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
  const [autoReturn, setAutoReturn] = useState<number | null>(null);
  const arrivedAnnouncedRef = useRef<Set<string>>(new Set());
  const finishedAnnouncedRef = useRef(false);
  const lastSpokenStepRef = useRef<string | null>(null);
  // Sticky step pointer — sikrer at turn-by-turn aldrig går baglæns ved GPS-jitter.
  const minStepIndexRef = useRef<{ stopId: string | null; idx: number }>({ stopId: null, idx: 0 });
  const [minStepIndex, setMinStepIndex] = useState(0);
  // Stabil rute-origin: kun opdateret når brugeren har bevæget sig markant.
  // Ellers ville useDirections refetche hver eneste GPS-tick → maneuver-banner ville flimre.
  const stableOriginRef = useRef<{ lat: number; lng: number } | null>(null);
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

  /* Geolocation permission — husk på tværs af sessioner.
   * Browseren persisterer selv "granted/denied" pr. origin, men hvis
   * tilstanden er "granted" ønsker vi at starte watcheren med det samme,
   * så vi har en position klar når brugeren trykker "Start rute" — uden
   * at vise endnu en prompt. */
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
    const MIN_INTERVAL_MS = 4000;
    const SIGNIFICANT_MOVE_M = 40;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
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
      () => {},
      { enableHighAccuracy: routeStarted, maximumAge: 4000, timeout: 12000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [routeStarted, geoPermission, runMode, pageVisible]);

  // Kør rå GPS-fixes gennem jitter-filteret.  Output er en udjævnet
  // position + heading + estimeret hastighed (sidstnævnte bruges også
  // til den hastigheds-adaptive zoom).
  const filtered: FilteredFix | null = useGpsFilter(rawFix);
  useEffect(() => {
    if (!filtered) return;
    setUserPos(filtered.pos);
    if (filtered.heading != null) setUserHeading(filtered.heading);
  }, [filtered?.pos[0], filtered?.pos[1], filtered?.heading]);
  const userSpeedMps = filtered?.speedMps ?? 0;
  const userAccuracyM = filtered?.accuracyM ?? null;

  /* Bryd follow ved manuel kortinteraktion */
  const breakFollow = () => { if (followMode) setFollowMode(false); };

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
  useEffect(() => {
    const stopId = searchParams.get("stop");
    if (!stopId || !sortedStops.some((stop) => stop.id === stopId)) return;
    setHighlightedId(stopId);
    setSelectedId(stopId);
    const next = new URLSearchParams(searchParams);
    next.delete("stop");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, sortedStops]);
  const validStops = useMemo(
    () => sortedStops.filter((s) => s.latitude != null && s.longitude != null),
    [sortedStops],
  );
  const nextStopIdx = sortedStops.findIndex((s) => s.status !== "completed");
  const nextStop: RouteStop | undefined = nextStopIdx >= 0 ? sortedStops[nextStopIdx] : undefined;
  // Knyt kun live-positionen til et stop, når medarbejderen faktisk er ved
  // adressen. Det forhindrer, at næste aftale markeres grøn under hele køreturen.
  const liveStopId = useMemo(() => {
    if (!filtered) return null;
    const accuracyAllowance = Math.min(Math.max(filtered.accuracyM, 0), 40);
    const arrivalRadiusM = 55 + accuracyAllowance;
    let nearest: { id: string; distanceM: number } | null = null;
    for (const stop of sortedStops) {
      if (stop.status === "completed" || stop.latitude == null || stop.longitude == null) continue;
      const distanceM = haversineMeters(
        filtered.pos[0],
        filtered.pos[1],
        Number(stop.latitude),
        Number(stop.longitude),
      );
      if (!nearest || distanceM < nearest.distanceM) nearest = { id: stop.id, distanceM };
    }
    return nearest && nearest.distanceM <= arrivalRadiusM ? nearest.id : null;
  }, [filtered, sortedStops]);
  const routeNotifications = employeeNotifications.filter((item) => item.route_id === routeId && !item.read_at);

  useEffect(() => {
    if (!routeStarted || !pageVisible || !filtered || !meEmp?.id || !route) return;
    let cancelled = false;
    const pushPosition = async () => {
      if (cancelled) return;
      const { error } = await supabase.rpc("report_route_position", {
        _route_id: routeId,
        _latitude: filtered.pos[0],
        _longitude: filtered.pos[1],
        _heading: filtered.heading ?? undefined,
        _accuracy_m: filtered.accuracyM ?? undefined,
        _speed_mps: filtered.speedMps ?? undefined,
        _current_stop_id: liveStopId ?? undefined,
      });
      if (error) console.warn("[live-position] kunne ikke sendes", error.message);
    };
    void pushPosition();
    const timer = window.setInterval(pushPosition, 25_000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [routeStarted, pageVisible, routeId, route?.id, meEmp?.id, liveStopId, filtered?.pos[0], filtered?.pos[1]]);

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

  // Opdater stabil origin kun når brugeren har bevæget sig >120 m (eller første gang).
  // Det betyder at vi ikke spammer route-directions endpoint, og at "steps"-listen
  // forbliver stabil mellem GPS-ticks — så banneret ikke flimrer.
  if (userPos) {
    const prev = stableOriginRef.current;
    if (
      !prev ||
      haversineMeters(prev.lat, prev.lng, userPos[0], userPos[1]) > 120
    ) {
      stableOriginRef.current = { lat: userPos[0], lng: userPos[1] };
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
    if (!previewDirections?.geometry?.coordinates) return [];
    const raw = previewDirections.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
    // Spline-glat ruten så drej og bløde sving fremstår uden "knæk".
    return smoothPolyline(raw);
  }, [previewDirections]);

  const distanceToNextM: number | null = useMemo(() => {
    if (!userPos || !nextStop || nextStop.latitude == null || nextStop.longitude == null) return null;
    return haversineMeters(userPos[0], userPos[1], Number(nextStop.latitude), Number(nextStop.longitude));
  }, [userPos, nextStop?.id, nextStop?.latitude, nextStop?.longitude]);

  // Dynamisk ankomstradius — afvejer to konkurrerende behov:
  //   1) Skal kunne skelne mellem to nabohuse i et villakvarter (typisk
  //      15-25 m mellem matrikler) og lejligheder i samme kompleks.
  //   2) Skal stadig fange brugeren når GPS er upålidelig (indendørs,
  //      gade-kløfter) eller når pin'en er sat lidt skævt af geokoderen.
  //
  // Formel:
  //   - Ved meget præcist fix (acc ≤ 10 m): 18 m radius — tæt nok til at
  //     skelne nabohuse.
  //   - Ved typisk udendørs (acc 10-25 m): 20-35 m — stadig granular.
  //   - Ved dårligt fix (acc > 25 m): glidende op mod 60 m loft.
  //
  // Vi bruger en glat "1.4 × accuracy + offset"-formel clamped til
  // [TIGHT_MIN, LOOSE_MAX] i stedet for en hård tærskel — det giver en
  // mere forudsigelig oplevelse end tidligere step-funktion.
  const TIGHT_MIN_M = 18;
  const LOOSE_MAX_M = 60;
  const arrivalThresholdM = useMemo(() => {
    const acc = userAccuracyM ?? 20;
    // 1.4× giver ~95% sandsynlighed for at den rigtige position er
    // indenfor radius (acc er 1-sigma → 2-sigma ≈ 1.96×, vi vælger 1.4
    // for at være konservative og ikke overlappe naboer).
    const dynamic = Math.round(acc * 1.4 + 4);
    return Math.max(TIGHT_MIN_M, Math.min(LOOSE_MAX_M, dynamic));
  }, [userAccuracyM]);
  // Hysterese: vi træder IND i ankomstzonen ved radius, men træder først
  // UD igen ved 1,8 × radius.  Uden det skifter kortet mellem "fremme" og
  // "kør videre" hver gang GPS sitrer et par meter — præcis den "frem og
  // tilbage"-opførsel der gør guiden forvirrende at stå med i hånden.
  const wasInArrivalRef = useRef(false);
  const inArrivalRadius = useMemo(() => {
    if (distanceToNextM == null) return false;
    const exit = arrivalThresholdM * 1.8;
    const next = wasInArrivalRef.current
      ? distanceToNextM <= exit
      : distanceToNextM <= arrivalThresholdM;
    wasInArrivalRef.current = next;
    return next;
  }, [distanceToNextM, arrivalThresholdM]);

  // Stabiliseret ankomst — kræv at vi har været inden for radius i et par
  // sekunder før vi flipper "fremme" til true.  Det forhindrer at en enkelt
  // jitter-måling udløser ankomst, men føles stadig øjeblikkeligt når man
  // holder ind foran adressen.
  const ARRIVAL_DWELL_MS = 5_000;
  const arrivalEnteredAtRef = useRef<number | null>(null);
  const arrivalStableForStopRef = useRef<string | null>(null);
  const [stableArrival, setStableArrival] = useState(false);

  useEffect(() => {
    // Skift af stop nulstiller dvælet og den stabile flag.
    arrivalEnteredAtRef.current = null;
    wasInArrivalRef.current = false;
    arrivalStableForStopRef.current = null;
    setStableArrival(false);
  }, [nextStop?.id]);

  useEffect(() => {
    if (!nextStop) return;
    if (!inArrivalRadius) {
      // Ude af radius — nulstil timer og evt. tidligere stabil tilstand.
      arrivalEnteredAtRef.current = null;
      if (stableArrival) setStableArrival(false);
      arrivalStableForStopRef.current = null;
      return;
    }
    // Inde i radius — hvis vi allerede er stabil, gør intet.
    if (arrivalStableForStopRef.current === nextStop.id) return;

    if (arrivalEnteredAtRef.current == null) {
      arrivalEnteredAtRef.current = Date.now();
    }
    const elapsed = Date.now() - arrivalEnteredAtRef.current;
    if (elapsed >= ARRIVAL_DWELL_MS) {
      arrivalStableForStopRef.current = nextStop.id;
      setStableArrival(true);
      return;
    }
    // Polling-tjek så vi flipper præcis når dvælet er opfyldt, selv om
    // GPS ikke leverer et nyt fix lige i tide.
    const remaining = ARRIVAL_DWELL_MS - elapsed;
    const timeout = window.setTimeout(() => {
      if (arrivalEnteredAtRef.current != null && nextStop) {
        arrivalStableForStopRef.current = nextStop.id;
        setStableArrival(true);
      }
    }, remaining + 50);
    return () => window.clearTimeout(timeout);
  }, [inArrivalRadius, nextStop?.id, stableArrival]);

  const isAtNextStop = stableArrival;

  /* Ankomstlyd */
  useEffect(() => {
    if (!isAtNextStop || !nextStop || !audioEnabled) return;
    if (arrivedAnnouncedRef.current.has(nextStop.id)) return;
    arrivedAnnouncedRef.current.add(nextStop.id);
    playArrivalChime();
    const name = nextStop.customer_name || "stoppet";
    setTimeout(() => voice(`Du er ankommet til ${name}`), 600);
  }, [isAtNextStop, nextStop?.id, audioEnabled]);

  /* Auto check-in når medarbejder ankommer til stop (geofence) */
  useEffect(() => {
    if (!isAtNextStop || !nextStop) return;
    (async () => {
      try {
        if (!meEmp?.id) return;
        await startStopTime.mutateAsync({ stop_id: nextStop.id, employee_id: meEmp.id });
      } catch { /* non-fatal */ }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAtNextStop, nextStop?.id]);

  const legLine: [number, number][] = useMemo(() => {
    if (!directions?.geometry?.coordinates) return [];
    const raw = directions.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
    return smoothPolyline(raw);
  }, [directions]);

  /* ── Off-route detection (Google-Maps-stil rerouting) ──────────────
   * Når brugeren afviger >40 m fra ruten i 3+ konsekutive GPS-fixes
   * tvinger vi en ny rute fra den nuværende position. Vi venter mindst
   * 8 sek mellem reroutes for ikke at hamre på endpointet ved jitter
   * eller når man netop har drejet væk.
   *
   * Reroute = opdater stableOriginRef + invalidér den gamle
   * directions-cache, så useDirections automatisk fetcher nyt geometri.
   */
  const OFF_ROUTE_THRESHOLD_M = 40;
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
    const dist = pointToPolylineMeters(userPos[0], userPos[1], legLine);
    if (dist > OFF_ROUTE_THRESHOLD_M) {
      offRouteStreakRef.current += 1;
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
        voice("Genberegner ruten");
      }
      // Auto-skjul "rerouting" indikator efter 3 sek selv hvis der ikke er
      // landet et nyt directions-svar (typisk ankommer det inden for 1-2 sek).
      setTimeout(() => setIsRerouting(false), 3000);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userPos?.[0], userPos?.[1], legLine, nextStop?.id, distanceToNextM, routeStarted, audioEnabled]);

  // Reset reroute-spoken pointer når næste stop ændrer sig så vi får
  // ny stemmebesked ved næste reroute event.
  useEffect(() => {
    rerouteSpokenStopRef.current = null;
  }, [nextStop?.id]);

  /* Er vi reelt i bevægelse?  Bruges til at fastfryse pilen når bilen
   * holder stille — ellers snurrer den rundt på ren GPS-støj. */
  const isMoving = userSpeedMps > 1.2; // ~4 km/t
  const lastHeadingRef = useRef<number | null>(null);
  const derivedHeading = useMemo(() => {
    // 1) Filtreret GPS-heading er altid bedst når den findes.
    if (userHeading != null) {
      lastHeadingRef.current = userHeading;
      return userHeading;
    }
    // 2) Ellers: peg mod næste stop — men KUN når vi er i bevægelse og
    //    langt nok væk til at pejlingen er stabil. Tæt på stoppet svinger
    //    pejlingen vildt ved få meters GPS-støj.
    if (
      isMoving &&
      userPos && nextStop && nextStop.latitude != null && nextStop.longitude != null &&
      (distanceToNextM == null || distanceToNextM > 80)
    ) {
      const b = bearingDegrees(userPos[0], userPos[1], Number(nextStop.latitude), Number(nextStop.longitude));
      lastHeadingRef.current = b;
      return b;
    }
    // 3) Holder vi stille: behold den sidst kendte retning.
    return lastHeadingRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userHeading, isMoving, userPos?.[0], userPos?.[1], nextStop?.id, nextStop?.latitude, nextStop?.longitude, distanceToNextM]);

  // Blød bevægelse mellem GPS-fixes. Interpolationen sker UDEN for React
  // (MotionTrack) og skrives direkte på Leaflet-markøren og kameraet — så
  // siden kun re-renderer når der kommer et nyt fix. Det var tidligere
  // ~60 re-renders i sekundet, hvilket gjorde telefonen varm.
  const motionTrack = useMotionTrack(
    userPos,
    derivedHeading,
    routeStarted && pageVisible,
  );
  const displayPos = userPos;
  const displayHeading = derivedHeading;

  const allPoints: [number, number][] = useMemo(() => {
    const pts: [number, number][] = [];
    if (startCoord) pts.push(startCoord);
    for (const s of validStops) pts.push([Number(s.latitude), Number(s.longitude)]);
    return pts;
  }, [startCoord, validStops]);

  const completedCount = sortedStops.filter((s) => s.status === "completed").length;
  const allDone = sortedStops.length > 0 && completedCount === sortedStops.length;
  const progress = sortedStops.length > 0 ? (completedCount / sortedStops.length) * 100 : 0;
  useEffect(() => {
    if (!allDone || !routeStarted) return;
    void supabase.rpc("clear_route_position", { _route_id: routeId });
  }, [allDone, routeStarted, routeId]);
  // Brug Serviceydere accent (dark-blue) som primær handlings-farve i kort-UI'et.
  // route.color beholdes til badges/rute-identifikation i kalenderen.
  const themeColor = "hsl(206 99% 30%)";
  const routeBadgeColor = route?.color || "hsl(206 99% 30%)";

  /* Fanfare ved dagsfærdig */
  useEffect(() => {
    if (!allDone || finishedAnnouncedRef.current || !audioEnabled) return;
    finishedAnnouncedRef.current = true;
    playCompleteFanfare();
    setTimeout(() => voice("Godt arbejde. Alle stop er klaret."), 800);
  }, [allDone, audioEnabled]);

  /* Auto-retur kun når medarbejderen netop har afsluttet ruten i denne session.
   * Historiske/allerede udførte ruter skal blive åbne som opsummering, så man
   * kan se kørslen, statistik og aftaledetaljer uden at blive sendt væk. */
  useEffect(() => {
    if (!allDone || !routeStarted) return;
    setAutoReturn(8);
    const tick = setInterval(() => {
      setAutoReturn((n) => {
        if (n == null) return null;
        if (n <= 1) { clearInterval(tick); navigate("/medarbejder"); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [allDone, routeStarted, navigate]);

  const etaLabel: string | null = useMemo(() => {
    if (!directions?.duration_s) return null;
    const eta = new Date(Date.now() + directions.duration_s * 1000);
    return eta.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  }, [directions?.duration_s]);

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
    voice(`Bemærk: ${sevText} forude. Forsinkelse på cirka ${trafficAlert.addedMin} minutter.`);
  }, [trafficAlert?.severity, trafficAlert?.addedMin, audioEnabled, routeStarted, nextStop?.id]);

  /* Turn-by-turn */
  const maneuver = useCurrentManeuver(directions?.steps, userPos, minStepIndex);
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
  const nearNextStop = distanceToNextM != null && distanceToNextM <= 150;
  const showManeuverBanner = !!maneuver
    && !isAtNextStop
    && !nearNextStop
    && maneuver.distanceToManeuverM <= 800
    && !["depart", "arrive"].includes((maneuver.currentStep.maneuver.type || "").toLowerCase());
  useEffect(() => {
    if (!audioEnabled || !maneuver || !routeStarted) return;
    const type = (maneuver.currentStep.maneuver.type || "").toLowerCase();
    // "Du er fremme" siges af ankomstlyden — ikke som et drej-oplæg.
    if (type === "arrive" || type === "depart") return;
    const stepKey = `${maneuver.stepIndex}-${type}-${maneuver.currentStep.name}`;
    if (lastSpokenStepRef.current === stepKey) return;
    if (maneuver.distanceToManeuverM > 250) return;
    lastSpokenStepRef.current = stepKey;
    const street = maneuver.currentStep.name ? ` ad ${maneuver.currentStep.name}` : "";
    const action = maneuverLabel(maneuver.currentStep.maneuver.type, maneuver.currentStep.maneuver.modifier);
    voice(`Om ${Math.round(maneuver.distanceToManeuverM)} meter, ${action.toLowerCase()}${street}`);
  }, [maneuver?.stepIndex, maneuver?.distanceToManeuverM, audioEnabled, routeStarted]);

  if (isLoading) {
    return <RouteViewSkeleton />;
  }
  if (!data || !route) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 text-muted-foreground">
        <p>Rute ikke fundet eller du har ikke adgang.</p>
        <Button variant="outline" onClick={onBack}>Tilbage</Button>
      </div>
    );
  }

  const handleNavigate = (s: RouteStop) => {
    const dest = s.address || (s.latitude && s.longitude ? `${s.latitude},${s.longitude}` : s.customer_name || "");
    if (!dest) return;
    window.open(
      `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`,
      "_blank",
    );
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
      const res = await optimizeLive.mutateAsync({ routeId, lat: pos[0], lng: pos[1] });
      if (res.order_changed) {
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
    const ev = evaluateMove(list, from, to, flexOrigin, minutesNow());
    const completed = sortedStops.filter((s) => s.status === "completed");
    const updates = [...completed, ...ev.order].map((s, i) => ({ id: s.id, sequence: i + 1 }));
    try {
      await reorderStops.mutateAsync(updates);
      buzz(14);
      toast.success("Rækkefølgen er ændret");
    } catch {
      toast.error("Kunne ikke ændre rækkefølgen", { description: "Prøv igen om lidt." });
    }
  };



  const handleComplete = async (s: RouteStop) => {
    if (routeDateLocked) {
      toast.error("Ruten kan først udføres på selve dagen");
      return;
    }
    setPendingStopId(s.id);
    try {
      // Stop tidsregistrering for den loggede medarbejder på denne aftale
      try {
        if (meEmp?.id) {
          await endStopTime.mutateAsync({ stop_id: s.id, employee_id: meEmp.id });
        }
      } catch { /* non-fatal */ }
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
        { description: finished ? undefined : `${total - doneNow} stop tilbage på ruten.` },
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
    try {
      if (meEmp?.id) {
        await resetStopTime.mutateAsync({ stop_id: s.id, employee_id: meEmp.id });
      }
      await updateStatus.mutateAsync({ id: s.id, status: "pending" });
      toast.success("Markering fortrudt");
    } catch {
      toast.error("Kunne ikke fortryde markeringen", {
        description: "Prøv igen om et øjeblik.",
      });
    }
  };

  /** Selve starten — kaldes når tilstanden (tjekliste/guide) er valgt. */
  const beginRoute = (mode: RouteRunMode) => {
    setRunMode(mode);
    unlockAudio();
    setRouteStarted(true);
    setFollowMode(true);
    setCollapsed(true);
    toast.success("Rute startet — god tur!");
    if (mode === "guide" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserPos([pos.coords.latitude, pos.coords.longitude]);
          if (typeof pos.coords.heading === "number" && !Number.isNaN(pos.coords.heading)) {
            setUserHeading(pos.coords.heading);
          }
        },
        () => {},
        { enableHighAccuracy: true, maximumAge: 0, timeout: 8000 },
      );
    }
    // Ved start: læg dagens rækkefølge efter hvor medarbejderen faktisk er.
    setTimeout(() => void reoptimizeFromHere({ silent: true }), 1500);
  };

  /* ── Tjekliste-tilstand: den simple visning uden kort og GPS ── */
  if (routeStarted && runMode === "list") {
    return (
      <RouteChecklistView
        routeName={route.name || "Rute"}
        themeColor={themeColor}
        stops={sortedStops}
        pendingId={pendingStopId}
        locked={routeDateLocked}
        onComplete={handleComplete}
        onUndo={handleUndo}
        onNavigate={handleNavigate}
        onSwitchToGuide={() => {
          setRunMode("guide");
          writeRunMode("guide", !!readRunMode());
          toast.success("Skiftet til kørselsguide");
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
        onToggleAudio={() => {
          unlockAudio();
          setAudioEnabled((value) => !value);
          if (!audioEnabled) playStartChime();
        }}
      />
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
          <h1 className="mt-1 truncate text-lg font-semibold text-foreground">{route.name || "Dagens rute"}</h1>
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

  return (
    <div className="employee-route-run fixed inset-0 flex flex-col bg-background overflow-hidden">
      {/* ─── Compact header — admin-stil (h-14, neutral palette).  Kun
          synlig før rute starter eller ved færdig.  Lyd-knappen findes
          som floating control under kørsel — ingen dubletter her. ─── */}
      {(!routeStarted || allDone) && (
        <header className="relative shrink-0 z-30 bg-card border-b border-border">
          <div className="flex h-14 items-center gap-3 px-4">
            <Button
              asChild
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground shrink-0"
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
                {completedCount} af {sortedStops.length} stop færdige
              </p>
            </div>

            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              onClick={() => setListOpen((v) => !v)}
              aria-label="Vis liste"
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-9 w-9 rounded-lg hover:bg-secondary text-muted-foreground hover:text-foreground"
              onClick={() => setAudioEnabled((v) => !v)}
              aria-label={audioEnabled ? "Slå lyd fra" : "Slå lyd til"}
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
        <div className="relative z-30 border-b border-destructive/25 bg-destructive/5 px-3 py-2">
          <div className="mx-auto flex max-w-3xl items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[10px] font-semibold uppercase text-destructive">
                {routeNotifications[0].route_stops?.customer_name
                  ? `Aftale · ${routeNotifications[0].route_stops.customer_name}`
                  : `Rute · ${routeNotifications[0].routes?.name || route.name || "Dagens rute"}`}
              </p>
              <p className="text-xs font-medium text-foreground">{routeNotifications[0].message}</p>
            </div>
            <Button size="sm" variant="outline" className="h-8 shrink-0 text-xs" onClick={() => routeNotifications.forEach((item) => markNotificationRead.mutate(item.id))}>Markér som læst</Button>
          </div>
        </div>
      )}

      {/* ─── Map fills everything ─── */}
      <div className="relative flex-1 min-h-0">
        {allPoints.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground p-6 text-center">
            Ingen koordinater tilgængelige. Brug listevisningen i stedet.
          </div>
        ) : (
          <MapContainer
            center={userPos || allPoints[0]}
            zoom={13}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
            doubleClickZoom
            touchZoom
            boxZoom
            dragging
            zoomControl={false}
            attributionControl={false}
            zoomSnap={0.25}
            zoomDelta={0.5}
            wheelDebounceTime={20}
            wheelPxPerZoomLevel={120}
            zoomAnimation={false}
            fadeAnimation={false}
            markerZoomAnimation={false}
            inertia
            inertiaDeceleration={2400}
            preferCanvas
          >
            {/*
              To overlejrede TileLayers + CSS-opacity crossfade:
              begge er altid mounted (så satellit-fliserne er forhåndshentet
              og skiftet er instant), men vi fader mellem dem via en wrapper-
              klasse på .leaflet-tile-pane.  Det giver en blød 320 ms overgang
              uden at fliserne hak'er ind.
            */}
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; OpenStreetMap-bidragydere'
              updateWhenIdle
              updateWhenZooming={false}
              keepBuffer={2}
              zIndex={1}
              maxZoom={20}
              maxNativeZoom={19}
            />

            {/* Fit overview when not started */}
            <FitTo points={allPoints} enabled={!routeStarted} />
            {/* Ét samlet kamera: følger positionen og justerer zoom efter farten. */}
            <NavCamera
              active={routeStarted && followMode && pageVisible}
              track={motionTrack}
              speedMps={userSpeedMps}
            />
            {routeStarted && (
              <DriveMapControls
                following={followMode}
                onFollow={() => setFollowMode(true)}
              />
            )}

            {startCoord && <Marker position={startCoord} icon={startIcon} />}

            {/* Preview-route — vist FØR start, så hele turen er synlig.
                Tegnet under (lavere z) det aktive leg når begge findes. */}
            {previewLine.length > 1 && (
              <>
                <Polyline
                  positions={previewLine}
                  pathOptions={{
                    color: "white",
                    weight: routeStarted ? 8 : 12,
                    opacity: routeStarted ? 0.6 : 0.9,
                    lineCap: "round",
                    lineJoin: "round",
                  }}
                />
                <Polyline
                  positions={previewLine}
                  pathOptions={{
                    color: themeColor,
                    weight: routeStarted ? 4 : 6,
                    opacity: routeStarted ? 0.55 : 0.85,
                    lineCap: "round",
                    lineJoin: "round",
                    dashArray: "2 10",
                  }}
                />
              </>
            )}

            {/* Route line — aktivt leg.  Skjules når man er fremme:
                vejgeometrien snapper til vejnetværket og kan slutte
                lidt fra selve adresse-pin'en (især når pin'en ligger på
                en bygning væk fra vejen).  Når man er inden for ankomst-
                zonen er en linje "tilbage til vejen" kun forvirrende. */}
            {legLine.length > 1 && !isAtNextStop && (
              <>
                {/* Outer white casing for contrast */}
                <Polyline
                  positions={legLine}
                  pathOptions={{ color: "white", weight: 14, opacity: 0.95, lineCap: "round", lineJoin: "round" }}
                />
                {/* Soft outer glow */}
                <Polyline
                  positions={legLine}
                  pathOptions={{ color: themeColor, weight: 12, opacity: 0.25, lineCap: "round", lineJoin: "round" }}
                />
                {/* Core route */}
                <Polyline
                  positions={legLine}
                  pathOptions={{ color: themeColor, weight: 7, opacity: 1, lineCap: "round", lineJoin: "round" }}
                />
              </>
            )}

            {/* Hvis vejberegningen mangler, vises retningen stadig tydeligt. */}
            {routeStarted && legLine.length < 2 && displayPos && nextStop?.latitude != null && nextStop?.longitude != null && (
              <Polyline
                positions={[displayPos, [Number(nextStop.latitude), Number(nextStop.longitude)]]}
                pathOptions={{ color: themeColor, weight: 6, opacity: 0.75, dashArray: "8 10", lineCap: "round" }}
              />
            )}

            {/* Ankomst-indikator: lille stiplet linje fra puck til pin
                så det er entydigt hvilken adresse man er ankommet til,
                også når rutens vejgeometri ville pege en anden vej. */}
            {isAtNextStop && displayPos && nextStop?.latitude != null && nextStop?.longitude != null && (
              <Polyline
                positions={[displayPos, [Number(nextStop.latitude), Number(nextStop.longitude)]]}
                pathOptions={{
                  color: "hsl(142 70% 45%)",
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
                  eventHandlers={{ click: () => { setHighlightedId(s.id); setSelectedId(s.id); } }}
                />
              );
            })}

            {/* User position — Google Maps-stil puck når man kører.
                NavPuckMarker er stabil: kun CSS-transform ændres ved heading-skift,
                ingen re-mount af DOM = ingen flicker under reroutes. */}
            {displayPos && routeStarted && displayHeading != null && (
              <NavPuckMarker track={motionTrack} fallback={displayPos} moving={isMoving} />
            )}
            {displayPos && (!routeStarted || displayHeading == null) && (
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
        )}

        {routeStarted && directionsError && (
          <div className="absolute left-3 right-[68px] top-[72px] z-[1001] rounded-xl border border-border bg-card/95 p-3 shadow-lg backdrop-blur-md">
            <p className="text-sm font-semibold text-foreground">Vejvisningen kunne ikke hentes</p>
            <p className="mt-0.5 text-xs text-muted-foreground">Du kan stadig se retningen til næste stop.</p>
            <Button type="button" variant="outline" size="sm" className="mt-2 h-9" onClick={() => retryDirections()}>Prøv igen</Button>
          </div>
        )}

        {/* ─── "Ruten kan køres hurtigere" — vises kun når der reelt er
             minutter at hente i en anden rækkefølge. ─── */}


        {/* ─── Aktiv kørselsbjælke: alle primære kontroller samlet ét sted ─── */}
        {routeStarted && !allDone && (
          <>
            <div className="absolute left-2 right-2 top-[max(0.5rem,env(safe-area-inset-top))] z-[1002] sm:left-4 sm:right-4 lg:left-auto lg:w-[26rem] xl:w-[28rem] 2xl:w-[30rem]">
              <div className="flex h-14 w-full items-center gap-2 rounded-md border border-border/80 bg-foreground px-2 text-background shadow-xl">
                <Button asChild variant="ghost" size="icon" className="h-10 w-10 shrink-0 text-background hover:bg-background/10 hover:text-background">
                  <Link to="/medarbejder" aria-label="Tilbage">
                    <ArrowLeft className="h-5 w-5" />
                  </Link>
                </Button>
                <div className="min-w-0 flex-1 border-l border-background/15 pl-3">
                  <p className="truncate text-[13px] font-semibold leading-tight text-background">{route.name || "Dagens rute"}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-[10px] font-medium text-background/65">
                    <span>{completedCount}/{sortedStops.length} stop</span>
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("h-10 w-10 shrink-0 text-background hover:bg-background/10 hover:text-background", listOpen && "bg-background/15")}
                  onClick={() => setListOpen((value) => !value)}
                  aria-label="Vis alle stop"
                  aria-pressed={listOpen}
                >
                  <List className="h-5 w-5" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 shrink-0 text-background hover:bg-background/10 hover:text-background"
                  onClick={() => setAudioEnabled((value) => !value)}
                  aria-label={audioEnabled ? "Slå lyd fra" : "Slå lyd til"}
                  aria-pressed={!audioEnabled}
                >
                  {audioEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
                </Button>
              </div>
            </div>

            {/* Næste manøvre — placeret under den faste kørselsbjælke */}
            {showManeuverBanner && maneuver && nextStop && (
              <div className="absolute left-2 right-[4.25rem] top-[calc(max(0.5rem,env(safe-area-inset-top))+4rem)] z-[1000] pointer-events-none sm:left-4 sm:right-[5rem] lg:left-auto lg:right-4 lg:w-[26rem] xl:w-[28rem] 2xl:w-[30rem]">
                <Card className="overflow-hidden rounded-md border-border bg-card/97 shadow-xl pointer-events-auto animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-stretch">
                    <div className="flex w-[76px] shrink-0 flex-col items-center justify-center bg-accent px-1 py-3 text-accent-foreground">
                      <ManeuverIcon
                        type={maneuver.currentStep.maneuver.type}
                        modifier={maneuver.currentStep.maneuver.modifier}
                       className="h-9 w-9"
                      />
                      <span className="text-[13px] font-bold tracking-tight mt-1.5 tabular-nums leading-none">
                        {formatKm(maneuver.distanceToManeuverM)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 px-3.5 py-3">
                      <p className="font-bold text-[17px] leading-tight truncate text-foreground">
                        {maneuverLabel(maneuver.currentStep.maneuver.type, maneuver.currentStep.maneuver.modifier)}
                      </p>
                      {maneuver.currentStep.name && (
                        <p className="text-[13px] text-muted-foreground truncate mt-0.5">
                          ad <span className="font-semibold text-foreground">{maneuver.currentStep.name}</span>
                        </p>
                      )}
                      {maneuver.nextStep && (
                        <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-border text-[11px] text-muted-foreground">
                          <span className="font-semibold uppercase tracking-wide text-[10px]">Derefter</span>
                          <ManeuverIcon
                            type={maneuver.nextStep.maneuver.type}
                            modifier={maneuver.nextStep.maneuver.modifier}
                            className="h-3.5 w-3.5 text-foreground"
                          />
                          <span className="truncate">
                            {maneuverLabel(maneuver.nextStep.maneuver.type, maneuver.nextStep.maneuver.modifier)}
                            {maneuver.nextStep.name && ` · ${maneuver.nextStep.name}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>
              </div>
            )}

            {/* Reroute-banner — Google Maps-stil "genberegner" prompt */}
            {isRerouting && (
              <div className="absolute top-[68px] left-3 right-[68px] z-[1001] pointer-events-none">
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

            {/* Trafik-banner — Serviceydere amber, kvalitativ severity */}
            {!isRerouting && trafficAlert && (() => {
              const sev = trafficAlert.severity;
              const sevLabel = sev === "let" ? "Let trafik" : sev === "moderat" ? "Moderat trafik" : "Tæt trafik";
              const sevDots = sev === "let" ? 1 : sev === "moderat" ? 2 : 3;
              // Farver matcher Serviceydere palette: blød amber for advarsel
              const tone = {
                bg: "hsl(38 100% 97%)",
                border: "hsl(38 90% 78%)",
                accent: sev === "tæt" ? "hsl(20 90% 50%)" : sev === "moderat" ? "hsl(28 92% 52%)" : "hsl(38 95% 55%)",
                text: "hsl(28 70% 22%)",
                sub: "hsl(28 45% 38%)",
                chip: "hsl(38 100% 90%)",
              };
              return (
                <div className={`absolute ${showManeuverBanner ? "top-[12.5rem]" : "top-[4.75rem]"} left-2 right-[4.25rem] z-[1000] pointer-events-none sm:left-4 sm:right-[5rem] lg:left-auto lg:right-4 lg:w-[26rem] xl:w-[28rem] 2xl:w-[30rem]`}>
                  <div
                    className="pointer-events-auto rounded-2xl shadow-2xl overflow-hidden border animate-in fade-in slide-in-from-top-2 duration-300"
                    style={{ background: tone.bg, borderColor: tone.border }}
                  >
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <div
                        className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                        style={{ background: tone.accent, color: "white" }}
                      >
                        <TrafficCone className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <p className="text-sm font-bold leading-tight" style={{ color: tone.text }}>
                            {sevLabel}
                          </p>
                          {/* Severity dots */}
                          <span className="flex items-center gap-0.5 ml-0.5">
                            {[0, 1, 2].map((i) => (
                              <span
                                key={i}
                                className="h-1.5 w-1.5 rounded-full transition-opacity"
                                style={{
                                  background: tone.accent,
                                  opacity: i < sevDots ? 1 : 0.25,
                                }}
                              />
                            ))}
                          </span>
                        </div>
                        <p className="text-[11px] leading-tight mt-0.5 tabular-nums" style={{ color: tone.sub }}>
                          Forsinker ankomst med ca. {trafficAlert.addedMin} min
                        </p>
                      </div>
                      <button
                        onClick={() => setTrafficAlert(null)}
                        className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg shrink-0 transition-opacity hover:opacity-80"
                        style={{ color: tone.text, background: tone.chip }}
                        aria-label="Luk advarsel"
                      >
                        OK
                      </button>
                    </div>
                  </div>
                </div>
              );
            })()}
          </>
        )}

        {/* ─── Active driving card ─── */}
        {routeStarted && !allDone && nextStop && (
          <div className="pointer-events-none absolute bottom-[calc(52px+env(safe-area-inset-bottom))] inset-x-0 z-[1000] p-2 sm:p-4 md:left-auto md:right-4 md:w-[24rem] md:p-0 lg:bottom-[60px] lg:w-[26rem] xl:w-[28rem] 2xl:w-[30rem]">
            <Card className="route-drive-dock pointer-events-auto mx-auto max-w-xl lg:max-w-none overflow-hidden rounded-md border-border/80 bg-card/97 shadow-xl backdrop-blur-md supports-[backdrop-filter]:bg-card/92">
              {/* Segmenteret progress — tynd, diskret */}
              <div className="flex gap-1 bg-secondary/60 px-3 py-1.5">
                {sortedStops.map((s, i) => (
                  <div
                    key={s.id}
                    className="flex-1 h-1 rounded-full transition-all"
                    style={{
                      background:
                        s.status === "completed"
                          ? "hsl(142 70% 45%)"
                          : i === nextStopIdx
                            ? themeColor
                            : "hsl(220 14% 92%)",
                    }}
                  />
                ))}
              </div>
              <Button
                type="button"
                variant="ghost"
                className="group h-auto w-full justify-start rounded-none border-t border-border/50 px-3.5 py-3 hover:bg-secondary/50 active:bg-secondary/70"
                onClick={() => setCollapsed((c) => !c)}
                aria-expanded={!collapsed}
                aria-label={collapsed ? "Vis stop-detaljer" : "Skjul stop-detaljer"}
              >
                <span
                   className="flex h-10 w-10 items-center justify-center rounded-md text-background text-base font-bold shrink-0"
                  style={{ background: themeColor }}
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
                {isAtNextStop ? (
                  <Badge className="gap-1 text-[10px] h-6 px-2 border-0 font-semibold uppercase tracking-wide bg-success/15 text-success">
                    <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-emerald-500" />
                    Fremme
                  </Badge>
                ) : distanceToNextM != null ? (
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground tabular-nums leading-tight">
                      {/* Tæt på stoppet er vejafstanden misvisende (den peger
                          rundt om bygningen) — der viser vi den direkte
                          afstand, ellers vejafstanden fra ruten. */}
                      {formatKm(nearNextStop ? distanceToNextM : (directions?.distance_m ?? distanceToNextM))}
                    </p>
                    {/* Én linje under afstanden: enten "næsten fremme", en
                        tydelig forsinkelse, eller hvornår du er fremme.
                        Aldrig "96 min i god tid" — det siger intet brugbart. */}
                    {nearNextStop ? (
                    <p className="text-[10px] leading-tight font-semibold text-success">
                      næsten fremme
                    </p>
                  ) : directions?.duration_s != null ? (
                    <p className="text-[10px] text-muted-foreground leading-tight tabular-nums">
                      {formatMin(directions.duration_s)}
                    </p>
                  ) : (
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      til næste
                    </p>
                  )}
                  </div>
                ) : null}
                <span className="ml-1 text-muted-foreground/70 group-hover:text-foreground transition-colors">
                  {collapsed ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              </Button>

              {/* Altid synlig: kompakt CTA-rad — så medarbejderen kan markere
                  udført / navigere uden at åbne detaljer (og uden at miste
                  kortvisningen). */}
              {collapsed && (
                <div className="grid grid-cols-[minmax(0,1fr)_44px_44px] gap-2 border-t border-border/60 bg-secondary/25 px-3 py-2.5">
                  <Button
                    onClick={() => handleComplete(nextStop)}
                    size="sm"
                     className={`gap-1.5 h-11 rounded-md text-[13px] font-semibold transition-colors ${
                      isAtNextStop
                        ? "bg-success hover:bg-success/90 text-success-foreground shadow-sm"
                        : "bg-warning text-warning-foreground hover:bg-warning/90"
                    }`}
                    disabled={updateStatus.isPending || routeDateLocked}
                  >
                    {updateStatus.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {isAtNextStop ? "Markér som udført" : "Markér udført nu"}
                  </Button>
                  <Button
                    onClick={() => handleNavigate(nextStop)}
                    variant="outline"
                    size="sm"
                    aria-label="Åbn i Maps"
                    className="h-11 w-11 p-0 rounded-md border-border hover:bg-secondary"
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                  {nextStop.customer_phone ? (
                    <Button asChild variant="outline" size="sm" aria-label="Ring til kunde" className="h-11 w-11 p-0 rounded-md border-border hover:bg-secondary">
                      <a href={`tel:${nextStop.customer_phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" aria-label="Ingen telefon" disabled className="h-11 w-11 p-0 rounded-md border-border">
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}

              {!collapsed && (
                <div className="p-3 pt-2 space-y-2.5 border-t border-border/60">
                  {/* Adresse + service */}
                  {((nextStop.full_address || nextStop.address) || (nextStop.service_summary && stripPrices(nextStop.service_summary))) && (
                    <div className="rounded-md bg-secondary/40 border border-border/60 p-2.5 space-y-1.5">
                      {(nextStop.full_address || nextStop.address) && (
                        <p
                          className="text-[13px] flex items-start gap-1.5 leading-snug"
                          title={nextStop.full_address || nextStop.address || undefined}
                        >
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                          <span className="font-semibold text-foreground">{nextStop.full_address || nextStop.address}</span>
                        </p>
                      )}
                      {nextStop.service_summary && stripPrices(nextStop.service_summary) && (
                        <p className="text-[12px] text-muted-foreground line-clamp-2 pl-5">
                          {stripPrices(nextStop.service_summary)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Info-grid: km, tid, ETA */}
                  {(directions || etaLabel) && (
                    <div className="grid grid-cols-3 divide-x divide-border rounded-md border border-border bg-background overflow-hidden">
                        <div className="px-2 py-1.5 text-center">
                          <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Distance</p>
                          <p className="text-sm font-bold tabular-nums mt-0.5 text-foreground">
                            {directions?.distance_m != null ? formatKm(directions.distance_m) : "—"}
                          </p>
                        </div>
                        <div className="px-2 py-1.5 text-center">
                          <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Køretid</p>
                          <p className="text-sm font-bold tabular-nums mt-0.5 text-foreground">
                            {(() => {
                              const d = directions ? pickDuration(directions, false) : null;
                              return d != null ? formatMin(d) : "—";
                            })()}
                          </p>
                        </div>
                        <div className="px-2 py-1.5 text-center">
                          <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Ankomst</p>
                          <p className="text-sm font-bold tabular-nums mt-0.5 text-foreground">
                            {etaLabel || "—"}
                          </p>
                        </div>
                    </div>
                  )}

                  {/* Sekundær handling — kun "Detaljer" (Maps/Ring/Markér udført
                      ligger allerede i den altid-synlige action-rad ovenfor, så
                      vi undgår dobbeltvisning og holder kortet kompakt). */}
                  <Button
                    onClick={() => setSelectedId(nextStop.id)}
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 h-10 rounded-md text-xs font-semibold border-border hover:bg-secondary transition-colors"
                  >
                    <Info className="h-3.5 w-3.5" /> Se alle detaljer
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ─── Done state ─── */}
        {allDone && (
          <div className="absolute bottom-[calc(52px+env(safe-area-inset-bottom))] inset-x-0 z-[1000] p-2 sm:p-4 md:left-auto md:right-4 md:w-[24rem] md:p-0 lg:bottom-[60px] lg:w-[26rem] xl:w-[28rem] 2xl:w-[30rem]">
            <Card className="mx-auto max-w-xl lg:max-w-none overflow-hidden rounded-md border-border bg-card/97 shadow-xl backdrop-blur-md">
              <div className="space-y-3 p-3.5 text-center sm:p-4">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-md bg-success/10 text-success">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-base font-semibold text-foreground">Rute færdig</p>
                  <p className="text-xs text-muted-foreground">
                    Alle {sortedStops.length} stop udført
                    {autoReturn != null && autoReturn > 0 && ` · oversigt om ${autoReturn}s`}
                  </p>
                </div>
                {/* Mini-stats */}
                <div className="grid grid-cols-2 divide-x divide-border rounded-md border border-border bg-background overflow-hidden">
                  <div className="px-2 py-2.5">
                    <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Stop</p>
                    <p className="text-sm font-semibold tabular-nums text-foreground mt-0.5">{sortedStops.length}</p>
                  </div>
                  <div className="px-2 py-2.5">
                    <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Distance</p>
                    <p className="text-sm font-semibold tabular-nums text-foreground mt-0.5">
                      {route.total_distance_km != null ? `${route.total_distance_km.toFixed(1)} km` : "—"}
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                    className="h-11 w-full gap-2 rounded-md bg-foreground text-background hover:bg-foreground/90"
                  onClick={() => { setAutoReturn(null); navigate("/medarbejder"); }}
                >
                  Til oversigt
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* ─── Stop detail sheet ─── */}
      <Sheet
        open={!!selectedId}
        onOpenChange={(o) => {
          if (!o) {
            setSelectedId(null);
          }
        }}
      >
        <SheetContent
          side="bottom"
          className="h-dvh max-h-dvh p-0 flex flex-col rounded-none sm:h-[92dvh] sm:max-h-[92dvh] sm:rounded-t-md lg:bottom-4 lg:left-auto lg:right-4 lg:h-[calc(100dvh-2rem)] lg:max-h-[calc(100dvh-2rem)] lg:w-[30rem] lg:rounded-md"
        >
          <div className="flex-1 overflow-y-auto">
          {(() => {
            const s = sortedStops.find((x) => x.id === selectedId);
            if (!s) return null;
            const idx = sortedStops.indexOf(s);
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
                isPending={updateStatus.isPending}
              />
            );
          })()}
          </div>
        </SheetContent>
      </Sheet>

      {/* ─── Persistent collapsible bottom stop-list ─── */}
      <StopListPanel
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
      />
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
    return () => {
      map.off("dragstart", handler);
      map.off("zoomstart", handler);
      map.off("mousedown", handler);
      map.off("touchstart", handler);
    };
  }, [map, onInteract]);
  return null;
});
MapInteractionWatcher.displayName = "MapInteractionWatcher";

/* ─── Collapsible bottom stop-list with live status & map sync ─── */
const StopListPanel = ({
  open, onToggle, stops, nextStopId, highlightedId, themeColor, onSelectStop, onOpenDetails,
  canReorder, reordering, onMoveStop,
}: {
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
}) => {
  const remainingIds = stops.filter((s) => s.status !== "completed").map((s) => s.id);
  const total = stops.length;
  const done = stops.filter((s) => s.status === "completed").length;

  const statusMeta = (s: RouteStop): { label: string; bg: string; text: string; dot: string } => {
    if (s.status === "completed") return {
      label: "Færdig",
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
        <button
          type="button"
          onClick={onToggle}
          className="relative flex h-[52px] w-full items-center gap-2.5 rounded-t-md px-4 transition-colors hover:bg-secondary/60 active:bg-secondary"
          aria-expanded={open}
          aria-label={open ? "Skjul stop-liste" : "Vis stop-liste"}
        >
          <span className="h-1 w-10 rounded-full bg-muted-foreground/40 absolute left-1/2 -translate-x-1/2 top-1.5" />
          <List className="h-[15px] w-[15px] text-muted-foreground" />
          <span className="text-xs font-bold text-foreground">Alle stop</span>
          <Badge variant="secondary" className="tabular-nums text-[10px] h-5 px-1.5 font-bold rounded-md">
            {done}/{total}
          </Badge>
          {/* Mini progress dots — kompakt */}
          <div className="flex-1 flex gap-0.5 items-center justify-end overflow-hidden">
            {stops.slice(0, 12).map((s) => (
              <span
                key={s.id}
                className="h-1.5 w-1.5 rounded-full shrink-0"
                style={{
                  background:
                    s.status === "completed"
                      ? "hsl(142 71% 45%)"
                      : s.id === nextStopId
                        ? "hsl(var(--foreground))"
                        : "hsl(var(--muted-foreground) / 0.35)",
                }}
              />
            ))}
            {stops.length > 12 && (
              <span className="text-[9px] text-muted-foreground tabular-nums ml-0.5 font-bold">+{stops.length - 12}</span>
            )}
          </div>
          {open ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronUp className="h-4 w-4 text-muted-foreground" />}
        </button>

        <div
          className="space-y-1.5 overflow-y-auto border-t bg-secondary/20 p-2 sm:p-2.5"
          style={{ maxHeight: "calc(min(68dvh, 42rem) - 52px)" }}
        >
          {stops.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Ingen stop på denne rute.</p>
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
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelectStop(s);
                  }
                }}
                className={`flex w-full cursor-pointer items-center gap-2 rounded-md border p-2 text-left transition-colors hover:bg-secondary/50 active:bg-secondary sm:gap-2.5 sm:p-2.5 ${
                  isHl ? "ring-2 ring-ring ring-offset-1" : ""
                } ${isDone ? "opacity-60" : ""} ${
                  isNext
                    ? "border-foreground/30 bg-secondary/40 shadow-sm"
                    : "border-border bg-card"
                }`}
                style={{
                  borderLeftWidth: isNext ? 4 : 1,
                  borderLeftColor: isNext
                    ? "hsl(var(--foreground))"
                    : isDone
                      ? "hsl(142 71% 45%)"
                      : "hsl(var(--border))",
                }}
              >
                {/* Tids-kolonne — kalender-stil */}
                <div className="flex w-9 shrink-0 flex-col items-center justify-start pt-0.5 sm:w-11">
                  <span
                     className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[4px] text-[12px] font-bold text-background shadow-sm sm:h-9 sm:w-9 sm:text-[13px] ${
                      isDone
                        ? "bg-emerald-500"
                        : isNext
                          ? "bg-foreground"
                          : "bg-muted-foreground/70"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className={`font-bold text-[14px] truncate ${isDone ? "line-through text-muted-foreground" : "text-foreground"}`}>
                      {s.customer_name || "Stop"}
                    </p>
                    <Badge
                      className="text-[9px] h-5 px-2 border-0 font-bold uppercase tracking-wider gap-1 rounded-full"
                      style={{ background: meta.bg, color: meta.text }}
                    >
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${isNext ? "animate-pulse" : ""}`}
                        style={{ background: meta.dot }}
                      />
                      {meta.label}
                    </Badge>
                  </div>
                  {(s.full_address || s.address) && (
                    <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-1">
                      <MapPin className="h-3 w-3 shrink-0" />{s.full_address || s.address}
                    </p>
                  )}
                </div>
                <div className="flex flex-col items-center justify-center gap-1 shrink-0">
                  {canReorder && !isDone && (
                    <div className="flex flex-col gap-1">
                      <button
                        type="button"
                        aria-label="Flyt stoppet tidligere på ruten"
                        disabled={reordering || posInRemaining <= 0}
                        onClick={(e) => { e.stopPropagation(); onMoveStop(s.id, -1); }}
                         className="h-8 w-8 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        aria-label="Flyt stoppet senere på ruten"
                        disabled={reordering || posInRemaining < 0 || posInRemaining >= remainingIds.length - 1}
                        onClick={(e) => { e.stopPropagation(); onMoveStop(s.id, 1); }}
                         className="h-8 w-8 rounded-md border border-border bg-card flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-secondary disabled:opacity-30 transition-colors"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenDetails(s); }}
                    className="text-[10px] font-bold text-muted-foreground hover:text-foreground px-2 py-1 rounded-lg hover:bg-secondary transition-colors uppercase tracking-wider"
                  >
                    Detaljer
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmployeeRoute;
