import { describe, it, expect } from "vitest";
import { ProjectionCache, runProjectionCached, hashProjectionInput } from "./cache";
import type { ProjectionInput } from "./index";

const baseInput = (): ProjectionInput => ({
  sources: [{
    id: "src-1", interval: "ugentlig", seed_date: "2026-06-01",
    anchor_date: "2026-06-01", preferred_route_id: "route-A",
    sourceKeys: ["agr:agr-1"], agreement_id: "agr-1",
  }],
  rangeStart: "2026-06-01",
  rangeEnd: "2026-06-30",
  realRouteDates: new Set<string>(),
});

describe("ProjectionCache", () => {
  it("rammer cache ved identisk input", () => {
    const cache = new ProjectionCache(4);
    const input = baseInput();
    runProjectionCached(input, { businessId: "biz-1", cache });
    runProjectionCached(input, { businessId: "biz-1", cache });
    const stats = cache.getStats();
    expect(stats.hits).toBe(1);
    expect(stats.misses).toBe(1);
  });

  it("miss ved ændret input-hash", () => {
    const cache = new ProjectionCache(4);
    const a = baseInput();
    const b = { ...baseInput(), holidayDates: ["2026-06-08"] };
    runProjectionCached(a, { businessId: "biz-1", cache });
    runProjectionCached(b, { businessId: "biz-1", cache });
    expect(cache.getStats().misses).toBe(2);
  });

  it("evicter LRU når capacity rammes", () => {
    const cache = new ProjectionCache(2);
    runProjectionCached({ ...baseInput(), rangeEnd: "2026-06-10" }, { businessId: "b", cache });
    runProjectionCached({ ...baseInput(), rangeEnd: "2026-06-20" }, { businessId: "b", cache });
    runProjectionCached({ ...baseInput(), rangeEnd: "2026-06-30" }, { businessId: "b", cache });
    expect(cache.size).toBe(2);
    expect(cache.getStats().evictions).toBe(1);
  });

  it("invalidate(businessId) fjerner kun den businessens entries", () => {
    const cache = new ProjectionCache(8);
    runProjectionCached(baseInput(), { businessId: "biz-a", cache });
    runProjectionCached(baseInput(), { businessId: "biz-b", cache });
    cache.invalidate({ businessId: "biz-a" });
    expect(cache.size).toBe(1);
  });

  it("hashProjectionInput er stabil på tværs af nøgle-rækkefølge", () => {
    const a: ProjectionInput = {
      ...baseInput(),
      overrides: [{ agreement_id: "x", original_date: "2026-06-01", status: "cancelled" }],
    };
    const b: ProjectionInput = {
      sources: a.sources, realRouteDates: a.realRouteDates,
      rangeEnd: a.rangeEnd, rangeStart: a.rangeStart,
      overrides: [{ status: "cancelled", original_date: "2026-06-01", agreement_id: "x" }],
    } as ProjectionInput;
    expect(hashProjectionInput(a)).toBe(hashProjectionInput(b));
  });
});