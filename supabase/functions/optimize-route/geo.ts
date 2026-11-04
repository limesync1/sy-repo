// Geografi: haversine + nøglefri OSRM-matrix + cost-helpers.
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

/**
 * Faktisk vejafstand er altid længere end fugleflugt. Uden rutetjeneste
 * bruger vi en omvejsfaktor, så fallback-estimater ligner virkeligheden
 * (dansk vejnet: ca. 1,25-1,35 gange fugleflugt).
 */
export const ROAD_DETOUR_FACTOR = 1.3;

/** Estimeret vejafstand i km (fugleflugt × omvejsfaktor). */
export function roadKm(a: LatLng, b: LatLng): number {
  return haversineKm(a, b) * ROAD_DETOUR_FACTOR;
}

/**
 * Sekunder mellem to punkter uden rutetjeneste.
 *
 * Gennemsnitsfarten afhænger stærkt af turens længde: korte ture er bykørsel
 * med lyskryds (~28 km/t), mellemture landevej (~55 km/t) og lange ture
 * motorvej (~80 km/t). Én fast fart på 50 km/t gjorde korte bystop alt for
 * billige og lange ture alt for dyre — og det er netop dét der gav
 * ulogiske rækkefølger når rutetjenesten ikke svarede.
 */
export function haversineSec(a: LatLng, b: LatLng): number {
  const km = roadKm(a, b);
  const speedKmh = km < 2 ? 28 : km < 10 ? 45 : km < 30 ? 65 : 80;
  return (km / speedKmh) * 3600;
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

// Cache af køretider mellem afrundede koordinater (~11 m). Lever så længe
// funktionens instans er varm, så gentagne optimeringer af samme kunder ikke
// slår de samme par op igen. Begrænset størrelse for at holde hukommelsen nede.
const PAIR_CACHE = new Map<string, [number, number]>();
const PAIR_CACHE_MAX = 200_000;
export function clearTravelCache() { PAIR_CACHE.clear(); }
const ck = (c: LatLng) => `${c.lat.toFixed(4)},${c.lng.toFixed(4)}`;

async function osrmBlock(
  coords: LatLng[], src: number[], dst: number[],
): Promise<{ d: number[][]; m: number[][] } | null> {
  const all = [...src, ...dst];
  const coordStr = all.map((i) => `${coords[i].lng},${coords[i].lat}`).join(";");
  const s = src.map((_, k) => k).join(";");
  const t = dst.map((_, k) => src.length + k).join(";");
  const url = `https://router.project-osrm.org/table/v1/driving/${coordStr}?sources=${s}&destinations=${t}&annotations=duration,distance`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
      if (resp.ok) {
        const json = await resp.json();
        if (json.code === "Ok") return { d: json.durations, m: json.distances };
      }
    } catch { /* prøv igen */ }
  }
  return null;
}

/**
 * Fuld køretidsmatrix for vilkårligt mange punkter: opdeles i blokke på
 * højst 40×40, hentes med begrænset samtidighed og flettes sammen. Par, der
 * allerede ligger i cachen, springes over. Manglende celler bliver NaN og
 * falder pr. par tilbage til estimat i makeTravelers.
 */
export async function buildMatrix(coords: LatLng[]): Promise<Matrix | null> {
  const n = coords.length;
  if (n < 2) return null;
  const durations = Array.from({ length: n }, () => new Array<number>(n).fill(NaN));
  const distances = Array.from({ length: n }, () => new Array<number>(n).fill(NaN));
  const keys = coords.map(ck);
  let missing = false;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) { durations[i][j] = 0; distances[i][j] = 0; continue; }
      const hit = PAIR_CACHE.get(`${keys[i]}|${keys[j]}`);
      if (hit) { durations[i][j] = hit[0]; distances[i][j] = hit[1]; } else missing = true;
    }
  }
  if (missing) {
    const B = 40;
    const blocks: number[][] = [];
    for (let i = 0; i < n; i += B) blocks.push(Array.from({ length: Math.min(B, n - i) }, (_, k) => i + k));
    const jobs: Array<[number[], number[]]> = [];
    for (const a of blocks) for (const b of blocks) {
      if (a.some((i) => b.some((j) => i !== j && Number.isNaN(durations[i][j])))) jobs.push([a, b]);
    }
    let cursor = 0;
    const worker = async () => {
      while (cursor < jobs.length) {
        const [a, b] = jobs[cursor++];
        const res = await osrmBlock(coords, a, b);
        if (!res) continue;
        a.forEach((i, ai) => b.forEach((j, bj) => {
          const dv = res.d?.[ai]?.[bj];
          const mv = res.m?.[ai]?.[bj];
          if (typeof dv === "number" && typeof mv === "number" && Number.isFinite(dv)) {
            durations[i][j] = dv;
            distances[i][j] = mv;
            if (i !== j) {
              if (PAIR_CACHE.size > PAIR_CACHE_MAX) PAIR_CACHE.clear();
              PAIR_CACHE.set(`${keys[i]}|${keys[j]}`, [dv, mv]);
            }
          }
        }));
      }
    };
    await Promise.all([worker(), worker(), worker()]);
  }
  let filled = 0;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && Number.isFinite(durations[i][j])) filled++;
  if (filled === 0) return null;
  return { durations, distances, provider: "osrm" };
}

/**
 * Myldretidsfaktor på køretid ud fra afgangstidspunkt (minutter efter
 * midnat). Det er bevidst blødt, så det kun skubber rækkefølgen, når det
 * giver mening, fx ved at lægge lange ture uden for 7–9 og 15–17.
 */
export function rushHourFactor(minuteOfDay: number): number {
  const m = minuteOfDay;
  if (m >= 7 * 60 && m < 9 * 60) return 1.2;
  if (m >= 15 * 60 && m < 17 * 60 + 30) return 1.15;
  if ((m >= 6 * 60 + 30 && m < 7 * 60) || (m >= 9 * 60 && m < 9 * 60 + 30)) return 1.08;
  return 1.0;
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
