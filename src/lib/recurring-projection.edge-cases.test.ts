import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import { expandRecurringRoutes } from "./recurring-projection";

beforeAll(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2025-12-31T08:00:00Z"));
});
afterAll(() => {
  vi.useRealTimers();
});

const dates = (out: Array<{ date: string }>) => out.map((p) => p.date);

describe("Case 1 — Weekly recurrence (basic)", () => {
  it("ugentlig spreads on exact 7-day intervals, no duplicates", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-05-31",
      realRouteDates: new Set(),
      sources: [
        { id: "a", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r" },
      ],
    });
    expect(dates(out)).toEqual([
      "2026-05-04", "2026-05-11", "2026-05-18", "2026-05-25",
    ]);
    expect(new Set(dates(out)).size).toBe(out.length);
  });
});

describe("Case 2 — Every 2 weeks", () => {
  it("hver_14_dag = 14 days between projections, never weekly", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-06-30",
      realRouteDates: new Set(),
      sources: [
        { id: "a", interval: "hver_14_dag", seed_date: "2026-05-04", preferred_route_id: "r" },
      ],
    });
    expect(dates(out)).toEqual([
      "2026-05-04", "2026-05-18", "2026-06-01", "2026-06-15", "2026-06-29",
    ]);
  });
});

describe("Case 3 — Monthly end-of-month (Jan 31 → Feb)", () => {
  it("31 jan → 28/29 feb without crashing and without invalid dates", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-01-01",
      rangeEnd: "2026-12-31",
      realRouteDates: new Set(),
      sources: [
        { id: "a", interval: "månedlig", seed_date: "2026-01-31", preferred_route_id: "r" },
      ],
    });
    expect(out.length).toBeGreaterThanOrEqual(10);
    expect(out[0].date).toBe("2026-01-31");
    // date-fns clamps Feb to last valid day → 28 feb 2026
    expect(out[1].date).toBe("2026-02-28");
    expect(out[2].date).toBe("2026-03-31");
    // All dates must be valid (no NaN, no 2026-02-30 etc.)
    for (const p of out) {
      expect(/^\d{4}-\d{2}-\d{2}$/.test(p.date)).toBe(true);
      const [, m, d] = p.date.split("-").map(Number);
      const maxDay = new Date(2026, m, 0).getDate();
      expect(d).toBeLessThanOrEqual(maxDay);
    }
  });
});

describe("Case 4 — Leap year (Feb 29)", () => {
  it("29 feb 2024 → projects to 28 feb on non-leap years", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2024-01-01",
      rangeEnd: "2027-12-31",
      realRouteDates: new Set(),
      sources: [
        { id: "a", interval: "årlig", seed_date: "2024-02-29", preferred_route_id: "r" },
      ],
    });
    // 2024 leap, 2025/2026/2027 not
    expect(out[0].date).toBe("2024-02-29");
    expect(out[1].date).toBe("2025-02-28");
    expect(out[2].date).toBe("2026-02-28");
    expect(out[3].date).toBe("2027-02-28");
  });

  it("monthly from 2024-02-29 produces no invalid dates", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2024-02-01",
      rangeEnd: "2024-12-31",
      realRouteDates: new Set(),
      sources: [
        { id: "a", interval: "månedlig", seed_date: "2024-02-29", preferred_route_id: "r" },
      ],
    });
    for (const p of out) {
      const ts = new Date(p.date).getTime();
      expect(Number.isFinite(ts)).toBe(true);
    }
  });
});

describe("Case 5 — DST boundary (EU sommertid 30 marts 2025 / vintertid 26 okt 2025)", () => {
  it("weekly across spring DST stays on the same weekday", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2025-03-15",
      rangeEnd: "2025-04-15",
      realRouteDates: new Set(),
      sources: [
        { id: "a", interval: "ugentlig", seed_date: "2025-03-16", preferred_route_id: "r" },
      ],
    });
    // Every projection should be a Sunday (matching the seed weekday)
    for (const p of out) {
      const dow = new Date(p.date + "T12:00:00Z").getUTCDay();
      expect(dow).toBe(0);
    }
    expect(dates(out)).toContain("2025-03-30"); // exact DST start day
  });

  it("weekly across autumn DST keeps spacing", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2025-10-12",
      rangeEnd: "2025-11-09",
      realRouteDates: new Set(),
      sources: [
        { id: "a", interval: "ugentlig", seed_date: "2025-10-12", preferred_route_id: "r" },
      ],
    });
    expect(dates(out)).toEqual([
      "2025-10-12", "2025-10-19", "2025-10-26", "2025-11-02", "2025-11-09",
    ]);
  });
});

