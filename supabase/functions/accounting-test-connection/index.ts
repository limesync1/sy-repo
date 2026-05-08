import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeAdapter } from "../_shared/accounting/index.ts";
import { requireAuthenticatedUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeToken(value: unknown): string | null {
  const cleaned = String(value ?? "")
    .trim()
    .replace(/^x-access-token\s*:\s*/i, "")
    .replace(/^bearer\s+/i, "")
    .replace(/[\u200B-\u200D\uFEFF\s]/g, "");
  return cleaned || null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = await requireAuthenticatedUser(req, Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    if ("error" in auth) return json({ error: auth.error }, auth.status);
    const supabase = auth.userClient;

    const body = await req.json();
    const { business_id, provider, api_token, api_secret, agreement_number, organization_id, settings } = body ?? {};
    if (!business_id || !provider) return json({ error: "Missing business_id/provider" }, 400);

    // Verify ownership
    const { data: biz } = await supabase
      .from("businesses").select("id, owner_id").eq("id", business_id).maybeSingle();
    if (!biz || biz.owner_id !== auth.userId) return json({ error: "Forbidden" }, 403);

    const adapter = makeAdapter(provider, {
      api_token: provider === "billy" ? normalizeToken(api_token) : api_token,
      api_secret,
      agreement_number,
      organization_id,
    }, settings ?? {});
    const result = await adapter.testConnection();
    return json(result, result.ok ? 200 : 400);
  } catch (e) {
    return json({ ok: false, message: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}