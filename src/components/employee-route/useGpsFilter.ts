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
  /** Bedste accuracy (m) blandt seneste anvendte fixes — til UI-feedback. */
  accuracyM: number;
};

/** Stationær = puck må ikke flytte sig. */
const STATIONARY_RADIUS_M = 4;
const STATIONARY_FIXES = 3;

/** Maks accuracy vi overhovedet bruger (m). Værre end dette → ignorer hvis
 *  vi har noget bedre indenfor de sidste få sekunder. */
const MAX_USABLE_ACCURACY_M = 60;
/** Hvor længe et "godt" fix tæller som reference (ms). */
const RECENT_GOOD_FIX_MS = 6000;
/** Antal seneste fixes vi vægter sammen for præcis stationær position. */
const ANCHOR_WINDOW = 5;

export const useGpsFilter = (raw: Fix | null): FilteredFix | null => {
  const [out, setOut] = useState<FilteredFix | null>(null);

  const stateRef = useRef<{
    pos: [number, number];
    heading: number | null;
    speed: number;
    lastT: number;
    stationaryHits: number;
    anchor: [number, number];
    /** Seneste fixes (lat, lng, acc, t) — bruges til weighted-anker når stationær. */
    recent: Array<{ lat: number; lng: number; acc: number; t: number }>;
    /** Bedste accuracy set for nylig (til outlier-rejection). */
    bestRecentAcc: number;
    bestRecentAccT: number;
  } | null>(null);

  useEffect(() => {
    if (!raw) return;
    const prev = stateRef.current;

    // Outlier-rejection: hvis vi har set et væsentligt bedre fix indenfor
    // de sidste få sekunder, så ignorer dårlige målinger.  Det er typisk
    // det her der får puck'en til at "hoppe væk" fra en korrekt position
    // når man står stille indendørs (GPS giver pludselig acc=80m).
    if (prev && raw.accuracy > MAX_USABLE_ACCURACY_M) {
      const ageMs = raw.t - prev.bestRecentAccT;
      if (ageMs < RECENT_GOOD_FIX_MS && raw.accuracy > prev.bestRecentAcc * 2) {
        // Ignorer fixet helt — behold tidligere position.
        return;
      }
    }

    if (!prev) {
      // Første fix: brug råt.
      const init = {
        pos: [raw.lat, raw.lng] as [number, number],
        heading: raw.heading,
        speed: raw.speed ?? 0,
        lastT: raw.t,
        stationaryHits: 0,
        anchor: [raw.lat, raw.lng] as [number, number],
        recent: [{ lat: raw.lat, lng: raw.lng, acc: raw.accuracy, t: raw.t }],
        bestRecentAcc: raw.accuracy,
        bestRecentAccT: raw.t,
      };
      stateRef.current = init;
      setOut({ pos: init.pos, heading: init.heading, speedMps: init.speed, accuracyM: raw.accuracy });
      return;
    }

    const dt = Math.max(0.05, (raw.t - prev.lastT) / 1000);
    const moveM = haversineMeters(prev.pos[0], prev.pos[1], raw.lat, raw.lng);

    // Estimer hastighed (foretrækker GPS-rapporteret, ellers Δ-derivat).
    const measuredSpeed = raw.speed != null && raw.speed >= 0 ? raw.speed : moveM / dt;
    // Blød hastighed med EMA — undgår at zoom hopper ved enkelt-fix.
    const speed = prev.speed * 0.6 + measuredSpeed * 0.4;

    // Opdater rullende vindue af seneste fixes (bruges til weighted-anker).
    const recent = [...prev.recent, { lat: raw.lat, lng: raw.lng, acc: raw.accuracy, t: raw.t }]
      .slice(-ANCHOR_WINDOW);

    // Track bedste accuracy for outlier-rejection.
    const bestRecentAcc = raw.accuracy < prev.bestRecentAcc || (raw.t - prev.bestRecentAccT) > RECENT_GOOD_FIX_MS
      ? raw.accuracy
      : prev.bestRecentAcc;
    const bestRecentAccT = bestRecentAcc === raw.accuracy ? raw.t : prev.bestRecentAccT;

    // Stationær lock — stå helt stille hvis vi er i en lille radius.
    const distFromAnchor = haversineMeters(prev.anchor[0], prev.anchor[1], raw.lat, raw.lng);
    const slow = speed < 0.6; // <2.2 km/t
    const noisyOnly = raw.accuracy >= 5 && distFromAnchor < Math.max(STATIONARY_RADIUS_M, raw.accuracy * 0.7);
    if (slow && noisyOnly) {
      const hits = prev.stationaryHits + 1;
      // Når vi er stationære: beregn et accuracy-vægtet gennemsnit af de
      // seneste fixes som anker — det giver en mere præcis position end
      // det første fix, og kompenserer for at GPS skifter et par meter
      // mellem fixes selv når brugeren ikke bevæger sig.
      let weightedLat = 0;
      let weightedLng = 0;
      let weightSum = 0;
      for (const f of recent) {
        // Vægt = 1/acc² → gode fixes dominerer, dårlige bidrager lidt.
        const w = 1 / Math.max(f.acc * f.acc, 4);
        weightedLat += f.lat * w;
        weightedLng += f.lng * w;
        weightSum += w;
      }
      const refinedAnchor: [number, number] = weightSum > 0
        ? [weightedLat / weightSum, weightedLng / weightSum]
        : prev.anchor;

      stateRef.current = {
        ...prev,
        speed,
        lastT: raw.t,
        stationaryHits: hits,
        recent,
        bestRecentAcc,
        bestRecentAccT,
        anchor: refinedAnchor,
      };
      if (hits >= STATIONARY_FIXES) {
        // Frys pucken til det forfinede anker — meget tæt på den faktiske
        // adresse selv når GPS sitrer.  Undgå unødige re-renders.
        setOut((prevOut) => {
          const newAcc = bestRecentAcc;
          if (
            prevOut &&
            Math.abs(prevOut.pos[0] - refinedAnchor[0]) < 1e-7 &&
            Math.abs(prevOut.pos[1] - refinedAnchor[1]) < 1e-7 &&
            prevOut.speedMps === 0 &&
            prevOut.heading === prev.heading &&
            prevOut.accuracyM === newAcc
          ) {
            return prevOut;
          }
          return { pos: refinedAnchor, heading: prev.heading, speedMps: 0, accuracyM: newAcc };
        });
        return;
      }
    } else {
      // Reset stationary tracker; opdater anchor.
      stateRef.current = {
        ...prev,
        anchor: [raw.lat, raw.lng],
        stationaryHits: 0,
        recent,
        bestRecentAcc,
        bestRecentAccT,
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
    setOut({ pos: filteredPos, heading, speedMps: speed, accuracyM: raw.accuracy });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [raw?.lat, raw?.lng, raw?.t]);

  return out;
};