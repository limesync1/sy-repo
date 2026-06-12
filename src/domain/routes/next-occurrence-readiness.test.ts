// Unit-tests for `computeNextReadyDate` — den rene TS-pendant til
// `materialize_next_occurrence_for_base_route` (SQL). Holder klient- og
// server-logik i takt: kun ÉN fremtidig forekomst pr. basisrute må være
// "klar" ad gangen.
import { describe, it, expect } from "vitest";
import { computeNextReadyDate } from "@/lib/route-readiness";

const TODAY = "2026-06-12";

describe("computeNextReadyDate", () => {
  it("returnerer null hvis seneste forekomst stadig har åbne stops", () => {
    expect(
      computeNextReadyDate({
        latestOccurrence: { routeDate: "2026-06-15", fullyDone: false },
        nextProjectedDate: "2026-06-22",
        today: TODAY,
      }),
    ).toBeNull();
  });

  it("returnerer nextProjectedDate hvis seneste forekomst er fuldt udført", () => {
    expect(
      computeNextReadyDate({
        latestOccurrence: { routeDate: "2026-06-08", fullyDone: true },
        nextProjectedDate: "2026-06-22",
        today: TODAY,
      }),
    ).toBe("2026-06-22");
  });

  it("returnerer nextProjectedDate hvis ingen seneste forekomst findes", () => {
    expect(
      computeNextReadyDate({
        latestOccurrence: null,
        nextProjectedDate: "2026-06-22",
        today: TODAY,
      }),
    ).toBe("2026-06-22");
  });

  it("returnerer null hvis nextProjectedDate ligger før today", () => {
    expect(
      computeNextReadyDate({
        latestOccurrence: { routeDate: "2026-05-30", fullyDone: true },
        nextProjectedDate: "2026-06-01",
        today: TODAY,
      }),
    ).toBeNull();
  });

  it("returnerer null hvis nextProjectedDate ikke er strengt efter seneste forekomst", () => {
    expect(
      computeNextReadyDate({
        latestOccurrence: { routeDate: "2026-06-22", fullyDone: true },
        nextProjectedDate: "2026-06-22",
        today: TODAY,
      }),
    ).toBeNull();
  });

  it("returnerer null når ingen fremtidig forekomst er projiceret", () => {
    expect(
      computeNextReadyDate({
        latestOccurrence: { routeDate: "2026-06-08", fullyDone: true },
        nextProjectedDate: null,
        today: TODAY,
      }),
    ).toBeNull();
  });
});