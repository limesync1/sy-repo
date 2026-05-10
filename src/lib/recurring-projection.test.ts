import { describe, it, expect } from "vitest";
import { expandRecurringRoutes, intervalToDays } from "./recurring-projection";

describe("intervalToDays", () => {
  it("maps known intervals", () => {
    expect(intervalToDays("ugentlig")).toBe(7);
    expect(intervalToDays("hver_14_dag")).toBe(14);
    expect(intervalToDays("månedlig")).toBe(30);
  });
  it("returns null for unknown/empty", () => {
    expect(intervalToDays(null)).toBeNull();
    expect(intervalToDays("custom")).toBeNull();
    expect(intervalToDays("foo")).toBeNull();
  });
});

describe("expandRecurringRoutes", () => {
  const range = { rangeStart: "2026-05-01", rangeEnd: "2026-05-31" };

  it("projects weekly recurring routes inside the visible range", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" },
      ],
    });
    expect(out.map((p) => p.date)).toEqual([
      "2026-05-04", "2026-05-11", "2026-05-18", "2026-05-25",
    ]);
    expect(out.every((p) => p.baseRouteId === "r1")).toBe(true);
  });

  it("fast-forwards seeds far in the past so projections always show", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2024-01-01", preferred_route_id: "r1" },
      ],
    });
    expect(out.length).toBeGreaterThan(0);
    expect(out[0].date >= range.rangeStart).toBe(true);
  });

  it("skips dates that already have a real route", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(["r1|2026-05-11"]),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" },
      ],
    });
    expect(out.find((p) => p.date === "2026-05-11")).toBeUndefined();
    expect(out.find((p) => p.date === "2026-05-04")).toBeDefined();
  });

  it("ignores sources without preferred_route_id (handled by occurrence fallback) without throwing", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: null },
        { id: "a2", interval: "ugentlig", seed_date: "2026-05-05", preferred_route_id: "r2" },
      ],
    });
    // Sources without preferred_route_id are intentionally skipped here — the
    // RoutePlanner renders ghost cards from `agreement_occurrences` instead.
    expect(out.every((p) => p.baseRouteId === "r2")).toBe(true);
    expect(out.length).toBeGreaterThan(0);
  });

  it("supports custom intervals via interval_days", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "custom", interval_days: 10, seed_date: "2026-05-02", preferred_route_id: "r3" },
      ],
    });
    expect(out.map((p) => p.date)).toEqual(["2026-05-02", "2026-05-12", "2026-05-22"]);
  });

  it("deduplicates when multiple agreements share route + date", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" },
        { id: "a2", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" },
      ],
    });
    const may4 = out.filter((p) => p.date === "2026-05-04");
    expect(may4.length).toBe(1);
  });
});