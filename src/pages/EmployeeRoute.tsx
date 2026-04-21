import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRouteData, useDirections, useUpdateStopStatus, type RouteStop, type Route } from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  ArrowLeft, Navigation, Phone, CheckCircle2, MapPin, List, Clock, Loader2,
  ChevronUp, ChevronDown, Play, Volume2, VolumeX, Crosshair, Flag, AlertTriangle, TrafficCone,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { stripPrices } from "@/lib/employee-display";
import { bearingDegrees, haversineMeters } from "@/lib/geo-distance";
import {
  unlockAudio, playArrivalChime, playSuccessChime, playCompleteFanfare, speak,
} from "@/lib/employee-audio";
import { ManeuverIcon, maneuverLabel } from "@/components/employee-route/ManeuverIcon";
import { useCurrentManeuver } from "@/components/employee-route/useCurrentManeuver";

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
  // Serviceydere-stil: pin-form (afrundet teardrop) i stedet for ren cirkel
  const bg =
    state === "done"
      ? "hsl(142 70% 45%)"
      : state === "next"
        ? "hsl(184 90% 32%)" // accent (Serviceydere teal)
        : "hsl(0 0% 13%)";   // foreground (mørk neutral)
  const opacity = state === "future" ? 0.85 : 1;
  const ring = state === "next"
    ? `0 0 0 4px hsl(184 90% 32% / 0.18), 0 0 0 9px hsl(184 90% 32% / 0.08)`
    : "none";
  const hlRing = highlighted ? `, 0 0 0 4px hsl(45 100% 55%), 0 0 0 8px hsl(45 100% 55% / 0.30)` : "";
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

/** Serviceydere-stil navigation puck (teal accent). */
const navPuckIcon = (rotation: number) => L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:64px;height:64px;transform:rotate(${rotation}deg);transform-origin:center;">
      <div style="position:absolute;top:-14px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:20px solid transparent;border-right:20px solid transparent;border-bottom:34px solid hsl(184 90% 32% / 0.45);"></div>
      <div style="position:absolute;top:18px;left:18px;width:28px;height:28px;border-radius:50%;background:hsl(184 90% 32%);border:4px solid white;box-shadow:0 4px 14px hsl(184 90% 32% / 0.5), 0 2px 6px rgba(0,0,0,.25);"></div>
    </div>`,
  iconSize: [64, 64],
  iconAnchor: [32, 32],
});

const userDotIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:hsl(184 90% 32%);border:3px solid white;box-shadow:0 0 0 7px hsl(184 90% 32% / 0.22),0 2px 6px rgba(0,0,0,.25);"></div>`,
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
  useEffect(() => {
    if (!active) { initRef.current = false; return; }
    if (!userPos) return;
    const targetZoom = 17.5;
    if (!initRef.current) {
      // First lock: snap immediately so the user sees themselves centered.
      map.setView(userPos, targetZoom, { animate: true, duration: 0.4 });
      initRef.current = true;
    } else {
      // Subsequent updates: smooth pan only, no zoom changes (avoids the "jumpy" feel).
      map.panTo(userPos, { animate: true, duration: 0.9, easeLinearity: 0.25 });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, userPos?.[0], userPos?.[1], map]);
  return null;
};

/** Pans (with light zoom) to a stop when the user taps it in the list. */
const FlyToStop = ({ target }: { target: [number, number] | null }) => {
  const map = useMap();
  useEffect(() => {
    if (!target) return;
    map.flyTo(target, Math.max(map.getZoom(), 16), { animate: true, duration: 0.7 });
  }, [target, map]);
  return null;
};

const formatKm = (m: number | null) => (m == null ? "—" : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
const formatMin = (s: number | null) => (s == null ? "—" : s < 60 ? "<1 min" : `${Math.round(s / 60)} min`);

/* ─────────────────────────────────────────────────────────── */
const EmployeeRoute = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const { routeId } = useParams<{ routeId: string }>();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Indlæser...
      </div>
    );
  }
  if (!user) return <Navigate to="/log-ind" replace />;
  if (!routeId) return <Navigate to="/medarbejder" replace />;

  return <RouteView routeId={routeId} onBack={() => navigate("/medarbejder")} />;
};

