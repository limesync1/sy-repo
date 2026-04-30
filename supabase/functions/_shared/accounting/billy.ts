// Billy adapter
// Docs: https://www.billy.dk/api/
// Auth: X-Access-Token header
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

const BASE = "https://api.billysbilling.com/v2";

function cleanBillyToken(token: unknown): string {
  return String(token ?? "")
    .trim()
    .replace(/^x-access-token\s*:\s*/i, "")
    .replace(/^bearer\s+/i, "")
    .replace(/[\u200B-\u200D\uFEFF\s]/g, "");
}

function makeHeaders(creds: AccountingCredentials): HeadersInit {
  const token = cleanBillyToken(creds.api_token);
  return {
    "X-Access-Token": token,
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
  const token = cleanBillyToken(creds.api_token);
  if (!token) {
    throw new Error("Mangler API Access Token.");
  }
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { ...makeHeaders({ ...creds, api_token: token }), ...(init.headers ?? {}) },
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

// Billy kræver en indtægtskonto på alle varer. Hvis brugeren ikke har valgt
// en konto endnu, vælger vi automatisk en gyldig salgskonto fra Billy.
const incomeAccountCache = new Map<string, string>();
async function ensureBillyIncomeAccount(
  creds: AccountingCredentials,
  orgId: string,
  accountId: string | null,
): Promise<string | null> {
  const cacheKey = `${orgId}::${accountId ?? "default"}`;
  const cached = incomeAccountCache.get(cacheKey);
  if (cached) return cached;
  if (accountId) {
    incomeAccountCache.set(cacheKey, accountId);
    return accountId;
  }

  try {
    const org = await billyRequest(creds, "/organization").catch(() => null);
    const defaultAccountId = org?.organization?.defaultSalesAccountId
      ?? org?.organization?.defaultSalesAccount?.id
      ?? null;
    if (defaultAccountId) {
      incomeAccountCache.set(cacheKey, defaultAccountId);
      return defaultAccountId;
    }

    const accts = await billyRequest(creds, `/accounts?pageSize=1000`).catch(() => ({ accounts: [] }));
    const list: any[] = accts?.accounts ?? [];
    const income = list.find(a => {
      if (a.isArchived === true || a.isBankAccount === true) return false;
      const nature = String(a.natureId ?? a.nature ?? "").toLowerCase();
      if (nature === "revenue" || nature === "income" || nature === "sales") return true;
      if (nature) return false;
      const no = Number(a.accountNo ?? 0);
      return no >= 1000 && no <= 3999;
    });
    if (income?.id) incomeAccountCache.set(cacheKey, income.id);
    return income?.id ?? null;
  } catch (e) {
    console.warn("ensureBillyIncomeAccount failed:", e instanceof Error ? e.message : e);
    return null;
  }
}

// Billy gemmer email på contactPersons, mens telefonnummer ligger direkte på contact.
// Vi opretter/opdaterer den primære kontaktperson når vi har email.
async function syncBillyContactPerson(
  creds: AccountingCredentials,
  contactId: string,
  input: UpsertCustomerInput,
): Promise<void> {
  const email = input.email?.trim() || null;
  if (!email) return;

  // Find eksisterende kontaktpersoner for denne contact
  let persons: any[] = [];
  try {
    const res = await billyRequest(creds, `/contactPersons?contactId=${contactId}`);
    persons = res?.contactPersons ?? [];
  } catch { /* ignore */ }

  // Match på email hvis muligt, ellers første person
  const existing = email
    ? persons.find(p => (p.email ?? "").toLowerCase() === email.toLowerCase()) ?? persons[0]
    : persons[0];

  const person: Record<string, unknown> = {
    contactId,
    name: input.name,
    email,
    isPrimary: true,
  };

  try {
    if (existing) {
      await billyRequest(creds, `/contactPersons/${existing.id}`, {
        method: "PUT",
        body: JSON.stringify({ contactPerson: person }),
      });
    } else {
      await billyRequest(creds, `/contactPersons`, {
        method: "POST",
        body: JSON.stringify({ contactPerson: person }),
      });
    }
  } catch (e) {
    // Lad ikke kontaktperson-fejl vælte hele customer-syncen.
    console.warn("Billy contactPerson sync failed:", e instanceof Error ? e.message : e);
  }
}

// Hent email fra primær kontaktperson under listCustomers.
async function fetchBillyContactPersonEmail(
  creds: AccountingCredentials,
  contactId: string,
): Promise<string | null> {
  try {
    const res = await billyRequest(creds, `/contactPersons?contactId=${contactId}`);
    const persons: any[] = res?.contactPersons ?? [];
    const primary = persons.find(p => p.isPrimary) ?? persons[0];
    return primary?.email ?? null;
  } catch {
    return null;
  }
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

    async listGroups(): Promise<ExternalGroups> {
      const orgId = await getOrgId(creds).catch(() => null);
      const orgQ2 = orgId ? `&organizationId=${orgId}` : "";
      // Billy "produktgruppe" og "indtægtskonto" er reelt det samme valg for
      // brugeren — gruppen styrer bare hvilken konto varen lander på. Vi
      // viser kun indtægtskontoen for at undgå dobbelt-spørgsmål.
      const accts = await billyRequest(
        creds, `/accounts?pageSize=1000${orgQ2}`,
      ).catch(() => ({ accounts: [] }));
      const incomeAccounts = ((accts?.accounts ?? []) as any[])
        .filter(a => {
          // Billy: natureId === 'revenue' eller 'income'. Fald tilbage til accountNo-range.
          const nature = String(a.natureId ?? a.nature ?? "").toLowerCase();
          if (nature === "revenue" || nature === "income" || nature === "sales") return true;
          if (nature) return false;
          const no = Number(a.accountNo ?? 0);
          return no >= 1000 && no <= 3999;
        })
        .filter(a => a.isArchived !== true && a.isBankAccount !== true)
        .sort((a, b) => Number(a.accountNo ?? 0) - Number(b.accountNo ?? 0));
      return {
        // Billy har ikke kundegrupper — returnér tom liste
        customer_groups: [],
        // Skjult i UI — produktgruppe = indtægtskonto i Billy-flowet.
        product_groups: [],
        income_accounts: incomeAccounts.map(a => ({
          id: a.id,
          name: a.accountNo ? `${a.accountNo} — ${a.name}` : a.name,
        })),
        labels: {
          income_accounts: "Indtægtskonto",
          income_accounts_help: "Den konto nye services lander på i Billy (typisk 1000-serien).",
        },
      };
    },

    async listCustomers(updatedSince?: Date) {
      const q = updatedSince ? `?updatedSince=${updatedSince.toISOString()}` : "";
      const data = await billyRequest(creds, `/contacts${q}`);
      const items = (data?.contacts ?? []) as any[];
      const customers = items.filter((c) => c.isCustomer);
      // Hent kontaktperson-info parallelt (max 5 ad gangen for at undgå rate limit)
      const results: ExternalCustomer[] = [];
      const batchSize = 5;
      for (let i = 0; i < customers.length; i += batchSize) {
        const batch = customers.slice(i, i + batchSize);
        const enriched = await Promise.all(batch.map(async (c) => {
          const email = await fetchBillyContactPersonEmail(creds, c.id);
          return {
            external_id: c.id,
            external_number: c.contactNo ?? null,
            name: c.name,
            email,
            phone: c.phone ?? null,
            cvr: c.registrationNo ?? null,
            ean: c.ean ?? null,
            address: c.street ?? null,
            zip_code: c.zipcodeText ?? null,
            city: c.cityText ?? null,
            payment_terms_days: c.paymentTermsDays ?? null,
            currency: c.defaultCurrencyId ?? "DKK",
            type: c.type === "company" ? "company" : "person",
            raw: c,
          } satisfies ExternalCustomer;
        }));
        results.push(...enriched);
      }
      return results;
    },

    async upsertCustomer(input: UpsertCustomerInput) {
      const orgId = await getOrgId(creds);
      const contact: Record<string, unknown> = {
        organizationId: orgId,
        type: input.cvr ? "company" : "person",
        name: input.name,
        countryId: "DK",
        isCustomer: true,
        registrationNo: input.cvr ?? undefined,
        ean: input.ean ?? undefined,
        street: input.address ?? undefined,
        zipcodeText: input.zip_code ?? undefined,
        cityText: input.city ?? undefined,
        phone: input.phone ?? undefined,
        paymentTermsMode: "net",
        paymentTermsDays: input.payment_terms_days ?? settings.default_payment_terms_days ?? 14,
      };

      if (input.external_id) {
        const updated = await billyRequest(creds, `/contacts/${input.external_id}`, {
          method: "PUT",
          body: JSON.stringify({ contact }),
        });
        const c = updated?.contacts?.[0] ?? updated?.contact;
        await syncBillyContactPerson(creds, c.id, input);
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
        await syncBillyContactPerson(creds, c.id, input);
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
      // Billy kræver en indtægtskonto direkte på varen.
      const accountId = input.account_number
        ?? settings.default_income_account
        ?? null;
      const resolvedAccountId = await ensureBillyIncomeAccount(creds, orgId, accountId);
      if (!resolvedAccountId) {
        throw new Error(
          "Billy mangler en indtægtskonto til varen. Vælg en indtægtskonto i opsætningen, eller tjek kontoplanen i Billy.",
        );
      }
      const product: Record<string, unknown> = {
        organizationId: orgId,
        name: input.name,
        description: input.description ?? undefined,
        // Sæt kun productNo ved oprettelse — bevar Billys egen nummerering ved opdatering.
        productNo: input.external_id ? undefined : `SY-${input.internal_id.slice(0, 8)}`,
        accountId: resolvedAccountId,
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
        // Standard-valuta i Serviceydere er altid DKK.
        currencyId: "DKK",
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

    async getInvoiceStates(externalIds: string[]): Promise<ExternalInvoiceState[]> {
      const out: ExternalInvoiceState[] = [];
      for (const id of externalIds) {
        try {
          const res = await billyRequest(creds, `/invoices/${id}`);
          const inv = res?.invoice ?? res?.invoices?.[0];
          if (!inv) continue;
          // Billy: isPaid / balance / state ("draft"|"approved"|"paid"|"voided")
          const balance = Number(inv.balance ?? 0);
          const grossAmount = Number(inv.grossAmount ?? inv.amount ?? 0);
          const isPaid = inv.isPaid === true || inv.state === "paid" || balance === 0 && grossAmount > 0 && (inv.state === "approved" || inv.state === "paid");
          const isCredit = inv.state === "voided" || inv.type === "creditNote" || grossAmount < 0;
          const dueDate: string | null = inv.dueDate ?? null;
          const overdue = !isPaid && dueDate && new Date(dueDate) < new Date();
          let status: ExternalInvoiceState["status"];
          if (isCredit) status = "credited";
          else if (isPaid) status = "paid";
          else if (balance > 0 && balance < grossAmount) status = "partially_paid";
          else if (overdue) status = "overdue";
          else status = "unpaid";
          out.push({
            external_id: String(inv.id),
            external_number: inv.invoiceNo ?? null,
            status,
            paid_amount: grossAmount - balance,
            total_amount: grossAmount,
            paid_at: isPaid ? (inv.paidDate ?? inv.updatedTime ?? null) : null,
            due_date: dueDate,
            raw: inv,
          });
        } catch { /* ignore single invoice fetch errors */ }
      }
      return out;
    },
  };
}