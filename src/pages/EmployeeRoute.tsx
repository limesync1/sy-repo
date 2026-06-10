import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRouteData, useDirections, useUpdateStopStatus, type RouteStop, type Route } from "@/hooks/useRoutes";
import { useStartStopTime, useEndStopTime } from "@/hooks/useRoutes";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft, Navigation, Phone, CheckCircle2, MapPin, List, Clock, Loader2,
  ChevronUp, ChevronDown, Play, Volume2, VolumeX, Crosshair, Flag, TrafficCone,
  Info,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import type { Marker as LeafletMarker } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { stripPrices } from "@/lib/employee-display";
import { bearingDegrees, haversineMeters, pointToPolylineMeters } from "@/lib/geo-distance";
import {
  unlockAudio, playArrivalChime, playSuccessChime, playCompleteFanfare, speak,
} from "@/lib/employee-audio";
import { ManeuverIcon, maneuverLabel } from "@/components/employee-route/ManeuverIcon";
import { RouteViewSkeleton } from "@/components/admin/shared/Skeletons";
import { useCurrentManeuver } from "@/components/employee-route/useCurrentManeuver";
import { useSmoothPosition } from "@/components/employee-route/useSmoothPosition";
import { useGpsFilter, type FilteredFix } from "@/components/employee-route/useGpsFilter";
import { smoothPolyline } from "@/components/employee-route/smoothPolyline";
import { useSmoothZoom } from "@/components/employee-route/useSmoothZoom";
import { useQueryClient, useQuery } from "@tanstack/react-query";
import { pickDuration } from "@/components/route/EtaBreakdown";
import { StopDetailsContent } from "@/components/employee/StopDetailsContent";
import { useMyEmployee } from "@/hooks/useMyEmployee";
import { canCompleteEarly, type EarlyCompletionMode } from "@/lib/early-completion";

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

