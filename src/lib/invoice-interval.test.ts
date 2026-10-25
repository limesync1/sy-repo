import { describe, it, expect } from "vitest";
import { invoicePeriodEnd, describeInvoiceInterval } from "./invoice-interval";

describe("fakturainterval", () => {
  it("månedligt slutter ved månedens udgang", () => {
    expect(invoicePeriodEnd("2026-02-10", { interval: "monthly", count: null, unit: null })).toBe("2026-02-28");
  });
  it("kvartalsvis slutter ved kvartalets udgang", () => {
    expect(invoicePeriodEnd("2026-11-03", { interval: "quarterly", count: null, unit: null })).toBe("2026-12-31");
  });
  it("hver 14. dag dækker 14 dage inkl. startdagen", () => {
    expect(invoicePeriodEnd("2026-10-25", { interval: "every_14_days", count: null, unit: null })).toBe("2026-11-07");
  });
  it("brugerdefineret hver 3. uge", () => {
    expect(invoicePeriodEnd("2026-10-01", { interval: "custom", count: 3, unit: "week" })).toBe("2026-10-21");
    expect(describeInvoiceInterval({ interval: "custom", count: 3, unit: "week" })).toBe("Hver 3. uge");
  });
});
