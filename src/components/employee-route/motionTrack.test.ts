import { describe, it, expect } from "vitest";
import { MotionTrack } from "./motionTrack";

describe("MotionTrack", () => {
  it("første mål sættes uden animation", () => {
    const t = new MotionTrack();
    const seen: Array<[number, number]> = [];
    t.subscribe((s) => seen.push(s.pos));
    t.setTarget([56, 9], 90, 0);
    expect(t.value?.pos).toEqual([56, 9]);
    expect(seen.length).toBe(1);
  });

  it("interpolerer blødt mellem to fixes og ender præcist på målet", () => {
    const t = new MotionTrack();
    t.setTarget([56, 9], 0, 0);
    t.setTarget([56.001, 9], 0, 1000);
    const mid = t.sampleAt(1000 + 550)!;
    expect(mid.pos[0]).toBeGreaterThan(56);
    expect(mid.pos[0]).toBeLessThan(56.001);
    const end = t.sampleAt(1000 + 5000)!;
    expect(end.pos[0]).toBeCloseTo(56.001, 9);
  });

  it("tager korteste vinkelvej ved heading-skift (ingen 350°-spin)", () => {
    const t = new MotionTrack();
    t.setTarget([56, 9], 350, 0);
    t.setTarget([56.0005, 9], 10, 1000);
    const mid = t.sampleAt(1000 + 550)!;
    // Skal gå gennem 0°, ikke gennem 180°.
    const h = mid.heading!;
    expect(h > 340 || h < 20).toBe(true);
  });

  it("pause stopper opdateringer, resume springer til seneste mål", () => {
    const t = new MotionTrack();
    t.setTarget([56, 9], 0, 0);
    t.setTarget([56.01, 9], 0, 1000);
    t.pause();
    const seen: Array<[number, number]> = [];
    t.subscribe((s) => seen.push(s.pos));
    seen.length = 0;
    t.resume();
    expect(t.value?.pos).toEqual([56.01, 9]);
    expect(seen.length).toBe(1);
  });

  it("står bilen stille, ændrer værdien sig ikke", () => {
    const t = new MotionTrack();
    t.setTarget([56, 9], 45, 0);
    t.setTarget([56, 9], 45, 2000);
    t.step(2500);
    expect(t.value?.pos).toEqual([56, 9]);
    expect(t.value?.heading).toBe(45);
  });
});
