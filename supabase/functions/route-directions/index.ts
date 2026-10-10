import { createClient } from "npm:@supabase/supabase-js@2";
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

async function isSignedIn(req: Request): Promise<boolean> {
  const auth = req.headers.get("Authorization"); const url = Deno.env.get("SUPABASE_URL"); const anon = Deno.env.get("SUPABASE_ANON_KEY");
  if (!auth || !url || !anon) return false;
  try {
    const client = createClient(url, anon, { global: { headers: { Authorization: auth } }, auth: { persistSession: false } });
    const { data, error } = await client.auth.getUser();
    return !error && !!data.user;
  } catch { return false; }
}

/** Decodes a Google encoded polyline into [lng, lat] pairs (GeoJSON order). */
function decodePolyline(str: string): [number, number][] {
  const out: [number, number][] = []; let i = 0, lat = 0, lng = 0;
  while (i < str.length) {
    for (const axis of [0, 1]) {
      let shift = 0, result = 0, b: number;
      do { b = str.charCodeAt(i++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
      const d = result & 1 ? ~(result >> 1) : result >> 1;
      if (axis === 0) lat += d; else lng += d;
    }
    out.push([lng / 1e5, lat / 1e5]);
  }
  return out;
}

/** Google maneuver enum → OSRM-style type/modifier used by the HUD icons. */
function mapManeuver(m?: string): { type: string; modifier?: string } {
  switch (m) {
    case "DEPART": return { type: "depart" };
    case "STRAIGHT": return { type: "continue", modifier: "straight" };
    case "TURN_LEFT": return { type: "turn", modifier: "left" };
    case "TURN_RIGHT": return { type: "turn", modifier: "right" };
    case "TURN_SLIGHT_LEFT": return { type: "turn", modifier: "slight left" };
    case "TURN_SLIGHT_RIGHT": return { type: "turn", modifier: "slight right" };
    case "TURN_SHARP_LEFT": return { type: "turn", modifier: "sharp left" };
    case "TURN_SHARP_RIGHT": return { type: "turn", modifier: "sharp right" };
    case "UTURN_LEFT": case "UTURN_RIGHT": return { type: "turn", modifier: "uturn" };
    case "RAMP_LEFT": return { type: "off ramp", modifier: "left" };
    case "RAMP_RIGHT": return { type: "off ramp", modifier: "right" };
    case "FORK_LEFT": return { type: "fork", modifier: "left" };
    case "FORK_RIGHT": return { type: "fork", modifier: "right" };
    case "MERGE": return { type: "merge", modifier: "straight" };
    case "ROUNDABOUT_LEFT": return { type: "roundabout", modifier: "left" };
    case "ROUNDABOUT_RIGHT": return { type: "roundabout", modifier: "right" };
    case "ROUNDABOUT_STRAIGHT": return { type: "roundabout", modifier: "straight" };
    case "ROUNDABOUT_SLIGHT_LEFT": return { type: "roundabout", modifier: "slight left" };
    case "ROUNDABOUT_SLIGHT_RIGHT": return { type: "roundabout", modifier: "slight right" };
    case "ROUNDABOUT_SHARP_LEFT": return { type: "roundabout", modifier: "sharp left" };
    case "ROUNDABOUT_SHARP_RIGHT": return { type: "roundabout", modifier: "sharp right" };
    case "ROUNDABOUT_U_TURN": return { type: "roundabout", modifier: "uturn" };
    case "FERRY": case "FERRY_TRAIN": return { type: "notification" };
    default: return { type: "continue", modifier: "straight" };
  }
}
const secs = (d?: string) => (typeof d === "string" ? Math.round(parseFloat(d)) || 0 : 0);
const bearing = (a: [number, number], b: [number, number]) => {
  const r = Math.PI / 180, y = Math.sin((b[0] - a[0]) * r) * Math.cos(b[1] * r);
  const x = Math.cos(a[1] * r) * Math.sin(b[1] * r) - Math.sin(a[1] * r) * Math.cos(b[1] * r) * Math.cos((b[0] - a[0]) * r);
  return (Math.atan2(y, x) / r + 360) % 360;
};

/** Google Routes API (traffic-aware, Danish instructions). Own server key first, connector as fallback. */
async function googleDirections(coords: LatLng[]) {
  const own = Deno.env.get("GOOGLE_API_KEY");
  const lovable = Deno.env.get("LOVABLE_API_KEY");
  const conn = Deno.env.get("GOOGLE_MAPS_API_KEY");
  if (!own && !(lovable && conn)) return null;
  const wp = (c: LatLng) => ({ location: { latLng: { latitude: c.lat, longitude: c.lng } } });
  const body = JSON.stringify({
    origin: wp(coords[0]), destination: wp(coords[coords.length - 1]),
    intermediates: coords.slice(1, -1).map(wp),
    travelMode: "DRIVE", routingPreference: "TRAFFIC_AWARE", languageCode: "da", units: "METRIC",
    extraComputations: ["TRAFFIC_ON_POLYLINE"],
  });
  const fieldMask = "routes.distanceMeters,routes.duration,routes.staticDuration,routes.polyline.encodedPolyline,routes.travelAdvisory.speedReadingIntervals,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.polyline.encodedPolyline,routes.legs.steps.navigationInstruction,routes.legs.steps.startLocation,routes.legs.endLocation";
  const call = (useOwn: boolean) => fetch(
    useOwn ? "https://routes.googleapis.com/directions/v2:computeRoutes" : "https://connector-gateway.lovable.dev/google_maps/routes/directions/v2:computeRoutes",
    { method: "POST", body, signal: AbortSignal.timeout(10000), headers: {
      "Content-Type": "application/json", "X-Goog-FieldMask": fieldMask,
      ...(useOwn ? { "X-Goog-Api-Key": own! } : { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": conn! }),
    } },
  );
  try {
    let res = own ? await call(true) : await call(false);
    if (!res.ok && own && lovable && conn) { console.warn("Google Routes own key failed", res.status, await res.text()); res = await call(false); }
    if (!res.ok) { console.error("Google Routes failed", res.status, await res.text()); return null; }
    const json = await res.json();
    const route = json?.routes?.[0];
    if (!route?.polyline?.encodedPolyline) return null;
    const coordinates = decodePolyline(route.polyline.encodedPolyline);
    const distance = Number(route.distanceMeters ?? 0);
    const duration = secs(route.duration); const typical = secs(route.staticDuration);
    const ratio = typical > 0 ? duration / typical : 1;
    const steps: unknown[] = [];
    for (const leg of route.legs ?? []) {
      for (const st of leg.steps ?? []) {
        const geom = st.polyline?.encodedPolyline ? decodePolyline(st.polyline.encodedPolyline) : [];
        const loc = st.startLocation?.latLng;
        const m = mapManeuver(st.navigationInstruction?.maneuver);
        steps.push({
          distance_m: Number(st.distanceMeters ?? 0),
          duration_s: Math.round(secs(st.staticDuration) * ratio),
          name: "",
          maneuver: { ...m, instruction: st.navigationInstruction?.instructions,
            bearing_after: geom.length > 1 ? bearing(geom[0], geom[1]) : undefined,
            location: loc ? [loc.longitude, loc.latitude] : geom[0] },
          geometry: { type: "LineString", coordinates: geom },
        });
      }
      const end = leg.endLocation?.latLng;
      if (end) steps.push({ distance_m: 0, duration_s: 0, name: "", maneuver: { type: "arrive", location: [end.longitude, end.latitude] }, geometry: { type: "LineString", coordinates: [[end.longitude, end.latitude]] } });
    }
    return {
      geometry: { type: "LineString", coordinates }, distance_m: distance, duration_s: duration,
      duration_raw_s: typical || duration, duration_typical_s: typical || null, traffic_multiplier: ratio, base_multiplier: 1,
      override_applied: null, depart_at: new Date().toISOString(), depart_is_future: false, steps,
      traffic: (route.travelAdvisory?.speedReadingIntervals ?? []).map((t: Record<string, unknown>) => ({ start: Number(t.startPolylinePointIndex ?? 0), end: Number(t.endPolylinePointIndex ?? 0), speed: String(t.speed ?? "NORMAL") })),
      provider: "google" as const, alternatives_count: 1,
    };
  } catch (e) {
    console.error("Google Routes error", e);
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

    // Navigation legs (signed-in drivers, max 10 points) use Google Routes; planning stays on OSRM to bound cost.
    if (body?.navigation === true && trimmed.length <= 10 && await isSignedIn(req)) {
      const g = await googleDirections(trimmed);
      if (g) return new Response(JSON.stringify({ ok: true, ...g }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
