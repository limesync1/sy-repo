import { useEffect, useMemo, useRef, useState } from "react";
import { Navigate, useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRouteData, useDirections, useUpdateStopStatus, type RouteStop, type Route } from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Navigation, Phone, CheckCircle2, MapPin, List, Clock, Loader2,
  ChevronUp, ChevronDown, Printer, Play, Volume2, VolumeX, Crosshair, Map as MapIcon,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, Tooltip, useMap } from "react-leaflet";
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

/* ── Icons ──────────────────────────────────────────────────────── */
const startIcon = L.divIcon({
  className: "",
  html: `<div style="width:36px;height:36px;border-radius:50%;background:hsl(222 47% 11%);display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:11px;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,.35);">START</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

const stopIcon = (n: number, state: "next" | "done" | "future") => {
  const bg = state === "done" ? "hsl(142 70% 45%)" : state === "next" ? "hsl(184 90% 42%)" : "hsl(220 14% 65%)";
  const ring = state === "next" ? "0 0 0 4px hsl(184 90% 42% / 0.3)" : "none";
  return L.divIcon({
    className: "",
    html: `<div style="width:38px;height:38px;border-radius:50%;background:${bg};display:flex;align-items:center;justify-content:center;color:white;font-weight:700;font-size:15px;border:3px solid white;box-shadow:0 3px 10px rgba(0,0,0,.35), ${ring};">${state === "done" ? "✓" : n}</div>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  });
};

