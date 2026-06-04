// Route projection engine — Phase 1 af refaktorerings-planen.
//
// Dette modul er et tyndt, eksplicit orkestreringslag oven på de eksisterende
// rene funktioner i `src/lib/recurring-projection.ts`. Formålet er at samle
// kæden af projekterings-trin ét sted, så `RoutePlanner.tsx` og fremtidige
// hooks (`useProjectedCalendar`) kan kalde `runProjection(...)` i stedet for
// at orkestrere trinnene selv.
//
// Rækkefølgen er KRITISK og dokumenteret i README. Hvert trin er en pure
// funktion uden side effects — alle inputs ind, alt output ud.
//
//   buildSources()               // (eksternt — RecurringSource[])
//     → expandWindow()           // udvid range hvis shifted-occurrences ligger på kanten
//     → expandCadence()          // expandRecurringRoutes: cadence + overrides + pauses + holidays + dedup mod ægte ruter
//     → applyShifts()            // flyt occurrences til nye datoer fra route_occurrence_exceptions
//     → filterAgainstRealStops() // klip projektioner væk hvor en aftale allerede har et rigtigt stop
//
// Output: `ProjectedRoute[]` klar til at blive samlet med basisrutens stops
// i UI-laget (det sidste trin er view-specifikt og ligger fortsat i komponenten).

import {
  expandRecurringRoutes,
  expandProjectionWindowForShiftedOccurrences,
  resolveProjectionExceptions,
  applyProjectedOccurrenceShifts,
  recurringSourceKeysForStop,
  type ProjectedRoute,
  type AgreementOccurrenceOverride,
  type AgreementPauseRange,
  type RouteOccurrenceExceptionLike,
} from "@/lib/recurring-projection";

export type { ProjectedRoute, AgreementOccurrenceOverride, AgreementPauseRange, RouteOccurrenceExceptionLike };

/** Minimum-fælles-multipel for en projekterings-kilde, så engine ikke
 *  afhænger af det interne `RecurringSource` shape. */
export type ProjectionSource = {
  id: string;
  interval: string;
  interval_days?: number | null;
  seed_date: string | null;
  anchor_date?: string | null;
  preferred_route_id: string | null;
  sourceKeys?: string[];
  agreement_id?: string | null;
};

export type ProjectionInput = {
  sources: ProjectionSource[];
  /** Synligt kalender-vindue (yyyy-MM-dd). */
  rangeStart: string;
  rangeEnd: string;
  /** Materialiserede ruter — `${baseRouteId}|${yyyy-MM-dd}`. */
  realRouteDates: Set<string>;
  /** Rigtige stops i samme range — bruges til at dedupe projektioner pr. aftalekilde. */
  realStops?: Array<Record<string, any>>;
  /** route_date pr. rigtig rute (id → yyyy-MM-dd). Bruges sammen med realStops. */
  realRouteDateById?: Map<string, string>;
  overrides?: AgreementOccurrenceOverride[];
  pauses?: AgreementPauseRange[];
  holidayDates?: Iterable<string>;
  exceptions?: RouteOccurrenceExceptionLike[];
  onUnprojectable?: (source: ProjectionSource, reason: "missing_route" | "missing_seed" | "invalid_interval") => void;
};

export type ProjectionResult = {
  projections: ProjectedRoute[];
  /** Replacement-route-ids der har modtaget en flyttet forekomst. UI kan
   *  bruge dette til at skjule den oprindelige projektion. */
  movedReplacementRouteIds: Set<string>;
  /** Set af `${baseRouteId}|${yyyy-MM-dd}` der er flyttet bort. */
  suppressedProjectionKeys: Set<string>;
  /** Map fra original `${baseRouteId}|${yyyy-MM-dd}` til ny dato (yyyy-MM-dd). */
  shiftsByOriginal: Map<string, string>;
  /** Det udvidede projekterings-vindue der faktisk blev brugt. */
  effectiveRange: { rangeStart: string; rangeEnd: string };
};

/**
 * Orkestrerer hele projekterings-kæden. Erstatter den inline-blok i
 * `RoutePlanner.tsx` (linje ~1520–1590) der i dag kalder de samme trin
 * manuelt. UI-specifik sammensætning af basisrutens stops sker stadig i
 * komponenten — denne funktion returnerer kun rene projektions-rækker.
 */
export const runProjection = (input: ProjectionInput): ProjectionResult => {
  const realRouteIds = new Set<string>();
  if (input.realRouteDateById) {
    for (const id of input.realRouteDateById.keys()) realRouteIds.add(id);
  }

  const { suppressedProjectionKeys, shiftsByOriginal, movedReplacementRouteIds } =
    resolveProjectionExceptions(input.exceptions ?? [], realRouteIds);

  // Aflyste/flyttede forekomster må ikke projiceres → tilføj til realRouteDates
  // så `expandRecurringRoutes` springer dem over.
  const realKeys = new Set(input.realRouteDates);
  for (const key of suppressedProjectionKeys) realKeys.add(key);

  const effectiveRange = expandProjectionWindowForShiftedOccurrences(
    input.rangeStart,
    input.rangeEnd,
    input.exceptions ?? [],
  );

  const raw = expandRecurringRoutes({
    sources: input.sources as any,
    rangeStart: effectiveRange.rangeStart,
    rangeEnd: effectiveRange.rangeEnd,
    realRouteDates: realKeys,
    overrides: input.overrides,
    pauses: input.pauses,
    holidayDates: input.holidayDates,
    onUnprojectable: input.onUnprojectable as any,
  });

  const shifted = applyProjectedOccurrenceShifts(raw, shiftsByOriginal, realKeys);

  // Dedup mod rigtige stops på samme dato/aftalekilde — så vi ikke får både
  // en projiceret og en materialiseret forekomst af samme aftale samme dag.
  const realSourceKeysByDate = new Map<string, Set<string>>();
  if (input.realStops && input.realRouteDateById) {
    for (const stop of input.realStops) {
      const routeId = stop?.route_id;
      if (!routeId) continue;
      const date = input.realRouteDateById.get(routeId);
      if (!date) continue;
      const keys = recurringSourceKeysForStop(stop);
      if (keys.length === 0) continue;
      const set = realSourceKeysByDate.get(date) ?? new Set<string>();
      for (const k of keys) set.add(k);
      realSourceKeysByDate.set(date, set);
    }
  }

  const projections: ProjectedRoute[] = [];
  for (const p of shifted) {
    const dateRealKeys = realSourceKeysByDate.get(p.date);
    if (!dateRealKeys || dateRealKeys.size === 0) {
      projections.push(p);
      continue;
    }
    const remaining = p.sourceKeys.filter((k) => !dateRealKeys.has(k));
    if (remaining.length === 0) continue;
    projections.push({ ...p, sourceKeys: remaining });
  }

  return {
    projections,
    movedReplacementRouteIds,
    suppressedProjectionKeys,
    shiftsByOriginal,
    effectiveRange,
  };
};