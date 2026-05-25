/**
 * Centrale validatorer for rutekalenderen.
 *
 * Hver validator er en REN funktion: den får alt den skal bruge ind via
 * parametre og returnerer et `ValidationResult`. Ingen netværks-kald, ingen
 * react-query, ingen toasts — det gør dem nemme at unit-teste og at køre
 * synkront under fx drag-over for live-feedback.
 */

import { parseISO, differenceInCalendarDays } from "date-fns";
import { Issue, makeIssue } from "./route-errors";

export type Suggestion = {
  label: string;
  description?: string;
  action: string; // maskin-læsbart token; UI mapper til onClick
  payload?: Record<string, any>;
};

export type ValidationResult = {
  ok: boolean;
  errors: Issue[];
  warnings: Issue[];
  suggestions: Suggestion[];
};

const ok = (): ValidationResult => ({ ok: true, errors: [], warnings: [], suggestions: [] });

const merge = (...parts: ValidationResult[]): ValidationResult => {
  const errors = parts.flatMap((p) => p.errors);
  const warnings = parts.flatMap((p) => p.warnings);
  const suggestions = parts.flatMap((p) => p.suggestions);
  return { ok: errors.length === 0, errors, warnings, suggestions };
};

/** Helper — pak et issue ind i en ValidationResult. */
const issueResult = (issue: Issue, suggestions: Suggestion[] = []): ValidationResult => ({
  ok: issue.severity !== "error",
  errors: issue.severity === "error" ? [issue] : [],
  warnings: issue.severity === "warning" ? [issue] : [],
  suggestions,
});

/* ─────────────────────────────────────────
   Geografi — simpel haversine for advarsler
   ───────────────────────────────────────── */

const EARTH_KM = 6371;
export function distanceKm(a?: { lat?: number | null; lng?: number | null } | null,
                            b?: { lat?: number | null; lng?: number | null } | null): number | null {
  if (!a?.lat || !a?.lng || !b?.lat || !b?.lng) return null;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat); const lat2 = toRad(b.lat);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * EARTH_KM * Math.asin(Math.sqrt(h)));
}

/* ─────────────────────────────────────────
   Validatorer
   ───────────────────────────────────────── */

export type RouteMoveCtx = {
  /** Eksisterende ruter på target-datoen, samme base_route_id eller serie. */
  seriesRoutesOnTargetDate?: { id: string; route_date: string }[];
  /** Shift-exceptions der allerede peger på target-datoen for samme base. */
  shiftsTargetingDate?: { occurrence_date: string }[];
  /** Lukkedage i firmaet. */
  holidayOnDate?: { name?: string | null } | null;
  /** Påbegyndte stop i ruten i dag (in_progress/completed). */
  routeIsActiveToday?: boolean;
};

export function validateRouteMove(
  route: { id: string; route_date: string; isVirtual?: boolean; baseRouteId?: string | null },
  newDate: string,
  ctx: RouteMoveCtx = {},
): ValidationResult {
  const today = new Date().toISOString().slice(0, 10);
  if (!newDate || newDate.length < 10) return issueResult(makeIssue("UNKNOWN_ERROR", { detail: "ugyldig dato" }));
  if (newDate < today) return issueResult(makeIssue("ROUTE_DATE_IN_PAST", { date: newDate }));
  if (newDate === route.route_date) return issueResult(makeIssue("SHIFT_SAME_DATE"));

  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const suggestions: Suggestion[] = [];

  if (ctx.seriesRoutesOnTargetDate?.length) {
    errors.push(makeIssue("SERIES_COLLISION_ON_DATE", { date: newDate },
      { affectedIds: ctx.seriesRoutesOnTargetDate.map((r) => r.id) }));
    suggestions.push({
      label: "Flet med eksisterende rute",
      action: "open-merge",
      payload: { sourceId: route.id, targetId: ctx.seriesRoutesOnTargetDate[0].id },
    });
  }
  if (ctx.shiftsTargetingDate?.length) {
    errors.push(makeIssue("ANOTHER_SHIFT_TARGETS_DATE", { date: newDate }));
  }
  if (ctx.holidayOnDate) {
    warnings.push(makeIssue("HOLIDAY_BLOCKED_DATE", { date: newDate, name: ctx.holidayOnDate.name }));
  }
  if (ctx.routeIsActiveToday) {
    warnings.push(makeIssue("ROUTE_DATE_TODAY_LOCKED"));
  }

  return { ok: errors.length === 0, errors, warnings, suggestions };
}

