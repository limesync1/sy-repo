import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cleanAccountingSettings, clearAccountingRuntimeState } from "../_shared/accounting/state.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const PROVIDERS = new Set(["economic", "billy", "dinero", "zenegy"]);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await userClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const { action, business_id } = body ?? {};
    if (!business_id) return json({ error: "business_id required" }, 400);

    const { data: biz } = await userClient
      .from("businesses")
      .select("id, owner_id")
      .eq("id", business_id)
      .maybeSingle();
    if (!biz || biz.owner_id !== user.id) return json({ error: "Forbidden" }, 403);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    if (action === "disconnect") {
      await clearAccountingRuntimeState(admin, business_id, "Nulstillet ved frakobling af regnskabsprogram");
      await admin.from("accounting_integrations").delete().eq("business_id", business_id);
      return json({ ok: true });
    }

    if (action === "save") {
      const provider = String(body?.provider ?? "");
      if (!PROVIDERS.has(provider)) return json({ error: "Unknown provider" }, 400);

      await clearAccountingRuntimeState(admin, business_id, "Nulstillet ved tilkobling/skift af regnskabsprogram");
      const settings = cleanAccountingSettings(body?.settings as Record<string, unknown> | null);
      const payload = {
        business_id,
        provider,
        is_active: true,
        api_token: body?.api_token || null,
        api_secret: body?.api_secret || null,
        agreement_number: body?.agreement_number || null,
        organization_id: body?.organization_id || null,
        settings,
        last_error: null,
        last_error_at: null,
        consecutive_failures: 0,
        paused_until: null,
        last_kick_at: null,
      };
      const { error } = await admin
        .from("accounting_integrations")
        .upsert(payload, { onConflict: "business_id" });
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: "Unknown action" }, 400);
  } catch (e) {
    console.error("[accounting-integration-state] error", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});