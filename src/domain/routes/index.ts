/**
 * src/domain/routes — Bølge 2 / 2.1 i .lovable/plan.md
 * -----------------------------------------------------------------------------
 * Stabil offentlig flade for rute-domænet. UI og hooks bør importere herfra
 * — ikke direkte fra `@/lib/route-*` — så vi kan flytte de underliggende
 * filer ind under `src/domain/routes/` uden at røre call-sites.
 *
 * Indtil videre re-eksporterer barrel'et de eksisterende lib-moduler. Den
 * fysiske flytning af filerne kan ske trinvist uden at break'e imports.
 */

export * from "./drop-decision";
export * from "./projection-engine";
export * from "./conflict-engine";
export * from "./simulation";

// Re-eksport af eksisterende rene moduler (uændret adfærd).
export {
  validateRouteMove,
  validateStopAssignment,
  validateMerge,
  validateIntervalChange,
  validateDeleteRoute,
  topIssue,
  distanceKm,
} from "@/lib/route-validation";
export type {
  ValidationResult,
  Suggestion,
  RouteMoveCtx,
  StopAssignmentCtx,
  MergeCtx,
  IntervalChangeCtx,
  DeleteRouteCtx,
} from "@/lib/route-validation";

export { detectConflicts } from "@/lib/route-conflicts";
export type { Conflict, ConflictStop } from "@/lib/route-conflicts";

export { runProjection } from "@/lib/route-projection";
export type {
  ProjectionInput,
  ProjectionResult,
  ProjectionSource,
  ProjectedRoute,
  AgreementOccurrenceOverride,
  AgreementPauseRange,
  RouteOccurrenceExceptionLike,
} from "@/lib/route-projection";

export {
  expandRecurringRoutes,
  expandProjectionWindowForShiftedOccurrences,
  resolveProjectionExceptions,
  applyProjectedOccurrenceShifts,
  recurringSourceKeysForStop,
  intervalToDays,
} from "@/lib/recurring-projection";

export {
  estimateOptimizationGain,
  markOptimizeDismissed,
} from "@/lib/optimize-savings-estimate";
export type { OptimizeEstimate } from "@/lib/optimize-savings-estimate";

export {
  classifyDrop,
  dropKeyFor,
  targetKeyFor,
  computeTargetDateForGuard,
} from "@/lib/route-planner/drop-classifier";
export type { DropKind } from "@/lib/route-planner/drop-classifier";