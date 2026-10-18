import { describe, expect, it } from "vitest";
import { nextDatesByOrder, orderCycleNumber } from "./order-recurrence-display";
const rows = [0, 1, 2, 3].map(n => ({ id: `order-${n}`, parent_order_id: "order-0", recurrence_cycle: n || null, completed_cycles: 1, status: "completed" }));
const sub = { order_id: "order-3", status: "active", next_service_date: "2026-10-18T23:10:06.877Z" };
describe("recurring order display", () => {
  it("numbers the four completed hourly occurrences 1, 2, 3, 4", () => {
    expect(rows.map(orderCycleNumber)).toEqual([1, 2, 3, 4]);
  });
  it("does not increment a generated open occurrence twice", () => {
    expect(orderCycleNumber({ ...rows[3], status: "confirmed", completed_cycles: 0 })).toBe(4);
  });
  it("shows only the authoritative next date on the latest occurrence", () => {
    expect([...nextDatesByOrder(rows, [sub])]).toEqual([["order-3", "2026-10-18T23:10:06.877Z"]]);
  });
  it("stops announcing creation when the next order exists", () => {
    expect(nextDatesByOrder([...rows, { ...rows[3], id: "order-4", recurrence_cycle: 4, status: "confirmed" }], [sub]).size).toBe(0);
  });
  it("does not count down paused or cancelled series", () => {
    expect(nextDatesByOrder(rows, [{ ...sub, status: "paused" }, { ...sub, status: "cancelled" }]).size).toBe(0);
  });
  it("preserves legacy repeated completion numbering", () => {
    expect(orderCycleNumber({ id: "legacy", status: "completed", completed_cycles: 3 })).toBe(3);
    expect(orderCycleNumber({ id: "legacy", status: "confirmed", completed_cycles: 3 })).toBe(4);
  });
});
