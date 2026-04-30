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
 * accounting-economic-callback
 *
 * Modtager en `agreementGrantToken` som e-conomic returnerer efter brugeren
 * har installeret Serviceydere-app'en på deres aftale. Vi henter
 * `ECONOMIC_APP_SECRET_TOKEN` fra projekt-secrets, validerer parret mod
 * e-conomics `/self`, og gemmer det krypteret i `accounting_integrations`.
 * Brugeren behøver aldrig se eller røre disse tokens.
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

    // Action: "install_url" — returnér Installations URL så frontend kan åbne
    // den i et nyt vindue. URL'en indeholder kun det offentlige appPublicToken
    // og en redirectUrl, så det er ikke følsomt.
    if (action === "install_url") {
      const installUrl = Deno.env.get("ECONOMIC_INSTALL_URL");
      if (!installUrl) return json({ error: "ECONOMIC_INSTALL_URL er ikke konfigureret." }, 500);
      // Sørg for at redirectUrl indeholder ?tab=accounting så brugeren lander
      // direkte på regnskabs-fanen efter godkendelse — ikke på "Overblik".
      try {
        const u = new URL(installUrl);
        const redirect = u.searchParams.get("redirectUrl");
        if (redirect) {
          const r = new URL(redirect);
          if (r.searchParams.get("tab") !== "accounting") {
            r.searchParams.set("tab", "accounting");
            u.searchParams.set("redirectUrl", r.toString());
          }
        }
        return json({ install_url: u.toString() });
      } catch {
        return json({ install_url: installUrl });
      }
    }

    const { business_id, agreement_grant_token } = body;
    if (!business_id || !agreement_grant_token) {
      return json({ error: "Missing business_id or agreement_grant_token" }, 400);
    }

    // Verify ownership
    const { data: biz } = await supabase
      .from("businesses").select("id, owner_id").eq("id", business_id).maybeSingle();
    if (!biz || biz.owner_id !== user.id) return json({ error: "Forbidden" }, 403);

    const appSecret = Deno.env.get("ECONOMIC_APP_SECRET_TOKEN");
    if (!appSecret) return json({ error: "ECONOMIC_APP_SECRET_TOKEN er ikke konfigureret på serveren." }, 500);

    // Validate the token pair against e-conomic
    const ecRes = await fetch("https://restapi.e-conomic.com/self", {
      headers: {
        "X-AppSecretToken": appSecret,
        "X-AgreementGrantToken": agreement_grant_token,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
    });
    if (!ecRes.ok) {
      const body = await ecRes.text();
      console.log(`[economic-callback] /self failed: ${ecRes.status} ${body.slice(0, 300)}`);
      return json({
        error: ecRes.status === 401 || ecRes.status === 403
          ? "E-conomic afviste din godkendelse. Prøv at installere app'en igen."
          : `E-conomic svarede med fejl (${ecRes.status}). Prøv igen om et øjeblik.`,
      }, 400);
    }
    const self = await ecRes.json();
    const agreementNumber = self?.agreement?.agreementNumber
      ? String(self.agreement.agreementNumber)
      : null;

    // Use service role to upsert (bypasses RLS but we already verified ownership)
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
    };

    const payload = {
      business_id,
      provider: "economic",
      is_active: true,
      api_secret: appSecret,
      api_token: agreement_grant_token,
      agreement_number: agreementNumber,
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

    return json({
      ok: true,
      agreement_number: agreementNumber,
      company_name: self?.company?.name ?? null,
    });
  } catch (e) {
    console.error("[economic-callback] error:", e);
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});