import { describe, expect, it } from "vitest";
import { compareDayRoutes } from "./day-route-order";
describe("day route order", () => {
  it("puts fixed routes first", () => {
    const r = [{ name: "A", stops: [] }, { name: "Z", stops: [{ subscription_id: "s" }] }, { name: "B", isVirtual: true }];
    expect([...r].sort(compareDayRoutes).map(x => x.name)).toEqual(["B", "Z", "A"]);
  });
});
