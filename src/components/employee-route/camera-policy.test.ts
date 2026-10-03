import { describe, expect, it } from "vitest";
import { navigationZoom } from "./camera-policy";

describe("navigation zoom", () => {
  it("holds zoom during small speed fluctuations", () => {
    expect([5, 6, 7, 6, 5].map(speed => navigationZoom(speed, 17))).toEqual([17, 17, 17, 17, 17]);
  });
  it("requires a meaningful speed change to reverse zoom", () => {
    expect(navigationZoom(9, 18)).toBe(17);
    expect(navigationZoom(7, 17)).toBe(17);
    expect(navigationZoom(3, 17)).toBe(18);
    expect(navigationZoom(18, 17)).toBe(16);
    expect(navigationZoom(14, 16)).toBe(16);
    expect(navigationZoom(11, 16)).toBe(17);
  });
});