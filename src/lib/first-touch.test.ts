import { describe, it, expect } from "vitest";
import { buildFirstTouch } from "./first-touch";

describe("first touch", () => {
  it("husker Google og artiklen som landingsside", () => {
    const t = buildFirstTouch("https://serviceydere.dk/blog/vinduespudser-eller-selv", "https://www.google.com/");
    expect(t.referrer).toBe("www.google.com");
    expect(t.landing_path).toBe("/blog/vinduespudser-eller-selv");
  });
  it("ignorerer interne henvisninger og læser utm", () => {
    const t = buildFirstTouch("https://serviceydere.dk/?utm_source=facebook", "https://serviceydere.dk/om-os");
    expect(t.referrer).toBeNull();
    expect(t.utm_source).toBe("facebook");
  });
});
