// Per-rute optimering. Behandler hver rute som en pulje af stops, der grupperes
// pr. tildelt medarbejder. Hver medarbejder-gruppe optimeres uafhængigt med start
// fra rutens start-adresse (virksomhedens adresse). Stops uden tildelt medarbejder
// behandles som én ekstra gruppe, så ruten samlet stadig optimeres.
//
// Mapbox Directions Matrix → live trafik. OSRM → fallback. Haversine → sidste udvej.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Stop = {
  id: string;
  customer_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  duration_minutes: number;
  time_window_start: string | null;
  time_window_end: string | null;
  assigned_employee_id: string | null;
};

type LatLng = { lat: number; lng: number };
type Matrix = { durations: number[][]; distances: number[][]; provider: "mapbox" | "osrm" };

function haversine(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

async function mapboxMatrix(coords: LatLng[]): Promise<Matrix | null> {
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
  } catch { return null; }
}

async function osrmMatrix(coords: LatLng[]): Promise<Matrix | null> {
  if (coords.length < 2) return null;
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  const url = `https://router.project-osrm.org/table/v1/driving/${coordStr}?annotations=duration,distance`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    const json = await resp.json();
    if (json.code !== "Ok") return null;
    return { durations: json.durations, distances: json.distances, provider: "osrm" };
  } catch { return null; }
}

// 2-opt forbedring oven på nearest-neighbor. Giver typisk 10-25% kortere ruter.
function nearestNeighbor(startIdx: number, n: number, costMatrix: number[][]): number[] {
  // costMatrix: index 0 = start, 1..n = stops
  const remaining = new Set<number>();
  for (let i = 1; i <= n; i++) remaining.add(i);
  const order: number[] = [];
  let cur = startIdx;
  while (remaining.size) {
    let best = -1, bestCost = Infinity;
    for (const i of remaining) {
      const c = costMatrix[cur][i];
      if (c < bestCost) { bestCost = c; best = i; }
    }
    order.push(best);
    remaining.delete(best);
    cur = best;
  }
  return order;
}

function twoOpt(order: number[], costMatrix: number[][]): number[] {
  if (order.length < 4) return order;
  const route = [0, ...order]; // include start
  let improved = true;
  let iterations = 0;
  while (improved && iterations < 20) {
    improved = false;
    iterations++;
    for (let i = 1; i < route.length - 2; i++) {
      for (let j = i + 1; j < route.length - 1; j++) {
        const a = route[i - 1], b = route[i], c = route[j], d = route[j + 1];
        const before = costMatrix[a][b] + costMatrix[c][d];
        const after = costMatrix[a][c] + costMatrix[b][d];
        if (after + 1e-9 < before) {
          // reverse i..j
          const seg = route.slice(i, j + 1).reverse();
          route.splice(i, seg.length, ...seg);
          improved = true;
        }
      }
    }
  }
  return route.slice(1);
}

function buildCostMatrix(coords: LatLng[], matrix: Matrix | null): number[][] {
  const n = coords.length;
  const m: number[][] = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i === j) continue;
      m[i][j] = matrix ? matrix.durations[i][j] : haversine(coords[i], coords[j]) * 60; // sek
    }
  }
  return m;
}

