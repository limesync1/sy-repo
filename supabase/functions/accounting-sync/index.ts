// Generic sync dispatcher.
// - Mode "queue": drain pending sync_queue jobs for one business (or all if business_id omitted; service-role)
// - Mode "pull":  pull customers + products from accounting provider into Serviceydere
// - Mode "push_order": force re-push of one order
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { makeAdapter, AccountingAdapter } from "../_shared/accounting/index.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json().catch(() => ({}));
    const { mode = "queue", business_id, order_id, internal_mode } = body;

    // Service-role client for actual DB work
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // If called externally (not internal cron), verify caller owns the business
    if (!internal_mode) {
      const authHeader = req.headers.get("Authorization");
      if (!authHeader) return json({ error: "Missing auth" }, 401);
      const userClient = createClient(SUPABASE_URL, ANON_KEY, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await userClient.auth.getUser();
      if (!user) return json({ error: "Unauthorized" }, 401);
      if (business_id) {
        const { data: biz } = await userClient.from("businesses")
          .select("id, owner_id").eq("id", business_id).maybeSingle();
        if (!biz || biz.owner_id !== user.id) return json({ error: "Forbidden" }, 403);
      }
    }

    if (!business_id) return json({ error: "business_id required" }, 400);

    const integration = await loadIntegration(admin, business_id);
    if (!integration) return json({ error: "No active integration" }, 404);
    const adapter = makeAdapter(integration.provider, integration, integration.settings ?? {});

    if (mode === "pull") {
      const result = await pullFromProvider(admin, integration, adapter);
      return json({ ok: true, ...result });
    }
    if (mode === "push_order" && order_id) {
      await pushOrder(admin, integration, adapter, order_id);
      return json({ ok: true });
    }
    // default: drain queue
    const drained = await drainQueue(admin, integration, adapter);
    return json({ ok: true, processed: drained });
  } catch (e) {
    console.error("accounting-sync error", e);
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
  entity_type: "customer"|"product"|"order"|"connection";
  entity_id?: string|null; external_id?: string|null;
  status: "success"|"error"|"skipped"; message?: string|null; payload?: any;
}) {
  await admin.from("accounting_sync_log").insert(opts);
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
      if (matched) {
        // Update existing match
        await admin.from(matched.table).update({
          email: ec.email ?? undefined,
          phone: ec.phone ?? undefined,
          address: ec.address ?? undefined,
          zip_code: ec.zip_code ?? undefined,
          city: ec.city ?? undefined,
          payment_terms_days: ec.payment_terms_days ?? undefined,
          currency: ec.currency ?? undefined,
          ...(matched.table === "business_customers"
            ? { cvr: ec.cvr ?? undefined, ean_number: ec.ean ?? undefined, company_name: ec.name }
            : { name: ec.name }),
        }).eq("id", matched.id);
      } else {
        // Create new customer in Serviceydere
        const isCompany = !!ec.cvr;
        if (isCompany) {
          const { data: created } = await admin.from("business_customers").insert({
            business_id: integ.business_id,
            company_name: ec.name,
            email: ec.email ?? `unknown+${ec.external_id}@example.com`,
            phone: ec.phone, cvr: ec.cvr, ean_number: ec.ean,
            address: ec.address, zip_code: ec.zip_code, city: ec.city,
            payment_terms_days: ec.payment_terms_days, currency: ec.currency ?? "DKK",
          }).select("id").single();
          if (created) await upsertCustomerLink(admin, integ, ec, created.id, "business_customer", "pull");
        } else {
          const { data: created } = await admin.from("private_customers").insert({
            business_id: integ.business_id, name: ec.name,
            email: ec.email ?? `unknown+${ec.external_id}@example.com`,
            phone: ec.phone, address: ec.address, zip_code: ec.zip_code, city: ec.city,
            payment_terms_days: ec.payment_terms_days, currency: ec.currency ?? "DKK",
          }).select("id").single();
          if (created) await upsertCustomerLink(admin, integ, ec, created.id, "private_customer", "pull");
        }
      }
      customersPulled++;
    }

    const products = await adapter.listProducts(since);
    for (const ep of products) {
      // Only link to existing services with matching name (loose match) — never auto-create services
      const { data: existing } = await admin.from("accounting_product_links")
        .select("id").eq("business_id", integ.business_id)
        .eq("provider", integ.provider).eq("external_id", ep.external_id).maybeSingle();
      if (existing) {
        await admin.from("accounting_product_links").update({
          external_product_number: ep.external_number,
          last_synced_at: new Date().toISOString(),
          external_data: ep.raw ?? {},
        }).eq("id", existing.id);
      }
      productsPulled++;
    }

    await admin.from("accounting_integrations").update({
      last_pull_at: new Date().toISOString(),
    }).eq("business_id", integ.business_id);
    await setIntegrationError(admin, integ.business_id, null);

    await logSync(admin, {
      business_id: integ.business_id, provider: integ.provider,
      direction: "pull", entity_type: "connection", status: "success",
      message: `Pulled ${customersPulled} customers, ${productsPulled} products`,
    });
    return { customers: customersPulled, products: productsPulled };
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
  for (const job of jobs) {
    await admin.from("accounting_sync_queue").update({ status: "processing", attempts: job.attempts + 1 }).eq("id", job.id);
    try {
      if (job.entity_type === "customer") await pushCustomer(admin, integ, adapter, job.entity_id);
      else if (job.entity_type === "product") await pushProduct(admin, integ, adapter, job.entity_id);
      else if (job.entity_type === "order") await pushOrder(admin, integ, adapter, job.entity_id, job.operation);
      await admin.from("accounting_sync_queue").update({
        status: "done", processed_at: new Date().toISOString(), last_error: null,
      }).eq("id", job.id);
      processed++;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const failedFinal = job.attempts + 1 >= 5;
      await admin.from("accounting_sync_queue").update({
        status: failedFinal ? "failed" : "pending",
        last_error: msg,
        scheduled_for: new Date(Date.now() + Math.min(60_000 * (job.attempts + 1), 600_000)).toISOString(),
      }).eq("id", job.id);
      await logSync(admin, {
        business_id: integ.business_id, provider: integ.provider,
        direction: "push", entity_type: job.entity_type, entity_id: job.entity_id,
        status: "error", message: msg,
      });
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

  const result = await adapter.upsertCustomer({
    internal_id: customerId,
    name: table === "business_customers" ? row.company_name : row.name,
    email: row.email, phone: row.phone,
    cvr: table === "business_customers" ? row.cvr : null,
    ean: table === "business_customers" ? row.ean_number : null,
    address: row.address, zip_code: row.zip_code, city: row.city,
    payment_terms_days: row.payment_terms_days,
    currency: row.currency,
    external_id: existingLink?.external_id,
  });
  await upsertCustomerLink(
    admin, integ, { external_id: result.external_id, external_number: result.external_number, raw: result.raw },
    customerId, table === "business_customers" ? "business_customer" : "private_customer", "push",
  );
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
  const result = await adapter.upsertProduct({
    internal_id: serviceId, name: svc.name, description: svc.description,
    unit_price: Number(svc.base_price ?? 0), vat_rate: Number(svc.default_vat_rate ?? 25),
    account_number: svc.accounting_account_number, external_id: existing?.external_id,
  });
  await admin.from("accounting_product_links").upsert({
    business_id: integ.business_id, provider: integ.provider, service_id: serviceId,
    external_id: result.external_id, external_product_number: result.external_number,
    last_synced_at: new Date().toISOString(),
  }, { onConflict: "business_id,provider,service_id" });
  await logSync(admin, {
    business_id: integ.business_id, provider: integ.provider, direction: "push",
    entity_type: "product", entity_id: serviceId, external_id: result.external_id,
    status: "success",
  });
}

async function pushOrder(admin: SupabaseClient, integ: Integration, adapter: AccountingAdapter, orderId: string, operation = "update") {
  const { data: order } = await admin.from("orders").select("*, order_items(*)").eq("id", orderId).maybeSingle();
  if (!order) return;

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
      else if (integ.settings?.auto_create_products !== false) {
        await pushProduct(admin, integ, adapter, it.service_id);
        const { data: pl2 } = await admin.from("accounting_product_links")
          .select("external_id, external_product_number")
          .eq("business_id", integ.business_id).eq("provider", integ.provider)
          .eq("service_id", it.service_id).maybeSingle();
        extProductId = pl2?.external_id ?? null;
        extProductNumber = pl2?.external_product_number ?? null;
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

  const { data: existing } = await admin.from("accounting_order_links")
    .select("external_id, external_type").eq("business_id", integ.business_id)
    .eq("provider", integ.provider).eq("order_id", orderId).maybeSingle();

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
    status: order.status,
    notes: order.notes ?? order.accounting_notes,
    payment_terms_days: order.payment_terms_days,
    currency: "DKK",
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

  // Find existing internal customer
  const isCompany = !!order.cvr;
  let table: "business_customers"|"private_customers" = isCompany ? "business_customers" : "private_customers";
  let internalId: string | null = null;

  if (isCompany) {
    const { data } = await admin.from("business_customers").select("id")
      .eq("business_id", integ.business_id).or(`cvr.eq.${order.cvr},email.eq.${order.customer_email}`).maybeSingle();
    internalId = data?.id ?? null;
  } else {
    const { data } = await admin.from("private_customers").select("id")
      .eq("business_id", integ.business_id).eq("email", order.customer_email).maybeSingle();
    internalId = data?.id ?? null;
  }

  // Create internal record if missing (so future updates flow correctly)
  if (!internalId) {
    if (isCompany) {
      const { data } = await admin.from("business_customers").insert({
        business_id: integ.business_id,
        company_name: order.company_name ?? order.customer_name,
        email: order.customer_email, phone: order.customer_phone, cvr: order.cvr,
        address: order.address, zip_code: order.zip_code, city: order.city,
      }).select("id").single();
      internalId = data?.id ?? null;
    } else {
      const { data } = await admin.from("private_customers").insert({
        business_id: integ.business_id, name: order.customer_name,
        email: order.customer_email, phone: order.customer_phone,
        address: order.address, zip_code: order.zip_code, city: order.city,
      }).select("id").single();
      internalId = data?.id ?? null;
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