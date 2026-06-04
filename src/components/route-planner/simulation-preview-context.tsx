/**
 * Simulation preview context — Bølge 5 / 5.1
 * -----------------------------------------------------------------------------
 * Letvægts modul-singleton (samme mønster som `drag-validation-context`) der
 * holder den aktuelle "What-if"-preview under et drag. UI-overlay læser via
 * `useSimulationPreview()` og rendrer en lille diff-badge / -panel.
 *
 * Skrives typisk fra `onDragOver` med et beregnet `SimulationSummary` (fra
 * `useSimulation().preview(action)`). Ryddes på drag-end via
 * `clearSimulationPreview()`.
 */
import { useSyncExternalStore } from "react";
import type { SimulationSummary } from "@/domain/routes";

export type SimulationPreview = {
  targetId: string;
  summary: SimulationSummary;
  /** Kort label (fx "Flytter 1 stop til mandag"). */
  label?: string;
};

let current: SimulationPreview | null = null;
const listeners = new Set<() => void>();
const emit = () => { for (const l of listeners) l(); };

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => { listeners.delete(l); };
};
const getSnapshot = () => current;

export function setSimulationPreview(v: SimulationPreview | null) {
  if (v === current) return;
  if (
    v && current &&
    v.targetId === current.targetId &&
    v.label === current.label &&
    v.summary.movedCount === current.summary.movedCount &&
    v.summary.reassignedCount === current.summary.reassignedCount &&
    v.summary.cancelledCount === current.summary.cancelledCount &&
    v.summary.errorCount === current.summary.errorCount &&
    v.summary.warningCount === current.summary.warningCount &&
    v.summary.conflictCount === current.summary.conflictCount
  ) return;
  current = v;
  emit();
}
export function clearSimulationPreview() { setSimulationPreview(null); }

export function useSimulationPreview(): SimulationPreview | null {
  return useSyncExternalStore(subscribe, getSnapshot, () => null);
}

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
export function writeSimulationPreviewDebounced(v: SimulationPreview | null, delayMs = 80) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    setSimulationPreview(v);
  }, delayMs);
}