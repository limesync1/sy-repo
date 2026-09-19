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

/**
 * Mapbox Matrix-grænser:
 *   driving-traffic  → maks 10 koordinater pr. kald
 *   driving          → maks 25 koordinater pr. kald
 * Tidligere sendte vi op til 25 koordinater på driving-traffic, hvilket gav
 * en 422 fra Mapbox → vi faldt stille tilbage til fugleflugt (50 km/t).
 * Derfor "optimerede" store ruter reelt kun efter afstand, ikke efter tid.
 */
const TRAFFIC_MAX = 10;
const DRIVING_MAX = 25;
/** Over dette antal punkter dropper vi matrix helt (for mange kald). */
const TILE_HARD_MAX = 90;

type Raw = { durations: number[][]; distances: number[][] };

async function mapboxRequest(
  coords: LatLng[],
  token: string,
  profile: "driving" | "driving-traffic",
  sources?: number[],
  destinations?: number[],
): Promise<Raw | null> {
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  const params = new URLSearchParams({
    annotations: "duration,distance",
    access_token: token,
  });
  if (sources) params.set("sources", sources.join(";"));
  if (destinations) params.set("destinations", destinations.join(";"));
  const url =
    `https://api.mapbox.com/directions-matrix/v1/mapbox/${profile}/${coordStr}?${params.toString()}`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    const json = await resp.json();
    if (!Array.isArray(json.durations) || !Array.isArray(json.distances)) return null;
    return { durations: json.durations, distances: json.distances };
  } catch {
    return null;
  }
}

export async function mapboxMatrix(coords: LatLng[]): Promise<Matrix | null> {
  const token = Deno.env.get("MAPBOX_ACCESS_TOKEN");
  if (!token || coords.length < 2 || coords.length > DRIVING_MAX) return null;
  const profile = coords.length <= TRAFFIC_MAX ? "driving-traffic" : "driving";
  const raw = await mapboxRequest(coords, token, profile);
  if (!raw) return null;
  return { durations: raw.durations, distances: raw.distances, provider: "mapbox" };
}

/**
 * Bygger en fuld n×n matrix for >25 punkter ved at hente den i fliser.
 * Hvert kald har maks 24 koordinater (12 kilder + 12 mål), som er inden for
 * driving-profilens grænse. Fliserne hentes få ad gangen så vi ikke rammer
 * rate limits.
 */
export async function mapboxMatrixTiled(coords: LatLng[]): Promise<Matrix | null> {
  const token = Deno.env.get("MAPBOX_ACCESS_TOKEN");
  const n = coords.length;
  if (!token || n < 2 || n > TILE_HARD_MAX) return null;

  const BLOCK = 12;
  const blocks: number[][] = [];
  for (let i = 0; i < n; i += BLOCK) {
    blocks.push(Array.from({ length: Math.min(BLOCK, n - i) }, (_, k) => i + k));
  }

  const durations: number[][] = Array.from({ length: n }, () => new Array(n).fill(NaN));
  const distances: number[][] = Array.from({ length: n }, () => new Array(n).fill(NaN));

  const tasks: Array<() => Promise<boolean>> = [];
  for (const src of blocks) {
    for (const dst of blocks) {
      tasks.push(async () => {
        const subset = src === dst ? src : [...src, ...dst];
        const subCoords = subset.map((i) => coords[i]);
        const srcIdx = src.map((i) => subset.indexOf(i));
        const dstIdx = dst.map((i) => subset.indexOf(i));
        const raw = await mapboxRequest(subCoords, token, "driving", srcIdx, dstIdx);
        if (!raw) return false;
        for (let a = 0; a < src.length; a++) {
          for (let b = 0; b < dst.length; b++) {
            const d = raw.durations?.[a]?.[b];
            const m = raw.distances?.[a]?.[b];
            if (typeof d === "number") durations[src[a]][dst[b]] = d;
            if (typeof m === "number") distances[src[a]][dst[b]] = m;
          }
        }
        return true;
      });
    }
  }

  // Kør maks 4 kald ad gangen.
  let ok = 0;
  for (let i = 0; i < tasks.length; i += 4) {
    const results = await Promise.all(tasks.slice(i, i + 4).map((t) => t()));
    ok += results.filter(Boolean).length;
  }
  // Kræv at mindst 80 % af fliserne kom hjem — ellers er data for hullet.
  if (ok < Math.ceil(tasks.length * 0.8)) return null;

  // Udfyld huller med fugleflugt, så matrixen altid er komplet.
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) {
        durations[i][j] = 0;
        distances[i][j] = 0;
        continue;
      }
      if (!Number.isFinite(durations[i][j])) durations[i][j] = haversineSec(coords[i], coords[j]);
      if (!Number.isFinite(distances[i][j])) distances[i][j] = haversineKm(coords[i], coords[j]) * 1000;
    }
  }
  return { durations, distances, provider: "mapbox" };
}

export async function osrmMatrix(coords: LatLng[]): Promise<Matrix | null> {
  if (coords.length < 2 || coords.length > 100) return null;
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
  if (coords.length <= DRIVING_MAX) {
    return (await mapboxMatrix(coords)) || (await osrmMatrix(coords));
  }
  return (await mapboxMatrixTiled(coords)) || (await osrmMatrix(coords));
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
