import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Leverer virksomhedens referrer-begrænsede Google Maps-browsernøgle til
// indloggede brugere. Nøglen er offentlig af natur (den sendes alligevel i
// kortets script-URL) og beskyttes af Google Clouds website-regler; den
// holdes blot ude af koden, så den kan skiftes uden ny udgivelse.
const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extra },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST" && req.method !== "GET") return json({ error: "Method not allowed" }, 405);
  try {
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    if (!authHeader || !supabaseUrl || !anonKey) return json({ error: "Ikke logget ind" }, 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error } = await authClient.auth.getUser();
    if (error || !user) return json({ error: "Ikke logget ind" }, 401);

    const key = Deno.env.get("SERVICEYDERE_MAPS_BROWSER_KEY")?.trim();
    // Vector map ID enables Google Maps' own heading-up/tilt navigation camera.
    const mapId = Deno.env.get("SERVICEYDERE_MAPS_MAP_ID")?.trim() || "DEMO_MAP_ID";
    if (!key) return json({ key: null, mapId, reason: "not-configured" });
    return json({ key, mapId }, 200, { "Cache-Control": "private, max-age=3600" });
  } catch (err) {
    console.error("google-maps-browser-key failed:", err);
    return json({ error: "Kortnøglen kunne ikke hentes" }, 500);
  }
});
