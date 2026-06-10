/**
 * Pure helper for "next-ready occurrence per base route" — keeps client
 * and database logic in sync (SQL counterpart:
 * `materialize_next_occurrence_for_base_route`).
 *
 * Rule: only ONE future occurrence per base route is allowed to be
 * "ready" at a time. When the latest concrete occurrence still has open
 * stops, no new occurrence should be prepared — return `null`.
 */

export type LatestOccurrence = {
  /** ISO date (YYYY-MM-DD) of the latest materialized child route. */
  routeDate: string;
  /** True when every stop on that route is completed/cancelled. */
  fullyDone: boolean;
};

export type ComputeNextReadyInput = {
  /** Latest concrete materialized child of the base route, or null. */
  latestOccurrence: LatestOccurrence | null;
  /**
   * Next projected agreement-driven date STRICTLY AFTER the latest
   * occurrence's date (or after `today` if none) — `null` if no future
   * occurrence is projected.
   */
  nextProjectedDate: string | null;
  /** Today as ISO date. Used as floor when no latest occurrence exists. */
  today: string;
};

export function computeNextReadyDate(input: ComputeNextReadyInput): string | null {
  const { latestOccurrence, nextProjectedDate, today } = input;

  // One-at-a-time: if latest still has open stops, do not prepare ahead.
  if (latestOccurrence && !latestOccurrence.fullyDone) return null;

  if (!nextProjectedDate) return null;

  // Never return past dates.
  if (nextProjectedDate < today) return null;

  // When a latest exists, next must be strictly after it.
  if (latestOccurrence && nextProjectedDate <= latestOccurrence.routeDate) {
    return null;
  }

  return nextProjectedDate;
}