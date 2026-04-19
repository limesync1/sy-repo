// AI-drevet ruteoptimering + ægte trafik-baserede køretider via Mapbox Directions Matrix API
// AI bestemmer rækkefølgen — Mapbox beregner præcise distancer/tider med live trafik
// Falder tilbage til OSRM Demo, derefter haversine hvis begge fejler

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

// Mapbox Directions Matrix API — supports up to 25 coords, gives traffic-aware durations
async function mapboxMatrix(coords: LatLng[]): Promise<Matrix | null> {
  const token = Deno.env.get("MAPBOX_ACCESS_TOKEN");
  if (!token || coords.length < 2 || coords.length > 25) return null;
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  // driving-traffic = live trafik-data (peak hours, current congestion)
  const url = `https://api.mapbox.com/directions-matrix/v1/mapbox/driving-traffic/${coordStr}?annotations=duration,distance&access_token=${token}`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) {
      console.warn("Mapbox matrix HTTP", resp.status, await resp.text().catch(() => ""));
      return null;
    }
    const json = await resp.json();
    if (!json.durations || !json.distances) return null;
    return { durations: json.durations, distances: json.distances, provider: "mapbox" };
  } catch (e) {
    console.warn("Mapbox matrix failed:", e);
    return null;
  }
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
  } catch (e) {
    console.warn("OSRM matrix failed:", e);
    return null;
  }
}

function nearestNeighborWithMatrix(
  startIdx: number,
  stops: Stop[],
  durations: number[][] | null,
  startCoord: LatLng,
): string[] {
  const cost = (fromIdx: number, toStopIdx: number): number => {
    if (durations) return durations[fromIdx][toStopIdx + 1];
    const from = fromIdx === 0 ? startCoord : { lat: stops[fromIdx - 1].latitude!, lng: stops[fromIdx - 1].longitude! };
    const to = { lat: stops[toStopIdx].latitude!, lng: stops[toStopIdx].longitude! };
    return haversine(from, to);
  };
  const remaining = stops.map((_, i) => i);
  const order: string[] = [];
  let cur = startIdx;
  while (remaining.length) {
    let best = remaining[0];
    let bestCost = cost(cur, best);
    for (const i of remaining) {
      const c = cost(cur, i);
      if (c < bestCost) { bestCost = c; best = i; }
    }
    order.push(stops[best].id);
    remaining.splice(remaining.indexOf(best), 1);
    cur = best + 1;
  }
  return order;
}

