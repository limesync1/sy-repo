// verify-stripe-key — admin-only. Slår en Stripe-secret op via account.retrieve
// for at bekræfte at den er gyldig og rapportere business-navn + mode.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") || "";
    const token = auth.replace(/^Bearer\s+/i, "");
    if (!token) return json({ error: "missing_auth" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: "invalid_auth" }, 401);
    const { data: isAdmin } = await supabase.rpc("has_role" as any, { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const key: string = (body?.secret_key || "").toString().trim();
    if (!/^sk_(test|live)_[A-Za-z0-9_]+$/.test(key)) {
      return json({ ok: false, error: "Ugyldigt nøgleformat (skal starte med sk_test_ eller sk_live_)" }, 400);
    }

    const resp = await fetch("https://api.stripe.com/v1/account", {
      headers: { Authorization: `Bearer ${key}` },
    });
    const acc = await resp.json();
    if (!resp.ok) {
      return json({ ok: false, error: acc?.error?.message || "Stripe afviste nøglen" }, 200);
    }
    return json({
      ok: true,
      mode: key.startsWith("sk_live_") ? "live" : "test",
      account_id: acc.id,
      business_name: acc.business_profile?.name || acc.settings?.dashboard?.display_name || acc.email,
      country: acc.country,
      charges_enabled: acc.charges_enabled,
      payouts_enabled: acc.payouts_enabled,
    });
  } catch (e) {
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}