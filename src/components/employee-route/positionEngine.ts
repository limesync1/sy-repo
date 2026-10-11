import { useCallback, useEffect, useRef, useState } from "react";
import { bearingDegrees, haversineMeters } from "@/lib/geo-distance";
import type { MotionSample } from "@/components/employee-route/motionTrack";

/**
 * Positionsmotor for rutekørsel — eneste kilde til bilens viste position.
 *
 * Som i Google Maps følger bilen VEJEN, ikke de rå GPS-prikker:
 *  - På ruten flyttes bilen kun langs rutelinjen (kørte meter), så den
 *    aldrig kan springe sidelæns, og retningen er vejens retning.
 *  - Fremad, aldrig baglæns, medmindre flere fixes i træk bekræfter det.
 *  - Søgning sker kun i et vindue omkring den nuværende position, så
 *    rundkørsler, ramper og parallelle veje ikke forveksles.
 *  - Hysterese: på ruten under 20 m, af ruten først over 45 m i 3 fixes.
 *  - Umulige spring afvises, medmindre næste fix bekræfter dem.
 *  - Mellem fixes og i tunneler køres der videre langs vejen (maks 10 s).
 *  - Under ca. 3 km/t står bilen helt stille og bevarer retningen.
 */

export type RawFix = {
  lat: number;
  lng: number;
  /** 1-sigma nøjagtighed i meter. */
  accuracy: number;
  heading: number | null;
  speed: number | null;
  /** Fixets tidsstempel (ms). */
  t: number;
};

export type EngineState = {
  pos: [number, number];
  heading: number | null;
  speedMps: number;
  accuracyM: number;
  onRoute: boolean;
  /** Antal fixes i træk uden for ruten (efter at en rute er sat). */
  offRouteFixes: number;
  /** Kørte meter på den aktuelle rutelinje, eller null. */
  progressM: number | null;
  moving: boolean;
};

export type EngineSample = MotionSample & { confidence: number; onRoute: boolean };

const ON_ROUTE_M = 20;
const OFF_ROUTE_M = 45;
const OFF_ROUTE_FIXES = 3;
const BACKWARD_FIXES = 3;
const STOP_MPS = 0.8; // ~3 km/t
const GO_MPS = 1.4; // ~5 km/t
const MAX_DEAD_RECKONING_S = 10;
/** I tunneler ved reel kørselsfart fortsætter bilen længere, som i Google Maps. */
const MAX_TUNNEL_S = 30;
const TUNNEL_MIN_MPS = 5;
const MAX_HEADING_RATE = 120; // °/s
const MAX_ACCEL = 3; // m/s²
const MAX_BRAKE = 4.5; // m/s²
const LONG_GAP_MS = 30_000;

const norm = (a: number) => ((a % 360) + 360) % 360;
const delta = (a: number, b: number) => ((((b - a) % 360) + 540) % 360) - 180;

