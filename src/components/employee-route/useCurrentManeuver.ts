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
 * Given the user's current GPS position and the full step list, find the
 * closest upcoming maneuver and how far the user is from it. The "current step"
 * is the next maneuver the driver hasn't yet passed.
 */
export const useCurrentManeuver = (
  steps: Step[] | undefined,
  userPos: [number, number] | null,
) => {
  return useMemo(() => {
    if (!steps || steps.length === 0) return null;
    if (!userPos) {
      const first = steps[0];
      return {
        currentStep: first,
        nextStep: steps[1],
        distanceToManeuverM: first.distance_m,
        stepIndex: 0,
      };
    }

    // For every maneuver location compute distance from user.
    // Pick the step whose maneuver is "ahead" — heuristic: closest one whose
    // distance is greater than ~25m (already passed) OR if all are within 25m
    // pick the very last one (arrival).
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < steps.length; i++) {
      const loc = steps[i].maneuver.location;
      if (!loc) continue;
      const d = haversineMeters(userPos[0], userPos[1], loc[1], loc[0]);
      // Prefer the earliest maneuver still "ahead" (>30m away) and within 1km
      if (d > 30 && d < bestDist) {
        bestDist = d;
        bestIdx = i;
        // Stop at first reasonable upcoming maneuver
        if (d < 800) break;
      }
    }
    if (bestDist === Infinity) {
      // All maneuvers within 30m — driver is essentially at destination
      bestIdx = steps.length - 1;
      const loc = steps[bestIdx].maneuver.location;
      bestDist = loc ? haversineMeters(userPos[0], userPos[1], loc[1], loc[0]) : 0;
    }

    return {
      currentStep: steps[bestIdx],
      nextStep: steps[bestIdx + 1],
      distanceToManeuverM: bestDist,
      stepIndex: bestIdx,
    };
  }, [steps, userPos?.[0], userPos?.[1]]);
};