const stopIcon = (n: number, state: "next" | "done" | "future", color: string, highlighted = false) => {
  // Admin-panel-stil: neutral foreground for "next", muted-grå for "future",
  // grøn for "done".  Vi bruger samme palette som AdminShell/StatCard så
  // medarbejder-appen visuelt er en del af samme design-system — ikke en
  // separat brand-farve.
  const bg =
    state === "done"
      ? "hsl(142 70% 45%)"
      : state === "next"
        ? "hsl(0 0% 13%)" // foreground (admin-stil)
        : "hsl(220 9% 46%)"; // muted-foreground for kommende stop
  const opacity = state === "future" ? 0.9 : 1;
  const ring = state === "next"
    ? `0 0 0 4px hsl(0 0% 13% / 0.15), 0 0 0 9px hsl(0 0% 13% / 0.06)`
    : "none";
  // Highlighted: neutral foreground-ring i stedet for accent.
  const hlRing = highlighted ? `, 0 0 0 4px hsl(0 0% 13%), 0 0 0 8px hsl(0 0% 13% / 0.18)` : "";
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
    <div class="nav-puck-rot" style="position:relative;width:64px;height:64px;transform:rotate(0deg);transform-origin:center;will-change:transform;transition:transform 280ms cubic-bezier(0.22, 1, 0.36, 1);">
      <div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:20px solid transparent;border-right:20px solid transparent;border-bottom:34px solid hsl(217 91% 60% / 0.45);"></div>
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
  position,
  heading,
}: {
  position: [number, number];
  heading: number;
}) => {
  const map = useMap();
  const markerRef = useRef<LeafletMarker | null>(null);

  // Mount marker once.
  useEffect(() => {
    const m = L.marker(position, { icon: NAV_PUCK_ICON, interactive: false, keyboard: false, zIndexOffset: 1000 });
    m.addTo(map);
    markerRef.current = m;
    return () => {
      m.remove();
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);

  // Update position smoothly (no re-mount).
  const lat = position[0];
  const lng = position[1];
  useEffect(() => {
    const m = markerRef.current;
    if (!m) return;
    m.setLatLng([lat, lng]);
  }, [lat, lng]);

  // Update heading by mutating CSS transform on the inner rotation element.
  // This avoids any react-leaflet reconciliation and gives a buttery-smooth
  // rotation under route changes / reroutes.
  useEffect(() => {
    const m = markerRef.current;
    if (!m) return;
    const el = m.getElement();
    if (!el) return;
    const rot = el.querySelector<HTMLElement>(".nav-puck-rot");
    if (rot) {
      rot.style.transform = `rotate(${heading}deg)`;
    }
  }, [heading]);

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

/** Google-Maps-like live follow: smoothly glides camera to the user (no bounds jumping). */
const FollowUser = ({
  active, userPos,
}: { active: boolean; userPos: [number, number] | null }) => {
  const map = useMap();
  const initRef = useRef(false);
  // Vi driver kameraet selv via requestAnimationFrame i stedet for at lade
  // Leaflet's panTo-animation styre — det giver én sammenhængende, blød
  // bevægelse i stedet for en kæde af korte animationer der konstant
  // afbryder hinanden (= hak/jitter ved hver GPS-tick).
  const targetRef = useRef<[number, number] | null>(null);
  const rafRef = useRef<number | null>(null);
  // Hold target opdateret uden at restarte rAF-loopet.
  useEffect(() => {
    if (active && userPos) targetRef.current = userPos;
  }, [active, userPos?.[0], userPos?.[1]]);

  useEffect(() => {
    if (!active) {
      initRef.current = false;
      targetRef.current = null;
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    if (!userPos) return;
    // Tæt zoom (Google-Maps-agtig navigation) første gang vi får et fix.
    const targetZoom = 18.5;
    if (!initRef.current) {
      map.setView(userPos, targetZoom, { animate: true, duration: 0.45 });
      initRef.current = true;
      targetRef.current = userPos;
    }
    // Kør et stille rAF-loop der hver frame trækker kameraets center
    // mod target med en eksponentiel "easing" (kritisk-dæmpet fjeder).
    // Det elimineret hak fra både GPS-jitter og fra kæder af korte
    // panTo-animationer.
    const FOLLOW_RATE = 0.18; // 0..1 pr. frame — højere = strammere follow
    const tick = () => {
      const tgt = targetRef.current;
      if (tgt) {
        const c = map.getCenter();
        const dLat = tgt[0] - c.lat;
        const dLng = tgt[1] - c.lng;
        // Stop helt når vi er praktisk talt på target (≈ 0.3 m ved DK-bredde).
        if (Math.abs(dLat) > 3e-6 || Math.abs(dLng) > 3e-6) {
          const nextLat = c.lat + dLat * FOLLOW_RATE;
          const nextLng = c.lng + dLng * FOLLOW_RATE;
          // Skip Leaflets egen pan-animation (vi animerer selv).
          map.panTo([nextLat, nextLng], { animate: false, noMoveStart: true } as any);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    if (rafRef.current == null) rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, map]);
  return null;
};

/** Pans (with light zoom) to a stop when the user taps it in the list. */
const FlyToStop = ({ target }: { target: [number, number] | null }) => {
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
};

/**
 * Hastigheds-adaptiv, glidende zoom under aktiv navigation.  Skal være
 * inde i <MapContainer> så vi har adgang til map-instansen via useMap().
 */
const SmoothZoomController = ({
  enabled,
  speedMps,
}: { enabled: boolean; speedMps: number }) => {
  const map = useMap();
  useSmoothZoom(map, enabled, speedMps);
  return null;
};

const formatKm = (m: number | null) => (m == null ? "—" : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
const formatMin = (s: number | null) => (s == null ? "—" : s < 60 ? "<1 min" : `${Math.round(s / 60)} min`);

/** Format total minutes as "Xt Ymin" / "Y min". Useful for rute-totals. */
const formatHoursMin = (mins: number | null | undefined): string => {
  if (mins == null || !Number.isFinite(mins)) return "—";
  const m = Math.round(mins);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}t` : `${h}t ${r}min`;
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
  const navigate = useNavigate();
  // Tidlig udførelse — afgør om "Markér udført" må trykkes på fremtidige
  // rutedatoer. Samme resolver som EmployeeApp bruger på dagslisten.
  const { data: meEmp } = useMyEmployee();
  const empMode = ((meEmp as any)?.early_completion_mode || "inherit") as EarlyCompletionMode;
  const { data: bizEarlyDefault = false } = useQuery({
    queryKey: ["business-early-default", meEmp?.business_id],
    enabled: !!meEmp?.business_id,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data } = await supabase
        .from("businesses")
        .select("allow_early_completion_default")
        .eq("id", meEmp!.business_id!)
        .maybeSingle();
      return !!(data as any)?.allow_early_completion_default;
    },
  });
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [listOpen, setListOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
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
  const [followMode, setFollowMode] = useState(true);
  // Stop-detaljer sheet kan veksle mellem kompakt (~45 % af skærm) og fuld
  // (~85 %).  Default er kompakt, så medarbejderen altid ser kortet.  Klik
  // på drag-bar'en eller chevron'en skifter højde.
  const [sheetExpanded, setSheetExpanded] = useState(false);
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

  /* Geolocation watcher — aktiv når rute kører ELLER når brugeren allerede
   * har givet lov (så positionen er klar uden ny prompt). */
  useEffect(() => {
    const shouldWatch = routeStarted || geoPermission === "granted";
    if (!shouldWatch) return;
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        // Send rå fix gennem GPS-filteret nedenfor.  Vi bevarer adgangen
        // til accuracy + speed så filtret kan adaptive sin smoothing.
        setRawFix({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: typeof pos.coords.accuracy === "number" ? pos.coords.accuracy : 20,
          heading: typeof pos.coords.heading === "number" && !Number.isNaN(pos.coords.heading)
            ? pos.coords.heading : null,
          speed: typeof pos.coords.speed === "number" && !Number.isNaN(pos.coords.speed)
            ? pos.coords.speed : null,
          t: pos.timestamp ?? Date.now(),
        });
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 1500, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [routeStarted, geoPermission]);

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
  const validStops = useMemo(
    () => sortedStops.filter((s) => s.latitude != null && s.longitude != null),
    [sortedStops],
  );
  const nextStopIdx = sortedStops.findIndex((s) => s.status !== "completed");
  const nextStop: RouteStop | undefined = nextStopIdx >= 0 ? sortedStops[nextStopIdx] : undefined;

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

  const { data: directions } = useDirections(legWaypoints, {
    businessId: route?.business_id,
  });

  /* ── Preview directions: hele den planlagte rute, vist FØR brugeren
   * starter med at køre, så medarbejderen tydeligt kan se hele turen
   * (ikke kun næste leg). Bygges fra startCoord + alle ikke-færdige stop
   * i rækkefølge. Vi henter den kun når routeStarted=false så vi ikke
   * dobbelt-fetch'er undervejs.
   */
  const previewWaypoints = useMemo(() => {
    if (routeStarted) return null;
    const wps: { lat: number; lng: number }[] = [];
    if (startCoord) wps.push({ lat: startCoord[0], lng: startCoord[1] });
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
  const inArrivalRadius = distanceToNextM != null && distanceToNextM <= arrivalThresholdM;

  // Stabiliseret ankomst — kræv at vi har været inden for radius i mindst
  // ~12 sekunder før vi flipper "fremme" til true.  Det forhindrer at en
  // enkelt jitter-måling der lander på naboens matrikel udløser ankomst,
  // men forsinker ikke detektion mærkbart i praksis (medarbejderen står
  // typisk stille i flere sekunder ved døren).  Når vi forlader radius
  // nulstilles timeren straks så efterfølgende jitter ikke "husker" os
  // som fremme længere.
  const ARRIVAL_DWELL_MS = 12_000;
  const arrivalEnteredAtRef = useRef<number | null>(null);
  const arrivalStableForStopRef = useRef<string | null>(null);
  const [stableArrival, setStableArrival] = useState(false);

  useEffect(() => {
    // Skift af stop nulstiller dvælet og den stabile flag.
    arrivalEnteredAtRef.current = null;
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
    setTimeout(() => speak(`Du er ankommet til ${name}`), 600);
  }, [isAtNextStop, nextStop?.id, audioEnabled]);

  /* Auto check-in når medarbejder ankommer til stop (geofence) */
  useEffect(() => {
    if (!isAtNextStop || !nextStop) return;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return;
        const { data: emp } = await supabase
          .from("employees")
          .select("id")
          .eq("user_id", u.user.id)
          .maybeSingle();
        if (!emp) return;
        await startStopTime.mutateAsync({ stop_id: nextStop.id, employee_id: emp.id });
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
        speak("Genberegner ruten");
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

  const derivedHeading = useMemo(() => {
    if (userHeading != null) return userHeading;
    if (!userPos || !nextStop || nextStop.latitude == null || nextStop.longitude == null) return null;
    return bearingDegrees(userPos[0], userPos[1], Number(nextStop.latitude), Number(nextStop.longitude));
  }, [userHeading, userPos, nextStop?.id, nextStop?.latitude, nextStop?.longitude]);

  // Smooth user position + heading — interpolerer mellem GPS-fixes for at
  // undgå at puck'en hopper hver 1-3 sek. Glider ~900 ms med ease-out.
  const { smoothPos, smoothHeading } = useSmoothPosition(
    userPos,
    derivedHeading,
    routeStarted,
  );
  // Brug smooth-versionerne i map-rendering og camera-follow så alt
  // bevæger sig synkront og uden hak.
  const displayPos = routeStarted ? (smoothPos ?? userPos) : userPos;
  const displayHeading = routeStarted ? (smoothHeading ?? derivedHeading) : derivedHeading;

  const allPoints: [number, number][] = useMemo(() => {
    const pts: [number, number][] = [];
    if (startCoord) pts.push(startCoord);
    for (const s of validStops) pts.push([Number(s.latitude), Number(s.longitude)]);
    return pts;
  }, [startCoord, validStops]);

  const completedCount = sortedStops.filter((s) => s.status === "completed").length;
  const allDone = sortedStops.length > 0 && completedCount === sortedStops.length;
  const progress = sortedStops.length > 0 ? (completedCount / sortedStops.length) * 100 : 0;
  // Brug Serviceydere accent (dark-blue) som primær handlings-farve i kort-UI'et.
  // route.color beholdes til badges/rute-identifikation i kalenderen.
  const themeColor = "hsl(206 99% 30%)";
  const routeBadgeColor = route?.color || "hsl(206 99% 30%)";

  /* Fanfare ved dagsfærdig */
  useEffect(() => {
    if (!allDone || finishedAnnouncedRef.current || !audioEnabled) return;
    finishedAnnouncedRef.current = true;
    playCompleteFanfare();
    setTimeout(() => speak("Godt arbejde. Alle stop er klaret."), 800);
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

  /**
   * Forsinkelse vs. planlagt ankomst — sammenligner aktuel ETA med
   * nextStop.planned_arrival. Vi opdaterer hvert minut (via etaLabel der
   * allerede genberegnes når directions ændrer sig). Returnerer antal
   * minutter (positiv = forsinket, negativ = i god tid). null hvis vi
   * ikke har data nok.
   */
  const delayMinutes: number | null = useMemo(() => {
    if (!directions?.duration_s || !nextStop?.planned_arrival) return null;
    const etaMs = Date.now() + directions.duration_s * 1000;
    const plannedMs = new Date(nextStop.planned_arrival).getTime();
    if (!Number.isFinite(plannedMs)) return null;
    return Math.round((etaMs - plannedMs) / 60000);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directions?.duration_s, nextStop?.planned_arrival, nextStop?.id]);

  /* ── Rute-totals: samlet distance/varighed for resterende stop.
   * Vises i pre-start oversigt og i header-pillen så medarbejderen
   * altid kan se hvad der venter på dagen. */
  const remainingStops = useMemo(
    () => sortedStops.filter((s) => s.status !== "completed"),
    [sortedStops],
  );
  const remainingServiceMinutes = useMemo(
    () => remainingStops.reduce((sum, s) => sum + (s.duration_minutes || 0), 0),
    [remainingStops],
  );
  /** Estimeret sluttid på dagen — service-tid + planlagt køretid (hvis kendt). */
  const estimatedEndAt: string | null = useMemo(() => {
    if (remainingStops.length === 0) return null;
    const driveMin = route?.total_duration_minutes ?? 0;
    // Kun vis hvis vi rent faktisk har en planlagt drive-tid > 0 (ellers er
    // ruten ikke optimeret endnu og estimatet bliver misvisende).
    if (driveMin <= 0) return null;
    const totalMin = driveMin + remainingServiceMinutes;
    if (totalMin <= 0) return null;
    const end = new Date(Date.now() + totalMin * 60 * 1000);
    return formatClock(end);
  }, [remainingStops.length, remainingServiceMinutes, route?.total_duration_minutes]);
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
    speak(`Bemærk: ${sevText} forude. Forsinkelse på cirka ${trafficAlert.addedMin} minutter.`);
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
  // Når brugeren er fremme ved næste stop er turn-by-turn irrelevant —
  // vis kun "Du er fremme"-tilstanden, ikke et drej-banner der peger
  // tilbage mod en vej-snappet rute.  Matcher Google Maps' adfærd.
  const showManeuverBanner = !!maneuver
    && !isAtNextStop
    && maneuver.distanceToManeuverM <= 800
    && (maneuver.currentStep.maneuver.type || "").toLowerCase() !== "depart";
  useEffect(() => {
    if (!audioEnabled || !maneuver || !routeStarted) return;
    const stepKey = `${maneuver.stepIndex}-${maneuver.currentStep.maneuver.type}-${maneuver.currentStep.name}`;
    if (lastSpokenStepRef.current === stepKey) return;
    if (maneuver.distanceToManeuverM > 250) return;
    lastSpokenStepRef.current = stepKey;
    const street = maneuver.currentStep.name ? ` ad ${maneuver.currentStep.name}` : "";
    const action = maneuverLabel(maneuver.currentStep.maneuver.type, maneuver.currentStep.maneuver.modifier);
    speak(`Om ${Math.round(maneuver.distanceToManeuverM)} meter, ${action.toLowerCase()}${street}`);
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

  const handleComplete = async (s: RouteStop) => {
    if (routeDateLocked) {
      toast.error("Ruten kan først udføres på selve dagen");
      return;
    }
    try {
      // Stop tidsregistrering for den loggede medarbejder på denne opgave
      try {
        const { data: u } = await supabase.auth.getUser();
        if (u.user) {
          const { data: emp } = await supabase
            .from("employees")
            .select("id")
            .eq("user_id", u.user.id)
            .maybeSingle();
          if (emp) {
            await endStopTime.mutateAsync({ stop_id: s.id, employee_id: emp.id });
          }
        }
      } catch { /* non-fatal */ }
      await updateStatus.mutateAsync({ id: s.id, status: "completed", notes: noteDraft[s.id] });
      if (audioEnabled) playSuccessChime();
      toast.success(`${s.customer_name || "Stop"} markeret som udført`);
      setSelectedId(null);
      const remaining = sortedStops.filter((x) => x.status !== "completed" && x.id !== s.id);
      if (remaining.length > 0 && audioEnabled) {
        const next = remaining[0];
        setTimeout(() => speak(`Næste stop: ${next.customer_name || "ukendt kunde"}`), 900);
      }
    } catch {}
  };

  const handleUndo = async (s: RouteStop) => {
    try {
      await updateStatus.mutateAsync({ id: s.id, status: "pending" });
      toast.success("Markering fortrudt");
    } catch {}
  };

  const handleStartRoute = () => {
    if (routeDateLocked) {
      toast.error("Ruten kan først startes på selve dagen");
      return;
    }
    unlockAudio();
    setRouteStarted(true);
    setFollowMode(true);
    setCollapsed(true);
    toast.success("Rute startet — god tur!");
    if (navigator.geolocation) {
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
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background overflow-hidden">
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
            zoomControl={false}
            attributionControl={false}
            zoomSnap={0.25}
            zoomDelta={0.5}
            wheelDebounceTime={20}
            wheelPxPerZoomLevel={120}
            zoomAnimation
            fadeAnimation
            markerZoomAnimation
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
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
              updateWhenIdle={false}
              updateWhenZooming={false}
              keepBuffer={4}
              className="map-tile-fade"
              zIndex={1}
              detectRetina
              maxZoom={20}
              maxNativeZoom={19}
            />

            {/* Fit overview when not started */}
            <FitTo points={allPoints} enabled={!routeStarted} />
            {/* Live follow when driving */}
            <FollowUser active={routeStarted && followMode} userPos={displayPos} />
            {/* Hastigheds-adaptiv, glidende zoom — kun mens follow er aktiv. */}
            <SmoothZoomController
              enabled={routeStarted && followMode}
              speedMps={userSpeedMps}
            />

            {startCoord && <Marker position={startCoord} icon={startIcon} />}

            {/* Preview-route — vist FØR start, så hele turen er synlig.
                Tegnet under (lavere z) det aktive leg når begge findes. */}
            {!routeStarted && previewLine.length > 1 && (
              <>
                <Polyline
                  positions={previewLine}
                  pathOptions={{ color: "white", weight: 12, opacity: 0.9, lineCap: "round", lineJoin: "round" }}
                />
                <Polyline
                  positions={previewLine}
                  pathOptions={{
                    color: themeColor,
                    weight: 6,
                    opacity: 0.85,
                    lineCap: "round",
                    lineJoin: "round",
                    dashArray: "2 10",
                  }}
                />
              </>
            )}

            {/* Route line — aktivt leg.  Skjules når man er fremme:
                Mapbox-geometrien snapper til vejnetværket og kan slutte
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

            {/* Ankomst-indikator: lille stiplet linje fra puck til pin
                så det er entydigt hvilken adresse man er ankommet til,
                også når Mapbox' rute-geometri ville pege en anden vej. */}
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
                  icon={stopIcon(i + 1, state, themeColor, s.id === highlightedId)}
                  eventHandlers={{ click: () => { setHighlightedId(s.id); setSelectedId(s.id); } }}
                />
              );
            })}

            {/* User position — Google Maps-stil puck når man kører.
                NavPuckMarker er stabil: kun CSS-transform ændres ved heading-skift,
                ingen re-mount af DOM = ingen flicker under reroutes. */}
            {displayPos && routeStarted && displayHeading != null && (
              <NavPuckMarker position={displayPos} heading={displayHeading} />
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

        {/* ─── Floating right-side controls — runde pills, native-følelse ───
           Alle kontroller deler én base-klasse (`floatCtrlBase`) så stik-,
           skygge-, ring- og active-feedback er 100% ensartet. Aktive states
           bruger fremhævet baggrund + en lille indikator-prik. */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          {routeStarted && !allDone && (
            <button
              type="button"
              onClick={() => setListOpen((v) => !v)}
              className={`relative h-12 w-12 rounded-full bg-card/95 backdrop-blur-md border border-border/80 text-foreground shadow-[0_6px_20px_-6px_rgba(0,0,0,0.25)] hover:bg-secondary hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.3)] transition-all duration-150 active:scale-[0.93] active:shadow-md flex items-center justify-center ${listOpen ? "ring-2 ring-foreground/15" : ""}`}
              aria-label="Vis liste"
              aria-pressed={listOpen}
            >
              <List className="h-[19px] w-[19px]" strokeWidth={2.25} />
            </button>
          )}
          {routeStarted && !allDone && (
            <button
              type="button"
              onClick={() => setAudioEnabled((v) => !v)}
              className={`relative h-12 w-12 rounded-full backdrop-blur-md border shadow-[0_6px_20px_-6px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.3)] transition-all duration-150 active:scale-[0.93] active:shadow-md flex items-center justify-center ${
                audioEnabled
                  ? "bg-card/95 border-border/80 text-foreground hover:bg-secondary"
                  : "bg-muted/95 border-border text-muted-foreground hover:bg-muted"
              }`}
              aria-label={audioEnabled ? "Slå lyd fra" : "Slå lyd til"}
              aria-pressed={!audioEnabled}
              title={audioEnabled ? "Lyd til — tryk for at slå fra" : "Lyd fra — tryk for at slå til"}
            >
              {audioEnabled
                ? <Volume2 className="h-[19px] w-[19px]" strokeWidth={2.25} />
                : <VolumeX className="h-[19px] w-[19px]" strokeWidth={2.25} />}
              {!audioEnabled && (
                <span
                  aria-hidden
                  className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-destructive border-2 border-background"
                />
              )}
            </button>
          )}
          {routeStarted && (
            <button
              type="button"
              onClick={() => setFollowMode((v) => !v)}
              className={`relative h-12 w-12 rounded-full backdrop-blur-md border shadow-[0_6px_20px_-6px_rgba(0,0,0,0.25)] hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.3)] transition-all duration-150 active:scale-[0.93] active:shadow-md flex items-center justify-center ${
                followMode
                  ? "border-transparent text-background"
                  : "bg-card/95 border-border/80 text-foreground hover:bg-secondary"
              }`}
              style={followMode ? { background: themeColor } : undefined}
              aria-label={followMode ? "Slå live-følg fra" : "Slå live-følg til"}
              aria-pressed={followMode}
              title={followMode ? "Følger din position" : "Recentrer"}
            >
              <Crosshair className="h-[19px] w-[19px]" strokeWidth={2.25} />
              {followMode && (
                <span
                  aria-hidden
                  className="absolute -top-0.5 -right-0.5 h-3 w-3 rounded-full bg-emerald-500 border-2 border-background animate-pulse"
                />
              )}
            </button>
          )}
        </div>

        {/* ─── Fullscreen drive mode: floating top overlays (back pill + maneuver banner + traffic alert) ─── */}
        {routeStarted && !allDone && (
          <>
            {/* Back + progress — runde pills, native-følelse.
               Back-knappen matcher right-side controls i størrelse/skygge så
               toppen visuelt fremstår som ét sammenhængende kontrolsæt. */}
            <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
              <Link
                to="/medarbejder"
                aria-label="Tilbage"
                className="h-12 w-12 rounded-full bg-card/95 backdrop-blur-md border border-border/80 text-foreground shadow-[0_6px_20px_-6px_rgba(0,0,0,0.25)] hover:bg-secondary hover:shadow-[0_8px_24px_-6px_rgba(0,0,0,0.3)] transition-all duration-150 active:scale-[0.93] active:shadow-md flex items-center justify-center"
              >
                <ArrowLeft className="h-[19px] w-[19px]" strokeWidth={2.25} />
              </Link>
              <div className="flex items-center gap-2.5 pl-3 pr-3.5 h-12 rounded-full bg-card/95 backdrop-blur-md border border-border/80 shadow-[0_6px_20px_-6px_rgba(0,0,0,0.25)]">
                <div className="flex items-center gap-1.5">
                  <span
                    className="h-2.5 w-2.5 rounded-full shrink-0"
                    style={{ background: routeBadgeColor }}
                    aria-hidden
                  />
                  <span className="text-sm font-bold text-foreground tabular-nums leading-none">
                    {completedCount}
                    <span className="text-muted-foreground/60 font-semibold">/{sortedStops.length}</span>
                  </span>
                </div>
                {estimatedEndAt && (
                  <>
                    <span className="h-4 w-px bg-border" aria-hidden />
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-muted-foreground tabular-nums leading-none">
                      <Flag className="h-3 w-3" />{estimatedEndAt}
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Maneuver banner — floating top center */}
            {showManeuverBanner && maneuver && nextStop && (
              <div className="absolute top-[72px] left-3 right-[72px] z-[1000] pointer-events-none">
                <Card className="overflow-hidden shadow-xl rounded-2xl pointer-events-auto bg-card border-border animate-in fade-in slide-in-from-top-2 duration-300">
                  <div className="flex items-stretch">
                    <div className="flex flex-col items-center justify-center w-[88px] shrink-0 bg-foreground text-background py-3.5 px-1">
                      <ManeuverIcon
                        type={maneuver.currentStep.maneuver.type}
                        modifier={maneuver.currentStep.maneuver.modifier}
                        className="h-11 w-11"
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
                  className="rounded-2xl shadow-2xl border bg-background/95 backdrop-blur px-3 py-2.5 flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-200"
                >
                  <div
                    className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0"
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
                <div className={`absolute ${showManeuverBanner ? "top-[200px]" : "top-[68px]"} left-3 right-[68px] z-[1000] pointer-events-none`}>
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

        {/* ─── Pre-start CTA: big start button at the bottom ─── */}
        {!routeStarted && !allDone && nextStop && (
          <div className="absolute bottom-[46px] inset-x-0 z-[1000] p-3 pb-3">
            <Card className="overflow-hidden rounded-xl border-border shadow-xl">
              {/* Dagens overblik — øverste sektion */}
              <div className="px-4 pt-3.5 pb-3 bg-card border-b border-border">
                {/* Header-rad: titel + antal stop */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    <p className="text-[11px] text-muted-foreground font-medium truncate">
                      Dagens rute · {todayLabel}
                    </p>
                  </div>
                  <Badge variant="secondary" className="text-[10px] h-5 px-1.5 tabular-nums font-semibold shrink-0">
                    {sortedStops.length} stop
                  </Badge>
                </div>

                {/* Tre nøgletal — admin-stil grid uden flashy farver */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  <div className="rounded-lg bg-secondary/60 border border-border px-2 py-1.5 text-center">
                    <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Stop</p>
                    <p className="text-sm font-semibold tabular-nums text-foreground mt-0.5">
                      {remainingStops.length}
                      {completedCount > 0 && (
                        <span className="text-muted-foreground font-medium">/{sortedStops.length}</span>
                      )}
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/60 border border-border px-2 py-1.5 text-center">
                    <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Distance</p>
                    <p className="text-sm font-semibold tabular-nums text-foreground mt-0.5">
                      {route?.total_distance_km != null && route.total_distance_km > 0
                        ? `${route.total_distance_km.toFixed(1)} km`
                        : "—"}
                    </p>
                  </div>
                  <div className="rounded-lg bg-secondary/60 border border-border px-2 py-1.5 text-center">
                    <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Slut ca.</p>
                    <p className="text-sm font-semibold tabular-nums text-foreground mt-0.5">
                      {estimatedEndAt || "—"}
                    </p>
                  </div>
                </div>

                {/* Først til — fremhævet på neutral baggrund */}
                <div className="flex items-start gap-2.5">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-background text-sm font-bold shrink-0"
                    style={{ background: themeColor }}
                  >
                    {nextStopIdx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold leading-none">
                      Først til
                    </p>
                    <p className="font-semibold text-sm text-foreground truncate leading-tight mt-0.5">
                      {nextStop.customer_name || "Stop"}
                    </p>
                    {(nextStop.full_address || nextStop.address) && (
                      <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 shrink-0" />
                        {nextStop.full_address || nextStop.address}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Info-grid: km, tid, ETA — for første leg.  Vi viser kun de tre
                  tal der betyder noget, og bruger altid den korrigerede ETA
                  (med DK trafik-buffer) — ingen toggle, ingen badges. */}
              {(directions || etaLabel) && (
                <>
                  <div className="grid grid-cols-3 divide-x divide-border bg-background border-t border-b border-border">
                    <div className="px-2 py-2 text-center">
                      <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Distance</p>
                      <p className="text-sm font-bold tabular-nums mt-0.5">
                        {directions?.distance_m != null ? formatKm(directions.distance_m) : "—"}
                      </p>
                    </div>
                    <div className="px-2 py-2 text-center">
                      <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Køretid</p>
                      <p className="text-sm font-bold tabular-nums mt-0.5">
                        {(() => {
                          const d = directions ? pickDuration(directions, false) : null;
                          return d != null ? formatMin(d) : "—";
                        })()}
                      </p>
                    </div>
                    <div className="px-2 py-2 text-center">
                      <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Ankomst</p>
                      <p className="text-sm font-bold tabular-nums mt-0.5 text-foreground">
                        {etaLabel || "—"}
                      </p>
                    </div>
                  </div>
                </>
              )}

              <div className="p-3">
                <Button
                  onClick={handleStartRoute}
                  size="lg"
                  className="w-full gap-2 h-12 text-base font-semibold rounded-xl shadow-md hover:shadow-lg active:scale-[0.99] transition-all bg-foreground text-background hover:bg-foreground/90"
                >
                  <Play className="h-5 w-5 fill-current" /> Start dagens rute
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* ─── Active driving card ─── */}
        {routeStarted && !allDone && nextStop && (
          <div className="absolute bottom-[46px] inset-x-0 z-[1000] p-2.5 pb-2.5 pointer-events-none">
            <Card
              className="overflow-hidden pointer-events-auto rounded-2xl border-border shadow-2xl bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/85"
            >
              {/* Segmenteret progress — tynd, diskret */}
              <div className="flex gap-1 px-3 pt-2 pb-1.5">
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
              <button
                type="button"
                className="group w-full flex items-center gap-3 px-3.5 py-3 hover:bg-secondary/50 active:bg-secondary/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                onClick={() => setCollapsed((c) => !c)}
                aria-expanded={!collapsed}
                aria-label={collapsed ? "Vis stop-detaljer" : "Skjul stop-detaljer"}
              >
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-background text-base font-bold shrink-0 shadow-sm"
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
                  <Badge className="gap-1 text-[10px] h-6 px-2 border-0 font-semibold uppercase tracking-wide bg-emerald-500/15 text-emerald-700">
                    <span className="h-1.5 w-1.5 rounded-full animate-pulse bg-emerald-500" />
                    Fremme
                  </Badge>
                ) : distanceToNextM != null ? (
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold text-foreground tabular-nums leading-tight">
                      {formatKm(distanceToNextM)}
                    </p>
                    {/* Forsinkelses-chip — viser kun når planlagt ankomst er kendt
                        og vi enten er forsinket > 5 min eller godt i tid > 5 min.
                        Holder muted-foreground i normale tilfælde. */}
                    {delayMinutes != null && Math.abs(delayMinutes) > 5 ? (
                      <p className={`text-[10px] leading-tight font-semibold tabular-nums ${delayMinutes > 0 ? "text-amber-600" : "text-emerald-600"}`}>
                        {delayMinutes > 0 ? `+${delayMinutes} min` : `${delayMinutes} min`}
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
              </button>

              {/* Altid synlig: kompakt CTA-rad — så medarbejderen kan markere
                  udført / navigere uden at åbne detaljer (og uden at miste
                  kortvisningen). */}
              {collapsed && (
                <div className="px-3 pb-3 pt-1 grid grid-cols-[1fr_auto_auto] gap-2">
                  <Button
                    onClick={() => handleComplete(nextStop)}
                    size="sm"
                    className={`gap-1.5 h-10 rounded-xl text-[13px] font-semibold transition-all active:scale-[0.99] ${
                      isAtNextStop
                        ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-md shadow-emerald-500/25"
                        : "bg-foreground text-background hover:bg-foreground/90"
                    }`}
                    disabled={updateStatus.isPending}
                  >
                    {updateStatus.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4" />
                    )}
                    {isAtNextStop ? "Markér udført" : "Markér udført"}
                  </Button>
                  <Button
                    onClick={() => handleNavigate(nextStop)}
                    variant="outline"
                    size="sm"
                    aria-label="Åbn i Maps"
                    className="h-10 w-10 p-0 rounded-xl border-border hover:bg-secondary"
                  >
                    <Navigation className="h-4 w-4" />
                  </Button>
                  {nextStop.customer_phone ? (
                    <Button asChild variant="outline" size="sm" aria-label="Ring til kunde" className="h-10 w-10 p-0 rounded-xl border-border hover:bg-secondary">
                      <a href={`tel:${nextStop.customer_phone}`}>
                        <Phone className="h-4 w-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" aria-label="Ingen telefon" disabled className="h-10 w-10 p-0 rounded-xl border-border">
                      <Phone className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              )}

              {!collapsed && (
                <div className="p-3 pt-2 space-y-2.5 border-t border-border/60">
                  {/* Adresse + service */}
                  {((nextStop.full_address || nextStop.address) || (nextStop.service_summary && stripPrices(nextStop.service_summary))) && (
                    <div className="rounded-xl bg-secondary/40 border border-border/60 p-2.5 space-y-1.5">
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
                    <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-background overflow-hidden">
                        <div className="px-2 py-1.5 text-center">
                          <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Distance</p>
                          <p className="text-sm font-bold tabular-nums mt-0.5 text-foreground">
                            {directions?.distance_m != null ? formatKm(directions.distance_m) : "—"}
                          </p>
                        </div>
                        <div className="px-2 py-1.5 text-center">
                          <p className="text-[9px] uppercase text-muted-foreground font-bold tracking-wider">Tid</p>
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
                    className="w-full gap-1.5 h-10 rounded-lg text-xs font-semibold border-border hover:bg-secondary transition-colors"
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
          <div className="absolute bottom-[46px] inset-x-0 z-[1000] p-3 pb-3">
            <Card className="overflow-hidden shadow-xl rounded-xl border-border">
              <div className="p-5 text-center space-y-3">
                <div className="h-14 w-14 mx-auto rounded-xl flex items-center justify-center bg-secondary">
                  <CheckCircle2 className="h-8 w-8 text-foreground" />
                </div>
                <div>
                  <p className="font-semibold text-lg text-foreground">Rute færdig</p>
                  <p className="text-sm text-muted-foreground">
                    Alle {sortedStops.length} stop udført
                    {autoReturn != null && autoReturn > 0 && ` · oversigt om ${autoReturn}s`}
                  </p>
                </div>
                {/* Mini-stats */}
                <div className="grid grid-cols-3 divide-x divide-border rounded-xl border border-border bg-background overflow-hidden">
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
                  <div className="px-2 py-2.5">
                    <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Tid</p>
                    <p className="text-sm font-semibold tabular-nums text-foreground mt-0.5">
                      {route.total_duration_minutes != null ? `${route.total_duration_minutes} min` : "—"}
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full gap-2 h-12 rounded-xl bg-foreground text-background hover:bg-foreground/90"
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
            setSheetExpanded(false);
          }
        }}
      >
        {/*
          To-trins bottom-sheet: kompakt (~45 vh, default) eller fuld (~85 vh).
          Drag-bar'en øverst er klikbar — ét tryk skifter mellem størrelserne.
          Sådan kan medarbejderen altid hurtigt gøre detaljer mindre uden at
          lukke dem helt.
        */}
        <SheetContent
          side="bottom"
          className={`p-0 rounded-t-2xl flex flex-col transition-[max-height,height] duration-300 ease-out ${
            sheetExpanded ? "max-h-[82vh] h-[82vh]" : "max-h-[42vh] h-[42vh]"
          }`}
        >
          {/* Drag-handle bar — tap for at skifte højde, tryk-og-træk på mobile
              er allerede dækket af bottom-sheet's swipe-luk gesture. */}
          <button
            type="button"
            onClick={() => setSheetExpanded((v) => !v)}
            className="w-full pt-2 pb-1 flex flex-col items-center gap-0.5 shrink-0 hover:bg-secondary/40 active:bg-secondary/60 transition-colors rounded-t-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
            aria-label={sheetExpanded ? "Gør detaljer mindre" : "Gør detaljer større"}
            aria-expanded={sheetExpanded}
          >
            <span className="h-1.5 w-12 rounded-full bg-muted-foreground/50" aria-hidden />
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium mt-0.5">
              {sheetExpanded ? "Tryk for at gøre mindre" : "Tryk for at udvide"}
            </span>
          </button>
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
                  allowEarly: canCompleteEarly({
                    routeAllow: (route as any).allow_early_completion,
                    employeeMode: empMode,
                    businessDefault: bizEarlyDefault,
                  }),
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
      />
    </div>
  );
};

const MapInteractionWatcher = ({ onInteract }: { onInteract: () => void }) => {
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
};

/* ─── Collapsible bottom stop-list with live status & map sync ─── */
const StopListPanel = ({
  open, onToggle, stops, nextStopId, highlightedId, themeColor, onSelectStop, onOpenDetails,
}: {
  open: boolean;
  onToggle: () => void;
  stops: RouteStop[];
  nextStopId?: string;
  highlightedId: string | null;
  themeColor: string;
  onSelectStop: (s: RouteStop) => void;
  onOpenDetails: (s: RouteStop) => void;
}) => {
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

  const formatPlannedTime = (iso: string | null | undefined): string | null => {
    if (!iso) return null;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    return d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div
      className="absolute left-0 right-0 bottom-0 z-[1100] pointer-events-none"
      aria-hidden={false}
    >
      <div
        className="pointer-events-auto mx-auto w-full max-w-3xl bg-card shadow-[0_-12px_32px_-12px_rgba(0,0,0,0.18)] rounded-t-2xl transition-transform duration-300 ease-out border-t border-x border-border"
        style={{
          transform: open ? "translateY(0)" : "translateY(calc(100% - 46px))",
          maxHeight: "65vh",
        }}
      >
        {/* Kompakt rail — kun 46px høj når lukket */}
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center gap-2.5 px-4 h-[46px] hover:bg-secondary/60 active:bg-secondary transition-colors rounded-t-2xl relative"
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
          className="overflow-y-auto p-2 space-y-1.5 border-t"
          style={{ maxHeight: "calc(65vh - 46px)" }}
        >
          {stops.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Ingen stop på denne rute.</p>
          )}
          {stops.map((s, i) => {
            const isHl = s.id === highlightedId;
            const isDone = s.status === "completed";
            const isNext = s.id === nextStopId;
            const meta = statusMeta(s);
            const plannedTime = formatPlannedTime(s.planned_arrival);
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
                className={`w-full text-left p-3 rounded-xl border flex items-stretch gap-3 transition-all hover:bg-muted/40 active:scale-[0.99] cursor-pointer ${
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
                <div className="flex flex-col items-center justify-start pt-0.5 w-11 shrink-0">
                  <span
                    className={`flex h-9 w-9 items-center justify-center rounded-xl font-bold text-[13px] shrink-0 text-background shadow-sm ${
                      isDone
                        ? "bg-emerald-500"
                        : isNext
                          ? "bg-foreground"
                          : "bg-muted-foreground/70"
                    }`}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  {plannedTime && (
                    <span className="text-[10px] text-muted-foreground tabular-nums font-bold mt-1.5 leading-none">
                      {plannedTime}
                    </span>
                  )}
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
                  {s.duration_minutes > 0 && (
                    <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5 flex items-center gap-1">
                      <Clock className="h-3 w-3" />~{s.duration_minutes} min
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpenDetails(s); }}
                  className="text-[10px] font-bold text-muted-foreground hover:text-foreground shrink-0 px-2.5 py-1.5 rounded-lg hover:bg-secondary self-center transition-colors uppercase tracking-wider"
                >
                  Detaljer
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmployeeRoute;
