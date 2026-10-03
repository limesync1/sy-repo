import { useMemo } from "react";
import { roadProgress } from "./route-progress";
import { haversineMeters } from "@/lib/geo-distance";

export type Step = {
  distance_m: number;
  duration_s: number;
  name: string;
  maneuver: {
    type: string;
    modifier?: string;
    instruction?: string;
    bearing_after?: number;
    bearing_before?: number;
    location: [number, number]; // [lng, lat]
  };
  geometry?: { type: "LineString"; coordinates: [number, number][] };
};

/**
 * Stable turn-by-turn step picker.
 *
 * Designet så banneret IKKE flimrer ved GPS-jitter eller når man cykler langsomt:
 *  - Vi vælger den FØRSTE maneuver der stadig er foran brugeren (>20 m væk).
 *  - Vi advancerer kun fremad — aldrig tilbage til en tidligere maneuver, selv
 *    hvis GPS-fixet hopper. Dette undgår at banneret pludselig hopper til en
 *    "tidligere" instruktion og så tilbage igen.
 *  - Returnerer null når intet meningsfuldt step er fundet.
 */
export const useCurrentManeuver = (
  steps: Step[] | undefined,
  userPos: [number, number] | null,
  /** Sticky index — typisk holdt i en ref af kalderen så vi aldrig går baglæns. */
  minStepIndex: number = 0,
) => {
  return useMemo(() => {
    if (!steps || steps.length === 0) return null;
    const startFrom = Math.max(0, Math.min(minStepIndex, steps.length - 1));
    if (!userPos) {
      const first = steps[startFrom];
      return {
        currentStep: first,
        nextStep: steps[startFrom + 1],
        distanceToManeuverM: first.distance_m,
        stepIndex: startFrom,
      };
    }

    // Road geometry identifies the segment actually being driven; being close
    // to a turn is not evidence it was passed (especially on parallel roads).
    let bestIdx = startFrom;
    let closest = Infinity;
    for (let i = Math.max(0, startFrom - 1); i < steps.length; i++) {
      const coords = steps[i].geometry?.coordinates;
      if (!coords || coords.length < 2) continue;
      const line = coords.map(([lng, lat]) => [lat, lng] as [number, number]);
      const road = roadProgress(userPos, line);
      if (road.offRoad < closest - 2) {
        closest = road.offRoad;
        // OSRM geometry starts at this maneuver and ends at the next.
        bestIdx = Math.max(startFrom, Math.min(i + 1, steps.length - 1));
      }
    }
    if (!Number.isFinite(closest)) {
      // Without provider geometry use a tight threshold, never skipping a turn 20m early.
      while (bestIdx < steps.length - 1) {
        const loc = steps[bestIdx].maneuver.location;
        if (!loc || haversineMeters(userPos[0], userPos[1], loc[1], loc[0]) > 8) break;
        bestIdx++;
      }
    }
    const loc = steps[bestIdx].maneuver.location;
    const approach = steps[Math.max(0, bestIdx - 1)].geometry?.coordinates;
    const road = approach && approach.length > 1 ? roadProgress(userPos, approach.map(([lng, lat]) => [lat, lng] as [number, number])) : null;
    const bestDist = road && road.offRoad < 40 ? road.remaining : loc
      ? haversineMeters(userPos[0], userPos[1], loc[1], loc[0])
      : steps[bestIdx].distance_m;

    return {
      currentStep: steps[bestIdx],
      nextStep: steps[bestIdx + 1],
      distanceToManeuverM: bestDist,
      stepIndex: bestIdx,
    };
  }, [steps, userPos?.[0], userPos?.[1], minStepIndex]);
};