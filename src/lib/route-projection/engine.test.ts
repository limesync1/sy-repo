import { describe, it, expect } from "vitest";
import { runProjection, type ProjectionInput } from "./index";

const baseInput = (): ProjectionInput => ({
  sources: [
    {
      id: "src-1",
      interval: "ugentlig",
      seed_date: "2026-06-01",
      anchor_date: "2026-06-01",
      preferred_route_id: "route-A",
      sourceKeys: ["agr:agr-1"],
      agreement_id: "agr-1",
    },
  ],
  rangeStart: "2026-06-01",
  rangeEnd: "2026-06-30",
  realRouteDates: new Set<string>(),
});

describe("route-projection engine", () => {
  it("projicerer alle ugentlige forekomster i vinduet", () => {
    const { projections } = runProjection(baseInput());
    expect(projections.map((p) => p.date)).toEqual([
      "2026-06-01", "2026-06-08", "2026-06-15", "2026-06-22", "2026-06-29",
    ]);
  });

  it("aflyste overrides skjules", () => {
    const input = baseInput();
    input.overrides = [
      { agreement_id: "agr-1", original_date: "2026-06-15", status: "cancelled" },
    ];
    const { projections } = runProjection(input);
    expect(projections.map((p) => p.date)).not.toContain("2026-06-15");
  });

  it("rescheduled override flytter forekomsten til ny dato", () => {
    const input = baseInput();
    input.overrides = [
      { agreement_id: "agr-1", original_date: "2026-06-15", new_date: "2026-06-17", status: "rescheduled" },
    ];
    const dates = runProjection(input).projections.map((p) => p.date);
    expect(dates).toContain("2026-06-17");
    expect(dates).not.toContain("2026-06-15");
  });

  it("pause-periode skjuler forekomster i intervallet", () => {
    const input = baseInput();
    input.pauses = [{ agreement_id: "agr-1", start_date: "2026-06-07", end_date: "2026-06-20" }];
    const dates = runProjection(input).projections.map((p) => p.date);
    expect(dates).toEqual(["2026-06-01", "2026-06-22", "2026-06-29"]);
  });

  it("helligdage skjuler forekomster", () => {
    const input = baseInput();
    input.holidayDates = ["2026-06-08"];
    expect(runProjection(input).projections.map((p) => p.date)).not.toContain("2026-06-08");
  });

  it("dedupe mod rigtigt stop på samme dato/aftale fjerner projektionen", () => {
    const input = baseInput();
    input.realRouteDateById = new Map([["route-real-1", "2026-06-15"]]);
    input.realStops = [{ route_id: "route-real-1", agreement_id: "agr-1" }];
    const dates = runProjection(input).projections.map((p) => p.date);
    expect(dates).not.toContain("2026-06-15");
  });

  it("exception 'shifted' flytter forekomst og rapporterer shift-mapping", () => {
    const input = baseInput();
    input.exceptions = [
      {
        base_route_id: "route-A",
        occurrence_date: "2026-06-22",
        exception_type: "shifted",
        shifted_to_date: "2026-06-19",
      },
    ];
    const { projections, shiftsByOriginal } = runProjection(input);
    const dates = projections.map((p) => p.date);
    expect(dates).toContain("2026-06-19");
    expect(dates).not.toContain("2026-06-22");
    expect(shiftsByOriginal.get("route-A|2026-06-22")).toBe("2026-06-19");
  });
});