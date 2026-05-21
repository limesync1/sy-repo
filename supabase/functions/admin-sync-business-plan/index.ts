// admin-sync-business-plan — henter den nyeste subscription-tilstand fra
// Stripe og opdaterer business_plans-rækken. Bruges af admin-panelets
// "Synkronisér med Stripe"-knap, så vi ikke behøver vente på næste webhook.
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405, headers: corsHeaders });

  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Unauthorized" }, 401);
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return json({ error: "Unauthorized" }, 401);

    // Kun platform-admins må synce
    const { data: isAdmin } = await (supabase as any).rpc("has_role", { _user_id: user.id, _role: "admin" });
    if (!isAdmin) return json({ error: "Forbidden" }, 403);

    const { business_id } = await req.json();
    if (!business_id) return json({ error: "business_id required" }, 400);

    const { data: plan, error: planErr } = await (supabase as any)
      .from("business_plans")
      .select("*")
      .eq("business_id", business_id)
      .maybeSingle();
    if (planErr) throw planErr;
    if (!plan?.stripe_subscription_id) {
      return json({ error: "Ingen Stripe subscription tilknyttet" }, 400);
    }

    const env: StripeEnv = (plan.stripe_environment === "live" ? "live" : "sandbox");
    const stripe = createStripeClient(env);
    const sub = await stripe.subscriptions.retrieve(plan.stripe_subscription_id);

    const item: any = (sub as any).items?.data?.[0];
    const periodEnd = item?.current_period_end ?? (sub as any).current_period_end;

    let brand: string | null = null;
    let last4: string | null = null;
    try {
      const pmId = typeof sub.default_payment_method === "string"
        ? sub.default_payment_method
        : (sub.default_payment_method as any)?.id;
      if (pmId) {
        const pm = await stripe.paymentMethods.retrieve(pmId);
        brand = pm.card?.brand ?? null;
        last4 = pm.card?.last4 ?? null;
      }
    } catch (_) { /* ignore */ }

    const patch: Record<string, unknown> = {
      status: sub.status,
      cancel_at_period_end: sub.cancel_at_period_end || false,
      current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
      updated_at: new Date().toISOString(),
    };
    if (brand) patch.stripe_payment_method_brand = brand;
    if (last4) patch.stripe_payment_method_last4 = last4;

    const { error: updErr } = await (supabase as any)
      .from("business_plans")
      .update(patch)
      .eq("business_id", business_id);
    if (updErr) throw updErr;

    // Audit
    await (supabase as any).from("admin_audit_log").insert({
      admin_id: user.id,
      admin_email: user.email,
      action: "stripe.sync_business_plan",
      target_type: "business_plan",
      target_id: plan.id,
      target_label: business_id,
      details: { status: sub.status, env },
    });

    return json({ ok: true, status: sub.status, current_period_end: patch.current_period_end });
  } catch (e) {
    console.error("admin-sync-business-plan error", e);
    return json({ error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}