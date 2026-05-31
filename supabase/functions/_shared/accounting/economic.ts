// E-conomic adapter
// Docs: https://restdocs.e-conomic.com/
// Auth: X-AppSecretToken (per-app) + X-AgreementGrantToken (per agreement)
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

const BASE = "https://restapi.e-conomic.com";

function pickDraftInvoicePayload(template: any): Record<string, unknown> {
  const candidates = [
    template?.draftInvoice,
    template?.draft_invoice,
    template?.invoice,
    template?.data?.draftInvoice,
    template,
  ];

  const payload = candidates.find((candidate) =>
    candidate && typeof candidate === "object" &&
    (candidate.date || candidate.currency || candidate.customer || candidate.paymentTerms || candidate.recipient || candidate.layout)
  );

  if (!payload || typeof payload !== "object") {
    const keys = template && typeof template === "object" ? Object.keys(template).join(", ") : "ingen felter";
    throw new Error(`E-conomic returnerede en ugyldig faktura-skabelon (${keys})`);
  }

  const copy = { ...payload };
  delete (copy as any).draftInvoiceNumber;
  delete (copy as any).bookedInvoiceNumber;
  delete (copy as any).self;
  return copy;
}

function pickEconomicRef(value: any, numberKey: string): Record<string, unknown> | undefined {
  if (numberKey === "productNumber" && value?.productNumber != null) {
    return { productNumber: String(value.productNumber) };
  }
  const num = Number(value?.[numberKey]);
  if (Number.isFinite(num) && num > 0) return { [numberKey]: num };
  if (value?.self) return { self: value.self };
  return undefined;
}

function buildCreditNoteDraftPayload(invoice: any): Record<string, unknown> {
  const customer = pickEconomicRef(invoice.customer, "customerNumber");
  const layout = pickEconomicRef(invoice.layout, "layoutNumber");
  const paymentTerms = pickEconomicRef(invoice.paymentTerms, "paymentTermsNumber");
  const vatZone = pickEconomicRef(invoice.recipient?.vatZone, "vatZoneNumber") ?? { vatZoneNumber: 1 };
  if (!customer || !layout || !paymentTerms) {
    throw new Error("E-conomic-fakturaen mangler kunde, layout eller betalingsbetingelser og kan ikke krediteres automatisk.");
  }
  const recipient = {
    name: (invoice.recipient?.name ?? "Kunde").toString().trim() || "Kunde",
    address: invoice.recipient?.address ?? undefined,
    zip: invoice.recipient?.zip ?? undefined,
    city: invoice.recipient?.city ?? undefined,
    country: invoice.recipient?.country ?? undefined,
    ean: invoice.recipient?.ean ?? undefined,
    publicEntryNumber: invoice.recipient?.publicEntryNumber ?? undefined,
    vatZone,
  };
  for (const key of Object.keys(recipient)) if ((recipient as any)[key] == null || (recipient as any)[key] === "") delete (recipient as any)[key];
  const lines = ((invoice.lines ?? []) as any[]).map((line, index) => {
    const out: Record<string, unknown> = {
      lineNumber: index + 1,
      sortKey: line.sortKey ?? index + 1,
      description: (line.description ?? "Kreditering").toString().trim() || "Kreditering",
      quantity: -Math.abs(Number(line.quantity ?? 1)),
      unitNetPrice: Math.abs(Number(line.unitNetPrice ?? line.totalNetAmount ?? 0)),
      discountPercentage: Number(line.discountPercentage ?? 0),
    };
    const product = pickEconomicRef(line.product, "productNumber");
    const unit = pickEconomicRef(line.unit, "unitNumber");
    if (product) out.product = product;
    if (unit) out.unit = unit;
    return out;
  }).filter((line) => Number(line.unitNetPrice) > 0);
  if (lines.length === 0) throw new Error("E-conomic-fakturaen har ingen fakturalinjer der kan krediteres automatisk.");
  return {
    date: new Date().toISOString().slice(0, 10),
    currency: invoice.currency ?? "DKK",
    customer,
    recipient,
    paymentTerms,
    layout,
    notes: {
      heading: "Kreditnota",
      textLine1: `Kreditering af faktura ${invoice.bookedInvoiceNumber}`,
    },
    lines,
  };
}

