import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { cleanAccountingSettings, prepareAccountingProviderSwitch } from "../_shared/accounting/state.ts";

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
 * accounting-dinero-callback
 *
 * Spejler `accounting-economic-callback` så vi har et færdigt OAuth-flow
 * klar — det aktiveres automatisk så snart Dinero godkender Serviceydere
 * som partner-app og vi sætter `DINERO_CLIENT_ID`, `DINERO_CLIENT_SECRET`
 * og `DINERO_REDIRECT_URL` som secrets.
 *
 * Indtil da returnerer `install_url`-action `enabled: false`, så frontend
 * ved at den skal vise det manuelle Smart Paste-flow i stedet.
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

    const clientId = Deno.env.get("DINERO_CLIENT_ID");
    const clientSecret = Deno.env.get("DINERO_CLIENT_SECRET");
    const redirectUrl = Deno.env.get("DINERO_REDIRECT_URL");

    // Action: "install_url" — fortæl frontend om OAuth er klar eller ej.
    if (action === "install_url") {
      if (!clientId || !redirectUrl) {
        return json({
          enabled: false,
          reason: "Dinero OAuth er endnu ikke aktiveret — Serviceydere venter på partner-godkendelse fra Dinero.",
        });
      }
      // Dinero bruger Authorization Code Grant. State binder requesten til business_id.
      const business_id = body?.business_id;
      if (!business_id) return json({ error: "Missing business_id" }, 400);
      const { data: biz } = await supabase
        .from("businesses").select("id, owner_id").eq("id", business_id).maybeSingle();
      if (!biz || biz.owner_id !== user.id) return json({ error: "Forbidden" }, 403);
      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await prepareAccountingProviderSwitch(admin, business_id, "dinero");
      const state = `${business_id}::${crypto.randomUUID()}`;
      const installUrl = new URL("https://connect.dinero.dk/oauth/authorize");
      installUrl.searchParams.set("response_type", "code");
      installUrl.searchParams.set("client_id", clientId);
      installUrl.searchParams.set("redirect_uri", redirectUrl);
      installUrl.searchParams.set("scope", "read write");
      installUrl.searchParams.set("state", state);
      return json({ enabled: true, install_url: installUrl.toString(), state });
    }

    // Action: "exchange" — byt authorization code for et access token.
    const { business_id, code, organization_id } = body;
    if (!business_id || !code) {
      return json({ error: "Missing business_id or code" }, 400);
    }
    if (!clientId || !clientSecret || !redirectUrl) {
      return json({ error: "Dinero OAuth er ikke konfigureret på serveren endnu." }, 400);
    }

    const { data: biz } = await supabase
      .from("businesses").select("id, owner_id").eq("id", business_id).maybeSingle();
    if (!biz || biz.owner_id !== user.id) return json({ error: "Forbidden" }, 403);

    // Byt code → tokens
    const tokenRes = await fetch("https://authz.dinero.dk/dineroapi/oauth/token", {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUrl,
      }).toString(),
    });
    if (!tokenRes.ok) {
      const txt = await tokenRes.text();
      console.log(`[dinero-callback] token exchange failed: ${tokenRes.status} ${txt.slice(0, 300)}`);
      return json({
        error: "Dinero afviste din godkendelse. Prøv at forbinde igen.",
      }, 400);
    }
    const tok = await tokenRes.json();

    // Hent organisations-liste hvis ikke angivet
    let orgId = organization_id ?? null;
    if (!orgId) {
      const orgRes = await fetch("https://api.dinero.dk/v1/organizations", {
        headers: { Authorization: `Bearer ${tok.access_token}` },
      });
      if (orgRes.ok) {
        const orgs = await orgRes.json();
        const list = Array.isArray(orgs) ? orgs : (orgs?.Collection ?? []);
        if (list.length > 0) orgId = String(list[0].Id ?? list[0].id);
      }
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const { data: existing } = await admin
      .from("accounting_integrations")
      .select("id, settings")
      .eq("business_id", business_id)
      .maybeSingle();

    const mergedSettings = cleanAccountingSettings(
      existing?.settings as Record<string, unknown> | null,
      { oauth_refresh_token: tok.refresh_token ?? null },
    );

    const payload = {
      business_id,
      provider: "dinero",
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
    console.error("[dinero-callback] error:", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});