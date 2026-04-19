// Edge function: route-directions
// Returns Mapbox driving-traffic directions geometry (GeoJSON LineString)
// between an ordered list of waypoints. Falls back to a straight line when
// Mapbox is unavailable.

import { corsHeaders } from "@supabase/supabase-js/cors";

type LatLng = { lat: number; lng: number };

type ReqBody = {
  waypoints: LatLng[]; // 2..25 in order
};

async function mapboxDirections(coords: LatLng[], token: string) {
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordStr}` +
    `?geometries=geojson&overview=full&steps=false&access_token=${token}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const json = await r.json();
  const route = json?.routes?.[0];
  if (!route) return null;
  return {
    geometry: route.geometry, // GeoJSON LineString
    distance_m: route.distance,
    duration_s: route.duration,
    provider: "mapbox" as const,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const body = (await req.json()) as ReqBody;
    const wp = body.waypoints || [];
    if (!Array.isArray(wp) || wp.length < 2) {
      return new Response(JSON.stringify({ error: "Mindst 2 waypoints kræves" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const trimmed = wp.slice(0, 25);
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
