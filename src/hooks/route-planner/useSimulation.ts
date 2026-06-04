/**
 * useSimulation — Bølge 5 / 5.1 i .lovable/plan.md
 * -----------------------------------------------------------------------------
 * React-wrapper omkring `simulate()` fra `@/domain/routes`. Holder en stabil
 * reference til den nuværende plan (stops + employees) og giver tre
 * convenience-funktioner til UI:
 *
 *   - `run(action)` → SimulationResult
 *   - `preview(action)` → SimulationSummary (lille, billig at vise i toast)
 *   - `wouldBlock(action)` → boolean (true hvis errors)
 *
 * Bygger ikke en plan selv — call-site sender den ind så hook'en ikke kobler
 * sig til RoutePlanner-state. Den memoiserer plan-snapshottet så identiske
 * inputs ikke trigger nye allokeringer.
 */
import { useCallback, useMemo } from "react";
import {
  simulate,
  summarizeResult,
  isSafeToCommit,
  type Plan,
  type SimulationAction,
  type SimulationResult,
  type SimulationSummary,
} from "@/domain/routes";

export type UseSimulationInput = {
  stops: Plan["stops"];
  employees?: Plan["employees"];
  maxGeoKm?: number;
};

export const useSimulation = (input: UseSimulationInput) => {
  const plan = useMemo<Plan>(
    () => ({ stops: input.stops, employees: input.employees, maxGeoKm: input.maxGeoKm }),
    [input.stops, input.employees, input.maxGeoKm],
  );

  const run = useCallback(
    (actions: SimulationAction | SimulationAction[]): SimulationResult => simulate(plan, actions),
    [plan],
  );

  const preview = useCallback(
    (actions: SimulationAction | SimulationAction[]): SimulationSummary =>
      summarizeResult(simulate(plan, actions)),
    [plan],
  );

  const wouldBlock = useCallback(
    (actions: SimulationAction | SimulationAction[]): boolean => !isSafeToCommit(simulate(plan, actions)),
    [plan],
  );

  return { run, preview, wouldBlock };
};