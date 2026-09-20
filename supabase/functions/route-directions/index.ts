// Edge function: route-directions
// Returns key-free OSRM driving directions geometry (GeoJSON LineString)
// between an ordered list of waypoints. Falls back to a straight line when
// the public routing service is unavailable.

import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type LatLng = { lat: number; lng: number };

type Override = {
  zip_prefix: string;
  multiplier: number;
  label: string | null;
  hour_start: number | null;
  hour_end: number | null;
  weekdays_only: boolean;
};

/** Reverse-geocode et koordinat → dansk postnummer via Mapbox places. */
async function lookupZip(lat: number, lng: number, token: string): Promise<string | null> {
  try {
    const url =
      `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json` +
      `?country=dk&types=postcode&limit=1&access_token=${token}`;
    const r = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!r.ok) return null;
    const json = await r.json();
    const zip = json?.features?.[0]?.text;
    return typeof zip === "string" ? zip : null;
  } catch {
    return null;
  }
}

/** Match en zip mod listen af overrides (længste prefix vinder). Returnerer
 *  den højeste relevante multiplikator (mest konservative ETA). */
function matchOverride(
  zip: string | null,
  overrides: Override[],
  localTime: Date,
): { mult: number; label: string | null; zip: string | null } | null {
  if (!zip || overrides.length === 0) return null;
  const hour = localTime.getHours() + localTime.getMinutes() / 60;
  const day = localTime.getDay();
  const isWeekend = day === 0 || day === 6;

  const candidates = overrides
    .filter((o) => zip.startsWith(o.zip_prefix))
    .filter((o) => !o.weekdays_only || !isWeekend)
    .filter((o) => {
      if (o.hour_start == null || o.hour_end == null) return true;
      // Tidsvindue (24-timers, kan krydse midnat hvis end < start)
      return o.hour_end > o.hour_start
        ? hour >= o.hour_start && hour < o.hour_end
        : hour >= o.hour_start || hour < o.hour_end;
    });
  if (candidates.length === 0) return null;

  // Vælg længste zip-prefix-match (mest specifik), brug højeste multiplikator
  // ved tie.
  candidates.sort((a, b) => {
    const lenDiff = b.zip_prefix.length - a.zip_prefix.length;
    if (lenDiff !== 0) return lenDiff;
    return b.multiplier - a.multiplier;
  });
  const winner = candidates[0];
  return { mult: winner.multiplier, label: winner.label, zip };
}

/**
 * Realistisk trafik-buffer for danske veje. Mapbox' driving-traffic giver
 * ofte en for-optimistisk ETA fordi deres trafikdata for DK er tyndere
 * end Google Maps'. Vi lægger derfor en multiplikator oven på baseret på
 * tid-på-dag og turlængde, sådan at vores ETA ligger tættere på Google's.
 *
 * Multiplikatorer er kalibreret mod Google Maps for længere danske ruter
 * (Jylland↔Fyn, M40, M60), hvor vi typisk så 25–35% afvigelse i myldretid.
 */
function trafficMultiplier(departLocal: Date, distanceKm: number): number {
  const day = departLocal.getDay(); // 0=søn, 6=lør
  const hour = departLocal.getHours() + departLocal.getMinutes() / 60;
  const isWeekend = day === 0 || day === 6;

  // Basis-buffer for længere ture (motorvej / landevej, vejarbejde,
  // hastighedsbegrænsninger som Mapbox underestimerer).
  let mult = 1.18;

  if (!isWeekend) {
    // Morgen-myldretid 06:30–09:00
    if (hour >= 6.5 && hour < 9) mult = Math.max(mult, 1.32);
    // Eftermiddag-myldretid 14:30–17:30
    else if (hour >= 14.5 && hour < 17.5) mult = Math.max(mult, 1.35);
    // Aften-pendling 17:30–18:30
    else if (hour >= 17.5 && hour < 18.5) mult = Math.max(mult, 1.22);
  } else {
    // Weekend: udflugtstrafik fredag aften / søndag eftermiddag
    if (hour >= 11 && hour < 17) mult = Math.max(mult, 1.20);
  }

  // Korte byture (<10 km): trafiklys, parkering, byhastighed.
  if (distanceKm < 10) mult = Math.max(mult, 1.25);
  // Mellemlange: typisk landevej-mix.
  else if (distanceKm < 50) mult = Math.max(mult, 1.20);
  // Lange ture (>100 km): tæt på 1.18 — primært motorvej.

  return mult;
}

