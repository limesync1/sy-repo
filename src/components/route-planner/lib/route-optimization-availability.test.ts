import { describe, expect, it } from "vitest";
import { hasRouteOptimization } from "./route-optimization-availability";

const route = { stops: [{ status: "planned" }, { status: "planned" }] };
describe("direct route optimization availability", () => {
  it("offers optimization with two stops, but not one", () => {
    expect(hasRouteOptimization(route)).toBe(true);
    expect(hasRouteOptimization({ stops: route.stops.slice(0, 1) })).toBe(false);
  });
  it("does not offer optimization on projected routes", () => {
    expect(hasRouteOptimization({ ...route, isVirtual: true })).toBe(false);
  });
  it("does not offer optimization on past or archived routes", () => {
    expect(hasRouteOptimization(route, true)).toBe(false);
    expect(hasRouteOptimization({ ...route, archived_at: "2026-11-06" })).toBe(false);
  });
  it("does not offer optimization on completed routes", () => {
    expect(hasRouteOptimization({ ...route, status: "completed" })).toBe(false);
    expect(hasRouteOptimization({ stops: [{ status: "completed" }, { status: "completed" }] })).toBe(false);
  });
  it("still offers optimization when only part of the route is completed", () => {
    expect(hasRouteOptimization({ stops: [{ status: "completed" }, { status: "planned" }] })).toBe(true);
  });
});