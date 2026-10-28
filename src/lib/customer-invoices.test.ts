import { describe, it, expect } from "vitest";
import { groupCustomerInvoices } from "./customer-invoices";

describe("groupCustomerInvoices", () => {
  it("samler aftaler med samme faktura på én faktura", () => {
    const g = groupCustomerInvoices([
      { id: "a", business_id: "b", invoice_external_id: "100" },
      { id: "b", business_id: "b", invoice_external_id: "100" },
      { id: "c", business_id: "b", invoice_external_id: null },
    ]);
    expect(g).toHaveLength(2);
    expect(g[0].orders.map((o) => o.id)).toEqual(["a", "b"]);
  });
});
