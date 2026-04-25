import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

/**
 * Hastigheds-adaptiv, glidende zoom under aktiv navigation.
 *
 * Koncept (matcher Google Maps' og Wazes adfærd):
 *   - Når man kører hurtigt (>16 m/s ≈ 60 km/t) zoomer vi ud så man kan
 *     se længere frem.
 *   - Når man kører langsomt (<2 m/s ≈ 7 km/t) zoomer vi ind så man kan
 *     læse gade-detalje.
 *   - Mellem grænserne interpoleres lineært.
 *
 * Vigtigt: vi bruger IKKE Leafets indbyggede zoom-animation pr. ændring
 * (det giver hak når flere kommandoer overlapper).  Vi tegner i stedet et
 * rAF-loop der hver frame trækker map.getZoom() lidt mod targetZoom med
 * eksponentiel udjævning — fuldstændigt synkront med kameraets pan-loop.
 */

const MIN_ZOOM = 16.5;
const MAX_ZOOM = 19;
/** Hastigheds-grænser (m/s) for hhv. max-zoom og min-zoom. */
const SLOW_MPS = 2;
const FAST_MPS = 18;

const targetForSpeed = (mps: number): number => {
  if (mps <= SLOW_MPS) return MAX_ZOOM;
  if (mps >= FAST_MPS) return MIN_ZOOM;
  const t = (mps - SLOW_MPS) / (FAST_MPS - SLOW_MPS);
  return MAX_ZOOM + (MIN_ZOOM - MAX_ZOOM) * t;
};

/**
 * Driver zoom-niveauet kontinuerligt mod et hastighedsbestemt target.
 * Loopet kører kun mens `enabled=true` og bliver pauset/ryddet ellers.
 */
export const useSmoothZoom = (
  map: LeafletMap | null,
  enabled: boolean,
  speedMps: number,
) => {
  const targetRef = useRef<number>(MAX_ZOOM);
  const rafRef = useRef<number | null>(null);

  // Opdater target uden at restarte rAF-loopet.
  useEffect(() => {
    targetRef.current = targetForSpeed(speedMps);
  }, [speedMps]);

  useEffect(() => {
    if (!enabled || !map) {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
      return;
    }
    // Eksponentiel easing: 0.04 pr. frame ≈ ~0.5 sek til 90% af target,
    // hvilket er hurtigt nok til at føles responsivt og langsomt nok til
    // at fjerne hak.
    const RATE = 0.04;
    const tick = () => {
      const cur = map.getZoom();
      const tgt = targetRef.current;
      const diff = tgt - cur;
      // Stop kun rAF i selve setZoom-kaldet hvis vi rent faktisk ændrer noget.
      if (Math.abs(diff) > 0.01) {
        const nextZoom = cur + diff * RATE;
        // setZoom uden animation — vi animerer selv.
        map.setZoom(nextZoom, { animate: false } as any);
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    };
  }, [enabled, map]);
};