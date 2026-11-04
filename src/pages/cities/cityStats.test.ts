import { describe, expect, it } from "vitest";
import { CITY_STATS, CITY_STATS_SOURCE, cityStatInsights } from "./cityStats";
import { findCityFact } from "./cityFacts";

const FIRST_TEN = ["koebenhavn", "frederiksberg", "aarhus", "odense", "aalborg", "esbjerg", "randers", "kolding", "vejle", "horsens"];

describe("city stats", () => {
  it("covers the first ten cities with real numbers and a source", () => {
    for (const slug of FIRST_TEN) {
      const s = CITY_STATS.find((x) => x.slug === slug);
      expect(s, slug).toBeDefined();
      expect(s!.population).toBeGreaterThan(50000);
      expect(findCityFact(slug), slug).toBeDefined();
    }
    expect(CITY_STATS_SOURCE.url).toMatch(/statistikbanken/);
  });
  it("housing shares add up to about 100 %", () => {
    for (const s of CITY_STATS) expect(Math.abs(s.house + s.row + s.flat - 100)).toBeLessThanOrEqual(2);
  });
  it("insights quote the actual share", () => {
    const kbh = CITY_STATS.find((s) => s.slug === "koebenhavn")!;
    expect(cityStatInsights(kbh)[0]).toContain("92 %");
  });
});
