// create-checkout-session — opretter en Stripe Embedded Checkout-session
// for et virksomhedsabonnement. Klienten åbner et iframe der renderer
// `clientSecret` direkte i appen (ingen redirect).
import { createClient } from "npm:@supabase/supabase-js@2";
import { z } from "npm:zod@3.23.8";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const BodySchema = z.object({
  businessId: z.string().uuid(),
  basePriceId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  addonPriceIds: z.array(z.string().regex(/^[a-zA-Z0-9_-]+$/)).default([]),
  extraEmployeeLogins: z.number().int().min(0).max(50).default(0),
  extraEmployeePriceId: z.string().regex(/^[a-zA-Z0-9_-]+$/).optional(),
  returnUrl: z.string().url(),
  environment: z.enum(["sandbox", "live"]),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    const token = authHeader?.replace("Bearer ", "");
    if (!token) throw new Error("Unauthorized");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");
    const user = userData.user;

    const parsed = BodySchema.safeParse(await req.json());
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const body = parsed.data;

    // Bekræft ejerskab af virksomheden
    const { data: biz, error: bizErr } = await supabase
      .from("businesses")
      .select("id, owner_id, name, email")
      .eq("id", body.businessId)
      .maybeSingle();
    if (bizErr || !biz) throw new Error("Business not found");
    if (biz.owner_id !== user.id) throw new Error("Forbidden");

    // Hent eksisterende plan for at finde Stripe customer hvis den findes
    const { data: existingPlan } = await supabase
      .from("business_plans")
      .select("stripe_customer_id, trial_ends_at")
      .eq("business_id", body.businessId)
      .maybeSingle();

    const stripe = createStripeClient(body.environment as StripeEnv);

    // Find Stripe-priser via lookup_keys
    const lookupKeys = [
      body.basePriceId,
      ...body.addonPriceIds,
      ...(body.extraEmployeeLogins > 0 && body.extraEmployeePriceId
        ? [body.extraEmployeePriceId]
        : []),
    ];
    const priceList = await stripe.prices.list({
      lookup_keys: lookupKeys,
      expand: ["data.product"],
      limit: 100,
    });
    const priceMap = new Map<string, typeof priceList.data[number]>();
    for (const p of priceList.data) {
      const key = (p.metadata as Record<string, string> | undefined)?.lovable_external_id;
      if (key) priceMap.set(key, p);
    }

    const lineItems: Array<{ price: string; quantity: number }> = [];
    const basePrice = priceMap.get(body.basePriceId);
    if (!basePrice) throw new Error(`Base price not found: ${body.basePriceId}`);
    lineItems.push({ price: basePrice.id, quantity: 1 });

    for (const addonId of body.addonPriceIds) {
      const addon = priceMap.get(addonId);
      if (!addon) throw new Error(`Addon price not found: ${addonId}`);
      lineItems.push({ price: addon.id, quantity: 1 });
    }

    if (body.extraEmployeeLogins > 0 && body.extraEmployeePriceId) {
      const employeePrice = priceMap.get(body.extraEmployeePriceId);
      if (!employeePrice) throw new Error(`Employee price not found: ${body.extraEmployeePriceId}`);
      lineItems.push({ price: employeePrice.id, quantity: body.extraEmployeeLogins });
    }

    const metadata = {
      businessId: body.businessId,
      ownerId: user.id,
      basePriceId: body.basePriceId,
      addonPriceIds: body.addonPriceIds.join(",") || "",
      extraEmployeeLogins: String(body.extraEmployeeLogins),
    };

    // Hvis prøveperioden stadig løber, lad Stripe respektere den
    const trialEnd = existingPlan?.trial_ends_at
      ? Math.floor(new Date(existingPlan.trial_ends_at).getTime() / 1000)
      : null;
    const trialEndIsFuture = trialEnd && trialEnd > Math.floor(Date.now() / 1000) + 60;

    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "subscription",
      line_items: lineItems,
      return_url: body.returnUrl,
      ...(existingPlan?.stripe_customer_id
        ? { customer: existingPlan.stripe_customer_id }
        : { customer_email: biz.email || user.email || undefined }),
      metadata,
      subscription_data: {
        metadata,
        ...(trialEndIsFuture ? { trial_end: trialEnd } : {}),
      },
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ clientSecret: session.client_secret }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("create-checkout-session error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 400;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});