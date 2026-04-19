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
    // Ryk til slutningen af det clash-interval, snap op
    start = snapMinutes(clash.end + step - 1, step);
  }
  return start;
};

/**
 * Byg busy-intervaller fra stops tildelt en given medarbejder, med option til at ekskludere
 * et stop (fx det stop der trækkes/optimeres lige nu).
 */
export const busyIntervalsForEmployee = (
  stops: RouteStop[],
  employeeId: string | null,
  excludeStopId?: string | null,
): Busy[] => {
  const out: Busy[] = [];
  for (const s of stops) {
    if (s.id === excludeStopId) continue;
    if (s.assigned_employee_id !== employeeId) continue;
    const start = isoToMin(s.planned_arrival);
    if (start == null) continue;
    out.push({ start, end: start + Math.max(s.duration_minutes, SLOT_MIN) });
  }
  return out;
};
