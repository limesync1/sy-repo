// Billy adapter
// Docs: https://www.billy.dk/api/
// Auth: X-Access-Token header
import type {
  AccountingAdapter,
  AccountingCredentials,
  AccountingSettings,
  ExternalCustomer,
  ExternalGroups,
  ExternalInvoice,
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
    // Billy "Invalid record" returnerer detaljerede valideringsfejl i `validationErrors`
    // — fold dem ud så brugeren faktisk kan se hvad der mangler.
    const ve = j?.validationErrors ?? j?.errorDetails;
    if (ve && typeof ve === "object") {
      const parts: string[] = [];
      for (const [field, msgs] of Object.entries(ve)) {
        if (Array.isArray(msgs)) parts.push(`${field}: ${msgs.join(", ")}`);
        else if (typeof msgs === "string") parts.push(`${field}: ${msgs}`);
        else if (msgs && typeof msgs === "object") {
          parts.push(`${field}: ${JSON.stringify(msgs)}`);
        }
      }
      if (parts.length > 0) {
        return `Billy: ${j?.errorMessage ?? "Validering fejlede"} — ${parts.join(" · ")}`;
      }
    }
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
    // Hjælp os selv med at debugge: log hele body + payload til function-logs.
    try {
      const method = (init.method ?? "GET").toUpperCase();
      console.error(`[billy] ${method} ${path} → ${res.status}`, text.slice(0, 800));
      if (init.body && typeof init.body === "string") {
        console.error(`[billy] payload was:`, init.body.slice(0, 800));
      }
    } catch { /* ignore */ }
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
// Billy kræver en taxRateId pr. linje når kontakten/varen ikke har en standard.
// Vi henter Billys "domestic sales VAT" (fx U25) én gang pr. organisation.
const taxRateCache = new Map<string, string | null>();
async function getDefaultBillySalesTaxRate(
  creds: AccountingCredentials,
  orgId: string,
): Promise<string | null> {
  if (taxRateCache.has(orgId)) return taxRateCache.get(orgId) ?? null;
  try {
    const res = await billyRequest(creds, `/taxRates?organizationId=${orgId}&pageSize=200`);
    const list: any[] = res?.taxRates ?? [];
    // Foretræk aktive sales VAT-rater (priority/scope = "sales") med den højeste rate.
    const sales = list.filter(t =>
      !t.isArchived &&
      (String(t.scope ?? "").toLowerCase() === "sales" ||
       String(t.priority ?? "").toLowerCase() === "sales" ||
       String(t.name ?? "").toLowerCase().includes("salg") ||
       String(t.abbreviation ?? "").toLowerCase().startsWith("u")) // U25, U-MOMS, etc
    );
    const pick = (sales.length ? sales : list)
      .filter(t => !t.isArchived)
      .sort((a, b) => Number(b.rate ?? 0) - Number(a.rate ?? 0))[0];
    const id = pick?.id ?? null;
    taxRateCache.set(orgId, id);
    return id;
  } catch (e) {
    console.warn("getDefaultBillySalesTaxRate failed:", e instanceof Error ? e.message : e);
    taxRateCache.set(orgId, null);
    return null;
  }
}

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

      // Billy gemmer IKKE email på contact — det skal ligge på contactPersons.
      // Hvis vi ved et uheld sender 'email' her, afviser Billy hele requesten
      // med "Unknown attribute `email` for `contact` record". Sørg for at
      // ingen ekstra felter snige sig med (defensivt).
      delete (contact as any).email;

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
      // Billy kræver en taxRateId på hver linje (eller på varen). Hent en gyldig
      // dansk salgs-moms én gang og brug den som fallback — ellers fejler Billy
      // med en intetsigende "Invalid record".
      const fallbackTaxRateId = await getDefaultBillySalesTaxRate(creds, orgId);
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
          taxRateId: fallbackTaxRateId ?? undefined,
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

    async sendReminder({ invoice_external_id, type }) {
      // Billy: POST /invoices/{id}/send med template=reminder. Billy beregner
      // selv gebyr ud fra organisationens standardindstilling.
      const tpl = type === "collection" ? "collectionLetter" : "reminder";
      const res = await billyRequest(creds, `/invoices/${invoice_external_id}/send`, {
        method: "POST",
        body: JSON.stringify({ email: { template: tpl } }),
      }).catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Kunne ikke sende rykker via Billy: ${msg}`);
      });
      return {
        sent_at: new Date().toISOString(),
        type: type ?? "reminder1",
        fee: typeof res?.fee === "number" ? res.fee : null,
        external_id: res?.id ? String(res.id) : null,
      };
    },

    async creditInvoice({ invoice_external_id }) {
      // Billy: POST /invoices/{id}/creditNote — opretter (og bogfører) en
      // kreditnota for hele fakturaen.
      const res = await billyRequest(creds, `/invoices/${invoice_external_id}/creditNote`, {
        method: "POST",
        body: JSON.stringify({}),
      }).catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Kunne ikke kreditere faktura i Billy: ${msg}`);
      });
      const inv = res?.invoices?.[0] ?? res?.invoice ?? res;
      return {
        credit_note_external_id: String(inv?.id ?? invoice_external_id),
        credit_note_external_number: inv?.invoiceNo ?? null,
      };
    },

    async voidDraft({ external_id }) {
      // Billy: kun kladder kan slettes — godkendte fakturaer skal krediteres.
      await billyRequest(creds, `/invoices/${external_id}`, { method: "DELETE" })
        .catch((e) => {
          const msg = e instanceof Error ? e.message : String(e);
          throw new Error(`Kunne ikke annullere kladden i Billy: ${msg}`);
        });
    },

    async markInvoicePaid({ invoice_external_id, amount, paid_at }) {
      // Billy: opret en bilagspostering der matcher fakturaen.
      // Bruger /bankPayments hvis tilgængeligt, ellers /payments.
      const body = {
        bankPayment: {
          entryDate: (paid_at ?? new Date().toISOString()).slice(0, 10),
          amount,
          associations: [{ subjectReference: `invoice:${invoice_external_id}` }],
        },
      };
      await billyRequest(creds, "/bankPayments", {
        method: "POST",
        body: JSON.stringify(body),
      }).catch((e) => {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Kunne ikke registrere betaling i Billy: ${msg}`);
      });
    },

    async bookInvoice(input) {
      // Billy: opdater state → 'approved' for at bogføre.
      const approved = await billyRequest(creds, `/invoices/${input.external_id}`, {
        method: "PUT",
        body: JSON.stringify({ invoice: { state: "approved" } }),
      });
      const inv = approved?.invoices?.[0] ?? approved?.invoice;
      const id = String(inv?.id ?? input.external_id);
      const num = inv?.invoiceNo ?? null;
      // Forsøg at sende fakturaen pr. e-mail hvis vi har en modtager.
      let sent = false;
      if (input.customer_email) {
        try {
          await billyRequest(creds, `/invoices/${id}/send`, {
            method: "POST",
            body: JSON.stringify({
              email: { recipient: input.customer_email },
            }),
          });
          sent = true;
        } catch (_) { /* hvis Billy ikke understøtter send-endpoint, ignorer */ }
      }
      return { invoice_external_id: id, invoice_external_number: num, sent };
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

    async listInvoices(updatedSince?: Date): Promise<ExternalInvoice[]> {
      // Hent fakturaer der er ændret siden sidste pull. Billy understøtter
      // ?updatedSince — ellers henter vi de seneste 100.
      const q = updatedSince
        ? `?updatedSince=${updatedSince.toISOString()}`
        : `?pageSize=100&sortProperty=updatedTime&sortDirection=DESC`;
      const data = await billyRequest(creds, `/invoices${q}`);
      const items = (data?.invoices ?? []) as any[];
      return items.map((inv): ExternalInvoice => {
        const total = Number(inv.grossAmount ?? inv.amount ?? 0);
        const balance = Number(inv.balance ?? total);
        const paid = total - balance;
        const isPaid = inv.isPaid === true || inv.state === "paid" || (balance === 0 && total > 0);
        const isCredit = inv.state === "voided" || inv.type === "creditNote" || total < 0;
        const dueDate: string | null = inv.dueDate ?? null;
        const overdue = !isPaid && dueDate && new Date(dueDate) < new Date();
        let status: ExternalInvoiceState["status"];
        if (isCredit) status = "credited";
        else if (isPaid) status = "paid";
        else if (paid > 0 && balance > 0) status = "partially_paid";
        else if (overdue) status = "overdue";
        else status = "unpaid";
        const lines: any[] = Array.isArray(inv.lines) ? inv.lines : [];
        return {
          external_id: String(inv.id),
          external_number: inv.invoiceNo ?? null,
          customer_external_id: inv.contactId ?? null,
          customer_name: null,
          status,
          paid_amount: paid,
          total_amount: total,
          paid_at: isPaid ? (inv.paidDate ?? inv.updatedTime ?? null) : null,
          due_date: dueDate,
          date: inv.entryDate ?? inv.createdTime ?? null,
          currency: inv.currencyId ?? "DKK",
          lines: lines.map((l) => ({
            description: l.description ?? "",
            quantity: Number(l.quantity ?? 1),
            unit_price: Number(l.unitPrice ?? 0),
            product_external_id: l.productId ?? null,
          })),
          raw: inv,
        };
      });
    },
  };
}