/**
 * Maps Serviceydere vat_zone values to e-conomic vatZoneNumber.
 * E-conomic standard: 1 = indland, 2 = EU, 3 = eksport (3. land), 4 = momsfri.
 */
function vatZoneToEconomic(zone?: string | null): number {
  switch ((zone ?? "").toLowerCase()) {
    case "eu": return 2;
    case "export":
    case "eksport": return 3;
    case "exempt":
    case "momsfri": return 4;
    case "domestic":
    case "indland":
    default: return 1;
  }
}

function makeHeaders(creds: AccountingCredentials): HeadersInit {
  return {
    "X-AppSecretToken": creds.api_secret ?? "",
    "X-AgreementGrantToken": creds.api_token ?? "",
    "Content-Type": "application/json",
    Accept: "application/json",
  };
}

async function resolveLayoutNumber(creds: AccountingCredentials, settings: AccountingSettings): Promise<number | null> {
  const configured = Number((settings as any).default_layout_number ?? (settings as any).default_layout);
  if (Number.isFinite(configured) && configured > 0) return configured;
  const layouts = await ecRequest(creds, "/layouts?pagesize=100").catch(() => ({ collection: [] }));
  const first = (layouts?.collection ?? []).find((l: any) => l?.layoutNumber);
  return first?.layoutNumber ? Number(first.layoutNumber) : null;
}

async function resolveAccountingYear(creds: AccountingCredentials, dateIso: string): Promise<string> {
  const date = dateIso.slice(0, 10);
  const years = await ecRequest(creds, "/accounting-years?pagesize=100").catch(() => ({ collection: [] }));
  const match = (years?.collection ?? []).find((y: any) => {
    const from = String(y?.fromDate ?? "").slice(0, 10);
    const to = String(y?.toDate ?? "").slice(0, 10);
    return y?.year && from && to && from <= date && date <= to && y.closed !== true;
  });
  return String(match?.year ?? new Date(date).getFullYear());
}

async function resolveCustomerPaymentJournal(creds: AccountingCredentials, settings: AccountingSettings): Promise<{ journalNumber: number; contraAccountNumber: number | null }> {
  const configured = Number((settings as any).payment_journal_number ?? (settings as any).default_journal_number);
  const journals = await ecRequest(creds, "/journals?pagesize=100").catch(() => ({ collection: [] }));
  const list = (journals?.collection ?? []) as any[];
  const candidates = Number.isFinite(configured) && configured > 0
    ? list.filter((j) => Number(j?.journalNumber) === configured)
    : list;
  const journal = candidates.find((j) => {
    const restricted = String(j?.settings?.entryTypeRestrictedTo ?? "");
    return !restricted || restricted === "customerPayment";
  }) ?? candidates[0];
  if (!journal?.journalNumber) throw new Error("Ingen kassekladde til kundebetalinger er tilgængelig i e-conomic — opret eller vælg en først.");
  const configuredContra = Number((settings as any).payment_account_number ?? (settings as any).default_payment_account);
  const journalContra = Number(journal?.settings?.contraAccounts?.customerPayments?.accountNumber);
  return {
    journalNumber: Number(journal.journalNumber),
    contraAccountNumber: Number.isFinite(configuredContra) && configuredContra > 0
      ? configuredContra
      : Number.isFinite(journalContra) && journalContra > 0 ? journalContra : null,
  };
}

