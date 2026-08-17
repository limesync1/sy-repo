// Nightly safety-net cron: ensures each active base route has at most
// one prepared future occurrence. The actual one-ahead rule lives in
// `materialize_next_occurrence_for_base_route` (SQL).
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  // Kun kaldbar af cron/serveren med delt hemmelighed.
  const authHeader = req.headers.get("Authorization") || "";
  const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
  const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  const authorized =
    (!!CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) ||
    (!!SERVICE_KEY && authHeader === `Bearer ${SERVICE_KEY}`);
  if (!authorized) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data, error } = await supabase.rpc("materialize_next_for_all_base_routes" as any);
    if (error) throw error;
    return new Response(
      JSON.stringify({ ok: true, prepared: data ?? 0 }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message ?? String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});