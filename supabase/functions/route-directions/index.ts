// Edge function: route-directions
// Returns Mapbox driving-traffic directions geometry (GeoJSON LineString)
// between an ordered list of waypoints. Falls back to a straight line when
// Mapbox is unavailable.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LatLng = { lat: number; lng: number };

async function mapboxDirections(coords: LatLng[], token: string) {
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordStr}` +
    `?geometries=geojson&overview=full&steps=true&language=da&voice_instructions=true&banner_instructions=true&access_token=${token}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const json = await r.json();
  const route = json?.routes?.[0];
  if (!route) return null;
  // Flatten steps across legs into a single ordered list with maneuver info
  type Step = {
    distance_m: number;
    duration_s: number;
    name: string;
    maneuver: {
      type: string;
      modifier?: string;
      instruction?: string;
      bearing_after?: number;
      bearing_before?: number;
      location: [number, number];
    };
    geometry?: { type: "LineString"; coordinates: [number, number][] };
  };
  const steps: Step[] = [];
  for (const leg of (route.legs || [])) {
    for (const s of (leg.steps || [])) {
      steps.push({
        distance_m: s.distance,
        duration_s: s.duration,
        name: s.name || "",
        maneuver: {
          type: s.maneuver?.type || "",
          modifier: s.maneuver?.modifier,
          instruction: s.maneuver?.instruction,
          bearing_after: s.maneuver?.bearing_after,
          bearing_before: s.maneuver?.bearing_before,
          location: s.maneuver?.location,
        },
        geometry: s.geometry,
      });
    }
  }
  return {
    geometry: route.geometry, // GeoJSON LineString
    distance_m: route.distance,
    duration_s: route.duration,
    steps,
    provider: "mapbox" as const,
  };
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

    const token = Deno.env.get("MAPBOX_ACCESS_TOKEN");
    if (token) {
      const dir = await mapboxDirections(trimmed, token);
      if (dir) {
        return new Response(JSON.stringify({ ok: true, ...dir }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
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