const RouteView = ({ routeId, onBack }: { routeId: string; onBack: () => void }) => {
  const { data, isLoading } = useMyRouteData(routeId);
  const updateStatus = useUpdateStopStatus();
  const navigate = useNavigate();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [listOpen, setListOpen] = useState(false);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [routeStarted, setRouteStarted] = useState(false);
  const [followMode, setFollowMode] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [autoReturn, setAutoReturn] = useState<number | null>(null);
  const arrivedAnnouncedRef = useRef<Set<string>>(new Set());
  const finishedAnnouncedRef = useRef(false);
  const lastSpokenStepRef = useRef<string | null>(null);
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

  /* Geolocation watcher — kun aktiv når rute kører */
  useEffect(() => {
    if (!routeStarted) return;
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserPos([pos.coords.latitude, pos.coords.longitude]);
        if (typeof pos.coords.heading === "number" && !Number.isNaN(pos.coords.heading)) {
          setUserHeading(pos.coords.heading);
        }
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [routeStarted]);

  /* Bryd follow ved manuel kortinteraktion */
  const breakFollow = () => { if (followMode) setFollowMode(false); };

  const route = data?.route as (Route & { businesses?: { name?: string } }) | undefined;
  const stops = data?.stops || [];

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

  const legOrigin: { lat: number; lng: number } | null = userPos
    ? { lat: userPos[0], lng: userPos[1] }
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

  const { data: directions } = useDirections(legWaypoints);

  const distanceToNextM: number | null = useMemo(() => {
    if (!userPos || !nextStop || nextStop.latitude == null || nextStop.longitude == null) return null;
    return haversineMeters(userPos[0], userPos[1], Number(nextStop.latitude), Number(nextStop.longitude));
  }, [userPos, nextStop?.id, nextStop?.latitude, nextStop?.longitude]);

  const ARRIVAL_THRESHOLD_M = 75;
  const isAtNextStop = distanceToNextM != null && distanceToNextM <= ARRIVAL_THRESHOLD_M;

  /* Ankomstlyd */
  useEffect(() => {
    if (!isAtNextStop || !nextStop || !audioEnabled) return;
    if (arrivedAnnouncedRef.current.has(nextStop.id)) return;
    arrivedAnnouncedRef.current.add(nextStop.id);
    playArrivalChime();
    const name = nextStop.customer_name || "stoppet";
    setTimeout(() => speak(`Du er ankommet til ${name}`), 600);
  }, [isAtNextStop, nextStop?.id, audioEnabled]);

  const legLine: [number, number][] = useMemo(() => {
    if (!directions?.geometry?.coordinates) return [];
    return directions.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
  }, [directions]);

  const derivedHeading = useMemo(() => {
    if (userHeading != null) return userHeading;
    if (!userPos || !nextStop || nextStop.latitude == null || nextStop.longitude == null) return null;
    return bearingDegrees(userPos[0], userPos[1], Number(nextStop.latitude), Number(nextStop.longitude));
  }, [userHeading, userPos, nextStop?.id, nextStop?.latitude, nextStop?.longitude]);

  const allPoints: [number, number][] = useMemo(() => {
    const pts: [number, number][] = [];
    if (startCoord) pts.push(startCoord);
    for (const s of validStops) pts.push([Number(s.latitude), Number(s.longitude)]);
    return pts;
  }, [startCoord, validStops]);

  const completedCount = sortedStops.filter((s) => s.status === "completed").length;
  const allDone = sortedStops.length > 0 && completedCount === sortedStops.length;
  const progress = sortedStops.length > 0 ? (completedCount / sortedStops.length) * 100 : 0;
  // Brug Serviceydere accent (teal) som primær handlings-farve i kort-UI'et.
  // route.color beholdes til badges/rute-identifikation i kalenderen.
  const themeColor = "hsl(184 90% 32%)";
  const routeBadgeColor = route?.color || "hsl(184 90% 32%)";

  /* Fanfare ved dagsfærdig */
  useEffect(() => {
    if (!allDone || finishedAnnouncedRef.current || !audioEnabled) return;
    finishedAnnouncedRef.current = true;
    playCompleteFanfare();
    setTimeout(() => speak("Godt arbejde. Alle stop er klaret."), 800);
  }, [allDone, audioEnabled]);

  /* Auto-redirect når alt er færdigt */
  useEffect(() => {
    if (!allDone) return;
    setAutoReturn(8);
    const tick = setInterval(() => {
      setAutoReturn((n) => {
        if (n == null) return null;
        if (n <= 1) { clearInterval(tick); navigate("/medarbejder"); return 0; }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [allDone, navigate]);

  const etaLabel: string | null = useMemo(() => {
    if (!directions?.duration_s) return null;
    const eta = new Date(Date.now() + directions.duration_s * 1000);
    return eta.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  }, [directions?.duration_s]);

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
  const maneuver = useCurrentManeuver(directions?.steps, userPos);
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
    return (
      <div className="flex min-h-screen items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Indlæser rute...
      </div>
    );
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
    try {
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
      {/* ─── Compact header — kun synlig før rute starter eller ved færdig ─── */}
      {(!routeStarted || allDone) && (
      <header className="relative shrink-0 z-30 bg-background border-b">
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary/40">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-background shrink-0">
            <Link to="/medarbejder" aria-label="Tilbage"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-background text-xs font-semibold shrink-0 max-w-[55%]"
            style={{ background: routeBadgeColor }}
          >
            <span className="truncate">{route.name || "Rute"}</span>
            <span className="px-1.5 py-0.5 rounded-full bg-background/25 tabular-nums text-[10px]">
              {completedCount}/{sortedStops.length}
            </span>
          </div>

          {etaLabel && nextStop && (
            <Badge variant="outline" className="tabular-nums hidden sm:inline-flex bg-background/70">
              <Clock className="h-3 w-3 mr-1" /> {etaLabel}
            </Badge>
          )}

          <div className="flex-1" />

          <Button
            size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-background"
            onClick={() => setListOpen((v) => !v)} aria-label="Vis liste"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            size="icon" variant="ghost" className="h-9 w-9 rounded-full hover:bg-background"
            onClick={() => setAudioEnabled((v) => !v)}
            aria-label={audioEnabled ? "Slå lyd fra" : "Slå lyd til"}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>

        {/* Progress bar — route color */}
        <div className="h-1 w-full bg-secondary">
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
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              attribution='&copy; OpenStreetMap &copy; CARTO'
            />

            {/* Fit overview when not started */}
            <FitTo points={allPoints} enabled={!routeStarted} />
            {/* Live follow when driving */}
            <FollowUser active={routeStarted && followMode} userPos={userPos} />

            {startCoord && <Marker position={startCoord} icon={startIcon} />}

            {/* Route line */}
            {legLine.length > 1 && (
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

            {/* User position — Google Maps puck when driving */}
            {userPos && routeStarted && derivedHeading != null && (
              <Marker position={userPos} icon={navPuckIcon(derivedHeading)} />
            )}
            {userPos && (!routeStarted || derivedHeading == null) && (
              <Marker position={userPos} icon={userDotIcon} />
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

        {/* ─── Floating right-side controls ─── */}
        <div className="absolute top-3 right-3 z-[1000] flex flex-col gap-2">
          {routeStarted && !allDone && (
            <Button
              size="icon" variant="secondary"
              onClick={() => setListOpen((v) => !v)}
              className="h-11 w-11 rounded-full shadow-lg bg-background/95 backdrop-blur"
              aria-label="Vis liste"
            >
              <List className="h-5 w-5" />
            </Button>
          )}
          {routeStarted && !allDone && (
            <Button
              size="icon" variant="secondary"
              onClick={() => setAudioEnabled((v) => !v)}
              className="h-11 w-11 rounded-full shadow-lg bg-background/95 backdrop-blur"
              aria-label={audioEnabled ? "Slå lyd fra" : "Slå lyd til"}
            >
              {audioEnabled ? <Volume2 className="h-5 w-5" /> : <VolumeX className="h-5 w-5" />}
            </Button>
          )}
          {routeStarted && (
            <Button
              size="icon"
              variant={followMode ? "default" : "secondary"}
              onClick={() => setFollowMode((v) => !v)}
              className="h-11 w-11 rounded-full shadow-lg backdrop-blur"
              style={followMode ? { background: themeColor } : undefined}
              aria-label={followMode ? "Slå live-følg fra" : "Slå live-følg til"}
              title={followMode ? "Følger din position" : "Recentrer"}
            >
              <Crosshair className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* ─── Fullscreen drive mode: floating top overlays (back pill + maneuver banner + traffic alert) ─── */}
        {routeStarted && !allDone && (
          <>
            {/* Back pill — top-left */}
            <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
              <Button
                asChild
                size="icon"
                variant="secondary"
                className="h-11 w-11 rounded-full shadow-lg bg-background/95 backdrop-blur"
              >
                <Link to="/medarbejder" aria-label="Tilbage">
                  <ArrowLeft className="h-5 w-5" />
                </Link>
              </Button>
              <div
                className="flex items-center gap-2 px-3 h-11 rounded-full text-background text-xs font-semibold shadow-lg backdrop-blur"
                style={{ background: themeColor }}
              >
                <span className="tabular-nums">{completedCount}/{sortedStops.length}</span>
              </div>
            </div>

            {/* Maneuver banner — floating top center */}
            {maneuver && nextStop && (
              <div className="absolute top-[68px] left-3 right-3 z-[1000] pointer-events-none">
                <Card className="overflow-hidden shadow-2xl rounded-2xl pointer-events-auto bg-background/98 backdrop-blur border-0">
                  <div className="flex items-stretch">
                    <div
                      className="flex flex-col items-center justify-center w-24 shrink-0 text-background py-3"
                      style={{ background: themeColor }}
                    >
                      <ManeuverIcon
                        type={maneuver.currentStep.maneuver.type}
                        modifier={maneuver.currentStep.maneuver.modifier}
                        className="h-11 w-11"
                      />
                      <span className="text-[11px] font-bold tracking-wide mt-1 tabular-nums">
                        {formatKm(maneuver.distanceToManeuverM)}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 px-3 py-3">
                      <p className="font-bold text-base leading-tight truncate">
                        {maneuverLabel(maneuver.currentStep.maneuver.type, maneuver.currentStep.maneuver.modifier)}
                      </p>
                      {maneuver.currentStep.name && (
                        <p className="text-sm text-muted-foreground truncate mt-0.5">
                          ad <span className="font-semibold text-foreground">{maneuver.currentStep.name}</span>
                        </p>
                      )}
                      {maneuver.nextStep && (
                        <div className="flex items-center gap-1.5 mt-1.5 pt-1.5 border-t text-[11px] text-muted-foreground">
                          <span>Derefter:</span>
                          <ManeuverIcon
                            type={maneuver.nextStep.maneuver.type}
                            modifier={maneuver.nextStep.maneuver.modifier}
                            className="h-3.5 w-3.5"
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

            {/* Traffic / forsinkelse alert — animeret når ETA stiger */}
            {trafficAlert && (
              <div className={`absolute ${maneuver ? "top-[200px]" : "top-[68px]"} left-3 right-3 z-[1000] pointer-events-none`}>
                <div
                  className="pointer-events-auto rounded-2xl shadow-2xl overflow-hidden border animate-in fade-in slide-in-from-top-2 duration-300"
                  style={{
                    background: "hsl(38 100% 96%)",
                    borderColor: "hsl(38 100% 70%)",
                  }}
                >
                  <div className="flex items-center gap-2.5 px-3 py-2.5">
                    <div
                      className="h-9 w-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                      style={{ background: "hsl(28 95% 50%)", color: "white" }}
                    >
                      <TrafficCone className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold leading-tight" style={{ color: "hsl(28 80% 20%)" }}>
                        Trafik på ruten
                      </p>
                      <p className="text-[11px] leading-tight mt-0.5" style={{ color: "hsl(28 60% 30%)" }}>
                        +{trafficAlert.addedMin} min ekstra ({trafficAlert.deltaPct}% længere)
                      </p>
                    </div>
                    <button
                      onClick={() => setTrafficAlert(null)}
                      className="text-xs font-bold px-2.5 py-1 rounded-lg shrink-0 transition-colors"
                      style={{ color: "hsl(28 80% 20%)", background: "hsl(38 100% 88%)" }}
                      aria-label="Luk advarsel"
                    >
                      OK
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}

        {/* ─── Pre-start CTA: big start button at the bottom ─── */}
        {!routeStarted && !allDone && nextStop && (
          <div className="absolute bottom-0 inset-x-0 z-[1000] p-3">
            <Card
              className="overflow-hidden shadow-2xl rounded-2xl border-t-2"
              style={{ borderTopColor: themeColor }}
            >
              {/* Kalender-stil header */}
              <div className="px-4 pt-3 pb-2 bg-secondary/30">
                <div className="flex items-center gap-2 mb-1.5">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold flex-1">
                    Næste stop · {nextStopIdx + 1} af {sortedStops.length}
                  </p>
                  <Badge variant="secondary" className="text-[9px] h-4 px-1.5 tabular-nums">
                    {sortedStops.length} stop
                  </Badge>
                </div>
                <div className="flex items-start gap-2.5">
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-xl text-background text-sm font-bold shrink-0 shadow-sm"
                    style={{ background: themeColor }}
                  >
                    {nextStopIdx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate leading-tight">
                      {nextStop.customer_name || "Stop"}
                    </p>
                    {nextStop.address && (
                      <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                        <MapPin className="h-2.5 w-2.5 shrink-0" />{nextStop.address}
                      </p>
                    )}
                  </div>
                </div>

                {/* Segmented progress — kalender-stil */}
                <div className="flex gap-0.5 mt-2.5">
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
                              : "hsl(220 14% 88%)",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Info-grid: km, tid, ETA */}
              {(directions || etaLabel) && (
                <div className="grid grid-cols-3 divide-x bg-background border-t border-b">
                  <div className="px-2 py-2 text-center">
                    <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Distance</p>
                    <p className="text-sm font-bold tabular-nums mt-0.5">
                      {directions?.distance_m != null ? formatKm(directions.distance_m) : "—"}
                    </p>
                  </div>
                  <div className="px-2 py-2 text-center">
                    <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Køretid</p>
                    <p className="text-sm font-bold tabular-nums mt-0.5">
                      {directions?.duration_s != null ? formatMin(directions.duration_s) : "—"}
                    </p>
                  </div>
                  <div className="px-2 py-2 text-center">
                    <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Ankomst</p>
                    <p className="text-sm font-bold tabular-nums mt-0.5" style={{ color: themeColor }}>
                      {etaLabel || "—"}
                    </p>
                  </div>
                </div>
              )}

              <div className="p-3">
                <Button
                  onClick={handleStartRoute}
                  size="lg"
                  className="w-full gap-2 h-13 text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-shadow"
                  style={{ background: themeColor }}
                >
                  <Play className="h-5 w-5 fill-current" /> Start rute
                </Button>
                <p className="text-[10px] text-muted-foreground text-center mt-2">
                  Live navigation · auto-zoom · stemmevejledning
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* ─── Active driving card ─── */}
        {routeStarted && !allDone && nextStop && (
          <div className="absolute bottom-0 inset-x-0 z-[1000] p-3 pointer-events-none">
            <Card
              className="overflow-hidden shadow-2xl pointer-events-auto rounded-2xl border-t-2"
              style={{ borderTopColor: themeColor }}
            >
              {/* Segmented progress — kalender-stil dots på toppen */}
              <div className="flex gap-0.5 px-3 pt-2 bg-secondary/30">
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
                            : "hsl(220 14% 88%)",
                    }}
                  />
                ))}
              </div>
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-secondary/30 hover:bg-secondary/50 transition-colors border-b"
                onClick={() => setCollapsed((c) => !c)}
              >
                <span
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-background text-xs font-bold shrink-0 shadow-sm"
                  style={{ background: themeColor }}
                >
                  {nextStopIdx + 1}
                </span>
                <div className="flex-1 text-left min-w-0">
                  <p className="font-semibold text-sm truncate leading-tight">
                    {nextStop.customer_name || "Stop"}
                  </p>
                  <p className="text-[10px] text-muted-foreground tabular-nums">
                    Stop {nextStopIdx + 1} af {sortedStops.length}
                  </p>
                </div>
                {isAtNextStop ? (
                  <Badge className="gap-1 text-[10px] h-5 px-2 border-0" style={{ background: "hsl(142 70% 95%)", color: "hsl(142 70% 25%)" }}>
                    <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: "hsl(142 70% 45%)" }} />
                    Fremme
                  </Badge>
                ) : distanceToNextM != null ? (
                  <Badge variant="outline" className="tabular-nums text-[10px] h-5 px-2">
                    {formatKm(distanceToNextM)}
                  </Badge>
                ) : null}
                {collapsed ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-1" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />}
              </button>

              {!collapsed && (
                <div className="p-3 space-y-3">
                  {/* Adresse + service */}
                  {(nextStop.address || (nextStop.service_summary && stripPrices(nextStop.service_summary))) && (
                    <div className="rounded-xl bg-secondary/30 p-2.5 space-y-1.5">
                      {nextStop.address && (
                        <p className="text-[13px] flex items-start gap-1.5 leading-tight">
                          <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0 text-muted-foreground" />
                          <span className="font-medium">{nextStop.address}</span>
                        </p>
                      )}
                      {nextStop.service_summary && stripPrices(nextStop.service_summary) && (
                        <p className="text-[12px] text-muted-foreground line-clamp-2 pl-5">
                          {stripPrices(nextStop.service_summary)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Info-grid: km, tid, ETA — kalender-stil */}
                  {(directions || etaLabel) && (
                    <div className="grid grid-cols-3 divide-x rounded-xl border bg-background overflow-hidden">
                      <div className="px-2 py-1.5 text-center">
                        <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Distance</p>
                        <p className="text-[13px] font-bold tabular-nums mt-0.5">
                          {directions?.distance_m != null ? formatKm(directions.distance_m) : "—"}
                        </p>
                      </div>
                      <div className="px-2 py-1.5 text-center">
                        <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Tid</p>
                        <p className="text-[13px] font-bold tabular-nums mt-0.5">
                          {directions?.duration_s != null ? formatMin(directions.duration_s) : "—"}
                        </p>
                      </div>
                      <div className="px-2 py-1.5 text-center">
                        <p className="text-[9px] uppercase text-muted-foreground font-semibold tracking-wide">Ankomst</p>
                        <p className="text-[13px] font-bold tabular-nums mt-0.5" style={{ color: themeColor }}>
                          {etaLabel || "—"}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={() => handleNavigate(nextStop)} variant="outline" size="sm" className="gap-1 h-9 rounded-lg text-xs">
                      <Navigation className="h-3.5 w-3.5" /> Maps
                    </Button>
                    {nextStop.customer_phone ? (
                      <Button asChild variant="outline" size="sm" className="gap-1 h-9 rounded-lg text-xs">
                        <a href={`tel:${nextStop.customer_phone}`}><Phone className="h-3.5 w-3.5" /> Ring</a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled className="gap-1 h-9 rounded-lg text-xs">
                        <Phone className="h-3.5 w-3.5" /> Ring
                      </Button>
                    )}
                    <Button onClick={() => setSelectedId(nextStop.id)} variant="outline" size="sm" className="h-9 rounded-lg text-xs">
                      Detaljer
                    </Button>
                  </div>

                  <Button
                    onClick={() => handleComplete(nextStop)}
                    size="lg"
                    className={`w-full gap-2 h-13 text-base font-bold rounded-xl shadow-lg hover:shadow-xl transition-all ${isAtNextStop ? "ring-4 ring-offset-2 animate-pulse" : ""}`}
                    style={{
                      background: isAtNextStop ? "hsl(142 70% 45%)" : themeColor,
                      ...(isAtNextStop ? { ["--tw-ring-color" as any]: "hsl(142 70% 45% / 0.4)" } : {}),
                    }}
                    disabled={updateStatus.isPending}
                  >
                    {updateStatus.isPending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="h-6 w-6" />
                    )}
                    {isAtNextStop ? "Du er fremme — markér udført" : "Markér som udført"}
                  </Button>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ─── Done state ─── */}
        {allDone && (
          <div className="absolute bottom-0 inset-x-0 z-[1000] p-3">
            <Card
              className="overflow-hidden shadow-2xl rounded-2xl border-t-2"
              style={{ borderTopColor: "hsl(142 70% 45%)" }}
            >
              <div className="p-5 text-center space-y-3">
                <div
                  className="h-16 w-16 mx-auto rounded-2xl flex items-center justify-center shadow-lg"
                  style={{ background: "hsl(142 70% 95%)", color: "hsl(142 70% 30%)" }}
                >
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div>
                  <p className="font-bold text-lg">Rute færdig 🎉</p>
                  <p className="text-sm text-muted-foreground">
                    Alle {sortedStops.length} stop udført
                    {autoReturn != null && autoReturn > 0 && ` · oversigt om ${autoReturn}s`}
                  </p>
                </div>
                {/* Mini-stats */}
                <div className="grid grid-cols-3 divide-x rounded-xl border bg-secondary/30 overflow-hidden">
                  <div className="px-2 py-2">
                    <p className="text-[9px] uppercase text-muted-foreground font-semibold">Stop</p>
                    <p className="text-sm font-bold tabular-nums">{sortedStops.length}</p>
                  </div>
                  <div className="px-2 py-2">
                    <p className="text-[9px] uppercase text-muted-foreground font-semibold">Distance</p>
                    <p className="text-sm font-bold tabular-nums">
                      {route.total_distance_km != null ? `${route.total_distance_km.toFixed(1)} km` : "—"}
                    </p>
                  </div>
                  <div className="px-2 py-2">
                    <p className="text-[9px] uppercase text-muted-foreground font-semibold">Tid</p>
                    <p className="text-sm font-bold tabular-nums">
                      {route.total_duration_minutes != null ? `${route.total_duration_minutes} min` : "—"}
                    </p>
                  </div>
                </div>
                <Button
                  size="lg"
                  className="w-full gap-2 h-12 rounded-xl"
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
      <Sheet open={!!selectedId} onOpenChange={(o) => !o && setSelectedId(null)}>
        <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Stop-detaljer</SheetTitle>
            <SheetDescription>Information og handlinger for valgt stop.</SheetDescription>
          </SheetHeader>
          {(() => {
            const s = sortedStops.find((x) => x.id === selectedId);
            if (!s) return null;
            const isDone = s.status === "completed";
            const idx = sortedStops.indexOf(s);
            return (
              <div className="space-y-4 mt-4">
                <div className="flex items-start gap-3">
                  <span
                    className="flex h-11 w-11 items-center justify-center rounded-full font-semibold text-background shrink-0"
                    style={{ background: isDone ? "hsl(142 70% 45%)" : themeColor }}
                  >
                    {isDone ? <CheckCircle2 className="h-5 w-5" /> : idx + 1}
                  </span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{s.customer_name || "Stop"}</h3>
                      <Badge variant={isDone ? "secondary" : "outline"} className="text-[10px]">{s.status}</Badge>
                    </div>
                    {s.address && (
                      <p className="text-sm text-muted-foreground flex items-start gap-1 mt-1">
                        <MapPin className="h-3.5 w-3.5 mt-0.5" />{s.address}
                      </p>
                    )}
                    {s.service_summary && stripPrices(s.service_summary) && (
                      <p className="text-sm mt-2">{stripPrices(s.service_summary)}</p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => handleNavigate(s)} variant="outline" className="gap-1">
                    <Navigation className="h-4 w-4" /> Naviger
                  </Button>
                  {s.customer_phone ? (
                    <Button asChild variant="outline" className="gap-1">
                      <a href={`tel:${s.customer_phone}`}><Phone className="h-4 w-4" /> Ring</a>
                    </Button>
                  ) : (
                    <Button variant="outline" disabled className="gap-1">
                      <Phone className="h-4 w-4" /> Ring
                    </Button>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium mb-1 block">Note (synlig for virksomheden)</label>
                  <Textarea
                    placeholder="Tilføj note..."
                    value={noteDraft[s.id] ?? s.notes ?? ""}
                    onChange={(e) => setNoteDraft((d) => ({ ...d, [s.id]: e.target.value }))}
                    rows={3}
                  />
                </div>

                {!isDone ? (
                  <Button onClick={() => handleComplete(s)} className="w-full gap-2" size="lg" disabled={updateStatus.isPending}>
                    <CheckCircle2 className="h-5 w-5" /> Markér som udført
                  </Button>
                ) : (
                  <Button onClick={() => handleUndo(s)} variant="outline" className="w-full">
                    Fortryd udført
                  </Button>
                )}
              </div>
            );
          })()}
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
    const handler = () => onInteract();
    map.on("dragstart", handler);
    map.on("zoomstart", handler);
    return () => {
      map.off("dragstart", handler);
      map.off("zoomstart", handler);
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
      bg: "hsl(142 70% 95%)",
      text: "hsl(142 70% 25%)",
      dot: "hsl(142 70% 45%)",
    };
    if (s.id === nextStopId) return {
      label: "Næste",
      bg: `${themeColor}1a`,
      text: themeColor,
      dot: themeColor,
    };
    return {
      label: "Klar",
      bg: "hsl(220 14% 95%)",
      text: "hsl(220 14% 35%)",
      dot: "hsl(220 14% 65%)",
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
        className="pointer-events-auto mx-auto w-full max-w-3xl bg-background/98 backdrop-blur shadow-2xl rounded-t-2xl transition-transform duration-300 ease-out border-t border-border"
        style={{
          transform: open ? "translateY(0)" : "translateY(calc(100% - 38px))",
          maxHeight: "60vh",
        }}
      >
        {/* Kompakt rail — kun 38px høj når lukket */}
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center gap-2 px-3 h-[38px] hover:bg-secondary/40 transition-colors rounded-t-2xl relative"
          aria-expanded={open}
        >
          <span className="h-0.5 w-8 rounded-full bg-muted-foreground/25 absolute left-1/2 -translate-x-1/2 top-1" />
          <List className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-[11px] font-semibold text-foreground/80">Alle stop</span>
          <Badge variant="secondary" className="tabular-nums text-[9px] h-3.5 px-1 font-bold">
            {done}/{total}
          </Badge>
          {/* Mini progress dots — kompakt */}
          <div className="flex-1 flex gap-0.5 items-center justify-end overflow-hidden">
            {stops.slice(0, 10).map((s) => (
              <span
                key={s.id}
                className="h-1 w-1 rounded-full shrink-0"
                style={{
                  background:
                    s.status === "completed"
                      ? "hsl(142 70% 45%)"
                      : s.id === nextStopId
                        ? themeColor
                        : "hsl(220 14% 82%)",
                }}
              />
            ))}
            {stops.length > 10 && (
              <span className="text-[8px] text-muted-foreground tabular-nums ml-0.5">+{stops.length - 10}</span>
            )}
          </div>
          {open ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" />}
        </button>

        <div
          className="overflow-y-auto p-2 space-y-1 border-t"
          style={{ maxHeight: "calc(60vh - 38px)" }}
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
              <button
                key={s.id}
                onClick={() => onSelectStop(s)}
                onDoubleClick={() => onOpenDetails(s)}
                className={`w-full text-left p-2.5 rounded-xl border flex items-stretch gap-2.5 transition-all hover:bg-muted/50 hover:shadow-sm ${
                  isHl ? "ring-2 ring-offset-1" : ""
                } ${isDone ? "opacity-60" : ""}`}
                style={{
                  borderColor: isNext ? themeColor : undefined,
                  background: isNext ? `${themeColor}08` : undefined,
                  borderLeftWidth: isNext ? 3 : 1,
                  borderLeftColor: isNext ? themeColor : isDone ? "hsl(142 70% 45%)" : "hsl(220 14% 90%)",
                  ...(isHl ? { ["--tw-ring-color" as any]: themeColor } : {}),
                }}
              >
                {/* Tids-kolonne — kalender-stil */}
                <div className="flex flex-col items-center justify-start pt-0.5 w-10 shrink-0">
                  <span
                    className="flex h-8 w-8 items-center justify-center rounded-lg font-bold text-[12px] shrink-0 text-background shadow-sm"
                    style={{ background: isDone ? "hsl(142 70% 45%)" : isNext ? themeColor : "hsl(220 14% 65%)" }}
                  >
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  {plannedTime && (
                    <span className="text-[9px] text-muted-foreground tabular-nums font-semibold mt-1">
                      {plannedTime}
                    </span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className={`font-semibold text-sm truncate ${isDone ? "line-through text-muted-foreground" : ""}`}>
                      {s.customer_name || "Stop"}
                    </p>
                    <Badge
                      className="text-[9px] h-4 px-1.5 border-0 font-bold uppercase tracking-wide gap-1"
                      style={{ background: meta.bg, color: meta.text }}
                    >
                      <span
                        className={`h-1 w-1 rounded-full ${isNext ? "animate-pulse" : ""}`}
                        style={{ background: meta.dot }}
                      />
                      {meta.label}
                    </Badge>
                  </div>
                  {s.address && (
                    <p className="text-[11px] text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                      <MapPin className="h-2.5 w-2.5 shrink-0" />{s.address}
                    </p>
                  )}
                  {s.duration_minutes > 0 && (
                    <p className="text-[10px] text-muted-foreground tabular-nums mt-0.5 flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" />~{s.duration_minutes} min
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpenDetails(s); }}
                  className="text-[10px] font-semibold text-muted-foreground hover:text-foreground shrink-0 px-2 py-1 rounded-md hover:bg-secondary self-center"
                >
                  Detaljer
                </button>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default EmployeeRoute;
