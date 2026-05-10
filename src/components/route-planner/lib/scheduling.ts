// Fælles tidsplanlægnings-logik: snap, konflikt-detektion, find-første-ledige-slot.
// Bruges både ved drop, auto-fordel og optimering.

import type { RouteStop } from "@/hooks/useRoutes";

export const SLOT_MIN = 15;

/** Konverter "08:30" til minutter siden midnat. Returnerer null hvis ugyldig. */
export const hhmmToMin = (hhmm: string | null | undefined): number | null => {
  if (!hhmm) return null;
  const m = hhmm.match(/^(\d{2}):(\d{2})/);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
};

/** Konverter ISO-tid til minutter siden midnat (lokal tid). */
export const isoToMin = (iso: string | null | undefined): number | null => {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.getHours() * 60 + d.getMinutes();
};

/** Snap minutter til nærmeste 15-min interval (eller andet step). */
export const snapMinutes = (mins: number, step = SLOT_MIN): number =>
  Math.round(mins / step) * step;

/** Lav ISO-tid for en given dato + minutter siden midnat. */
export const minToIso = (dateStr: string, mins: number): string => {
  const d = new Date(dateStr + "T00:00:00");
  d.setHours(Math.floor(mins / 60), mins % 60, 0, 0);
  return d.toISOString();
};

/** Format minutter som "HH:mm". */
export const minToHHmm = (mins: number): string => {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export type Busy = { start: number; end: number };

const stopAssigneeIds = (stop: RouteStop): string[] => {
  if (Array.isArray(stop.assignee_ids) && stop.assignee_ids.length > 0) return stop.assignee_ids;
  return stop.assigned_employee_id ? [stop.assigned_employee_id] : [];
};

/**
 * Find første ledige slot fra og med `desiredStart` for et stop af `durationMin` varighed,
 * der ikke overlapper med nogle af `busy`-intervallerne. Returnerer den faktiske starttid (snapped).
 * Hvis et clash findes, ryk frem til slutningen af det clash-interval (også snapped).
 */
export const findFirstFreeSlot = (
  desiredStart: number,
  durationMin: number,
  busy: Busy[],
  step = SLOT_MIN,
): number => {
  let start = snapMinutes(desiredStart, step);
  const dur = Math.max(durationMin, step);
  // Sortér busy efter start for effektiv check
  const sorted = [...busy].sort((a, b) => a.start - b.start);
  let safety = 0;
  while (safety++ < 200) {
    const end = start + dur;
    const clash = sorted.find((b) => start < b.end && end > b.start);
    if (!clash) return start;
    // Ryk til slutningen af det clash-interval, snap OP til nærmeste step.
    // Bug-fix: tidligere brugte vi `snapMinutes(clash.end + step - 1)` som er
    // round-to-nearest — det kunne give 9:15 i stedet for 9:00 når clash.end
    // allerede lå på et helt slot. Math.ceil rammer altid det første lovlige
    // step ≥ clash.end.
    start = Math.ceil(clash.end / step) * step;
  }
  return start;
};

/**
 * Byg busy-intervaller fra stops tildelt en given medarbejder, med option til at ekskludere
 * et stop (fx det stop der trækkes/optimeres lige nu).
 */
export const busyIntervalsForEmployee = (
  stops: RouteStop[],
  employeeId: string | string[] | null,
  excludeStopId?: string | null,
): Busy[] => {
  const out: Busy[] = [];
  const wanted = new Set(Array.isArray(employeeId) ? employeeId.filter(Boolean) : employeeId ? [employeeId] : []);
  if (wanted.size === 0) return out;

  for (const s of stops) {
    if (s.id === excludeStopId) continue;
    const assignees = stopAssigneeIds(s);
    if (!assignees.some((id) => wanted.has(id))) continue;

    const start = isoToMin(s.planned_arrival);
    if (start == null) continue;
    const end = isoToMin(s.planned_departure) ?? (start + Math.max(s.duration_minutes, SLOT_MIN));
    out.push({ start, end });
  }
  return out;
};
