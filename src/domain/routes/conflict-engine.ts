/**
 * ConflictEngine — Bølge 2 / 2.3 i .lovable/plan.md
 * -----------------------------------------------------------------------------
 * Ét sted hvor alle plan-konflikt-regler evalueres. Reglerne har hidtil ligget
 * spredt mellem `detectConflicts` (dobbeltbookinger), `useDayConflicts`
 * (datasource), validerings-hints i optimize-route og ad-hoc checks i UI.
 *
 * Denne fil samler dem bag én ren funktion:
 *
 *   evaluateConflicts(plan) → Conflict[]
 *
 * Den indeholder ingen React, ingen Supabase og ingen toasts — kun deterministisk
 * evaluering af en `Plan` (et snapshot af stops + medarbejdere + kontekst).
 * Bruges af:
 *   - UI-badges på kalender og dagsvisning
 *   - DragEnd validate-trin (validate → commit → rollback)
 *   - Simulation mode (5.1) — dry-run uden DB-skriv
 *
 * Registret er åbent: nye regler tilføjes ved at registrere en `ConflictRule`
 * i `BUILTIN_RULES` (eller eksternt via `evaluateConflicts(plan, { extraRules })`).
 */

import {
  detectConflicts,
  type Conflict as DoubleBookingConflict,
  type ConflictStop,
} from "@/lib/route-conflicts";

/* ─── Typer ──────────────────────────────────────────────────────────── */

export type ConflictSeverity = "error" | "warning" | "info";

export type ConflictCode =
  | "double_booking"
  | "time_overlap"
  | "skill_mismatch"
  | "outside_working_hours"
  | "employee_on_holiday"
  | "over_capacity"
  | "geo_too_far"
  | "customer_preference_mismatch";

export type PlanConflict = {
  code: ConflictCode;
  severity: ConflictSeverity;
  title: string;
  description?: string;
  /** Stop-id'er regelen vedrører. */
  stopIds: string[];
  /** Medarbejder-id (hvis relevant). */
  employeeId?: string;
  /** yyyy-MM-dd (hvis relevant). */
  date?: string;
  /** Maskinlæsbart payload til UI/diagnostik. */
  meta?: Record<string, unknown>;
};

export type PlanEmployee = {
  id: string;
  /** Skill-tags som medarbejderen kan udføre. */
  skills?: string[];
  /** Daglige arbejdstider (HH:mm). Hvis udeladt = ingen check. */
  workingHoursStart?: string | null;
  workingHoursEnd?: string | null;
  /** Datoer hvor medarbejderen er på ferie (yyyy-MM-dd). */
  holidayDates?: Iterable<string>;
  /** Maks antal stops pr. dag. */
  dailyCapacity?: number | null;
};

export type PlanStop = ConflictStop & {
  /** Skill-tags der kræves for stoppet. */
  requiredSkills?: string[];
  /** Geografisk afstand i km fra ruteanker (valgfrit). */
  distanceKm?: number | null;
  /** Kundens foretrukne medarbejder-id (valgfrit). */
  preferredEmployeeId?: string | null;
};

export type Plan = {
  stops: PlanStop[];
  employees?: PlanEmployee[];
  /** Maks afstand i km før vi advarer (default: 100). */
  maxGeoKm?: number;
};

export type ConflictRule = (plan: Plan) => PlanConflict[];

/* ─── Hjælpere ───────────────────────────────────────────────────────── */

