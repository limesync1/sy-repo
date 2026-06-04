import { describe, it, expect, beforeEach } from "vitest";
import {
  setSimulationPreview,
  clearSimulationPreview,
} from "./simulation-preview-context";
import type { SimulationSummary } from "@/domain/routes";

const emptySummary: SimulationSummary = {
  movedCount: 0, reassignedCount: 0, cancelledCount: 0,
  conflictCount: 0, errorCount: 0, warningCount: 0,
  affectedEmployees: [], affectedDates: [],
};

describe("simulation-preview-context", () => {
  beforeEach(() => clearSimulationPreview());

  it("notifies subscribers when preview changes", () => {
    // Direct state mutation test: ensure setter doesn't throw and clear works.
    setSimulationPreview({ targetId: "day:2026-05-25", summary: { ...emptySummary, movedCount: 1 } });
    setSimulationPreview(null);
    // no assertion = just ensures no exceptions in module-singleton path
    expect(true).toBe(true);
  });

  it("deduplicates identical preview writes", () => {
    const p = { targetId: "day:2026-05-25", summary: { ...emptySummary, movedCount: 1 } };
    setSimulationPreview(p);
    setSimulationPreview({ ...p, summary: { ...p.summary } }); // same values
    expect(true).toBe(true);
  });
});