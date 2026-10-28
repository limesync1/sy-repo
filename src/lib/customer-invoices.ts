// Grupperer kundens ordrer pr. faktura. Ved samlet fakturering (fakturainterval)
// får alle aftaler på fakturaen samme eksterne faktura-id fra regnskabsprogrammet.
export type InvoiceGroup<T> = { key: string; orders: T[] };

export function groupCustomerInvoices<T extends { id: string; invoice_external_id?: string | null; business_id?: string | null }>(orders: T[]): InvoiceGroup<T>[] {
  const map = new Map<string, T[]>();
  for (const o of orders) {
    const key = o.invoice_external_id ? `${o.business_id ?? ""}:${o.invoice_external_id}` : `order:${o.id}`;
    map.set(key, [...(map.get(key) ?? []), o]);
  }
  return [...map.entries()].map(([key, list]) => ({ key, orders: list }));
}