function friendlyEconomicError(status: number, body: string): string {
  const lower = body.toLowerCase();
  if (lower.includes("democompanyexpired") || lower.includes("demo company has been expired")) {
    return "Din e-conomic demo-aftale er udløbet. Opgrader til en betalt aftale på e-conomic.dk, eller tilkobl en aktiv aftale i stedet.";
  }
  const accessMessage = specificEconomicAccessError(status, body);
  if (accessMessage) return accessMessage;
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
    // E-conomic putter ofte detaljerne i et 'errors'-objekt (key→{errors:[...]}) ELLER
    // i et top-level errors array. Vi rekursivt indsamler ALT så brugeren ser
    // præcis hvilket felt der fejler — ikke bare "Schema validation failed.".
    const collectErrs = (node: any, prefix = ""): void => {
      if (!node) return;
      if (Array.isArray(node)) {
        for (const e of node) {
          if (e && typeof e === "object") {
            const field = e.propertyName ?? e.property ?? prefix;
            const msg = e.errorMessage ?? e.message ?? "";
            const hint = e.developerHint ?? "";
            const piece = [field && `[${field}]`, msg, hint && `(${hint})`].filter(Boolean).join(" ");
            if (piece) parts.push(piece);
          } else if (typeof e === "string") {
            parts.push(prefix ? `[${prefix}] ${e}` : e);
          }
        }
      } else if (typeof node === "object") {
        if (Array.isArray(node.errors)) collectErrs(node.errors, prefix);
        for (const [k, v] of Object.entries(node)) {
          if (k === "errors" || k === "message") continue;
          if (v && typeof v === "object") collectErrs(v, prefix ? `${prefix}.${k}` : k);
        }
      }
    };
    collectErrs(j?.errors);
    if (parts.length <= 1 && j && typeof j === "object") {
      for (const [k, v] of Object.entries(j)) {
        if (["message","errors","errorCode","developerHint","logId","logTime","httpStatusCode"].includes(k)) continue;
        if (v && typeof v === "object") collectErrs(v, k);
      }
    }
    if (parts.length) return `E-conomic: ${parts.join(" — ")}`;
  } catch { /* ignore */ }
  // Hvis vi ikke kunne parse JSON, så returnér rå body (afkortet) så vi ikke taber info
  const snippet = body.slice(0, 400);
  return `E-conomic afviste forespørgslen (${status})${snippet ? `: ${snippet}` : ""}.`;
}

function specificEconomicAccessError(status: number, body: string): string | null {
  if (status !== 401 && status !== 403) return null;
  try {
    const j = JSON.parse(body);
    const message = typeof j?.message === "string" ? j.message.trim() : "";
    const code = typeof j?.errorCode === "string" ? j.errorCode.trim() : "";
    if (!message && !code) return null;
    if (/democompanyexpired|demo company has been expired/i.test(`${message} ${code}`)) {
      return "Din e-conomic demo-aftale er udløbet. Opgrader til en betalt aftale på e-conomic.dk, eller tilkobl en aktiv aftale i stedet.";
    }
    return `E-conomic afviste adgangen${code ? ` (${code})` : ""}${message ? `: ${message}` : ""}. Tjek at din e-conomic-aftale er aktiv, og at app'en stadig er installeret på aftalen.`;
  } catch {
    return null;
  }
}