const userIcon = L.divIcon({
  className: "",
  html: `<div style="width:18px;height:18px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 0 0 4px rgba(59,130,246,.3),0 2px 6px rgba(0,0,0,.3);"></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const headingIcon = (rotation: number) => L.divIcon({
  className: "",
  html: `<div style="width:34px;height:34px;display:flex;align-items:center;justify-content:center;transform:rotate(${rotation}deg);"><div style="width:0;height:0;border-left:11px solid transparent;border-right:11px solid transparent;border-bottom:24px solid hsl(184 90% 42%);filter:drop-shadow(0 2px 6px rgba(0,0,0,.35));"></div></div>`,
  iconSize: [34, 34],
  iconAnchor: [17, 17],
});

/* ── Helpers ────────────────────────────────────────────────────── */
const FitTo = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 15);
    } else {
      map.fitBounds(L.latLngBounds(points.map((p) => L.latLng(p[0], p[1]))), {
        padding: [60, 60], maxZoom: 15,
      });
    }
    setTimeout(() => map.invalidateSize(), 100);
  }, [points, map]);
  return null;
};

const FollowUser = ({
  active,
  userPos,
  nextStop,
}: {
  active: boolean;
  userPos: [number, number] | null;
  nextStop: RouteStop | undefined;
}) => {
  const map = useMap();
  useEffect(() => {
    if (!active || !userPos) return;
    const nextLat = nextStop?.latitude != null ? Number(nextStop.latitude) : null;
    const nextLng = nextStop?.longitude != null ? Number(nextStop.longitude) : null;
    if (nextLat != null && nextLng != null) {
      const bounds = L.latLngBounds([
        L.latLng(userPos[0], userPos[1]),
        L.latLng(nextLat, nextLng),
      ]);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16, animate: true });
      return;
    }
    map.setView(userPos, Math.max(map.getZoom(), 16), { animate: true });
  }, [active, userPos?.[0], userPos?.[1], nextStop?.id, map]);
  return null;
};

const formatKm = (m: number | null) => (m == null ? "—" : m < 1000 ? `${Math.round(m)} m` : `${(m / 1000).toFixed(1)} km`);
const formatMin = (s: number | null) => (s == null ? "—" : s < 60 ? "<1 min" : `${Math.round(s / 60)} min`);

/* ── Outer wrapper handles auth/loading; Inner has all data hooks ── */
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
  const [showList, setShowList] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);
  const [userHeading, setUserHeading] = useState<number | null>(null);
  const [routeStarted, setRouteStarted] = useState(false);
  const [followMode, setFollowMode] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [autoReturn, setAutoReturn] = useState<number | null>(null);
  /** Stop-id'er hvor vi allerede har afspillet ankomst-lyd (undgår spam). */
  const arrivedAnnouncedRef = useRef<Set<string>>(new Set());
  /** Har vi allerede spillet "dag færdig"-fanfaren? */
  const finishedAnnouncedRef = useRef(false);

  /* Geolocation — start kun watchPosition når ruten er startet */
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
      () => { /* silent */ },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, [routeStarted]);

  const route = data?.route as (Route & { businesses?: { name?: string } }) | undefined;
  const stops = data?.stops || [];

  const sortedStops = useMemo(
    () => [...stops].sort((a, b) => a.sequence - b.sequence),
    [stops],
  );
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
    () =>
      [...sortedStops]
        .reverse()
        .find((s) => s.status === "completed" && s.latitude != null && s.longitude != null),
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

  /** Afstand i meter fra brugerens GPS til næste stop (null hvis ukendt). */
  const distanceToNextM: number | null = useMemo(() => {
    if (!userPos || !nextStop || nextStop.latitude == null || nextStop.longitude == null) return null;
    return haversineMeters(userPos[0], userPos[1], Number(nextStop.latitude), Number(nextStop.longitude));
  }, [userPos, nextStop?.id, nextStop?.latitude, nextStop?.longitude]);

  /** Geofence-tærskel: GPS-præcision i byen er 20-50m, så 75m giver en pålidelig "du er fremme"-zone. */
  const ARRIVAL_THRESHOLD_M = 75;
  const isAtNextStop = distanceToNextM != null && distanceToNextM <= ARRIVAL_THRESHOLD_M;

  /* Spil ankomst-chime + tale én gang pr. stop når geofence udløses. */
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

  const fitPoints: [number, number][] = useMemo(() => {
    if (legLine.length > 1) return [legLine[0], legLine[legLine.length - 1]];
    if (nextStop && nextStop.latitude != null && nextStop.longitude != null) {
      const p: [number, number] = [Number(nextStop.latitude), Number(nextStop.longitude)];
      return legOrigin ? [[legOrigin.lat, legOrigin.lng], p] : [p];
    }
    return allPoints;
  }, [legLine, nextStop, legOrigin, allPoints]);

  const completedCount = sortedStops.filter((s) => s.status === "completed").length;
  const allDone = sortedStops.length > 0 && completedCount === sortedStops.length;

  /* Spil fanfare én gang når dagen er færdig. */
  useEffect(() => {
    if (!allDone || finishedAnnouncedRef.current || !audioEnabled) return;
    finishedAnnouncedRef.current = true;
    playCompleteFanfare();
    setTimeout(() => speak("Godt arbejde. Alle stop er klaret."), 800);
  }, [allDone, audioEnabled]);

  /* Auto-redirect til oversigt 8 sek. efter dagen er færdig (kan annulleres). */
  useEffect(() => {
    if (!allDone) return;
    setAutoReturn(8);
    const tick = setInterval(() => {
      setAutoReturn((n) => {
        if (n == null) return null;
        if (n <= 1) {
          clearInterval(tick);
          navigate("/medarbejder");
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [allDone, navigate]);

  /** Estimeret ankomsttid kl. HH:MM ud fra køretid + nuværende tid. */
  const etaLabel: string | null = useMemo(() => {
    if (!directions?.duration_s) return null;
    const eta = new Date(Date.now() + directions.duration_s * 1000);
    return eta.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
  }, [directions?.duration_s]);

  /* ─── Turn-by-turn: find current maneuver based on user GPS ─── */
  const maneuver = useCurrentManeuver(directions?.steps, userPos);
  const lastSpokenStepRef = useRef<string | null>(null);

  // Speak the next maneuver once when it changes (and when we get close enough).
  useEffect(() => {
    if (!audioEnabled || !maneuver || !routeStarted) return;
    const stepKey = `${maneuver.stepIndex}-${maneuver.currentStep.maneuver.type}-${maneuver.currentStep.name}`;
    if (lastSpokenStepRef.current === stepKey) return;
    if (maneuver.distanceToManeuverM > 250) return; // only announce when within 250m
    lastSpokenStepRef.current = stepKey;
    const street = maneuver.currentStep.name ? ` ad ${maneuver.currentStep.name}` : "";
    const action = maneuverLabel(
      maneuver.currentStep.maneuver.type,
      maneuver.currentStep.maneuver.modifier,
    );
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
    const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(dest)}&travelmode=driving`;
    window.open(url, "_blank");
  };

  const handleComplete = async (s: RouteStop) => {
    try {
      await updateStatus.mutateAsync({ id: s.id, status: "completed", notes: noteDraft[s.id] });
      if (audioEnabled) playSuccessChime();
      toast.success(`${s.customer_name || "Stop"} markeret som udført`);
      setSelectedId(null);
      // Annonceer næste stop hvis der er flere tilbage
      const remaining = sortedStops.filter((x) => x.status !== "completed" && x.id !== s.id);
      if (remaining.length > 0 && audioEnabled) {
        const next = remaining[0];
        setTimeout(() => speak(`Næste stop: ${next.customer_name || "ukendt kunde"}`), 900);
      }
    } catch { /* */ }
  };

  const handleUndo = async (s: RouteStop) => {
    try {
      await updateStatus.mutateAsync({ id: s.id, status: "pending" });
      toast.success("Markering fortrudt");
    } catch { /* */ }
  };

  const handleStartRoute = () => {
    unlockAudio();
    setRouteStarted(true);
    setFollowMode(true);
    toast.success("Rute startet — god tur!");
  };

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Top header — brand bar with route color stripe */}
      <header className="relative shrink-0 z-20 bg-foreground text-background shadow-lg">
        {/* Route color accent stripe */}
        <div className="h-1 w-full" style={{ background: route.color || "hsl(184 90% 42%)" }} />
        <div className="flex items-center gap-2 px-3 py-2.5">
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="text-background hover:bg-background/10 h-9 w-9 rounded-full"
          >
            <Link to="/medarbejder" aria-label="Tilbage"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold text-sm truncate leading-tight">{route.name || "Rute"}</h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] opacity-80 tabular-nums">
                {completedCount} af {sortedStops.length} færdige
              </span>
              {etaLabel && nextStop && (
                <span className="text-[11px] font-medium px-1.5 py-0.5 rounded-md bg-background/15 tabular-nums">
                  ETA {etaLabel}
                </span>
              )}
            </div>
          </div>
          <Button
            asChild
            size="sm"
            variant="ghost"
            className="text-background hover:bg-background/10 h-9 w-9 p-0 rounded-full"
            aria-label="Udskriv liste"
          >
            <Link to={`/medarbejder/rute/${route.id}/print`}><Printer className="h-4 w-4" /></Link>
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-background hover:bg-background/10 h-9 w-9 p-0 rounded-full"
            onClick={() => setShowList(true)}
            aria-label="Vis liste"
          >
            <List className="h-4 w-4" />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="text-background hover:bg-background/10 h-9 w-9 p-0 rounded-full"
            onClick={() => setAudioEnabled((v) => !v)}
            aria-label={audioEnabled ? "Slå lyd fra" : "Slå lyd til"}
            title={audioEnabled ? "Lyd til" : "Lyd fra"}
          >
            {audioEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
          </Button>
        </div>
        {/* Progress bar */}
        <div className="h-1 w-full bg-background/15">
          <div
            className="h-full transition-all duration-500 ease-out"
            style={{
              width: sortedStops.length > 0 ? `${(completedCount / sortedStops.length) * 100}%` : "0%",
              background: "hsl(142 70% 55%)",
            }}
          />
        </div>

        {/* Turn-by-turn maneuver banner — appears when route is started and we have steps */}
        {routeStarted && maneuver && nextStop && (
          <div className="px-3 pt-3 pb-3 bg-foreground">
            <div className="rounded-2xl bg-background text-foreground shadow-xl border border-border overflow-hidden">
              <div className="flex items-stretch">
                <div
                  className="flex items-center justify-center w-20 shrink-0 text-background"
                  style={{ background: route.color || "hsl(184 90% 42%)" }}
                >
                  <ManeuverIcon
                    type={maneuver.currentStep.maneuver.type}
                    modifier={maneuver.currentStep.maneuver.modifier}
                    className="h-9 w-9"
                  />
                </div>
                <div className="flex-1 min-w-0 px-3 py-2.5">
                  <p className="text-[11px] uppercase tracking-wide text-muted-foreground font-medium">
                    Om {formatKm(maneuver.distanceToManeuverM)}
                  </p>
                  <p className="font-semibold text-base leading-tight truncate">
                    {maneuverLabel(
                      maneuver.currentStep.maneuver.type,
                      maneuver.currentStep.maneuver.modifier,
                    )}
                  </p>
                  {maneuver.currentStep.name && (
                    <p className="text-sm text-muted-foreground truncate mt-0.5">
                      ad <span className="font-medium text-foreground">{maneuver.currentStep.name}</span>
                    </p>
                  )}
                </div>
              </div>
              {maneuver.nextStep && (
                <div className="flex items-center gap-2 px-3 py-2 border-t bg-muted/40 text-xs">
                  <span className="text-muted-foreground">Derefter</span>
                  <ManeuverIcon
                    type={maneuver.nextStep.maneuver.type}
                    modifier={maneuver.nextStep.maneuver.modifier}
                    className="h-4 w-4 text-foreground"
                  />
                  <span className="font-medium truncate flex-1">
                    {maneuverLabel(
                      maneuver.nextStep.maneuver.type,
                      maneuver.nextStep.maneuver.modifier,
                    )}
                    {maneuver.nextStep.name && ` · ${maneuver.nextStep.name}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Map fills remaining space */}
      <div className="relative flex-1 min-h-0">
        {allPoints.length === 0 ? (
          <div className="h-full flex items-center justify-center text-muted-foreground p-6 text-center">
            Ingen koordinater tilgængelige. Brug listevisningen i stedet.
          </div>
        ) : (
            <MapContainer
            center={allPoints[0]}
            zoom={12}
            style={{ height: "100%", width: "100%" }}
            scrollWheelZoom
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution="&copy; OpenStreetMap"
            />

            <FitTo points={fitPoints} />
              <FollowUser active={routeStarted && followMode} userPos={userPos} nextStop={nextStop} />

            {/* Start marker */}
            {startCoord && <Marker position={startCoord} icon={startIcon} />}

            {/* Active leg polyline */}
            {legLine.length > 1 && (
              <Polyline
                positions={legLine}
                pathOptions={{ color: "hsl(184 90% 42%)", weight: 6, opacity: 0.85 }}
                >
                  {directions && (
                    <Tooltip sticky direction="top" opacity={1}>
                      <span className="text-xs font-medium">
                        {formatKm(directions.distance_m)} · {formatMin(directions.duration_s)}
                      </span>
                    </Tooltip>
                  )}
                </Polyline>
            )}

            {/* User position */}
            {userPos && <Marker position={userPos} icon={userIcon} />}
              {userPos && derivedHeading != null && <Marker position={userPos} icon={headingIcon(derivedHeading)} />}

            {/* Stops */}
            {sortedStops.map((s, i) => {
              if (s.latitude == null || s.longitude == null) return null;
              const state: "next" | "done" | "future" =
                s.status === "completed" ? "done" : s.id === nextStop?.id ? "next" : "future";
              return (
                <Marker
                  key={s.id}
                  position={[Number(s.latitude), Number(s.longitude)]}
                  icon={stopIcon(i + 1, state)}
                  eventHandlers={{ click: () => setSelectedId(s.id) }}
                />
              );
            })}
          </MapContainer>
        )}

        {/* Bottom action card */}
        {allDone ? (
          <div className="absolute bottom-0 inset-x-0 z-10 p-4 bg-background border-t shadow-2xl">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-10 w-10 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-base">Rute færdig! 🎉</p>
                <p className="text-xs text-muted-foreground">
                  Alle stop udført
                  {autoReturn != null && autoReturn > 0 && ` · sender dig til oversigt om ${autoReturn}s`}
                </p>
              </div>
              <Button
                size="lg"
                onClick={() => { setAutoReturn(null); navigate("/medarbejder"); }}
                className="gap-2"
              >
                Til oversigt
              </Button>
            </div>
          </div>
        ) : nextStop && (
          <div className="absolute bottom-0 inset-x-0 z-10 bg-background border-t shadow-2xl">
            <button
              type="button"
              className="w-full flex items-center gap-2 px-4 py-2 border-b text-xs text-muted-foreground hover:bg-muted/50"
              onClick={() => setCollapsed((c) => !c)}
            >
              {collapsed ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
              <span className="flex-1 text-left">
                Næste stop {nextStopIdx + 1} af {sortedStops.length}
                {isAtNextStop && <span className="ml-2 text-primary font-semibold">· Du er fremme</span>}
              </span>
              {directions && (
                <span className="font-medium">
                  {formatKm(directions.distance_m)} · {formatMin(directions.duration_s)}
                  {etaLabel && <span className="ml-1 text-primary">→ {etaLabel}</span>}
                </span>
              )}
            </button>

            {!collapsed && (
              <div className="p-4 space-y-3">
                {!routeStarted && (
                  <Button onClick={handleStartRoute} size="lg" className="w-full gap-2">
                    <Play className="h-5 w-5" /> Start rute
                  </Button>
                )}
                {routeStarted && (
                  <div className="grid grid-cols-2 gap-2">
                    <Button onClick={() => setFollowMode(true)} variant={followMode ? "default" : "outline"} size="sm">
                      Følg live
                    </Button>
                    <Button onClick={() => setFollowMode(false)} variant={!followMode ? "default" : "outline"} size="sm">
                      Fri udforskning
                    </Button>
                  </div>
                )}
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold text-sm shrink-0">
                    {nextStopIdx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{nextStop.customer_name || "Stop"}</p>
                    {nextStop.address && (
                      <p className="text-sm text-muted-foreground flex items-start gap-1 mt-0.5">
                        <MapPin className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                        <span className="truncate">{nextStop.address}</span>
                      </p>
                    )}
                    {nextStop.service_summary && stripPrices(nextStop.service_summary) && (
                      <p className="text-sm mt-1 line-clamp-2">{stripPrices(nextStop.service_summary)}</p>
                    )}
                    {distanceToNextM != null && (
                      <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                        {distanceToNextM < 1000 ? `${Math.round(distanceToNextM)} m` : `${(distanceToNextM/1000).toFixed(1)} km`} til stoppet
                      </p>
                    )}
                    {etaLabel && (
                      <p className="text-[11px] text-primary mt-1 tabular-nums">
                        Forventet ankomst {etaLabel}
                      </p>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <Button onClick={() => handleNavigate(nextStop)} variant="outline" size="sm" className="gap-1">
                    <Navigation className="h-4 w-4" /> Naviger
                  </Button>
                  {nextStop.customer_phone ? (
                    <Button asChild variant="outline" size="sm" className="gap-1">
                      <a href={`tel:${nextStop.customer_phone}`}><Phone className="h-4 w-4" /> Ring</a>
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" disabled className="gap-1">
                      <Phone className="h-4 w-4" /> Ring
                    </Button>
                  )}
                  <Button onClick={() => setSelectedId(nextStop.id)} variant="outline" size="sm">
                    Detaljer
                  </Button>
                </div>

                <Button
                  onClick={() => handleComplete(nextStop)}
                  size="lg"
                  className={`w-full gap-2 h-14 text-base ${isAtNextStop ? "ring-4 ring-primary/50 animate-pulse" : ""}`}
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
          </div>
        )}
      </div>

      {/* Stop detail sheet */}
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
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold text-sm shrink-0 ${isDone ? "bg-green-600 text-white" : "bg-primary text-primary-foreground"}`}>
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
                    {s.service_summary && stripPrices(s.service_summary) && <p className="text-sm mt-2">{stripPrices(s.service_summary)}</p>}
                    {s.planned_arrival && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-2">
                        <Clock className="h-3 w-3" /> Planlagt {new Date(s.planned_arrival).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}
                      </p>
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
                  <Button
                    onClick={() => handleComplete(s)}
                    className="w-full gap-2"
                    size="lg"
                    disabled={updateStatus.isPending}
                  >
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

      {/* Full list sheet */}
      <Sheet open={showList} onOpenChange={setShowList}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Alle stop</SheetTitle>
            <SheetDescription>Alle dine stop på denne rute i rækkefølge.</SheetDescription>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {sortedStops.map((s, i) => {
              const isDone = s.status === "completed";
              const isNext = s.id === nextStop?.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setSelectedId(s.id); setShowList(false); }}
                  className={`w-full text-left p-3 rounded-lg border flex items-start gap-3 transition-colors hover:bg-muted ${isNext ? "border-primary bg-primary/5" : ""} ${isDone ? "opacity-60" : ""}`}
                >
                  <span className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold text-xs shrink-0 ${isDone ? "bg-green-600 text-white" : isNext ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    {isDone ? <CheckCircle2 className="h-4 w-4" /> : i + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{s.customer_name || "Stop"}</p>
                    {s.address && <p className="text-xs text-muted-foreground truncate">{s.address}</p>}
                    {s.service_summary && stripPrices(s.service_summary) && <p className="text-xs mt-1 line-clamp-1">{stripPrices(s.service_summary)}</p>}
                  </div>
                  {isNext && <Badge variant="default" className="text-[10px] shrink-0">Næste</Badge>}
                </button>
              );
            })}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default EmployeeRoute;
