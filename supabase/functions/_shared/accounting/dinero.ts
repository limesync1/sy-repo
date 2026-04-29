// Dinero adapter
// Docs: https://api.dinero.dk/docs/
// Auth: OAuth2 client_credentials -> bearer token
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

const AUTH_URL = "https://authz.dinero.dk/dineroapi/oauth/token";
const BASE = "https://api.dinero.dk/v1";

const tokenCache = new Map<string, { token: string; expires: number }>();

function friendlyDineroError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401 || status === 403 || lower.includes("unauthorized") || lower.includes("invalid_grant") || lower.includes("invalid_client")) {
    return "Dinero afviste login. Tjek Client ID, Client Secret og at du har givet adgang til organisationen.";
  }
  if (status === 404) return "Dinero kunne ikke finde organisationen. Tjek at Organisations-ID er korrekt.";
  if (status === 429) return "For mange forespørgsler til Dinero — prøv igen om et øjeblik.";
  if (status >= 500) return "Dineros servere svarer ikke lige nu. Prøv igen om et par minutter.";
  try {
    const j = JSON.parse(body);
    if (j?.Message) return `Dinero: ${j.Message}`;
    if (j?.error_description) return `Dinero: ${j.error_description}`;
    if (j?.error) return `Dinero: ${j.error}`;
  } catch { /* ignore */ }
  return `Dinero afviste forespørgslen (${status}).`;
}

async function getToken(creds: AccountingCredentials): Promise<string> {
  if (!creds.api_token || !creds.api_secret) {
    throw new Error("Mangler Client ID eller Client Secret.");
  }
  const key = `${creds.api_token ?? ""}::${creds.api_secret ?? ""}`;
  const cached = tokenCache.get(key);
  if (cached && cached.expires > Date.now() + 60_000) return cached.token;

  const auth = btoa(`${creds.api_token ?? ""}:${creds.api_secret ?? ""}`);
  const res = await fetch(AUTH_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=password&scope=read write&username=" +
      encodeURIComponent(creds.api_token ?? "") +
      "&password=" + encodeURIComponent(creds.api_secret ?? ""),
  });
  if (!res.ok) throw new Error(friendlyDineroError(res.status, await res.text()));
  const data = await res.json();
  tokenCache.set(key, {
    token: data.access_token,
    expires: Date.now() + (data.expires_in ?? 3600) * 1000,
  });
  return data.access_token;
}

