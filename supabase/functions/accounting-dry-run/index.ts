// Dry-run end-to-end test mod en regnskabs-udbyder.
// Bruger en angivet api_token til at:
//   1) teste forbindelsen
//   2) oprette en test-kunde
//   3) oprette en test-vare
//   4) oprette en kladde-faktura med kunde + vare
//   5) slette kladden igen, så der ikke ligger spor i regnskabet
// Returnerer trin-for-trin resultat så brugeren kan se hvor det evt. går galt.
// Bemærk: api_token gemmes IKKE — den bruges kun i denne ene request.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeAdapter } from "../_shared/accounting/index.ts";
import type { AccountingProvider } from "../_shared/accounting/types.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function normalizeToken(value: unknown): string {
  return String(value ?? "")
    .trim()
    .replace(/^x-access-token\s*:\s*/i, "")
    .replace(/^bearer\s+/i, "")
    .replace(/[\u200B-\u200D\uFEFF\s]/g, "");
}

interface Step {
  key: "connect" | "customer" | "product" | "invoice" | "cleanup";
  label: string;
  ok: boolean;
  message?: string;
  external_id?: string | null;
  external_number?: string | null;
  duration_ms?: number;
}

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const provider = body?.provider as AccountingProvider | undefined;
    const api_token = normalizeToken(body?.api_token);
    const business_id = body?.business_id as string | undefined;

    if (!provider || !business_id) {
      return json({ error: "Missing provider/business_id" }, 400);
    }
    if (!api_token) {
      return json({ error: "Missing api_token" }, 400);
    }

    // Verify ownership
    const { data: biz } = await supabase
      .from("businesses").select("id, owner_id, name").eq("id", business_id).maybeSingle();
    if (!biz || biz.owner_id !== user.id) return json({ error: "Forbidden" }, 403);

    const adapter = makeAdapter(provider, { api_token }, {
      default_payment_terms_days: 14,
    });

    const steps: Step[] = [];
    const stamp = Date.now().toString(36).slice(-6).toUpperCase();

    // 1) Connect
    let t0 = Date.now();
    const conn = await adapter.testConnection();
    steps.push({
      key: "connect",
      label: "Forbind til regnskabsprogrammet",
      ok: conn.ok,
      message: conn.message,
      duration_ms: Date.now() - t0,
    });
    if (!conn.ok) return json({ ok: false, steps }, 200);

    // 2) Customer
    let customerExternalId: string | null = null;
    t0 = Date.now();
    try {
      const customer = await adapter.upsertCustomer({
        internal_id: `serviceydere-test-${stamp}`,
        name: `Serviceydere Test ${stamp}`,
        email: `test+${stamp.toLowerCase()}@serviceydere.dk`,
        phone: "+4500000000",
        address: "Testvej 1",
        zip_code: "8000",
        city: "Aarhus",
        payment_terms_days: 14,
        currency: "DKK",
      });
      customerExternalId = customer.external_id;
      steps.push({
        key: "customer",
        label: "Opret testkunde",
        ok: true,
        external_id: customer.external_id,
        external_number: customer.external_number ?? null,
        message: `Oprettet som “${customer.name}”${customer.external_number ? ` (#${customer.external_number})` : ""}`,
        duration_ms: Date.now() - t0,
      });
    } catch (e) {
      steps.push({
        key: "customer",
        label: "Opret testkunde",
        ok: false,
        message: e instanceof Error ? e.message : String(e),
        duration_ms: Date.now() - t0,
      });
      return json({ ok: false, steps }, 200);
    }

    // 3) Product
    let productExternalId: string | null = null;
    t0 = Date.now();
    try {
      const product = await adapter.upsertProduct({
        internal_id: `serviceydere-test-${stamp}`,
        name: `Serviceydere Testvare ${stamp}`,
        description: "Oprettet automatisk af Serviceydere som test — kan slettes.",
        unit_price: 100,
      });
      productExternalId = product.external_id;
      steps.push({
        key: "product",
        label: "Opret testvare",
        ok: true,
        external_id: product.external_id,
        external_number: product.external_number ?? null,
        message: `Oprettet som “${product.name}”${product.external_number ? ` (#${product.external_number})` : ""}`,
        duration_ms: Date.now() - t0,
      });
    } catch (e) {
      steps.push({
        key: "product",
        label: "Opret testvare",
        ok: false,
        message: e instanceof Error ? e.message : String(e),
        duration_ms: Date.now() - t0,
      });
      // Stop her — uden vare kan vi ikke lave faktura. Kunde efterlades, men det er bare én test-kontakt.
      return json({ ok: false, steps }, 200);
    }

    // 4) Invoice draft
    let invoiceExternalId: string | null = null;
    t0 = Date.now();
    try {
      const invoice = await adapter.upsertOrder({
        internal_id: `serviceydere-test-${stamp}`,
        customer_external_id: customerExternalId!,
        status: "pending",
        notes: "TEST — oprettet af Serviceydere. Slettes automatisk.",
        payment_terms_days: 14,
        currency: "DKK",
        date: new Date().toISOString(),
        lines: [{
          product_external_id: productExternalId,
          description: `Serviceydere Testvare ${stamp}`,
          quantity: 1,
          unit_price: 100,
        }],
      });
      invoiceExternalId = invoice.external_id;
      steps.push({
        key: "invoice",
        label: "Opret kladde-faktura",
        ok: true,
        external_id: invoice.external_id,
        external_number: invoice.external_number ?? null,
        message: `Kladde oprettet${invoice.external_number ? ` (#${invoice.external_number})` : ""}`,
        duration_ms: Date.now() - t0,
      });
    } catch (e) {
      steps.push({
        key: "invoice",
        label: "Opret kladde-faktura",
        ok: false,
        message: e instanceof Error ? e.message : String(e),
        duration_ms: Date.now() - t0,
      });
      return json({ ok: false, steps }, 200);
    }

    // 5) Cleanup — slet kladden igen så regnskabet ikke står med en testfaktura
    t0 = Date.now();
    try {
      if (adapter.deleteOrder && invoiceExternalId) {
        await adapter.deleteOrder(invoiceExternalId);
        steps.push({
          key: "cleanup",
          label: "Ryd op (slet kladde)",
          ok: true,
          message: "Kladde-fakturaen er slettet igen.",
          duration_ms: Date.now() - t0,
        });
      } else {
        steps.push({
          key: "cleanup",
          label: "Ryd op (slet kladde)",
          ok: true,
          message: "Sletning understøttes ikke af denne udbyder — kladden ligger som draft.",
          duration_ms: Date.now() - t0,
        });
      }
    } catch (e) {
      steps.push({
        key: "cleanup",
        label: "Ryd op (slet kladde)",
        ok: false,
        message: `Kunne ikke slette kladden automatisk — slet den manuelt i regnskabsprogrammet. (${e instanceof Error ? e.message : String(e)})`,
        duration_ms: Date.now() - t0,
      });
    }

    return json({
      ok: steps.every(s => s.ok),
      steps,
      note: "Testkunde og testvare ligger stadig i dit regnskab — du kan slette dem manuelt hvis du vil.",
    }, 200);
  } catch (e) {
    return json({ ok: false, error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}