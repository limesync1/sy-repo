import { describe, it, expect } from "vitest";
import { buildLineDescription } from "../../supabase/functions/_shared/accounting/line-text.ts";
import { danishIntervalLabel } from "../../supabase/functions/_shared/interval-da.ts";
import { withVat, formatServicePrice } from "../../supabase/functions/_shared/transactional-email-templates/_service-price.ts";

describe("app email and invoice formatting", () => {
  it("adds 25% VAT for the med moms line", () => {
    expect(withVat(100)).toBe(125);
  });

  it("shows uden moms before med moms", () => {
    const s = formatServicePrice(100);
    expect(s.indexOf("uden moms")).toBeLessThan(s.indexOf("med moms"));
  });

  it("translates raw interval keys to Danish", () => {
    expect(danishIntervalLabel("hver_14_dag")).toBe("Hver 2. uge");
    expect(danishIntervalLabel("every_4_week")).toBe("Hver 4. uge");
    expect(danishIntervalLabel("weekly")).toBe("Ugentligt");
    expect(danishIntervalLabel("every_5_minutes_test")).toBe("Hvert 5. minut (test)");
  });

  it("builds invoice line with interval, start and completion date", () => {
    expect(
      buildLineDescription({
        serviceName: "Udvendig vinduespudsning",
        interval: "every_4_week",
        startDate: "2026-10-01",
        completedDate: "2026-10-24T09:00:00Z",
      }),
    ).toBe("Udvendig vinduespudsning — Hver 4. uge · Opstart 01.10.2026 · Udført 24.10.2026");
  });
});