async function mapboxDirections(
  coords: LatLng[],
  token: string,
  departAt?: string,
  overrides: Override[] = [],
) {
  const coordStr = coords.map((c) => `${c.lng},${c.lat}`).join(";");
  // Vi henter ALTERNATIVES og vælger den rute med korteste *real-time* duration
  // (driving-traffic profilen). Det matcher hvordan Google Maps vælger den
  // hurtigste rute lige nu — ikke nødvendigvis den korteste i km.
  // annotations=congestion giver os live trafik-info pr. segment.
  const params = new URLSearchParams({
    geometries: "geojson",
    overview: "full",
    steps: "true",
    language: "da",
    voice_instructions: "true",
    banner_instructions: "true",
    alternatives: coords.length === 2 ? "true" : "false",
    annotations: "duration,distance,congestion,speed",
    access_token: token,
  });
  if (departAt) params.set("depart_at", departAt);
  const url =
    `https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${coordStr}` +
    `?${params.toString()}`;
  const r = await fetch(url);
  if (!r.ok) return null;
  const json = await r.json();
  const routes = json?.routes;
  if (!routes || routes.length === 0) return null;
  // Vælg ruten med den laveste duration (real-time trafik). Mapbox returnerer
  // som regel den hurtigste først, men ved alternatives kan en anden være bedre
  // pga. live-trafik der lige har ændret sig.
  const route = routes.reduce(
    (best: any, r: any) => (r.duration < best.duration ? r : best),
    routes[0],
  );
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
  // Anvend trafik-buffer på den rå Mapbox-tid.
  const departDate = departAt ? new Date(departAt) : new Date();
  // Konvertér til Europe/Copenhagen (UTC+1/+2). Simpel offset baseret på
  // måned — DK er sommertid sidste søn i marts → sidste søn i oktober.
  const m = departDate.getUTCMonth(); // 0-11
  const isDST = m >= 3 && m <= 9; // grov tilnærmelse
  const dkOffsetH = isDST ? 2 : 1;
  const localTime = new Date(departDate.getTime() + dkOffsetH * 3600 * 1000);
  const distanceKm = (route.distance ?? 0) / 1000;
  const baseMult = trafficMultiplier(localTime, distanceKm);

  // Slå destination's postnummer op (sidste waypoint) for at se om der er
  // en bruger-defineret override for området.
  let overrideMatch: { mult: number; label: string | null; zip: string | null } | null = null;
  if (overrides.length > 0) {
    const lastWp = coords[coords.length - 1];
    const zip = await lookupZip(lastWp.lat, lastWp.lng, token);
    overrideMatch = matchOverride(zip, overrides, localTime);
  }

  // Override har forrang over basis-multiplikator (men vi tager den højeste
  // af de to, så vi ikke ender med ETA der er kortere end basis-modellen).
  const mult = overrideMatch ? Math.max(baseMult, overrideMatch.mult) : baseMult;
  const adjustedDuration = route.duration * mult;
  const departIsFuture = departAt
    ? Math.abs(new Date(departAt).getTime() - Date.now()) > 5 * 60 * 1000
    : false;

  return {
    geometry: route.geometry, // GeoJSON LineString
    distance_m: route.distance,
    duration_s: adjustedDuration,
    // Rå Mapbox-tid uden vores DK-buffer (til debugging / sammenligning)
    duration_raw_s: route.duration,
    // duration_typical_s = uden trafik, hvis Mapbox returnerer det
    duration_typical_s: route.duration_typical ?? null,
    traffic_multiplier: mult,
    base_multiplier: baseMult,
    override_applied: overrideMatch
      ? { zip: overrideMatch.zip, label: overrideMatch.label, multiplier: overrideMatch.mult }
      : null,
    depart_at: departAt ?? new Date().toISOString(),
    depart_is_future: departIsFuture,
    steps,
    provider: "mapbox" as const,
    alternatives_count: routes.length,
  };
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
    return {
      geometry: route.geometry,
      distance_m: Number(route.distance ?? 0),
      duration_s: Number(route.duration ?? 0),
      duration_raw_s: Number(route.duration ?? 0),
      duration_typical_s: null,
      traffic_multiplier: 1,
      base_multiplier: 1,
      override_applied: null,
      depart_at: new Date().toISOString(),
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
    const departAt: string | undefined = typeof body?.depart_at === "string" ? body.depart_at : undefined;
    const businessId: string | undefined = typeof body?.business_id === "string" ? body.business_id : undefined;
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

    // Hent eventuelle overrides for denne business
    let overrides: Override[] = [];
    if (businessId) {
      try {
        const supaUrl = Deno.env.get("SUPABASE_URL");
        const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
        if (supaUrl && serviceKey) {
          const supa = createClient(supaUrl, serviceKey);
          const { data } = await supa
            .from("traffic_buffer_overrides")
            .select("zip_prefix,multiplier,label,hour_start,hour_end,weekdays_only")
            .eq("business_id", businessId)
            .eq("is_active", true);
          if (data) {
            overrides = data.map((d: Record<string, unknown>) => ({
              zip_prefix: String(d.zip_prefix),
              multiplier: Number(d.multiplier),
              label: (d.label as string) ?? null,
              hour_start: d.hour_start as number | null,
              hour_end: d.hour_end as number | null,
              weekdays_only: Boolean(d.weekdays_only),
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load traffic overrides:", err);
      }
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
