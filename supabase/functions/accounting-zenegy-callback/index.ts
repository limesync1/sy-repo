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

function htmlRedirect(url: string, message: string) {
  const safeUrl = url.replace(/"/g, "&quot;");
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Zenegy</title>
<meta http-equiv="refresh" content="0;url=${safeUrl}">
<p style="font-family:sans-serif;padding:24px">${message} <a href="${safeUrl}">Klik her hvis du ikke videresendes.</a></p>`,
    { status: 200, headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

/**
 * accounting-zenegy-callback
 *  • GET  ?code=...&state=...                     → browser-redirect fra Zenegy → token exchange
 *  • POST { action: "install_url", business_id }  → bygger autorisations-URL og gemmer state
 *  • POST { action: "exchange", business_id, code } → legacy POST exchange (beholdt for kompat.)
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const clientId = Deno.env.get("ZENEGY_CLIENT_ID");
  const clientSecret = Deno.env.get("ZENEGY_CLIENT_SECRET");
  const redirectUrl = Deno.env.get("ZENEGY_REDIRECT_URL");
  const returnTo = "https://serviceydere.dk/virksomhed?tab=accounting";

  try {
    // ============ GET: browser-redirect fra Zenegy ============
    if (req.method === "GET") {
      const url = new URL(req.url);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const errParam = url.searchParams.get("error");

      if (errParam) {
        return htmlRedirect(`${returnTo}&zenegy=error&reason=${encodeURIComponent(errParam)}`, "Zenegy afviste forbindelsen.");
      }
      if (!code || !state) {
        return htmlRedirect(`${returnTo}&zenegy=error&reason=missing_code`, "Manglende code/state.");
      }
      if (!clientId || !clientSecret || !redirectUrl) {
        return htmlRedirect(`${returnTo}&zenegy=error&reason=not_configured`, "Zenegy er ikke konfigureret.");
      }

      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );

      const { data: match } = await admin
        .from("accounting_integrations")
        .select("id, business_id, settings")
        .eq("provider", "zenegy")
        .filter("settings->>oauth_state", "eq", state)
        .maybeSingle();

      if (!match) {
        return htmlRedirect(`${returnTo}&zenegy=error&reason=invalid_state`, "Ugyldig state — prøv igen.");
      }

      const tokenRes = await fetch("https://auth.zenegy.com/auth/token", {
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
        return htmlRedirect(`${returnTo}&zenegy=error&reason=token_exchange`, "Token exchange fejlede.");
      }
      const tok = await tokenRes.json();

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

      const mergedSettings = cleanAccountingSettings(
        match.settings as Record<string, unknown> | null,
        { oauth_refresh_token: tok.refresh_token ?? null },
      );

      await admin.from("accounting_integrations").update({
        is_active: true,
        api_token: clientId,
        api_secret: clientSecret,
        organization_id: orgId,
        settings: mergedSettings,
        last_error: null,
        last_error_at: null,
        consecutive_failures: 0,
        paused_until: null,
      }).eq("id", match.id);

      return htmlRedirect(`${returnTo}&zenegy=connected`, "Zenegy forbundet — videresender…");
    }

    // ============ POST flows ============
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

    if (action === "install_url") {
      if (!clientId || !redirectUrl) {
        return json({
          enabled: false,
          reason: "Zenegy OAuth er endnu ikke aktiveret — Serviceydere venter på godkendelse fra Zenegy.",
        });
      }
      const business_id = body?.business_id;
      if (!business_id) return json({ error: "Missing business_id" }, 400);

      const { data: biz } = await supabase
        .from("businesses").select("id, owner_id").eq("id", business_id).maybeSingle();
      if (!biz || biz.owner_id !== user.id) return json({ error: "Forbidden" }, 403);
      if (body?.prepare !== true) return json({ enabled: true });

      const state = `${business_id}::${crypto.randomUUID()}`;

      const admin = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      );
      await prepareAccountingProviderSwitch(admin, business_id, "zenegy");
      const { data: existing } = await admin
        .from("accounting_integrations")
        .select("id, settings")
        .eq("business_id", business_id)
        .maybeSingle();

      const baseSettings = cleanAccountingSettings(existing?.settings as Record<string, unknown> | null);
      const settingsWithState = { ...baseSettings, oauth_state: state, oauth_state_at: new Date().toISOString() };

      if (existing) {
        await admin.from("accounting_integrations")
          .update({ provider: "zenegy", settings: settingsWithState })
          .eq("id", existing.id);
      } else {
        await admin.from("accounting_integrations").insert({
          business_id,
          provider: "zenegy",
          is_active: false,
          settings: settingsWithState,
        });
      }

      const installUrl = new URL("https://auth.zenegy.com/auth/authorize");
      installUrl.searchParams.set("response_type", "code");
      installUrl.searchParams.set("client_id", clientId);
      installUrl.searchParams.set("redirect_uri", redirectUrl);
      installUrl.searchParams.set("scope", "openid offline_access api");
      installUrl.searchParams.set("state", state);
      return json({ enabled: true, install_url: installUrl.toString(), state });
    }

    // --- Action: exchange (legacy) ---
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

    const tokenRes = await fetch("https://auth.zenegy.com/auth/token", {
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
      return json({ error: "Zenegy afviste din godkendelse. Prøv at forbinde igen." }, 400);
    }
    const tok = await tokenRes.json();

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

    const mergedSettings = cleanAccountingSettings(
      existing?.settings as Record<string, unknown> | null,
      { oauth_refresh_token: tok.refresh_token ?? null },
    );

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
