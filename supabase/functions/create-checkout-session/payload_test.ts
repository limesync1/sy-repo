// Mock-baseret unit-test for buildSessionPayload. Verificerer at
// add_invoice_items ALDRIG sendes til Checkout Sessions — uanset
// trial/non-trial/locked_* kombinationer.
// Kør: deno test supabase/functions/create-checkout-session/payload_test.ts
import { assertEquals, assert, assertFalse } from "https://deno.land/std@0.224.0/assert/mod.ts";
import { buildSessionPayload } from "./index.ts";

const baseInput = {
  lineItems: [{ price: "price_base_123", quantity: 1 }],
  returnUrl: "https://example.com/return",
  customerId: null,
  customerEmail: "owner@example.com",
  metadata: { businessId: "biz1" },
  trialEnd: null as number | null,
  includeStartupFee: false,
  startupFeeDkk: 0,
};

Deno.test("non-trial uden startup fee — ingen add_invoice_items", () => {
  const p = buildSessionPayload(baseInput);
  assertFalse("add_invoice_items" in p);
  const sub = p.subscription_data as Record<string, unknown>;
  assertFalse("add_invoice_items" in sub);
  assertFalse("trial_end" in sub);
});

Deno.test("non-trial med startup fee — gebyr lægges som line_item", () => {
  const p = buildSessionPayload({ ...baseInput, includeStartupFee: true, startupFeeDkk: 499 });
  assertFalse("add_invoice_items" in p);
  const items = p.line_items as any[];
  assertEquals(items.length, 2);
  assertEquals(items[1].price_data.unit_amount, 49900);
  assertEquals(items[1].price_data.product_data.name, "Opstartsgebyr (engangsbeløb)");
  const sub = p.subscription_data as Record<string, unknown>;
  assertFalse("add_invoice_items" in sub);
});

Deno.test("trial-flow — trial_end på subscription_data, fee stadig top-level", () => {
  const future = Math.floor(Date.now() / 1000) + 14 * 86400;
  const p = buildSessionPayload({
    ...baseInput,
    trialEnd: future,
    includeStartupFee: true,
    startupFeeDkk: 499,
  });
  const sub = p.subscription_data as Record<string, unknown>;
  assertEquals(sub.trial_end, future);
  assertFalse("add_invoice_items" in sub);
  assertFalse("add_invoice_items" in p);
  assertEquals((p.line_items as any[]).length, 1);
});

Deno.test("trial i fortiden ignoreres", () => {
  const past = Math.floor(Date.now() / 1000) - 86400;
  const p = buildSessionPayload({ ...baseInput, trialEnd: past });
  const sub = p.subscription_data as Record<string, unknown>;
  assertFalse("trial_end" in sub);
});

Deno.test("customerId bruges hvis sat, ellers customer_email", () => {
  const a = buildSessionPayload({ ...baseInput, customerId: "cus_123" });
  assertEquals(a.customer, "cus_123");
  assertFalse("customer_email" in a);
  const b = buildSessionPayload({ ...baseInput, customerId: null });
  assertEquals(b.customer_email, "owner@example.com");
  assertFalse("customer" in b);
});

Deno.test("metadata spejles på både session og subscription_data", () => {
  const meta = { businessId: "biz1", planLocked: "true" };
  const p = buildSessionPayload({ ...baseInput, metadata: meta });
  assertEquals(p.metadata, meta);
  assertEquals((p.subscription_data as any).metadata, meta);
});

Deno.test("payload har ingen ukendte top-level felter (kun whitelist)", () => {
  const p = buildSessionPayload({ ...baseInput, includeStartupFee: true, startupFeeDkk: 499 });
  const allowed = new Set([
    "ui_mode", "mode", "line_items", "return_url", "payment_method_types",
    "customer", "customer_email", "metadata", "subscription_data",
    "allow_promotion_codes",
  ]);
  for (const k of Object.keys(p)) {
    assert(allowed.has(k), `uventet top-level felt: ${k}`);
  }
});
