import { describe, it, expect } from "vitest";
import { invoicePeriodEnd, describeInvoiceInterval, invoiceIntervalOrderFields } from "./invoice-interval";

describe("fakturainterval", () => {
  it("opret bestilling bevarer kundens/virksomhedens standard som arv", () => {
    expect(invoiceIntervalOrderFields({ interval: null, count: null, unit: null }, true)).toEqual({ invoice_interval: null, invoice_interval_count: null, invoice_interval_unit: null });
  });
  it("opret bestilling gemmer et månedligt valg", () => {
    expect(invoiceIntervalOrderFields({ interval: "monthly", count: null, unit: null }, true).invoice_interval).toBe("monthly");
  });
  it("opret bestilling gemmer brugerdefineret hver tredje uge", () => {
    expect(invoiceIntervalOrderFields({ interval: "custom", count: 3, unit: "week" }, true)).toEqual({ invoice_interval: "custom", invoice_interval_count: 3, invoice_interval_unit: "week" });
  });
  it("uden regnskabsforbindelse gemmes intet intervalvalg", () => {
    expect(invoiceIntervalOrderFields({ interval: "quarterly", count: null, unit: null }, false).invoice_interval).toBeNull();
  });
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
