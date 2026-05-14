// Dry-run kundetest mod en regnskabs-udbyder.
// I testfasen må regnskabsprogrammerne KUN synkronisere kunder, så denne
// funktion tester kun forbindelse + oprettelse af testkunde — ingen varer,
// fakturaer eller cleanup-flow.
// Returnerer trin-for-trin resultat så brugeren kan se hvor det evt. går galt.
// Bemærk: api_token gemmes IKKE — den bruges kun i denne ene request.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeAdapter } from "../_shared/accounting/index.ts";
import type { AccountingProvider } from "../_shared/accounting/types.ts";
import { requireAuthenticatedUser } from "../_shared/auth.ts";

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
  key: "connect" | "customer";
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
    const auth = await requireAuthenticatedUser(req, Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
    if ("error" in auth) return json({ error: auth.error }, auth.status);
    const supabase = auth.userClient;

    const body = await req.json().catch(() => ({}));
    const provider = body?.provider as AccountingProvider | undefined;
    const api_token = String(body?.api_token ?? "").trim();
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
    if (!biz || biz.owner_id !== auth.userId) return json({ error: "Forbidden" }, 403);

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

    return json({
      ok: steps.every(s => s.ok),
      steps,
      note: "Kundetesten oprettede kun en testkunde — ingen varer eller fakturaer blev oprettet.",
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