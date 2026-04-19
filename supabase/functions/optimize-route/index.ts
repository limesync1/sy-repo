// Per-rute optimering med multi-medarbejder support.
//
// Model: Hvert stop har 1+ medarbejdere via route_stop_assignees. Vi optimerer
// rækkefølgen pr. medarbejder (geografisk via Mapbox/OSRM + 2-opt), men sørger for at
// stops med flere medarbejdere får SAMME planned_arrival på tværs af alle deres
// medarbejdere. Til sidst kører vi en konflikt-resolver der garanterer at ingen
// medarbejder har overlappende tider — overlap rykkes til næste 15-min slot.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SLOT_MIN = 15;

type Stop = {
  id: string;
  customer_name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  duration_minutes: number;
  time_window_start: string | null;
  time_window_end: string | null;
  required_staff: number | null;
  assignee_ids: string[]; // udfyldt af os
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

function nearestNeighbor(startIdx: number, n: number, costMatrix: number[][]): number[] {
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
  const route = [0, ...order];
  let improved = true;
  let iter = 0;
  while (improved && iter < 20) {
    improved = false;
    iter++;
    for (let i = 1; i < route.length - 2; i++) {
      for (let j = i + 1; j < route.length - 1; j++) {
        const a = route[i - 1], b = route[i], c = route[j], d = route[j + 1];
        const before = costMatrix[a][b] + costMatrix[c][d];
        const after = costMatrix[a][c] + costMatrix[b][d];
        if (after + 1e-9 < before) {
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
      m[i][j] = matrix ? matrix.durations[i][j] : haversine(coords[i], coords[j]) * 60;
    }
  }
  return m;
}

const snap = (mins: number) => Math.round(mins / SLOT_MIN) * SLOT_MIN;
const ceilSnap = (mins: number) => Math.ceil(mins / SLOT_MIN) * SLOT_MIN;

function timeToDateIso(routeDate: string, hhmmss: string, addMinutes = 0): string {
  const [h, m] = hhmmss.split(":").map(Number);
  // Fortolk routeDate som lokal Europe/Copenhagen-dag. setHours bruger lokal tid på serveren —
  // for konsistens på tværs af tidszoner bygger vi UTC eksplicit ved at antage CET/CEST offset
  // matches af Date-objektet ved den dato. Vi bruger setHours på en Date oprettet fra
  // routeDate-strengen, hvilket fortolkes som lokal midnat.
  const d = new Date(routeDate + "T00:00:00");
  d.setHours(h, m + addMinutes, 0, 0);
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const routeId = typeof body?.route_id === "string" ? body.route_id.trim() : "";
    const accessToken = typeof body?.access_token === "string" ? body.access_token.trim() : "";

    if (!routeId) {
      return new Response(JSON.stringify({ ok: false, error: "route_id required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!accessToken) {
      return new Response(JSON.stringify({ ok: false, error: "access_token required" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const authClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ ok: false, error: "Unauthorized" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const [{ data: isAdmin, error: adminError }, { data: isOwner, error: ownerError }] = await Promise.all([
      supabase.rpc("has_role", { _user_id: user.id, _role: "admin" }),
      supabase.rpc("is_route_owner", { _route_id: routeId, _user_id: user.id }),
    ]);

    if (adminError) throw adminError;
    if (ownerError) throw ownerError;

    if (!isAdmin && !isOwner) {
      return new Response(JSON.stringify({ ok: false, error: "Du har ikke adgang til at optimere denne rute" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: route } = await supabase
      .from("routes")
      .select("*, businesses(address, zip_code, city)")
      .eq("id", routeId)
      .maybeSingle();
    if (!route) {
      return new Response(JSON.stringify({ ok: false, error: "Route not found" }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: rawStops } = await supabase
      .from("route_stops")
      .select("*")
      .eq("route_id", routeId)
      .order("sequence", { ascending: true });

    const allStopsRaw = (rawStops || []) as any[];
    const stopIds = allStopsRaw.map((s) => s.id);

    // Hent alle assignees for stops på denne rute
    const { data: assignees } = stopIds.length > 0
      ? await supabase
          .from("route_stop_assignees")
          .select("stop_id, employee_id, is_lead")
          .in("stop_id", stopIds)
      : { data: [] as any[] };

    const assigneesByStop = new Map<string, string[]>();
    (assignees || []).forEach((a: any) => {
      const arr = assigneesByStop.get(a.stop_id) || [];
      arr.push(a.employee_id);
      assigneesByStop.set(a.stop_id, arr);
    });

    const allStops: Stop[] = allStopsRaw.map((s) => ({
      id: s.id,
      customer_name: s.customer_name,
      address: s.address,
      latitude: s.latitude,
      longitude: s.longitude,
      duration_minutes: s.duration_minutes,
      time_window_start: s.time_window_start,
      time_window_end: s.time_window_end,
      required_staff: s.required_staff,
      assignee_ids: assigneesByStop.get(s.id) || [],
    }));

    const validStops = allStops.filter((s) => s.latitude != null && s.longitude != null);

    if (validStops.length < 1) {
      return new Response(JSON.stringify({
        ok: true, message: "Ingen stop med GPS at optimere", reordered: 0,
        total_km: 0, total_minutes: 0, provider: "none", reasoning: "Ingen stop at optimere",
      }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const start: LatLng = route.start_latitude && route.start_longitude
      ? { lat: Number(route.start_latitude), lng: Number(route.start_longitude) }
      : { lat: Number(validStops[0].latitude), lng: Number(validStops[0].longitude) };

    // Saml unikke "primær-ejere" pr. stop til gruppering: vi bruger et stops "anker-medarbejder"
    // = den første assignee (sorteret). Stops uden assignee samles i en utildelt-gruppe.
    // På den måde får hvert stop præcis én plads i sekvensen, men respekterer fulde assignee-listen.
    const ownerKey = (s: Stop) => s.assignee_ids.length > 0 ? s.assignee_ids.slice().sort().join("|") : "__unassigned__";

    const groups = new Map<string, Stop[]>();
    for (const s of validStops) {
      const k = ownerKey(s);
      const arr = groups.get(k) || [];
      arr.push(s);
      groups.set(k, arr);
    }

    const startTime = route.planned_start_time || "08:00:00";
    let provider: "mapbox" | "osrm" | "haversine" = "haversine";

    type StopUpdate = {
      id: string;
      sequence: number;
      distance_to_next_km: number | null;
      travel_time_to_next_min: number | null;
      arrivalMin: number;       // minutter siden midnat (start-tid baseline)
      durationMin: number;
      assignees: string[];
    };
    const allUpdates: StopUpdate[] = [];
    let globalSeq = 0;

    const startMin = (() => {
      const [h, m] = startTime.split(":").map(Number);
      return h * 60 + m;
    })();

    for (const [, groupStops] of groups) {
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

      let order: number[];
      if (groupStops.length === 1) order = [1];
      else {
        order = nearestNeighbor(0, groupStops.length, costMatrix);
        order = twoOpt(order, costMatrix);
      }

      let cursorMin = startMin;
      for (let i = 0; i < order.length; i++) {
        const matIdx = order[i];
        const stop = groupStops[matIdx - 1];
        const prevMatIdx = i === 0 ? 0 : order[i - 1];
        const travelSec = costMatrix[prevMatIdx][matIdx];
        const travelMin = matrix ? Math.round(travelSec / 60) : Math.round((travelSec / 60) * (60 / 50));
        const distKm = matrix
          ? Number((matrix.distances[prevMatIdx][matIdx] / 1000).toFixed(2))
          : Number(haversine(coords[prevMatIdx], coords[matIdx]).toFixed(2));

        cursorMin += travelMin;
        // Snap ankomst til 15-min for ren visning
        const arrival = snap(cursorMin);
        cursorMin = arrival + stop.duration_minutes;

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
          sequence: 0, // sættes efter konflikt-resolver
          distance_to_next_km: toNextKm,
          travel_time_to_next_min: toNextMin,
          arrivalMin: arrival,
          durationMin: stop.duration_minutes,
          assignees: stop.assignee_ids,
        });
      }
    }

    // === Konflikt-resolver ===
    // Sortér efter ankomst, og for hver stop tjek mod hver af dets medarbejderes busy-intervaller.
    // Hvis konflikt: ryk stoppets ankomst til seneste blokerende slut, snappet til 15 min.
    // Dette garanterer at samme medarbejder aldrig har overlap, og co-assignees forbliver synkrone.
    allUpdates.sort((a, b) => a.arrivalMin - b.arrivalMin);

    type Busy = { start: number; end: number };
    const busyByEmp = new Map<string, Busy[]>();
    const ensure = (eid: string) => {
      let b = busyByEmp.get(eid);
      if (!b) { b = []; busyByEmp.set(eid, b); }
      return b;
    };
    // Utildelte stops "blokerer" ikke nogen medarbejder
    for (const u of allUpdates) {
      let arrival = u.arrivalMin;
      const dur = Math.max(u.durationMin, SLOT_MIN);
      if (u.assignees.length > 0) {
        // Find seneste konflikt-end på tværs af alle medarbejdere på dette stop
        let safety = 0;
        while (safety++ < 200) {
          const end = arrival + dur;
          let latestClashEnd: number | null = null;
          for (const eid of u.assignees) {
            for (const b of ensure(eid)) {
              if (arrival < b.end && end > b.start) {
                if (latestClashEnd == null || b.end > latestClashEnd) latestClashEnd = b.end;
              }
            }
          }
          if (latestClashEnd == null) break;
          arrival = ceilSnap(latestClashEnd);
        }
        for (const eid of u.assignees) {
          ensure(eid).push({ start: arrival, end: arrival + dur });
        }
      }
      u.arrivalMin = arrival;
    }

    // Sortér igen efter resolver (kan have flyttet rundt) og tildel sekvens
    allUpdates.sort((a, b) => a.arrivalMin - b.arrivalMin);
    allUpdates.forEach((u) => { u.sequence = globalSeq++; });

    // Stops uden GPS placeres til sidst
    const noGpsStops = allStops.filter((s) => s.latitude == null || s.longitude == null);
    const noGpsUpdates: StopUpdate[] = noGpsStops.map((s) => ({
      id: s.id,
      sequence: globalSeq++,
      distance_to_next_km: null,
      travel_time_to_next_min: null,
      arrivalMin: startMin,
      durationMin: s.duration_minutes,
      assignees: s.assignee_ids,
    }));

    const grandKm = allUpdates.reduce((sum, u) => sum + (u.distance_to_next_km || 0), 0);
    // Total varighed = fra første ankomst til sidste afgang
    const lastEnd = allUpdates.length > 0
      ? Math.max(...allUpdates.map((u) => u.arrivalMin + u.durationMin))
      : startMin;
    const grandMin = Math.max(0, lastEnd - startMin);

    const writes = [...allUpdates, ...noGpsUpdates];
    await Promise.all(writes.map((u) => {
      const arrivalIso = timeToDateIso(route.route_date, "00:00:00", u.arrivalMin);
      const departureIso = timeToDateIso(route.route_date, "00:00:00", u.arrivalMin + u.durationMin);
      return supabase.from("route_stops").update({
        sequence: u.sequence,
        distance_to_next_km: u.distance_to_next_km,
        travel_time_to_next_min: u.travel_time_to_next_min,
        planned_arrival: arrivalIso,
        planned_departure: departureIso,
      }).eq("id", u.id);
    }));

    await supabase.from("routes").update({
      optimized_at: new Date().toISOString(),
      total_distance_km: Number(grandKm.toFixed(2)),
      total_duration_minutes: grandMin,
    }).eq("id", routeId);

    const reasoning = `Optimeret pr. medarbejder-gruppe (${groups.size}) via ${
      provider === "mapbox" ? "Mapbox live trafik" : provider === "osrm" ? "OSRM" : "estimat"
    } + 2-opt + konflikt-resolver`;

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