describe("Case 6/7/8 — No duplicates regardless of overlapping sources", () => {
  it("two agreements on same route same day collapse to one projection", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-05-31",
      realRouteDates: new Set(),
      sources: [
        { id: "a1", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r" },
        { id: "a2", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r" },
      ],
    });
    expect(dates(out)).toEqual(["2026-05-04", "2026-05-11", "2026-05-18", "2026-05-25"]);
  });

  it("real route on a date suppresses the projection for that date", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-05-31",
      realRouteDates: new Set(["2026-05-11"]),
      sources: [
        { id: "a", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r" },
      ],
    });
    expect(dates(out)).not.toContain("2026-05-11");
  });
});

describe("Case 17 — Pause windows skip recurrence", () => {
  it("paused range hides projections in that window", () => {
    const out = expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-05-31",
      realRouteDates: new Set(),
      sources: [
        {
          id: "a", interval: "ugentlig", seed_date: "2026-05-04", preferred_route_id: "r",
          pauses: [{ start: "2026-05-10", end: "2026-05-20" }],
        } as any,
      ],
    });
    // 2026-05-11 and 2026-05-18 fall in pause window
    expect(dates(out)).not.toContain("2026-05-11");
    expect(dates(out)).not.toContain("2026-05-18");
    expect(dates(out)).toContain("2026-05-04");
    expect(dates(out)).toContain("2026-05-25");
  });
});

describe("Edge — invalid input never throws", () => {
  it("missing preferred_route_id is reported, not thrown", () => {
    const unprojectable = vi.fn();
    expect(() =>
      expandRecurringRoutes({
        rangeStart: "2026-05-01",
        rangeEnd: "2026-05-31",
        realRouteDates: new Set(),
        sources: [{ id: "a", interval: "ugentlig", seed_date: "2026-05-04" } as any],
        onUnprojectable: unprojectable,
      }),
    ).not.toThrow();
    expect(unprojectable).toHaveBeenCalledWith(expect.anything(), "missing_route");
  });

  it("missing seed/anchor is reported", () => {
    const unprojectable = vi.fn();
    expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-05-31",
      realRouteDates: new Set(),
      sources: [{ id: "a", interval: "ugentlig", preferred_route_id: "r" } as any],
      onUnprojectable: unprojectable,
    });
    expect(unprojectable).toHaveBeenCalledWith(expect.anything(), "missing_seed");
  });

  it("invalid interval is reported", () => {
    const unprojectable = vi.fn();
    expandRecurringRoutes({
      rangeStart: "2026-05-01",
      rangeEnd: "2026-05-31",
      realRouteDates: new Set(),
      sources: [{ id: "a", interval: "engangskøb", seed_date: "2026-05-04", preferred_route_id: "r" } as any],
      onUnprojectable: unprojectable,
    });
    expect(unprojectable).toHaveBeenCalledWith(expect.anything(), "invalid_interval");
  });

  it("garbage seed string does not throw", () => {
    expect(() =>
      expandRecurringRoutes({
        rangeStart: "2026-05-01",
        rangeEnd: "2026-05-31",
        realRouteDates: new Set(),
        sources: [{ id: "a", interval: "ugentlig", seed_date: "not-a-date", preferred_route_id: "r" } as any],
      }),
    ).not.toThrow();
  });
});

describe("Case 22 — Large range performance", () => {
  it("projects 365 daily recurrences in under 50ms", () => {
    const t0 = performance.now();
    const out = expandRecurringRoutes({
      rangeStart: "2026-01-01",
      rangeEnd: "2026-12-31",
      realRouteDates: new Set(),
      sources: [
        { id: "a", interval: "daglig", seed_date: "2026-01-01", preferred_route_id: "r" },
      ],
    });
    const dt = performance.now() - t0;
    expect(out.length).toBeGreaterThanOrEqual(365);
    expect(dt).toBeLessThan(50);
  });

  it("100 weekly sources for a year stays under 200ms", () => {
    const sources = Array.from({ length: 100 }, (_, i) => ({
      id: `a${i}`, interval: "ugentlig", seed_date: "2026-01-05", preferred_route_id: `r${i}`,
    }));
    const t0 = performance.now();
    const out = expandRecurringRoutes({
      rangeStart: "2026-01-01",
      rangeEnd: "2026-12-31",
      realRouteDates: new Set(),
      sources,
    });
    const dt = performance.now() - t0;
    expect(out.length).toBeGreaterThan(100 * 50);
    expect(dt).toBeLessThan(200);
  });
});
