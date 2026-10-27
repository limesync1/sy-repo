import { describe, expect, it } from "vitest";
import { format } from "date-fns";
import { monthGridRange } from "./month-grid";

const f = (d: Date) => format(d, "yyyy-MM-dd");
describe("month grid lookahead", () => {
  it("shows the first weeks of next month on 27 October", () => {
    const r = monthGridRange(new Date(2026, 9, 27), new Date(2026, 9, 27));
    expect(r.extended).toBe(true);
    expect(f(r.end)).toBe("2026-11-15");
  });
  it("keeps the normal month early in the month", () => {
    const r = monthGridRange(new Date(2026, 9, 5), new Date(2026, 9, 5));
    expect(r.extended).toBe(false);
    expect(f(r.end)).toBe("2026-11-01");
  });
  it("does not extend months other than the current one", () => {
    expect(monthGridRange(new Date(2026, 10, 1), new Date(2026, 9, 27)).extended).toBe(false);
  });
});
