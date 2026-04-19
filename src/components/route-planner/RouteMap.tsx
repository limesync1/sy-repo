import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, ScaleControl, ZoomControl, LayersControl } from "react-leaflet";
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

  // Build a stable signature per route from its coordinates
  const signatures = useMemo(
    () =>
      routes.map((r) => ({
        sig: r.stops.map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join("|"),
        color: r.color,
        stops: r.stops,
      })),
    [routes],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = new Map(geometries);
      let changed = false;

      for (const { sig, stops } of signatures) {
        if (!sig || stops.length < 2) continue;
        if (next.has(sig)) continue;

        try {
          const { data, error } = await supabase.functions.invoke("route-directions", {
            body: { waypoints: stops.map((s) => ({ lat: s.lat, lng: s.lng })) },
          });
          if (cancelled) return;
          if (!error && data?.geometry?.coordinates) {
            const coords: [number, number][] = data.geometry.coordinates.map(
              ([lng, lat]: [number, number]) => [lat, lng],
            );
            next.set(sig, coords);
            changed = true;
          } else {
            // Fallback to straight line
            next.set(sig, stops.map((s) => [s.lat, s.lng] as [number, number]));
            changed = true;
          }
        } catch {
          next.set(sig, stops.map((s) => [s.lat, s.lng] as [number, number]));
          changed = true;
        }
      }
      if (changed && !cancelled) setGeometries(next);
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

const RouteMap = ({ routes, unassigned = [], height = "100%", selectedStopId, onStopClick }: Props) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const allPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    for (const r of routes) for (const s of r.stops) pts.push([s.lat, s.lng]);
    for (const s of unassigned) pts.push([s.lat, s.lng]);
    return pts;
  }, [routes, unassigned]);

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
    <div ref={containerRef} style={{ height, width: "100%" }} className="relative rounded-lg overflow-hidden bg-background">
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
              attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/voyager/{z}/{x}/{y}{r}.png"
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
          const sig = r.stops.map((s) => `${s.lat.toFixed(5)},${s.lng.toFixed(5)}`).join("|");
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
          <Polyline positions={positions} pathOptions={{ color: "#ffffff", weight: 8, opacity: 0.9 }} />
          <Polyline positions={positions} pathOptions={{ color: route.color, weight: 5, opacity: 0.95, lineCap: "round", lineJoin: "round" }} />
        </>
      )}
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
