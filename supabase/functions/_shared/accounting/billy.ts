// Billy adapter
// Docs: https://www.billy.dk/api/
// Auth: X-Access-Token header
import type {
  AccountingAdapter,
  AccountingCredentials,
  AccountingSettings,
  ExternalCustomer,
  ExternalProduct,
  UpsertCustomerInput,
  UpsertOrderInput,
  UpsertProductInput,
} from "./types.ts";

const BASE = "https://api.billysbilling.com/v2";

function makeHeaders(creds: AccountingCredentials): HeadersInit {
  return {
    "X-Access-Token": creds.api_token ?? "",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function friendlyBillyError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401 || status === 403 || lower.includes("unauthorized")) {
    return "Billy afviste API-nøglen. Tjek at dit Access Token er korrekt og ikke udløbet (Indstillinger → API i Billy).";
  }
  if (status === 404) return "Billy kunne ikke finde det forespurgte. Tjek at din konto er aktiv.";
  if (status === 429) return "For mange forespørgsler til Billy — prøv igen om et øjeblik.";
  if (status >= 500) return "Billys servere svarer ikke lige nu. Prøv igen om et par minutter.";
  try {
    const j = JSON.parse(body);
    if (j?.errorMessage) return `Billy: ${j.errorMessage}`;
    if (j?.helpUrl && j?.message) return `Billy: ${j.message}`;
    if (j?.message) return `Billy: ${j.message}`;
  } catch { /* ignore */ }
  return `Billy afviste forespørgslen (${status}).`;
}

async function billyRequest(
  creds: AccountingCredentials,
  path: string,
  init: RequestInit = {},
): Promise<any> {
  if (!creds.api_token) {
    throw new Error("Mangler API Access Token.");
  }
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...makeHeaders(creds), ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(friendlyBillyError(res.status, text));
  }
  if (res.status === 204) return null;
  return await res.json();
}

async function getOrgId(creds: AccountingCredentials): Promise<string> {
  if (creds.organization_id) return creds.organization_id;
  const res = await billyRequest(creds, "/organization");
  return res?.organization?.id ?? res?.organizations?.[0]?.id;
}

