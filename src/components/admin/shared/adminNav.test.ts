import { describe, it, expect } from "vitest";
import {
  ADMIN_NAV_GROUPS, ADMIN_NAV_ITEMS, ADMIN_TAB_KEYS, TAB_PREFETCH,
  adminMobilePrimaryKeys, adminNeighbours, findAdminNavItem, isAdminNavVisible,
  type AdminFeatureFlags,
} from "./adminNav";

const none: AdminFeatureFlags = { routePlanning: false, leads: false, livechat: false, accounting: false };
const all: AdminFeatureFlags = { routePlanning: true, leads: true, livechat: true, accounting: true };

describe("adminNav", () => {
  it("has exactly one nav item per tab key", () => {
    const keys = ADMIN_NAV_ITEMS.map((i) => i.value).sort();
    expect(keys).toEqual([...ADMIN_TAB_KEYS].sort());
  });

  it("has a prefetch function for every tab", () => {
    for (const key of ADMIN_TAB_KEYS) expect(typeof TAB_PREFETCH[key]).toBe("function");
  });

  it("puts every non-onboarding item in a known group", () => {
    const groups = new Set(ADMIN_NAV_GROUPS.map((g) => g.key));
    for (const item of ADMIN_NAV_ITEMS) {
      if (item.group === "onboarding") continue;
      expect(groups.has(item.group as any)).toBe(true);
    }
  });

  it("hides feature-gated items until the feature is on", () => {
    const hidden = (f: AdminFeatureFlags) =>
      ADMIN_NAV_ITEMS.filter((i) => !isAdminNavVisible(i, f)).map((i) => i.value).sort();
    expect(hidden(none)).toEqual(["accounting", "employees", "leads", "livechat", "routes"]);
    expect(hidden(all)).toEqual([]);
  });

  it("swaps Ruter/Services in the mobile bar depending on route planning", () => {
    expect(adminMobilePrimaryKeys(none)).toEqual(["dashboard", "orders", "services", "customers"]);
    expect(adminMobilePrimaryKeys(all)).toEqual(["dashboard", "orders", "routes", "customers"]);
  });

  it("only uses primary tabs that exist and are visible", () => {
    for (const f of [none, all]) {
      for (const key of adminMobilePrimaryKeys(f)) {
        const item = findAdminNavItem(key);
        expect(item).toBeDefined();
        if (!item) throw new Error(`Missing navigation item: ${key}`);
        expect(isAdminNavVisible(item, f)).toBe(true);
      }
    }
  });

  it("never lists the active tab as its own neighbour", () => {
    for (const key of ADMIN_TAB_KEYS) expect(adminNeighbours(key)).not.toContain(key);
  });
});
