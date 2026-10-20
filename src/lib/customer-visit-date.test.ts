import { describe, expect, it } from "vitest";
import { formatCustomerVisitDate } from "../../supabase/functions/_shared/customer-visit-date";

describe("customer visit dates never imply a clock time", () => {
  it("renders the reported October 20 visit as a date only", () => {
    expect(formatCustomerVisitDate("2026-10-20")).toBe("tirsdag 20. oktober");
  });
  it("preserves the calendar date in winter without a daylight-saving offset", () => {
    expect(formatCustomerVisitDate("2026-12-01")).toBe("tirsdag 1. december");
  });
  it("does not invent a visit date or time when absent", () => {
    expect(formatCustomerVisitDate(null)).toBe("snarest");
  });
  it("does not accept timestamps or invalid calendar dates as agreed dates", () => {
    expect(formatCustomerVisitDate("2026-10-20T08:00:00Z")).toBe("snarest");
    expect(formatCustomerVisitDate("2026-02-30")).toBe("snarest");
  });
});