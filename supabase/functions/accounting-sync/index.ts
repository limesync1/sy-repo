// Generic sync dispatcher.
// - Mode "queue": drain pending sync_queue jobs for one business (or all if business_id omitted; service-role)
// - Mode "pull":  pull customers + products from accounting provider into Serviceydere
// - Mode "push_order": force re-push of one order
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeAdapter, AccountingAdapter } from "../_shared/accounting/index.ts";
import { requireAuthenticatedUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

// Test-gate slået fra: vi synker nu fuldt flow (kunder, produkter, ordrer
// OG fakturaer). Sæt til true igen midlertidigt hvis en provider er ustabil.
const CUSTOMERS_ONLY = false;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  let outerBusinessId: string | null = null;
  try {
    const body = await req.json().catch(() => ({}));
    const { mode = "queue", business_id, order_id, internal_mode } = body;
    outerBusinessId = business_id ?? null;

    // Service-role client for actual DB work
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // If called externally (not internal cron), verify caller owns the business
    if (!internal_mode) {
      const auth = await requireAuthenticatedUser(req, SUPABASE_URL, ANON_KEY);
      if ("error" in auth) return json({ error: auth.error }, auth.status);
      const userClient = auth.userClient;
      if (business_id) {
        const { data: biz } = await userClient.from("businesses")
          .select("id, owner_id").eq("id", business_id).maybeSingle();
        if (!biz || biz.owner_id !== auth.userId) return json({ error: "Forbidden" }, 403);
      }
    }

    if (!business_id) return json({ error: "business_id required" }, 400);

    // Hård feature-gate: hvis virksomheden ikke har aktiveret
    // regnskabs-integrationen i sine indstillinger, så kør slet ikke. Det
    // sikrer at vi heller ikke skriver i sync-loggen.
    const { data: biz } = await admin.from("businesses")
      .select("settings").eq("id", business_id).maybeSingle();
    const accountingEnabled = !!(biz?.settings as any)?.accounting_integration_enabled;
    if (!accountingEnabled) {
      return json({ ok: true, skipped: "accounting_integration_disabled" });
    }

    const integration = await loadIntegration(admin, business_id);
    if (!integration) {
      // Ingen aktiv integration → ikke en fejl. Returnér 200 så klient-
      // kald (fx fra kalkulator-/Services-fanen) ikke smider toast-fejl.
      return json({ ok: true, skipped: "no_integration" });
    }

    // Health-tjek: respekter midlertidig pause sat af DB-trigger
    // (auto_pause_failing_integration). Hvis udbyderen har spammet fejl,
    // venter vi ud paused_until før vi rører den igen.
    const { data: health } = await admin
      .from("accounting_integrations")
      .select("paused_until, consecutive_failures")
      .eq("business_id", business_id)
      .maybeSingle();
    const pausedUntil = health?.paused_until ? new Date(health.paused_until) : null;
    if (pausedUntil && pausedUntil > new Date()) {
      return json({
        ok: true,
        skipped: "paused",
        paused_until: pausedUntil.toISOString(),
        consecutive_failures: health?.consecutive_failures ?? 0,
      });
    }

    const adapter = makeAdapter(integration.provider, integration, integration.settings ?? {});

    if (mode === "pull") {
      const result = await pullFromProvider(admin, integration, adapter);
      return json({ ok: true, ...result });
    }
    if (mode === "push_order" && order_id) {
      await pushOrder(admin, integration, adapter, order_id);
      return json({ ok: true });
    }
    if (mode === "seed") {
      const seeded = await seedQueue(admin, business_id);
      return json({ ok: true, seeded });
    }
    // default: drain queue. Auto-seed if empty so first sync actually
    // pushes existing customers/services/orders to the provider.
    let seeded = 0;
    const { count } = await admin
      .from("accounting_sync_queue")
      .select("*", { count: "exact", head: true })
      .eq("business_id", business_id)
      .in("status", ["pending", "failed", "processing"]);
    if (!count || count === 0) {
      seeded = await seedQueue(admin, business_id);
    }
    // Idempotent backfill: enqueue entities that have NEVER been linked yet,
    // even if the queue currently has unrelated jobs. Without this, services
    // that existed before the trigger was active would never be pushed.
    seeded += await seedMissing(admin, business_id, integration.provider);
    const drained = await drainQueue(admin, integration, adapter);
    return json({ ok: true, processed: drained, seeded });
  } catch (e) {
    console.error("accounting-sync error", e);
    const message = e instanceof Error ? e.message : String(e);
    const userActionRequired = isUserActionableAccountingError(message);
    // Hvis fejlen kræver brugerens handling (udløbet demo, manglende token,
    // forbudt adgang osv.), så pauser vi integrationen i en time så cron'en
    // ikke bliver ved med at hamre på en kendt-død forbindelse. Brugeren
    // får besked via last_error/last_error_at i UI'et.
    if (userActionRequired && outerBusinessId) {
      try {
        const admin = createClient(SUPABASE_URL, SERVICE_KEY);
        await admin.from("accounting_integrations").update({
          paused_until: new Date(Date.now() + 60 * 60_000).toISOString(),
          last_error: message,
          last_error_at: new Date().toISOString(),
        }).eq("business_id", outerBusinessId);
      } catch (_) { /* ignorer — top-level fejlhåndtering må ikke kaste */ }
    }
    return json({ ok: false, error: message, user_action_required: userActionRequired }, userActionRequired ? 200 : 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function isUserActionableAccountingError(message: string): boolean {
  return /demo-aftale er udløbet|forbindelsen blev afvist|app secret token|agreement grant token|api-nøglen|access token|afviste login|invalid token|unauthorized|forbidden/i.test(message);
}

// ─── SEED ────────────────────────────────────────────────────────────────
// Læg alle eksisterende kunder, services og ordrer i køen så første synk
// faktisk har noget at sende til regnskabsprogrammet.
// Inkluderer også "skygge-kunder" der kun findes som denormaliseret data
// på orders (customer_email/customer_name) — dem opretter vi som rigtige
// kunde-rækker og enqueuer dem også.
async function seedQueue(admin: SupabaseClient, business_id: string): Promise<number> {
  const rows: any[] = [];

  // 1) Eksisterende kunder
  const [bcs, pcs, svcs, ords] = await Promise.all([
    admin.from("business_customers").select("id").eq("business_id", business_id),
    admin.from("private_customers").select("id").eq("business_id", business_id),
    admin.from("services").select("id").eq("business_id", business_id),
    admin.from("orders").select("id, customer_email, customer_name, customer_phone, address, zip_code, city, cvr, company_name, invoice_external_id")
      .eq("business_id", business_id).neq("status", "cancelled"),
  ]);

  const seenEmails = new Set<string>();
  for (const r of bcs.data ?? []) rows.push({ business_id, entity_type: "customer", entity_id: r.id, operation: "update" });
  for (const r of pcs.data ?? []) rows.push({ business_id, entity_type: "customer", entity_id: r.id, operation: "update" });
  if (!CUSTOMERS_ONLY) {
    for (const r of svcs.data ?? []) rows.push({ business_id, entity_type: "product", entity_id: r.id, operation: "update" });
  }

  // 2) Skygge-kunder fra orders (typisk efter offentlig bestilling)
  for (const o of ords.data ?? []) {
    const email = (o.customer_email ?? "").trim().toLowerCase();
    if (!email || seenEmails.has(email)) {
      if (email) seenEmails.add(email);
      continue;
    }
    seenEmails.add(email);

    const isCompany = !!o.cvr;
    if (isCompany) {
      // Findes der allerede en business_customer med samme cvr/email?
      const { data: ex } = await admin.from("business_customers").select("id")
        .eq("business_id", business_id)
        .or(`cvr.eq.${o.cvr},email.eq.${email}`)
        .maybeSingle();
      if (ex) {
        rows.push({ business_id, entity_type: "customer", entity_id: ex.id, operation: "update" });
      } else {
        const { data: created } = await admin.from("business_customers").insert({
          business_id,
          company_name: o.company_name ?? o.customer_name ?? email,
          email,
          phone: o.customer_phone, cvr: o.cvr,
          address: o.address, zip_code: o.zip_code, city: o.city,
        }).select("id").single();
        if (created) rows.push({ business_id, entity_type: "customer", entity_id: created.id, operation: "create" });
      }
    } else {
      const { data: ex } = await admin.from("private_customers").select("id")
        .eq("business_id", business_id).eq("email", email).maybeSingle();
      if (ex) {
        rows.push({ business_id, entity_type: "customer", entity_id: ex.id, operation: "update" });
      } else {
        const { data: created } = await admin.from("private_customers").insert({
          business_id,
          name: o.customer_name ?? email,
          email,
          phone: o.customer_phone,
          address: o.address, zip_code: o.zip_code, city: o.city,
        }).select("id").single();
        if (created) rows.push({ business_id, entity_type: "customer", entity_id: created.id, operation: "create" });
      }
    }
  }

  // 3) Ordrer
  if (!CUSTOMERS_ONLY) {
    for (const o of ords.data ?? []) {
      // Allerede bogførte fakturaer må ikke pushes igen som ordrekladder.
      // Betaling/rykker-status hentes via invoice-pull i stedet.
      if (o.invoice_external_id) continue;
      rows.push({ business_id, entity_type: "order", entity_id: o.id, operation: "update" });
    }
  }

  if (rows.length === 0) return 0;
  // Indsæt en ad gangen så en eksisterende aktiv (pending/processing) række
  // for samme entitet ikke får hele batchen til at fejle via
  // uq_sync_queue_active_entity. Duplicate-key (23505) ignoreres bevidst.
  let inserted = 0;
  for (const r of rows) {
    const { error } = await admin.from("accounting_sync_queue").insert(r);
    if (!error) inserted++;
    else if ((error as any).code && (error as any).code !== "23505") {
      console.warn("[accounting-sync] enqueue failed", error);
    }
  }
  return inserted;
}

// Find services/customers/orders that never got pushed (no link row) and
// enqueue them. Safe to call repeatedly — the unique index on the queue
// prevents duplicates.
async function seedMissing(admin: SupabaseClient, business_id: string, provider: string): Promise<number> {
  const rows: any[] = [];

  // Services without a product link
  const [{ data: svcs }, { data: prodLinks }] = await Promise.all([
    admin.from("services").select("id").eq("business_id", business_id),
    admin.from("accounting_product_links").select("service_id")
      .eq("business_id", business_id).eq("provider", provider),
  ]);
  const linkedSvc = new Set((prodLinks ?? []).map((r: any) => r.service_id));
  for (const s of svcs ?? []) {
    if (!linkedSvc.has(s.id)) {
      rows.push({ business_id, entity_type: "product", entity_id: s.id, operation: "create" });
    }
  }

  // Customers without a customer link
  const [{ data: bcs }, { data: pcs }, { data: custLinks }] = await Promise.all([
    admin.from("business_customers").select("id").eq("business_id", business_id),
    admin.from("private_customers").select("id").eq("business_id", business_id),
    admin.from("accounting_customer_links").select("business_customer_id, private_customer_id")
      .eq("business_id", business_id).eq("provider", provider),
  ]);
  const linkedBC = new Set((custLinks ?? []).map((r: any) => r.business_customer_id).filter(Boolean));
  const linkedPC = new Set((custLinks ?? []).map((r: any) => r.private_customer_id).filter(Boolean));
  for (const c of bcs ?? []) {
    if (!linkedBC.has(c.id)) {
      rows.push({ business_id, entity_type: "customer", entity_id: c.id, operation: "create" });
    }
  }
  for (const c of pcs ?? []) {
    if (!linkedPC.has(c.id)) {
      rows.push({ business_id, entity_type: "customer", entity_id: c.id, operation: "create" });
    }
  }

  if (rows.length === 0) return 0;
  // Insert one-by-one to silently skip rows that already exist in the queue
  let inserted = 0;
  for (const r of rows) {
    const { error } = await admin.from("accounting_sync_queue").insert(r);
    if (!error) inserted++;
  }
  return inserted;
}

// ─── helpers ────────────────────────────────────────────────────────────

interface Integration {
  business_id: string;
  provider: any;
  api_token: string | null;
  api_secret: string | null;
  agreement_number: string | null;
  organization_id: string | null;
  settings: any;
  last_pull_at: string | null;
}

async function loadIntegration(admin: SupabaseClient, business_id: string): Promise<Integration | null> {
  const { data } = await admin.from("accounting_integrations")
    .select("*").eq("business_id", business_id).eq("is_active", true).maybeSingle();
  return data as Integration | null;
}

async function logSync(admin: SupabaseClient, opts: {
  business_id: string; provider: string; direction: "push"|"pull";
  entity_type: "customer"|"product"|"order"|"invoice"|"connection";
  entity_id?: string|null; external_id?: string|null;
  status: "success"|"error"|"skipped"; message?: string|null; payload?: any;
}) {
  // Reducér log-spam: vi skriver KUN errors og pull-/connection-summaries.
  // Successful per-entity-pushes (customer/product/order) genererer ellers
  // hundredevis af log-rækker pr. synk og er sjældent nyttigt at læse.
  if (opts.status === "success" && opts.entity_type !== "connection") {
    return;
  }
  await admin.from("accounting_sync_log").insert(opts);
}

// ─── Field-diff helpers ─────────────────────────────────────────────────
// Vi gemmer den senest synkroniserede værdi pr. (entitet, felt) i
// accounting_field_state. Det giver os to ting:
//   1) PUSH: vi sender kun felter hvor vores nuværende værdi adskiller
//      sig fra den senest synkede værdi → ingen overskrivning af felter
//      brugeren har rettet i Billy/Dinero/e-conomic siden.
//   2) PULL: vi opdaterer kun lokale felter hvor remote-værdien rent
//      faktisk har ændret sig siden sidste pull → ingen ekko-loops.

type EntityType = "customer" | "product" | "order";

async function getFieldState(
  admin: SupabaseClient,
  business_id: string,
  provider: string,
  entity_type: EntityType,
  entity_id: string,
): Promise<Record<string, { field_value: any; remote_value: any }>> {
  const { data } = await admin
    .from("accounting_field_state")
    .select("field_name, field_value, remote_value")
    .eq("business_id", business_id)
    .eq("provider", provider)
    .eq("entity_type", entity_type)
    .eq("entity_id", entity_id);
  const out: Record<string, { field_value: any; remote_value: any }> = {};
  for (const r of data ?? []) {
    out[r.field_name as string] = {
      field_value: r.field_value,
      remote_value: r.remote_value,
    };
  }
  return out;
}

function eq(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return JSON.stringify(a) === JSON.stringify(b);
}

/**
 * Returnér kun de felter der er ændret siden sidste push, så vi ikke
 * sender uændrede (og potentielt forældede) værdier.
 */
function diffForPush<T extends Record<string, any>>(
  current: T,
  state: Record<string, { field_value: any }>,
): Partial<T> {
  const out: Partial<T> = {};
  for (const [k, v] of Object.entries(current)) {
    if (v === undefined) continue;
    const last = state[k]?.field_value;
    if (!eq(v, last)) (out as any)[k] = v;
  }
  return out;
}

async function recordPushedFields(
  admin: SupabaseClient,
  business_id: string,
  provider: string,
  entity_type: EntityType,
  entity_id: string,
  fields: Record<string, any>,
) {
  const rows = Object.entries(fields).map(([field_name, field_value]) => ({
    business_id, provider, entity_type, entity_id,
    field_name, field_value,
    last_pushed_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return;
  await admin.from("accounting_field_state").upsert(rows, {
    onConflict: "business_id,provider,entity_type,entity_id,field_name",
  });
}

async function recordPulledFields(
  admin: SupabaseClient,
  business_id: string,
  provider: string,
  entity_type: EntityType,
  entity_id: string,
  fields: Record<string, any>,
) {
  const rows = Object.entries(fields).map(([field_name, remote_value]) => ({
    business_id, provider, entity_type, entity_id,
    field_name,
    field_value: remote_value, // sidste kendte fælles værdi
    remote_value,
    last_pulled_at: new Date().toISOString(),
  }));
  if (rows.length === 0) return;
  await admin.from("accounting_field_state").upsert(rows, {
    onConflict: "business_id,provider,entity_type,entity_id,field_name",
  });
}

async function setIntegrationError(admin: SupabaseClient, business_id: string, error: string | null) {
  await admin.from("accounting_integrations").update({
    last_error: error,
    last_error_at: error ? new Date().toISOString() : null,
  }).eq("business_id", business_id);
}

// ─── PULL ────────────────────────────────────────────────────────────────
async function pullFromProvider(admin: SupabaseClient, integ: Integration, adapter: AccountingAdapter) {
  const since = integ.last_pull_at ? new Date(integ.last_pull_at) : undefined;
  let customersPulled = 0;
  let productsPulled = 0;

  try {
    const customers = await adapter.listCustomers(since);
    for (const ec of customers) {
      const matched = await matchCustomer(admin, integ.business_id, ec);
      // Byg incoming-felt-payload én gang så vi kan diff'e mod shadow
      const incoming: Record<string, any> = {
        email: ec.email ?? null,
        phone: ec.phone ?? null,
        address: ec.address ?? null,
        zip_code: ec.zip_code ?? null,
        city: ec.city ?? null,
        payment_terms_days: ec.payment_terms_days ?? null,
        currency: "DKK",
        cvr: ec.cvr ?? null,
        ean: ec.ean ?? null,
        name: ec.name,
      };
      if (matched) {
        // Hent nuværende lokale værdier og sammenlign DIREKTE mod remote
        // (regnskabsprogrammet er master). Hvis de afviger overskriver vi
        // lokal med remote — dette sikrer at brugerens ændringer i Billy/
        // Dinero/e-conomic altid synkroniseres ned til Serviceydere.
        const { data: localRow } = await admin
          .from(matched.table).select("*").eq("id", matched.id).maybeSingle();
        const dbUpdate: Record<string, any> = {};
        if (localRow) {
          if (!eq(incoming.email, localRow.email))                       dbUpdate.email = incoming.email;
          if (!eq(incoming.phone, localRow.phone))                       dbUpdate.phone = incoming.phone;
          if (!eq(incoming.address, localRow.address))                   dbUpdate.address = incoming.address;
          if (!eq(incoming.zip_code, localRow.zip_code))                 dbUpdate.zip_code = incoming.zip_code;
          if (!eq(incoming.city, localRow.city))                         dbUpdate.city = incoming.city;
          if (!eq(incoming.payment_terms_days, localRow.payment_terms_days)) dbUpdate.payment_terms_days = incoming.payment_terms_days;
          if (matched.table === "business_customers") {
            if (!eq(incoming.cvr, localRow.cvr))                         dbUpdate.cvr = incoming.cvr;
            if (!eq(incoming.ean, localRow.ean_number))                  dbUpdate.ean_number = incoming.ean;
            if (incoming.name && !eq(incoming.name, localRow.company_name)) dbUpdate.company_name = incoming.name;
          } else {
            if (incoming.name && !eq(incoming.name, localRow.name))      dbUpdate.name = incoming.name;
          }
        }
        if (Object.keys(dbUpdate).length > 0) {
          const { error: upErr } = await admin.from(matched.table).update(dbUpdate).eq("id", matched.id);
          if (upErr) {
            console.error("[pull] customer update failed", { id: matched.id, table: matched.table, error: upErr.message, dbUpdate });
          } else {
            console.log("[pull] customer updated", { id: matched.id, table: matched.table, fields: Object.keys(dbUpdate) });
          }
        }
        await recordPulledFields(admin, integ.business_id, integ.provider, "customer", matched.id, incoming);
        // Sørg for at link findes så fremtidige opdateringer matcher
        await upsertCustomerLink(
          admin, integ, ec, matched.id,
          matched.table === "business_customers" ? "business_customer" : "private_customer",
          "pull",
        );
      } else {
        // Create new customer in Serviceydere.
        // Vi anser kunden som virksomhed hvis EN AF følgende er sandt:
        //   1) der er et CVR-nummer
        //   2) der er et EAN-nummer (kun firmaer har EAN)
        //   3) udbyderen oplyser eksplicit type="company"
        // Tidligere brugte vi kun CVR — det betød at virksomhedskunder uden
        // CVR (f.eks. nyoprettede i Billy uden udfyldt CVR-felt) endte i
        // private_customers OG kunne fejle hvis insertet stred mod en
        // constraint, så de helt forsvandt fra Serviceydere.
        const isCompany = !!ec.cvr || !!ec.ean || ec.type === "company";
        let createdId: string | null = null;
        let createdTable: "business_customers" | "private_customers" = "private_customers";
        const fallbackEmail = `unknown+${ec.external_id}@example.com`;
        if (isCompany) {
          const { data: created, error: createErr } = await admin.from("business_customers").insert({
            business_id: integ.business_id,
            company_name: ec.name,
            email: ec.email ?? fallbackEmail,
            phone: ec.phone, cvr: ec.cvr, ean_number: ec.ean,
            address: ec.address, zip_code: ec.zip_code, city: ec.city,
            payment_terms_days: ec.payment_terms_days, currency: "DKK",
          }).select("id").single();
          if (createErr) {
            console.error("[pull] business_customers insert failed", {
              external_id: ec.external_id, name: ec.name, error: createErr.message,
            });
          }
          if (created) { createdId = created.id; createdTable = "business_customers"; }
        } else {
          const { data: created, error: createErr } = await admin.from("private_customers").insert({
            business_id: integ.business_id, name: ec.name,
            email: ec.email ?? fallbackEmail,
            phone: ec.phone, address: ec.address, zip_code: ec.zip_code, city: ec.city,
            payment_terms_days: ec.payment_terms_days, currency: "DKK",
          }).select("id").single();
          if (createErr) {
            console.error("[pull] private_customers insert failed", {
              external_id: ec.external_id, name: ec.name, error: createErr.message,
            });
          }
          if (created) { createdId = created.id; createdTable = "private_customers"; }
        }
        if (createdId) {
          await upsertCustomerLink(
            admin, integ, ec, createdId,
            createdTable === "business_customers" ? "business_customer" : "private_customer",
            "pull",
          );
          await recordPulledFields(
            admin, integ.business_id, integ.provider, "customer", createdId, incoming,
          );
        }
      }
      customersPulled++;
    }

    const products = CUSTOMERS_ONLY ? [] : await adapter.listProducts(since);
    for (const ep of products) {
      // To-vejs synk: opdatér både link OG den interne service med pris/navn
      // hvis brugeren har ændret det i regnskabsprogrammet.
      const { data: existing } = await admin.from("accounting_product_links")
        .select("id, service_id").eq("business_id", integ.business_id)
        .eq("provider", integ.provider).eq("external_id", ep.external_id).maybeSingle();
      if (existing) {
        await admin.from("accounting_product_links").update({
          external_product_number: ep.external_number,
          last_synced_at: new Date().toISOString(),
          external_data: ep.raw ?? {},
        }).eq("id", existing.id);
        // Pull pris/navn ind på den koblede service — men kun hvis remote
        // har ændret sig siden sidste pull (felt-diff).
        if (existing.service_id) {
          const incomingP: Record<string, any> = {
            name: ep.name,
            unit_price: Number.isFinite(ep.unit_price) ? ep.unit_price : null,
          };
          const state = await getFieldState(admin, integ.business_id, integ.provider, "product", existing.service_id);
          const update: Record<string, unknown> = {};
          if (incomingP.name && !eq(incomingP.name, state.name?.remote_value)) {
            update.name = incomingP.name;
          }
          if (incomingP.unit_price && incomingP.unit_price > 0
              && !eq(incomingP.unit_price, state.unit_price?.remote_value)) {
            update.base_price = incomingP.unit_price;
          }
          if (Object.keys(update).length > 0) {
            await admin.from("services").update(update).eq("id", existing.service_id);
          }
          await recordPulledFields(admin, integ.business_id, integ.provider, "product", existing.service_id, incomingP);
        }
      } else {
        // Nyt produkt i regnskabsprogrammet — opret som service i Serviceydere
        // og link det. Sætter vi ikke en pris bruger vi 0 så brugeren selv kan
        // rette den. Bruger pricing_type='fast_pris' som standard.
        const unitPrice = Number.isFinite(ep.unit_price) && ep.unit_price > 0 ? ep.unit_price : 0;
        const { data: createdSvc, error: svcErr } = await admin.from("services").insert({
          business_id: integ.business_id,
          name: ep.name || `Produkt ${ep.external_number ?? ep.external_id}`,
          base_price: unitPrice,
          pricing_type: "fast_pris",
          product_number: ep.external_number ?? null,
          accounting_account_number: ep.account_number ?? null,
          default_vat_rate: ep.vat_rate ?? 25,
          is_active: true,
        }).select("id").single();
        if (svcErr) {
          console.error("[pull] service insert failed", {
            external_id: ep.external_id, name: ep.name, error: svcErr.message,
          });
        } else if (createdSvc) {
          await admin.from("accounting_product_links").insert({
            business_id: integ.business_id,
            provider: integ.provider,
            service_id: createdSvc.id,
            external_id: ep.external_id,
            external_product_number: ep.external_number ?? null,
            external_data: ep.raw ?? {},
            last_synced_at: new Date().toISOString(),
          });
          await recordPulledFields(
            admin, integ.business_id, integ.provider, "product", createdSvc.id,
            { name: ep.name, unit_price: unitPrice },
          );
        }
      }
      productsPulled++;
    }

    // Sync payment status from provider for orders we've pushed.
    // Payment status is ALWAYS sourced from the accounting program — never
    // set manually inside Serviceydere.
    let invoicesPulled = 0;
    if (!CUSTOMERS_ONLY && typeof adapter.getInvoiceStates === "function") {
      // Vi henter KUN faktura-typer (ikke ordre-kladder) — at spørge
      // /invoices/booked/{n} for et order-draft ID giver 404 og spammer
      // logfilen, og kunden ser fejl-banneret "kunne ikke finde det
      // forespurgte. Tjek at din aftale er aktiv." selvom integrationen er fin.
      const { data: links } = await admin
        .from("accounting_order_links")
        .select("order_id, external_id, external_type")
        .eq("business_id", integ.business_id)
        .eq("provider", integ.provider)
        .in("external_type", ["invoice", "invoice_draft", "invoice_booked"])
        .order("last_pushed_at", { ascending: false })
        .limit(200);
      const ids = (links ?? []).map((l) => l.external_id).filter(Boolean);
      if (ids.length > 0) {
        const states = await adapter.getInvoiceStates(ids);
        const byExt = new Map(states.map((s) => [String(s.external_id), s]));
        for (const l of links!) {
          const s = byExt.get(String(l.external_id));
          if (!s) continue;
          const { data: currentOrder } = await admin.from("orders")
            .select("payment_status, paid_at, paid_amount")
            .eq("id", l.order_id).maybeSingle();
          const keepManualPaid = currentOrder?.payment_status === "paid" && s.status !== "paid";
          await admin.from("orders").update({
            payment_status: keepManualPaid ? "paid" : s.status,
            paid_at: keepManualPaid ? currentOrder.paid_at : s.paid_at,
            paid_amount: keepManualPaid ? currentOrder.paid_amount : (s.paid_amount ?? null),
            payment_status_synced_at: new Date().toISOString(),
            due_date: s.due_date ?? null,
            reminder_count: s.reminder_count ?? 0,
            last_reminder_at: s.last_reminder_at ?? null,
            last_reminder_type: s.last_reminder_type ?? null,
            reminder_history: s.reminder_history ?? [],
            credited_at: s.credited ? (s.credited_at ?? new Date().toISOString()) : null,
            credit_note_external_id: s.credit_note_external_id ?? null,
            credit_note_external_number: s.credit_note_external_number ?? null,
            voided_at: s.voided ? (s.voided_at ?? new Date().toISOString()) : null,
          }).eq("id", l.order_id);
          invoicesPulled++;
        }
      }
    }

    await admin.from("accounting_integrations").update({
      last_pull_at: new Date().toISOString(),
    }).eq("business_id", integ.business_id);
    await setIntegrationError(admin, integ.business_id, null);

    // ── Status-spejling for fakturaer vi SELV har pushet:
    // Vi opretter ALDRIG nye ordrer/aftaler i Serviceydere fra fakturaer i
    // regnskabsprogrammet — flowet er envejs (Serviceydere → regnskabsprogram).
    // Her opdaterer vi kun betalingsstatus på vores eksisterende linkede
    // ordrer/aftale-forekomster ud fra hvad regnskabsprogrammet rapporterer.
    let invoiceStatusUpdates = 0;
    if (!CUSTOMERS_ONLY && typeof adapter.listInvoices === "function") {
      try {
        const externalInvoices = await adapter.listInvoices(since);
        for (const inv of externalInvoices) {
          const { data: existingLink } = await admin.from("accounting_order_links")
            .select("id, order_id, agreement_occurrence_id")
            .eq("business_id", integ.business_id)
            .eq("provider", integ.provider)
            .eq("external_id", inv.external_id)
            .maybeSingle();
          if (!existingLink) continue; // Ikke pushet fra Serviceydere — ignorér

          if (existingLink.order_id) {
            const { data: currentOrder } = await admin.from("orders")
              .select("payment_status, paid_at, paid_amount")
              .eq("id", existingLink.order_id).maybeSingle();
            const keepManualPaid = currentOrder?.payment_status === "paid" && inv.status !== "paid";
            await admin.from("orders").update({
              payment_status: keepManualPaid ? "paid" : inv.status,
              paid_at: keepManualPaid ? currentOrder.paid_at : inv.paid_at,
              paid_amount: keepManualPaid ? currentOrder.paid_amount : (inv.paid_amount ?? null),
              payment_status_synced_at: new Date().toISOString(),
              due_date: inv.due_date ?? null,
            }).eq("id", existingLink.order_id);
            invoiceStatusUpdates++;
          } else if (existingLink.agreement_occurrence_id) {
            await admin.from("agreement_occurrences").update({
              payment_status: inv.status,
              paid_at: inv.paid_at,
              paid_amount: inv.paid_amount ?? null,
              due_date: inv.due_date ?? null,
            }).eq("id", existingLink.agreement_occurrence_id);
            invoiceStatusUpdates++;
          }
        }
      } catch (e) {
        console.error("[pull] listInvoices failed", e instanceof Error ? e.message : String(e));
      }
    }

    await logSync(admin, {
      business_id: integ.business_id, provider: integ.provider,
      direction: "pull", entity_type: "connection", status: "success",
      message: `Pulled ${customersPulled} customers, ${productsPulled} products, ${invoicesPulled} invoice statuses, ${invoiceStatusUpdates} invoice status updates`,
    });
    return { customers: customersPulled, products: productsPulled, invoices: invoicesPulled, shadow_invoices: 0, invoice_status_updates: invoiceStatusUpdates };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await setIntegrationError(admin, integ.business_id, msg);
    await logSync(admin, {
      business_id: integ.business_id, provider: integ.provider,
      direction: "pull", entity_type: "connection", status: "error", message: msg,
    });
    throw e;
  }
}

async function matchCustomer(admin: SupabaseClient, business_id: string, ec: { external_id: string; cvr?: string|null; email?: string|null; name: string; zip_code?: string|null; }) {
  // 1) existing link
  const { data: link } = await admin.from("accounting_customer_links")
    .select("business_customer_id, private_customer_id")
    .eq("business_id", business_id).eq("external_id", ec.external_id).maybeSingle();
  if (link?.business_customer_id) return { table: "business_customers" as const, id: link.business_customer_id };
  if (link?.private_customer_id) return { table: "private_customers" as const, id: link.private_customer_id };

  // 2) CVR
  if (ec.cvr) {
    const { data } = await admin.from("business_customers").select("id")
      .eq("business_id", business_id).eq("cvr", ec.cvr).maybeSingle();
    if (data) return { table: "business_customers" as const, id: data.id };
  }
  // 3) Email
  if (ec.email) {
    const { data: bc } = await admin.from("business_customers").select("id")
      .eq("business_id", business_id).eq("email", ec.email).maybeSingle();
    if (bc) return { table: "business_customers" as const, id: bc.id };
    const { data: pc } = await admin.from("private_customers").select("id")
      .eq("business_id", business_id).eq("email", ec.email).maybeSingle();
    if (pc) return { table: "private_customers" as const, id: pc.id };
  }
  // 4) name + zip
  if (ec.zip_code) {
    const { data: bc } = await admin.from("business_customers").select("id")
      .eq("business_id", business_id).eq("company_name", ec.name).eq("zip_code", ec.zip_code).maybeSingle();
    if (bc) return { table: "business_customers" as const, id: bc.id };
    const { data: pc } = await admin.from("private_customers").select("id")
      .eq("business_id", business_id).eq("name", ec.name).eq("zip_code", ec.zip_code).maybeSingle();
    if (pc) return { table: "private_customers" as const, id: pc.id };
  }
  return null;
}

async function upsertCustomerLink(
  admin: SupabaseClient, integ: Integration,
  ec: any, internalId: string, type: "business_customer"|"private_customer",
  direction: "push"|"pull",
) {
  await admin.from("accounting_customer_links").upsert({
    business_id: integ.business_id, provider: integ.provider,
    external_id: ec.external_id, external_customer_number: ec.external_number ?? null,
    business_customer_id: type === "business_customer" ? internalId : null,
    private_customer_id:  type === "private_customer"  ? internalId : null,
    last_synced_at: new Date().toISOString(),
    last_direction: direction,
    external_data: ec.raw ?? {},
  }, { onConflict: "business_id,provider,external_id" });
}

// ─── PUSH (queue drain) ──────────────────────────────────────────────────
async function drainQueue(admin: SupabaseClient, integ: Integration, adapter: AccountingAdapter): Promise<number> {
  const { data: jobs } = await admin.from("accounting_sync_queue")
    .select("*").eq("business_id", integ.business_id)
    .in("status", ["pending", "failed"])
    .lte("scheduled_for", new Date().toISOString())
    .order("created_at", { ascending: true })
    .limit(50);
  if (!jobs || jobs.length === 0) return 0;

  let processed = 0;
  // Cirkuit-bryder: hvis udbyderen (Billy/Dinero/e-conomic) er nede,
  // stopper vi resten af kørslen i stedet for at hamre løs på 50 jobs
  // og logge 50 identiske fejl. Re-prøves automatisk ved næste kick.
  let providerDown = false;
  // Lokal cache i denne kørsel: hvis et bestemt customer/product allerede
  // er fejlet, springer vi det over for resten af kørslen så vi ikke
  // kalder Billy 10 gange for samme kunde/produkt.
  const failedThisRun = new Set<string>();
  for (const job of jobs) {
    // MIDLERTIDIG TESTFASE: spring produkt-/ordre-jobs over så vi kun
    // synker kunder. Vi markerer dem som "skipped" så køen ikke vokser.
    if (CUSTOMERS_ONLY && job.entity_type !== "customer") {
      await admin.from("accounting_sync_queue").update({
        status: "done",
        processed_at: new Date().toISOString(),
        last_error: "Skipped: customers-only mode",
      }).eq("id", job.id);
      continue;
    }
    if (providerDown) {
      // Re-skemalér resten uden at kalde provideren igen
      await admin.from("accounting_sync_queue").update({
        status: "pending",
        scheduled_for: new Date(Date.now() + 5 * 60_000).toISOString(),
      }).eq("id", job.id);
      continue;
    }
    const dedupeKey = `${job.entity_type}:${job.entity_id}`;
    if (failedThisRun.has(dedupeKey)) {
      await admin.from("accounting_sync_queue").update({
        status: "pending",
        scheduled_for: new Date(Date.now() + 5 * 60_000).toISOString(),
      }).eq("id", job.id);
      continue;
    }
    await admin.from("accounting_sync_queue").update({ status: "processing", attempts: job.attempts + 1 }).eq("id", job.id);
    try {
      if (job.entity_type === "customer") await pushCustomer(admin, integ, adapter, job.entity_id);
      else if (job.entity_type === "product") await pushProduct(admin, integ, adapter, job.entity_id);
      else if (job.entity_type === "order") await pushOrder(admin, integ, adapter, job.entity_id, job.operation);
      else if (job.entity_type === "invoice") await bookInvoiceForOrder(admin, integ, adapter, job.entity_id);
      else if (job.entity_type === "agreement_occurrence") {
        if (job.operation === "invoice") {
          await bookInvoiceForOccurrence(admin, integ, adapter, job.entity_id);
        } else {
          // create_order, update, upsert → push som ordre/kladde
          await pushOccurrenceOrder(admin, integ, adapter, job.entity_id);
        }
      }
      await admin.from("accounting_sync_queue").update({
        status: "done", processed_at: new Date().toISOString(), last_error: null,
      }).eq("id", job.id);
      processed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const isProviderDown = /svarer ikke|503|502|504|timeout|ECONNRESET|rate.?limit|429/i.test(msg);
      // Behandl bruger-handlings-fejl (udløbet demo, manglende/forkert token,
      // 401/403 fra udbyderen) som "provider down" så vi stopper resten af
      // kørslen og pauser integrationen — ellers fejler alle 50 jobs
      // identisk og spammer logget.
      const needsUserFix = isUserActionableAccountingError(msg);
      if (isProviderDown || needsUserFix) providerDown = true;
      if (needsUserFix) {
        // Pause integrationen i 1 time så cron'en ikke kalder den igen før
        // brugeren har fixet credentials. Reset jobbet til pending uden at
        // tælle det som et "rigtigt" forsøg, og spring DLQ over.
        await admin.from("accounting_integrations").update({
          paused_until: new Date(Date.now() + 60 * 60_000).toISOString(),
          last_error: msg,
          last_error_at: new Date().toISOString(),
        }).eq("business_id", integ.business_id);
        await admin.from("accounting_sync_queue").update({
          status: "pending",
          attempts: job.attempts, // ruller forsøget tilbage
          last_error: msg,
          scheduled_for: new Date(Date.now() + 60 * 60_000).toISOString(),
        }).eq("id", job.id);
        // Log kun én gang
        const { count: dupCount } = await admin.from("accounting_sync_log")
          .select("*", { count: "exact", head: true })
          .eq("business_id", integ.business_id)
          .eq("status", "error")
          .eq("message", msg)
          .gte("created_at", new Date(Date.now() - 60 * 60_000).toISOString());
        if (!dupCount || dupCount === 0) {
          await logSync(admin, {
            business_id: integ.business_id, provider: integ.provider,
            direction: "push", entity_type: "connection",
            status: "error", message: msg,
          });
        }
        continue;
      }
      // Special-case: kunden findes ikke længere i e-conomic. Ryd det forældede
      // link så næste forsøg opretter kunden på ny — i stedet for at fejle igen.
      const staleCustomerMatch = msg.match(/ECONOMIC_CUSTOMER_NOT_FOUND:(\d+)/);
      if (staleCustomerMatch) {
        const staleExt = staleCustomerMatch[1];
        await admin.from("accounting_customer_links")
          .delete()
          .eq("business_id", integ.business_id)
          .eq("provider", integ.provider)
          .eq("external_id", staleExt);
        // Re-queue jobbet straks så det forsøges igen med en frisk kunde
        await admin.from("accounting_sync_queue").update({
          status: "pending",
          last_error: `Kunde #${staleExt} fandtes ikke i regnskabsprogrammet — linket ryddet, prøver igen`,
          scheduled_for: new Date(Date.now() + 5_000).toISOString(),
        }).eq("id", job.id);
        continue;
      }
      failedThisRun.add(dedupeKey);
      const failedFinal = job.attempts + 1 >= 5;
      // Backoff: provider-fejl venter længere så vi ikke spammer
      const backoffMs = isProviderDown
        ? Math.min(15 * 60_000, 5 * 60_000 * (job.attempts + 1)) // 5,10,15,15,15 min
        : Math.min(60_000 * (job.attempts + 1), 600_000);
      await admin.from("accounting_sync_queue").update({
        status: failedFinal ? "failed" : "pending",
        last_error: msg,
        scheduled_for: new Date(Date.now() + backoffMs).toISOString(),
      }).eq("id", job.id);
      // Flyt til DLQ når jobbet er endeligt fejlet
      if (failedFinal) {
        await admin.from("accounting_sync_dlq").insert({
          business_id: integ.business_id,
          provider: integ.provider,
          entity_type: job.entity_type,
          entity_id: job.entity_id,
          operation: job.operation,
          attempts: job.attempts + 1,
          last_error: msg,
          original_queue_id: job.id,
          original_created_at: job.created_at,
        });
      }
      // Log kun én fejl pr. (entity, message) pr. dag for at undgå spam
      const { count: existingCount } = await admin.from("accounting_sync_log")
        .select("*", { count: "exact", head: true })
        .eq("business_id", integ.business_id)
        .eq("entity_type", job.entity_type)
        .eq("entity_id", job.entity_id)
        .eq("status", "error")
        .eq("message", msg)
        .gte("created_at", new Date(Date.now() - 24 * 60 * 60_000).toISOString());
      if (!existingCount || existingCount === 0) {
        await logSync(admin, {
          business_id: integ.business_id, provider: integ.provider,
          direction: "push", entity_type: job.entity_type, entity_id: job.entity_id,
          status: "error", message: msg,
        });
      }
    }
  }
  if (processed > 0) {
    await admin.from("accounting_integrations").update({ last_push_at: new Date().toISOString() })
      .eq("business_id", integ.business_id);
  }
  return processed;
}

async function pushCustomer(admin: SupabaseClient, integ: Integration, adapter: AccountingAdapter, customerId: string) {
  // Try business first, then private
  let row: any = null; let table: "business_customers"|"private_customers" = "business_customers";
  const bc = await admin.from("business_customers").select("*").eq("id", customerId).maybeSingle();
  if (bc.data) { row = bc.data; table = "business_customers"; }
  else {
    const pc = await admin.from("private_customers").select("*").eq("id", customerId).maybeSingle();
    if (pc.data) { row = pc.data; table = "private_customers"; }
  }
  if (!row) return;

  const { data: existingLink } = await admin.from("accounting_customer_links")
    .select("external_id").eq("business_id", integ.business_id).eq("provider", integ.provider)
    .or(table === "business_customers"
      ? `business_customer_id.eq.${customerId}`
      : `private_customer_id.eq.${customerId}`).maybeSingle();

  const fullPayload = {
    name: table === "business_customers" ? row.company_name : row.name,
    email: row.email,
    phone: row.phone,
    cvr: table === "business_customers" ? row.cvr : null,
    ean: row.ean_number ?? null,
    address: row.address,
    zip_code: row.zip_code,
    city: row.city,
    payment_terms_days: row.payment_terms_days,
    currency: row.currency,
    customer_number: row.customer_number ?? null,
    customer_group: row.customer_group ?? null,
    vat_zone: row.vat_zone ?? null,
    is_blocked: row.is_blocked ?? false,
  } as const;

  // Felt-diff: send kun ændrede felter ved opdatering så vi ikke
  // overskriver nyere værdier rettet i regnskabsprogrammet. Ved første
  // push (intet eksisterende link) sender vi alt.
  const state = existingLink?.external_id
    ? await getFieldState(admin, integ.business_id, integ.provider, "customer", customerId)
    : {};
  const changed = existingLink?.external_id
    ? diffForPush(fullPayload, state)
    : { ...fullPayload };

  // Hvis intet er ændret OG vi har et link OG link er nyt synket, skip.
  if (existingLink?.external_id && Object.keys(changed).length === 0) {
    return;
  }

  const result = await adapter.upsertCustomer({
    internal_id: customerId,
    // Navn skal altid med så Billy/Dinero ved hvilken kontakt vi mener
    name: (changed as any).name ?? fullPayload.name,
    email: (changed as any).email,
    phone: (changed as any).phone,
    cvr: (changed as any).cvr,
    ean: (changed as any).ean,
    address: (changed as any).address,
    zip_code: (changed as any).zip_code,
    city: (changed as any).city,
    payment_terms_days: (changed as any).payment_terms_days,
    currency: (changed as any).currency,
    customer_number: (changed as any).customer_number ?? fullPayload.customer_number,
    customer_group: (changed as any).customer_group ?? fullPayload.customer_group,
    vat_zone: (changed as any).vat_zone ?? fullPayload.vat_zone,
    is_blocked: (changed as any).is_blocked ?? fullPayload.is_blocked,
    external_id: existingLink?.external_id,
  });
  await upsertCustomerLink(
    admin, integ, { external_id: result.external_id, external_number: result.external_number, raw: result.raw },
    customerId, table === "business_customers" ? "business_customer" : "private_customer", "push",
  );
  // Husk hvad vi sendte, så næste diff er korrekt.
  await recordPushedFields(admin, integ.business_id, integ.provider, "customer", customerId, fullPayload);
  await logSync(admin, {
    business_id: integ.business_id, provider: integ.provider, direction: "push",
    entity_type: "customer", entity_id: customerId, external_id: result.external_id,
    status: "success",
  });
}

async function pushProduct(admin: SupabaseClient, integ: Integration, adapter: AccountingAdapter, serviceId: string) {
  if (integ.settings?.auto_create_products === false) return;
  const { data: svc } = await admin.from("services").select("*").eq("id", serviceId).maybeSingle();
  if (!svc) return;
  const { data: existing } = await admin.from("accounting_product_links")
    .select("external_id").eq("business_id", integ.business_id)
    .eq("provider", integ.provider).eq("service_id", serviceId).maybeSingle();
  const fullPayload = {
    name: svc.name,
    description: svc.description,
    unit_price: Number(svc.base_price ?? 0),
    vat_rate: Number(svc.default_vat_rate ?? 25),
    account_number: svc.accounting_income_account ?? svc.accounting_account_number ?? null,
    product_group: svc.accounting_product_group ?? null,
    product_number: svc.product_number ?? null,
    vat_zone: svc.vat_zone ?? null,
  } as const;

  const state = existing?.external_id
    ? await getFieldState(admin, integ.business_id, integ.provider, "product", serviceId)
    : {};
  const changed = existing?.external_id
    ? diffForPush(fullPayload, state)
    : { ...fullPayload };
  // Vi springer ikke længere over når intet er ændret — adapteren verificerer
  // at produktet stadig findes i regnskabsprogrammet, og opretter det på ny
  // hvis linket er forældet (fx slettet i e-conomic).

  const result = await adapter.upsertProduct({
    internal_id: serviceId,
    name: (changed as any).name ?? fullPayload.name,
    description: (changed as any).description,
    unit_price: (changed as any).unit_price ?? fullPayload.unit_price,
    vat_rate: (changed as any).vat_rate,
    account_number: (changed as any).account_number,
    product_group: (changed as any).product_group,
    external_id: existing?.external_id,
    product_number: (changed as any).product_number ?? fullPayload.product_number,
    vat_zone: (changed as any).vat_zone ?? fullPayload.vat_zone,
  });
  await admin.from("accounting_product_links").upsert({
    business_id: integ.business_id, provider: integ.provider, service_id: serviceId,
    external_id: result.external_id, external_product_number: result.external_number,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: "business_id,provider,service_id" });
  await recordPushedFields(admin, integ.business_id, integ.provider, "product", serviceId, fullPayload);
  await logSync(admin, {
    business_id: integ.business_id, provider: integ.provider, direction: "push",
    entity_type: "product", entity_id: serviceId, external_id: result.external_id,
    status: "success",
  });
}

async function pushOrder(admin: SupabaseClient, integ: Integration, adapter: AccountingAdapter, orderId: string, operation = "update") {
  const { data: order } = await admin.from("orders").select("*, order_items(*)").eq("id", orderId).maybeSingle();
  if (!order) return;

  const { data: existing } = await admin.from("accounting_order_links")
    .select("external_id, external_type").eq("business_id", integ.business_id)
    .eq("provider", integ.provider).eq("order_id", orderId).maybeSingle();

  // Skygge-ordrer importeret fra regnskabsprogrammet er allerede fakturaer og
  // må aldrig pushes tilbage som nye ordrekladder.
  if (String(order.notes ?? "").startsWith("Auto-importeret fra ")) {
    if (existing && existing.external_type !== "invoice_booked") {
      await admin.from("accounting_order_links").update({
        external_type: "invoice_booked",
        last_status_synced: order.invoice_status ?? order.payment_status ?? "imported",
      }).eq("business_id", integ.business_id).eq("provider", integ.provider).eq("order_id", orderId);
    }
    return;
  }

  // Når Serviceydere allerede har et bogført fakturanummer, må aftalen aldrig
  // pushes igen som en ordrekladde. Det kunne overskrive linket fra
  // invoice_booked → order og gav efterfølgende 404 på /orders/drafts/{nr}.
  if (order.invoice_external_id) {
    if (!existing || existing.external_type !== "invoice_booked" || existing.external_id !== order.invoice_external_id) {
      await admin.from("accounting_order_links").upsert({
        business_id: integ.business_id,
        provider: integ.provider,
        order_id: orderId,
        external_id: String(order.invoice_external_id),
        external_number: String(order.invoice_external_id),
        external_type: "invoice_booked",
        last_pushed_at: new Date().toISOString(),
        last_status_synced: order.invoice_status ?? "booked",
      }, { onConflict: "business_id,provider,order_id" });
    }
    return;
  }

  // Optionally skip pending orders
  if (integ.settings?.push_pending === false && order.status === "pending") return;

  // Ensure customer linked
  const customerExtId = await ensureCustomerLink(admin, integ, adapter, order);
  if (!customerExtId) throw new Error("Kunne ikke matche/oprette kunde i regnskabsprogrammet");

  // Ensure products linked for each service line
  const lines = await Promise.all((order.order_items ?? []).map(async (it: any) => {
    let extProductId: string | null = null;
    let extProductNumber: string | null = null;
    if (it.service_id) {
      const { data: pl } = await admin.from("accounting_product_links")
        .select("external_id, external_product_number")
        .eq("business_id", integ.business_id).eq("provider", integ.provider)
        .eq("service_id", it.service_id).maybeSingle();
      if (pl) { extProductId = pl.external_id; extProductNumber = pl.external_product_number; }
      if (integ.settings?.auto_create_products !== false) {
        // Vi pusher altid produktet før ordren — også når der findes et link.
        // Linket kan være forældet (fx hvis produktet er slettet i
        // regnskabsprogrammet, eller linket stammer fra en tidligere udbyder),
        // og uden denne verificering fejler ordren med "lines.items"-validering.
        try {
          await pushProduct(admin, integ, adapter, it.service_id);
          const { data: pl2 } = await admin.from("accounting_product_links")
            .select("external_id, external_product_number")
            .eq("business_id", integ.business_id).eq("provider", integ.provider)
            .eq("service_id", it.service_id).maybeSingle();
          if (pl2) {
            extProductId = pl2.external_id;
            extProductNumber = pl2.external_product_number;
          }
        } catch (e) {
          // Hvis vi allerede har et eksisterende link, fortsætter vi med det
          // gamle id — ellers boble fejlen op så jobbet retries.
          if (!pl) throw e;
        }
      }
    }
    return {
      service_id: it.service_id,
      product_external_id: extProductId,
      product_external_number: extProductNumber,
      description: it.service_name,
      quantity: Number(it.quantity ?? 1),
      unit_price: Number(it.unit_price ?? 0),
    };
  }));

  // Når ordren allerede er bogført som faktura, må vi ikke længere forsøge at
  // opdatere den som ordrekladde i e-conomic — bogførte fakturaer er låste.
  if (existing?.external_type === "invoice_booked") return;

  if (operation === "delete") {
    if (existing && adapter.deleteOrder) {
      try { await adapter.deleteOrder(existing.external_id); } catch (_) { /* ignore */ }
      await admin.from("accounting_order_links").delete().eq("id", existing.external_id);
    }
    return;
  }

  const sendAs = (integ.settings?.send_order_as ?? "order") as "order"|"invoice_draft"|"quote";
  const result = await adapter.upsertOrder({
    internal_id: orderId,
    external_id: existing?.external_id,
    external_type: sendAs,
    customer_external_id: customerExtId,
    customer_name: order.customer_name,
    status: order.status,
    notes: order.notes ?? order.accounting_notes,
    payment_terms_days: order.payment_terms_days,
    currency: "DKK", // altid danske kroner
    date: order.preferred_date ?? new Date().toISOString().slice(0, 10),
    lines,
  });

  await admin.from("accounting_order_links").upsert({
    business_id: integ.business_id, provider: integ.provider, order_id: orderId,
    external_id: result.external_id, external_number: result.external_number,
    external_type: result.external_type,
    last_pushed_at: new Date().toISOString(),
    last_status_synced: order.status,
  }, { onConflict: "business_id,provider,order_id" });

  await admin.from("orders").update({
    external_order_number: result.external_number,
    accounting_synced_at: new Date().toISOString(),
  }).eq("id", orderId);

  await logSync(admin, {
    business_id: integ.business_id, provider: integ.provider, direction: "push",
    entity_type: "order", entity_id: orderId, external_id: result.external_id,
    status: "success",
  });
}

async function ensureCustomerLink(admin: SupabaseClient, integ: Integration, adapter: AccountingAdapter, order: any): Promise<string | null> {
  // Look for existing customer in Serviceydere by email
  if (!order.customer_email) return null;
  const email = String(order.customer_email).trim().toLowerCase();
  if (!email) return null;

  // Find existing internal customer
  const isCompany = !!order.cvr;
  let table: "business_customers"|"private_customers" = isCompany ? "business_customers" : "private_customers";
  let internalId: string | null = null;

  if (isCompany) {
    const { data } = await admin.from("business_customers").select("id")
      .eq("business_id", integ.business_id).or(`cvr.eq.${order.cvr},email.eq.${email}`).limit(1).maybeSingle();
    internalId = data?.id ?? null;
  } else {
    const { data } = await admin.from("private_customers").select("id")
      .eq("business_id", integ.business_id).eq("email", email).limit(1).maybeSingle();
    internalId = data?.id ?? null;
  }

  // Create internal record if missing — men gør det idempotent: tjek én gang
  // mere lige før insert for at undgå race med samtidige order-pushes.
  if (!internalId) {
    if (isCompany) {
      const { data: dup } = await admin.from("business_customers").select("id")
        .eq("business_id", integ.business_id)
        .or(`cvr.eq.${order.cvr},email.eq.${email}`).limit(1).maybeSingle();
      if (dup) { internalId = dup.id; }
      else {
      const { data } = await admin.from("business_customers").insert({
        business_id: integ.business_id,
        company_name: order.company_name ?? order.customer_name,
        email, phone: order.customer_phone, cvr: order.cvr,
        address: order.address, zip_code: order.zip_code, city: order.city,
      }).select("id").single();
      internalId = data?.id ?? null;
      }
    } else {
      const { data: dup } = await admin.from("private_customers").select("id")
        .eq("business_id", integ.business_id).eq("email", email).limit(1).maybeSingle();
      if (dup) { internalId = dup.id; }
      else {
      const { data } = await admin.from("private_customers").insert({
        business_id: integ.business_id, name: order.customer_name,
        email, phone: order.customer_phone,
        address: order.address, zip_code: order.zip_code, city: order.city,
      }).select("id").single();
      internalId = data?.id ?? null;
      }
    }
  }
  if (!internalId) return null;

  // Existing accounting link?
  const { data: link } = await admin.from("accounting_customer_links")
    .select("external_id").eq("business_id", integ.business_id).eq("provider", integ.provider)
    .or(table === "business_customers"
      ? `business_customer_id.eq.${internalId}`
      : `private_customer_id.eq.${internalId}`).maybeSingle();
  if (link) return link.external_id;

  // Push to provider
  await pushCustomer(admin, integ, adapter, internalId);
  const { data: link2 } = await admin.from("accounting_customer_links")
    .select("external_id").eq("business_id", integ.business_id).eq("provider", integ.provider)
    .or(table === "business_customers"
      ? `business_customer_id.eq.${internalId}`
      : `private_customer_id.eq.${internalId}`).maybeSingle();
  return link2?.external_id ?? null;
}

// ─── INVOICE BOOKING ─────────────────────────────────────────────────────
// Når et rute-stop markeres som udført, køes en 'invoice' job. Her bogfører
// vi den eksisterende ordre som faktura i regnskabsprogrammet og forsøger
// at sende den til kunden. Hvis ordren ikke er pushed endnu, gør vi det
// først så vi har et external_id at bogføre fra.
async function bookInvoiceForOrder(
  admin: SupabaseClient,
  integ: Integration,
  adapter: AccountingAdapter,
  orderId: string,
) {
  if (typeof adapter.bookInvoice !== "function") {
    throw new Error(`Provider ${integ.provider} understøtter ikke fakturabogføring`);
  }
  // Hvis ordren er slettet i mellemtiden er der intet at bogføre — log og afslut
  // pænt så jobbet ikke retries i det uendelige.
  const { data: orderExists } = await admin.from("orders")
    .select("id").eq("id", orderId).maybeSingle();
  if (!orderExists) {
    await logSync(admin, {
      business_id: integ.business_id, provider: integ.provider, direction: "push",
      entity_type: "invoice", entity_id: orderId,
      status: "success",
      message: "Ordre er slettet — fakturabogføring sprunget over",
    });
    return;
  }
  // Sørg for at ordren er pushed først
  let { data: link } = await admin.from("accounting_order_links")
    .select("external_id, external_type")
    .eq("business_id", integ.business_id)
    .eq("provider", integ.provider)
    .eq("order_id", orderId)
    .maybeSingle();
  if (!link) {
    await pushOrder(admin, integ, adapter, orderId, "upsert");
    const reread = await admin.from("accounting_order_links")
      .select("external_id, external_type")
      .eq("business_id", integ.business_id)
      .eq("provider", integ.provider)
      .eq("order_id", orderId)
      .maybeSingle();
    link = reread.data ?? null;
  }
  if (!link) {
    // Læs ordren for at give en bedre fejlbesked
    const { data: o } = await admin.from("orders")
      .select("status, customer_email, customer_name, total_amount").eq("id", orderId).maybeSingle();
    const reasons: string[] = [];
    if (!o) reasons.push("ordre findes ikke længere");
    else {
      if (!o.customer_email) reasons.push("kunden mangler e-mail");
      if (!o.total_amount || Number(o.total_amount) <= 0) reasons.push("ordre-beløbet er 0");
      if (o.status === "cancelled") reasons.push("ordren er annulleret");
    }
    const detail = reasons.length ? ` (${reasons.join(", ")})` : "";
    throw new Error(`Kunne ikke pushe ordre før fakturabogføring${detail}`);
  }

  const { data: order } = await admin.from("orders")
    .select("customer_email").eq("id", orderId).maybeSingle();

  const result = await adapter.bookInvoice({
    external_id: link.external_id,
    external_type: (link.external_type as any) ?? "order",
    customer_email: order?.customer_email ?? null,
  });

  let paymentUpdate: Record<string, unknown> = {};
  if (typeof adapter.getInvoiceStates === "function") {
    const states = await adapter.getInvoiceStates([result.invoice_external_id]).catch(() => []);
    const state = states[0];
    if (state) {
      paymentUpdate = {
        payment_status: state.status,
        paid_at: state.paid_at,
        paid_amount: state.paid_amount ?? null,
        payment_status_synced_at: new Date().toISOString(),
        due_date: state.due_date ?? null,
      };
    }
  }

  const invoiceExternalType = (result.invoice_external_type ?? "invoice_booked") as "invoice_booked" | "invoice_draft";
  const invoiceStatus = result.sent ? "sent" : invoiceExternalType === "invoice_draft" ? "draft" : "booked";

  // Opdater orders med faktura-info
  const { error: orderUpdateError } = await admin.from("orders").update({
    invoice_status: invoiceStatus,
    invoiced_at: new Date().toISOString(),
    invoice_external_id: result.invoice_external_id,
    invoice_external_number: result.invoice_external_number ?? null,
    ...paymentUpdate,
  }).eq("id", orderId);
  if (orderUpdateError) throw orderUpdateError;

  // Gem link til faktura. e-conomic efterlader fakturaen som kladde, mens
  // Dinero bogfører direkte — typen styrer bl.a. korrekt PDF-endpoint.
  const { error: linkUpdateError } = await admin.from("accounting_order_links").update({
    external_id: result.invoice_external_id,
    external_number: result.invoice_external_number,
    external_type: invoiceExternalType,
    last_pushed_at: new Date().toISOString(),
    last_status_synced: invoiceStatus,
  })
    .eq("business_id", integ.business_id)
    .eq("provider", integ.provider)
    .eq("order_id", orderId);
  if (linkUpdateError) throw linkUpdateError;

  await logSync(admin, {
    business_id: integ.business_id, provider: integ.provider, direction: "push",
    entity_type: "invoice", entity_id: orderId,
    external_id: result.invoice_external_id,
    status: "success",
    message: result.sent ? "Faktura bogført og sendt" : invoiceExternalType === "invoice_draft" ? "Faktura-kladde oprettet" : "Faktura bogført",
  });
}

// ─── AGREEMENT OCCURRENCE — ORDER + INVOICE ───────────────────────────────
// Når en aftale-forekomst (agreement_occurrences) oprettes, pusher vi den som
// en ordre/kladde til regnskabsprogrammet. Når den markeres udført, bogføres
// kladden som faktura og sendes til kunden. Denne flow er separat fra det
// gamle `orders`-baserede flow og bruger `accounting_order_links.agreement_occurrence_id`.

async function loadOccurrenceContext(admin: SupabaseClient, occurrenceId: string) {
  const { data: occ } = await admin
    .from("agreement_occurrences")
    .select("id, business_id, agreement_id, occurrence_date, status, invoice_external_id, invoice_status")
    .eq("id", occurrenceId)
    .maybeSingle();
  if (!occ) return null;
  const { data: agreement } = await admin
    .from("agreements")
    .select("id, business_id, customer_id, business_customer_id, customer_name, customer_email, customer_phone, company_name, cvr, address, zip_code, city, payment_terms_days, notes, total_amount, billing_model")
    .eq("id", occ.agreement_id)
    .maybeSingle();
  if (!agreement) return null;
  const { data: items } = await admin
    .from("agreement_items")
    .select("id, service_id, service_name, quantity, unit_price, total_price")
    .eq("agreement_id", occ.agreement_id);
  return { occ, agreement, items: items ?? [] };
}

async function ensureOccurrenceCustomerLink(
  admin: SupabaseClient, integ: Integration, adapter: AccountingAdapter,
  agreement: any,
): Promise<string | null> {
  // Brug det samme ensureCustomerLink som ordrer — den forventer order-lignende
  // felter, og agreements har præcis samme kontaktfelter.
  return ensureCustomerLink(admin, integ, adapter, {
    customer_email: agreement.customer_email,
    customer_name: agreement.customer_name,
    customer_phone: agreement.customer_phone,
    company_name: agreement.company_name,
    cvr: agreement.cvr,
    address: agreement.address,
    zip_code: agreement.zip_code,
    city: agreement.city,
  });
}

async function pushOccurrenceOrder(
  admin: SupabaseClient, integ: Integration, adapter: AccountingAdapter,
  occurrenceId: string,
) {
  const ctx = await loadOccurrenceContext(admin, occurrenceId);
  if (!ctx) return;
  const { occ, agreement, items } = ctx;

  // Allerede faktureret? Så skal vi ikke længere sende den som kladde.
  if (occ.invoice_external_id) return;

  // Findes link allerede?
  const { data: existing } = await admin.from("accounting_order_links")
    .select("external_id, external_type")
    .eq("business_id", integ.business_id)
    .eq("provider", integ.provider)
    .eq("agreement_occurrence_id", occurrenceId)
    .maybeSingle();
  if (existing?.external_type === "invoice_booked") return;

  const customerExtId = await ensureOccurrenceCustomerLink(admin, integ, adapter, agreement);
  if (!customerExtId) throw new Error("Kunne ikke matche/oprette kunde i regnskabsprogrammet");

  // Map agreement_items → ordrelinjer; sørg for at produkter er linkede.
  const lines = await Promise.all((items as any[]).map(async (it) => {
    let extProductId: string | null = null;
    let extProductNumber: string | null = null;
    if (it.service_id) {
      const { data: pl } = await admin.from("accounting_product_links")
        .select("external_id, external_product_number")
        .eq("business_id", integ.business_id).eq("provider", integ.provider)
        .eq("service_id", it.service_id).maybeSingle();
      if (pl) { extProductId = pl.external_id; extProductNumber = pl.external_product_number; }
      else if (integ.settings?.auto_create_products !== false) {
        try {
          await pushProduct(admin, integ, adapter, it.service_id);
          const { data: pl2 } = await admin.from("accounting_product_links")
            .select("external_id, external_product_number")
            .eq("business_id", integ.business_id).eq("provider", integ.provider)
            .eq("service_id", it.service_id).maybeSingle();
          extProductId = pl2?.external_id ?? null;
          extProductNumber = pl2?.external_product_number ?? null;
        } catch (e) { throw e; }
      }
    }
    return {
      service_id: it.service_id,
      product_external_id: extProductId,
      product_external_number: extProductNumber,
      description: it.service_name,
      quantity: Number(it.quantity ?? 1),
      unit_price: Number(it.unit_price ?? 0),
    };
  }));

  const sendAs = (integ.settings?.send_order_as ?? "order") as "order"|"invoice_draft"|"quote";
  const result = await adapter.upsertOrder({
    internal_id: occurrenceId,
    external_id: existing?.external_id,
    external_type: sendAs,
    customer_external_id: customerExtId,
    customer_name: agreement.customer_name,
    status: occ.status,
    notes: agreement.notes,
    payment_terms_days: agreement.payment_terms_days,
    currency: "DKK",
    date: occ.occurrence_date ?? new Date().toISOString().slice(0, 10),
    lines,
  });

  await admin.from("accounting_order_links").upsert({
    business_id: integ.business_id, provider: integ.provider,
    agreement_occurrence_id: occurrenceId,
    external_id: result.external_id, external_number: result.external_number,
    external_type: result.external_type,
    last_pushed_at: new Date().toISOString(),
    last_status_synced: occ.status,
  }, { onConflict: "business_id,provider,agreement_occurrence_id" });

  await admin.from("agreement_occurrences").update({
    external_order_number: result.external_number ?? null,
  }).eq("id", occurrenceId);

  await logSync(admin, {
    business_id: integ.business_id, provider: integ.provider, direction: "push",
    entity_type: "order", entity_id: occurrenceId, external_id: result.external_id,
    status: "success",
  });
}

async function bookInvoiceForOccurrence(
  admin: SupabaseClient, integ: Integration, adapter: AccountingAdapter,
  occurrenceId: string,
) {
  if (typeof adapter.bookInvoice !== "function") {
    throw new Error(`Provider ${integ.provider} understøtter ikke fakturabogføring`);
  }
  const ctx = await loadOccurrenceContext(admin, occurrenceId);
  if (!ctx) return;
  const { occ, agreement } = ctx;

  // Allerede bogført?
  if (occ.invoice_external_id) return;

  // Sørg for at ordre-link findes — opret den hvis nødvendigt
  let { data: link } = await admin.from("accounting_order_links")
    .select("external_id, external_type")
    .eq("business_id", integ.business_id)
    .eq("provider", integ.provider)
    .eq("agreement_occurrence_id", occurrenceId)
    .maybeSingle();
  if (!link) {
    await pushOccurrenceOrder(admin, integ, adapter, occurrenceId);
    const reread = await admin.from("accounting_order_links")
      .select("external_id, external_type")
      .eq("business_id", integ.business_id)
      .eq("provider", integ.provider)
      .eq("agreement_occurrence_id", occurrenceId)
      .maybeSingle();
    link = reread.data ?? null;
  }
  if (!link) throw new Error("Kunne ikke pushe forekomst som ordre før fakturabogføring");

  const result = await adapter.bookInvoice({
    external_id: link.external_id,
    external_type: (link.external_type as any) ?? "order",
    customer_email: agreement.customer_email ?? null,
  });

  let paymentUpdate: Record<string, unknown> = {};
  if (typeof adapter.getInvoiceStates === "function") {
    const states = await adapter.getInvoiceStates([result.invoice_external_id]).catch(() => []);
    const state = states[0];
    if (state) {
      paymentUpdate = {
        payment_status: state.status,
        paid_at: state.paid_at,
        paid_amount: state.paid_amount ?? null,
        due_date: state.due_date ?? null,
      };
    }
  }

  const invoiceExternalType = (result.invoice_external_type ?? "invoice_booked") as "invoice_booked" | "invoice_draft";
  const invoiceStatus = result.sent ? "sent" : invoiceExternalType === "invoice_draft" ? "draft" : "booked";

  const { error: occUpdateErr } = await admin.from("agreement_occurrences").update({
    invoice_status: invoiceStatus,
    invoiced_at: new Date().toISOString(),
    invoice_external_id: result.invoice_external_id,
    invoice_external_number: result.invoice_external_number ?? null,
    ...paymentUpdate,
  }).eq("id", occurrenceId);
  if (occUpdateErr) throw occUpdateErr;

  const { error: linkUpdErr } = await admin.from("accounting_order_links").update({
    external_id: result.invoice_external_id,
    external_number: result.invoice_external_number,
    external_type: invoiceExternalType,
    last_pushed_at: new Date().toISOString(),
    last_status_synced: invoiceStatus,
  })
    .eq("business_id", integ.business_id)
    .eq("provider", integ.provider)
    .eq("agreement_occurrence_id", occurrenceId);
  if (linkUpdErr) throw linkUpdErr;

  await logSync(admin, {
    business_id: integ.business_id, provider: integ.provider, direction: "push",
    entity_type: "invoice", entity_id: occurrenceId, external_id: result.invoice_external_id,
    status: "success",
    message: result.sent ? "Faktura bogført og sendt" : invoiceExternalType === "invoice_draft" ? "Faktura-kladde oprettet" : "Faktura bogført",
  });
}