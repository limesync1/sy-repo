import type { StopTimeEntry } from "@/hooks/useRoutes";

/** Merge overlapping intervals, counting one employee's time only once. */
export function runMetrics(start: number | null, end: number, entries: StopTimeEntry[], employeeId?: string) {
  const intervals = entries.filter(e => e.employee_id === employeeId).map(e => [
    new Date(e.started_at).getTime(), e.ended_at ? new Date(e.ended_at).getTime() : end,
  ]).filter(([a, b]) => Number.isFinite(a) && Number.isFinite(b) && b >= a).sort((a, b) => a[0] - b[0]);
  const sum = (ranges: number[][]) => {
    let total = 0, until = -Infinity;
    for (const [a, b] of ranges) { total += Math.max(0, b - Math.max(a, until)); until = Math.max(until, b); }
    return Math.floor(total / 1000);
  };
  const customerSeconds = sum(intervals);
  const clipped = start == null ? [] : intervals.map(([a, b]) => [Math.max(a, start), Math.min(b, end)]).filter(([a, b]) => b >= a);
  // Time outside work includes parking/breaks: explicitly an estimate, not GPS-measured driving.
  const driveEstimateSeconds = start == null || end < start ? null : Math.max(0, Math.floor((end - start) / 1000) - sum(clipped));
  return { customerSeconds, driveEstimateSeconds };
}