const minutes = (hhmm: string | null | undefined): number | null => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map((x) => Number.parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

const employeeMap = (plan: Plan): Map<string, PlanEmployee> =>
  new Map((plan.employees || []).map((e) => [e.id, e]));

/* ─── Indbyggede regler ──────────────────────────────────────────────── */

const ruleDoubleBooking: ConflictRule = (plan) =>
  detectConflicts(plan.stops).map((c: DoubleBookingConflict): PlanConflict => ({
    code: c.overlapsTime ? "time_overlap" : "double_booking",
    severity: c.overlapsTime ? "error" : "warning",
    title: c.overlapsTime
      ? "Medarbejder er dobbeltbooket med overlappende tider"
      : "Medarbejder har flere aftaler samme dag",
    stopIds: c.stops.map((s) => s.id),
    employeeId: c.employee_id,
    date: c.date,
    meta: { overlapsTime: c.overlapsTime },
  }));

const ruleSkillMismatch: ConflictRule = (plan) => {
  const emp = employeeMap(plan);
  const out: PlanConflict[] = [];
  for (const stop of plan.stops) {
    const required = stop.requiredSkills ?? [];
    if (required.length === 0) continue;
    for (const empId of stop.employee_ids || []) {
      const e = emp.get(empId);
      if (!e) continue;
      const have = new Set(e.skills ?? []);
      const missing = required.filter((s) => !have.has(s));
      if (missing.length === 0) continue;
      out.push({
        code: "skill_mismatch",
        severity: "error",
        title: "Medarbejder mangler nødvendige kompetencer",
        description: `Mangler: ${missing.join(", ")}`,
        stopIds: [stop.id],
        employeeId: empId,
        date: stop.route_date,
        meta: { missing },
      });
    }
  }
  return out;
};

const ruleOutsideWorkingHours: ConflictRule = (plan) => {
  const emp = employeeMap(plan);
  const out: PlanConflict[] = [];
  for (const stop of plan.stops) {
    const start = minutes(stop.start_time);
    const end = minutes(stop.end_time);
    if (start == null || end == null) continue;
    for (const empId of stop.employee_ids || []) {
      const e = emp.get(empId);
      if (!e) continue;
      const wStart = minutes(e.workingHoursStart);
      const wEnd = minutes(e.workingHoursEnd);
      if (wStart == null || wEnd == null) continue;
      if (start < wStart || end > wEnd) {
        out.push({
          code: "outside_working_hours",
          severity: "warning",
          title: "Aftale ligger uden for medarbejderens arbejdstid",
          stopIds: [stop.id],
          employeeId: empId,
          date: stop.route_date,
        });
      }
    }
  }
  return out;
};

const ruleEmployeeOnHoliday: ConflictRule = (plan) => {
  const emp = employeeMap(plan);
  const out: PlanConflict[] = [];
  for (const stop of plan.stops) {
    for (const empId of stop.employee_ids || []) {
      const e = emp.get(empId);
      if (!e?.holidayDates) continue;
      const set = e.holidayDates instanceof Set
        ? (e.holidayDates as Set<string>)
        : new Set<string>(e.holidayDates);
      if (set.has(stop.route_date)) {
        out.push({
          code: "employee_on_holiday",
          severity: "error",
          title: "Medarbejder er på ferie/lukkedag",
          stopIds: [stop.id],
          employeeId: empId,
          date: stop.route_date,
        });
      }
    }
  }
  return out;
};

const ruleOverCapacity: ConflictRule = (plan) => {
  const emp = employeeMap(plan);
  const counts = new Map<string, { count: number; stopIds: string[]; date: string }>();
  for (const stop of plan.stops) {
    for (const empId of stop.employee_ids || []) {
      const key = `${empId}|${stop.route_date}`;
      const prev = counts.get(key) ?? { count: 0, stopIds: [], date: stop.route_date };
      prev.count += 1;
      prev.stopIds.push(stop.id);
      counts.set(key, prev);
    }
  }
  const out: PlanConflict[] = [];
  for (const [key, v] of counts) {
    const [empId] = key.split("|");
    const cap = emp.get(empId)?.dailyCapacity;
    if (cap == null || cap <= 0) continue;
    if (v.count > cap) {
      out.push({
        code: "over_capacity",
        severity: "warning",
        title: `Medarbejder over daglig kapacitet (${v.count}/${cap})`,
        stopIds: v.stopIds,
        employeeId: empId,
        date: v.date,
        meta: { count: v.count, capacity: cap },
      });
    }
  }
  return out;
};

const ruleGeoTooFar: ConflictRule = (plan) => {
  const max = plan.maxGeoKm ?? 100;
  const out: PlanConflict[] = [];
  for (const stop of plan.stops) {
    if (stop.distanceKm == null) continue;
    if (stop.distanceKm > max) {
      out.push({
        code: "geo_too_far",
        severity: "info",
        title: `Stop ligger ${Math.round(stop.distanceKm)} km fra rutens anker`,
        stopIds: [stop.id],
        date: stop.route_date,
        meta: { distanceKm: stop.distanceKm, maxKm: max },
      });
    }
  }
  return out;
};

const ruleCustomerPreference: ConflictRule = (plan) => {
  const out: PlanConflict[] = [];
  for (const stop of plan.stops) {
    const pref = stop.preferredEmployeeId;
    if (!pref) continue;
    const ids = stop.employee_ids || [];
    if (ids.length === 0) continue;
    if (!ids.includes(pref)) {
      out.push({
        code: "customer_preference_mismatch",
        severity: "info",
        title: "Tildelt medarbejder matcher ikke kundens ønske",
        stopIds: [stop.id],
        date: stop.route_date,
        meta: { preferredEmployeeId: pref, assigned: ids },
      });
    }
  }
  return out;
};

export const BUILTIN_RULES: ConflictRule[] = [
  ruleDoubleBooking,
  ruleSkillMismatch,
  ruleOutsideWorkingHours,
  ruleEmployeeOnHoliday,
  ruleOverCapacity,
  ruleGeoTooFar,
  ruleCustomerPreference,
];

/* ─── Public API ─────────────────────────────────────────────────────── */

export type EvaluateOpts = {
  /** Ekstra regler ud over BUILTIN_RULES. */
  extraRules?: ConflictRule[];
  /** Kun disse koder kører. Hvis udeladt: alle. */
  only?: ConflictCode[];
};

export const evaluateConflicts = (plan: Plan, opts: EvaluateOpts = {}): PlanConflict[] => {
  const rules = [...BUILTIN_RULES, ...(opts.extraRules ?? [])];
  const all: PlanConflict[] = [];
  for (const r of rules) {
    for (const c of r(plan)) {
      if (opts.only && !opts.only.includes(c.code)) continue;
      all.push(c);
    }
  }
  return all;
};