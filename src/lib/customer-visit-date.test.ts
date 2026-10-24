import { describe, expect, it } from "vitest";
import { formatCustomerVisitDate, formatEmployeeRouteDate } from "../../supabase/functions/_shared/customer-visit-date";

const dkDay = (offsetDays: number) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Copenhagen",
    year: "numeric", month: "2-digit", day: "2-digit",
  }).format(new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000));

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
  it("says 'i dag' and 'i morgen' for the Danish calendar day", () => {
    expect(formatCustomerVisitDate(dkDay(0))).toBe("i dag");
    expect(formatCustomerVisitDate(dkDay(1))).toBe("i morgen");
    expect(formatCustomerVisitDate(dkDay(7))).not.toBe("i dag");
  });
  it("keeps the full date in parentheses for employees", () => {
    expect(formatEmployeeRouteDate(dkDay(0))).toMatch(/^i dag \(.+\d{4}\)$/);
    expect(formatEmployeeRouteDate(null)).toBe("uden dato");
    expect(formatEmployeeRouteDate(dkDay(7))).not.toContain("(");
  });
});