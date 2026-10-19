import { describe, expect, it } from "vitest";
import { PositionEngine, RouteLine, type RawFix } from "../positionEngine";
import { haversineMeters } from "@/lib/geo-distance";

// Straight road east along lat 56.2, then turns north (L-shape), ~2 km.
const BASE: [number, number] = [56.2, 9.0];
const M_LAT = 1 / 111320;
const M_LNG = 1 / (111320 * Math.cos((56.2 * Math.PI) / 180));
const at = (east: number, north: number): [number, number] => [BASE[0] + north * M_LAT, BASE[1] + east * M_LNG];
const road: [number, number][] = [];
for (let e = 0; e <= 1000; e += 50) road.push(at(e, 0));
for (let n = 50; n <= 1000; n += 50) road.push(at(1000, n));
const line = new RouteLine(road);

const fix = (p: [number, number], t: number, extra: Partial<RawFix> = {}): RawFix => ({ lat: p[0], lng: p[1], accuracy: 6, heading: null, speed: 14, t, ...extra });
const dist = (a: [number, number], b: [number, number]) => haversineMeters(a[0], a[1], b[0], b[1]);

/** Drives the line at `speed` m/s, 1 fix/s, with optional per-fix mutator. Returns max lateral error of shown car. */
function drive(engine: PositionEngine, seconds: number, speed = 14, mutate?: (i: number, f: RawFix) => RawFix | null, lateral = (i: number) => (i % 2 ? 6 : -6)) {
  let maxOff = 0, maxBack = 0, prevProgress = -Infinity;
  for (let i = 0; i < seconds; i++) {
    const d = i * speed;
    const truth = line.pointAt(d);
    const h = line.headingAt(d);
    // Lateral noise perpendicular to the road.
    const r = ((h + 90) * Math.PI) / 180;
    const noisy: [number, number] = [truth[0] + Math.cos(r) * lateral(i) * M_LAT, truth[1] + Math.sin(r) * lateral(i) * M_LNG];
    let f: RawFix | null = fix(noisy, i * 1000, { speed });
    if (mutate) f = mutate(i, f);
    if (f) engine.ingest(f, i * 1000);
    for (let k = 0; k < 25; k++) {
      const s = engine.sample(i * 1000 + k * 40);
      if (!s) continue;
      maxOff = Math.max(maxOff, line.project(s.pos).dist);
      const p = line.project(s.pos).d;
      if (p < prevProgress) maxBack = Math.max(maxBack, prevProgress - p);
      prevProgress = Math.max(prevProgress, p);
    }
  }
  return { maxOff, maxBack };
}

describe("PositionEngine", () => {
  it("keeps the car on the road despite lateral GPS noise and never drives backwards", () => {
    const e = new PositionEngine(); e.setRoute(road);
    const r = drive(e, 100);
    expect(r.maxOff).toBeLessThan(0.5);
    expect(r.maxBack).toBeLessThan(1);
    expect(e.state?.onRoute).toBe(true);
  });

  it("rejects a single 150 m jump (buildings) but accepts a confirmed one", () => {
    const e = new PositionEngine(); e.setRoute(road);
    drive(e, 10);
    const ok = e.ingest(fix(at(140, 150), 10_000), 10_000);
    expect(ok).toBe(false);
    const before = e.state!.pos;
    expect(dist(before, line.pointAt(9 * 14))).toBeLessThan(15);
  });

  it("does not reroute on a short excursion, but does after 3 fixes over 45 m", () => {
    const e = new PositionEngine(); e.setRoute(road);
    drive(e, 10);
    e.ingest(fix(at(140, 30), 10_000), 10_000);
    e.ingest(fix(at(154, 50), 11_000), 11_000);
    e.ingest(fix(at(168, 55), 12_000), 12_000);
    expect(e.state!.onRoute).toBe(true);
    e.ingest(fix(at(182, 60), 13_000), 13_000);
    expect(e.state!.onRoute).toBe(false);
    e.ingest(fix(at(196, 62), 14_000), 14_000);
    expect(e.state!.offRouteFixes).toBeGreaterThanOrEqual(1);
  });

  it("dead-reckons along the road through a 15 s tunnel and stays on the road", () => {
    const e = new PositionEngine(); e.setRoute(road);
    const r = drive(e, 60, 14, (i, f) => (i >= 20 && i < 35 ? null : f));
    expect(r.maxOff).toBeLessThan(0.5);
    // During the tunnel the car kept moving rather than freezing.
    const e2 = new PositionEngine(); e2.setRoute(road);
    drive(e2, 20);
    const a = e2.sample(19_000 + 1000)!.pos; const b = e2.sample(19_000 + 6000)!.pos;
    expect(dist(a, b)).toBeGreaterThan(30);
  });

  it("stands perfectly still at a red light and keeps its heading", () => {
    const e = new PositionEngine(); e.setRoute(road);
    drive(e, 10);
    const h = e.state!.heading;
    for (let i = 0; i < 20; i++) e.ingest(fix(at(126 + (i % 3) - 1, (i % 2) * 4 - 2), 10_000 + i * 1000, { speed: 0 }), 10_000 + i * 1000);
    const s1 = e.sample(30_000)!; const s2 = e.sample(31_000)!;
    expect(dist(s1.pos, s2.pos)).toBeLessThan(0.2);
    expect(e.state!.heading).toBe(h);
    expect(e.state!.moving).toBe(false);
  });

  it("turns the corner without swinging more than the heading rate allows", () => {
    const e = new PositionEngine(); e.setRoute(road);
    let prev: number | null = null; let maxStep = 0;
    for (let i = 0; i < 100; i++) {
      e.ingest(fix(line.pointAt(i * 14), i * 1000), i * 1000);
      for (let k = 0; k < 25; k++) {
        const s = e.sample(i * 1000 + k * 40)!;
        if (prev != null && s.heading != null) maxStep = Math.max(maxStep, Math.abs(((s.heading - prev + 540) % 360) - 180));
        prev = s.heading;
      }
    }
    expect(maxStep).toBeLessThanOrEqual(120 * 0.04 + 1e-6 + 120 * 0.5 * 0); // ≤ 4.8° per 40 ms frame
  });

  it("ignores duplicate and out-of-order fixes", () => {
    const e = new PositionEngine(); e.setRoute(road);
    expect(e.ingest(fix(at(0, 0), 1000), 1000)).toBe(true);
    expect(e.ingest(fix(at(5, 0), 1000), 1000)).toBe(false);
    expect(e.ingest(fix(at(5, 0), 500), 1100)).toBe(false);
  });

  it("works on phones without speed or heading (iPhone-like fixes)", () => {
    const e = new PositionEngine(); e.setRoute(road);
    const r = drive(e, 60, 14, (_i, f) => ({ ...f, speed: null, heading: null }));
    expect(r.maxOff).toBeLessThan(0.5);
    expect(e.state!.moving).toBe(true);
  });

  it("does not latch onto the parallel return leg of a U-shaped road", () => {
    // Out east 500 m, then back west 30 m further north (parallel road).
    const u: [number, number][] = [];
    for (let x = 0; x <= 500; x += 25) u.push(at(x, 0));
    for (let x = 500; x >= 0; x -= 25) u.push(at(x, 30));
    const ul = new RouteLine(u);
    const e = new PositionEngine(); e.setRoute(u);
    for (let i = 0; i < 20; i++) e.ingest(fix(at(i * 12, i % 2 ? 14 : 8), i * 1000, { speed: 12 }), i * 1000);
    // Noise pulls towards the parallel leg, but progress stays on the outbound leg.
    expect(e.state!.progressM!).toBeLessThan(400);
    expect(ul.total).toBeGreaterThan(1000);
  });

  it("jumps straight to the current position after a long gap (app resumed)", () => {
    const e = new PositionEngine(); e.setRoute(road);
    drive(e, 10);
    e.markResume();
    e.ingest(fix(line.pointAt(900), 200_000), 200_000);
    const s = e.sample(200_000)!;
    expect(s.jump).toBe(true);
    expect(dist(s.pos, line.pointAt(900))).toBeLessThan(10);
  });

  it("follows raw position smoothly when no route line is known", () => {
    const e = new PositionEngine();
    e.ingest(fix(at(0, 0), 0), 0);
    e.ingest(fix(at(14, 0), 1000), 1000);
    const s = e.sample(3000)!;
    expect(dist(s.pos, at(14, 0))).toBeLessThan(3);
  });
});

