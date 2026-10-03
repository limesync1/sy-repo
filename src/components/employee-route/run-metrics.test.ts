import { describe, expect, it } from "vitest";
import { runMetrics } from "./run-metrics";
import type { StopTimeEntry } from "@/hooks/useRoutes";
const entry = (a: number, b: number | null, employee_id = "me") => ({ employee_id, started_at: new Date(a).toISOString(), ended_at: b == null ? null : new Date(b).toISOString() } as StopTimeEntry);
describe("shared route timing", () => {
  it("excludes customer work from elapsed route time", () => expect(runMetrics(0, 600000, [entry(120000, 300000)], "me")).toEqual({ customerSeconds: 180, driveEstimateSeconds: 420 }));
  it("merges overlapping work and ignores other employees", () => expect(runMetrics(0, 600000, [entry(0, 300000), entry(120000, 360000), entry(0, 600000, "other")], "me")).toEqual({ customerSeconds: 360, driveEstimateSeconds: 240 }));
  it("clips work predating route start and freezes at completion", () => expect(runMetrics(300000, 600000, [entry(0, null)], "me")).toEqual({ customerSeconds: 600, driveEstimateSeconds: 0 }));
  it("does not invent a start for historic routes", () => expect(runMetrics(null, 600000, [], "me").driveEstimateSeconds).toBeNull());
});