import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip, useMap, ScaleControl, ZoomControl, LayersControl } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Locate, Maximize2, Minimize2 } from "lucide-react";

// Fix default marker icons
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";

L.Marker.prototype.options.icon = L.icon({
  iconUrl,
  shadowUrl: iconShadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
});

export type MapStop = {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  sublabel?: string;
  color?: string;
  index?: number;
  /** Distance til næste stop i km (vises i hover-tooltip på linjen efter dette stop). */
  distanceToNextKm?: number | null;
  /** Køretid til næste stop i minutter (vises i hover-tooltip). */
  travelTimeToNextMin?: number | null;
};

export type MapRoute = {
  color: string;
  stops: MapStop[];
};

type Props = {
  routes: MapRoute[];
  unassigned?: MapStop[];
  height?: string;
  selectedStopId?: string | null;
  onStopClick?: (stopId: string) => void;
  livePositions?: Array<{ employeeId: string; lat: number; lng: number; label: string; currentStopLabel?: string; recordedAt: string }>;
};

const FitBounds = ({ points, trigger }: { points: [number, number][]; trigger: number }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13, { animate: true });
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [60, 60], maxZoom: 14, animate: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);
  return null;
};

const FlyToSelected = ({ stop }: { stop: MapStop | null }) => {
  const map = useMap();
  useEffect(() => {
    if (!stop) return;
    map.flyTo([stop.lat, stop.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [stop?.id]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
};

const numberedIcon = (n: number, color: string, selected = false) =>
  L.divIcon({
    className: "route-pin",
    html: `<div style="background:${color};color:white;width:${selected ? 36 : 30}px;height:${selected ? 36 : 30}px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:${selected ? 3 : 2}px solid white;box-shadow:0 ${selected ? 4 : 2}px ${selected ? 12 : 6}px rgba(0,0,0,${selected ? 0.5 : 0.3});font-weight:600;font-size:13px;${selected ? "outline:3px solid rgba(0,0,0,.15);" : ""}"><span style="transform:rotate(45deg);">${n}</span></div>`,
    iconSize: [selected ? 36 : 30, selected ? 36 : 30],
    iconAnchor: [selected ? 18 : 15, selected ? 36 : 30],
    popupAnchor: [0, -30],
  });

const dotIcon = (color: string) =>
  L.divIcon({
    className: "route-dot",
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

/* ─── Driving directions via edge function (cached per route signature) ─── */
const useRouteGeometries = (routes: MapRoute[]) => {
  const [geometries, setGeometries] = useState<Map<string, [number, number][]>>(new Map());

  // Build a stable signature per route from its color + ordered coordinates.
  // Including color prevents two different routes that happen to share stops
  // from polluting each other's cache entry.
  const signatures = useMemo(
    () =>
      routes.map((r) => ({
        sig:
          r.color +
          "::" +
          r.stops.map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join("|"),
        color: r.color,
        stops: r.stops,
      })),
    [routes],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // Process routes one by one and commit each into state immediately so
      // that parallel calls (multiple routes on screen) cannot overwrite
      // each other via a stale `next` snapshot.
      for (const { sig, stops } of signatures) {
        if (!sig || stops.length < 2) continue;
        // Use a functional check to avoid stale-state reads
        let alreadyCached = false;
        setGeometries((prev) => {
          if (prev.has(sig)) alreadyCached = true;
          return prev;
        });
        if (alreadyCached) continue;

        // Del lange ruter i mindre forespørgsler og sy geometrien sammen,
        // så den offentlige, nøglefri rutetjeneste ikke overbelastes.
        const CHUNK = 25;
        const chunks: typeof stops[] = [];
        if (stops.length <= CHUNK) {
          chunks.push(stops);
        } else {
          for (let i = 0; i < stops.length - 1; i += CHUNK - 1) {
            chunks.push(stops.slice(i, i + CHUNK));
          }
        }

        const merged: [number, number][] = [];
        let anyOk = false;
        for (const chunk of chunks) {
          try {
            const { data, error } = await supabase.functions.invoke("route-directions", {
              body: { waypoints: chunk.map((s) => ({ lat: s.lat, lng: s.lng })) },
            });
            if (cancelled) return;
            if (!error && data?.geometry?.coordinates?.length) {
              const coords: [number, number][] = data.geometry.coordinates.map(
                ([lng, lat]: [number, number]) => [lat, lng],
              );
              // Undgå dublet-punkt mellem to chunks
              if (merged.length > 0 && coords.length > 0) coords.shift();
              merged.push(...coords);
              anyOk = true;
            } else {
              // Per-chunk fallback: lige linjer kun mellem dette chunks stops,
              // så ruten stadig er kontinuerlig.
              const fallback = chunk.map((s) => [s.lat, s.lng] as [number, number]);
              if (merged.length > 0 && fallback.length > 0) fallback.shift();
              merged.push(...fallback);
            }
          } catch {
            const fallback = chunk.map((s) => [s.lat, s.lng] as [number, number]);
            if (merged.length > 0 && fallback.length > 0) fallback.shift();
            merged.push(...fallback);
          }
        }

        if (cancelled) return;
        if (merged.length > 1) {
          setGeometries((prev) => {
            if (prev.has(sig)) return prev;
            const next = new Map(prev);
            next.set(sig, merged);
            return next;
          });
        }
        // Hvis intet lykkedes overhovedet, lad RouteLayer falde tilbage til
        // sin egen lige-linje rendering (der altid er kontinuerlig).
        void anyOk;
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signatures.map((s) => s.sig).join("§")]);

  return (sig: string) => geometries.get(sig);
};

/* ─── Floating controls (locate, fullscreen) ─── */
const FloatingControls = ({ onFullscreen, isFullscreen }: { onFullscreen: () => void; isFullscreen: boolean }) => {
  const map = useMap();
  const handleLocate = () => {
    map.locate({ setView: true, maxZoom: 14 });
  };
  return (
    <div className="absolute right-3 top-3 z-[400] flex flex-col gap-1.5">
      <Button
        size="icon"
        variant="secondary"
        className="h-9 w-9 shadow-md bg-background hover:bg-secondary"
        onClick={handleLocate}
        aria-label="Min position"
        title="Min position"
      >
        <Locate className="h-4 w-4" />
      </Button>
      <Button
        size="icon"
        variant="secondary"
        className="h-9 w-9 shadow-md bg-background hover:bg-secondary"
        onClick={onFullscreen}
        aria-label={isFullscreen ? "Forlad fuldskærm" : "Fuldskærm"}
        title={isFullscreen ? "Forlad fuldskærm" : "Fuldskærm"}
      >
        {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
      </Button>
    </div>
  );
};

const InvalidateOnResize = ({ trigger }: { trigger: any }) => {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 220);
    return () => clearTimeout(t);
  }, [trigger, map]);
  return null;
};

const livePositionIcon = L.divIcon({
  className: "route-live-position",
  html: '<div class="route-live-position__pulse"><div class="route-live-position__dot"></div></div>',
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const RouteMap = ({ routes, unassigned = [], height = "100%", selectedStopId, onStopClick, livePositions = [] }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const allPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    for (const r of routes) for (const s of r.stops) pts.push([s.lat, s.lng]);
    for (const s of unassigned) pts.push([s.lat, s.lng]);
    for (const position of livePositions) pts.push([position.lat, position.lng]);
    return pts;
  }, [routes, unassigned, livePositions]);

  // Find selected stop across all routes
  const selectedStop = useMemo<MapStop | null>(() => {
    if (!selectedStopId) return null;
    for (const r of routes) {
      const s = r.stops.find((st) => st.id === selectedStopId);
      if (s) return s;
    }
    return unassigned.find((s) => s.id === selectedStopId) || null;
  }, [selectedStopId, routes, unassigned]);

  const center: [number, number] = allPoints[0] || [56.0, 10.5];
  const fitTrigger = useMemo(() => allPoints.length, [allPoints]);

  const getGeom = useRouteGeometries(routes);

  const handleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (!isFullscreen) {
      if (el.requestFullscreen) el.requestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  return (
    <div ref={containerRef} style={{ height, width: "100%" }} className="planner-route-map relative rounded-lg overflow-hidden border border-border bg-background">
      <MapContainer
        center={center}
        zoom={7}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
        zoomControl={false}
        preferCanvas
        worldCopyJump
      >
        <LayersControl position="bottomright">
          <LayersControl.BaseLayer checked name="Kort">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap-bidragydere</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={20}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Satellit">
            <TileLayer
              attribution="Tiles &copy; Esri"
              url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
          <LayersControl.BaseLayer name="Standard">
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          </LayersControl.BaseLayer>
        </LayersControl>

        <ZoomControl position="bottomleft" />
        <ScaleControl position="bottomleft" imperial={false} />
        <FitBounds points={allPoints} trigger={fitTrigger} />
        <FlyToSelected stop={selectedStop} />
        <InvalidateOnResize trigger={`${routes.length}-${unassigned.length}-${isFullscreen}`} />
        <FloatingControls onFullscreen={handleFullscreen} isFullscreen={isFullscreen} />

        {/* Route polylines (driving) + numbered pins */}
        {routes.map((r, ri) => {
          const sig =
            r.color +
            "::" +
            r.stops.map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join("|");
          const geom = getGeom(sig);
          return (
            <RouteLayer
              key={ri}
              route={r}
              geom={geom}
              selectedStopId={selectedStopId}
              onStopClick={onStopClick}
            />
          );
        })}

        {/* Unassigned (dots only) */}
        {unassigned.map((s) => (
          <Marker
            key={`u-${s.id}`}
            position={[s.lat, s.lng]}
            icon={dotIcon(s.color || "hsl(220 13% 50%)")}
            eventHandlers={onStopClick ? { click: () => onStopClick(s.id) } : undefined}
          >
            <Popup closeButton={false}>
              <strong>{s.label || "Ikke tildelt"}</strong>
              {s.sublabel && <div className="text-xs text-muted-foreground">{s.sublabel}</div>}
            </Popup>
          </Marker>
        ))}
        {livePositions.map((position) => (
          <Marker key={`live-${position.employeeId}`} position={[position.lat, position.lng]} icon={livePositionIcon} zIndexOffset={1800}>
            <Popup closeButton={false}>
              <strong>{position.label}</strong>
              <div className="text-xs text-muted-foreground">{position.currentStopLabel ? `Ved ${position.currentStopLabel}` : "På aktiv rute"}</div>
              <div className="text-xs text-muted-foreground">Opdateret {new Date(position.recordedAt).toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })}</div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

const RouteLayer = ({
  route, geom, selectedStopId, onStopClick,
}: {
  route: MapRoute;
  geom?: [number, number][];
  selectedStopId?: string | null;
  onStopClick?: (id: string) => void;
}) => {
  const positions = geom && geom.length > 1
    ? geom
    : route.stops.map((s) => [s.lat, s.lng] as [number, number]);
  return (
    <>
      {positions.length > 1 && (
        <>
          {/* Casing for contrast */}
          <Polyline positions={positions} pathOptions={{ color: "hsl(var(--background))", weight: 8, opacity: 0.9 }} />
          <Polyline positions={positions} pathOptions={{ color: route.color, weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }} />
        </>
      )}
      {/* Usynlige ben-linjer (straight-line) ovenpå — bruges kun til hover-tooltip
          pr. segment, fordi den fulde geometri ikke kan deles op uden waypoints. */}
      {route.stops.length > 1 && route.stops.slice(0, -1).map((s, i) => {
        const next = route.stops[i + 1];
        const km = s.distanceToNextKm;
        const min = s.travelTimeToNextMin;
        if (km == null && min == null) return null;
        const tooltipLines: string[] = [];
        if (km != null) tooltipLines.push(`${km.toFixed(1)} km`);
        if (min != null) tooltipLines.push(`${min} min`);
        return (
          <Polyline
            key={`leg-${s.id}`}
            positions={[[s.lat, s.lng], [next.lat, next.lng]]}
            pathOptions={{ color: route.color, weight: 18, opacity: 0 }}
          >
            <Tooltip sticky direction="top" opacity={1}>
              <span className="text-xs font-medium">{tooltipLines.join(" · ")}</span>
            </Tooltip>
          </Polyline>
        );
      })}
      {route.stops.map((s, i) => {
        const isSelected = selectedStopId === s.id;
        return (
          <Marker
            key={s.id}
            position={[s.lat, s.lng]}
            icon={numberedIcon(s.index ?? i + 1, route.color, isSelected)}
            eventHandlers={onStopClick ? { click: () => onStopClick(s.id) } : undefined}
            opacity={selectedStopId && !isSelected ? 0.55 : 1}
            zIndexOffset={isSelected ? 1000 : 0}
          >
            <Popup closeButton={false}>
              <strong>{s.label}</strong>
              {s.sublabel && <div className="text-xs text-muted-foreground">{s.sublabel}</div>}
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

export default RouteMap;
