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
    console.error("[economic] request failed", {
      method: init.method ?? "GET",
      path,
      status: res.status,
      body: text.slice(0, 500),
    });
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
      // E-conomic bruger /orders/drafts til ordrekladder. /sales-orders findes
      // ikke i REST API'et og gav derfor 404 på Ready2Clean.
      const sendAs = input.external_type ?? settings.send_order_as ?? "order";
      const path = sendAs === "order" ? "/orders/drafts" : "/invoices/drafts";
      const date = (input.date ?? new Date().toISOString()).slice(0, 10);
      const body: Record<string, unknown> = {
        date,
        currency: input.currency ?? "DKK",
        customer: { customerNumber: Number(input.customer_external_id) },
        recipient: { name: "", vatZone: { vatZoneNumber: 1 } },
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

      // Lookup the actual customer to copy paymentTerms, vatZone, layout og navn
      // — så vi ikke fejler med 404 på hardkodede ID'er der ikke findes i denne
      // e-conomic-aftale.
      try {
        const cust = await ecRequest(
          creds,
          `/customers/${Number(input.customer_external_id)}`,
        );
        if (cust?.paymentTerms?.paymentTermsNumber) {
          (body as any).paymentTerms = {
            paymentTermsNumber: cust.paymentTerms.paymentTermsNumber,
          };
        }
        if (cust?.vatZone?.vatZoneNumber) {
          (body as any).recipient = {
            name: cust.name ?? "",
            address: cust.address ?? undefined,
            zip: cust.zip ?? undefined,
            city: cust.city ?? undefined,
            vatZone: { vatZoneNumber: cust.vatZone.vatZoneNumber },
          };
        }
        if (cust?.layout?.layoutNumber) {
          (body as any).layout = { layoutNumber: cust.layout.layoutNumber };
        }
      } catch (_) {
        // Hvis kunden ikke kan slås op er det rigtige fejlpunkt customer-feltet
        // — lad serveren returnere 404 så vi kan logge det.
      }
      if (!(body as any).layout?.layoutNumber) {
        const layoutNumber = await resolveLayoutNumber(creds, settings);
        if (layoutNumber) (body as any).layout = { layoutNumber };
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

      // Bog kladde-faktura → bookedInvoiceNumber. Hvis e-mail findes, beder vi
      // e-conomic sende fakturaen med deres standard e-mail-skabelon.
      const bookBody: Record<string, unknown> = {
        draftInvoice: { draftInvoiceNumber: Number(draftNumber) },
      };
      if (input.customer_email) bookBody.sendBy = "Email";
      const booked = await ecRequest(creds, "/invoices/booked", {
        method: "POST",
        body: JSON.stringify(bookBody),
      });
      const invNo = String(booked?.bookedInvoiceNumber ?? booked?.invoiceNumber ?? draftNumber);
      return { invoice_external_id: invNo, invoice_external_number: invNo, sent: !!input.customer_email };
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
      try {
        await ecRequest(creds, `/invoices/booked/${invoice_external_id}`);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(`Kunne ikke verificere faktura i e-conomic: ${msg}`);
      }
      return {
        sent_at: new Date().toISOString(),
        type: type ?? "reminder",
        fee: null,
        external_id: null,
        note: "Registreret lokalt — kør rykkerkørsel i e-conomic for at sende",
      };
    },

    async creditInvoice({ invoice_external_id }) {
      // 1) Hent skabelon for kreditnota fra den bogførte faktura
      const tmpl = await ecRequest(
        creds,
        `/invoices/booked/${invoice_external_id}/templates/creditNote`,
      );
      const payload = pickDraftInvoicePayload(tmpl);
      // 2) Opret kladdekreditnota — i e-conomic er kreditnotaer blot
      // negative kladdefakturaer på samme endpoint.
      const draft = await ecRequest(creds, "/invoices/drafts", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const draftNumber = draft?.draftInvoiceNumber;
      if (!draftNumber) throw new Error("E-conomic gav ikke et kreditnota-nummer tilbage.");
      // 3) Bogfør den med det samme
      const booked = await ecRequest(creds, "/invoices/booked", {
        method: "POST",
        body: JSON.stringify({ draftInvoice: { draftInvoiceNumber: Number(draftNumber) } }),
      });
      const num = String(booked?.bookedInvoiceNumber ?? draftNumber);
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
      // Registrér betaling som kassekladde-post mod fakturaens debitor.
      // Dette kræver et journalNumber som vi ikke kender på forhånd —
      // forsøg /journals og brug første aktive journal.
      const journals = await ecRequest(creds, "/journals?pagesize=10").catch(() => ({ collection: [] }));
      const journal = (journals?.collection ?? [])[0];
      if (!journal?.journalNumber) {
        throw new Error("Ingen kassekladde tilgængelig i e-conomic — opret en først.");
      }
      const inv = await ecRequest(creds, `/invoices/booked/${invoice_external_id}`).catch(() => null);
      if (!inv?.customer?.customerNumber) {
        throw new Error("Kunne ikke finde kunden på fakturaen.");
      }
      await ecRequest(creds, `/journals/${journal.journalNumber}/vouchers`, {
        method: "POST",
        body: JSON.stringify({
          accountingYear: { year: new Date().getFullYear().toString() },
          entries: {
            customerPayments: [{
              text: `Betaling for faktura ${invoice_external_id}`,
              amount,
              date: paid_at?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
              currency: { code: "DKK" },
              customer: { customerNumber: inv.customer.customerNumber },
              customerInvoice: { bookedInvoiceNumber: Number(invoice_external_id) },
            }],
          },
        }),
      });
    },
  };
}