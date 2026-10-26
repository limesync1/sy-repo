import { describe, expect, it } from "vitest";
import type { Tables } from "@/integrations/supabase/types";
import { mergeSavedCustomer } from "./customer-cache";

const row = { id: "customer-1", email: "new@example.test", name: "Mette", phone: null, address: null } as Tables<"private_customers">;

describe("confirmed customer cache", () => {
  it("updates an email change by persisted ID while retaining financial totals", () => {
    const original = [{ saved_id: row.id, email: "old@example.test", total_revenue: 600, orders_count: 3, address: "Old address" }];
    const result = mergeSavedCustomer(original, row, "private");
    expect(result).toHaveLength(1);
    expect(result?.[0]).toMatchObject({ email: row.email, total_revenue: 600, orders_count: 3, address: null });
    expect(original[0].email).toBe("old@example.test");
  });
  it("merges an upsert by email instead of duplicating the customer", () => {
    const result = mergeSavedCustomer([{ email: row.email.toUpperCase(), total_revenue: 400 }], row, "private");
    expect(result).toHaveLength(1);
    expect(result?.[0]).toMatchObject({ saved_id: row.id, total_revenue: 400 });
  });
  it("shows a newly saved customer immediately with zero order statistics", () => {
    expect(mergeSavedCustomer([], row, "private")?.[0]).toMatchObject({ email: row.email, orders_count: 0, total_revenue: 0 });
    expect(mergeSavedCustomer(undefined, row, "private")).toBeUndefined();
  });
});