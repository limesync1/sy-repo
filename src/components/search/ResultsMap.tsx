import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { lookupDkZip } from "@/lib/dk-postcodes";

interface Props {
  businesses: any[];
  userPoint: { lat: number; lng: number } | null;
  radiusKm: number | null;
}

// Custom teal pin matching the design tokens
const pinIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 28px; height: 28px;
    background: hsl(184 90% 42%);
    border: 3px solid white;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  "></div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 28],
  popupAnchor: [0, -28],
});

const userIcon = L.divIcon({
  className: "",
  html: `<div style="
    width: 18px; height: 18px;
    background: hsl(222 47% 11%);
    border: 3px solid white;
    border-radius: 50%;
    box-shadow: 0 0 0 4px hsl(184 90% 42% / 0.25);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

// Re-fit bounds when businesses or userPoint change
const FitBounds = ({
  points,
}: {
  points: { lat: number; lng: number }[];
}) => {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView([points[0].lat, points[0].lng], 11);
      return;
    }
    const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
  }, [points, map]);
  return null;
};

const ResultsMap = ({ businesses, userPoint, radiusKm }: Props) => {
  const markers = useMemo(() => {
    return businesses
      .map((b) => {
        const p = lookupDkZip(b.zip_code);
        if (!p) return null;
        return { ...b, _point: p };
      })
      .filter(Boolean) as any[];
  }, [businesses]);

  const allPoints = useMemo(() => {
    const pts = markers.map((m) => m._point);
    if (userPoint) pts.push(userPoint);
    return pts;
  }, [markers, userPoint]);

  // Default to centre of Denmark if no points
  const center: [number, number] = userPoint
    ? [userPoint.lat, userPoint.lng]
    : markers[0]
    ? [markers[0]._point.lat, markers[0]._point.lng]
    : [56.0, 11.5];

  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
      <MapContainer
        center={center}
        zoom={9}
        style={{ height: "380px", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={allPoints} />

        {userPoint && radiusKm !== null && (
          <Circle
            center={[userPoint.lat, userPoint.lng]}
            radius={radiusKm * 1000}
            pathOptions={{
              color: "hsl(184 90% 42%)",
              fillColor: "hsl(184 90% 42%)",
              fillOpacity: 0.08,
              weight: 1.5,
            }}
          />
        )}

        {userPoint && (
          <Marker position={[userPoint.lat, userPoint.lng]} icon={userIcon}>
            <Popup>Din lokation</Popup>
          </Marker>
        )}

        {markers.map((b) => (
          <Marker key={b.id} position={[b._point.lat, b._point.lng]} icon={pinIcon}>
            <Popup>
              <div className="min-w-[180px]">
                <Link to={`/b/${b.slug}`} className="font-semibold text-foreground hover:text-accent">
                  {b.name}
                </Link>
                {b.city && (
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {b.zip_code} {b.city}
                  </div>
                )}
                <div className="mt-1 flex items-center gap-2 text-xs">
                  {b._reviewCount > 0 && (
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-3 w-3 fill-foreground text-foreground" />
                      <span className="font-medium">{b._avgRating.toFixed(1)}</span>
                      <span className="text-muted-foreground">({b._reviewCount})</span>
                    </span>
                  )}
                  {typeof b._distanceKm === "number" && (
                    <span className="font-medium text-accent">
                      {b._distanceKm < 1 ? "<1" : Math.round(b._distanceKm)} km væk
                    </span>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
};

export default ResultsMap;
