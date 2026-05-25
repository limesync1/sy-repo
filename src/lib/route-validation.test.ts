import { describe, it, expect } from "vitest";
import {
  validateRouteMove, validateStopAssignment, validateMerge, validateDeleteRoute, distanceKm,
} from "./route-validation";

const today = new Date().toISOString().slice(0, 10);
const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

describe("validateRouteMove", () => {
  it("blokerer flytning til fortid", () => {
    const r = validateRouteMove({ id: "r1", route_date: today }, yesterday);
    expect(r.ok).toBe(false);
    expect(r.errors[0].code).toBe("ROUTE_DATE_IN_PAST");
  });
  it("blokerer samme dato", () => {
    const r = validateRouteMove({ id: "r1", route_date: tomorrow }, tomorrow);
    expect(r.errors[0].code).toBe("SHIFT_SAME_DATE");
  });
  it("blokerer serie-kollision og foreslår fletning", () => {
    const r = validateRouteMove({ id: "r1", route_date: today }, tomorrow,
      { seriesRoutesOnTargetDate: [{ id: "r2", route_date: tomorrow }] });
    expect(r.ok).toBe(false);
    expect(r.errors[0].code).toBe("SERIES_COLLISION_ON_DATE");
    expect(r.suggestions[0].action).toBe("open-merge");
  });
  it("warner om lukkedag uden at blokere", () => {
    const r = validateRouteMove({ id: "r1", route_date: today }, tomorrow,
      { holidayOnDate: { name: "Grundlovsdag" } });
    expect(r.ok).toBe(true);
    expect(r.warnings[0].code).toBe("HOLIDAY_BLOCKED_DATE");
  });
});

describe("validateStopAssignment", () => {
  it("blokerer projicerede target-ruter", () => {
    const r = validateStopAssignment({ order_id: "o1" }, { id: "v1", route_date: tomorrow, isVirtual: true });
    expect(r.errors[0].code).toBe("PROJECTED_ROUTE_LOCKED");
  });
  it("blokerer dobbelt-aftale samme dag", () => {
    const r = validateStopAssignment(
      { order_id: "o1", customer_name: "Anne" },
      { id: "r1", route_date: tomorrow },
      { otherStopsSameDay: [{ id: "s9", order_id: "o1" }] },
    );
    expect(r.errors[0].code).toBe("DUPLICATE_AGREEMENT_SAME_DAY");
  });
  it("warner om geografisk spring", () => {
    const r = validateStopAssignment(
      { latitude: 55.6, longitude: 12.5 },
      { id: "r1", route_date: tomorrow },
      { stopsOnTargetRoute: [{ id: "s1", latitude: 57.0, longitude: 9.9 }] },
    );
    expect(r.warnings.find((w) => w.code === "GEOGRAPHIC_GAP_TOO_LARGE")).toBeTruthy();
  });
});

describe("validateMerge", () => {
  it("blokerer projektion + projektion", () => {
    const r = validateMerge({ id: "a", route_date: today }, { id: "b", route_date: today },
      { sourceIsVirtual: true, targetIsVirtual: true });
    expect(r.errors[0].code).toBe("MERGE_PROJECTION_INTO_PROJECTION");
  });
});

describe("validateDeleteRoute", () => {
  it("blokerer sletning hvis ruten har fuldførte stop", () => {
    const r = validateDeleteRoute({ completedStopsCount: 3 });
    expect(r.errors[0].code).toBe("ROUTE_HAS_COMPLETED_STOPS");
  });
});

describe("distanceKm", () => {
  it("returnerer null hvis koordinater mangler", () => {
    expect(distanceKm(null, { lat: 55, lng: 12 })).toBeNull();
  });
  it("beregner ~600km mellem København og Aarhus", () => {
    const d = distanceKm({ lat: 55.68, lng: 12.57 }, { lat: 56.16, lng: 10.20 });
    expect(d).toBeGreaterThan(140);
    expect(d).toBeLessThan(200);
  });
});