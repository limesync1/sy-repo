import { describe, expect, it } from "vitest";
import { analyzeTrace } from "../DriveTraceDialog";

describe("analyzeTrace", () => {
  it("flags only deviations larger than 15 m and the GPS accuracy", () => {
    const base = { speed: 10, onRoute: true };
    const r = analyzeTrace([
      { ...base, t: 0, raw: [56.2, 9.0], acc: 5, shown: [56.2, 9.0] },
      { ...base, t: 1000, raw: [56.2002, 9.0], acc: 5, shown: [56.2, 9.0] }, // ~22 m
      { ...base, t: 2000, raw: [56.2002, 9.0], acc: 40, shown: [56.2, 9.0] }, // within accuracy
      { ...base, t: 3000, raw: [56.2, 9.0], acc: 5, shown: null },
    ]);
    expect(r.count).toBe(4);
    expect(r.deviations).toHaveLength(1);
    expect(Math.round(r.maxDist)).toBe(22);
  });
});
