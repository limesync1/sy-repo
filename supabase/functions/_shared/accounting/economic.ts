// E-conomic adapter
// Docs: https://restdocs.e-conomic.com/
// Auth: X-AppSecretToken (per-app) + X-AgreementGrantToken (per agreement)
import type {
  AccountingAdapter,
  AccountingCredentials,
  AccountingSettings,
  ExternalCustomer,
  ExternalGroups,
  ExternalInvoiceState,
  ExternalProduct,
  UpsertCustomerInput,
  UpsertOrderInput,
  UpsertProductInput,
} from "./types.ts";

const BASE = "https://restapi.e-conomic.com";

function makeHeaders(creds: AccountingCredentials): HeadersInit {
  return {
    "X-AppSecretToken": creds.api_secret ?? "",
    "X-AgreementGrantToken": creds.api_token ?? "",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

function friendlyEconomicError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (status === 401 || status === 403 || lower.includes("unauthorized") || lower.includes("invalid token")) {
    return "Forbindelsen blev afvist. Tjek at både App Secret Token og Agreement Grant Token er korrekte og at app'en er installeret på din e-conomic-aftale.";
  }
  if (status === 404) return "E-conomic kunne ikke finde det forespurgte. Tjek at din aftale er aktiv.";
  if (status === 429) return "For mange forespørgsler til e-conomic — prøv igen om et øjeblik.";
  if (status >= 500) return "E-conomics servere svarer ikke lige nu. Prøv igen om et par minutter.";
  // Try to surface their JSON message
  try {
    const j = JSON.parse(body);
    // E-conomic returnerer ofte en samlet message + en errors-array med detaljer pr. felt.
    // Vi samler ALT så brugeren faktisk kan se hvilket felt der fejler.
    const parts: string[] = [];
    if (j?.message) parts.push(String(j.message));
    const errs = Array.isArray(j?.errors) ? j.errors : [];
    for (const e of errs) {
      const field = e?.propertyName ?? e?.property ?? "";
      const msg = e?.errorMessage ?? e?.message ?? "";
      const hint = e?.developerHint ?? "";
      const piece = [field && `[${field}]`, msg, hint && `(${hint})`].filter(Boolean).join(" ");
      if (piece) parts.push(piece);
    }
    if (parts.length) return `E-conomic: ${parts.join(" — ")}`;
  } catch { /* ignore */ }
  // Hvis vi ikke kunne parse JSON, så returnér rå body (afkortet) så vi ikke taber info
  const snippet = body.slice(0, 400);
  return `E-conomic afviste forespørgslen (${status})${snippet ? `: ${snippet}` : ""}.`;
}

async function ecRequest(
  creds: AccountingCredentials,
  path: string,
  init: RequestInit = {},
): Promise<any> {
  if (!creds.api_secret || !creds.api_token) {
    throw new Error("Mangler App Secret Token eller Agreement Grant Token.");
  }
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...makeHeaders(creds), ...(init.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(friendlyEconomicError(res.status, text));
  }
  if (res.status === 204) return null;
  return await res.json();
}

export function makeEconomicAdapter(
  creds: AccountingCredentials,
  settings: AccountingSettings,
): AccountingAdapter {
  return {
    provider: "economic",

    async testConnection() {
      try {
        await ecRequest(creds, "/self");
        return { ok: true };
      } catch (e) {
        return { ok: false, message: e instanceof Error ? e.message : String(e) };
      }
    },

    async listGroups(): Promise<ExternalGroups> {
      const [cg, pg, accts] = await Promise.all([
        ecRequest(creds, "/customer-groups?pagesize=200").catch(() => ({ collection: [] })),
        ecRequest(creds, "/product-groups?pagesize=200").catch(() => ({ collection: [] })),
        // E-conomic har ingen "revenue" accountType. Vi henter alle P&L-konti
        // og filtrerer til indtægts-relevante konti (typisk 1000-1999 i den
        // danske kontoplan). Vi kan ikke bruge $like på accountNumber, så vi
        // henter bredt og filtrerer i koden.
        ecRequest(creds, "/accounts?pagesize=1000&filter=accountType$eq:profitAndLoss").catch(() => ({ collection: [] })),
      ]);
      const incomeAccounts = ((accts?.collection ?? []) as any[])
        .filter(a => {
          const num = Number(a.accountNumber ?? 0);
          // Standard dansk kontoplan: 1000-3999 = omsætning/indtægter
          return num >= 1000 && num <= 3999 && a.barred !== true;
        })
        .sort((a, b) => Number(a.accountNumber) - Number(b.accountNumber));
      return {
        customer_groups: ((cg?.collection ?? []) as any[]).map(g => ({
          id: String(g.customerGroupNumber),
          name: `${g.customerGroupNumber} — ${g.name}`,
        })),
        product_groups: ((pg?.collection ?? []) as any[]).map(g => ({
          id: String(g.productGroupNumber),
          name: `${g.productGroupNumber} — ${g.name}`,
          account_number: g.salesAccounts?.[0]?.account?.accountNumber
            ? String(g.salesAccounts[0].account.accountNumber) : null,
        })),
        income_accounts: incomeAccounts.map(a => ({
          id: String(a.accountNumber), name: `${a.accountNumber} — ${a.name}`,
        })),
        labels: {
          customer_groups: "Kundegruppe",
          product_groups: "Varegruppe",
          income_accounts: "Salgskonto",
          customer_groups_help: "Bruges når nye kunder oprettes i e-conomic.",
          product_groups_help: "Bruges når nye varer (services) oprettes i e-conomic. Salgskonto styres normalt af varegruppen.",
          income_accounts_help: "Overstyrer varegruppens salgskonto for nye varer.",
        },
      };
    },

    async listCustomers(updatedSince?: Date) {
      const filter = updatedSince
        ? `?filter=lastUpdated$gte:${updatedSince.toISOString()}`
        : "";
      const data = await ecRequest(creds, `/customers${filter}`);
      const items = (data?.collection ?? []) as any[];
      return items.map((c): ExternalCustomer => ({
        external_id: String(c.customerNumber),
        external_number: String(c.customerNumber),
        name: c.name,
        email: c.email ?? null,
        phone: c.telephoneAndFaxNumber ?? null,
        cvr: c.corporateIdentificationNumber ?? null,
        ean: c.ean ?? null,
        address: c.address ?? null,
        zip_code: c.zip ?? null,
        city: c.city ?? null,
        payment_terms_days: c.paymentTerms?.daysOfCredit ?? null,
        currency: c.currency ?? "DKK",
        raw: c,
      }));
    },

    async upsertCustomer(input: UpsertCustomerInput) {
      // E-conomic afviser tomme strenge på flere felter — konverter til undefined
      const clean = (v: string | null | undefined) =>
        v && String(v).trim().length > 0 ? String(v).trim() : undefined;

      const body: Record<string, unknown> = {
        name: input.name,
        email: clean(input.email),
        telephoneAndFaxNumber: clean(input.phone),
        corporateIdentificationNumber: clean(input.cvr),
        ean: clean(input.ean),
        address: clean(input.address),
        zip: clean(input.zip_code),
        city: clean(input.city),
        country: "Danmark",
        currency: input.currency ?? "DKK",
        customerGroup: { customerGroupNumber: Number(settings.default_customer_group ?? 1) },
        paymentTerms: {
          paymentTermsNumber: 1,
          daysOfCredit: input.payment_terms_days ?? settings.default_payment_terms_days ?? 14,
        },
        vatZone: { vatZoneNumber: 1 },
      };

      // Fjern undefined nøgler så vi ikke sender dem (e-conomic er pedantisk)
      for (const k of Object.keys(body)) if (body[k] === undefined) delete body[k];

      if (input.external_id) {
        await ecRequest(creds, `/customers/${input.external_id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        return {
          external_id: input.external_id,
          external_number: input.external_id,
          name: input.name,
        };
      } else {
        const created = await ecRequest(creds, `/customers`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        return {
          external_id: String(created.customerNumber),
          external_number: String(created.customerNumber),
          name: created.name,
          raw: created,
        };
      }
    },

    async listProducts(updatedSince?: Date) {
      const filter = updatedSince
        ? `?filter=lastUpdated$gte:${updatedSince.toISOString()}`
        : "";
      const data = await ecRequest(creds, `/products${filter}`);
      const items = (data?.collection ?? []) as any[];
      return items.map((p): ExternalProduct => ({
        external_id: String(p.productNumber),
        external_number: String(p.productNumber),
        name: p.name,
        unit_price: Number(p.salesPrice ?? 0),
        vat_rate: null,
        raw: p,
      }));
    },

    async upsertProduct(input: UpsertProductInput) {
      const productNumber = input.external_id ?? `SY-${input.internal_id.slice(0, 8)}`;
      const productGroupNumber = Number(
        input.product_group ?? settings.default_product_group ?? 1,
      );
      const body: Record<string, unknown> = {
        productNumber,
        name: input.name,
        description: input.description ?? undefined,
        salesPrice: input.unit_price,
        productGroup: { productGroupNumber },
      };
      if (input.external_id) {
        await ecRequest(creds, `/products/${input.external_id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        return {
          external_id: input.external_id,
          external_number: input.external_id,
          name: input.name,
          unit_price: input.unit_price,
        };
      } else {
        const created = await ecRequest(creds, `/products`, {
          method: "POST",
          body: JSON.stringify(body),
        });
        return {
          external_id: String(created.productNumber),
          external_number: String(created.productNumber),
          name: created.name,
          unit_price: Number(created.salesPrice ?? 0),
          raw: created,
        };
      }
    },

    async upsertOrder(input: UpsertOrderInput) {
      // E-conomic uses /sales-orders for "ordrer" — fallback to invoice-drafts otherwise.
      const sendAs = input.external_type ?? settings.send_order_as ?? "order";
      const path = sendAs === "order" ? "/sales-orders" : "/invoices/drafts";
      const date = (input.date ?? new Date().toISOString()).slice(0, 10);
      const body: Record<string, unknown> = {
        date,
        currency: input.currency ?? "DKK",
        paymentTerms: {
          paymentTermsNumber: 1,
          daysOfCredit: input.payment_terms_days ?? settings.default_payment_terms_days ?? 14,
        },
        customer: { customerNumber: Number(input.customer_external_id) },
        recipient: { name: "", vatZone: { vatZoneNumber: 1 } },
        layout: { layoutNumber: 19 },
        notes: { textLine1: (input.notes ?? "").slice(0, 200) },
        lines: input.lines.map((l, idx) => ({
          lineNumber: idx + 1,
          description: l.description,
          quantity: l.quantity,
          unitNetPrice: l.unit_price,
          product: l.product_external_id
            ? { productNumber: l.product_external_id }
            : undefined,
        })),
      };

      if (input.external_id) {
        await ecRequest(creds, `${path}/${input.external_id}`, {
          method: "PUT",
          body: JSON.stringify(body),
        });
        return {
          external_id: input.external_id,
          external_number: input.external_id,
          external_type: sendAs,
        };
      } else {
        const created = await ecRequest(creds, path, {
          method: "POST",
          body: JSON.stringify(body),
        });
        const num = String(created.orderNumber ?? created.draftInvoiceNumber ?? created.id);
        return {
          external_id: num,
          external_number: num,
          external_type: sendAs,
        };
      }
    },

    async deleteOrder(externalId: string) {
      const sendAs = settings.send_order_as ?? "order";
      const path = sendAs === "order" ? "/sales-orders" : "/invoices/drafts";
      await ecRequest(creds, `${path}/${externalId}`, { method: "DELETE" });
    },

    async getInvoiceStates(externalIds: string[]): Promise<ExternalInvoiceState[]> {
      const out: ExternalInvoiceState[] = [];
      // E-conomic: try /invoices/booked/{n} first (paid/booked), then /invoices/drafts/{n}
      for (const id of externalIds) {
        try {
          let inv: any = null;
          let booked = true;
          try {
            inv = await ecRequest(creds, `/invoices/booked/${id}`);
          } catch {
            try {
              inv = await ecRequest(creds, `/invoices/drafts/${id}`);
              booked = false;
            } catch { /* not found */ }
          }
          if (!inv) continue;
          const total = Number(inv.grossAmount ?? inv.netAmount ?? 0);
          const remainder = Number(inv.remainder ?? total);
          const paid = total - remainder;
          const dueDate: string | null = inv.dueDate ?? null;
          const overdue = booked && remainder > 0 && dueDate && new Date(dueDate) < new Date();
          let status: ExternalInvoiceState["status"];
          if (!booked) status = "unpaid";
          else if (remainder === 0 && total > 0) status = "paid";
          else if (paid > 0 && remainder > 0) status = "partially_paid";
          else if (overdue) status = "overdue";
          else status = "unpaid";
          out.push({
            external_id: String(inv.bookedInvoiceNumber ?? inv.draftInvoiceNumber ?? id),
            external_number: String(inv.bookedInvoiceNumber ?? inv.draftInvoiceNumber ?? id),
            status,
            paid_amount: paid,
            total_amount: total,
            paid_at: status === "paid" ? (inv.paymentDate ?? null) : null,
            due_date: dueDate,
            raw: inv,
          });
        } catch { /* ignore */ }
      }
      return out;
    },
  };
}