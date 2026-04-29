// Shared types for accounting integrations
// Each provider implements the AccountingAdapter interface below.

export type AccountingProvider = "economic" | "billy" | "dinero";

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
  default_customer_group?: string;     // kundegruppe id (e-conomic) / contactType (billy) / contactGroup (dinero)
  default_product_group?: string;      // produktgruppe id (e-conomic productGroupNumber, billy productGroupId, dinero account)
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
}

export interface UpsertOrderInput {
  internal_id: string;
  external_id?: string | null;
  external_type?: "order" | "invoice_draft" | "quote";
  customer_external_id: string;
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
}

export type AdapterFactory = (
  creds: AccountingCredentials,
  settings: AccountingSettings,
) => AccountingAdapter;