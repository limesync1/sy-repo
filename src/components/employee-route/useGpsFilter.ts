import { useEffect, useRef, useState } from "react";
import { haversineMeters, bearingDegrees } from "@/lib/geo-distance";

/**
 * Adaptivt GPS-jitter-filter.
 *
 * Mobile GPS-modtagere giver typisk 1-3 m horisontal "støj" når man står
 * stille eller kører langsomt — det får puck'en til at sitre på kortet
 * selv når brugeren ikke bevæger sig.  Når man kører hurtigt er målingerne
 * derimod nøjagtige nok til at vi vil følge dem næsten 1:1.
 *
 * Filtret er en hybrid:
 *   - Adaptivt low-pass (eksponentiel udjævning) hvor "vægten" af nye
 *     fixes skaleres med rapporteret accuracy + estimeret hastighed.
 *   - "Stationary lock": hvis flere fixes i træk er <det forventede støj-
 *     niveau, fryser vi positionen helt — ingen drift når man holder
 *     stille ved trafiklys.
 *   - Heading bevares ufiltreret hvis enheden selv leverer det (den ved
 *     bedre end vi gør); ellers afledes en blid heading fra positions-
 *     deltaet — men kun når delta er stort nok til at retningen er reel.
 *
 * Output bruges som input til useSmoothPosition (rAF-tweening) — dvs. vi
 * fjerner først STØJ, dernæst tegner vi BLØDT.  De to lag tilsammen er
 * det Google Maps også gør.
 */

type Fix = {
  lat: number;
  lng: number;
  /** GPS-rapporteret nøjagtighed i meter (1-sigma). */
  accuracy: number;
  /** GPS-rapporteret heading i grader (0-360) eller null. */
  heading: number | null;
  /** GPS-rapporteret hastighed i m/s eller null. */
  speed: number | null;
  t: number;
};

export type FilteredFix = {
  pos: [number, number];
  heading: number | null;
  /** Estimeret hastighed i m/s — bruges til speed-adaptiv zoom. */
  speedMps: number;
};

/** Stationær = puck må ikke flytte sig. */
const STATIONARY_RADIUS_M = 4;
const STATIONARY_FIXES = 3;

export const useGpsFilter = (raw: Fix | null): FilteredFix | null => {
  const [out, setOut] = useState<FilteredFix | null>(null);

  const stateRef = useRef<{
    pos: [number, number];
    heading: number | null;
    speed: number;
    lastT: number;
    stationaryHits: number;
    anchor: [number, number];
  } | null>(null);

  useEffect(() => {
    if (!raw) return;
    const prev = stateRef.current;
    if (!prev) {
      // Første fix: brug råt.
      const init = {
        pos: [raw.lat, raw.lng] as [number, number],
        heading: raw.heading,
        speed: raw.speed ?? 0,
        lastT: raw.t,
        stationaryHits: 0,
        anchor: [raw.lat, raw.lng] as [number, number],
      };
      stateRef.current = init;
      setOut({ pos: init.pos, heading: init.heading, speedMps: init.speed });
      return;
    }

    const dt = Math.max(0.05, (raw.t - prev.lastT) / 1000);
    const moveM = haversineMeters(prev.pos[0], prev.pos[1], raw.lat, raw.lng);

    // Estimer hastighed (foretrækker GPS-rapporteret, ellers Δ-derivat).
    const measuredSpeed = raw.speed != null && raw.speed >= 0 ? raw.speed : moveM / dt;
    // Blød hastighed med EMA — undgår at zoom hopper ved enkelt-fix.
    const speed = prev.speed * 0.6 + measuredSpeed * 0.4;

    // Stationær lock — stå helt stille hvis vi er i en lille radius.
    const distFromAnchor = haversineMeters(prev.anchor[0], prev.anchor[1], raw.lat, raw.lng);
    const slow = speed < 0.6; // <2.2 km/t
    const noisyOnly = raw.accuracy >= 5 && distFromAnchor < Math.max(STATIONARY_RADIUS_M, raw.accuracy * 0.7);
    if (slow && noisyOnly) {
      const hits = prev.stationaryHits + 1;
      stateRef.current = {
        ...prev,
        speed,
        lastT: raw.t,
        stationaryHits: hits,
      };
      if (hits >= STATIONARY_FIXES) {
        // Frys pucken til ankeret — ingen drift.
        setOut({ pos: prev.anchor, heading: prev.heading, speedMps: 0 });
        return;
      }
    } else {
      // Reset stationary tracker; opdater anchor.
      stateRef.current = {
        ...prev,
        anchor: [raw.lat, raw.lng],
        stationaryHits: 0,
      };
    }

    // Adaptiv vægt α: høj accuracy + høj hastighed → følg råt; lav accuracy
    // + lav hastighed → smør kraftigt.
    // accFactor: 1 ved acc=5 m, ~0.3 ved acc=30 m.
    const accFactor = Math.max(0.25, Math.min(1, 8 / Math.max(raw.accuracy, 4)));
    // speedFactor: 0.4 ved standstill, 1 ved >12 m/s (~43 km/t).
    const speedFactor = Math.max(0.4, Math.min(1, speed / 12 + 0.4));
    const alpha = Math.max(0.15, Math.min(0.9, 0.55 * accFactor * speedFactor));

    const filteredLat = prev.pos[0] + (raw.lat - prev.pos[0]) * alpha;
    const filteredLng = prev.pos[1] + (raw.lng - prev.pos[1]) * alpha;
    const filteredPos: [number, number] = [filteredLat, filteredLng];

    // Heading: GPS-leveret er bedst når hastighed > 1.5 m/s; ellers behold
    // tidligere eller udled fra Δ.
    let heading = prev.heading;
    if (raw.heading != null && speed > 1.5) {
      heading = raw.heading;
    } else if (moveM > 4 && speed > 0.6) {
      heading = bearingDegrees(prev.pos[0], prev.pos[1], filteredLat, filteredLng);
    }

    stateRef.current = {
      ...stateRef.current!,
      pos: filteredPos,
      heading,
      speed,
      lastT: raw.t,
    };
    setOut({ pos: filteredPos, heading, speedMps: speed });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw?.lat, raw?.lng, raw?.t]);

  return out;
};