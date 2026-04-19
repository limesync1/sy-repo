// AI-drevet ruteoptimering + ægte trafik-baserede køretider via OSRM
// Bruger OSRM Demo Server til kørselsmatrix (gratis, OSM-baseret)
// AI bestemmer rækkefølgen — OSRM beregner præcise distancer/tider
// Falder tilbage til haversine hvis OSRM fejler

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

// Haversine fallback
function haversine(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// OSRM table service: returns durations (sec) + distances (m) matrix between all coords
// API: https://project-osrm.org/docs/v5.24.0/api/#table-service
async function osrmMatrix(coords: LatLng[]): Promise<{ durations: number[][]; distances: number[][] } | null> {
  if (coords.length < 2) return null;
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  const url = `https://router.project-osrm.org/table/v1/driving/${coordStr}?annotations=duration,distance`;
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!resp.ok) return null;
    const json = await resp.json();
    if (json.code !== "Ok") return null;
    return { durations: json.durations, distances: json.distances };
  } catch (e) {
    console.warn("OSRM matrix failed:", e);
    return null;
  }
}

// Nearest-neighbor heuristic using a duration matrix (or haversine fallback)
function nearestNeighborWithMatrix(
  startIdx: number,
  stops: Stop[],
  durations: number[][] | null,
  startCoord: LatLng,
): string[] {
  // Build cost helper: from index i (0 = start, 1..n = stops) to stop j (0..n-1)
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
      .select("*, employees(home_latitude, home_longitude, home_address)")
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
    if (validStops.length < 2) {
      return new Response(JSON.stringify({ ok: true, message: "Ikke nok stop at optimere", reordered: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const start: LatLng = route.start_latitude && route.start_longitude
      ? { lat: Number(route.start_latitude), lng: Number(route.start_longitude) }
      : route.employees?.home_latitude && route.employees?.home_longitude
        ? { lat: Number(route.employees.home_latitude), lng: Number(route.employees.home_longitude) }
        : { lat: Number(validStops[0].latitude), lng: Number(validStops[0].longitude) };

    // Fetch OSRM matrix for [start, stop1, stop2, ...] for accurate driving times
    const allCoords: LatLng[] = [start, ...validStops.map((s) => ({ lat: Number(s.latitude), lng: Number(s.longitude) }))];
    const matrix = await osrmMatrix(allCoords);
    const usingOsrm = !!matrix;

    let optimizedOrder: string[] = nearestNeighborWithMatrix(0, validStops, matrix?.durations || null, start);
    let reasoning = usingOsrm
      ? "Optimeret med nearest-neighbor + OSRM trafik-data"
      : "Optimeret med haversine-tilnærmelse (OSRM ikke tilgængelig)";

    if (useAI) {
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
                reasoning = (args.reasoning || "AI-optimeret") + (usingOsrm ? " · OSRM køretider" : "");
              }
            }
          }
        } catch (e) { console.error("AI optimization failed:", e); }
      }
    }

    // Compute precise per-leg distances + times using OSRM matrix (or fallback)
    const idxOf = (id: string) => validStops.findIndex((s) => s.id === id);
    let totalKm = 0, totalMin = 0;
    const updates: { id: string; sequence: number; distance_to_next_km: number | null; travel_time_to_next_min: number | null }[] = [];
    for (let i = 0; i < optimizedOrder.length; i++) {
      const curIdx = idxOf(optimizedOrder[i]);
      const cur = validStops[curIdx];
      let distKm: number | null = null, travelMin: number | null = null;
      if (i < optimizedOrder.length - 1) {
        const nextIdx = idxOf(optimizedOrder[i + 1]);
        if (matrix) {
          // matrix index = stop_idx + 1
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
        totalKm += distKm || 0;
        totalMin += travelMin || 0;
      }
      totalMin += cur.duration_minutes;
      updates.push({ id: cur.id, sequence: i, distance_to_next_km: distKm, travel_time_to_next_min: travelMin });
    }

    await Promise.all(updates.map((u) =>
      supabase.from("route_stops").update({
        sequence: u.sequence,
        distance_to_next_km: u.distance_to_next_km,
        travel_time_to_next_min: u.travel_time_to_next_min,
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
      used_osrm: usingOsrm,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("optimize-route error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