export class RouteLine {
  readonly pts: [number, number][];
  readonly cum: number[];
  readonly total: number;
  constructor(pts: [number, number][]) {
    this.pts = pts;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + haversineMeters(pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
    this.cum = cum;
    this.total = cum[cum.length - 1] ?? 0;
  }
  private seg(d: number): number {
    let lo = 0, hi = this.cum.length - 1;
    while (lo < hi - 1) { const mid = (lo + hi) >> 1; if (this.cum[mid] <= d) lo = mid; else hi = mid; }
    return lo;
  }
  pointAt(d: number): [number, number] {
    const x = Math.max(0, Math.min(this.total, d));
    const i = this.seg(x);
    const a = this.pts[i], b = this.pts[Math.min(i + 1, this.pts.length - 1)];
    const len = this.cum[i + 1] - this.cum[i];
    const t = len > 0 ? (x - this.cum[i]) / len : 0;
    return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  }
  /** Vejens retning ved d, udglattet over et kort stykke frem. */
  headingAt(d: number): number {
    const from = Math.max(0, Math.min(d, this.total - 1));
    // To korte vinduer i midt gør sving til en bue frem for et knæk.
    const a = this.pointAt(from - 6), b = this.pointAt(from + 6);
    const c = this.pointAt(from - 2), e = this.pointAt(from + 16);
    const h1 = bearingDegrees(a[0], a[1], b[0], b[1]), h2 = bearingDegrees(c[0], c[1], e[0], e[1]);
    const dd = ((h2 - h1 + 540) % 360) - 180;
    return (h1 + dd / 2 + 360) % 360;
    return bearingDegrees(a[0], a[1], b[0], b[1]);
  }
  /** Nærmeste punkt på linjen inden for [from, to] kørte meter. */
  project(p: [number, number], from = 0, to = Infinity): { d: number; dist: number } {
    const k = Math.cos((p[0] * Math.PI) / 180) * 111320, m = 111320;
    let best = { d: 0, dist: Infinity };
    for (let i = 0; i < this.pts.length - 1; i++) {
      if (this.cum[i + 1] < from) continue;
      if (this.cum[i] > to) break;
      const a = this.pts[i], b = this.pts[i + 1];
      const ax = (a[1] - p[1]) * k, ay = (a[0] - p[0]) * m, bx = (b[1] - p[1]) * k, by = (b[0] - p[0]) * m;
      const dx = bx - ax, dy = by - ay, len2 = dx * dx + dy * dy;
      const t = len2 ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / len2)) : 0;
      const dist = Math.hypot(ax + dx * t, ay + dy * t);
      if (dist < best.dist) best = { d: this.cum[i] + (this.cum[i + 1] - this.cum[i]) * t, dist };
    }
    return best;
  }
}

export class PositionEngine {
  private line: RouteLine | null = null;
  private last: RawFix | null = null;
  private lastRecv = 0;
  private pending: RawFix | null = null;
  private speed = 0;
  private moving = false;
  private progress: number | null = null;
  private onRoute = false;
  private offHits = 0;
  private offRouteFixes = 0;
  private backHits = 0;
  private target: { pos: [number, number]; heading: number | null } | null = null;
  private disp: { progress: number | null; pos: [number, number]; heading: number | null; at: number; v?: number } | null = null;
  private forceJump = false;

  setRoute(pts: [number, number][]): void {
    const next = pts.length > 1 ? new RouteLine(pts) : null;
    if (next && this.line && next.total === this.line.total && next.pts[0][0] === this.line.pts[0][0] && next.pts[0][1] === this.line.pts[0][1]) return;
    this.line = next;
    this.progress = null; this.onRoute = false; this.offHits = 0; this.offRouteFixes = 0; this.backHits = 0;
    if (this.disp) this.disp.progress = null;
    if (this.line && this.last) this.match(this.last, 0, true);
  }

  /** Næste friske fix efter pause sættes direkte (ingen "spoling"). */
  markResume(): void { this.forceJump = true; }

  get state(): EngineState | null {
    if (!this.target || !this.last) return null;
    return {
      pos: this.target.pos, heading: this.target.heading, speedMps: this.moving ? this.speed : 0,
      accuracyM: this.last.accuracy, onRoute: this.onRoute, offRouteFixes: this.offRouteFixes,
      progressM: this.onRoute ? this.progress : null, moving: this.moving,
    };
  }

