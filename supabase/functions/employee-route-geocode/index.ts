import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.25.76";

const BodySchema = z.object({ address: z.string().trim().min(4).max(300) });
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
    if (!authHeader || !supabaseUrl || !anonKey) return json({ error: "Ikke logget ind" }, 401);
    if (!lovableApiKey || !googleMapsApiKey) return json({ error: "Adresseopslaget er ikke konfigureret" }, 503);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) return json({ error: "Ikke logget ind" }, 401);

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) return json({ error: "Indtast en gyldig adresse" }, 400);

    const url = new URL("https://connector-gateway.lovable.dev/google_maps/maps/api/geocode/json");
    url.searchParams.set("address", parsed.data.address);
    url.searchParams.set("region", "dk");
    url.searchParams.set("language", "da");
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "X-Connection-Api-Key": googleMapsApiKey,
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
    const result = Array.isArray(payload?.results) ? payload.results[0] : null;
    const location = result?.geometry?.location;
    if (!result || typeof location?.lat !== "number" || typeof location?.lng !== "number") return json({ found: false });
    return json({ found: true, latitude: location.lat, longitude: location.lng, matched_address: result.formatted_address ?? parsed.data.address });
  } catch (error) {
    console.error("employee-route-geocode failed", error);
    return json({ error: "Adresseopslaget mislykkedes" }, 500);
  }
});