import { useEffect, useRef } from "react";

/**
 * Imperativ bevægelses-"track" til kørselsguiden.
 *
 * Baggrund: tidligere blev positionen mellem GPS-fixes interpoleret i en
 * React-state (useSmoothPosition). Det betød at HELE rute-siden blev
 * re-renderet ~60 gange i sekundet mens man kørte — med kort, markører,
 * polyliner og bannere. Det er den primære grund til at telefonen blev
 * varm og brugte meget strøm.
 *
 * Her holdes interpolationen helt uden for React: en enkelt rAF-løkke
 * opdaterer en værdi og kalder abonnenter (Leaflet-markør + kamera), som
 * skriver direkte til DOM/kortet. React re-renderer kun når der kommer et
 * nyt GPS-fix (højst hvert par sekunder).
 *
 * Løkken:
 *  - kører kun når der reelt er en bevægelse at tegne,
 *  - stopper af sig selv når målet er nået (bilen holder stille),
 *  - er throttlet til ~25 fps, hvilket er rigeligt for en kortmarkør,
 *  - kan sættes helt på pause når skærmen er slukket/appen i baggrunden.
 */

export type MotionSample = {
  pos: [number, number];
  heading: number | null;
};

const FRAME_MS = 40; // ~25 fps
const MIN_TWEEN_MS = 700;
const MAX_TWEEN_MS = 1800;

export class MotionTrack {
  private listeners = new Set<(s: MotionSample) => void>();
  private from: [number, number] | null = null;
  private to: [number, number] | null = null;
  private fromHeading: number | null = null;
  private toHeading: number | null = null;
  private startedAt = 0;
  private duration = 1100;
  private lastTargetAt = 0;
  private lastFrameAt = 0;
  private raf: number | null = null;
  private paused = false;
  private current: MotionSample | null = null;

  subscribe(fn: (s: MotionSample) => void): () => void {
    this.listeners.add(fn);
    if (this.current) fn(this.current);
    return () => {
      this.listeners.delete(fn);
    };
  }

  get value(): MotionSample | null {
    return this.current;
  }

  /** Nyt GPS-mål. Springer direkte hvis vi ikke har en tidligere position. */
  setTarget(pos: [number, number] | null, heading: number | null, now = performance.now()): void {
    if (!pos) return;
    if (!this.current) {
      this.current = { pos, heading };
      this.from = pos;
      this.to = pos;
      this.fromHeading = heading;
      this.toHeading = heading;
      this.lastTargetAt = now;
      this.emit();
      return;
    }
    this.from = this.current.pos;
    this.to = pos;
    const cur = this.current.heading;
    if (heading != null) {
      if (cur == null) {
        this.fromHeading = heading;
        this.toHeading = heading;
      } else {
        const delta = ((heading - cur + 540) % 360) - 180;
        this.fromHeading = cur;
        this.toHeading = cur + delta;
      }
    } else {
      this.fromHeading = cur;
      this.toHeading = cur;
    }
    if (this.lastTargetAt > 0) {
      const observed = now - this.lastTargetAt;
      const next = Math.max(MIN_TWEEN_MS, Math.min(MAX_TWEEN_MS, observed * 1.15));
      this.duration = this.duration * 0.6 + next * 0.4;
    }
    this.lastTargetAt = now;
    this.startedAt = now;
    this.ensureRunning();
  }

  /** Beregn værdien på et givet tidspunkt (uden rAF) — bruges også i tests. */
  sampleAt(now: number): MotionSample | null {
    if (!this.from || !this.to) return this.current;
    const t = Math.min(1, Math.max(0, (now - this.startedAt) / this.duration));
    const e = t * t * (3 - 2 * t);
    const pos: [number, number] = [
      this.from[0] + (this.to[0] - this.from[0]) * e,
      this.from[1] + (this.to[1] - this.from[1]) * e,
    ];
    let heading = this.current?.heading ?? null;
    if (this.fromHeading != null && this.toHeading != null) {
      const h = this.fromHeading + (this.toHeading - this.fromHeading) * e;
      heading = ((h % 360) + 360) % 360;
    }
    return { pos, heading };
  }

  /** Kør ét skridt frem — eksponeret for test og for rAF-løkken. */
  step(now: number): boolean {
    const s = this.sampleAt(now);
    if (!s) return false;
    this.current = s;
    this.emit();
    return now - this.startedAt < this.duration;
  }

  pause(): void {
    this.paused = true;
    if (this.raf != null) {
      cancelAnimationFrame(this.raf);
      this.raf = null;
    }
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    // Spring til målet i stedet for at animere gammel bevægelse frem.
    if (this.to) {
      this.from = this.to;
      this.current = { pos: this.to, heading: this.current?.heading ?? this.toHeading };
      this.emit();
    }
  }

  destroy(): void {
    this.pause();
    this.listeners.clear();
  }

  private emit(): void {
    if (!this.current) return;
    for (const fn of this.listeners) fn(this.current);
  }

  private ensureRunning(): void {
    if (this.paused || this.raf != null) return;
    if (typeof requestAnimationFrame === "undefined") return;
    const loop = (now: number) => {
      this.raf = null;
      if (this.paused) return;
      if (now - this.lastFrameAt < FRAME_MS) {
        this.raf = requestAnimationFrame(loop);
        return;
      }
      this.lastFrameAt = now;
      const more = this.step(now);
      if (more) this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }
}

/**
 * React-binding: holder én MotionTrack i live og fodrer den med nye
 * GPS-mål. Den returnerede instans er stabil, så abonnenter (kort-lag)
 * ikke skal gen-tilmelde sig ved hver render.
 */
export const useMotionTrack = (
  target: [number, number] | null,
  heading: number | null,
  enabled: boolean,
): MotionTrack => {
  const ref = useRef<MotionTrack | null>(null);
  if (ref.current == null) ref.current = new MotionTrack();
  const track = ref.current;

  useEffect(() => () => track.destroy(), [track]);

  useEffect(() => {
    if (!enabled) {
      track.pause();
      return;
    }
    track.resume();
  }, [enabled, track]);

  useEffect(() => {
    if (!target) return;
    if (!enabled) {
      // Uden aktiv guide: sæt værdien direkte uden animation.
      track.setTarget(target, heading);
      track.pause();
      return;
    }
    track.setTarget(target, heading);
  }, [target?.[0], target?.[1], heading, enabled, track]);

  return track;
};
