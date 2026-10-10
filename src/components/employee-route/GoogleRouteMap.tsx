/// <reference types="google.maps" />
import { forwardRef, useEffect, useRef, useState } from "react";
import { Compass, Crosshair, Layers, Route, TrafficCone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { googleMapsMapId, loadGoogleMaps, onGoogleMapsAuthFailure, GoogleMapsLoadError } from "@/lib/google-maps-loader";
import { resolveMapColor } from "@/components/employee-route/RouteMapLine";
import { followCenter, followZoom, lerpCam, nextHeading, norm360, type Cam } from "@/components/employee-route/google-nav-camera";
import { haversineMeters } from "@/lib/geo-distance";
import type { MotionTrack } from "@/components/employee-route/motionTrack";

export type GoogleStopState = "next" | "done" | "future";
export interface GoogleRouteStop { id: string; n: number; pos: [number, number]; state: GoogleStopState; highlighted: boolean }

interface Props {
  topOverlayRef?: React.RefObject<HTMLElement>;
  bottomOverlayRef?: React.RefObject<HTMLElement>;
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
  /** Slow/jammed parts of the current leg from Google Routes. */
  trafficSegments?: { speed: "SLOW" | "TRAFFIC_JAM"; points: [number, number][] }[];
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

/** Geographic pin artwork projected by Google alongside its rotating map. */
function pinContent(label: string, state: GoogleStopState | "start", highlighted: boolean): HTMLImageElement {
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
  const image = document.createElement("img");
  image.src = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
  image.width = 44; image.height = 54; image.alt = ""; image.draggable = false;
  return image;
}


function removePin(marker: google.maps.marker.AdvancedMarkerElement) {
  google.maps.event.clearInstanceListeners(marker);
  marker.map = null;
}

function getElementPadding(container: HTMLElement, topRef?: React.RefObject<HTMLElement>, bottomRef?: React.RefObject<HTMLElement>) {
  const containerRect = container.getBoundingClientRect();
  const top = containerRect.top;
  const hudBottom = topRef?.current ? Math.max(0, topRef.current.getBoundingClientRect().bottom - top) : 0;
  const dockTop = bottomRef?.current ? Math.max(0, containerRect.bottom - bottomRef.current.getBoundingClientRect().top) : 0;
  return {
    top: Math.min(hudBottom + 16, container.clientHeight * 0.45),
    bottom: Math.max(48, dockTop + 12),
    left: 32, right: 64
  };
}

export const GoogleRouteMap = forwardRef<HTMLDivElement, Props>(function GoogleRouteMap(props, _ref) {
  const { stops, start, overview, previewLine, legLine, hintLine, userPos, routeStarted, moving, track, speedMps, followActive, fitEnabled, flyTo, night, maneuverDistanceM, trafficSegments, onInteract, onRecenter, onSelectStop, onFailure, topOverlayRef, bottomOverlayRef } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [ready, setReady] = useState(false);
  const [prefs, setPrefs] = useState(readPrefs);
  const markersRef = useRef(new Map<string, { marker: google.maps.marker.AdvancedMarkerElement; key: string }>());
  const startMarkerRef = useRef<google.maps.marker.AdvancedMarkerElement | null>(null);
  const markerLibraryRef = useRef<google.maps.MarkerLibrary | null>(null);
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
  const vectorRef = useRef(true);
  const [mapHeading, setMapHeading] = useState(0);
  const [vector, setVector] = useState(true);
  vectorRef.current = vector;

  // Load + create the map once the container has a real size.
  useEffect(() => {
    let cancelled = false;
    const el = containerRef.current;
    if (!el) return;
    const offAuth = onGoogleMapsAuthFailure(() => failRef.current(new GoogleMapsLoadError("auth", "Google Maps afviste nøglen på dette domæne")));
    const create = () => loadGoogleMaps().then(async (g) => {
      const markerLibrary = await g.maps.importLibrary("marker") as google.maps.MarkerLibrary;
      if (cancelled || mapRef.current || !containerRef.current) return;
      markerLibraryRef.current = markerLibrary;
      const first = userPos ?? start ?? stops[0]?.pos ?? [56.1, 10.2];
      const map = new g.maps.Map(containerRef.current, {
        center: ll(first), zoom: 13, disableDefaultUI: true, clickableIcons: false,
        gestureHandling: "greedy", keyboardShortcuts: false, isFractionalZoomEnabled: true,
        mapTypeId: readPrefs().satellite ? "hybrid" : "roadmap",
        // Vector map = Google Maps' own navigation rendering: heading-up rotation, 3D tilt, buildings.
        mapId: googleMapsMapId(), renderingType: g.maps.RenderingType.VECTOR,
        colorScheme: night ? g.maps.ColorScheme.DARK : g.maps.ColorScheme.LIGHT,
        headingInteractionEnabled: true, tiltInteractionEnabled: true,
        backgroundColor: night ? "#0f172a" : "#e5e7eb",
      });
      map.addListener("heading_changed", () => setMapHeading(Math.round(map.getHeading() ?? 0)));
      mapRef.current = map;
      // Without WebGL Google silently renders raster (no rotation/tilt): stay on Google, just north-up.
      google.maps.event.addListenerOnce(map, "idle", () => {
        const isVector = map.getRenderingType() !== g.maps.RenderingType.RASTER;
        setVector(isVector);
        console.info("[Rutekort]", { renderer: isVector ? "vector" : "raster", customMap: googleMapsMapId() !== "DEMO_MAP_ID", theme: night ? "dark" : "light" });
      });
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
      markersRef.current.forEach(({ marker }) => removePin(marker)); markersRef.current.clear();
      if (startMarkerRef.current) removePin(startMarkerRef.current);
      startMarkerRef.current = null; markerLibraryRef.current = null;
      puckRef.current?.setMap(null); haloRef.current?.setMap(null); trafficRef.current?.setMap(null);
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

  // Geographic anchors stay at addresses while Google moves/rotates the map beneath the car.
  // Diff by id: status changes never recreate the marker or its click listener.
  useEffect(() => {
    const map = mapRef.current; const library = markerLibraryRef.current;
    if (!map || !library) return;
    const seen = new Set<string>();
    for (const s of stops) {
      seen.add(s.id);
      const key = `${s.n}|${s.state}|${s.highlighted}|${s.pos.join(",")}|${night}`;
      const existing = markersRef.current.get(s.id);
      if (existing?.key === key) continue;
      const title = `Stop ${s.n}${s.state === "done" ? " (udført)" : ""}`;
      const zIndex = s.highlighted ? 40 : s.state === "next" ? 30 : s.state === "done" ? 5 : 10;
      if (existing) {
        existing.marker.replaceChildren(pinContent(String(s.n), s.state, s.highlighted));
        existing.marker.position = ll(s.pos);
        existing.marker.zIndex = zIndex;
        existing.marker.title = title;
        existing.key = key;
      } else {
        const marker = new library.AdvancedMarkerElement({
          map, position: ll(s.pos), zIndex, title, gmpClickable: true,
          anchorLeft: "-22px", anchorTop: "-52px",
          collisionBehavior: google.maps.CollisionBehavior.REQUIRED,
        });
        marker.replaceChildren(pinContent(String(s.n), s.state, s.highlighted));
        const select = () => selectRef.current(s.id);
        if (typeof marker.addEventListener === "function") marker.addEventListener("gmp-click", select);
        else marker.addListener("click", select);
        markersRef.current.set(s.id, { marker, key });
      }
    }
    for (const [id, { marker }] of markersRef.current) if (!seen.has(id)) { removePin(marker); markersRef.current.delete(id); }
  }, [stops, ready, night]);

  useEffect(() => {
    const map = mapRef.current; const library = markerLibraryRef.current;
    if (!map || !library) return;
    if (!start) {
      if (startMarkerRef.current) removePin(startMarkerRef.current);
      startMarkerRef.current = null;
      return;
    }
    startMarkerRef.current ??= new library.AdvancedMarkerElement({
      map, zIndex: 4, title: "Start", anchorLeft: "-22px", anchorTop: "-52px",
      collisionBehavior: google.maps.CollisionBehavior.REQUIRED,
    });
    startMarkerRef.current.position = ll(start);
    startMarkerRef.current.replaceChildren(pinContent("", "start", false));
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
    // Traffic on the route line (orange = slow, red = queue), shown with the traffic toggle like Google Maps.
    if (prefs.traffic) for (const seg of trafficSegments ?? []) {
      lines.push(new google.maps.Polyline({ map, path: seg.points.map(ll), strokeColor: seg.speed === "TRAFFIC_JAM" ? "#d93025" : "#f29900", strokeOpacity: 1, strokeWeight: 5, clickable: false, zIndex: 6 }));
    }
    return () => lines.forEach((l) => l.setMap(null));
  }, [previewLine, legLine, hintLine, routeStarted, ready, night, trafficSegments, prefs.traffic]);

  // Driven part turns grey behind the car, like Google Maps.
  useEffect(() => {
    const map = mapRef.current; if (!map || !routeStarted) return;
    const trail = new google.maps.Polyline({ map, path: [], strokeColor: night ? "#5f6368" : "#9aa0a6", strokeOpacity: 0.9, strokeWeight: 5, clickable: false, zIndex: 2 });
    let last: [number, number] | null = null;
    const off = track.subscribe(({ pos }) => {
      if (last && haversineMeters(last[0], last[1], pos[0], pos[1]) < 8) return;
      last = pos;
      const path = trail.getPath(); path.push(new google.maps.LatLng(pos[0], pos[1]));
      if (path.getLength() > 600) path.removeAt(0);
    });
    return () => { off(); trail.setMap(null); };
  }, [routeStarted, track, ready, night]);

  // ── Gestures: read straight from the finger, never from Google's camera events ──
  // One-finger drag → free mode. Pinch/wheel → stay in follow, adopt the user's zoom.
  const userZoomRef = useRef(17);
  const gestureRef = useRef({ active: false, pinch: false, until: 0 });
  useEffect(() => {
    const el = containerRef.current; const map = mapRef.current; if (!el || !map) return;
    let sx = 0, sy = 0, settle = 0;
    const end = () => {
      window.clearTimeout(settle);
      settle = window.setTimeout(() => {
        const g = gestureRef.current;
        if (g.pinch) userZoomRef.current = map.getZoom() ?? userZoomRef.current;
        g.active = false; g.pinch = false; g.until = performance.now() + 250;
      }, 350);
    };
    const onTouchStart = (e: TouchEvent) => {
      gestureRef.current.active = true;
      if (e.touches.length >= 2) gestureRef.current.pinch = true;
      sx = e.touches[0].clientX; sy = e.touches[0].clientY;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length >= 2) { gestureRef.current.pinch = true; return; }
      if (!gestureRef.current.pinch && Math.hypot(e.touches[0].clientX - sx, e.touches[0].clientY - sy) > 12) interactRef.current();
    };
    const onTouchEnd = (e: TouchEvent) => { if (e.touches.length === 0) end(); };
    const onMouseDown = (e: MouseEvent) => { gestureRef.current.active = true; sx = e.clientX; sy = e.clientY; };
    const onMouseMove = (e: MouseEvent) => { if (gestureRef.current.active && e.buttons && Math.hypot(e.clientX - sx, e.clientY - sy) > 6) interactRef.current(); };
    const onMouseUp = () => { if (gestureRef.current.active) end(); };
    const onWheel = () => { gestureRef.current.active = true; gestureRef.current.pinch = true; end(); };
    el.addEventListener("touchstart", onTouchStart, { passive: true, capture: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true, capture: true });
    el.addEventListener("touchend", onTouchEnd, { passive: true, capture: true });
    el.addEventListener("touchcancel", onTouchEnd, { passive: true, capture: true });
    el.addEventListener("mousedown", onMouseDown, true);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    el.addEventListener("wheel", onWheel, { passive: true, capture: true });
    return () => {
      window.clearTimeout(settle);
      el.removeEventListener("touchstart", onTouchStart, true); el.removeEventListener("touchmove", onTouchMove, true);
      el.removeEventListener("touchend", onTouchEnd, true); el.removeEventListener("touchcancel", onTouchEnd, true);
      el.removeEventListener("mousedown", onMouseDown, true); window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp); el.removeEventListener("wheel", onWheel, true);
    };
  }, [ready]);
  const insetRef = useRef({ top: 0, bottom: 48 });
  const [anchorY, setAnchorY] = useState<number | null>(null);
  useEffect(() => {
    const el = containerRef.current; if (!el) return;
    const measure = () => {
      const pad = getElementPadding(el, topOverlayRef, bottomOverlayRef);
      insetRef.current = { top: pad.top, bottom: pad.bottom };
      setAnchorY(Math.round(pad.top + (el.clientHeight - pad.top - pad.bottom) * 0.72));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    const attach = window.requestAnimationFrame(() => {
      measure();
      if (topOverlayRef?.current) ro.observe(topOverlayRef.current);
      if (bottomOverlayRef?.current) ro.observe(bottomOverlayRef.current);
    });
    window.addEventListener("resize", measure);
    return () => { ro.disconnect(); window.cancelAnimationFrame(attach); window.removeEventListener("resize", measure); };
  }, [ready, topOverlayRef, bottomOverlayRef]);

  const following = followActive && routeStarted && !!userPos;
  const flatRef = useRef(false); flatRef.current = northUp || !vector;

  // ── Map puck: only when NOT following (then the screen-fixed puck is used) ──
  const [puckHeading, setPuckHeading] = useState<number | null>(null);
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !userPos || following) { puckRef.current?.setMap(null); puckRef.current = null; haloRef.current?.setMap(null); haloRef.current = null; return; }
    const blue = resolveMapColor("--info", "hsl(217 91% 60%)");
    const halo: google.maps.Symbol = { path: google.maps.SymbolPath.CIRCLE, scale: 22, fillColor: blue, fillOpacity: 0.16, strokeOpacity: 0 };
    const icon = (): google.maps.Symbol => puckHeading != null && moving
      ? { path: "M 0,-11 L 8,9 L 0,5 L -8,9 Z", anchor: new google.maps.Point(0, 0), scale: 1.35, fillColor: blue, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 2.5, rotation: norm360(puckHeading - (map.getHeading() ?? 0)) }
      : { path: google.maps.SymbolPath.CIRCLE, scale: 8, fillColor: blue, fillOpacity: 1, strokeColor: "#ffffff", strokeWeight: 3 };
    puckRef.current ??= new google.maps.Marker({ map, zIndex: 100, clickable: false });
    haloRef.current ??= new google.maps.Marker({ map, icon: halo, zIndex: 99, clickable: false });
    const p = ll(snapToLine(userPos, legRef.current));
    puckRef.current.setPosition(p); haloRef.current.setPosition(p); puckRef.current.setIcon(icon());
  }, [userPos?.[0], userPos?.[1], following, puckHeading, moving, ready, mapHeading]);

  // ── Follow camera: GPS-driven targets, eased over ~900 ms, one moveCamera per frame only while animating ──
  useEffect(() => {
    const map = mapRef.current; const el = containerRef.current;
    if (!map || !el || !following) return;
    if (gestureRef.current.pinch === false) userZoomRef.current = Math.max(15, Math.min(18, map.getZoom() ?? 17)) ;
    let heading: number | null = map.getHeading() || null;
    let from: Cam | null = null; let to: Cam | null = null; let t0 = 0; let frame = 0; let lastTarget = 0;
    let lastPos: [number, number] | null = null;
    const cur = (): Cam => { const c = map.getCenter(); return { lat: c?.lat() ?? 0, lng: c?.lng() ?? 0, zoom: map.getZoom() ?? 17, heading: map.getHeading() ?? 0, tilt: map.getTilt() ?? 0 }; };
    const tick = () => {
      frame = 0;
      if (!from || !to || gestureRef.current.active) return;
      const k = Math.min(1, (performance.now() - t0) / 900);
      const c = lerpCam(from, to, k);
      map.moveCamera({ center: { lat: c.lat, lng: c.lng }, zoom: c.zoom, heading: c.heading, tilt: c.tilt });
      if (k < 1) frame = requestAnimationFrame(tick);
    };
    const retarget = (pos: [number, number], gpsHeading: number | null) => {
      if (document.visibilityState === "hidden" || gestureRef.current.active || performance.now() < gestureRef.current.until) return;
      const flat = flatRef.current;
      heading = nextHeading(heading, gpsHeading, speedRef.current);
      setPuckHeading(heading);
      const h = flat ? 0 : heading ?? 0;
      const tilt = flat ? 0 : 45;
      const zoom = followZoom(userZoomRef.current, maneuverRef.current, speedRef.current);
      const p = snapToLine(pos, legRef.current);
      const dy = Math.max(0, (anchorRef.current ?? el.clientHeight / 2) - el.clientHeight / 2);
      const center = followCenter(p, h, zoom, dy, tilt);
      from = cur(); to = { ...center, zoom, heading: h, tilt }; t0 = performance.now();
      if (!frame) frame = requestAnimationFrame(tick);
    };
    const off = track.subscribe(({ pos, heading: gh }) => {
      const now = performance.now();
      const moved = !lastPos || haversineMeters(lastPos[0], lastPos[1], pos[0], pos[1]) > 1.5;
      if (now - lastTarget < 850 || (!moved && now - lastTarget < 3000)) return;
      lastTarget = now; lastPos = pos;
      retarget(pos, gh);
    });
    if (userPos) retarget(userPos, null);
    return () => {
      off(); cancelAnimationFrame(frame);
    };
  }, [following, track, ready, northUp, vector]);
  const anchorRef = useRef<number | null>(null); anchorRef.current = anchorY;

  // Leaving follow (free/overview) flattens nothing — the user keeps the view they chose.
  // Re-entering follow eases from wherever the user left the camera.

  // Overview before the route starts.
  const fitKey = overview.map((p) => p.join(",")).join(";");
  useEffect(() => {
    const map = mapRef.current; const el = containerRef.current;
    if (!map || !el || !fitEnabled || overview.length === 0) return;
    map.moveCamera({ heading: 0, tilt: 0 });
    if (overview.length === 1) { map.setCenter(ll(overview[0])); map.setZoom(15); }
    else {
      const b = new google.maps.LatLngBounds(); overview.forEach((p) => b.extend(ll(p)));
      const pad = getElementPadding(el, topOverlayRef, bottomOverlayRef);
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
    map.fitBounds(b, { ...getElementPadding(el, topOverlayRef, bottomOverlayRef), bottom: Math.min(190, el.clientHeight * 0.3) });
    window.setTimeout(() => { programmatic.current = false; }, 400);
  };
  const ctrl = "h-11 w-11 rounded-none border-b border-border/60 last:border-b-0";
  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" aria-label="Rutekort" role="region" />
      {!ready && <div className="absolute inset-0 animate-pulse bg-muted" aria-hidden />}
      {ready && following && anchorY != null && (
        // Screen-fixed car while following: the map glides beneath it, so it can never shake.
        <div className="pointer-events-none absolute left-1/2 z-[999] -translate-x-1/2 -translate-y-1/2" style={{ top: anchorY }} aria-hidden>
          <div className="relative flex h-12 w-12 items-center justify-center">
            <span className="absolute inset-0 rounded-full bg-info/20" />
            <svg viewBox="-12 -13 24 26" className="relative h-8 w-8 drop-shadow-md transition-transform duration-700 ease-out" style={{ transform: `rotate(${puckHeading == null || !moving ? 0 : norm360(puckHeading - mapHeading)}deg)` }}>
              {puckHeading != null && moving
                ? <path d="M0,-11 L8,9 L0,5 L-8,9 Z" className="fill-info stroke-background" strokeWidth={2.5} strokeLinejoin="round" />
                : <circle r={7} className="fill-info stroke-background" strokeWidth={3} />}
            </svg>
          </div>
        </div>
      )}
      {ready && (
        <div className="route-map-controls absolute bottom-6 right-3 z-[1000] flex flex-col overflow-hidden rounded-xl border border-border/60 bg-card shadow-md sm:right-5">
          {!followActive && userPos && (
            <Button type="button" variant="ghost" size="icon" className={ctrl} onClick={onRecenter} aria-label="Centrér på min position">
              <Crosshair className="h-5 w-5" />
            </Button>
          )}
          {vector && <Button type="button" variant="ghost" size="icon" className={ctrl} onClick={() => setNorthUp((v) => { const n = !v; try { localStorage.setItem("serviceydere:gmaps-northup", n ? "1" : "0"); } catch { /* private mode */ } return n; })} aria-label={northUp ? "Kør med retning op" : "Vis nord op"} title={northUp ? "Nord op" : "Retning op"}>
            <Compass className="h-5 w-5 transition-transform duration-300" style={{ transform: `rotate(${-mapHeading - 45}deg)` }} />
          </Button>}
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
