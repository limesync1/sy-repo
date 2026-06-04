/**
 * Simulation engine — Bølge 5 / 5.1 i .lovable/plan.md
 * -----------------------------------------------------------------------------
 * "Dry-run" af planner-actions. Tager et snapshot af planen (`Plan`) + en
 * action og returnerer:
 *   - den nye plan efter actionen
 *   - en diff (hvilke stops blev flyttet/oprettet/aflyst)
 *   - alle konflikter fundet af `ConflictEngine` på den nye plan
 *
 * Ingen DB-skriv, ingen toasts, ingen React — ren funktion. Bygger på
 * ConflictEngine (2.3) og er forudsætning for en kommende "What-if"-UI.
 */

import { evaluateConflicts, type Plan, type PlanStop, type PlanConflict } from "./conflict-engine";

export type SimulationAction =
  | { type: "MOVE_STOP"; stopId: string; toEmployeeId: string | null; toDate?: string }
  | { type: "REASSIGN"; stopId: string; employeeIds: string[] }
  | { type: "CANCEL_STOP"; stopId: string }
  | { type: "MOVE_ROUTE"; routeId: string; toDate: string };

export type SimulationChange = {
  stopId: string;
  kind: "moved" | "reassigned" | "cancelled";
  before: { employeeIds: string[]; date: string | null };
  after: { employeeIds: string[]; date: string | null };
};

export type SimulationResult = {
  plan: Plan;
  changes: SimulationChange[];
  conflicts: PlanConflict[];
  /** Antal stops i før-planen der ikke længere matcher i efter-planen. */
  diffCount: number;
};

const cloneStop = (s: PlanStop): PlanStop => ({
  ...s,
  employee_ids: [...(s.employee_ids || [])],
  requiredSkills: s.requiredSkills ? [...s.requiredSkills] : undefined,
});

const applyAction = (plan: Plan, action: SimulationAction): { plan: Plan; changes: SimulationChange[] } => {
  const next = plan.stops.map(cloneStop);
  const changes: SimulationChange[] = [];

  const recordChange = (idx: number, before: PlanStop, kind: SimulationChange["kind"]) => {
    const after = next[idx];
    changes.push({
      stopId: after.id,
      kind,
      before: { employeeIds: before.employee_ids || [], date: before.route_date ?? null },
      after: { employeeIds: after.employee_ids || [], date: after.route_date ?? null },
    });
  };

  switch (action.type) {
    case "MOVE_STOP": {
      const idx = next.findIndex((s) => s.id === action.stopId);
      if (idx === -1) break;
      const before = cloneStop(next[idx]);
      next[idx].employee_ids = action.toEmployeeId ? [action.toEmployeeId] : [];
      if (action.toDate) next[idx].route_date = action.toDate;
      recordChange(idx, before, "moved");
      break;
    }
    case "REASSIGN": {
      const idx = next.findIndex((s) => s.id === action.stopId);
      if (idx === -1) break;
      const before = cloneStop(next[idx]);
      next[idx].employee_ids = [...action.employeeIds];
      recordChange(idx, before, "reassigned");
      break;
    }
    case "CANCEL_STOP": {
      const idx = next.findIndex((s) => s.id === action.stopId);
      if (idx === -1) break;
      const before = cloneStop(next[idx]);
      next.splice(idx, 1);
      changes.push({
        stopId: action.stopId,
        kind: "cancelled",
        before: { employeeIds: before.employee_ids || [], date: before.route_date ?? null },
        after: { employeeIds: [], date: null },
      });
      break;
    }
    case "MOVE_ROUTE": {
      for (let i = 0; i < next.length; i += 1) {
        if ((next[i] as any).route_id !== action.routeId) continue;
        const before = cloneStop(next[i]);
        next[i].route_date = action.toDate;
        recordChange(i, before, "moved");
      }
      break;
    }
  }

  return { plan: { ...plan, stops: next }, changes };
};

/**
 * Kør et eller flere planner-actions dry-run. Returnerer den hypotetiske
 * plan + alle konflikter den ville udløse.
 */
export const simulate = (
  plan: Plan,
  actions: SimulationAction | SimulationAction[],
): SimulationResult => {
  const queue = Array.isArray(actions) ? actions : [actions];
  let current: Plan = { ...plan, stops: plan.stops.map(cloneStop) };
  const allChanges: SimulationChange[] = [];
  for (const a of queue) {
    const { plan: next, changes } = applyAction(current, a);
    current = next;
    allChanges.push(...changes);
  }
  const conflicts = evaluateConflicts(current);
  return {
    plan: current,
    changes: allChanges,
    conflicts,
    diffCount: allChanges.length,
  };
};

/* ─── Hjælpere til UI ─────────────────────────────────────────────────── */

export type SimulationSummary = {
  movedCount: number;
  reassignedCount: number;
  cancelledCount: number;
  conflictCount: number;
  errorCount: number;
  warningCount: number;
  affectedEmployees: string[];
  affectedDates: string[];
};

/**
 * Komprimerer et `SimulationResult` til tal/lister der nemt kan vises i en
 * "What-if"-toast eller diff-panel uden ekstra mapping i UI'et.
 */
export const summarizeResult = (result: SimulationResult): SimulationSummary => {
  const emp = new Set<string>();
  const dates = new Set<string>();
  let moved = 0, reassigned = 0, cancelled = 0;
  for (const ch of result.changes) {
    if (ch.kind === "moved") moved += 1;
    else if (ch.kind === "reassigned") reassigned += 1;
    else if (ch.kind === "cancelled") cancelled += 1;
    for (const id of [...ch.before.employeeIds, ...ch.after.employeeIds]) emp.add(id);
    if (ch.before.date) dates.add(ch.before.date);
    if (ch.after.date) dates.add(ch.after.date);
  }
  let errors = 0, warnings = 0;
  for (const c of result.conflicts) {
    if (c.severity === "error") errors += 1;
    else if (c.severity === "warning") warnings += 1;
  }
  return {
    movedCount: moved,
    reassignedCount: reassigned,
    cancelledCount: cancelled,
    conflictCount: result.conflicts.length,
    errorCount: errors,
    warningCount: warnings,
    affectedEmployees: [...emp].sort(),
    affectedDates: [...dates].sort(),
  };
};

/**
 * Bekvemmeligheds-check: er actionen sikker at committe? Returnerer false hvis
 * simulationen forudsiger error-konflikter. Warnings blokerer ikke.
 */
export const isSafeToCommit = (result: SimulationResult): boolean => {
  return !result.conflicts.some((c) => c.severity === "error");
};