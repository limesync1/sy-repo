// Returns customer groups, product groups and income accounts from the
// connected accounting provider for the calling user's business — used to
// populate dropdowns in the UI.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeAdapter } from "../_shared/accounting/index.ts";
import { requireAuthenticatedUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAuthenticatedUser(req, Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    if ("error" in auth) return json({ error: auth.error }, auth.status);
    const supabase = auth.userClient;

    const body = await req.json().catch(() => ({}));
    const { business_id } = body ?? {};
    if (!business_id) return json({ error: "business_id required" }, 400);

    const { data: biz } = await supabase.from("businesses")
      .select("id, owner_id").eq("id", business_id).maybeSingle();
    if (!biz || biz.owner_id !== auth.userId) return json({ error: "Forbidden" }, 403);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: integ } = await admin.from("accounting_integrations")
      .select("*").eq("business_id", business_id).eq("is_active", true).maybeSingle();
    if (!integ) return json({ error: "No active integration" }, 404);

    const adapter = makeAdapter(integ.provider, integ as any, integ.settings ?? {});
    const groups = await adapter.listGroups().catch((e) => {
      console.warn("[accounting-list-groups] provider failed", e instanceof Error ? e.message : String(e));
      return { customer_groups: [], product_groups: [], income_accounts: [], labels: {} };
    });
    return json({ ok: true, ...groups });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}