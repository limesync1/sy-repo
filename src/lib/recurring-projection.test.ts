import { describe, it, expect } from "vitest";
import { expandRecurringRoutes, intervalToDays } from "./recurring-projection";

describe("intervalToDays", () => {
  it("maps known intervals", () => {
    expect(intervalToDays("ugentlig")).toBe(7);
    expect(intervalToDays("hver_14_dag")).toBe(14);
    expect(intervalToDays("hver_2_dag")).toBe(2);
    expect(intervalToDays("hver_3_uge")).toBe(21);
    expect(intervalToDays("hver_4_uge")).toBe(28);
    expect(intervalToDays("hver_8_uge")).toBe(56);
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

  it("projects every 14 days from the agreement seed date", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "hver_14_dag", seed_date: "2026-05-10", preferred_route_id: "r14" },
      ],
    });
    expect(out.map((p) => p.date)).toEqual(["2026-05-10", "2026-05-24"]);
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

describe("expandRecurringRoutes — robustness", () => {
  const range = { rangeStart: "2026-05-01", rangeEnd: "2026-05-31" };

  it("returns empty when sources list is empty", () => {
    expect(expandRecurringRoutes({ ...range, sources: [], realRouteDates: new Set() })).toEqual([]);
  });

  it("ignores sources without seed_date", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: null, preferred_route_id: "r1" }],
    });
    expect(out).toEqual([]);
  });

  it("ignores sources with unknown interval and no interval_days", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "engangskøb", seed_date: "2026-05-04", preferred_route_id: "r1" }],
    });
    expect(out).toEqual([]);
  });

  it("ignores sources with custom interval but missing/invalid interval_days", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "custom", interval_days: 0, seed_date: "2026-05-04", preferred_route_id: "r1" },
        { id: "a2", interval: "custom", interval_days: -3, seed_date: "2026-05-04", preferred_route_id: "r2" },
        { id: "a3", interval: "custom", interval_days: null, seed_date: "2026-05-04", preferred_route_id: "r3" },
      ],
    });
    expect(out).toEqual([]);
  });

  it("does not throw on malformed seed_date", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: "not-a-date", preferred_route_id: "r1" }],
    });
    expect(out).toEqual([]);
  });

  it("handles ISO timestamp seed_date (slices to date)", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04T08:30:00.000Z", preferred_route_id: "r1" },
      ],
    });
    expect(out[0].date).toBe("2026-05-04");
  });

  it("daily interval projects every day in range", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-05-07",
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "daglig", seed_date: "2026-05-01", preferred_route_id: "r1" }],
    });
    expect(out.map((p) => p.date)).toEqual([
      "2026-05-01","2026-05-02","2026-05-03","2026-05-04","2026-05-05","2026-05-06","2026-05-07",
    ]);
  });

  it("daily interval over a year stays within safety bound", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-01-01",
      rangeEnd: "2026-12-31",
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "daglig", seed_date: "2026-01-01", preferred_route_id: "r1" }],
    });
    expect(out.length).toBe(365);
  });

  it("seed in the future inside range projects from seed forward", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: "2026-05-15", preferred_route_id: "r1" }],
    });
    expect(out.map((p) => p.date)).toEqual(["2026-05-15", "2026-05-22", "2026-05-29"]);
  });

  it("seed beyond rangeEnd produces no projections", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: "2026-07-01", preferred_route_id: "r1" }],
    });
    expect(out).toEqual([]);
  });

  it("virtual ids follow the stable virtual:<routeId>:<date> shape", () => {
    const [p] = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" }],
    });
    expect(p.id).toBe("virtual:r1:2026-05-04");
    expect(p.baseRouteId).toBe("r1");
  });

  it("multiple routes are projected independently", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" },
        { id: "a2", interval: "hver_14_dag", seed_date: "2026-05-05", preferred_route_id: "r2" },
      ],
    });
    const r1 = out.filter((p) => p.baseRouteId === "r1").map((p) => p.date);
    const r2 = out.filter((p) => p.baseRouteId === "r2").map((p) => p.date);
    expect(r1).toEqual(["2026-05-04", "2026-05-11", "2026-05-18", "2026-05-25"]);
    expect(r2).toEqual(["2026-05-05", "2026-05-19"]);
  });

  it("realRouteDates does not block other dates of same route", () => {
    const out = expandRecurringRoutes({
      ...range,
      realRouteDates: new Set(["r1|2026-05-04", "r1|2026-05-25"]),
      sources: [{ id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r1" }],
    });
    expect(out.map((p) => p.date)).toEqual(["2026-05-11", "2026-05-18"]);
  });
});