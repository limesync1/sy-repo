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
  ChevronUp, ChevronDown, Play, Volume2, VolumeX, Crosshair, Flag,
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
  html: `<div style="width:30px;height:30px;border-radius:50%;background:hsl(222 47% 11%);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:9px;border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,.3);">START</div>`,
  iconSize: [30, 30],
  iconAnchor: [15, 15],
});

const stopIcon = (n: number, state: "next" | "done" | "future", color: string, highlighted = false) => {
  const bg = state === "done" ? "hsl(142 70% 45%)" : state === "next" ? color : "hsl(220 14% 65%)";
  const baseRing = state === "next" ? `0 0 0 5px ${color}33, 0 0 0 9px ${color}1a` : "";
  const hlRing = highlighted ? `0 0 0 4px hsl(48 96% 53%), 0 0 0 8px hsl(48 96% 53% / 0.35)` : "";
  const ring = [baseRing, hlRing].filter(Boolean).join(", ") || "none";
  const size = highlighted ? 46 : state === "next" ? 42 : 34;
  return L.divIcon({
    className: "",
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:${state === "next" ? 16 : 13}px;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,.35), ${ring};">${state === "done" ? "✓" : n}</div>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
};

/** Google Maps-style blue navigation puck with directional cone. */
const navPuckIcon = (rotation: number) => L.divIcon({
  className: "",
  html: `
    <div style="position:relative;width:60px;height:60px;transform:rotate(${rotation}deg);transform-origin:center;">
      <div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);width:0;height:0;border-left:18px solid transparent;border-right:18px solid transparent;border-bottom:32px solid rgba(59,130,246,0.55);"></div>
      <div style="position:absolute;top:18px;left:18px;width:24px;height:24px;border-radius:50%;background:hsl(217 91% 60%);border:4px solid white;box-shadow:0 2px 8px rgba(0,0,0,.4);"></div>
    </div>`,
  iconSize: [60, 60],
  iconAnchor: [30, 30],
});

const userDotIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:hsl(217 91% 60%);border:3px solid white;box-shadow:0 0 0 6px rgba(59,130,246,.25),0 2px 6px rgba(0,0,0,.3);"></div>`,
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
    const targetZoom = 17;
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
  const themeColor = route?.color || "hsl(184 90% 42%)";

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
      {/* ─── Compact header — calendar pill style ─── */}
      <header className="relative shrink-0 z-30 bg-background border-b">
        <div className="flex items-center gap-2 px-3 py-2 bg-secondary/40">
          <Button asChild variant="ghost" size="icon" className="h-9 w-9 rounded-full hover:bg-background shrink-0">
            <Link to="/medarbejder" aria-label="Tilbage"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>

          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-full text-background text-xs font-semibold shrink-0 max-w-[55%]"
            style={{ background: themeColor }}
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

        {/* Maneuver banner — only when actively driving */}
        {routeStarted && maneuver && nextStop && !allDone && (
          <Card className="mx-3 mt-3 mb-2 overflow-hidden shadow-lg border-2" style={{ borderColor: `${themeColor}40` }}>
            <div className="flex items-stretch">
              <div
                className="flex flex-col items-center justify-center w-24 shrink-0 text-background py-2"
                style={{ background: themeColor }}
              >
                <ManeuverIcon
                  type={maneuver.currentStep.maneuver.type}
                  modifier={maneuver.currentStep.maneuver.modifier}
                  className="h-10 w-10"
                />
                <span className="text-[10px] font-bold tracking-wide mt-1 tabular-nums">
                  {formatKm(maneuver.distanceToManeuverM)}
                </span>
              </div>
              <div className="flex-1 min-w-0 px-3 py-2.5">
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
        )}
      </header>

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
                {/* Outer glow */}
                <Polyline
                  positions={legLine}
                  pathOptions={{ color: "white", weight: 11, opacity: 0.8 }}
                />
                <Polyline
                  positions={legLine}
                  pathOptions={{ color: themeColor, weight: 7, opacity: 0.95 }}
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
          {routeStarted && (
            <Button
              size="icon"
              variant={followMode ? "default" : "secondary"}
              onClick={() => setFollowMode((v) => !v)}
              className="h-11 w-11 rounded-full shadow-lg"
              style={followMode ? { background: themeColor } : undefined}
              aria-label={followMode ? "Slå live-følg fra" : "Slå live-følg til"}
              title={followMode ? "Følger din position" : "Recentrer"}
            >
              <Crosshair className="h-5 w-5" />
            </Button>
          )}
        </div>

        {/* ─── Pre-start CTA: big start button at the bottom ─── */}
        {!routeStarted && !allDone && nextStop && (
          <div className="absolute bottom-0 inset-x-0 z-[1000] p-3">
            <Card className="overflow-hidden shadow-2xl">
              <div className="px-4 py-3 bg-secondary/40 border-b flex items-center gap-3">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-background text-sm font-bold shrink-0"
                  style={{ background: themeColor }}
                >
                  {nextStopIdx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-semibold">
                    Klar til at starte
                  </p>
                  <p className="font-semibold truncate">{nextStop.customer_name || "Stop"}</p>
                </div>
                {sortedStops.length > 1 && (
                  <Badge variant="outline" className="shrink-0">
                    {sortedStops.length} stop
                  </Badge>
                )}
              </div>
              <div className="p-3">
                <Button
                  onClick={handleStartRoute}
                  size="lg"
                  className="w-full gap-2 h-14 text-base font-bold"
                  style={{ background: themeColor }}
                >
                  <Play className="h-5 w-5" /> Start rute
                </Button>
                <p className="text-[11px] text-muted-foreground text-center mt-2">
                  Vi zoomer ind på din position og følger dig live, ligesom Google Maps.
                </p>
              </div>
            </Card>
          </div>
        )}

        {/* ─── Active driving card ─── */}
        {routeStarted && !allDone && nextStop && (
          <div className="absolute bottom-0 inset-x-0 z-[1000] p-3 pointer-events-none">
            <Card className="overflow-hidden shadow-2xl pointer-events-auto rounded-2xl">
              <button
                type="button"
                className="w-full flex items-center gap-2 px-3 py-2.5 bg-secondary/40 hover:bg-secondary/60 transition-colors border-b"
                onClick={() => setCollapsed((c) => !c)}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full text-background text-xs font-bold shrink-0"
                  style={{ background: themeColor }}
                >
                  {nextStopIdx + 1}
                </span>
                <span className="flex-1 text-left text-sm min-w-0">
                  <span className="font-semibold truncate">{nextStop.customer_name || "Stop"}</span>
                  <span className="text-muted-foreground text-xs ml-1.5">
                    · {nextStopIdx + 1}/{sortedStops.length}
                  </span>
                </span>
                {isAtNextStop ? (
                  <Badge className="bg-accent text-accent-foreground gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-accent-foreground animate-pulse" />
                    Fremme
                  </Badge>
                ) : distanceToNextM != null ? (
                  <Badge variant="outline" className="tabular-nums">
                    {formatKm(distanceToNextM)}
                  </Badge>
                ) : null}
                {collapsed ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-1" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-1" />}
              </button>

              {!collapsed && (
                <div className="p-3 space-y-3">
                  <div className="rounded-xl bg-secondary/40 border p-3 space-y-2">
                    {nextStop.address && (
                      <p className="text-sm flex items-start gap-1.5">
                        <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                        <span>{nextStop.address}</span>
                      </p>
                    )}
                    {nextStop.service_summary && stripPrices(nextStop.service_summary) && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {stripPrices(nextStop.service_summary)}
                      </p>
                    )}
                    {(directions || etaLabel) && (
                      <div className="flex items-center gap-3 pt-2 border-t text-xs tabular-nums">
                        {directions && (
                          <span className="text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" /> {formatMin(directions.duration_s)}
                          </span>
                        )}
                        {etaLabel && (
                          <span className="font-semibold" style={{ color: themeColor }}>
                            <Flag className="inline h-3 w-3 mr-1" /> Ankomst {etaLabel}
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <Button onClick={() => handleNavigate(nextStop)} variant="outline" size="sm" className="gap-1 h-10">
                      <Navigation className="h-4 w-4" /> Maps
                    </Button>
                    {nextStop.customer_phone ? (
                      <Button asChild variant="outline" size="sm" className="gap-1 h-10">
                        <a href={`tel:${nextStop.customer_phone}`}><Phone className="h-4 w-4" /> Ring</a>
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled className="gap-1 h-10">
                        <Phone className="h-4 w-4" /> Ring
                      </Button>
                    )}
                    <Button onClick={() => setSelectedId(nextStop.id)} variant="outline" size="sm" className="h-10">
                      Detaljer
                    </Button>
                  </div>

                  <Button
                    onClick={() => handleComplete(nextStop)}
                    size="lg"
                    className={`w-full gap-2 h-14 text-base font-bold ${isAtNextStop ? "ring-4 ring-offset-2" : ""}`}
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
            <Card className="overflow-hidden shadow-2xl rounded-2xl">
              <div className="p-5 text-center space-y-3">
                <div className="h-16 w-16 mx-auto rounded-full bg-green-100 text-green-700 flex items-center justify-center">
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div>
                  <p className="font-bold text-lg">Rute færdig 🎉</p>
                  <p className="text-sm text-muted-foreground">
                    Alle {sortedStops.length} stop udført
                    {autoReturn != null && autoReturn > 0 && ` · oversigt om ${autoReturn}s`}
                  </p>
                </div>
                <Button
                  size="lg"
                  className="w-full gap-2 h-12"
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

  const statusMeta = (s: RouteStop): { label: string; dot: string; text: string } => {
    if (s.status === "completed") return { label: "Færdig", dot: "hsl(142 70% 45%)", text: "hsl(142 70% 30%)" };
    if (s.id === nextStopId) return { label: "I gang", dot: themeColor, text: themeColor };
    return { label: "Klar", dot: "hsl(220 14% 65%)", text: "hsl(220 14% 45%)" };
  };

  return (
    <div
      className="absolute left-0 right-0 bottom-0 z-[1100] pointer-events-none"
      aria-hidden={false}
    >
      <div
        className="pointer-events-auto mx-auto w-full max-w-3xl bg-background border-t shadow-2xl rounded-t-2xl transition-transform duration-300 ease-out"
        style={{ transform: open ? "translateY(0)" : "translateY(calc(100% - 52px))", maxHeight: "65vh" }}
      >
        <button
          type="button"
          onClick={onToggle}
          className="w-full flex items-center gap-3 px-4 h-[52px] border-b bg-secondary/40 hover:bg-secondary/60 transition-colors rounded-t-2xl"
          aria-expanded={open}
        >
          <span className="h-1.5 w-10 rounded-full bg-muted-foreground/40 absolute left-1/2 -translate-x-1/2 -top-3" />
          <List className="h-4 w-4 text-muted-foreground" />
          <span className="font-semibold text-sm">Alle stop</span>
          <Badge variant="outline" className="tabular-nums text-[10px]">
            {done}/{total}
          </Badge>
          <span className="flex-1" />
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
        </button>

        <div
          className="overflow-y-auto p-2 space-y-1.5"
          style={{ maxHeight: "calc(65vh - 52px)" }}
        >
          {stops.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-6">Ingen stop på denne rute.</p>
          )}
          {stops.map((s, i) => {
            const isHl = s.id === highlightedId;
            const isDone = s.status === "completed";
            const isNext = s.id === nextStopId;
            const meta = statusMeta(s);
            return (
              <button
                key={s.id}
                onClick={() => onSelectStop(s)}
                onDoubleClick={() => onOpenDetails(s)}
                className={`w-full text-left p-2.5 rounded-xl border flex items-start gap-2.5 transition-all hover:bg-muted ${
                  isHl ? "ring-2 ring-offset-1" : ""
                } ${isDone ? "opacity-70" : ""}`}
                style={{
                  borderColor: isNext ? themeColor : undefined,
                  background: isNext ? `${themeColor}10` : undefined,
                  ...(isHl ? { ["--tw-ring-color" as any]: themeColor } : {}),
                }}
              >
                <span
                  className="flex h-7 w-7 items-center justify-center rounded-full font-semibold text-[11px] shrink-0 text-background"
                  style={{ background: isDone ? "hsl(142 70% 45%)" : isNext ? themeColor : "hsl(220 14% 65%)" }}
                >
                  {isDone ? <CheckCircle2 className="h-3.5 w-3.5" /> : i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-medium text-sm truncate ${isDone ? "line-through" : ""}`}>
                    {s.customer_name || "Stop"}
                  </p>
                  {s.address && (
                    <p className="text-[11px] text-muted-foreground truncate">{s.address}</p>
                  )}
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`inline-block h-1.5 w-1.5 rounded-full ${isNext ? "animate-pulse" : ""}`}
                      style={{ background: meta.dot }}
                    />
                    <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: meta.text }}>
                      {meta.label}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); onOpenDetails(s); }}
                  className="text-[11px] font-semibold text-muted-foreground hover:text-foreground shrink-0 px-2 py-1 rounded-md hover:bg-secondary"
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
