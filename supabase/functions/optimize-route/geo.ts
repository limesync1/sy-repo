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

/**
 * Henter vejrforhold for et koordinat på en given dato (fra Open-Meteo —
 * gratis, kræver ingen API-nøgle) og returnerer en hastigheds-multiplier
 * for rejsetid. 1.0 = normalt; >1 = langsommere pga. dårligt vejr.
 *
 * Heuristikker:
 *  - Stor regn (>5 mm) eller sne: +20%
 *  - Let regn (1–5 mm): +10%
 *  - Stærk vind (>15 m/s): +5%
 *  - Frost (<0 °C) ved nedbør: +15% (glat føre)
 */
export type WeatherAdjustment = {
  multiplier: number;
  summary: string | null;
};

export async function getWeatherAdjustment(
  origin: LatLng,
  isoDate: string,
): Promise<WeatherAdjustment> {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${origin.lat.toFixed(3)}&longitude=${origin.lng.toFixed(3)}&daily=precipitation_sum,snowfall_sum,wind_speed_10m_max,temperature_2m_min&timezone=Europe%2FCopenhagen&start_date=${isoDate}&end_date=${isoDate}`;
    const resp = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!resp.ok) return { multiplier: 1.0, summary: null };
    const j = await resp.json();
    const d = j?.daily;
    if (!d || !Array.isArray(d.precipitation_sum)) return { multiplier: 1.0, summary: null };
    const precip = Number(d.precipitation_sum?.[0] ?? 0);
    const snow = Number(d.snowfall_sum?.[0] ?? 0);
    const wind = Number(d.wind_speed_10m_max?.[0] ?? 0);
    const tmin = Number(d.temperature_2m_min?.[0] ?? 99);

    let m = 1.0;
    const reasons: string[] = [];
    if (snow > 0.5) { m *= 1.25; reasons.push(`sne ${snow.toFixed(1)} cm`); }
    if (precip > 5) { m *= 1.20; reasons.push(`kraftig regn ${precip.toFixed(1)} mm`); }
    else if (precip > 1) { m *= 1.10; reasons.push(`regn ${precip.toFixed(1)} mm`); }
    if (wind > 15) { m *= 1.05; reasons.push(`vind ${wind.toFixed(0)} m/s`); }
    if (tmin < 0 && precip > 0.2) { m *= 1.15; reasons.push("risiko for glat føre"); }
    // Cap så vi aldrig blæser rejsetid for langt op
    m = Math.min(m, 1.6);
    return {
      multiplier: m,
      summary: reasons.length > 0 ? reasons.join(", ") : null,
    };
  } catch {
    return { multiplier: 1.0, summary: null };
  }
}

/** Anvender en multiplier på alle durations i en matrix (in-place). */
export function applyDurationMultiplier(matrix: Matrix, multiplier: number): void {
  if (multiplier === 1.0) return;
  for (let i = 0; i < matrix.durations.length; i++) {
    for (let j = 0; j < matrix.durations[i].length; j++) {
      matrix.durations[i][j] = matrix.durations[i][j] * multiplier;
    }
  }
}
