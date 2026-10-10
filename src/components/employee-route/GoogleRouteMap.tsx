/// <reference types="google.maps" />
import { forwardRef, useEffect, useRef, useState } from "react";
import { Compass, Crosshair, Layers, Route, TrafficCone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { googleMapsMapId, loadGoogleMaps, onGoogleMapsAuthFailure, GoogleMapsLoadError } from "@/lib/google-maps-loader";
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
  /** Metres to the next turn — the camera zooms in before junctions, like Google Maps. */
  maneuverDistanceM?: number | null;
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

/** Pulls the car onto the route line when within 25 m, so it never drives beside the road. */
function snapToLine(pos: [number, number], line: [number, number][]): [number, number] {
  if (line.length < 2) return pos;
  const k = Math.cos((pos[0] * Math.PI) / 180) * 111320; const m = 111320;
  let best: [number, number] = pos; let bestD = 25;
  const n = Math.min(line.length - 1, 400);
  for (let i = 0; i < n; i++) {
    const a = line[i], b = line[i + 1];
    const ax = (a[1] - pos[1]) * k, ay = (a[0] - pos[0]) * m, bx = (b[1] - pos[1]) * k, by = (b[0] - pos[0]) * m;
    const dx = bx - ax, dy = by - ay, len = dx * dx + dy * dy;
    const t = len ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len)) : 0;
    const px = ax + dx * t, py = ay + dy * t, d = Math.hypot(px, py);
    if (d < bestD) { bestD = d; best = [pos[0] + py / m, pos[1] + px / k]; }
  }
  return best;
}

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
      ? `<path d="M15 21l7-6 7 6v7h-4.5v-4.5h-5V28H15z" fill="${text}"/>`
      : `<text x="22" y="25" text-anchor="middle" font-family="system-ui,sans-serif" font-size="15" font-weight="700" fill="${text}">${label}</text>`;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="44" height="54" viewBox="0 0 44 54">${ring}<path d="M22 52c-1-6-15-15-15-31a15 15 0 0 1 30 0c0 16-14 25-15 31z" fill="${fill}" stroke="${stroke}" stroke-width="2.5" opacity="${state === "done" ? 0.85 : 1}"/>${inner}</svg>`;
  return {
    url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    scaledSize: new google.maps.Size(44, 54),
    anchor: new google.maps.Point(22, 52),
  };
}


/** Measures how much of the map the top HUD covers, so the car/next stop stays visible. */
function hudPadding(container: HTMLElement) {
  const stage = container.parentElement;
  const top = container.getBoundingClientRect().top;
  const hudBottom = Math.max(0, ...Array.from(stage?.querySelectorAll(".route-maneuver, .drive-issue-banner, .route-hud-stack") ?? []).map((el) => el.getBoundingClientRect().bottom - top));
  return { top: Math.min(hudBottom + 16, container.clientHeight * 0.45), bottom: 48, left: 32, right: 64 };
}

export const GoogleRouteMap = forwardRef<HTMLDivElement, Props>(function GoogleRouteMap(props, _ref) {
  const { stops, start, overview, previewLine, legLine, hintLine, userPos, routeStarted, moving, track, speedMps, followActive, fitEnabled, flyTo, night, maneuverDistanceM, onInteract, onRecenter, onSelectStop, onFailure } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState(readPrefs);
  const markersRef = useRef(new Map<string, { marker: google.maps.Marker; key: string }>());
  const startMarkerRef = useRef<google.maps.Marker | null>(null);
  const puckRef = useRef<google.maps.Marker | null>(null);
  const haloRef = useRef<google.maps.Marker | null>(null);
  const trafficRef = useRef<google.maps.TrafficLayer | null>(null);
  const selectRef = useRef(onSelectStop); selectRef.current = onSelectStop;
  const interactRef = useRef(onInteract); interactRef.current = onInteract;
  const failRef = useRef(onFailure); failRef.current = onFailure;
  const speedRef = useRef(speedMps); speedRef.current = speedMps;
  const programmatic = useRef(false);
  const maneuverRef = useRef(maneuverDistanceM ?? null); maneuverRef.current = maneuverDistanceM ?? null;
  const legRef = useRef(legLine); legRef.current = legLine;
  const [northUp, setNorthUp] = useState(() => { try { return localStorage.getItem("serviceydere:gmaps-northup") === "1"; } catch { return false; } });
  const northUpRef = useRef(northUp); northUpRef.current = northUp;
  const [mapHeading, setMapHeading] = useState(0);

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
        // Vector map = Google Maps' own navigation rendering: heading-up rotation, 3D tilt, buildings.
        mapId: googleMapsMapId(), renderingType: g.maps.RenderingType.VECTOR,
        colorScheme: night ? g.maps.ColorScheme.DARK : g.maps.ColorScheme.LIGHT,
        headingInteractionEnabled: true, tiltInteractionEnabled: true,
        backgroundColor: night ? "#0f172a" : "#e5e7eb",
      });
      // A manual drag/zoom breaks follow mode, just like the open map.
      map.addListener("dragstart", () => interactRef.current());
      map.addListener("zoom_changed", () => { if (!programmatic.current) interactRef.current(); });
      map.addListener("heading_changed", () => {
        setMapHeading(Math.round(map.getHeading() ?? 0));
        if (!programmatic.current && map.getTilt()) interactRef.current();
      });
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
      startMarkerRef.current?.setMap(null); puckRef.current?.setMap(null); haloRef.current?.setMap(null); trafficRef.current?.setMap(null);
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
    // Google Maps navigation look: bright blue line with a darker blue edge.
    const brand = resolveMapColor("--info", "hsl(217 91% 60%)");
    const casing = night ? "#0b3a8a" : "#1a56c4";
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

  // One Google-style car puck: blue chevron while moving (smoothed heading), blue dot when still.
  // Position is updated per frame; the icon only changes when the smoothed heading moves ≥ 4°,
  // which removes the shaking caused by GPS heading noise.
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPos) { puckRef.current?.setMap(null); puckRef.current = null; haloRef.current?.setMap(null); haloRef.current = null; return; }
    const blue = resolveMapColor("--info", "hsl(217 91% 60%)");
    const chevron = (rotation: number): google.maps.Symbol => ({
      path: "M 0,-11 L 8,9 L 0,5 L -8,9 Z", anchor: new google.maps.Point(0, 0),
      scale: 1.35, fillColor: blue, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2.5, rotation,
    });
    const dot: google.maps.Symbol = { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: blue, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 3 };
    const halo: google.maps.Symbol = { path: google.maps.SymbolPath.CIRCLE, scale: 22, fillColor: blue, fillOpacity: 0.16, strokeOpacity: 0 };
    let shown: number | null = null; let smooth: number | null = null;
    const apply = (heading: number | null) => {
      const m = puckRef.current; if (!m) return;
      const driving = routeStarted && moving && heading != null;
      if (!driving) { if (shown !== -1) { m.setIcon(dot); shown = -1; } return; }
      smooth = smooth == null ? heading : smooth + ((((heading - smooth) % 360) + 540) % 360 - 180) * 0.25;
      const mapHeading = mapRef.current?.getHeading() ?? 0;
      const rot = Math.round((((smooth - mapHeading) % 360) + 360) % 360);
      if (shown == null || shown === -1 || Math.abs((((rot - shown) % 360) + 540) % 360 - 180) >= 4) { m.setIcon(chevron(rot)); shown = rot; }
    };
    if (!puckRef.current) puckRef.current = new google.maps.Marker({ map, position: ll(userPos), zIndex: 100, clickable: false, optimized: true });
    if (!haloRef.current) haloRef.current = new google.maps.Marker({ map, position: ll(userPos), icon: halo, zIndex: 99, clickable: false });
    apply(null);
    if (!routeStarted) { puckRef.current.setPosition(ll(userPos)); haloRef.current.setPosition(ll(userPos)); return; }
    return track.subscribe(({ pos, heading }) => {
      const p = snapToLine(pos, legRef.current);
      puckRef.current?.setPosition(ll(p)); haloRef.current?.setPosition(ll(p));
      apply(speedRef.current > 1.5 ? heading : shown != null && shown >= 0 ? shown : null);
    });
  }, [userPos == null, routeStarted, moving, track, ready, night]);
  useEffect(() => {
    if (routeStarted || !userPos) return;
    puckRef.current?.setPosition(ll(userPos)); haloRef.current?.setPosition(ll(userPos));
  }, [userPos?.[0], userPos?.[1], routeStarted]);

  // Follow camera: one moveCamera per frame, integer zoom with dwell, car kept below the HUD.
  // Sub-metre movements and HUD-height jitter are ignored so the map never trembles.
  useEffect(() => {
    const map = mapRef.current; const el = containerRef.current;
    if (!map || !el || !followActive) return;
    let zoom = Math.max(15, Math.min(17, Math.round(map.getZoom() ?? 17))); let pending = zoom; let since = 0;
    let last: { lat: number; lng: number; zoom: number } | null = null; let frame = 0;
    let offset = 0; let offsetAt = 0; let camHeading: number | null = null;
    const off = track.subscribe(({ pos, heading }) => {
      if (document.visibilityState === "hidden" || frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const turn = maneuverRef.current;
        const c = turn != null && turn < 220 && speedRef.current < 22 ? 18 : navigationZoom(speedRef.current, zoom);
        if (c !== pending) { pending = c; since = performance.now(); }
        if (c !== zoom && (c === 18 || zoom === 18 ? performance.now() - since > 1200 : performance.now() - since > 6000)) zoom = c;
        if (last && last.zoom === zoom && haversineMeters(last.lat, last.lng, pos[0], pos[1]) < 1.2) return;
        const now = performance.now();
        if (now - offsetAt > 2000) {
          const pad = hudPadding(el);
          const next = Math.round(Math.max(0, Math.min(el.clientHeight * 0.22, (pad.top - 16) / 2)) / 8) * 8;
          if (Math.abs(next - offset) >= 8) offset = next;
          offsetAt = now;
        }
        // Heading-up like Google Maps navigation: rotate only on real movement, smoothed.
        if (heading != null && speedRef.current > 2) {
          camHeading = camHeading == null ? heading : camHeading + ((((heading - camHeading) % 360) + 540) % 360 - 180) * 0.2;
        }
        const h = northUpRef.current ? 0 : camHeading ?? map.getHeading() ?? 0;
        // Push the car below the HUD by moving the camera centre ahead along the heading.
        const mpp = (156543.03392 * Math.cos((pos[0] * Math.PI) / 180)) / 2 ** zoom;
        const ahead = (offset + 40) * mpp;
        const rad = (h * Math.PI) / 180;
        const center = { lat: pos[0] + (ahead * Math.cos(rad)) / 111320, lng: pos[1] + (ahead * Math.sin(rad)) / (111320 * Math.cos((pos[0] * Math.PI) / 180)) };
        programmatic.current = true;
        map.moveCamera({ center, zoom, heading: Math.round(h), tilt: northUpRef.current ? 0 : 45 });
        programmatic.current = false;
        last = { lat: pos[0], lng: pos[1], zoom };
      });
    });
    return () => {
      off(); cancelAnimationFrame(frame);
      programmatic.current = true; map.moveCamera({ heading: 0, tilt: 0 }); programmatic.current = false;
    };
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

  const showOverview = () => {
    const map = mapRef.current; const el = containerRef.current; if (!map || !el) return;
    interactRef.current();
    programmatic.current = true;
    map.moveCamera({ heading: 0, tilt: 0 });
    const b = new google.maps.LatLngBounds(); overview.forEach((p) => b.extend(ll(p))); if (userPos) b.extend(ll(userPos));
    map.fitBounds(b, { ...hudPadding(el), bottom: Math.min(190, el.clientHeight * 0.3) });
    window.setTimeout(() => { programmatic.current = false; }, 400);
  };
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
          <Button type="button" variant="ghost" size="icon" className={ctrl} onClick={() => setNorthUp((v) => { const n = !v; try { localStorage.setItem("serviceydere:gmaps-northup", n ? "1" : "0"); } catch { /* private mode */ } return n; })} aria-label={northUp ? "Kør med retning op" : "Vis nord op"} title={northUp ? "Nord op" : "Retning op"}>
            <Compass className="h-5 w-5 transition-transform duration-300" style={{ transform: `rotate(${-mapHeading - 45}deg)` }} />
          </Button>
          {routeStarted && overview.length > 1 && (
            <Button type="button" variant="ghost" size="icon" className={ctrl} onClick={showOverview} aria-label="Vis hele ruten">
              <Route className="h-5 w-5" />
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
});
