import { useEffect } from "react";
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
  useEffect(() => {
    if (!enabled || !map || document.visibilityState === "hidden") return;
    const target = targetForSpeed(speedMps);
    if (Math.abs(target - map.getZoom()) < 0.35) return;
    // Én Leaflet-animation pr. reel hastighedsændring. Det tidligere permanente
    // 60-fps loop genberegnede kortet hele tiden og gjorde telefonen varm.
    map.setZoom(target, { animate: true });
  }, [enabled, map, speedMps]);
};