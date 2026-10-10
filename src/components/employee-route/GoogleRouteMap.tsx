/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { Crosshair, Layers, TrafficCone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadGoogleMaps, onGoogleMapsAuthFailure, GoogleMapsLoadError } from "@/lib/google-maps-loader";
import { resolveMapColor } from "@/components/employee-route/RouteMapLine";
import { navigationZoom } from "@/components/employee-route/camera-policy";
import { haversineMeters } from "@/lib/geo-distance";
import type { MotionTrack } from "@/components/employee-route/motionTrack";

export type GoogleStopState = "next" | "done" | "future";
export interface GoogleRouteStop { id: string; n: number; pos: [number, number]; state: GoogleStopState; highlighted: boolean }

interface Props {
  stops: GoogleRouteStop[];
  start: [number, number] | null;
  overview: [number, number][];
  previewLine: [number, number][];
  legLine: [number, number][];
  /** Straight hint to the next stop when road geometry is missing, or arrival link. */
  hintLine: { points: [number, number][]; kind: "direction" | "arrival" } | null;
  userPos: [number, number] | null;
  routeStarted: boolean;
  moving: boolean;
  track: MotionTrack;
  speedMps: number;
  followActive: boolean;
  fitEnabled: boolean;
  flyTo: [number, number] | null;
  night: boolean;
  onInteract: () => void;
  onRecenter: () => void;
  onSelectStop: (id: string) => void;
  onFailure: (err: GoogleMapsLoadError) => void;
}

const PREFS_KEY = "serviceydere:gmaps-prefs";
const readPrefs = (): { traffic: boolean; satellite: boolean } => {
  try { return { traffic: false, satellite: false, ...JSON.parse(localStorage.getItem(PREFS_KEY) ?? "{}") }; } catch { return { traffic: false, satellite: false }; }
};

const ll = (p: [number, number]) => ({ lat: p[0], lng: p[1] });

