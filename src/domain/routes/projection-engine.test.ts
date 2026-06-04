import { describe, it, expect } from "vitest";
import { ProjectionEngine } from "./projection-engine";

const baseSource = () => ({
  id: "src-1",
  interval: "ugentlig",
  seed_date: "2026-06-01",
  anchor_date: "2026-06-01",
  preferred_route_id: "route-A",
  sourceKeys: ["agr:agr-1"],
  agreement_id: "agr-1",
});

describe("ProjectionEngine (fluent builder)", () => {
  it("matcher runProjection for et minimal-flow", () => {
    const dates = ProjectionEngine.from([baseSource()])
      .inRange("2026-06-01", "2026-06-30")
      .withRealRoutes(new Set<string>())
      .build()
      .projections.map((p) => p.date);
    expect(dates).toEqual([
      "2026-06-01",
      "2026-06-08",
      "2026-06-15",
      "2026-06-22",
      "2026-06-29",
    ]);
  });

  it("applyHolidays skjuler forekomster", () => {
    const dates = ProjectionEngine.from([baseSource()])
      .inRange("2026-06-01", "2026-06-30")
      .withRealRoutes(new Set<string>())
      .applyHolidays(["2026-06-08"])
      .build()
      .projections.map((p) => p.date);
    expect(dates).not.toContain("2026-06-08");
  });

  it("applyOverrides respekterer aflysninger", () => {
    const dates = ProjectionEngine.from([baseSource()])
      .inRange("2026-06-01", "2026-06-30")
      .withRealRoutes(new Set<string>())
      .applyOverrides([
        { agreement_id: "agr-1", original_date: "2026-06-15", status: "cancelled" },
      ])
      .build()
      .projections.map((p) => p.date);
    expect(dates).not.toContain("2026-06-15");
  });

  it("build() uden inRange kaster", () => {
    expect(() => ProjectionEngine.from([baseSource()]).build()).toThrow();
  });

  it("er immutable — hver metode returnerer ny instans", () => {
    const a = ProjectionEngine.from([baseSource()]).inRange("2026-06-01", "2026-06-30");
    const b = a.applyHolidays(["2026-06-08"]);
    expect(a).not.toBe(b);
    expect(a.build().projections.map((p) => p.date)).toContain("2026-06-08");
    expect(b.build().projections.map((p) => p.date)).not.toContain("2026-06-08");
  });
});