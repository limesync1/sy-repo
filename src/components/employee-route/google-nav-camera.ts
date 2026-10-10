/**
 * Pure camera math for the Google driving map (Google Maps-style navigation).
 * Kept free of DOM/Google types so it can be unit-tested.
 */
export type CameraMode = "follow" | "free" | "overview";
export interface Cam { lat: number; lng: number; zoom: number; heading: number; tilt: number }

/** Shortest signed angle from a to b, in degrees (-180..180]. */
export const angleDelta = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;
export const norm360 = (a: number) => ((a % 360) + 360) % 360;

/**
 * Next camera heading: ignores GPS heading below ~10 km/h and changes under 3°,
 * and caps the turn per update so noise never swings the map.
 */
export function nextHeading(prev: number | null, gps: number | null, speedMps: number, maxStepDeg = 35): number | null {
  if (gps == null || !Number.isFinite(gps) || speedMps < 2.8) return prev;
  if (prev == null) return norm360(gps);
  const d = angleDelta(prev, gps);
  if (Math.abs(d) < 3) return prev;
  return norm360(prev + Math.max(-maxStepDeg, Math.min(maxStepDeg, d * 0.6)));
}

/** Metres per screen pixel at a latitude/zoom (Web Mercator, 256-px tiles). */
export const metresPerPixel = (lat: number, zoom: number) => (156543.03392 * Math.cos((lat * Math.PI) / 180)) / 2 ** zoom;

/**
 * Camera centre that puts the car `dyPx` pixels below the screen centre when the map is
 * rotated to `heading` (screen-up == heading). Tilt compresses the near ground, hence `tiltFactor`.
 */
export function followCenter(pos: [number, number], heading: number, zoom: number, dyPx: number, tilt: number): { lat: number; lng: number } {
  const tiltFactor = tilt > 0 ? 0.8 : 1;
  const d = dyPx * metresPerPixel(pos[0], zoom) * tiltFactor;
  const r = (heading * Math.PI) / 180;
  return {
    lat: pos[0] + (d * Math.cos(r)) / 111320,
    lng: pos[1] + (d * Math.sin(r)) / (111320 * Math.cos((pos[0] * Math.PI) / 180)),
  };
}

const ease = (t: number) => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);
/** Interpolates two cameras; heading takes the short way round. */
export function lerpCam(a: Cam, b: Cam, t: number): Cam {
  const k = ease(Math.max(0, Math.min(1, t)));
  return {
    lat: a.lat + (b.lat - a.lat) * k,
    lng: a.lng + (b.lng - a.lng) * k,
    zoom: a.zoom + (b.zoom - a.zoom) * k,
    heading: norm360(a.heading + angleDelta(a.heading, b.heading) * k),
    tilt: a.tilt + (b.tilt - a.tilt) * k,
  };
}

/** Follow zoom: the user's chosen zoom, temporarily +1 just before a turn. */
export function followZoom(userZoom: number, turnDistanceM: number | null, speedMps: number): number {
  const z = turnDistanceM != null && turnDistanceM < 200 && speedMps < 22 ? userZoom + 1 : userZoom;
  return Math.max(12, Math.min(19.5, z));
}