export type StopAssignmentCtx = {
  /** Andre stops samme dag (på tværs af alle ruter). Bruges til kunde- og aftaledubletter. */
  otherStopsSameDay?: Array<{
    id: string;
    order_id?: string | null;
    subscription_id?: string | null;
    agreement_occurrence_id?: string | null;
    customer_id?: string | null;
    customer_name?: string | null;
  }>;
  /** Stops der allerede ligger på målruten. */
  stopsOnTargetRoute?: Array<{ id: string; latitude?: number | null; longitude?: number | null }>;
  /** Estimater til kapacitets-checks. */
  estimatedRouteLengthKmAfter?: number | null;
  estimatedRouteHoursAfter?: number | null;
  estimatedStopCountAfter?: number | null;
};

export function validateStopAssignment(
  stop: {
    id?: string | null;
    order_id?: string | null;
    subscription_id?: string | null;
    agreement_occurrence_id?: string | null;
    customer_id?: string | null;
    customer_name?: string | null;
    latitude?: number | null;
    longitude?: number | null;
  },
  targetRoute: { id: string; route_date: string; isVirtual?: boolean },
  ctx: StopAssignmentCtx = {},
): ValidationResult {
  if (targetRoute.isVirtual) return issueResult(makeIssue("PROJECTED_ROUTE_LOCKED"));

  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  const suggestions: Suggestion[] = [];

  // Aftale-/ordre-dubletter på samme dag (hård fejl).
  const same = (ctx.otherStopsSameDay ?? []).filter((s) =>
    (stop.order_id && s.order_id === stop.order_id) ||
    (stop.subscription_id && s.subscription_id === stop.subscription_id) ||
    (stop.agreement_occurrence_id && s.agreement_occurrence_id === stop.agreement_occurrence_id)
  );
  if (same.length > 0) {
    errors.push(makeIssue("DUPLICATE_AGREEMENT_SAME_DAY",
      { customerName: stop.customer_name, date: targetRoute.route_date },
      { affectedIds: same.map((s) => s.id) }));
  }

  // Kunde-dublet (samme kunde, anden aftale samme dag) — kun warning.
  if (errors.length === 0 && stop.customer_id) {
    const sameCustomer = (ctx.otherStopsSameDay ?? []).filter((s) => s.customer_id === stop.customer_id);
    if (sameCustomer.length > 0) {
      warnings.push(makeIssue("DUPLICATE_CUSTOMER_SAME_DAY",
        { customerName: stop.customer_name, date: targetRoute.route_date },
        { affectedIds: sameCustomer.map((s) => s.id) }));
    }
  }

  // Geografisk spring — find nærmeste eksisterende stop og advar hvis >40 km.
  if (stop.latitude && stop.longitude && ctx.stopsOnTargetRoute?.length) {
    let min = Infinity;
    for (const s of ctx.stopsOnTargetRoute) {
      const d = distanceKm({ lat: stop.latitude, lng: stop.longitude }, { lat: s.latitude, lng: s.longitude });
      if (d !== null && d < min) min = d;
    }
    if (min !== Infinity && min > 40) {
      warnings.push(makeIssue("GEOGRAPHIC_GAP_TOO_LARGE", { km: min }));
      suggestions.push({ label: "Optimér rækkefølge efter slip", action: "optimize-route", payload: { routeId: targetRoute.id } });
    }
  }

  // Kapacitet.
  if ((ctx.estimatedStopCountAfter ?? 0) > 12) {
    warnings.push(makeIssue("ROUTE_OVER_CAPACITY", { currentCount: ctx.estimatedStopCountAfter }));
  }
  if ((ctx.estimatedRouteLengthKmAfter ?? 0) > 150) {
    warnings.push(makeIssue("ROUTE_TOO_LONG_KM", { km: Math.round(ctx.estimatedRouteLengthKmAfter!) }));
  }
  if ((ctx.estimatedRouteHoursAfter ?? 0) > 9) {
    warnings.push(makeIssue("ROUTE_TOO_LONG_HOURS", { hours: ctx.estimatedRouteHoursAfter!.toFixed(1) }));
  }

  return { ok: errors.length === 0, errors, warnings, suggestions };
}

