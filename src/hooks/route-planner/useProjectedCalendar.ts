// useProjectedCalendar — Fase 2 af refaktorerings-planen (.lovable/plan.md).
//
// Pakker den ~200 linjer store useMemo der byggede virtuelle (projicerede)
// kalender-ruter ind i en dedikeret hook. Inputs er rene data; output er
// `CalendarRoute[]` klar til at vises i kalenderen.
//
// Selve projekterings-kæden (cadence + overrides + pauser + helligdage +
// shifts + dedup) ligger i `src/lib/route-projection/` (Fase 1). Denne hook
// håndterer UI-specifik sammensætning: arv af navn/farve, syntese af
// placeholder-stops, og medarbejder-tilknytning pr. virtuel rute.
import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import {
  projectedStopMatchesSources,
  recurringSourceKeysForStop,
} from "@/lib/recurring-projection";
import { runProjection } from "@/lib/route-projection";
import type { CalendarRoute } from "@/components/route-planner/MonthWeekCalendar";

type AnyRoute = Record<string, any>;
type AnyStop = Record<string, any>;

export type UseProjectedCalendarInput = {
  recurringSources: any[];
  recurringBaseRoutes: AnyRoute[];
  calendarRoutes: AnyRoute[];
  calendarRoutesRaw: AnyRoute[];
  visibleCalendarStops: AnyStop[];
  activeEmployees: any[];
  occurrenceOverrides: any[];
  agreementPauses: { agreement_id: string; start_date: string; end_date: string }[];
  businessHolidays: { holiday_date: string }[];
  routeOccurrenceExceptions: any[];
  calendarRangeStart: string;
  calendarRangeEnd: string;
};