  /** Returnerer false hvis fixet blev afvist (dublet, forkert rækkefølge, umuligt spring). */
  ingest(fix: RawFix, receivedAt: number = fix.t): boolean {
    if (!Number.isFinite(fix.lat) || !Number.isFinite(fix.lng) || Math.abs(fix.lat) > 90) return false;
    const prev = this.last;
    let dt = 0, moved = 0;
    if (prev) {
      if (fix.t <= prev.t) return false;
      dt = (fix.t - prev.t) / 1000;
      moved = haversineMeters(prev.lat, prev.lng, fix.lat, fix.lng);
      if (fix.t - prev.t < LONG_GAP_MS) {
        const limit = Math.max(45, 2.5 * this.speed + 15);
        if (moved / dt > limit && moved > Math.max(30, fix.accuracy * 2)) {
          const p = this.pending;
          const pdt = p ? (fix.t - p.t) / 1000 : 0;
          const confirmed = p && pdt > 0 && pdt <= 5 && haversineMeters(p.lat, p.lng, fix.lat, fix.lng) / pdt <= limit;
          if (!confirmed) { this.pending = fix; return false; }
          this.forceJump = true; this.progress = null; this.onRoute = false;
        }
        // Et pludseligt dårligt fix kort efter et godt (indendørs/bygninger) ignoreres.
        if (fix.accuracy > 80 && fix.accuracy > prev.accuracy * 2 && dt < 6) return false;
      } else {
        this.forceJump = true; this.progress = null; this.onRoute = false;
      }
    }
    this.pending = null;

    const gpsSpeed = fix.speed != null && fix.speed >= 0 && Number.isFinite(fix.speed) ? fix.speed : null;
    const measured = prev && dt > 0 ? moved / dt : 0;
    this.speed = gpsSpeed ?? (prev ? this.speed * 0.5 + measured * 0.5 : 0);
    if (this.moving && this.speed < STOP_MPS) this.moving = false;
    else if (!this.moving && this.speed > GO_MPS) this.moving = true;

    this.last = fix;
    this.lastRecv = receivedAt;
    this.match(fix, dt, false);
    return true;
  }

  private match(fix: RawFix, dt: number, rematch: boolean): void {
    const p: [number, number] = [fix.lat, fix.lng];
    const line = this.line;
    if (line) {
      let m = this.onRoute && this.progress != null
        ? line.project(p, this.progress - 60, this.progress + Math.max(200, this.speed * dt * 3 + 120))
        : line.project(p);
      if (this.onRoute) {
        if (m.dist > OFF_ROUTE_M) {
          this.offHits += 1;
          if (this.offHits >= OFF_ROUTE_FIXES) { this.onRoute = false; this.offHits = 0; this.progress = null; }
        } else this.offHits = 0;
      }
      if (!this.onRoute) {
        const g = line.project(p);
        if (g.dist <= Math.max(ON_ROUTE_M, Math.min(35, fix.accuracy))) { this.onRoute = true; m = g; this.offHits = 0; this.progress = null; }
      }
      if (this.onRoute && this.offHits === 0) {
        this.offRouteFixes = 0;
        if (this.progress == null || rematch) { this.progress = m.d; this.backHits = 0; }
        else if (m.d < this.progress - 5) {
          this.backHits += 1;
          if (this.backHits >= BACKWARD_FIXES) { this.progress = m.d; this.backHits = 0; }
        } else {
          this.backHits = 0;
          if (this.moving) this.progress = Math.max(this.progress, m.d);
        }
        const heading = this.moving || this.target?.heading == null ? line.headingAt(this.progress) : this.target.heading;
        this.target = { pos: line.pointAt(this.progress), heading };
        return;
      }
      if (this.onRoute) return; // midlertidigt udenfor: hold positionen indtil 3 fixes bekræfter
      if (!rematch) this.offRouteFixes += 1;
    }
    // Fri kørsel (ingen rute eller uden for ruten).
    const prevT = this.target;
    if (prevT && !this.moving && !this.forceJump && haversineMeters(prevT.pos[0], prevT.pos[1], p[0], p[1]) < Math.max(8, fix.accuracy)) return;
    const pos: [number, number] = prevT && fix.accuracy > 15 && !this.forceJump
      ? [prevT.pos[0] + (p[0] - prevT.pos[0]) * 0.6, prevT.pos[1] + (p[1] - prevT.pos[1]) * 0.6]
      : p;
    let heading = prevT?.heading ?? null;
    if (this.moving) {
      if (fix.heading != null && Number.isFinite(fix.heading) && this.speed > 2.8) heading = norm(fix.heading);
      else if (prevT && haversineMeters(prevT.pos[0], prevT.pos[1], pos[0], pos[1]) > 8) heading = bearingDegrees(prevT.pos[0], prevT.pos[1], pos[0], pos[1]);
    }
    this.target = { pos, heading };
  }

