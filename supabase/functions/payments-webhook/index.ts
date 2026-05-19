// payments-webhook — modtager Stripe events og holder business_plans
// synkroniseret med rigtig betalingsstatus. Registreret automatisk af
// Lovable for både sandbox og live (?env=sandbox / ?env=live).
import { createClient } from "npm:@supabase/supabase-js@2";
import { type StripeEnv, createStripeClient, verifyWebhook } from "../_shared/stripe.ts";

let _supabase: ReturnType<typeof createClient> | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
  }
  return _supabase;
}

// Type assertion helper — vi har ingen Database typer i edge function-konteksten,
// så vi caster tabellerne til `any` for at undgå "never"-overload-fejl.
const tbl = (name: string) => (getSupabase() as any).from(name);

function pickPaymentMethod(sub: any): { brand: string | null; last4: string | null } {
  // Stripe lægger default payment method på subscription eller på den
  // tilknyttede customer. Vi prøver begge — webhook payload har dem ikke
  // expanded, så vi nøjes med at læse fra default_payment_method hvis det
  // er et string-id (vi kan så hente brand/last4 separat ved behov).
  return { brand: null, last4: null };
}

async function upsertFromSubscription(subscription: any, env: StripeEnv) {
  const businessId = subscription.metadata?.businessId;
  if (!businessId) {
    console.warn("subscription without businessId metadata", subscription.id);
    return;
  }
  const item = subscription.items?.data?.[0];
  const periodEnd = item?.current_period_end ?? subscription.current_period_end;

  // Hent kortdetaljer hvis vi har en default_payment_method
  let brand: string | null = null;
  let last4: string | null = null;
  try {
    const pmId = typeof subscription.default_payment_method === "string"
      ? subscription.default_payment_method
      : subscription.default_payment_method?.id;
    if (pmId) {
      const stripe = createStripeClient(env);
      const pm = await stripe.paymentMethods.retrieve(pmId);
      brand = pm.card?.brand ?? null;
      last4 = pm.card?.last4 ?? null;
    }
  } catch (e) {
    console.warn("Could not fetch payment method", e);
  }

  const patch: Record<string, unknown> = {
    status: subscription.status,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: subscription.customer,
    stripe_environment: env,
    cancel_at_period_end: subscription.cancel_at_period_end || false,
    current_period_end: periodEnd ? new Date(periodEnd * 1000).toISOString() : null,
    updated_at: new Date().toISOString(),
  };
  if (brand) patch.stripe_payment_method_brand = brand;
  if (last4) patch.stripe_payment_method_last4 = last4;

  const { error } = await tbl("business_plans")
    .update(patch)
    .eq("business_id", businessId);
  if (error) console.error("Failed to update business_plan", error);

  // Hvis abonnementet er aktivt → sørg for at virksomheden er aktiv
  if (["active", "trialing"].includes(subscription.status)) {
    await tbl("businesses")
      .update({ is_active: true })
      .eq("id", businessId);
  }
}

async function handleSubscriptionDeleted(subscription: any, env: StripeEnv) {
  const businessId = subscription.metadata?.businessId;
  if (!businessId) return;
  await tbl("business_plans")
    .update({
      status: "canceled",
      cancel_at_period_end: false,
      stripe_environment: env,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId);
}

async function handleInvoicePaid(invoice: any, env: StripeEnv) {
  if (!invoice.customer) return;
  // Hvis en linje på fakturaen er opstartsgebyret, marker det som betalt.
  const hasStartupFee = Array.isArray(invoice.lines?.data) && invoice.lines.data.some(
    (l: any) => typeof l.description === "string" && /opstartsgebyr/i.test(l.description),
  );
  await tbl("business_plans")
    .update({
      last_payment_at: new Date().toISOString(),
      stripe_environment: env,
      updated_at: new Date().toISOString(),
      ...(hasStartupFee ? { startup_fee_charged: true } : {}),
    })
    .eq("stripe_customer_id", invoice.customer);
}

async function handleInvoiceFailed(invoice: any, env: StripeEnv) {
  if (!invoice.customer) return;
  await tbl("business_plans")
    .update({
      last_payment_failed_at: new Date().toISOString(),
      stripe_environment: env,
      status: "past_due",
      updated_at: new Date().toISOString(),
    })
    .eq("stripe_customer_id", invoice.customer);
}

async function handleCheckoutCompleted(session: any, env: StripeEnv) {
  // Når checkout fuldføres, sæt customer_id på business_plan så portal virker
  // selvom subscription.created kommer senere.
  const businessId = session.metadata?.businessId;
  if (!businessId || !session.customer) return;
  await tbl("business_plans")
    .update({
      stripe_customer_id: session.customer,
      stripe_environment: env,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId);
}

async function handleEvent(event: { type: string; data: { object: any } }, env: StripeEnv) {
  console.log("Stripe event:", event.type);
  switch (event.type) {
    case "customer.subscription.created":
    case "customer.subscription.updated":
      await upsertFromSubscription(event.data.object, env);
      break;
    case "customer.subscription.deleted":
    case "subscription.canceled":
      await handleSubscriptionDeleted(event.data.object, env);
      break;
    case "checkout.session.completed":
      await handleCheckoutCompleted(event.data.object, env);
      break;
    case "invoice.paid":
    case "invoice.payment_succeeded":
    case "transaction.completed":
      await handleInvoicePaid(event.data.object, env);
      break;
    case "invoice.payment_failed":
    case "transaction.payment_failed":
      await handleInvoiceFailed(event.data.object, env);
      break;
    default:
      // Andre events ignoreres med 200 så Stripe ikke genfremsender
      console.log("Unhandled event:", event.type);
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }
  const rawEnv = new URL(req.url).searchParams.get("env");
  if (rawEnv !== "sandbox" && rawEnv !== "live") {
    console.error("Webhook missing or invalid env:", rawEnv);
    return new Response(JSON.stringify({ received: true, ignored: "invalid env" }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  const env: StripeEnv = rawEnv;
  try {
    const event = await verifyWebhook(req, env);
    await handleEvent(event, env);
    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response("Webhook error", { status: 400 });
  }
});