// Add minutes to "HH:mm:ss" → ISO datetime on given date
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
    const useAI = body.use_ai !== false;
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
      .from("route_stops").select("*").eq("route_id", routeId).order("sequence", { ascending: true });
    const validStops = ((stops || []) as Stop[]).filter((s) => s.latitude != null && s.longitude != null);
    if (validStops.length < 1) {
      return new Response(JSON.stringify({ ok: true, message: "Ingen stop med GPS at optimere", reordered: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Start address: route.start_* OR business address (always from business now)
    const start: LatLng = route.start_latitude && route.start_longitude
      ? { lat: Number(route.start_latitude), lng: Number(route.start_longitude) }
      : { lat: Number(validStops[0].latitude), lng: Number(validStops[0].longitude) };

    const allCoords: LatLng[] = [start, ...validStops.map((s) => ({ lat: Number(s.latitude), lng: Number(s.longitude) }))];

    // Try Mapbox first (real-time traffic), then OSRM, then haversine
    let matrix: Matrix | null = await mapboxMatrix(allCoords);
    if (!matrix) matrix = await osrmMatrix(allCoords);
    const provider = matrix?.provider || "haversine";

    let optimizedOrder: string[] = validStops.length >= 2
      ? nearestNeighborWithMatrix(0, validStops, matrix?.durations || null, start)
      : [validStops[0].id];
    let reasoning = `Optimeret med nearest-neighbor + ${provider === "mapbox" ? "Mapbox live trafik" : provider === "osrm" ? "OSRM" : "haversine"}`;

    if (useAI && validStops.length >= 2) {
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (apiKey) {
        try {
          const stopsForAI = validStops.map((s, i) => ({
            id: s.id, name: s.customer_name, address: s.address,
            duration_min: s.duration_minutes,
            window_start: s.time_window_start, window_end: s.time_window_end,
            travel_min_from_start: matrix ? Math.round(matrix.durations[0][i + 1] / 60) : null,
          }));

          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                { role: "system", content: "Du er ekspert i ruteoptimering. Minimerer total køretid mens tidsvinduer respekteres. Returnér via tool-call." },
                { role: "user", content: `Optimér rute. Start ${route.planned_start_time || "08:00"}.\nStop:\n${JSON.stringify(stopsForAI, null, 2)}` },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "set_route_order",
                  parameters: {
                    type: "object",
                    properties: {
                      order: { type: "array", items: { type: "string" } },
                      reasoning: { type: "string" },
                    },
                    required: ["order", "reasoning"], additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "set_route_order" } },
            }),
          });
          if (aiResp.ok) {
            const aiJson = await aiResp.json();
            const tc = aiJson.choices?.[0]?.message?.tool_calls?.[0];
            if (tc) {
              const args = JSON.parse(tc.function.arguments);
              if (Array.isArray(args.order) && args.order.length > 0) {
                const aiOrder = args.order.filter((id: string) => validStops.some((s) => s.id === id));
                for (const s of validStops) if (!aiOrder.includes(s.id)) aiOrder.push(s.id);
                optimizedOrder = aiOrder;
                reasoning = (args.reasoning || "AI-optimeret") + ` · ${provider === "mapbox" ? "Mapbox trafik" : provider === "osrm" ? "OSRM" : "haversine"}`;
              }
            }
          }
        } catch (e) { console.error("AI optimization failed:", e); }
      }
    }

    // Compute precise per-leg distances + times + ETA per stop
    const idxOf = (id: string) => validStops.findIndex((s) => s.id === id);
    const startTime = route.planned_start_time || "08:00:00";
    let totalKm = 0, totalMin = 0;
    let cursorMin = 0; // minutes since startTime
    // Add initial drive from start to first stop
    if (matrix && optimizedOrder.length > 0) {
      const firstIdx = idxOf(optimizedOrder[0]);
      cursorMin += Math.round(matrix.durations[0][firstIdx + 1] / 60);
      totalKm += matrix.distances[0][firstIdx + 1] / 1000;
      totalMin += Math.round(matrix.durations[0][firstIdx + 1] / 60);
    }

    type Update = {
      id: string; sequence: number;
      distance_to_next_km: number | null;
      travel_time_to_next_min: number | null;
      planned_arrival: string;
      planned_departure: string;
    };
    const updates: Update[] = [];

    for (let i = 0; i < optimizedOrder.length; i++) {
      const curIdx = idxOf(optimizedOrder[i]);
      const cur = validStops[curIdx];
      const arrivalIso = timeToDateIso(route.route_date, startTime, cursorMin);
      cursorMin += cur.duration_minutes;
      const departureIso = timeToDateIso(route.route_date, startTime, cursorMin);
      totalMin += cur.duration_minutes;

      let distKm: number | null = null, travelMin: number | null = null;
      if (i < optimizedOrder.length - 1) {
        const nextIdx = idxOf(optimizedOrder[i + 1]);
        if (matrix) {
          travelMin = Math.round(matrix.durations[curIdx + 1][nextIdx + 1] / 60);
          distKm = Number((matrix.distances[curIdx + 1][nextIdx + 1] / 1000).toFixed(2));
        } else {
          const next = validStops[nextIdx];
          distKm = Number(haversine(
            { lat: Number(cur.latitude), lng: Number(cur.longitude) },
            { lat: Number(next.latitude), lng: Number(next.longitude) },
          ).toFixed(2));
          travelMin = Math.round((distKm / 50) * 60);
        }
        cursorMin += travelMin || 0;
        totalKm += distKm || 0;
        totalMin += travelMin || 0;
      }

      updates.push({
        id: cur.id, sequence: i,
        distance_to_next_km: distKm, travel_time_to_next_min: travelMin,
        planned_arrival: arrivalIso, planned_departure: departureIso,
      });
    }

    await Promise.all(updates.map((u) =>
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
      total_distance_km: Number(totalKm.toFixed(2)),
      total_duration_minutes: totalMin,
    }).eq("id", routeId);

    return new Response(JSON.stringify({
      ok: true, reasoning, reordered: optimizedOrder.length,
      total_km: Number(totalKm.toFixed(2)), total_minutes: totalMin,
      provider,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("optimize-route error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
