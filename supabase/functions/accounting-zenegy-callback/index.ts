import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

/**
 * accounting-zenegy-callback
 *
 * OAuth 2.0 flow for Zenegy. Spejler `accounting-dinero-callback`:
 *  • action = "install_url"   → bygger autorisations-URL hvis OAuth er aktiveret.
 *  • action = "exchange"      → bytter authorization code for access + refresh token.
 *
 * Indtil ZENEGY_CLIENT_ID, ZENEGY_CLIENT_SECRET og ZENEGY_REDIRECT_URL
 * er sat som secrets, returnerer install_url-action `enabled:false` så
 * frontend kan vise "Afventer godkendelse fra Zenegy".
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing auth" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user;
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const action = body?.action ?? "exchange";

    const clientId = Deno.env.get("ZENEGY_CLIENT_ID");
    const clientSecret = Deno.env.get("ZENEGY_CLIENT_SECRET");
    const redirectUrl = Deno.env.get("ZENEGY_REDIRECT_URL");

    // --- Action: install_url ---------------------------------------------
    if (action === "install_url") {
      if (!clientId || !redirectUrl) {
        return json({
          enabled: false,
          reason: "Zenegy OAuth er endnu ikke aktiveret — Serviceydere venter på godkendelse fra Zenegy.",
        });
      }
      const business_id = body?.business_id;
      if (!business_id) return json({ error: "Missing business_id" }, 400);
      const state = `${business_id}::${crypto.randomUUID()}`;
      // Zenegy OAuth: standard authorization_code grant.
      // Scopes kan justeres når Zenegy oplyser endelige scope-navne.
      const installUrl = new URL("https://login.zenegy.com/connect/authorize");
      installUrl.searchParams.set("response_type", "code");
      installUrl.searchParams.set("client_id", clientId);
      installUrl.searchParams.set("redirect_uri", redirectUrl);
      installUrl.searchParams.set("scope", "openid offline_access api");
      installUrl.searchParams.set("state", state);
      return json({ enabled: true, install_url: installUrl.toString(), state });
    }

    // --- Action: exchange ------------------------------------------------
    const { business_id, code } = body;
    if (!business_id || !code) {
      return json({ error: "Missing business_id or code" }, 400);
    }
    if (!clientId || !clientSecret || !redirectUrl) {
      return json({ error: "Zenegy OAuth er ikke konfigureret på serveren endnu." }, 400);
    }

    const { data: biz } = await supabase
      .from("businesses").select("id, owner_id").eq("id", business_id).maybeSingle();
    if (!biz || biz.owner_id !== user.id) return json({ error: "Forbidden" }, 403);

    // Byt code → tokens
    const tokenRes = await fetch("https://login.zenegy.com/connect/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUrl,
      }).toString(),
    });
    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      console.log(`[zenegy-callback] token exchange failed: ${tokenRes.status} ${txt.slice(0, 300)}`);
      return json({
        error: "Zenegy afviste din godkendelse. Prøv at forbinde igen.",
      }, 400);
    }
    const tok = await tokenRes.json();

    // Hent virksomhedsliste — bruges som organization_id reference.
    let orgId: string | null = null;
    try {
      const compRes = await fetch("https://api.zenegy.com/v1/companies?pageSize=1", {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      if (compRes.ok) {
        const d = await compRes.json();
        const list = Array.isArray(d) ? d : (d?.data ?? d?.items ?? d?.results ?? []);
        if (Array.isArray(list) && list.length > 0) {
          orgId = String(list[0].id ?? list[0].Id ?? list[0].companyId ?? "");
        }
      }
    } catch { /* ikke kritisk */ }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await admin
      .from("accounting_integrations")
      .select("id, settings")
      .eq("business_id", business_id)
      .maybeSingle();

    const baseSettings = (existing?.settings as Record<string, unknown> | null) ?? {};
    const mergedSettings = {
      push_pending: true,
      default_payment_terms_days: 14,
      default_vat_rate: 25,
      auto_create_products: true,
      send_order_as: "order",
      ...baseSettings,
      oauth_refresh_token: tok.refresh_token ?? null,
    };

    const payload = {
      business_id,
      provider: "zenegy",
      is_active: true,
      api_token: clientId,
      api_secret: clientSecret,
      organization_id: orgId,
      settings: mergedSettings,
      last_error: null,
      last_error_at: null,
      consecutive_failures: 0,
      paused_until: null,
    };

    if (existing) {
      await admin.from("accounting_integrations").update(payload).eq("id", existing.id);
    } else {
      await admin.from("accounting_integrations").insert(payload);
    }

    return json({ ok: true, organization_id: orgId });
  } catch (e) {
    console.error("[zenegy-callback] error:", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
