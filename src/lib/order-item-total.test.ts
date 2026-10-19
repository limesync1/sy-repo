import { describe, it, expect } from "vitest";
import { calcItemTotal } from "./order-item-total";

describe("calcItemTotal", () => {
  it("fast pris ganges med antal", () => {
    expect(calcItemTotal({ service: { pricing_type: "fast_pris", base_price: 450 }, quantity: 3, hours: 1, stepValues: {} })).toBe(1350);
  });
  it("timepris ganges med timer", () => {
    expect(calcItemTotal({ service: { pricing_type: "timepris", base_price: 400 }, hours: 2.5, stepValues: {} })).toBe(1000);
  });
  it("prisberegner bruger kun felter, ikke grundpris, og klamper til grænser", () => {
    const service = { pricing_type: "prisberegner" as const, base_price: 300, calculator_steps: [
      { id: "a", price_per_unit: 25, min_value: 0, max_value: 10 },
      { id: "b", price_per_unit: 10, min_value: 5, max_value: null },
    ] };
    expect(calcItemTotal({ service, hours: 1, stepValues: { a: 20, b: 1 } })).toBe(10 * 25 + 5 * 10);
  });
});
