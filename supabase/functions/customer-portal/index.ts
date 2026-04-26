// customer-portal — opretter en Stripe Billing Portal-session så
// virksomhedens ejer kan administrere kort, fakturaer og opsigelse.
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
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
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

    // Bekræft ejerskab og find Stripe customer
    const { data: biz } = await supabase
      .from("businesses")
      .select("id, owner_id")
      .eq("id", body.businessId)
      .maybeSingle();
    if (!biz || biz.owner_id !== user.id) throw new Error("Forbidden");

    const { data: plan } = await supabase
      .from("business_plans")
      .select("stripe_customer_id")
      .eq("business_id", body.businessId)
      .maybeSingle();
    if (!plan?.stripe_customer_id) throw new Error("No Stripe customer for this business");

    const stripe = createStripeClient(body.environment as StripeEnv);
    const portal = await stripe.billingPortal.sessions.create({
      customer: plan.stripe_customer_id,
      return_url: body.returnUrl,
    });

    return new Response(JSON.stringify({ url: portal.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("customer-portal error", err);
    const msg = err instanceof Error ? err.message : "Unknown error";
    const status = msg === "Unauthorized" ? 401 : msg === "Forbidden" ? 403 : 400;
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});