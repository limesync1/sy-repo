// Geografi: haversine + Mapbox/OSRM matrix + cost-helpers.
import type { LatLng, Matrix } from "./types.ts";

export function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

/** Sekunder mellem to punkter — bruger haversine + 50 km/t som groft estimat. */
export function haversineSec(a: LatLng, b: LatLng): number {
  return (haversineKm(a, b) / 50) * 3600;
}

export async function mapboxMatrix(coords: LatLng[]): Promise<Matrix | null> {
  const token = Deno.env.get("MAPBOX_ACCESS_TOKEN");
  if (!token || coords.length < 2 || coords.length > 25) return null;
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving-traffic/${coordStr}?annotations=duration,distance&access_token=${token}`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    const json = await resp.json();
    if (!json.durations || !json.distances) return null;
    return { durations: json.durations, distances: json.distances, provider: "mapbox" };
  } catch {
    return null;
  }
}

export async function osrmMatrix(coords: LatLng[]): Promise<Matrix | null> {
  if (coords.length < 2) return null;
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  const url = `https://router.project-osrm.org/table/v1/driving/${coordStr}?annotations=duration,distance`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    const json = await resp.json();
    if (json.code !== "Ok") return null;
    return { durations: json.durations, distances: json.distances, provider: "osrm" };
  } catch {
    return null;
  }
}

export async function buildMatrix(coords: LatLng[]): Promise<Matrix | null> {
  if (coords.length < 2) return null;
  if (coords.length > 25) return null; // gateway limits
  return (await mapboxMatrix(coords)) || (await osrmMatrix(coords));
}

/** Returnér rejsetid i sekunder mellem to indeks i koord-listen, fra matrix eller estimat. */
export function travelSec(matrix: Matrix | null, coords: LatLng[], i: number, j: number): number {
  if (i === j) return 0;
  if (matrix) return matrix.durations[i][j];
  return haversineSec(coords[i], coords[j]);
}

export function travelKm(matrix: Matrix | null, coords: LatLng[], i: number, j: number): number {
  if (i === j) return 0;
  if (matrix) return matrix.distances[i][j] / 1000;
  return haversineKm(coords[i], coords[j]);
}
