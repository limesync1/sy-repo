import { describe, expect, it } from "vitest";
import { adminFlagsFor, isListingOnly } from "./business-capabilities";

describe("business capabilities", () => {
  it("Kun profil har ingen ruter, aftaler eller regnskab, selv hvis indstillingerne siger andet", () => {
    const f = adminFlagsFor({ settings: { plan_kind: "listing", route_planning_enabled: true, accounting_integration_enabled: true } });
    expect(f.operations).toBe(false);
    expect(f.routePlanning).toBe(false);
    expect(f.accounting).toBe(false);
  });
  it("eksisterende virksomheder uden plantype er fuldt system", () => {
    const b = { settings: { route_planning_enabled: true } };
    expect(isListingOnly(b)).toBe(false);
    expect(adminFlagsFor(b).routePlanning).toBe(true);
  });
});
