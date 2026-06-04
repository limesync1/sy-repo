/**
 * useDragSimulation — Bølge 5 / 5.1
 * -----------------------------------------------------------------------------
 * Bro mellem den aktive drag-tilstand og `simulation-preview-context`.
 * Skriver et `SimulationSummary` ind i konteksten hver gang drag-over-target
 * skifter, så `SimulationPreviewOverlay` kan vise hvad et drop ville koste
 * INDEN brugeren slipper.
 *
 * Bygger ikke planen selv — call-site giver stops + employees + en
 * `activeData/overData` mapping til en `SimulationAction`. Returnerer ingenting;
 * den vedligeholder bare context'en som side-effect.
 */
import { useEffect, useMemo } from "react";
import {
  simulate, summarizeResult,
  type Plan, type SimulationAction,
} from "@/domain/routes";
import {
  writeSimulationPreviewDebounced,
  clearSimulationPreview,
} from "@/components/route-planner/simulation-preview-context";

export type UseDragSimulationInput = {
  /** Stops i den aktuelt synlige plan (skal stemme overens med calendarStops). */
  stops: Plan["stops"];
  employees?: Plan["employees"];
  maxGeoKm?: number;
  /** Aktiv drag-data fra @dnd-kit (eller null). */
  activeData: any;
  /** Aktuelt drag-over-target-id (fx `day:2026-05-25` eller `route:abc`). */
  overTargetId: string | null;
  /** Mapper (activeData, overTargetId) → SimulationAction. Returnér null for at slette preview. */
  toAction: (activeData: any, overTargetId: string) => SimulationAction | null;
  /** Valgfri label vist i panelet (fx "Flytter aftale til mandag"). */
  labelFor?: (activeData: any, overTargetId: string) => string | undefined;
};

export const useDragSimulation = (input: UseDragSimulationInput) => {
  const plan = useMemo<Plan>(
    () => ({ stops: input.stops, employees: input.employees, maxGeoKm: input.maxGeoKm }),
    [input.stops, input.employees, input.maxGeoKm],
  );

  useEffect(() => {
    if (!input.activeData || !input.overTargetId) {
      clearSimulationPreview();
      return;
    }
    const action = input.toAction(input.activeData, input.overTargetId);
    if (!action) {
      clearSimulationPreview();
      return;
    }
    const summary = summarizeResult(simulate(plan, action));
    writeSimulationPreviewDebounced({
      targetId: input.overTargetId,
      summary,
      label: input.labelFor?.(input.activeData, input.overTargetId),
    });
    // cleanup ved unmount/dep-skift:
    return () => { /* lad næste tick overskrive — undgår flimmer */ };
  }, [plan, input.activeData, input.overTargetId, input.toAction, input.labelFor]);
};