export const useProjectedCalendar = (input: UseProjectedCalendarInput): CalendarRoute[] => {
  const {
    recurringSources,
    recurringBaseRoutes,
    calendarRoutes,
    calendarRoutesRaw,
    visibleCalendarStops,
    activeEmployees,
    occurrenceOverrides,
    agreementPauses,
    businessHolidays,
    routeOccurrenceExceptions,
    calendarRangeStart,
    calendarRangeEnd,
  } = input;

  return useMemo<CalendarRoute[]>(() => {
    if (!recurringSources.length) return [];

    // Map fra source-key til aftalens interval — bruges til at hejse
    // intervallet ned på projicerede stops uden agreement_occurrence-link.
    const intervalByKey = new Map<string, string>();
    for (const src of recurringSources) {
      if (!src.interval) continue;
      for (const key of src.sourceKeys ?? []) {
        if (!intervalByKey.has(key)) intervalByKey.set(key, src.interval);
      }
    }
    const intervalForStop = (s: any): string | null => {
      for (const k of recurringSourceKeysForStop(s)) {
        const iv = intervalByKey.get(k);
        if (iv) return iv;
      }
      return null;
    };

    const anchoredSourceKeys = new Set<string>();
    for (const src of recurringSources as any[]) {
      if (!src.anchor_date) continue;
      for (const key of src.sourceKeys || []) anchoredSourceKeys.add(key);
    }

    // Færdige navne/farver pr. basisrute (samme logik som rigtige rute-kort).
    const resolvedBaseById = new Map<string, { name: string | null; color: string | null }>();
    for (const r of calendarRoutes as any[]) {
      resolvedBaseById.set(r.id, { name: r.name || null, color: r.color || null });
    }

    // Basisrute-opslag med fallback til rå-data.
    const baseById = new Map<string, AnyRoute>();
    for (const r of recurringBaseRoutes) baseById.set(r.id, r);
    for (const r of calendarRoutesRaw) {
      if (!baseById.has(r.id)) baseById.set(r.id, r);
    }

    // Suppress-keys: både basisrutens dato og evt. materialiserede overrides.
    const realKeys = new Set<string>();
    for (const r of calendarRoutesRaw) {
      realKeys.add(`${r.id}|${r.route_date}`);
      if ((r as any).base_route_id) {
        realKeys.add(`${(r as any).base_route_id}|${r.route_date}`);
      }
    }

    // Pr. basisrute: laveste dato hvor en rigtig rute ligger — klipper
    // projektioner væk der ellers ville dukke op før basisrutens egen dato.
    const minDateByBaseRouteId = new Map<string, string>();
    for (const r of calendarRoutesRaw) {
      const baseId = (r as any).base_route_id || r.id;
      const d = String(r.route_date).slice(0, 10);
      const existing = minDateByBaseRouteId.get(baseId);
      if (!existing || d > existing) minDateByBaseRouteId.set(baseId, d);
    }

    const realRouteDateById = new Map<string, string>();
    for (const r of calendarRoutesRaw) {
      realRouteDateById.set(r.id, String(r.route_date).slice(0, 10));
    }

    const isLiveProjectedStop = (s: any) => {
      const eff = (s.occurrence_status as string | null | undefined) ?? s.status;
      return eff !== "completed" && eff !== "cancelled";
    };

    const { projections: shifted, movedReplacementRouteIds, shiftsByOriginal } = runProjection({
      sources: recurringSources as any,
      rangeStart: calendarRangeStart,
      rangeEnd: calendarRangeEnd,
      realRouteDates: realKeys,
      realStops: visibleCalendarStops as any[],
      realRouteDateById,
      overrides: occurrenceOverrides as any[],
      pauses: agreementPauses.map((p) => ({
        agreement_id: p.agreement_id,
        start_date: p.start_date,
        end_date: p.end_date,
      })),
      holidayDates: businessHolidays.map((h) => h.holiday_date),
      exceptions: routeOccurrenceExceptions as any[],
    });
    const shiftedTargetDates = new Set(Array.from(shiftsByOriginal.values()));

    return shifted
      .map((p) => {
        const baseMinDate = minDateByBaseRouteId.get(p.baseRouteId);
        const hasAnchoredSource = p.sourceKeys.some((key) => anchoredSourceKeys.has(key));
        const hasMovedReplacementRoute = movedReplacementRouteIds.has(p.baseRouteId);
        const isShiftedOccurrence =
          shiftsByOriginal.get(`${p.baseRouteId}|${p.date}`) !== undefined ||
          shiftedTargetDates.has(p.date);
        if (hasMovedReplacementRoute && !isShiftedOccurrence) return null;
        if (baseMinDate && p.date < baseMinDate && !hasAnchoredSource && !isShiftedOccurrence) return null;

        const base = baseById.get(p.baseRouteId);
        if (!base) return null;
        const sourceSet = new Set(p.sourceKeys);
        const baseHasActiveSource = recurringSources.some(
          (src: any) =>
            src.preferred_route_id === p.baseRouteId &&
            src.sourceKeys?.some((key: string) => sourceSet.has(key)),
        );
        if (!baseHasActiveSource) return null;
        const resolved = resolvedBaseById.get(p.baseRouteId);

        const projectedStops: any[] = (base.stops || [])
          .filter((s: any) => projectedStopMatchesSources(s, p.sourceKeys))
          .filter(isLiveProjectedStop)
          .map((s: any, i: number) => ({
            ...s,
            id: `virtual-stop:${p.baseRouteId}:${p.date}:${s.id}`,
            route_id: p.id,
            status: "planned",
            isVirtual: true,
            sequence: i,
            agreement_interval: s.agreement_interval ?? intervalForStop(s),
          }));

        // Syntesér placeholder-stops for aftaler uden base-stop.
        const coveredKeys = new Set<string>();
        for (const s of projectedStops) {
          for (const k of recurringSourceKeysForStop(s)) coveredKeys.add(k);
        }
        let synthIndex = projectedStops.length;
        for (const src of recurringSources as any[]) {
          if (src.preferred_route_id !== p.baseRouteId) continue;
          if (!src.placeholder) continue;
          const keys: string[] = src.sourceKeys ?? [];
          if (!keys.some((k) => sourceSet.has(k))) continue;
          if (keys.some((k) => coveredKeys.has(k))) continue;
          const ph = src.placeholder;
          projectedStops.push({
            ...ph,
            id: `virtual-stop:${p.baseRouteId}:${p.date}:agr:${ph.agreement_id}`,
            route_id: p.id,
            status: "planned",
            isVirtual: true,
            sequence: synthIndex++,
            agreement_interval: src.interval ?? null,
            order_id: null,
            subscription_id: null,
          } as any);
          for (const k of keys) coveredKeys.add(k);
        }
        if (projectedStops.length === 0) return null;

        const empIds = new Set<string>();
        for (const s of projectedStops) {
          const ids = s.assignee_ids ?? (s.assigned_employee_id ? [s.assigned_employee_id] : []);
          for (const id of ids) if (id) empIds.add(id);
        }
        const emps = Array.from(empIds)
          .map((id) => activeEmployees.find((e: any) => e.id === id))
          .filter(Boolean)
          .map((e: any) => ({ id: e.id, name: e.name, avatar_url: e.avatar_url, color: e.color }));

        return {
          ...base,
          id: p.id,
          baseRouteId: p.baseRouteId,
          sourceKeys: p.sourceKeys,
          route_date: p.date,
          name:
            (resolved?.name && resolved.name.trim()) ||
            (base.name && String(base.name).trim()) ||
            `Rute (${format(parseISO(p.date), "d. MMM", { locale: da })})`,
          color: resolved?.color || base.color || null,
          stops: projectedStops,
          attachedEmployees: emps,
          attachedEmployeeCount: emps.length,
          isVirtual: true,
        } as CalendarRoute;
      })
      .filter(Boolean) as CalendarRoute[];
  }, [
    recurringSources,
    recurringBaseRoutes,
    calendarRoutesRaw,
    routeOccurrenceExceptions,
    calendarRangeStart,
    calendarRangeEnd,
    activeEmployees,
    calendarRoutes,
    occurrenceOverrides,
    agreementPauses,
    businessHolidays,
    visibleCalendarStops,
  ]);
};