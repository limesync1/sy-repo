// Shared types for accounting integrations
// Each provider implements the AccountingAdapter interface below.

export type AccountingProvider = "economic" | "dinero";

export interface AccountingCredentials {
  api_token?: string | null;
  api_secret?: string | null;
  agreement_number?: string | null;
  organization_id?: string | null;
}

export interface AccountingSettings {
  push_pending?: boolean;
  default_payment_terms_days?: number;
  default_vat_rate?: number;
  auto_create_products?: boolean;
  default_product_account?: string;
  default_customer_group?: string;     // kundegruppe id (e-conomic) / contactGroup (dinero)
  default_product_group?: string;      // produktgruppe id (e-conomic productGroupNumber, dinero account)
  default_income_account?: string;     // indtægtskonto-nr (typisk 1000-serien)
  send_order_as?: "order" | "invoice_draft" | "quote";
  [key: string]: unknown;
}

export interface ExternalCustomer {
  external_id: string;
  external_number?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  cvr?: string | null;
  ean?: string | null;
  address?: string | null;
  zip_code?: string | null;
  city?: string | null;
  payment_terms_days?: number | null;
  currency?: string | null;
  // "company" eller "person" hvis udbyderen oplyser det. Bruges som fallback
  // når CVR mangler så virksomhedskunder ikke fejlagtigt ender som privatkunder.
  type?: "company" | "person" | null;
  raw?: unknown;
}

export interface ExternalProduct {
  external_id: string;
  external_number?: string | null;
  name: string;
  unit_price: number;
  vat_rate?: number | null;
  account_number?: string | null;
  raw?: unknown;
}

export interface OrderLineInput {
  service_id?: string | null;
  product_external_id?: string | null;
  product_external_number?: string | null;
  description: string;
  quantity: number;
  unit_price: number;
  vat_rate?: number | null;
}

export interface UpsertCustomerInput {
  internal_id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  cvr?: string | null;
  ean?: string | null;
  address?: string | null;
  zip_code?: string | null;
  city?: string | null;
  payment_terms_days?: number | null;
  currency?: string | null;
  external_id?: string | null; // existing link, if any
  customer_number?: string | null;
  customer_group?: string | null;
  vat_zone?: string | null;
  is_blocked?: boolean | null;
}

export interface UpsertProductInput {
  internal_id: string;
  name: string;
  description?: string | null;
  unit_price: number;
  vat_rate?: number | null;
  account_number?: string | null;
  product_group?: string | null;
  external_id?: string | null;
  product_number?: string | null;
  vat_zone?: string | null;
}

export interface UpsertOrderInput {
  internal_id: string;
  external_id?: string | null;
  external_type?: "order" | "invoice_draft" | "quote";
  customer_external_id: string;
  customer_name?: string | null;
  status: string; // serviceydere status
  notes?: string | null;
  payment_terms_days?: number | null;
  currency?: string | null;
  date?: string | null; // ISO date
  lines: OrderLineInput[];
}

export interface ExternalGroup {
  id: string;
  name: string;
  account_number?: string | null;
}

export interface ExternalGroups {
  customer_groups: ExternalGroup[];
  product_groups: ExternalGroup[];
  income_accounts: ExternalGroup[];
  /**
   * Provider-specific UI labels so the app can mirror the exact terminology
   * used inside the connected accounting program (e.g. "Varegruppe" in
   * e-conomic vs. "Produktgruppe" in Billy vs. "Konto" in Dinero).
   */
  labels?: {
    customer_groups?: string;
    product_groups?: string;
    income_accounts?: string;
    customer_groups_help?: string;
    product_groups_help?: string;
    income_accounts_help?: string;
  };
}

export type ExternalInvoiceStatus = "unpaid" | "partially_paid" | "paid" | "credited" | "overdue";

export interface ExternalInvoiceState {
  external_id: string;
  external_number?: string | null;
  status: ExternalInvoiceStatus;
  paid_amount?: number | null;
  total_amount?: number | null;
  paid_at?: string | null; // ISO
  due_date?: string | null; // ISO date
  reminder_count?: number | null;
  last_reminder_at?: string | null;
  last_reminder_type?: string | null;
  reminder_history?: Array<{
    sent_at: string;            // ISO
    type?: string | null;       // "reminder1" | "reminder2" | ... | "collection"
    fee?: number | null;        // gebyr opkrævet
    external_id?: string | null;
  }>;
  voided?: boolean;
  voided_at?: string | null;
  credited?: boolean;
  credited_at?: string | null;
  credit_note_external_id?: string | null;
  credit_note_external_number?: string | null;
  raw?: unknown;
}

export interface ExternalInvoiceLine {
  description: string;
  quantity: number;
  unit_price: number;
  product_external_id?: string | null;
}

/**
 * Full invoice as returned by the provider — used to discover invoices that
 * were created directly in the accounting program (i.e. outside Serviceydere)
 * so we can mirror them as shadow orders for full two-way sync.
 */
