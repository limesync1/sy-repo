import { describe, it, expect } from "vitest";
import { computeNextReadyDate } from "./route-readiness";

const TODAY = "2026-06-10";

describe("computeNextReadyDate", () => {
  it("returns null when latest occurrence still has open stops", () => {
    expect(
      computeNextReadyDate({
        latestOccurrence: { routeDate: "2026-06-12", fullyDone: false },
        nextProjectedDate: "2026-06-19",
        today: TODAY,
      })
    ).toBeNull();
  });

  it("returns next projected date when latest is fully done", () => {
    expect(
      computeNextReadyDate({
        latestOccurrence: { routeDate: "2026-06-10", fullyDone: true },
        nextProjectedDate: "2026-06-17",
        today: TODAY,
      })
    ).toBe("2026-06-17");
  });

  it("returns next projected date when no latest occurrence exists", () => {
    expect(
      computeNextReadyDate({
        latestOccurrence: null,
        nextProjectedDate: "2026-06-11",
        today: TODAY,
      })
    ).toBe("2026-06-11");
  });

  it("returns null when nextProjectedDate is in the past", () => {
    expect(
      computeNextReadyDate({
        latestOccurrence: null,
        nextProjectedDate: "2026-06-01",
        today: TODAY,
      })
    ).toBeNull();
  });

  it("returns null when next projected date is not strictly after latest", () => {
    expect(
      computeNextReadyDate({
        latestOccurrence: { routeDate: "2026-06-17", fullyDone: true },
        nextProjectedDate: "2026-06-17",
        today: TODAY,
      })
    ).toBeNull();
  });

  it("returns null when no projected date is available", () => {
    expect(
      computeNextReadyDate({
        latestOccurrence: { routeDate: "2026-06-10", fullyDone: true },
        nextProjectedDate: null,
        today: TODAY,
      })
    ).toBeNull();
  });
});