/** SVG pin matching the Leaflet pins: numbered / check for done / navigation arrow for start. */
function pinIcon(label: string, state: GoogleStopState | "start", highlighted: boolean): google.maps.Icon {
  const accent = resolveMapColor("--accent", "hsl(184 90% 42%)");
  const success = resolveMapColor("--success", "hsl(142 71% 38%)");
  const fg = resolveMapColor("--foreground", "hsl(222 47% 11%)");
  const card = resolveMapColor("--card", "hsl(0 0% 100%)");
  const fill = state === "done" ? success : state === "start" ? fg : state === "next" ? accent : card;
  const stroke = state === "future" ? accent : card;
  const text = state === "future" ? accent : card;
  const ring = highlighted || state === "next" ? `<circle cx="22" cy="20" r="19" fill="none" stroke="${accent}" stroke-opacity="0.3" stroke-width="4"/>` : "";
  const inner = state === "done"
    ? `<path d="m15 20 5 5 9-10" fill="none" stroke="${text}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>`
    : state === "start"
      ? `<path d="M14 19l16-8-8 16-2-6z" fill="${text}"/>`
      : `<text x="22" y="25" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="${text}">${label}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">${ring}<path d="M22 52c-1-6-15-15-15-31a15 15 0 0 1 30 0c0 16-14 25-15 31z" fill="${fill}" stroke="${stroke}" stroke-width="2.5" opacity="${state === "done" ? 0.85 : 1}"/>${inner}</svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(44, 54),
    anchor: new google.maps.Point(22, 52),
  };
}

/** Dark style derived from theme tokens; works without a cloud map ID. */
function nightStyles(): google.maps.MapTypeStyle[] {
  const bg = resolveMapColor("--background", "hsl(222 47% 8%)");
  const muted = resolveMapColor("--muted", "hsl(217 33% 17%)");
  const mutedFg = resolveMapColor("--muted-foreground", "hsl(215 20% 65%)");
  return [
    { elementType: "geometry", stylers: [{ color: bg }] },
    { elementType: "labels.text.fill", stylers: [{ color: mutedFg }] },
    { elementType: "labels.text.stroke", stylers: [{ color: bg }] },
    { featureType: "road", elementType: "geometry", stylers: [{ color: muted }] },
    { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: bg }] },
    { featureType: "road.highway", elementType: "geometry", stylers: [{ lightness: 8 }, { color: muted }] },
    { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1626" }] },
    { featureType: "poi", stylers: [{ visibility: "off" }] },
    { featureType: "transit", stylers: [{ visibility: "off" }] },
  ];
}

/** Measures how much of the map the top HUD covers, so the car/next stop stays visible. */
function hudPadding(container: HTMLElement) {
  const stage = container.parentElement;
  const top = container.getBoundingClientRect().top;
  const hudBottom = Math.max(0, ...Array.from(stage?.querySelectorAll(".route-maneuver, .drive-issue-banner, .route-hud-stack") ?? []).map((el) => el.getBoundingClientRect().bottom - top));
  return { top: Math.min(hudBottom + 16, container.clientHeight * 0.45), bottom: 48, left: 32, right: 64 };
}

export function GoogleRouteMap(props: Props) {
  const { stops, start, overview, previewLine, legLine, hintLine, userPos, routeStarted, moving, track, speedMps, followActive, fitEnabled, flyTo, night, onInteract, onRecenter, onSelectStop, onFailure } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState(readPrefs);
  const markersRef = useRef(new Map<string, { marker: google.maps.Marker; key: string }>());
  const startMarkerRef = useRef<google.maps.Marker | null>(null);
  const puckRef = useRef<google.maps.Marker | null>(null);
  const trafficRef = useRef<google.maps.TrafficLayer | null>(null);
  const selectRef = useRef(onSelectStop); selectRef.current = onSelectStop;
  const interactRef = useRef(onInteract); interactRef.current = onInteract;
  const failRef = useRef(onFailure); failRef.current = onFailure;
  const speedRef = useRef(speedMps); speedRef.current = speedMps;
  const programmatic = useRef(false);

  // Load + create the map once the container has a real size.
  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;
    const offAuth = onGoogleMapsAuthFailure(() => failRef.current(new GoogleMapsLoadError("auth", "Google Maps afviste nøglen på dette domæne")));
    const create = () => loadGoogleMaps().then((g) => {
      if (cancelled || mapRef.current || !containerRef.current) return;
      const first = userPos ?? start ?? stops[0]?.pos ?? [56.1, 10.2];
      const map = new g.maps.Map(containerRef.current, {
        center: ll(first), zoom: 13, disableDefaultUI: true, clickableIcons: false,
        gestureHandling: "greedy", keyboardShortcuts: false, isFractionalZoomEnabled: false,
        mapTypeId: readPrefs().satellite ? "hybrid" : "roadmap",
        styles: night ? nightStyles() : undefined, backgroundColor: night ? "#0f172a" : "#e5e7eb",
      });
      // A manual drag/zoom breaks follow mode, just like the open map.
      map.addListener("dragstart", () => interactRef.current());
      map.addListener("zoom_changed", () => { if (!programmatic.current) interactRef.current(); });
      mapRef.current = map;
      setReady(true);
    }).catch((err: unknown) => {
      if (!cancelled) failRef.current(err instanceof GoogleMapsLoadError ? err : new GoogleMapsLoadError("network", "Google Maps kunne ikke indlæses"));
    });
    let ro: ResizeObserver | null = null;
    if (el.clientHeight > 0 && el.clientWidth > 0) void create();
    else {
      ro = new ResizeObserver(() => { if (el.clientHeight > 0 && el.clientWidth > 0) { ro?.disconnect(); ro = null; void create(); } });
      ro.observe(el);
    }
    return () => {
      cancelled = true; offAuth(); ro?.disconnect();
      markersRef.current.forEach(({ marker }) => marker.setMap(null)); markersRef.current.clear();
      startMarkerRef.current?.setMap(null); puckRef.current?.setMap(null); trafficRef.current?.setMap(null);
      if (mapRef.current) google.maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep Google's internal size in sync with HUD/sheet layout changes.
  useEffect(() => {
    const el = containerRef.current; const map = mapRef.current;
    if (!el || !map) return;
    const ro = new ResizeObserver(() => google.maps.event.trigger(map, "resize"));
    ro.observe(el);
    return () => ro.disconnect();
  }, [ready]);

  useEffect(() => { mapRef.current?.setOptions({ styles: night && !prefs.satellite ? nightStyles() : null, backgroundColor: night ? "#0f172a" : "#e5e7eb" }); }, [night, ready, prefs.satellite]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    map.setMapTypeId(prefs.satellite ? "hybrid" : "roadmap");
    if (prefs.traffic) { trafficRef.current ??= new google.maps.TrafficLayer(); trafficRef.current.setMap(map); }
    else trafficRef.current?.setMap(null);
    try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch { /* ignore */ }
  }, [prefs, ready]);

  // Stop markers, diffed by id so done/undo only swaps the icon.
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const seen = new Set<string>();
    for (const s of stops) {
      seen.add(s.id);
      const key = `${s.n}|${s.state}|${s.highlighted}|${s.pos.join(",")}|${night}`;
      const existing = markersRef.current.get(s.id);
      if (existing?.key === key) continue;
      if (existing) {
        existing.marker.setIcon(pinIcon(String(s.n), s.state, s.highlighted));
        existing.marker.setPosition(ll(s.pos));
        existing.marker.setZIndex(s.state === "next" ? 30 : s.state === "done" ? 5 : 10);
        existing.key = key;
      } else {
        const marker = new google.maps.Marker({ map, position: ll(s.pos), icon: pinIcon(String(s.n), s.state, s.highlighted), zIndex: s.state === "next" ? 30 : s.state === "done" ? 5 : 10, title: `Stop ${s.n}${s.state === "done" ? " (udført)" : ""}` });
        marker.addListener("click", () => selectRef.current(s.id));
        markersRef.current.set(s.id, { marker, key });
      }
    }
    for (const [id, { marker }] of markersRef.current) if (!seen.has(id)) { marker.setMap(null); markersRef.current.delete(id); }
  }, [stops, ready, night]);

  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    startMarkerRef.current?.setMap(null); startMarkerRef.current = null;
    if (start) startMarkerRef.current = new google.maps.Marker({ map, position: ll(start), icon: pinIcon("", "start", false), zIndex: 4, title: "Start" });
  }, [start?.[0], start?.[1], ready, night]);

  // Route lines: casing + brand line for overview/leg, dashed hint when geometry is missing.
  useEffect(() => {
    const map = mapRef.current; if (!map) return;
    const casing = resolveMapColor("--route-line-casing", "hsl(0 0% 100%)");
    const brand = resolveMapColor("--brand-blue-end", "hsl(198 71% 35%)");
    const accent = resolveMapColor("--accent", "hsl(184 90% 42%)");
    const success = resolveMapColor("--success", "hsl(142 71% 38%)");
    const lines: google.maps.Polyline[] = [];
    const add = (pts: [number, number][], muted: boolean) => {
      if (pts.length < 2) return;
      const path = pts.map(ll);
      lines.push(new google.maps.Polyline({ map, path, strokeColor: casing, strokeOpacity: 0.95, strokeWeight: muted ? 7 : 9, clickable: false, zIndex: muted ? 1 : 3 }));
      lines.push(new google.maps.Polyline({ map, path, strokeColor: brand, strokeOpacity: muted ? 0.45 : 1, strokeWeight: muted ? 3 : 5, clickable: false, zIndex: muted ? 2 : 4 }));
    };
    add(previewLine, routeStarted);
    add(legLine, false);
    if (hintLine && hintLine.points.length > 1) {
      const color = hintLine.kind === "arrival" ? success : accent;
      lines.push(new google.maps.Polyline({ map, path: hintLine.points.map(ll), strokeOpacity: 0, clickable: false, zIndex: 5,
        icons: [{ icon: { path: "M 0,-1 0,1", strokeOpacity: 0.9, strokeColor: color, strokeWeight: hintLine.kind === "arrival" ? 4 : 6, scale: 3 }, offset: "0", repeat: hintLine.kind === "arrival" ? "10px" : "18px" }] }));
    }
    return () => lines.forEach((l) => l.setMap(null));
  }, [previewLine, legLine, hintLine, routeStarted, ready, night]);

  // User puck: arrow while driving (rotated by heading), dot otherwise. Updated imperatively per frame.
  useEffect(() => {
    const map = mapRef.current; if (!map || !userPos) { puckRef.current?.setMap(null); puckRef.current = null; return; }
    const info = resolveMapColor("--info", "hsl(217 91% 60%)");
    const accent = resolveMapColor("--accent", "hsl(184 90% 42%)");
    const icon = (rotation: number): google.maps.Symbol => routeStarted
      ? { path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW, scale: 7, fillColor: accent, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2.5, rotation: moving ? rotation : 0 }
      : { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: info, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 3 };
    if (!puckRef.current) puckRef.current = new google.maps.Marker({ map, position: ll(userPos), icon: icon(0), zIndex: 100, clickable: false });
    else puckRef.current.setIcon(icon(0));
    if (!routeStarted) { puckRef.current.setPosition(ll(userPos)); return; }
    return track.subscribe(({ pos, heading }) => {
      const m = puckRef.current; if (!m) return;
      m.setPosition(ll(pos));
      if (heading != null && moving) m.setIcon(icon(heading));
    });
  }, [userPos == null, routeStarted, moving, track, ready, night]);
  useEffect(() => { if (!routeStarted && userPos) puckRef.current?.setPosition(ll(userPos)); }, [userPos?.[0], userPos?.[1], routeStarted]);

  // Follow camera: speed-adaptive integer zoom with dwell, car kept below the HUD.
  useEffect(() => {
    const map = mapRef.current; const el = containerRef.current;
    if (!map || !el || !followActive) return;
    let zoom = Math.max(15, Math.min(17, map.getZoom() ?? 17)); let pending = zoom; let since = 0;
    let last: { lat: number; lng: number; zoom: number } | null = null; let frame = 0;
    const off = track.subscribe(({ pos }) => {
      if (document.visibilityState === "hidden" || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const c = navigationZoom(speedRef.current, zoom);
        if (c !== pending) { pending = c; since = performance.now(); }
        if (c !== zoom && performance.now() - since > 6000) zoom = c;
        if (last && last.zoom === zoom && haversineMeters(last.lat, last.lng, pos[0], pos[1]) < 0.5) return;
        programmatic.current = true;
        if (map.getZoom() !== zoom) map.setZoom(zoom);
        const pad = hudPadding(el);
        const offset = Math.max(0, Math.min(el.clientHeight * 0.22, (pad.top - 16) / 2));
        const proj = map.getProjection();
        if (proj) {
          const scale = 2 ** zoom;
          const p = proj.fromLatLngToPoint(ll(pos));
          map.setCenter((p && proj.fromPointToLatLng(new google.maps.Point(p.x, p.y - offset / scale))) || ll(pos));
        } else map.setCenter(ll(pos));
        programmatic.current = false;
        last = { lat: pos[0], lng: pos[1], zoom };
      });
    });
    return () => { off(); cancelAnimationFrame(frame); };
  }, [followActive, track, ready]);

  // Overview before the route starts.
  const fitKey = overview.map((p) => p.join(",")).join(";");
  useEffect(() => {
    const map = mapRef.current; const el = containerRef.current;
    if (!map || !el || !fitEnabled || overview.length === 0) return;
    programmatic.current = true;
    if (overview.length === 1) { map.setCenter(ll(overview[0])); map.setZoom(15); }
    else {
      const b = new google.maps.LatLngBounds(); overview.forEach((p) => b.extend(ll(p)));
      const pad = hudPadding(el);
      map.fitBounds(b, { ...pad, bottom: Math.min(190, el.clientHeight * 0.3) });
      google.maps.event.addListenerOnce(map, "idle", () => { if ((map.getZoom() ?? 0) > 16) map.setZoom(16); });
    }
    window.setTimeout(() => { programmatic.current = false; }, 400);
  }, [fitKey, fitEnabled, ready]);

  useEffect(() => {
    const map = mapRef.current; if (!map || !flyTo) return;
    programmatic.current = true;
    map.panTo(ll(flyTo));
    if ((map.getZoom() ?? 0) < 15) map.setZoom(16);
    window.setTimeout(() => { programmatic.current = false; }, 400);
  }, [flyTo?.[0], flyTo?.[1], ready]);

  const ctrl = "h-11 w-11 rounded-none border-b border-border/60 last:border-b-0";
  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" aria-label="Rutekort" role="region" />
      {!ready && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />}
      {ready && (
        <div className="route-map-controls absolute bottom-6 right-3 z-[1000] flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-md sm:right-5">
          {!followActive && userPos && (
            <Button type="button" variant="ghost" size="icon" className={ctrl} onClick={onRecenter} aria-label="Centrér på min position">
              <Crosshair className="h-5 w-5" />
            </Button>
          )}
          <Button type="button" variant="ghost" size="icon" aria-pressed={prefs.traffic} className={cn(ctrl, prefs.traffic && "bg-accent/15 text-accent")} onClick={() => setPrefs((p) => ({ ...p, traffic: !p.traffic }))} aria-label={prefs.traffic ? "Skjul trafik" : "Vis trafik"}>
            <TrafficCone className="h-5 w-5" />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-pressed={prefs.satellite} className={cn(ctrl, prefs.satellite && "bg-accent/15 text-accent")} onClick={() => setPrefs((p) => ({ ...p, satellite: !p.satellite }))} aria-label={prefs.satellite ? "Vis vejkort" : "Vis satellit"}>
            <Layers className="h-5 w-5" />
          </Button>
        </div>
      )}
    </div>
  );
}
