// Edge function: route-directions
// Returns key-free OSRM driving directions geometry (GeoJSON LineString)
// between an ordered list of waypoints. Falls back to a straight line when
// the public routing service is unavailable.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LatLng = { lat: number; lng: number };

/**
 * Dansk trafikbuffer oven på OSRM's trafikfri tider (ingen API-nøgle).
 * Basis 1.18, korte ture 1.25, myldretid hverdage 07–09 og 15–17:30 op til 1.35.
 */
function trafficMultiplier(at: Date, distanceKm: number): number {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Europe/Copenhagen", weekday: "short", hour: "2-digit", minute: "2-digit", hour12: false,
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const weekend = get("weekday") === "Sat" || get("weekday") === "Sun";
  const minutes = Number(get("hour")) * 60 + Number(get("minute"));
  const morningRush = minutes >= 7 * 60 && minutes < 9 * 60;
  const eveningRush = minutes >= 15 * 60 && minutes < 17 * 60 + 30;
  let m = distanceKm < 10 ? 1.25 : 1.18;
  if (!weekend && (morningRush || eveningRush)) m = Math.max(m, distanceKm < 10 ? 1.35 : 1.32);
  return m;
}

/** Nøglefri vejvisning med rigtig vejgeometri og manøvrer. */
async function osrmDirections(coords: LatLng[]) {
  try {
    const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coordStr}?overview=full&geometries=geojson&steps=true&alternatives=true`;
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) return null;
    const json = await response.json();
    if (json?.code !== "Ok" || !Array.isArray(json.routes) || json.routes.length === 0) return null;
    const route = json.routes.reduce(
      (best: Record<string, unknown>, candidate: Record<string, unknown>) =>
        Number(candidate.duration) < Number(best.duration) ? candidate : best,
      json.routes[0],
    );
    const steps = (Array.isArray(route.legs) ? route.legs : []).flatMap((leg: Record<string, unknown>) =>
      (Array.isArray(leg.steps) ? leg.steps : []).map((step: Record<string, unknown>) => {
        const maneuver = (step.maneuver ?? {}) as Record<string, unknown>;
        return {
          distance_m: Number(step.distance ?? 0),
          duration_s: Number(step.duration ?? 0),
          name: typeof step.name === "string" ? step.name : "",
          maneuver: {
            type: typeof maneuver.type === "string" ? maneuver.type : "turn",
            modifier: typeof maneuver.modifier === "string" ? maneuver.modifier : undefined,
            instruction: typeof maneuver.instruction === "string" ? maneuver.instruction : undefined,
            bearing_after: typeof maneuver.bearing_after === "number" ? maneuver.bearing_after : undefined,
            bearing_before: typeof maneuver.bearing_before === "number" ? maneuver.bearing_before : undefined,
            location: Array.isArray(maneuver.location) ? maneuver.location : undefined,
          },
          geometry: step.geometry,
        };
      })
    );
    const rawDuration = Number(route.duration ?? 0);
    const distanceKm = Number(route.distance ?? 0) / 1000;
    const departAt = new Date();
    const multiplier = trafficMultiplier(departAt, distanceKm);
    for (const s of steps) s.duration_s = Math.round(s.duration_s * multiplier);
    return {
      geometry: route.geometry,
      distance_m: Number(route.distance ?? 0),
      duration_s: Math.round(rawDuration * multiplier),
      duration_raw_s: rawDuration,
      duration_typical_s: null,
      traffic_multiplier: multiplier,
      base_multiplier: 1,
      override_applied: null,
      depart_at: departAt.toISOString(),
      depart_is_future: false,
      steps,
      provider: "osrm" as const,
      alternatives_count: json.routes.length,
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = await req.json();
    const wp: LatLng[] = body?.waypoints || [];
    if (!Array.isArray(wp) || wp.length < 2) {
      return new Response(JSON.stringify({ error: "Mindst 2 waypoints kræves" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const trimmed = wp.slice(0, 25).filter(
      (p) => typeof p?.lat === "number" && typeof p?.lng === "number",
    );
    if (trimmed.length < 2) {
      return new Response(JSON.stringify({ error: "Ugyldige koordinater" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const osrm = await osrmDirections(trimmed);
    if (osrm) {
      return new Response(JSON.stringify({ ok: true, ...osrm }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fallback: straight line
    return new Response(
      JSON.stringify({
        ok: true,
        provider: "fallback",
        geometry: {
          type: "LineString",
          coordinates: trimmed.map((p) => [p.lng, p.lat]),
        },
        distance_m: null,
        duration_s: null,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
