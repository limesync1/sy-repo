import { describe, expect, it } from "vitest";
import { followZoom, lookAheadPx, smoothZoom, speedZoom } from "../google-nav-camera";
import { geolocationErrorDa, toDanishError } from "@/lib/danish-errors";

describe("speed-based follow camera", () => {
  it("zooms in in town and out on the motorway", () => {
    expect(speedZoom(10)).toBeCloseTo(17.5);
    expect(speedZoom(110 / 3.6)).toBeCloseTo(15.5);
  });
  it("never overrides a zoom the driver chose", () => {
    expect(followZoom(14, 100, 5, true)).toBe(14);
  });
  it("nudges in before a town turn only", () => {
    expect(followZoom(17, 100, 8, false)).toBeCloseTo(18);
    expect(followZoom(17, 100, 30, false)).toBeCloseTo(speedZoom(30));
  });
  it("smooths zoom without overshoot", () => {
    const z = smoothZoom(17.5, 15.5, 0.04);
    expect(z).toBeLessThan(17.5);
    expect(z).toBeGreaterThan(17.4);
  });
  it("looks further ahead at speed", () => {
    expect(lookAheadPx(3, 800)).toBe(0);
    expect(lookAheadPx(30, 800)).toBeGreaterThan(100);
  });
});

describe("driving errors in Danish", () => {
  it("explains GPS and map failures plainly", () => {
    expect(geolocationErrorDa(1)).toMatch(/slået placering fra/);
    expect(toDanishError(new Error("RefererNotAllowedMapError"))).toMatch(/reservekortet/);
    expect(toDanishError(new Error("Failed to fetch"))).toMatch(/internetforbindelse/);
  });
});
