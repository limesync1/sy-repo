// Starter en engangsbetaling (Stripe Embedded Checkout) for en SMS-pakke.
// Pakker og priser ligger kun på serveren; browseren vælger kun pakke-id.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createStripeClient, type StripeEnv } from "../_shared/stripe.ts";
import { SMS_PACKS } from "../_shared/sms.ts";

const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const json = (b: unknown, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return json({ error: "Log ind igen" }, 401);
    const { data: u } = await admin.auth.getUser(token);
    if (!u?.user) return json({ error: "Log ind igen" }, 401);

    const body = await req.json().catch(() => ({}));
    const pack = SMS_PACKS.find((p) => p.id === body.packId);
    const env: StripeEnv | null = body.environment === "live" ? "live" : body.environment === "sandbox" ? "sandbox" : null;
    if (!pack || !env || typeof body.businessId !== "string" || typeof body.returnUrl !== "string") {
      return json({ error: "Ugyldig forespørgsel" }, 400);
    }
    const returnUrl = new URL(body.returnUrl);
    if (!/(^|\.)serviceydere\.dk$|lovable\.app$|lovableproject\.com$|^localhost$/.test(returnUrl.hostname)) {
      return json({ error: "Ugyldig returadresse" }, 400);
    }

    const { data: biz } = await admin.from("businesses").select("id, name, owner_id").eq("id", body.businessId).maybeSingle();
    if (!biz || biz.owner_id !== u.user.id) return json({ error: "Ingen adgang" }, 403);
    const { data: plan } = await admin.from("business_plans").select("stripe_customer_id, stripe_environment").eq("business_id", biz.id).maybeSingle();

    const stripe = createStripeClient(env);
    const metadata = { businessId: biz.id, type: "sms_credits", credits: String(pack.credits), packId: pack.id };
    const session = await stripe.checkout.sessions.create({
      ui_mode: "embedded",
      mode: "payment",
      return_url: returnUrl.toString(),
      ...(plan?.stripe_customer_id && plan.stripe_environment === env
        ? { customer: plan.stripe_customer_id }
        : { customer_email: u.user.email ?? undefined }),
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "dkk",
          unit_amount: Math.round(pack.priceDkk * 1.25 * 100), // inkl. 25 % moms
          product_data: { name: `${pack.credits} SMS-kreditter`, description: `SMS til kunder for ${biz.name ?? "virksomheden"}` },
        },
      }],
      metadata,
      payment_intent_data: { metadata },
    });
    return json({ clientSecret: session.client_secret });
  } catch (e) {
    console.error("buy-sms-credits:", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