function timeToDateIso(routeDate: string, hhmmss: string, addMinutes = 0): string {
  const [h, m] = hhmmss.split(":").map(Number);
  const d = new Date(routeDate + "T00:00:00");
  d.setHours(h, m + addMinutes, 0, 0);
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const routeId = String(body.route_id || "").trim();
    if (!routeId) {
      return new Response(JSON.stringify({ error: "route_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: route } = await supabase
      .from("routes")
      .select("*, businesses(address, zip_code, city)")
      .eq("id", routeId)
      .maybeSingle();
    if (!route) {
      return new Response(JSON.stringify({ error: "Route not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: stops } = await supabase
      .from("route_stops")
      .select("*")
      .eq("route_id", routeId)
      .order("sequence", { ascending: true });

    const allStops = (stops || []) as Stop[];
    const validStops = allStops.filter((s) => s.latitude != null && s.longitude != null);

    if (validStops.length < 1) {
      return new Response(JSON.stringify({
        ok: true, message: "Ingen stop med GPS at optimere", reordered: 0,
        total_km: 0, total_minutes: 0, provider: "none", reasoning: "Ingen stop at optimere",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Fælles startpunkt for ALLE medarbejdere på ruten
    const start: LatLng = route.start_latitude && route.start_longitude
      ? { lat: Number(route.start_latitude), lng: Number(route.start_longitude) }
      : { lat: Number(validStops[0].latitude), lng: Number(validStops[0].longitude) };

    // Gruppér stops pr. medarbejder. null-gruppe = utildelte stops.
    const groups = new Map<string | null, Stop[]>();
    for (const s of validStops) {
      const key = s.assigned_employee_id || null;
      const arr = groups.get(key) || [];
      arr.push(s);
      groups.set(key, arr);
    }

    const startTime = route.planned_start_time || "08:00:00";
    let grandKm = 0, grandMin = 0;
    let provider: "mapbox" | "osrm" | "haversine" = "haversine";
    const groupSummaries: string[] = [];

    type StopUpdate = {
      id: string;
      sequence: number;
      distance_to_next_km: number | null;
      travel_time_to_next_min: number | null;
      planned_arrival: string;
      planned_departure: string;
    };
    const allUpdates: StopUpdate[] = [];
    let globalSeq = 0;

    // Optimér hver gruppe uafhængigt — alle starter fra samme adresse
    for (const [empId, groupStops] of groups) {
      if (groupStops.length === 0) continue;

      const coords: LatLng[] = [start, ...groupStops.map((s) => ({
        lat: Number(s.latitude), lng: Number(s.longitude),
      }))];

      let matrix: Matrix | null = null;
      if (coords.length >= 2 && coords.length <= 25) {
        matrix = await mapboxMatrix(coords) || await osrmMatrix(coords);
        if (matrix && provider === "haversine") provider = matrix.provider;
      }
      const costMatrix = buildCostMatrix(coords, matrix);

      // Find bedste rækkefølge: nearest-neighbor + 2-opt forbedring
      let order: number[];
      if (groupStops.length === 1) {
        order = [1];
      } else {
        order = nearestNeighbor(0, groupStops.length, costMatrix);
        order = twoOpt(order, costMatrix);
      }

      // Beregn ETA, distance, varighed for denne medarbejder
      let cursorMin = 0;
      let groupKm = 0, groupMin = 0;

      for (let i = 0; i < order.length; i++) {
        const matIdx = order[i];
        const stop = groupStops[matIdx - 1];

        // Travel from previous (or start) to this stop
        const prevMatIdx = i === 0 ? 0 : order[i - 1];
        const travelSec = costMatrix[prevMatIdx][matIdx];
        const travelMin = matrix ? Math.round(travelSec / 60) : Math.round((travelSec / 60) * (60 / 50)); // haversine ~50 km/h
        const distKm = matrix
          ? Number((matrix.distances[prevMatIdx][matIdx] / 1000).toFixed(2))
          : Number(haversine(coords[prevMatIdx], coords[matIdx]).toFixed(2));

        cursorMin += travelMin;
        groupKm += distKm;
        groupMin += travelMin;

        const arrivalIso = timeToDateIso(route.route_date, startTime, cursorMin);
        cursorMin += stop.duration_minutes;
        const departureIso = timeToDateIso(route.route_date, startTime, cursorMin);
        groupMin += stop.duration_minutes;

        // Distance/time TO NEXT stop (eller null hvis sidste)
        let toNextKm: number | null = null, toNextMin: number | null = null;
        if (i < order.length - 1) {
          const nextMatIdx = order[i + 1];
          toNextMin = matrix
            ? Math.round(costMatrix[matIdx][nextMatIdx] / 60)
            : Math.round((costMatrix[matIdx][nextMatIdx] / 60) * (60 / 50));
          toNextKm = matrix
            ? Number((matrix.distances[matIdx][nextMatIdx] / 1000).toFixed(2))
            : Number(haversine(coords[matIdx], coords[nextMatIdx]).toFixed(2));
        }

        allUpdates.push({
          id: stop.id,
          sequence: globalSeq++,
          distance_to_next_km: toNextKm,
          travel_time_to_next_min: toNextMin,
          planned_arrival: arrivalIso,
          planned_departure: departureIso,
        });
      }

      grandKm += groupKm;
      grandMin += groupMin;

      const empLabel = empId ? `Medarbejder` : `Utildelt`;
      groupSummaries.push(`${empLabel}: ${groupStops.length} stop · ${groupKm.toFixed(1)} km`);
    }

    // Stops uden GPS — placér til sidst, behold deres tildeling
    const noGpsStops = allStops.filter((s) => s.latitude == null || s.longitude == null);
    for (const s of noGpsStops) {
      allUpdates.push({
        id: s.id,
        sequence: globalSeq++,
        distance_to_next_km: null,
        travel_time_to_next_min: null,
        planned_arrival: timeToDateIso(route.route_date, startTime, 0),
        planned_departure: timeToDateIso(route.route_date, startTime, s.duration_minutes),
      });
    }

    await Promise.all(allUpdates.map((u) =>
      supabase.from("route_stops").update({
        sequence: u.sequence,
        distance_to_next_km: u.distance_to_next_km,
        travel_time_to_next_min: u.travel_time_to_next_min,
        planned_arrival: u.planned_arrival,
        planned_departure: u.planned_departure,
      }).eq("id", u.id),
    ));

    await supabase.from("routes").update({
      optimized_at: new Date().toISOString(),
      total_distance_km: Number(grandKm.toFixed(2)),
      total_duration_minutes: grandMin,
    }).eq("id", routeId);

    const reasoning = groups.size > 1
      ? `Optimeret pr. medarbejder (${groups.size} grupper) via ${provider === "mapbox" ? "Mapbox live trafik" : provider === "osrm" ? "OSRM" : "estimat"} + 2-opt`
      : `Optimeret rækkefølge via ${provider === "mapbox" ? "Mapbox live trafik" : provider === "osrm" ? "OSRM" : "estimat"} + 2-opt`;

    return new Response(JSON.stringify({
      ok: true,
      reasoning,
      reordered: validStops.length,
      total_km: Number(grandKm.toFixed(2)),
      total_minutes: grandMin,
      provider,
      groups: groups.size,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("optimize-route error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
