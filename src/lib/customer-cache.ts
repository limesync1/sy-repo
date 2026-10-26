import type { Tables } from "@/integrations/supabase/types";

type SavedCustomer = Tables<"private_customers"> | Tables<"business_customers">;

/** Update confirmed customer data without replacing order-derived totals. */
export function mergeSavedCustomer<T extends {
  email: string; saved_id?: string | null; total_revenue: number;
}>(customers: T[] | undefined, row: SavedCustomer, type: "private" | "business") {
  if (!customers) return customers;
  const fields = {
    email: row.email,
    saved_id: row.id,
    type,
    name: "name" in row ? row.name : row.contact_name || row.company_name,
    company_name: "company_name" in row ? row.company_name : null,
    cvr: "cvr" in row ? row.cvr : null,
    contact_name: "contact_name" in row ? row.contact_name : null,
    phone: row.phone, address: row.address, zip_code: row.zip_code,
    city: row.city, notes: row.notes, avatar_url: row.avatar_url,
  };
  const match = customers.findIndex(customer =>
    customer.saved_id === row.id || customer.email.toLowerCase() === row.email.toLowerCase());
  if (match >= 0) return customers.map((customer, index) => index === match ? { ...customer, ...fields } : customer);
  return [...customers, {
    ...fields, customer_id: null, total_revenue: 0, orders_count: 0,
    live_orders_count: 0, active_subs: 0, paused_subs: 0,
    last_order_at: "", first_order_at: "",
  }];
}