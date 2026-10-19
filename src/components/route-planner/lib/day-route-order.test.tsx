import { describe, expect, it } from "vitest";
import { compareDayRoutes, isFixedRoute } from "./day-route-order";
describe("day route order", () => {
  it("puts fixed routes first, then expected, then others", () => {
    const r = [{ name: "A", stops: [] }, { name: "Z", stops: [{ subscription_id: "s" }] }, { name: "B", isVirtual: true }];
    expect([...r].sort(compareDayRoutes).map(x => x.name)).toEqual(["Z", "B", "A"]);
  });
  it("treats an occurrence of a fixed route as fixed", () => {
    expect(isFixedRoute({ base_route_id: "base", stops: [] })).toBe(true);
  });
  it("never labels an expected route as fixed", () => {
    expect(isFixedRoute({ isVirtual: true, stops: [{ subscription_id: "s" }] })).toBe(false);
  });
});
