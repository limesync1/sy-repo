// create-checkout-session — opretter en Stripe Embedded Checkout-session
// for et virksomhedsabonnement. Klienten åbner et iframe der renderer
// `clientSecret` direkte i appen (ingen redirect).
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PRICE_RE = /^[a-zA-Z0-9_-]+$/;
function parseBody(raw: any) {
  if (!raw || typeof raw !== "object") throw new Error("Invalid body");
  const businessId = String(raw.businessId || "");
  const basePriceId = String(raw.basePriceId || "");
  const addonPriceIds = Array.isArray(raw.addonPriceIds)
    ? raw.addonPriceIds.map((s: unknown) => String(s)) : [];
  const extraEmployeeLogins = Math.max(0, Math.min(50, Number(raw.extraEmployeeLogins) || 0));
  const extraEmployeePriceId = raw.extraEmployeePriceId ? String(raw.extraEmployeePriceId) : undefined;
  const returnUrl = String(raw.returnUrl || "");
  const environment = raw.environment === "live" ? "live" : raw.environment === "sandbox" ? "sandbox" : null;
  if (!UUID_RE.test(businessId)) throw new Error("Invalid businessId");
  if (!PRICE_RE.test(basePriceId)) throw new Error("Invalid basePriceId");
  if (addonPriceIds.some((s: string) => !PRICE_RE.test(s))) throw new Error("Invalid addonPriceIds");
  if (extraEmployeePriceId && !PRICE_RE.test(extraEmployeePriceId)) throw new Error("Invalid extraEmployeePriceId");
  if (!/^https?:\/\//.test(returnUrl)) throw new Error("Invalid returnUrl");
  if (!environment) throw new Error("Invalid environment");
  return { businessId, basePriceId, addonPriceIds, extraEmployeeLogins, extraEmployeePriceId, returnUrl, environment } as const;
}

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

    const body = parseBody(await req.json());

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
      .select("stripe_customer_id, trial_ends_at, created_at, startup_fee_charged, locked_at, locked_extra_employee_logins, locked_accounting_integration, accounting_integration_enabled, extra_employee_logins")
      .eq("business_id", body.businessId)
      .maybeSingle();

    const stripe = createStripeClient(body.environment as StripeEnv);

    // Hvis planen er låst (3 dage før fakturering), tvinger vi brugen af de
    // låste værdier i stedet for dem klienten sendte med. Det forhindrer
    // virksomheder i at nedjustere tilvalg lige før fornyelse.
    let effectiveAddonPriceIds = body.addonPriceIds;
    let effectiveExtraEmployeeLogins = body.extraEmployeeLogins;
    if (existingPlan?.locked_at) {
      const accLocked = !!existingPlan.locked_accounting_integration;
      const ACC_LOOKUP = "accounting_integration_monthly";
      effectiveAddonPriceIds = body.addonPriceIds.filter((id: string) => id !== ACC_LOOKUP);
      if (accLocked) effectiveAddonPriceIds.push(ACC_LOOKUP);
      const lockedLogins = Math.max(0, Number(existingPlan.locked_extra_employee_logins) || 0);
      // Tillad altid OPjustering (kunden må gerne købe mere midt i perioden),
      // men ikke nedjustering under låst antal.
      effectiveExtraEmployeeLogins = Math.max(lockedLogins, body.extraEmployeeLogins);
    }

    // Find Stripe-priser via lookup_keys
    const lookupKeys = [
      body.basePriceId,
      ...effectiveAddonPriceIds,
      ...(effectiveExtraEmployeeLogins > 0 && body.extraEmployeePriceId
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

    for (const addonId of effectiveAddonPriceIds) {
      const addon = priceMap.get(addonId);
      if (!addon) throw new Error(`Addon price not found: ${addonId}`);
      lineItems.push({ price: addon.id, quantity: 1 });
    }

    if (effectiveExtraEmployeeLogins > 0 && body.extraEmployeePriceId) {
      const employeePrice = priceMap.get(body.extraEmployeePriceId);
      if (!employeePrice) throw new Error(`Employee price not found: ${body.extraEmployeePriceId}`);
      lineItems.push({ price: employeePrice.id, quantity: effectiveExtraEmployeeLogins });
    }

    // Opstartsgebyr — engangsbeløb der lægges på den FØRSTE rigtige faktura
    // (efter prøveperioden). Bruger `add_invoice_items` på subscription_data,
    // så Stripe automatisk tilføjer linjen til den første faktura uden at
    // opkræve nu. Springes over hvis virksomheden allerede har betalt det.
    const { data: pricingRow } = await supabase
      .from("platform_settings")
      .select("startup_fee_dkk")
      .eq("id", 1)
      .maybeSingle();
    const startupFeeDkk = Math.max(0, Number((pricingRow as any)?.startup_fee_dkk) || 0);
    const includeStartupFee = startupFeeDkk > 0 && !existingPlan?.startup_fee_charged;

    const metadata = {
      businessId: body.businessId,
      ownerId: user.id,
      basePriceId: body.basePriceId,
      addonPriceIds: effectiveAddonPriceIds.join(",") || "",
      extraEmployeeLogins: String(effectiveExtraEmployeeLogins),
      planLocked: existingPlan?.locked_at ? "true" : "false",
      includeStartupFee: includeStartupFee ? "true" : "false",
      startupFeeDkk: String(startupFeeDkk),
    };

    // Prøveperiode: Stripe må først trække første betaling når trial er udløbet.
    // 1) Hvis virksomheden allerede har en `trial_ends_at` i fremtiden, brug den.
    // 2) Ellers, hvis planen har et `created_at`, beregn trial som
    //    created_at + platform_settings.trial_days — det samme fallback som
    //    `useBusinessPlan` bruger til banneret, så Stripe-checkout viser
    //    præcis samme resterende prøveperiode som banneret.
    // 3) Først hvis virksomheden slet ikke har en plan-record falder vi
    //    tilbage på `nowSec + trial_days` (helt ny virksomhed).
    const nowSec = Math.floor(Date.now() / 1000);
    let trialEnd: number | null = existingPlan?.trial_ends_at
      ? Math.floor(new Date(existingPlan.trial_ends_at).getTime() / 1000)
      : null;

    if (!trialEnd || trialEnd <= nowSec + 60) {
      const { data: pricing } = await supabase
        .from("platform_settings")
        .select("trial_days")
        .eq("id", 1)
        .maybeSingle();
      const trialDays = Math.max(0, Number(pricing?.trial_days) || 0);
      if (trialDays > 0 && !existingPlan?.stripe_customer_id) {
        if (existingPlan?.created_at) {
          // Beregn ud fra hvornår prøveperioden faktisk startede, så
          // Stripe viser "X dage tilbage" og ikke nulstiller perioden.
          const createdSec = Math.floor(new Date(existingPlan.created_at).getTime() / 1000);
          const candidate = createdSec + trialDays * 24 * 60 * 60;
          if (candidate > nowSec + 60) trialEnd = candidate;
        } else {
          // Helt ny virksomhed uden plan-record — start trial fra nu.
          trialEnd = nowSec + trialDays * 24 * 60 * 60;
        }
      }
    }

    const trialEndIsFuture = !!trialEnd && trialEnd > nowSec + 60;

    // Bygg sessionPayload eksplicit så vi kan logge & validere før kald til Stripe.
    const sessionPayload: Record<string, unknown> = {
      ui_mode: "embedded",
      mode: "subscription",
      line_items: lineItems,
      return_url: body.returnUrl,
      payment_method_types: ["card"],
      ...(existingPlan?.stripe_customer_id
        ? { customer: existingPlan.stripe_customer_id }
        : { customer_email: biz.email || user.email || undefined }),
      metadata,
      subscription_data: {
        metadata,
        ...(trialEndIsFuture ? { trial_end: trialEnd } : {}),
      },
      allow_promotion_codes: true,
    };

    // Opstartsgebyr på FØRSTE faktura. `add_invoice_items` understøttes kun på
    // subscription-mode sessioner og MÅ KUN sættes på top-level (ikke under
    // subscription_data — det vil give "Received unknown parameter").
    if (includeStartupFee) {
      sessionPayload.add_invoice_items = [
        {
          quantity: 1,
          price_data: {
            currency: "dkk",
            unit_amount: startupFeeDkk * 100,
            product_data: { name: "Opstartsgebyr (engangsbeløb)" },
          },
        },
      ];
    }

    // Defensiv validering: hvis nogen ved en fejl placerer add_invoice_items
    // inde i subscription_data, fjerner vi det og logger en advarsel, så vi
    // aldrig sender det forkerte niveau til Stripe.
    const subData = sessionPayload.subscription_data as Record<string, unknown> | undefined;
    if (subData && "add_invoice_items" in subData) {
      console.warn("[create-checkout-session] removed add_invoice_items from subscription_data");
      delete (subData as Record<string, unknown>).add_invoice_items;
    }

    console.log("[create-checkout-session] stripe payload:", JSON.stringify(sessionPayload));

    let session;
    try {
      session = await stripe.checkout.sessions.create(sessionPayload as any);
    } catch (stripeErr) {
      console.error("[create-checkout-session] stripe rejected payload:", {
        message: (stripeErr as Error)?.message,
        payload: sessionPayload,
      });
      throw stripeErr;
    }

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