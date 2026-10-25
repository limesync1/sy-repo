import { describe, expect, it } from "vitest";
import { TEST_INTERVAL_MINUTES, parseInterval, validateServiceIntervals } from "./interval";
import { expandRecurringRoutes } from "./recurring-projection";

describe("30 minute testing interval", () => {
  it("accepts a five-minute test cadence and projects five-minute slots", () => {
    expect(TEST_INTERVAL_MINUTES.every_5_minutes_test).toBe(5);
    expect(validateServiceIntervals(["every_5_minutes_test", "daglig"]).ok).toBe(true);
    const routes = expandRecurringRoutes({
      sources: [{ id: "test", interval: "every_5_minutes_test", seed_date: "2026-10-25", preferred_route_id: "route" }],
      rangeStart: "2026-10-25", rangeEnd: "2026-10-25", realRouteDates: new Set(),
      now: new Date(2026, 9, 25, 23, 41),
    });
    expect(routes.map(route => route.hour)).toEqual(["23:46"]);
    expect(new Set(routes.map(route => route.id)).size).toBe(1);
  });

  it("accepts a removable 30 minute test cadence without changing the daily cadence", () => {
    expect(TEST_INTERVAL_MINUTES.every_30_minutes_test).toBe(30);
    expect(validateServiceIntervals(["every_30_minutes_test", "daglig"]).ok).toBe(true);
    expect(parseInterval("daglig")?.n).toBe(1);
  });

  it("projects upcoming half-hour slots, not hourly or daily slots", () => {
    const routes = expandRecurringRoutes({
      sources: [{ id: "test", interval: "every_30_minutes_test", seed_date: "2026-10-25", preferred_route_id: "route" }],
      rangeStart: "2026-10-25", rangeEnd: "2026-10-25", realRouteDates: new Set(),
      now: new Date(2026, 9, 25, 22, 10),
    });
    expect(routes.map(route => route.hour)).toEqual(["22:40"]);
    expect(new Set(routes.map(route => route.id)).size).toBe(1);
  });
});