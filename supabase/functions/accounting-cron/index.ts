// Hourly cron: drains queue for all active integrations, then pulls from each provider.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CRON_SECRET = Deno.env.get("CRON_SECRET") || "";

Deno.serve(async (req) => {
  const authHeader = req.headers.get("Authorization") || "";
  const ok = CRON_SECRET && (authHeader === `Bearer ${CRON_SECRET}` || authHeader === `Bearer ${SERVICE_KEY}`);
  if (!ok) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401, headers: { "Content-Type": "application/json" },
    });
  }
  const admin = createClient(SUPABASE_URL, SERVICE_KEY);
  const { data: integrations } = await admin
    .from("accounting_integrations").select("business_id").eq("is_active", true);

  const results: any[] = [];
  for (const i of integrations ?? []) {
    try {
      const r1 = await fetch(`${SUPABASE_URL}/functions/v1/accounting-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ business_id: i.business_id, mode: "queue", internal_mode: true }),
      }).then(r => r.json()).catch(e => ({ error: String(e) }));
      const r2 = await fetch(`${SUPABASE_URL}/functions/v1/accounting-sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${SERVICE_KEY}` },
        body: JSON.stringify({ business_id: i.business_id, mode: "pull", internal_mode: true }),
      }).then(r => r.json()).catch(e => ({ error: String(e) }));
      results.push({ business_id: i.business_id, queue: r1, pull: r2 });
    } catch (e) {
      results.push({ business_id: i.business_id, error: e instanceof Error ? e.message : String(e) });
    }
  }
  return new Response(JSON.stringify({ ok: true, results }), {
    headers: { "Content-Type": "application/json" },
  });
});