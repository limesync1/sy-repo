// Daily accounting idempotency health-check.
// Runs `accounting_health_check_run()` which scans the last 30 days for:
//   - duplicate orders (same customer + day, both with accounting external_order_number)
//   - orders synced to provider but missing a local accounting_order_links row
//   - orphan link rows (link points to a deleted order)
// Findings are stored in `accounting_health_alerts` (platform-admin only).
// Triggered by pg_cron daily and surfaced in the admin Sundhed-tab.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const authHeader = req.headers.get("Authorization") || "";
  const ok =
    (CRON_SECRET && authHeader === `Bearer ${CRON_SECRET}`) ||
    authHeader === `Bearer ${SERVICE_KEY}`;
  if (!ok) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await admin.rpc("accounting_health_check_run" as any);
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, result: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});