export type MergeCtx = {
  sourceIsVirtual?: boolean;
  targetIsVirtual?: boolean;
  agreementOverlapCount?: number;
  capacityAfter?: { stops?: number; km?: number; hours?: number };
};

export function validateMerge(
  source: { id: string; route_date: string },
  target: { id: string; route_date: string },
  ctx: MergeCtx = {},
): ValidationResult {
  if (source.id === target.id) {
    return issueResult(makeIssue("UNKNOWN_ERROR", { detail: "Kilde og mål er samme rute" }));
  }
  if (ctx.sourceIsVirtual && ctx.targetIsVirtual) {
    return issueResult(makeIssue("MERGE_PROJECTION_INTO_PROJECTION"));
  }
  const parts: ValidationResult[] = [];
  if (ctx.sourceIsVirtual || ctx.targetIsVirtual) {
    parts.push(issueResult(makeIssue("MERGE_PROJECTION_INTO_REAL", { date: source.route_date })));
  }
  if ((ctx.capacityAfter?.stops ?? 0) > 12) {
    parts.push(issueResult(makeIssue("ROUTE_OVER_CAPACITY", { currentCount: ctx.capacityAfter?.stops })));
  }
  if ((ctx.capacityAfter?.km ?? 0) > 150) {
    parts.push(issueResult(makeIssue("ROUTE_TOO_LONG_KM", { km: Math.round(ctx.capacityAfter!.km!) })));
  }
  return parts.length ? merge(...parts) : ok();
}

export type IntervalChangeCtx = {
  conflictDates?: string[]; // datoer hvor ny cadence kolliderer med eksisterende ruter
  addedDates?: string[];
  removedDates?: string[];
};

export function validateIntervalChange(ctx: IntervalChangeCtx): ValidationResult {
  const warnings: Issue[] = [];
  if ((ctx.conflictDates?.length ?? 0) > 0) {
    warnings.push(makeIssue("SERIES_COLLISION_ON_DATE", { date: ctx.conflictDates![0] },
      { affectedIds: ctx.conflictDates }));
  }
  return { ok: true, errors: [], warnings, suggestions: [] };
}

export type DeleteRouteCtx = {
  completedStopsCount?: number;
  futureProjectionCount?: number;
  isBaseRoute?: boolean;
};

export function validateDeleteRoute(ctx: DeleteRouteCtx): ValidationResult {
  const errors: Issue[] = [];
  const warnings: Issue[] = [];
  if ((ctx.completedStopsCount ?? 0) > 0) {
    errors.push(makeIssue("ROUTE_HAS_COMPLETED_STOPS", { completedCount: ctx.completedStopsCount }));
  }
  if (ctx.isBaseRoute && (ctx.futureProjectionCount ?? 0) > 0) {
    warnings.push(makeIssue("ROUTE_HAS_FUTURE_PROJECTIONS", { count: ctx.futureProjectionCount }));
  }
  return { ok: errors.length === 0, errors, warnings, suggestions: [] };
}

/** Hent førstebedste fejl/advarsel til hurtigt tooltip/badge. */
export function topIssue(r: ValidationResult): Issue | null {
  return r.errors[0] ?? r.warnings[0] ?? null;
}