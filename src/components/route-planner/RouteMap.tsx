import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icons — Vite doesn't pick up default leaflet icon URLs
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

const FitBounds = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
    } else {
      map.fitBounds(L.latLngBounds(points), { padding: [40, 40], maxZoom: 14 });
    }
  }, [map, points]);
  return null;
};

const numberedIcon = (n: number, color: string) =>
  L.divIcon({
    className: "route-pin",
    html: `<div style="background:${color};color:white;width:30px;height:30px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,.3);font-weight:600;font-size:13px;"><span style="transform:rotate(45deg);">${n}</span></div>`,
    iconSize: [30, 30],
    iconAnchor: [15, 30],
    popupAnchor: [0, -30],
  });

const dotIcon = (color: string) =>
  L.divIcon({
    className: "route-dot",
    html: `<div style="background:${color};width:14px;height:14px;border-radius:50%;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,.4);"></div>`,
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });

const RouteMap = ({ routes, unassigned = [], height = "100%", selectedStopId, onStopClick }: Props) => {
  const allPoints = useMemo<[number, number][]>(() => {
    const pts: [number, number][] = [];
    for (const r of routes) for (const s of r.stops) pts.push([s.lat, s.lng]);
    for (const s of unassigned) pts.push([s.lat, s.lng]);
    return pts;
  }, [routes, unassigned]);

  const center: [number, number] = allPoints[0] || [56.0, 10.5]; // DK center

  return (
    <div style={{ height, width: "100%" }} className="rounded-lg overflow-hidden">
      <MapContainer center={center} zoom={7} style={{ height: "100%", width: "100%" }} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={allPoints} />

        {/* Route polylines + numbered pins */}
        {routes.map((r, ri) => (
          <RouteLayer key={ri} route={r} selectedStopId={selectedStopId} onStopClick={onStopClick} />
        ))}

        {/* Unassigned (dots only) */}
        {unassigned.map((s) => (
          <Marker
            key={`u-${s.id}`}
            position={[s.lat, s.lng]}
            icon={dotIcon(s.color || "hsl(220 13% 50%)")}
            eventHandlers={onStopClick ? { click: () => onStopClick(s.id) } : undefined}
          >
            <Popup>
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
  route, selectedStopId, onStopClick,
}: { route: MapRoute; selectedStopId?: string | null; onStopClick?: (id: string) => void }) => {
  const positions = route.stops.map((s) => [s.lat, s.lng] as [number, number]);
  return (
    <>
      {positions.length > 1 && (
        <Polyline positions={positions} pathOptions={{ color: route.color, weight: 4, opacity: 0.7 }} />
      )}
      {route.stops.map((s, i) => (
        <Marker
          key={s.id}
          position={[s.lat, s.lng]}
          icon={numberedIcon(s.index ?? i + 1, route.color)}
          eventHandlers={onStopClick ? { click: () => onStopClick(s.id) } : undefined}
          opacity={selectedStopId && selectedStopId !== s.id ? 0.6 : 1}
        >
          <Popup>
            <strong>{s.label}</strong>
            {s.sublabel && <div className="text-xs text-muted-foreground">{s.sublabel}</div>}
          </Popup>
        </Marker>
      ))}
    </>
  );
};

export default RouteMap;