export interface ExternalInvoice extends ExternalInvoiceState {
  customer_external_id?: string | null;
  customer_name?: string | null;
  date?: string | null; // ISO date the invoice was issued
  currency?: string | null;
  lines?: ExternalInvoiceLine[];
}

export interface AccountingAdapter {
  provider: AccountingProvider;

  testConnection(): Promise<{ ok: boolean; message?: string }>;

  // Lookups for dropdowns in UI
  listGroups(): Promise<ExternalGroups>;

  // Customers
  listCustomers(updatedSince?: Date): Promise<ExternalCustomer[]>;
  upsertCustomer(input: UpsertCustomerInput): Promise<ExternalCustomer>;

  // Products
  listProducts(updatedSince?: Date): Promise<ExternalProduct[]>;
  upsertProduct(input: UpsertProductInput): Promise<ExternalProduct>;

  // Orders / drafts / quotes
  upsertOrder(input: UpsertOrderInput): Promise<{
    external_id: string;
    external_number?: string | null;
    external_type: "order" | "invoice_draft" | "quote";
  }>;
  deleteOrder?(externalId: string): Promise<void>;

  /**
   * Fetch latest payment / status info for a batch of invoices.
   * Implementations may ignore unknown ids. Used to keep
   * orders.payment_status in sync — payment status is ALWAYS sourced
   * from the accounting provider, never set manually inside Serviceydere.
   */
  getInvoiceStates?(externalIds: string[]): Promise<ExternalInvoiceState[]>;

  /**
   * List invoices issued in the accounting program. Used to mirror invoices
   * created directly in Billy/Dinero/e-conomic (not via Serviceydere) back
   * into Serviceydere as shadow orders. Optional — adapters that don't
   * support listing invoices can omit it.
   */
  listInvoices?(updatedSince?: Date): Promise<ExternalInvoice[]>;

  /**
   * Book an existing draft/order as a real invoice and (best-effort) send it
   * to the customer via the provider. Called when a route_stop is completed.
   * Returns the booked invoice id/number so we can poll status later.
   * Implementations may throw when the provider does not support invoicing.
   */
  bookInvoice?(input: {
    external_id: string;
    external_type: "order" | "invoice_draft" | "quote";
    customer_email?: string | null;
  }): Promise<{
    invoice_external_id: string;
    invoice_external_number?: string | null;
    invoice_external_type?: "invoice_booked" | "invoice_draft";
    sent: boolean;
  }>;

  /**
   * Send en rykker (reminder) for en bogført faktura via udbyderens egen
   * rykkerflow. Vi lader udbyderen håndtere gebyrer og e-mail-skabelon —
   * Serviceydere registrerer bare at rykkeren blev sendt.
   */
  sendReminder?(input: {
    invoice_external_id: string;
    type?: "reminder1" | "reminder2" | "reminder3" | "collection" | "auto";
  }): Promise<{
    sent_at: string;
    type: string;
    fee?: number | null;
    external_id?: string | null;
    note?: string | null;
  }>;

  /**
   * Krediter en bogført faktura. Returnerer kreditnotaens eksterne id.
   * Bruges når aftalen blev afsluttet, men kunden skal have pengene tilbage.
   */
  creditInvoice?(input: {
    invoice_external_id: string;
    reason?: string | null;
  }): Promise<{
    credit_note_external_id: string;
    credit_note_external_number?: string | null;
  }>;

  /**
   * Annullér en kladde-faktura/ordre der endnu ikke er bogført. Bogførte
   * fakturaer kan ikke annulleres — brug creditInvoice i stedet.
   */
  voidDraft?(input: {
    external_id: string;
    external_type: "order" | "invoice_draft" | "quote";
  }): Promise<void>;

  /**
   * Markér en faktura som betalt manuelt (kontant, MobilePay osv.).
   * Bogføres i regnskabsprogrammet som indbetaling på fakturaen.
   */
  markInvoicePaid?(input: {
    invoice_external_id: string;
    amount: number;
    paid_at?: string | null; // ISO date
  }): Promise<void>;

  /**
   * Hent PDF for en faktura (bogført eller kladde). Returnerer base64-encodet
   * PDF + foreslået filnavn så frontend kan trigge download.
   */
  getInvoicePdf?(input: {
    invoice_external_id: string;
    external_type?: "invoice_booked" | "invoice_draft";
  }): Promise<{ pdf_base64: string; filename: string }>;

  /**
   * Gensend en bogført faktura til kunden via udbyderens egen e-mail-flow.
   * Bruges fra medarbejderpanelet når en aftale lige er markeret udført og
   * kunden skal have fakturaen igen.
   */
  resendInvoice?(input: {
    invoice_external_id: string;
    external_type?: "invoice_booked" | "invoice_draft";
    customer_email?: string | null;
  }): Promise<{ sent: boolean; note?: string | null }>;
}

export type AdapterFactory = (
  creds: AccountingCredentials,
  settings: AccountingSettings,
) => AccountingAdapter;