async function dineroRequest(
  creds: AccountingCredentials,
  orgId: string,
  path: string,
  init: RequestInit = {},
): Promise<any> {
  if (!orgId) throw new Error("Mangler Organisations-ID.");
  const token = await getToken(creds);
  const res = await fetch(`${BASE}/${orgId}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(friendlyDineroError(res.status, text));
  }
  if (res.status === 204) return null;
  return await res.json();
}

export function makeDineroAdapter(
  creds: AccountingCredentials,
  settings: AccountingSettings,
): AccountingAdapter {
  const orgId = creds.organization_id ?? "";

  return {
    provider: "dinero",

    async testConnection() {
      try {
        if (!orgId) throw new Error("Mangler organization_id");
        await dineroRequest(creds, orgId, "/contacts?fields=ContactGuid&pageSize=1");
        return { ok: true };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : String(e) };
      }
    },

    async listCustomers(updatedSince?: Date) {
      const filter = updatedSince ? `&changesSince=${updatedSince.toISOString()}` : "";
      const data = await dineroRequest(
        creds, orgId,
        `/contacts?pageSize=200${filter}`,
      );
      const items = (data?.Collection ?? []) as any[];
      return items.map((c): ExternalCustomer => ({
        external_id: c.ContactGuid,
        external_number: c.ExternalReference ?? null,
        name: c.Name,
        email: c.Email ?? null,
        phone: c.Phone ?? null,
        cvr: c.CountryKey === "DK" ? c.VatNumber ?? null : null,
        ean: c.EanNumber ?? null,
        address: c.Street ?? null,
        zip_code: c.ZipCode ?? null,
        city: c.City ?? null,
        payment_terms_days: c.DefaultPaymentDays ?? null,
        currency: "DKK",
        raw: c,
      }));
    },

    async upsertCustomer(input: UpsertCustomerInput) {
      const body: Record<string, unknown> = {
        Name: input.name,
        Email: input.email ?? undefined,
        Phone: input.phone ?? undefined,
        VatNumber: input.cvr ?? undefined,
        EanNumber: input.ean ?? undefined,
        Street: input.address ?? undefined,
        ZipCode: input.zip_code ?? undefined,
        City: input.city ?? undefined,
        CountryKey: "DK",
        DefaultPaymentDays: input.payment_terms_days ?? settings.default_payment_terms_days ?? 14,
        DefaultPaymentTermsTypeKey: "Netto",
        IsPerson: !input.cvr,
      };
      if (input.external_id) {
        await dineroRequest(creds, orgId, `/contacts/${input.external_id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        return { external_id: input.external_id, name: input.name };
      } else {
        const created = await dineroRequest(creds, orgId, `/contacts`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        return {
          external_id: created.ContactGuid,
          external_number: created.ExternalReference ?? null,
          name: input.name,
          raw: created,
        };
      }
    },

    async listProducts(updatedSince?: Date) {
      const filter = updatedSince ? `&changesSince=${updatedSince.toISOString()}` : "";
      const data = await dineroRequest(
        creds, orgId,
        `/products?pageSize=200${filter}`,
      );
      const items = (data?.Collection ?? []) as any[];
      return items.map((p): ExternalProduct => ({
        external_id: p.ProductGuid,
        external_number: p.ProductNumber ?? null,
        name: p.Name,
        unit_price: Number(p.BaseAmountValue ?? 0),
        account_number: p.AccountNumber ? String(p.AccountNumber) : null,
        raw: p,
      }));
    },

    async upsertProduct(input: UpsertProductInput) {
      const body: Record<string, unknown> = {
        ProductNumber: `SY-${input.internal_id.slice(0, 8)}`,
        Name: input.name,
        Comment: input.description ?? undefined,
        BaseAmountValue: input.unit_price,
        AccountNumber: input.account_number
          ? Number(input.account_number)
          : (settings.default_product_account ? Number(settings.default_product_account) : 1000),
        Quantity: 1,
      };
      if (input.external_id) {
        await dineroRequest(creds, orgId, `/products/${input.external_id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        return {
          external_id: input.external_id,
          name: input.name,
          unit_price: input.unit_price,
        };
      } else {
        const created = await dineroRequest(creds, orgId, `/products`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        return {
          external_id: created.ProductGuid,
          external_number: created.ProductNumber ?? null,
          name: input.name,
          unit_price: input.unit_price,
          raw: created,
        };
      }
    },

    async upsertOrder(input: UpsertOrderInput) {
      // Dinero har "Vouchers/Invoices" — vi bruger draft invoice som ordre-erstatning.
      const date = (input.date ?? new Date().toISOString()).slice(0, 10);
      const body: Record<string, unknown> = {
        ContactGuid: input.customer_external_id,
        Date: date,
        PaymentConditionNumberOfDays:
          input.payment_terms_days ?? settings.default_payment_terms_days ?? 14,
        PaymentConditionType: "Netto",
        Currency: input.currency ?? "DKK",
        Description: (input.notes ?? "").slice(0, 200),
        ProductLines: input.lines.map((l) => ({
          ProductGuid: l.product_external_id ?? undefined,
          Description: l.description,
          Quantity: l.quantity,
          BaseAmountValue: l.unit_price,
          AccountNumber: settings.default_product_account
            ? Number(settings.default_product_account)
            : 1000,
        })),
      };
      if (input.external_id) {
        await dineroRequest(creds, orgId, `/invoices/${input.external_id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        return {
          external_id: input.external_id,
          external_number: input.external_id,
          external_type: "invoice_draft",
        };
      } else {
        const created = await dineroRequest(creds, orgId, `/invoices`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        return {
          external_id: created.Guid,
          external_number: created.Number ? String(created.Number) : null,
          external_type: "invoice_draft",
        };
      }
    },

    async deleteOrder(externalId: string) {
      await dineroRequest(creds, orgId, `/invoices/${externalId}`, { method: "DELETE" });
    },
  };
}