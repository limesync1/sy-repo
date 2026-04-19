import { useEffect, useMemo, useState } from "react";
import { Navigate, useNavigate, useParams, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyRouteData, useDirections, useUpdateStopStatus, type RouteStop, type Route } from "@/hooks/useRoutes";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft, Navigation, Phone, CheckCircle2, MapPin, List, Clock, Loader2,
  ChevronUp, ChevronDown, Printer,
} from "lucide-react";
import { MapContainer, TileLayer, Marker, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { toast } from "sonner";
import { stripPrices } from "@/lib/employee-display";

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
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [noteDraft, setNoteDraft] = useState<Record<string, string>>({});
  const [showList, setShowList] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [userPos, setUserPos] = useState<[number, number] | null>(null);

  /* Geolocation */
  useEffect(() => {
    if (!navigator.geolocation) return;
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setUserPos([pos.coords.latitude, pos.coords.longitude]),
      () => { /* silent */ },
      { enableHighAccuracy: true, maximumAge: 30000, timeout: 10000 },
    );
    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

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

  const legLine: [number, number][] = useMemo(() => {
    if (!directions?.geometry?.coordinates) return [];
    return directions.geometry.coordinates.map(([lng, lat]) => [lat, lng] as [number, number]);
  }, [directions]);

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
      toast.success(`${s.customer_name || "Stop"} markeret som udført`);
      setSelectedId(null);
    } catch { /* */ }
  };

  const handleUndo = async (s: RouteStop) => {
    try {
      await updateStatus.mutateAsync({ id: s.id, status: "pending" });
      toast.success("Markering fortrudt");
    } catch { /* */ }
  };

  const completedCount = sortedStops.filter((s) => s.status === "completed").length;
  const allDone = sortedStops.length > 0 && completedCount === sortedStops.length;

  return (
    <div className="fixed inset-0 flex flex-col bg-background">
      {/* Top header */}
      <header className="bg-foreground text-background flex items-center gap-2 px-3 py-2 shrink-0 z-20 shadow">
        <Button
          asChild
          variant="ghost"
          size="icon"
          className="text-background hover:bg-background/10 h-9 w-9"
        >
          <Link to="/medarbejder" aria-label="Tilbage"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="font-semibold text-sm truncate">{route.name || "Rute"}</h1>
          <p className="text-[11px] opacity-80 truncate">
            {completedCount}/{sortedStops.length} færdige
            {directions && nextStop && ` · ${formatMin(directions.duration_s)} til næste`}
          </p>
        </div>
        <Button
          asChild
          size="sm"
          variant="ghost"
          className="text-background hover:bg-background/10 h-9 w-9 p-0"
          aria-label="Udskriv liste"
        >
          <Link to={`/medarbejder/rute/${route.id}/print`}><Printer className="h-4 w-4" /></Link>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="text-background hover:bg-background/10 h-9 w-9 p-0"
          onClick={() => setShowList(true)}
          aria-label="Vis liste"
        >
          <List className="h-4 w-4" />
        </Button>
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

            {/* Start marker */}
            {startCoord && <Marker position={startCoord} icon={startIcon} />}

            {/* Active leg polyline */}
            {legLine.length > 1 && (
              <Polyline
                positions={legLine}
                pathOptions={{ color: "hsl(184 90% 42%)", weight: 6, opacity: 0.85 }}
              />
            )}

            {/* User position */}
            {userPos && <Marker position={userPos} icon={userIcon} />}

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
              <CheckCircle2 className="h-8 w-8 text-primary" />
              <div className="flex-1">
                <p className="font-semibold">Rute færdig! 🎉</p>
                <p className="text-xs text-muted-foreground">Alle stop er markeret som udført.</p>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/medarbejder">Tilbage</Link>
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
              </span>
              {directions && (
                <span className="font-medium">
                  {formatKm(directions.distance_m)} · {formatMin(directions.duration_s)}
                </span>
              )}
            </button>

            {!collapsed && (
              <div className="p-4 space-y-3">
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
                  className="w-full gap-2"
                  disabled={updateStatus.isPending}
                >
                  {updateStatus.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="h-5 w-5" />
                  )}
                  Markér som udført
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