describe("PositionEngine bilmodel", () => {
  it("accelererer blødt fra stilstand (maks ca. 3 m/s²)", () => {
    const e = new PositionEngine(); e.setRoute(road);
    for (let i = 0; i < 3; i++) { e.ingest(fix(at(0, 0), i * 300, { speed: 0 }), i * 300); e.sample(i * 300); }
    e.ingest(fix(at(20, 0), 1000, { speed: 20 }), 1000);
    let prev = (e.sample(1000)!.pos[1] - 9) / M_LNG, maxV = 0, prevV = 0, maxA = 0;
    for (let k = 1; k <= 25; k++) {
      const p = (e.sample(1000 + k * 40)!.pos[1] - 9) / M_LNG;
      const v = (p - prev) / 0.04; prev = p;
      maxA = Math.max(maxA, (v - prevV) / 0.04); prevV = v; maxV = Math.max(maxV, v);
    }
    expect(maxA).toBeLessThan(100); // ingen øjeblikkelig 20 m/s-start (det ville være 500)
    expect(maxV).toBeLessThan(20);
  });

  it("drejer ikke kortet, når bilen holder stille", () => {
    const e = new PositionEngine(); e.setRoute(road);
    drive(e, 10);
    for (let i = 0; i < 5; i++) e.ingest(fix(at(126, 0), 10_000 + i * 1000, { speed: 0, heading: 200 }), 10_000 + i * 1000);
    const h1 = e.sample(15_000)!.heading!; const h2 = e.sample(15_400)!.heading!;
    expect(h1).toBe(h2);
  });
});

describe("robust start", () => {
  it("replaces a coarse first fix immediately when a precise fix arrives", () => {
    const e = new PositionEngine();
    e.setRoute(road);
    // Grov wifi-position 900 m væk, derefter præcis position ved starten.
    e.ingest(fix(at(0, 900), 0, { accuracy: 800, speed: null }), 0);
    e.sample(0);
    expect(e.ingest(fix(at(10, 0), 1000, { accuracy: 8, speed: 0 }), 1000)).toBe(true);
    const s = e.sample(1000)!;
    expect(dist(s.pos, at(10, 0))).toBeLessThan(15);
  });

  it("matches the start of an out-and-back route, not the return leg", () => {
    const back: [number, number][] = [];
    for (let x = 0; x <= 500; x += 50) back.push(at(x, 0));
    for (let x = 500; x >= 0; x -= 50) back.push(at(x, 8)); // retur 8 m ved siden af
    const e = new PositionEngine();
    e.setRoute(back);
    e.ingest(fix(at(20, 6), 0, { speed: 0 }), 0);
    expect(e.state!.progressM!).toBeLessThan(60);
  });
});
