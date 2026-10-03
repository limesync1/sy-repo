import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";
import postalTowns from "../_shared/postal-towns.json" with { type: "json" };

const BodySchema = z.object({ address: z.string().trim().min(4).max(300), suggestions: z.boolean().optional() });
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { ...corsHeaders, "Content-Type": "application/json" },
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const googleMapsApiKey = Deno.env.get("GOOGLE_MAPS_API_KEY");
    // Virksomhedens egen Google-servernøgle bruges først, så adresseopslag
    // virker på det egne domæne; ellers falder vi tilbage til forbindelsen.
    const ownGoogleKey = Deno.env.get("GOOGLE_API_KEY");
    if (!authHeader || !supabaseUrl || !anonKey) return json({ error: "Ikke logget ind" }, 401);
    if (!ownGoogleKey && (!lovableApiKey || !googleMapsApiKey)) return json({ error: "Adresseopslaget er ikke konfigureret" }, 503);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: "Ikke logget ind" }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Indtast en gyldig adresse" }, 400);

    const url = new URL(ownGoogleKey
      ? "https://maps.googleapis.com/maps/api/geocode/json"
      : "https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json");
    url.searchParams.set("address", parsed.data.address);
    url.searchParams.set("region", "dk");
    url.searchParams.set("components", "country:DK");
    url.searchParams.set("language", "da");
    if (ownGoogleKey) url.searchParams.set("key", ownGoogleKey);
    const response = await fetch(url, ownGoogleKey ? undefined : {
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": googleMapsApiKey ?? "",
      },
    });

    if (response.status === 403) {
      const details = await response.json().catch(() => ({}));
      const reason = details?.error?.details?.find((item: { reason?: string }) => item.reason)?.reason;
      if (reason === "API_KEY_HTTP_REFERRER_BLOCKED") return json({ error: "Google Maps-servernøglen er begrænset til websites" }, 503);
      if (reason === "API_KEY_SERVICE_BLOCKED") return json({ error: "Geocoding API er ikke tilladt på Google Maps-forbindelsen" }, 503);
      return json({ error: "Google Maps afviste adresseopslaget" }, 503);
    }
    if (!response.ok) {
      const details = await response.text();
      console.error(`Google geocoding failed [${response.status}]: ${details}`);
      return json({ error: "Adressetjenesten svarer ikke lige nu" }, response.status >= 500 ? 503 : 502);
    }

    const payload = await response.json();
    // Google svarer 200 med en status-tekst, når selve nøglen afvises.
    const status = typeof payload?.status === "string" ? payload.status : "OK";
    if (status === "REQUEST_DENIED") {
      const message = String(payload?.error_message ?? "");
      console.error(`Google geocoding denied: ${message}`);
      if (/referer|referrer/i.test(message)) return json({ error: "Google-nøglen er begrænset til websites — sæt 'Application restrictions' til 'None' for servernøglen" }, 503);
      if (/not authorized|not activated|not enabled/i.test(message)) return json({ error: "Geocoding API er ikke slået til for Google-nøglen" }, 503);
      if (/billing/i.test(message)) return json({ error: "Fakturering er ikke slået til i Google Cloud" }, 503);
      return json({ error: "Google afviste adresseopslaget" }, 503);
    }
    if (status === "OVER_QUERY_LIMIT" || status === "UNKNOWN_ERROR") return json({ error: "Adressetjenesten svarer ikke lige nu" }, 503);
    const result = Array.isArray(payload?.results) ? payload.results[0] : null;
    const location = result?.geometry?.location;
    if (!result || typeof location?.lat !== "number" || typeof location?.lng !== "number") return json(parsed.data.suggestions ? { suggestions: [] } : { found: false });

    if (parsed.data.suggestions) {
      const suggestions = (Array.isArray(payload.results) ? payload.results : []).slice(0, 5).flatMap((hit: any) => {
        const parts = hit.address_components ?? [];
        const part = (type: string) => parts.find((p: any) => p.types?.includes(type))?.long_name ?? "";
        const loc = hit.geometry?.location;
        if (!part("route") || !part("street_number") || !part("postal_code") || part("country") !== "Danmark" && part("country") !== "Denmark" || hit.partial_match || hit.geometry?.location_type === "APPROXIMATE" || typeof loc?.lat !== "number" || typeof loc?.lng !== "number") return [];
        // Use exact known mailing towns, never user-supplied town guesses.
        const city = (postalTowns as Record<string, string>)[part("postal_code")] || part("postal_town") || part("locality");
        return [{ address: `${part("route")} ${part("street_number")}`, zip_code: part("postal_code"), city, latitude: loc.lat, longitude: loc.lng }];
      });
      return json({ suggestions });
    }

    // Google falder tilbage til et løst land-/by-niveau match (fx hele Danmark)
    // når gade/husnummer ikke findes. Det giver et "fund" med helt forkerte
    // koordinater, så vi afviser lave præcisionsniveauer og rene administrative
    // matches i stedet for at vise et misvisende punkt på kortet.
    const components: Array<{ types?: string[] }> = Array.isArray(result.address_components) ? result.address_components : [];
    const hasStreetLevelMatch = components.some((c) => Array.isArray(c.types) && (c.types.includes("route") || c.types.includes("street_address") || c.types.includes("premise") || c.types.includes("subpremise")));
    const locationType = result.geometry?.location_type;
    const isPreciseEnough = hasStreetLevelMatch && locationType !== "APPROXIMATE";
    if (!isPreciseEnough) return json({ found: false });

    return json({ found: true, latitude: location.lat, longitude: location.lng, matched_address: result.formatted_address ?? parsed.data.address });
  } catch (error) {
    console.error("employee-route-geocode failed", error);
    return json({ error: "Adresseopslaget mislykkedes" }, 500);
  }
});