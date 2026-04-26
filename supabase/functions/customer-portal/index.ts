// customer-portal — opretter en Stripe Billing Portal-session så
// virksomhedens ejer kan administrere kort, fakturaer og opsigelse.
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient } from "../_shared/stripe.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
function parseBody(raw: any) {
  if (!raw || typeof raw !== "object") throw new Error("Invalid body");
  const businessId = String(raw.businessId || "");
  const returnUrl = String(raw.returnUrl || "");
  const environment = raw.environment === "live" ? "live" : raw.environment === "sandbox" ? "sandbox" : null;
  if (!UUID_RE.test(businessId)) throw new Error("Invalid businessId");
  if (!/^https?:\/\//.test(returnUrl)) throw new Error("Invalid returnUrl");
  if (!environment) throw new Error("Invalid environment");
  return { businessId, returnUrl, environment } as const;
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
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("Unauthorized");
    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData.user) throw new Error("Unauthorized");
    const user = userData.user;

    const body = parseBody(await req.json());

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