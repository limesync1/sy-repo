// Konfliktdetektion for ruter: identificerer dobbeltbookinger på samme
// medarbejder/dato kombination så vi kan advare før en aftale flyttes eller
// en medarbejder skiftes.

export type ConflictStop = {
  id: string;
  route_id: string;
  route_date: string;     // yyyy-MM-dd
  employee_ids: string[]; // assignees + assigned_employee_id
  start_time?: string | null; // HH:mm — valgfrit; bruges til tidskonflikter
  end_time?: string | null;
  agreement_id?: string | null;
  label?: string | null;  // kunde-/aftalenavn til UI
};

export type Conflict = {
  employee_id: string;
  date: string;
  stops: ConflictStop[];
  /** true hvis tiderne også overlapper, ellers er det blot "samme dag samme medarbejder". */
  overlapsTime: boolean;
};

const minutes = (hhmm: string | null | undefined): number | null => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map((x) => Number.parseInt(x, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

/**
 * Returnerer alle konflikter blandt en samling stops. To stops konflikter
 * hvis de deler mindst én medarbejder på samme dato; konflikten markeres
 * som `overlapsTime` hvis deres start/slut-tider også overlapper.
 */
export const detectConflicts = (stops: ConflictStop[]): Conflict[] => {
  const buckets = new Map<string, ConflictStop[]>(); // employee|date → stops
  for (const stop of stops) {
    const ids = stop.employee_ids?.filter(Boolean) ?? [];
    for (const empId of ids) {
      const key = `${empId}|${stop.route_date}`;
      const arr = buckets.get(key) || [];
      arr.push(stop);
      buckets.set(key, arr);
    }
  }
  const out: Conflict[] = [];
  for (const [key, group] of buckets) {
    if (group.length < 2) continue;
    const [employee_id, date] = key.split("|");
    // Tjek om nogen par overlapper i tid
    let overlapsTime = false;
    for (let i = 0; i < group.length && !overlapsTime; i += 1) {
      const a = group[i];
      const aStart = minutes(a.start_time);
      const aEnd = minutes(a.end_time);
      if (aStart == null || aEnd == null) continue;
      for (let j = i + 1; j < group.length; j += 1) {
        const b = group[j];
        const bStart = minutes(b.start_time);
        const bEnd = minutes(b.end_time);
        if (bStart == null || bEnd == null) continue;
        if (aStart < bEnd && bStart < aEnd) { overlapsTime = true; break; }
      }
    }
    out.push({ employee_id, date, stops: group, overlapsTime });
  }
  return out;
};
