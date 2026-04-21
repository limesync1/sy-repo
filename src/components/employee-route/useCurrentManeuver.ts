import { useMemo } from "react";
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

    // Find første step >= startFrom som stadig er "foran" brugeren (>20 m).
    // Vi forsøger ikke at vælge "den nærmeste" — det skaber flimren når man
    // bevæger sig langsomt mellem to maneuvers. I stedet holder vi os til
    // det tidligst mulige step indtil det er klart passeret (<20 m).
    let bestIdx = startFrom;
    for (let i = startFrom; i < steps.length; i++) {
      const loc = steps[i].maneuver.location;
      if (!loc) continue;
      const d = haversineMeters(userPos[0], userPos[1], loc[1], loc[0]);
      if (d > 20) {
        bestIdx = i;
        break;
      }
      // Hvis vi er <20 m fra denne maneuver er den passeret/under udførelse → prøv næste.
      bestIdx = Math.min(i + 1, steps.length - 1);
    }
    const loc = steps[bestIdx].maneuver.location;
    const bestDist = loc
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