import { useEffect, useRef, useState } from "react";

/**
 * Smoothly interpolates between GPS fixes using requestAnimationFrame so that
 * the user marker glides instead of jumping every 1-3 seconds (the typical
 * GPS update cadence on phones). Mirrors how Google Maps renders the puck.
 *
 * - When `target` is null we just stop animating.
 * - When a new target arrives we tween from current → target over ~900ms with
 *   ease-out so the marker never overshoots and never feels laggy.
 * - The hook also exposes a smoothed heading (CSS-friendly) so the puck can
 *   rotate without re-mounting the Leaflet marker every frame.
 */
export const useSmoothPosition = (
  target: [number, number] | null,
  targetHeading: number | null,
  enabled: boolean,
) => {
  const [pos, setPos] = useState<[number, number] | null>(target);
  const [heading, setHeading] = useState<number | null>(targetHeading);

  const fromRef = useRef<[number, number] | null>(target);
  const toRef = useRef<[number, number] | null>(target);
  const fromHeadingRef = useRef<number | null>(targetHeading);
  const toHeadingRef = useRef<number | null>(targetHeading);
  const startTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  // Adaptiv tween-varighed: vi måler den faktiske afstand mellem GPS-
  // fixes og bruger det som mål.  Det giver kontinuerlig bevægelse uden
  // hverken at lagge bagud (for lang varighed) eller stoppe op mellem
  // fixes (for kort varighed).  Vi clamp'er til 700-1700 ms som rimelige
  // grænser for typiske mobile GPS-cadencer (1-3 s).
  const lastUpdateRef = useRef<number>(0);
  const durationRef = useRef<number>(1100);

  // Snapshot start values whenever a new target arrives.
  useEffect(() => {
    if (!enabled || !target) {
      // Sync immediately when disabled.
      fromRef.current = target;
      toRef.current = target;
      fromHeadingRef.current = targetHeading;
      toHeadingRef.current = targetHeading;
      setPos(target);
      setHeading(targetHeading);
      return;
    }
    fromRef.current = pos ?? target;
    toRef.current = target;
    // For heading: take the shortest angular path so we never spin 350° to go
    // 10° in the other direction.
    if (targetHeading != null) {
      const cur = fromHeadingRef.current ?? targetHeading;
      let delta = ((targetHeading - cur + 540) % 360) - 180;
      fromHeadingRef.current = cur;
      toHeadingRef.current = cur + delta;
    }
    const nowTs = performance.now();
    // Mål den observerede GPS-cadence; brug den som tween-varighed med
    // en lille buffer (~120%) så vi altid har lidt at glide på når næste
    // fix er forsinket.  Første fix → fald tilbage til 1100 ms.
    if (lastUpdateRef.current > 0) {
      const observed = nowTs - lastUpdateRef.current;
      const next = Math.max(700, Math.min(1700, observed * 1.2));
      // Glat også varighed med EMA — undgår at en enkelt outlier ændrer alt.
      durationRef.current = durationRef.current * 0.6 + next * 0.4;
    }
    lastUpdateRef.current = nowTs;
    startTimeRef.current = nowTs;
    if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
    const tick = (now: number) => {
      const t = Math.min(1, (now - startTimeRef.current) / durationRef.current);
      // Blødere ease-in-out (smoothstep) — undgår både ryk i starten og
      // det "halse-stop" en ren ease-out giver lige før næste GPS-fix.
      const e = t * t * (3 - 2 * t);
      const from = fromRef.current;
      const to = toRef.current;
      if (from && to) {
        setPos([from[0] + (to[0] - from[0]) * e, from[1] + (to[1] - from[1]) * e]);
      }
      const fh = fromHeadingRef.current;
      const th = toHeadingRef.current;
      if (fh != null && th != null) {
        const h = fh + (th - fh) * e;
        setHeading(((h % 360) + 360) % 360);
      }
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target?.[0], target?.[1], targetHeading, enabled]);

  return { smoothPos: pos, smoothHeading: heading };
};