  /** Bilens viste position på et givet tidspunkt (samme ur som receivedAt). */
  sample(now: number): EngineSample | null {
    const target = this.target;
    if (!target) return null;
    const age = Math.max(0, (now - this.lastRecv) / 1000);
    const confidence = age < 3 ? 1 : Math.max(0.35, 1 - (age - 3) / MAX_TUNNEL_S);
    if (!this.disp || this.forceJump) {
      this.forceJump = false;
      this.disp = { progress: this.onRoute ? this.progress : null, pos: target.pos, heading: target.heading, at: now };
      return { pos: target.pos, heading: target.heading, jump: true, confidence, onRoute: this.onRoute };
    }
    const d = this.disp;
    const rawDt = Math.max(0, (now - d.at) / 1000);
    const dt = Math.min(0.5, rawDt);
    d.at = now;
    let jump = false;
    let pos: [number, number];
    let wanted = target.heading;
    const line = this.line;
    if (this.onRoute && line && this.progress != null) {
      // Kør videre langs vejen mellem fixes; i tunneler op til 10 s med aftagende fart.
      const cap = this.speed >= TUNNEL_MIN_MPS ? MAX_TUNNEL_S : MAX_DEAD_RECKONING_S;
      const run = this.moving ? this.speed * Math.min(age, 3) + this.speed * 0.8 * Math.max(0, Math.min(age, cap) - 3) : 0;
      const predicted = Math.min(line.total, this.progress + run);
      let dp = d.progress;
      if (dp == null || Math.abs(predicted - dp) > 120) { jump = dp != null; dp = predicted; }
      else {
        // Bilmodel: farten ændres højst med MAX_ACCEL/MAX_BRAKE, aldrig baglæns.
        const gap = predicted - dp;
        const base = this.moving ? this.speed : 0;
        const wantV = gap < -25 ? 0 : Math.max(0, base + gap * 0.9);
        const v = d.v ?? 0;
        const dv = Math.max(-MAX_BRAKE * dt, Math.min(MAX_ACCEL * dt, wantV - v));
        d.v = Math.max(0, v + dv);
        if (!this.moving && gap > -25) {
          // Holder stille: rul blødt det sidste stykke hen til fixet og stå så helt stille.
          d.v = 0;
          dp += Math.max(0, gap) * (1 - Math.exp(-rawDt / 0.4));
        } else dp += d.v * dt;
        // Langt bagud (fx efter pause i sampling): indhent blødt i stedet for at krybe.
        if (gap > 30) { dp += (predicted - dp) * (1 - Math.exp(-dt / 0.3)); d.v = Math.max(d.v, base); }
        // En bil kører ikke forbi sit eget fix: brems helt ved målet.
        if (this.moving && dp > predicted + 15) dp = Math.max(predicted, dp - (dp - predicted) * 0.5);
        if (gap < -25) dp += gap * (1 - Math.exp(-dt / 0.8));
      }
      d.progress = dp;
      pos = line.pointAt(dp);
      if (this.moving) wanted = line.headingAt(dp);
    } else {
      d.progress = null;
      const gap = haversineMeters(d.pos[0], d.pos[1], target.pos[0], target.pos[1]);
      if (gap > 150) { jump = true; pos = target.pos; }
      else {
        const k = 1 - Math.exp(-dt / 0.35);
        pos = [d.pos[0] + (target.pos[0] - d.pos[0]) * k, d.pos[1] + (target.pos[1] - d.pos[1]) * k];
      }
    }
    d.pos = pos;
    if (wanted != null) {
      if (d.heading == null || jump) d.heading = norm(wanted);
      else {
        const diff = delta(d.heading, wanted);
        const vNow = d.v ?? this.speed;
        const rate = !this.moving && vNow < 0.5 ? 0 : vNow < 8.3 ? Math.min(MAX_HEADING_RATE, 90) : MAX_HEADING_RATE;
        const step = Math.max(-rate * dt, Math.min(rate * dt, diff * (1 - Math.exp(-dt / 0.25))));
        d.heading = norm(d.heading + step);
      }
    }
    return { pos, heading: d.heading, jump: jump || undefined, confidence, onRoute: this.onRoute };
  }

