// AI-drevet ruteoptimering vha. Lovable AI Gateway
// Tager en liste af stop med koordinater + start-adresse og returnerer optimal rækkefølge
// Bruger nearest-neighbor som hurtig fallback hvis AI fejler

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

// Haversine distance in km
function haversine(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

// Nearest-neighbor heuristic — fast, deterministic, decent quality fallback
function nearestNeighborOrder(start: { lat: number; lng: number }, stops: Stop[]): string[] {
  const remaining = stops.filter((s) => s.latitude != null && s.longitude != null);
  const order: string[] = [];
  let current = start;
  while (remaining.length) {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const d = haversine(current, { lat: remaining[i].latitude!, lng: remaining[i].longitude! });
      if (d < bestDist) { bestDist = d; bestIdx = i; }
    }
    const picked = remaining.splice(bestIdx, 1)[0];
    order.push(picked.id);
    current = { lat: picked.latitude!, lng: picked.longitude! };
  }
  // Append any without coords at end (preserve their original order)
  for (const s of stops) if (!order.includes(s.id)) order.push(s.id);
  return order;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const routeId = String(body.route_id || "").trim();
    const useAI = body.use_ai !== false; // default true

    if (!routeId) {
      return new Response(JSON.stringify({ error: "route_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: route, error: rErr } = await supabase
      .from("routes")
      .select("*, employees(home_latitude, home_longitude, home_address)")
      .eq("id", routeId)
      .maybeSingle();
    if (rErr || !route) {
      return new Response(JSON.stringify({ error: "Route not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: stops, error: sErr } = await supabase
      .from("route_stops")
      .select("*")
      .eq("route_id", routeId)
      .order("sequence", { ascending: true });
    if (sErr) throw sErr;

    const validStops = (stops || []) as Stop[];
    if (validStops.length < 2) {
      return new Response(JSON.stringify({ ok: true, message: "Ikke nok stop at optimere", reordered: 0 }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine start point: route.start_lat/lng → employee.home_lat/lng → first stop
    const start = route.start_latitude && route.start_longitude
      ? { lat: Number(route.start_latitude), lng: Number(route.start_longitude) }
      : route.employees?.home_latitude && route.employees?.home_longitude
        ? { lat: Number(route.employees.home_latitude), lng: Number(route.employees.home_longitude) }
        : validStops[0].latitude && validStops[0].longitude
          ? { lat: Number(validStops[0].latitude), lng: Number(validStops[0].longitude) }
          : { lat: 56.0, lng: 10.0 }; // DK center fallback

    let optimizedOrder: string[] = nearestNeighborOrder(start, validStops);
    let reasoning = "Optimeret med nearest-neighbor heuristik";

    if (useAI) {
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (apiKey) {
        try {
          const stopsForAI = validStops
            .filter((s) => s.latitude != null && s.longitude != null)
            .map((s) => ({
              id: s.id,
              name: s.customer_name,
              address: s.address,
              lat: s.latitude,
              lng: s.longitude,
              duration_min: s.duration_minutes,
              window_start: s.time_window_start,
              window_end: s.time_window_end,
            }));

          const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "google/gemini-2.5-flash",
              messages: [
                {
                  role: "system",
                  content: "Du er en ekspert i ruteoptimering for danske serviceydere. Du minimerer total kørselstid mens du respekterer tidsvinduer og besøgslængde. Returnér ALTID via tool-call.",
                },
                {
                  role: "user",
                  content: `Optimér denne rute. Start fra: lat=${start.lat}, lng=${start.lng} kl. ${route.planned_start_time || "08:00"}.\n\nStop:\n${JSON.stringify(stopsForAI, null, 2)}`,
                },
              ],
              tools: [{
                type: "function",
                function: {
                  name: "set_route_order",
                  description: "Returnér optimal rækkefølge af stop-IDs",
                  parameters: {
                    type: "object",
                    properties: {
                      order: { type: "array", items: { type: "string" }, description: "stop-IDs i optimal rækkefølge" },
                      reasoning: { type: "string", description: "kort forklaring (max 200 tegn) på dansk" },
                    },
                    required: ["order", "reasoning"],
                    additionalProperties: false,
                  },
                },
              }],
              tool_choice: { type: "function", function: { name: "set_route_order" } },
            }),
          });

          if (aiResp.ok) {
            const aiJson = await aiResp.json();
            const toolCall = aiJson.choices?.[0]?.message?.tool_calls?.[0];
            if (toolCall) {
              const args = JSON.parse(toolCall.function.arguments);
              if (Array.isArray(args.order) && args.order.length > 0) {
                // Append any stops AI forgot (e.g. without coords) at the end
                const aiOrder = args.order.filter((id: string) => validStops.some((s) => s.id === id));
                for (const s of validStops) if (!aiOrder.includes(s.id)) aiOrder.push(s.id);
                optimizedOrder = aiOrder;
                reasoning = args.reasoning || "AI-optimeret";
              }
            }
          } else if (aiResp.status === 429) {
            reasoning = "AI rate-limit nået — brugte heuristik";
          } else if (aiResp.status === 402) {
            reasoning = "AI-credits opbrugt — brugte heuristik";
          }
        } catch (e) {
          console.error("AI optimization failed, using heuristic:", e);
        }
      }
    }

    // Compute distances + travel times between consecutive stops + total
    let totalKm = 0;
    let totalMin = 0;
    const updates: { id: string; sequence: number; distance_to_next_km: number | null; travel_time_to_next_min: number | null }[] = [];
    const orderedStops = optimizedOrder.map((id) => validStops.find((s) => s.id === id)!).filter(Boolean);
    let prev = start;
    for (let i = 0; i < orderedStops.length; i++) {
      const s = orderedStops[i];
      const next = i < orderedStops.length - 1 ? orderedStops[i + 1] : null;
      let distKm: number | null = null;
      let travelMin: number | null = null;
      if (s.latitude != null && s.longitude != null && next?.latitude != null && next?.longitude != null) {
        distKm = haversine({ lat: s.latitude, lng: s.longitude }, { lat: next.latitude, lng: next.longitude });
        travelMin = Math.round((distKm / 50) * 60); // assume 50 km/h average
        totalKm += distKm;
        totalMin += travelMin;
      }
      totalMin += s.duration_minutes;
      updates.push({
        id: s.id,
        sequence: i,
        distance_to_next_km: distKm != null ? Number(distKm.toFixed(2)) : null,
        travel_time_to_next_min: travelMin,
      });
      if (s.latitude != null && s.longitude != null) prev = { lat: s.latitude, lng: s.longitude };
    }

    // Bulk update
    for (const u of updates) {
      await supabase.from("route_stops").update({
        sequence: u.sequence,
        distance_to_next_km: u.distance_to_next_km,
        travel_time_to_next_min: u.travel_time_to_next_min,
      }).eq("id", u.id);
    }

    await supabase.from("routes").update({
      optimized_at: new Date().toISOString(),
      total_distance_km: Number(totalKm.toFixed(2)),
      total_duration_minutes: totalMin,
    }).eq("id", routeId);

    return new Response(JSON.stringify({
      ok: true,
      reasoning,
      reordered: optimizedOrder.length,
      total_km: Number(totalKm.toFixed(2)),
      total_minutes: totalMin,
    }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("optimize-route error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
