// Daily cron: creates new pending orders for recurring agreements whose
// next_service_date has been reached. Idempotent via uq_orders_parent_cycle.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";
    const authHeader = req.headers.get("Authorization") || "";
    const ok = CRON_SECRET && (authHeader === `Bearer ${CRON_SECRET}` || authHeader === `Bearer ${SERVICE_KEY}`);
    if (!ok) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data, error } = await admin.rpc("auto_recur_due_orders");
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true, created: (data ?? []).length, items: data ?? [] }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("recurring-orders error", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});