  /** Skal der tegnes flere frames? (bevægelse eller ikke landet endnu) */
  needsFrames(now: number): boolean {
    if (!this.target || !this.disp) return !!this.target;
    if (this.moving && this.onRoute && (now - this.lastRecv) / 1000 < (this.speed >= TUNNEL_MIN_MPS ? MAX_TUNNEL_S : MAX_DEAD_RECKONING_S)) return true;
    const gap = haversineMeters(this.disp.pos[0], this.disp.pos[1], this.target.pos[0], this.target.pos[1]);
    const hd = this.disp.heading != null && this.target.heading != null ? Math.abs(delta(this.disp.heading, this.target.heading)) : 0;
    return gap > 0.3 || (hd > 0.5 && this.moving);
  }
}

const FRAME_MS = 40; // ~25 fps

/** rAF-drevet abonnement på motoren — samme sample til bil og kamera. */
export class PositionTrack {
  readonly engine = new PositionEngine();
  private listeners = new Set<(s: MotionSample) => void>();
  private current: EngineSample | null = null;
  private raf: number | null = null;
  private lastFrame = 0;
  private paused = false;

  subscribe(fn: (s: MotionSample) => void): () => void {
    this.listeners.add(fn);
    if (this.current) fn(this.current);
    return () => { this.listeners.delete(fn); };
  }
  get value(): EngineSample | null { return this.current; }

  setRoute(pts: [number, number][]): void { this.engine.setRoute(pts); this.kick(); }
  push(fix: RawFix): boolean {
    const ok = this.engine.ingest(fix, now());
    if (ok) this.kick();
    return ok;
  }
  pause(): void {
    this.paused = true;
    if (this.raf != null && typeof cancelAnimationFrame !== "undefined") cancelAnimationFrame(this.raf);
    this.raf = null;
  }
  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.engine.markResume();
  }
  destroy(): void { this.pause(); this.listeners.clear(); }

  private emit(s: EngineSample): void {
    this.current = s;
    for (const fn of this.listeners) fn(s);
  }
  private kick(): void {
    if (this.paused) return;
    if (typeof requestAnimationFrame === "undefined") {
      const s = this.engine.sample(now()); if (s) this.emit(s);
      return;
    }
    if (this.raf != null) return;
    const loop = (t: number) => {
      this.raf = null;
      if (this.paused) return;
      if (t - this.lastFrame >= FRAME_MS) {
        this.lastFrame = t;
        const s = this.engine.sample(now());
        if (s) this.emit(s);
      }
      if (this.engine.needsFrames(now())) this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
}

const now = () => (typeof performance !== "undefined" ? performance.now() : Date.now());

/**
 * React-binding: fodrer motoren med rå fixes. Rutelinjen sættes med
 * `setRoute`, når den kendes. Returnerer et stabilt track (til kort-lag)
 * og motorens tilstand pr. accepteret fix.
 */
export function usePositionTrack(raw: RawFix | null, enabled: boolean) {
  const ref = useRef<PositionTrack | null>(null);
  if (!ref.current) ref.current = new PositionTrack();
  const track = ref.current;
  const [state, setState] = useState<EngineState | null>(null);

  useEffect(() => () => track.destroy(), [track]);
  useEffect(() => { if (enabled) track.resume(); else track.pause(); }, [enabled, track]);
  useEffect(() => {
    if (!raw) return;
    if (track.push(raw)) setState(track.engine.state);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw?.t, raw?.lat, raw?.lng]);
  const setRoute = useCallback((line: [number, number][]) => {
    track.setRoute(line);
    setState(track.engine.state);
  }, [track]);
  return { track, state, setRoute };
}
