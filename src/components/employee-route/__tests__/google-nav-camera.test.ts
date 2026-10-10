import { describe, expect, it } from "vitest";
import { angleDelta, followCenter, followZoom, lerpCam, nextHeading } from "../google-nav-camera";

describe("google nav camera", () => {
  it("ignores heading noise and slow speeds", () => {
    expect(nextHeading(90, 92, 15)).toBe(90);
    expect(nextHeading(90, 180, 1)).toBe(90);
    expect(nextHeading(null, 45, 10)).toBe(45);
  });
  it("caps large heading swings and wraps around north", () => {
    expect(nextHeading(0, 180, 15)).toBeLessThanOrEqual(35 + 1e-9);
    const h = nextHeading(350, 10, 15)!;
    expect(Math.abs(angleDelta(350, h))).toBeLessThan(20);
  });
  it("keeps the user's zoom and only nudges it before turns", () => {
    expect(followZoom(14, null, 10)).toBe(14);
    expect(followZoom(14, 150, 10)).toBe(15);
    expect(followZoom(14, 1500, 10)).toBe(14);
  });
  it("places the centre ahead along the heading", () => {
    const c = followCenter([56, 9], 0, 17, 100, 0);
    expect(c.lat).toBeGreaterThan(56);
    expect(Math.abs(c.lng - 9)).toBeLessThan(1e-9);
  });
  it("interpolates heading the short way", () => {
    const m = lerpCam({ lat: 0, lng: 0, zoom: 10, heading: 350, tilt: 0 }, { lat: 0, lng: 0, zoom: 10, heading: 10, tilt: 0 }, 0.5);
    expect(m.heading === 0 || m.heading === 360 || Math.abs(angleDelta(0, m.heading)) < 1).toBe(true);
  });
});