export function makeBillyAdapter(
  creds: AccountingCredentials,
  settings: AccountingSettings,
): AccountingAdapter {
  return {
    provider: "billy",

    async testConnection() {
      try {
        await billyRequest(creds, "/organization");
        return { ok: true };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : String(e) };
      }
    },

    async listCustomers(updatedSince?: Date) {
      const q = updatedSince ? `?updatedSince=${updatedSince.toISOString()}` : "";
      const data = await billyRequest(creds, `/contacts${q}`);
      const items = (data?.contacts ?? []) as any[];
      return items
        .filter((c) => c.isCustomer)
        .map((c): ExternalCustomer => ({
          external_id: c.id,
          external_number: c.contactNo ?? null,
          name: c.name,
          email: c.email ?? null,
          phone: c.phone ?? null,
          cvr: c.registrationNo ?? null,
          ean: c.ean ?? null,
          address: c.street ?? null,
          zip_code: c.zipcodeText ?? null,
          city: c.cityText ?? null,
          payment_terms_days: c.paymentTermsDays ?? null,
          currency: c.defaultCurrencyId ?? "DKK",
          raw: c,
        }));
    },

    async upsertCustomer(input: UpsertCustomerInput) {
      const orgId = await getOrgId(creds);
      const contact: Record<string, unknown> = {
        organizationId: orgId,
        name: input.name,
        countryId: "DK",
        isCustomer: true,
        email: input.email ?? undefined,
        phone: input.phone ?? undefined,
        registrationNo: input.cvr ?? undefined,
        ean: input.ean ?? undefined,
        street: input.address ?? undefined,
        zipcodeText: input.zip_code ?? undefined,
        cityText: input.city ?? undefined,
        paymentTermsMode: "net",
        paymentTermsDays: input.payment_terms_days ?? settings.default_payment_terms_days ?? 14,
        defaultCurrencyId: input.currency ?? "DKK",
      };

      if (input.external_id) {
        const updated = await billyRequest(creds, `/contacts/${input.external_id}`, {
          method: "PUT",
          body: JSON.stringify({ contact }),
        });
        const c = updated?.contacts?.[0] ?? updated?.contact;
        return {
          external_id: c.id,
          external_number: c.contactNo ?? null,
          name: c.name,
        };
      } else {
        const created = await billyRequest(creds, `/contacts`, {
          method: "POST",
          body: JSON.stringify({ contact }),
        });
        const c = created?.contacts?.[0] ?? created?.contact;
        return {
          external_id: c.id,
          external_number: c.contactNo ?? null,
          name: c.name,
          raw: c,
        };
      }
    },

    async listProducts(updatedSince?: Date) {
      const q = updatedSince ? `?updatedSince=${updatedSince.toISOString()}` : "";
      const data = await billyRequest(creds, `/products${q}`);
      const items = (data?.products ?? []) as any[];
      return items.map((p): ExternalProduct => ({
        external_id: p.id,
        external_number: p.productNo ?? null,
        name: p.name,
        unit_price: Number(p.prices?.[0]?.unitPrice ?? 0),
        raw: p,
      }));
    },

    async upsertProduct(input: UpsertProductInput) {
      const orgId = await getOrgId(creds);
      const product: Record<string, unknown> = {
        organizationId: orgId,
        name: input.name,
        description: input.description ?? undefined,
        productNo: `SY-${input.internal_id.slice(0, 8)}`,
        prices: [{ unitPrice: input.unit_price, currencyId: "DKK" }],
      };
      if (input.external_id) {
        const updated = await billyRequest(creds, `/products/${input.external_id}`, {
          method: "PUT",
          body: JSON.stringify({ product }),
        });
        const p = updated?.products?.[0] ?? updated?.product;
        return {
          external_id: p.id,
          external_number: p.productNo ?? null,
          name: p.name,
          unit_price: Number(p.prices?.[0]?.unitPrice ?? input.unit_price),
        };
      } else {
        const created = await billyRequest(creds, `/products`, {
          method: "POST",
          body: JSON.stringify({ product }),
        });
        const p = created?.products?.[0] ?? created?.product;
        return {
          external_id: p.id,
          external_number: p.productNo ?? null,
          name: p.name,
          unit_price: Number(p.prices?.[0]?.unitPrice ?? input.unit_price),
          raw: p,
        };
      }
    },

    async upsertOrder(input: UpsertOrderInput) {
      // Billy has no "order" — use invoice draft.
      const orgId = await getOrgId(creds);
      const date = (input.date ?? new Date().toISOString()).slice(0, 10);
      const invoice: Record<string, unknown> = {
        organizationId: orgId,
        contactId: input.customer_external_id,
        entryDate: date,
        paymentTermsDays: input.payment_terms_days ?? settings.default_payment_terms_days ?? 14,
        paymentTermsMode: "net",
        state: "draft",
        currencyId: input.currency ?? "DKK",
        lines: input.lines.map((l) => ({
          productId: l.product_external_id ?? undefined,
          description: l.description,
          quantity: l.quantity,
          unitPrice: l.unit_price,
        })),
      };

      if (input.external_id) {
        const updated = await billyRequest(creds, `/invoices/${input.external_id}`, {
          method: "PUT",
          body: JSON.stringify({ invoice }),
        });
        const inv = updated?.invoices?.[0] ?? updated?.invoice;
        return {
          external_id: inv.id,
          external_number: inv.invoiceNo ?? null,
          external_type: "invoice_draft",
        };
      } else {
        const created = await billyRequest(creds, `/invoices`, {
          method: "POST",
          body: JSON.stringify({ invoice }),
        });
        const inv = created?.invoices?.[0] ?? created?.invoice;
        return {
          external_id: inv.id,
          external_number: inv.invoiceNo ?? null,
          external_type: "invoice_draft",
        };
      }
    },

    async deleteOrder(externalId: string) {
      await billyRequest(creds, `/invoices/${externalId}`, { method: "DELETE" });
    },
  };
}