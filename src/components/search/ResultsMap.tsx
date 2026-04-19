import { useEffect, useMemo, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import "leaflet.markercluster";
import { Link } from "react-router-dom";
import { Star, ShieldCheck, Navigation, Phone, Building2 } from "lucide-react";
import { lookupDkZip } from "@/lib/dk-postcodes";

// Force Leaflet to recompute its size once it mounts inside a flex/grid parent —
// otherwise the tile layer can render blank or only the top-left tile on mobile.
const InvalidateOnMount = () => {
  const map = useMap();
  useEffect(() => {
    const t = setTimeout(() => map.invalidateSize(), 100);
    const onResize = () => map.invalidateSize();
    window.addEventListener("resize", onResize);
    window.addEventListener("orientationchange", onResize);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("orientationchange", onResize);
    };
  }, [map]);
  return null;
};

interface Props {
  businesses: any[];
  userPoint: { lat: number; lng: number } | null;
  radiusKm: number | null;
  highlightedId?: string | null;
  onMarkerHover?: (id: string | null) => void;
}

// Pin builder — accent (default) or foreground (highlighted) state.
const buildPin = (highlighted = false) =>
  L.divIcon({
    className: "",
    html: `<div style="
      width: ${highlighted ? 34 : 28}px; height: ${highlighted ? 34 : 28}px;
      background: ${highlighted ? "hsl(222 47% 11%)" : "hsl(184 90% 42%)"};
      border: 3px solid white;
      border-radius: 50% 50% 50% 0;
      transform: rotate(-45deg);
      box-shadow: 0 ${highlighted ? 4 : 2}px ${highlighted ? 14 : 8}px rgba(0,0,0,${highlighted ? 0.35 : 0.25});
      transition: all 0.15s ease;
    "></div>`,
    iconSize: [highlighted ? 34 : 28, highlighted ? 34 : 28],
    iconAnchor: [highlighted ? 17 : 14, highlighted ? 34 : 28],
    popupAnchor: [0, highlighted ? -34 : -28],
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

// Re-fit bounds when businesses or userPoint change.
const FitBounds = ({ points }: { points: { lat: number; lng: number }[] }) => {
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

// Custom-styled cluster icon matching the design tokens.
const clusterIconCreator = (cluster: any) => {
  const count = cluster.getChildCount();
  const size = count < 10 ? 36 : count < 50 ? 42 : 50;
  return L.divIcon({
    html: `<div style="
      display:flex;align-items:center;justify-content:center;
      width:${size}px;height:${size}px;
      background: hsl(184 90% 42%);
      color: white;
      border: 3px solid white;
      border-radius: 50%;
      box-shadow: 0 4px 14px rgba(0,0,0,0.25);
      font-weight: 700;
      font-size: ${size >= 50 ? 15 : 13}px;
      font-family: ui-sans-serif, system-ui, sans-serif;
    ">${count}</div>`,
    className: "",
    iconSize: L.point(size, size),
  });
};

// Cluster layer rendered imperatively because react-leaflet has no first-class
// component for leaflet.markercluster. Markers are rebuilt only when the input
// list changes; highlight changes update existing marker icons in place so an
// open popup is not destroyed.
const ClusterLayer = ({
  markers,
  highlightedId,
  onMarkerHover,
}: {
  markers: any[];
  highlightedId?: string | null;
  onMarkerHover?: (id: string | null) => void;
}) => {
  const map = useMap();
  const clusterRef = useRef<any>(null);
  const markerByIdRef = useRef<Map<string, L.Marker>>(new Map());
  const hoverHandlerRef = useRef(onMarkerHover);

  // Keep latest hover handler reachable from event listeners without rebuilding markers.
  useEffect(() => {
    hoverHandlerRef.current = onMarkerHover;
  }, [onMarkerHover]);

  useEffect(() => {
    // @ts-ignore — markerClusterGroup added by leaflet.markercluster plugin.
    const cluster = L.markerClusterGroup({
      showCoverageOnHover: false,
      spiderfyOnMaxZoom: true,
      maxClusterRadius: 50,
      iconCreateFunction: clusterIconCreator,
    });
    clusterRef.current = cluster;
    map.addLayer(cluster);
    return () => {
      map.removeLayer(cluster);
      clusterRef.current = null;
      markerByIdRef.current.clear();
    };
  }, [map]);

  // Build markers only when the underlying list changes — NOT on hover/highlight,
  // otherwise the open popup would be destroyed when the user moves the mouse.
  useEffect(() => {
    const cluster = clusterRef.current;
    if (!cluster) return;
    cluster.clearLayers();
    markerByIdRef.current.clear();

    markers.forEach((b) => {
      const marker = L.marker([b._point.lat, b._point.lng], {
        icon: buildPin(false),
      });

      // Build rich popup HTML — kept inside the leaflet popup so it survives
      // re-renders driven by other state.
      const cats: string[] = Array.isArray(b.categories) && b.categories.length
        ? b.categories
        : b.category ? [b.category] : [];
      const primaryCat = cats[0];
      const cnt = b._reviewCount || 0;
      const avg = b._avgRating || 0;

      const cover = b.cover_image_url
        ? `<div style="position:relative;height:130px;width:100%;overflow:hidden;background:hsl(210 40% 96%);">
             <img src="${b.cover_image_url}" alt="" style="width:100%;height:100%;object-fit:cover;display:block;" />
             ${b.is_verified ? `<div style="position:absolute;top:8px;left:8px;display:inline-flex;align-items:center;gap:4px;background:rgba(255,255,255,0.95);color:hsl(222 47% 11%);padding:3px 8px;border-radius:999px;font-size:10px;font-weight:600;backdrop-filter:blur(4px);">✓ Verificeret</div>` : ""}
           </div>`
        : `<div style="height:80px;width:100%;background:linear-gradient(135deg, hsl(210 40% 96%), hsl(210 40% 92%));display:flex;align-items:center;justify-content:center;">
             <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="hsl(215 16% 47% / 0.3)" stroke-width="2"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v8h4"/><path d="M18 9h2a2 2 0 0 1 2 2v11h-4"/></svg>
           </div>`;

      const logo = b.logo_url
        ? `<img src="${b.logo_url}" alt="" style="width:44px;height:44px;border-radius:10px;object-fit:contain;background:white;border:2px solid white;box-shadow:0 1px 3px rgba(0,0,0,0.15);padding:2px;flex-shrink:0;" />`
        : "";

      const ratingHtml = cnt > 0
        ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:12px;color:hsl(222 47% 11%);font-weight:600;">
             <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
             ${avg.toFixed(1)} <span style="color:hsl(215 16% 47%);font-weight:400;">(${cnt})</span>
           </span>`
        : `<span style="font-size:11px;color:hsl(215 16% 47%);font-weight:500;">Ny på platformen</span>`;

      const distHtml = typeof b._distanceKm === "number"
        ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:11px;color:hsl(184 90% 30%);background:hsl(184 90% 42% / 0.1);padding:2px 8px;border-radius:999px;font-weight:600;">
             ${b._distanceKm < 1 ? "<1" : Math.round(b._distanceKm)} km væk
           </span>`
        : "";

      const catHtml = primaryCat
        ? `<span style="display:inline-block;background:hsl(184 90% 42% / 0.1);color:hsl(184 90% 30%);padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600;margin-right:4px;">${primaryCat}</span>`
        : "";

      const phoneBtn = b.phone
        ? `<a href="tel:${b.phone}" style="display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:10px 12px;border:1px solid hsl(214 32% 91%);border-radius:10px;color:hsl(222 47% 11%);font-size:13px;font-weight:600;text-decoration:none;background:white;flex-shrink:0;min-height:40px;min-width:44px;" onclick="event.stopPropagation()">
             <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>
           </a>`
        : "";

      const html = `
        <div style="width:260px;font-family:ui-sans-serif,system-ui,sans-serif;">
          ${cover}
          <div style="padding:12px 14px 14px;">
            <div style="display:flex;align-items:flex-start;gap:10px;">
              ${logo}
              <div style="flex:1;min-width:0;">
                <a href="/b/${b.slug}" data-popup-link style="font-weight:700;font-size:15px;color:hsl(222 47% 11%);text-decoration:none;line-height:1.25;display:block;margin-bottom:2px;">${b.name}</a>
                ${b.city ? `<div style="font-size:12px;color:hsl(215 16% 47%);">${b.zip_code || ""} ${b.city}</div>` : ""}
              </div>
            </div>
            <div style="margin-top:10px;display:flex;flex-wrap:wrap;align-items:center;gap:6px;">
              ${catHtml}${ratingHtml}
            </div>
            ${distHtml ? `<div style="margin-top:6px;">${distHtml}</div>` : ""}
            <div style="margin-top:12px;display:flex;gap:6px;">
              <a href="/b/${b.slug}" data-popup-link style="flex:1;display:inline-flex;align-items:center;justify-content:center;gap:4px;padding:10px 12px;background:hsl(222 47% 11%);color:white;border-radius:10px;font-size:13px;font-weight:600;text-decoration:none;min-height:40px;">
                Se virksomhed →
              </a>
              ${phoneBtn}
            </div>
          </div>
        </div>
      `;

      marker.bindPopup(html, {
        maxWidth: 280,
        minWidth: 260,
        className: "rich-business-popup",
        closeButton: true,
        // Keep popup open until user explicitly closes it — better on mobile
        // where stray taps elsewhere on the map are common.
        autoClose: false,
        closeOnClick: false,
        // Pan the map so the popup is fully visible — critical on mobile.
        autoPan: true,
        autoPanPadding: L.point(20, 20),
        keepInView: true,
      });

      // Hover sync — desktop only. We use refs so listeners stay stable and
      // marker rebuilds aren't triggered by hover-state changes in parent.
      marker.on("mouseover", () => hoverHandlerRef.current?.(b.id));
      marker.on("mouseout", () => hoverHandlerRef.current?.(null));

      // Intercept popup link clicks so SPA navigation works (popups live outside React tree).
      marker.on("popupopen", (e: any) => {
        const el: HTMLElement = e.popup.getElement();
        el?.querySelectorAll("[data-popup-link]").forEach((a) => {
          a.addEventListener("click", (ev) => {
            ev.preventDefault();
            const href = (a as HTMLAnchorElement).getAttribute("href");
            if (href) window.history.pushState({}, "", href);
            window.dispatchEvent(new PopStateEvent("popstate"));
          });
        });
      });

      markerByIdRef.current.set(b.id, marker);
      cluster.addLayer(marker);
    });
  }, [markers]);

  // Highlight changes update icons in place — preserves any open popup.
  useEffect(() => {
    markerByIdRef.current.forEach((marker, id) => {
      const isHi = id === highlightedId;
      marker.setIcon(buildPin(isHi));
      marker.setZIndexOffset(isHi ? 1000 : 0);
    });
  }, [highlightedId]);

  return null;
};

const ResultsMap = ({ businesses, userPoint, radiusKm, highlightedId, onMarkerHover }: Props) => {
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

  const center: [number, number] = userPoint
    ? [userPoint.lat, userPoint.lng]
    : markers[0]
    ? [markers[0]._point.lat, markers[0]._point.lng]
    : [56.0, 11.5];

  if (markers.length === 0 && !userPoint) {
    return (
      <div className="flex h-[300px] items-center justify-center rounded-2xl border border-dashed border-border bg-card/50 text-center sm:h-[420px]">
        <div className="px-6">
          <p className="text-sm font-semibold text-foreground">Kortet kan ikke vises</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Ingen af resultaterne har et postnummer vi kan placere på kortet.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
      <MapContainer
        center={center}
        zoom={9}
        className="h-[60vh] min-h-[320px] w-full sm:h-[520px]"
        scrollWheelZoom={false}
      >
        <InvalidateOnMount />
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

        <ClusterLayer
          markers={markers}
          highlightedId={highlightedId}
          onMarkerHover={onMarkerHover}
        />
      </MapContainer>
    </div>
  );
};

export default ResultsMap;