async function ecRequest(
  creds: AccountingCredentials,
  path: string,
  init: RequestInit = {},
  opts: { silent404?: boolean } = {},
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
    // Når kalderen eksplicit beder om "silent 404" (fx kunde-/faktura-opslag
    // hvor not-found er en gyldig forretningstilstand), skal vi IKKE kaste en
    // generisk fejl. Vi returnerer `null` i stedet, så kalderen kan reagere
    // præcist (rydde forældet link, oprette på ny osv.) — uden at brugeren
    // ser "E-conomic kunne ikke finde det forespurgte. Tjek at din aftale
    // er aktiv." på en ellers fungerende integration.
    if (opts.silent404 && res.status === 404) {
      return null;
    }
    if (!(opts.silent404 && res.status === 404)) {
      console.error("[economic] request failed", {
        method: init.method ?? "GET",
        path,
        status: res.status,
        body: text.slice(0, 500),
      });
    }
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
        customerGroup: {
          customerGroupNumber: Number(input.customer_group ?? settings.default_customer_group ?? 1),
        },
        paymentTerms: {
          paymentTermsNumber: 1,
          daysOfCredit: input.payment_terms_days ?? settings.default_payment_terms_days ?? 14,
        },
        vatZone: { vatZoneNumber: vatZoneToEconomic(input.vat_zone) },
        barred: input.is_blocked === true ? true : undefined,
      };

      // Brug eksplicit kundenummer ved oprettelse hvis brugeren har angivet et
      if (!input.external_id && input.customer_number && /^\d+$/.test(input.customer_number)) {
        (body as any).customerNumber = Number(input.customer_number);
      }

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
        // Verify the product still exists in e-conomic. Hvis linket peger på et
        // produkt der er slettet (eller aldrig blev oprettet korrekt), falder vi
        // tilbage til at oprette det på ny — ellers fejler efterfølgende
        // ordre-pushes med "lines.items" fordi productNumber ikke findes.
        const existing = await ecRequest(
          creds,
          `/products/${encodeURIComponent(input.external_id)}`,
          {},
          { silent404: true },
        );
        if (existing) {
          await ecRequest(creds, `/products/${encodeURIComponent(input.external_id)}`, {
            method: "PUT",
            body: JSON.stringify(body),
          });
          return {
            external_id: input.external_id,
            external_number: input.external_id,
            name: input.name,
            unit_price: input.unit_price,
          };
        }
        // ellers: produktet findes ikke længere — falder igennem til POST.
      }
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
    },

    async upsertOrder(input: UpsertOrderInput) {
      // E-conomic bruger /orders/drafts til ordrekladder. /sales-orders findes
      // ikke i REST API'et og gav derfor 404 på Ready2Clean.
      const sendAs = input.external_type ?? settings.send_order_as ?? "order";
      const path = sendAs === "order" ? "/orders/drafts" : "/invoices/drafts";
      const date = (input.date ?? new Date().toISOString()).slice(0, 10);
      // Recipient.name er PÅKRÆVET af e-conomic — tom string giver
      // "Schema validation failed." Vi sætter et fornuftigt fallback fra
      // input og overskriver hvis customer-opslaget lykkes.
      const fallbackRecipientName =
        (input as any).customer_name?.toString().trim() ||
        `Kunde ${input.customer_external_id}`;

      // E-conomic kræver et productNumber på HVER linje i en ordrekladde —
      // ellers fejler hele pushet med "Validation failed. lines.items". Hvis en
      // ordrelinje ikke er knyttet til en service (fx ad-hoc linjer eller
      // historisk import uden service_id), opretter vi én gang et fælles
      // "Diverse ydelse" (SY-MISC) produkt i e-conomic og bruger det som
      // fallback. Eksistensen verificeres pr. push, så vi også selvhelbreder
      // hvis produktet er slettet manuelt i e-conomic.
      let fallbackProductNumber: string | null = null;
      const ensureFallbackProduct = async (): Promise<string> => {
        if (fallbackProductNumber) return fallbackProductNumber;
        const productNumber = "SY-MISC";
        const productGroupNumber = Number(settings.default_product_group ?? 1);
        const productBody = {
          productNumber,
          name: "Diverse ydelse",
          salesPrice: 0,
          productGroup: { productGroupNumber },
        };
        const existing = await ecRequest(
          creds,
          `/products/${encodeURIComponent(productNumber)}`,
          {},
          { silent404: true },
        );
        if (!existing) {
          await ecRequest(creds, `/products`, {
            method: "POST",
            body: JSON.stringify(productBody),
          });
        }
        fallbackProductNumber = productNumber;
        return productNumber;
      };

      const mappedLines = await Promise.all(
        input.lines.map(async (l, idx) => {
          const productNumber = l.product_external_id
            ? String(l.product_external_id)
            : await ensureFallbackProduct();
          return {
            lineNumber: idx + 1,
            description: (l.description ?? "").toString().trim() || "Ydelse",
            quantity: l.quantity,
            unitNetPrice: l.unit_price,
            product: { productNumber },
          };
        }),
      );

      const body: Record<string, unknown> = {
        date,
        currency: input.currency ?? "DKK",
        customer: { customerNumber: Number(input.customer_external_id) },
        recipient: { name: fallbackRecipientName, vatZone: { vatZoneNumber: 1 } },
        notes: { textLine1: (input.notes ?? "").slice(0, 200) },
        // paymentTerms er PÅKRÆVET af e-conomic. Sæt en sikker default
        // straks så ordren aldrig fejler med "Required properties are
        // missing from object: paymentTerms" — overskrives senere fra
        // kunde-opslag eller aftalens default hvis tilgængeligt.
        paymentTerms: { paymentTermsNumber: 1 },
        lines: mappedLines,
      };

      // Lookup the actual customer to copy paymentTerms, vatZone, layout og navn
      // — så vi ikke fejler med 404 på hardkodede ID'er der ikke findes i denne
      // e-conomic-aftale.
      let customerExists = true;
      try {
        const cust = await ecRequest(
          creds,
          `/customers/${Number(input.customer_external_id)}`,
          {},
          { silent404: true },
        );
        if (cust === null) {
          // Kunden findes ikke længere i e-conomic — meld som forældet link så
          // drainQueue kan rydde det og oprette kunden på ny ved næste forsøg.
          throw new Error(`ECONOMIC_CUSTOMER_NOT_FOUND:${input.customer_external_id}`);
        }
        if (cust?.paymentTerms?.paymentTermsNumber) {
          (body as any).paymentTerms = {
            paymentTermsNumber: cust.paymentTerms.paymentTermsNumber,
          };
        }
        if (cust?.vatZone?.vatZoneNumber) {
          (body as any).recipient = {
            name: (cust.name ?? "").toString().trim() || fallbackRecipientName,
            address: cust.address ?? undefined,
            zip: cust.zip ?? undefined,
            city: cust.city ?? undefined,
            vatZone: { vatZoneNumber: cust.vatZone.vatZoneNumber },
          };
        }
        if (cust?.layout?.layoutNumber) {
          (body as any).layout = { layoutNumber: cust.layout.layoutNumber };
        }
      } catch (e) {
        // Hvis kunden ikke findes i e-conomic, så er vores lokale link forældet.
        // Vi smider en velkendt fejl så drainQueue kan rydde linket og prøve igen.
        const msg = e instanceof Error ? e.message : String(e);
        if (/kunne ikke finde|not found|404/i.test(msg)) {
          customerExists = false;
          throw new Error(
            `ECONOMIC_CUSTOMER_NOT_FOUND:${input.customer_external_id}`,
          );
        }
        throw e;
      }
      if (!customerExists) return { external_id: "", external_number: "", external_type: sendAs };
      if (!(body as any).layout?.layoutNumber) {
        const layoutNumber = await resolveLayoutNumber(creds, settings);
        if (layoutNumber) (body as any).layout = { layoutNumber };
      }

      // paymentTerms er PÅKRÆVET af e-conomic. Hvis kunde-opslaget ikke gav et
      // paymentTermsNumber (fx ny kunde uden default), så hent første aktive
      // paymentTerm fra aftalen som fallback — så ordren ikke fejler.
      if (!(body as any).paymentTerms?.paymentTermsNumber) {
        try {
          const pts = await ecRequest(creds, "/payment-terms?pagesize=20");
          const first = (pts?.collection ?? []).find((p: any) => p?.paymentTermsNumber);
          if (first?.paymentTermsNumber) {
            (body as any).paymentTerms = { paymentTermsNumber: first.paymentTermsNumber };
          }
        } catch { /* ignore — vil fejle med tydelig besked nedenfor */ }
      }

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
      const path = sendAs === "order" ? "/orders/drafts" : "/invoices/drafts";
      await ecRequest(creds, `${path}/${externalId}`, { method: "DELETE" });
    },

    async bookInvoice(input) {
      // Hvis det er sendt som ordrekladde, konverter først til kladde-faktura.
      let draftNumber: string | number = input.external_id;
      if (input.external_type === "order") {
        const instruction = await ecRequest(
          creds,
          `/orders/drafts/${input.external_id}/templates/upgrade-instructions/draftInvoice`,
        );
        const draftPayload = pickDraftInvoicePayload(instruction);
        const draft = await ecRequest(creds, "/invoices/drafts", {
          method: "POST",
          body: JSON.stringify(draftPayload),
        });
        draftNumber = draft?.draftInvoiceNumber ?? (draftPayload as any)?.draftInvoiceNumber ?? draftNumber;
      }

      // Bog IKKE fakturaen — den skal ligge som "Igangværende faktura" (kladde)
      // i e-conomic, så brugeren selv kan gennemgå og bogføre den. Derfor må
      // Serviceydere også gemme linket som invoice_draft; ellers prøver PDF-
      // download at hente /invoices/booked/{nr}/pdf og skjuler/fejler knappen.
      const invNo = String(draftNumber);
      return { invoice_external_id: invNo, invoice_external_number: invNo, invoice_external_type: "invoice_draft", sent: false };
    },

    async getInvoiceStates(externalIds: string[]): Promise<ExternalInvoiceState[]> {
      const out: ExternalInvoiceState[] = [];
      // E-conomic: try /invoices/booked/{n} first (paid/booked), then /invoices/drafts/{n}
      for (const id of externalIds) {
        try {
          let inv: any = null;
          let booked = true;
          try {
            inv = await ecRequest(creds, `/invoices/booked/${id}`, {}, { silent404: true });
          } catch {
            try {
              inv = await ecRequest(creds, `/invoices/drafts/${id}`, {}, { silent404: true });
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

          // Hent rykker-historik (sentToDebtorCollection / reminders) hvis bogført.
          let reminderCount = 0;
          let lastReminderAt: string | null = null;
          let lastReminderType: string | null = null;
          const reminderHistory: NonNullable<ExternalInvoiceState["reminder_history"]> = [];
          if (booked) {
            try {
              const sent = await ecRequest(creds, `/invoices/booked/${id}/sent`);
              const list: any[] = Array.isArray(sent?.collection) ? sent.collection : [];
              for (const s of list) {
                const t = String(s?.template ?? s?.documentType ?? "").toLowerCase();
                if (t.includes("reminder") || t.includes("collection") || t.includes("rykker")) {
                  reminderCount++;
                  const sentAt = s?.sentAt ?? s?.date ?? null;
                  reminderHistory.push({
                    sent_at: sentAt ?? new Date().toISOString(),
                    type: t || "reminder",
                    fee: typeof s?.fee === "number" ? s.fee : null,
                    external_id: s?.id ? String(s.id) : null,
                  });
                  if (sentAt && (!lastReminderAt || sentAt > lastReminderAt)) {
                    lastReminderAt = sentAt;
                    lastReminderType = t;
                  }
                }
              }
            } catch { /* sent endpoint not available — skip silently */ }
          }

          out.push({
            external_id: String(inv.bookedInvoiceNumber ?? inv.draftInvoiceNumber ?? id),
            external_number: String(inv.bookedInvoiceNumber ?? inv.draftInvoiceNumber ?? id),
            status,
            paid_amount: paid,
            total_amount: total,
            paid_at: status === "paid" ? (inv.paymentDate ?? null) : null,
            due_date: dueDate,
            reminder_count: reminderCount,
            last_reminder_at: lastReminderAt,
            last_reminder_type: lastReminderType,
            reminder_history: reminderHistory,
            raw: inv,
          });
        } catch { /* ignore */ }
      }
      return out;
    },

    async listInvoices(updatedSince?: Date): Promise<ExternalInvoice[]> {
      // E-conomic: bogførte fakturaer på /invoices/booked. Filter efter dato
      // hvis muligt (date$gte) — ellers seneste 100.
      const since = updatedSince ? updatedSince.toISOString().slice(0, 10) : null;
      const filter = since ? `&filter=date$gte:${since}` : "";
      const data = await ecRequest(creds, `/invoices/booked?pagesize=100${filter}`);
      const items: any[] = data?.collection ?? [];
      const out: ExternalInvoice[] = [];
      for (const inv of items) {
        const total = Number(inv.grossAmount ?? inv.netAmount ?? 0);
        const remainder = Number(inv.remainder ?? total);
        const paid = total - remainder;
        const dueDate: string | null = inv.dueDate ?? null;
        const overdue = remainder > 0 && dueDate && new Date(dueDate) < new Date();
        let status: ExternalInvoiceState["status"];
        if (remainder === 0 && total > 0) status = "paid";
        else if (paid > 0 && remainder > 0) status = "partially_paid";
        else if (overdue) status = "overdue";
        else status = "unpaid";
        out.push({
          external_id: String(inv.bookedInvoiceNumber ?? inv.draftInvoiceNumber ?? ""),
          external_number: String(inv.bookedInvoiceNumber ?? ""),
          customer_external_id: inv.customer?.customerNumber ? String(inv.customer.customerNumber) : null,
          customer_name: inv.recipient?.name ?? null,
          status,
          paid_amount: paid,
          total_amount: total,
          paid_at: status === "paid" ? (inv.paymentDate ?? null) : null,
          due_date: dueDate,
          date: inv.date ?? null,
          currency: inv.currency ?? "DKK",
          lines: [],
          raw: inv,
        });
      }
      return out;
    },

    async sendReminder({ invoice_external_id, type }) {
      // E-conomic's REST-API understøtter IKKE at trigge rykker programmatisk
      // (rykkere genereres via deres rykkerkørsel i UI'et eller automatisk
      // baseret på fakturaens forfaldsdato + rykker-skabelon).
      // Vi verificerer derfor blot at fakturaen findes og er bogført, og
      // registrerer rykkeren lokalt så brugeren har historik. Den faktiske
      // udsendelse skal ske i e-conomic's rykkerkørsel.
      let found = false;
      try {
        await ecRequest(creds, `/invoices/booked/${invoice_external_id}`);
        found = true;
      } catch { /* not booked — try draft */ }
      if (!found) {
        try {
          await ecRequest(creds, `/invoices/drafts/${invoice_external_id}`);
          found = true;
        } catch { /* not found anywhere */ }
      }
      if (!found) {
        // Fakturaen kunne ikke findes — registrér alligevel så brugeren ikke
        // står fast. E-conomic-skygge-fakturaer eller slettede numre må ikke
        // blokere historikken i Serviceydere.
      }
      return {
        sent_at: new Date().toISOString(),
        type: type ?? "reminder",
        fee: null,
        external_id: null,
        note: found
          ? "Rykker registreret. Kør e-conomics rykkerkørsel for at sende den."
          : "Rykker registreret lokalt. Fakturaen blev ikke fundet i e-conomic — tjek at den stadig findes der.",
      };
    },

    async resendInvoice({ invoice_external_id, external_type }) {
      // E-conomic: POST /invoices/booked/{n}/sent-by-email sender bogført
      // faktura til kundens registrerede e-mail. Kladder kan ikke sendes.
      const t = external_type ?? "invoice_booked";
      if (t !== "invoice_booked") {
        throw new Error("Fakturaen er ikke bogført endnu — kan ikke gensendes.");
      }
      try {
        await ecRequest(creds, `/invoices/booked/${invoice_external_id}/sent-by-email`, {
          method: "POST",
          body: JSON.stringify({}),
        });
        return { sent: true };
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Kunne ikke gensende faktura via e-conomic: ${msg}`);
      }
    },

    async creditInvoice({ invoice_external_id }) {
      // 1) Tjek først om fakturaen faktisk er bogført. Hvis den kun findes
      // som kladde (eller er slettet), giv en brugbar fejlbesked i stedet
      // for et råt 404 fra e-conomic.
      const booked = await ecRequest(creds, `/invoices/booked/${invoice_external_id}`).catch(() => null);
      if (!booked) {
        const draft = await ecRequest(creds, `/invoices/drafts/${invoice_external_id}`).catch(() => null);
        if (draft) {
          throw new Error(
            "Fakturaen er stadig en kladde i e-conomic og kan ikke krediteres. Annullér kladden i stedet, eller bogfør den først og kreditér derefter.",
          );
        }
        throw new Error(
          "Fakturaen findes ikke længere som bogført i e-conomic. Den er muligvis blevet slettet eller aldrig bogført — synkronisér regnskabet og prøv igen.",
        );
      }
      // 2) Opret kladdekreditnota — i e-conomic er kreditnotaer blot
      // negative kladdefakturaer på samme endpoint.
      // REST API'et har ikke et stabilt /templates/creditNote endpoint, så vi
      // bygger kreditnotaen ud fra den bogførte fakturas egne felter.
      const payload = buildCreditNoteDraftPayload(booked);
      const draft = await ecRequest(creds, "/invoices/drafts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const draftNumber = draft?.draftInvoiceNumber;
      if (!draftNumber) throw new Error("E-conomic gav ikke et kreditnota-nummer tilbage.");
      // 3) Bogfør den med det samme
      const bookedCredit = await ecRequest(creds, "/invoices/booked", {
        method: "POST",
        body: JSON.stringify({ draftInvoice: { draftInvoiceNumber: Number(draftNumber) } }),
      });
      const num = String(bookedCredit?.bookedInvoiceNumber ?? draftNumber);
      return { credit_note_external_id: num, credit_note_external_number: num };
    },

    async voidDraft({ external_id, external_type }) {
      // E-conomic: kun kladder kan slettes. Bogførte fakturaer skal krediteres.
      const path = external_type === "order"
        ? `/orders/drafts/${external_id}`
        : `/invoices/drafts/${external_id}`;
      try {
        await ecRequest(creds, path, { method: "DELETE" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Kunne ikke annullere kladden i e-conomic: ${msg}`);
      }
    },

    async markInvoicePaid({ invoice_external_id, amount, paid_at }) {
      // Registrér betaling som kundebetaling i kassekladden mod den bogførte faktura.
      const paidDate = paid_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10);
      const { journalNumber, contraAccountNumber } = await resolveCustomerPaymentJournal(creds, settings);
      const accountingYear = await resolveAccountingYear(creds, paidDate);
      const inv = await ecRequest(creds, `/invoices/booked/${invoice_external_id}`).catch(() => null);
      if (!inv?.customer?.customerNumber) {
        throw new Error("Kunne ikke finde kunden på fakturaen.");
      }
      const payment: Record<string, unknown> = {
        text: `Betaling for faktura ${invoice_external_id}`,
        amount,
        date: paidDate,
        currency: { code: inv.currency ?? "DKK" },
        customer: { customerNumber: inv.customer.customerNumber },
        customerInvoice: Number(invoice_external_id),
      };
      if (contraAccountNumber) payment.contraAccount = { accountNumber: contraAccountNumber };
      await ecRequest(creds, `/journals/${journalNumber}/vouchers`, {
        method: "POST",
        body: JSON.stringify({
          accountingYear: { year: accountingYear },
          journal: { journalNumber },
          entries: {
            customerPayments: [payment],
          },
        }),
      });
    },

    async getInvoicePdf({ invoice_external_id, external_type }) {
      const path = external_type === "invoice_draft"
        ? `/invoices/drafts/${invoice_external_id}/pdf`
        : `/invoices/booked/${invoice_external_id}/pdf`;
      const res = await fetch(`${BASE}${path}`, {
        headers: {
          "X-AppSecretToken": creds.api_secret ?? "",
          "X-AgreementGrantToken": creds.api_token ?? "",
          Accept: "application/octet-stream",
        },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(friendlyEconomicError(res.status, text));
      }
      const buf = new Uint8Array(await res.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
      return {
        pdf_base64: btoa(bin),
        filename: `faktura-${invoice_external_id}.pdf`,
      };
    },
  };
}