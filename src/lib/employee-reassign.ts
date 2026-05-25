// suggestReassignment — givet en liste af medarbejdere der oprindeligt var
// tildelt et stop og som er optagne på den nye dato, foreslå første ledige
// kollega fra `availableEmployees` der ikke har konflikt på samme tidspunkt.
//
// Bruges af move-dialoger til at vise "Tildel Anna i stedet for Peter"
// med ét-klik accept før bekræft. Holder logikken simpel og pure så vi
// kan unit-teste den uafhængigt af DB/hooks.

import type { Conflict } from "@/lib/route-conflicts";

export type ReassignmentSuggestion = {
  /** Den medarbejder der ikke kan flytte med pga. konflikt. */
  conflictingEmployeeId: string;
  /** Foreslået erstatter. */
  suggestedEmployeeId: string;
  /** Læsbar grund vist i UI. */
  reason: string;
};

export type Employee = { id: string; name?: string | null };

/**
 * Beregn forslag baseret på de konflikter useDayConflicts har fundet på den nye dato.
 * Returnerer max ét forslag pr. konfliktende medarbejder (det første match).
 */
export function suggestReassignment(input: {
  assignedEmployeeIds: string[];
  conflictsOnTargetDate: Conflict[];
  availableEmployees: Employee[];
}): ReassignmentSuggestion[] {
  const { assignedEmployeeIds, conflictsOnTargetDate, availableEmployees } = input;
  if (assignedEmployeeIds.length === 0 || conflictsOnTargetDate.length === 0) return [];

  // Hvilke medarbejdere har konflikt på den nye dato?
  const conflictingEmpIds = new Set<string>();
  for (const c of conflictsOnTargetDate) {
    if ((c as any).employee_id && assignedEmployeeIds.includes((c as any).employee_id)) {
      conflictingEmpIds.add((c as any).employee_id);
    }
  }
  if (conflictingEmpIds.size === 0) return [];

  // Pool af ledige kandidater = available − assigned − conflicting
  const busyIds = new Set<string>(conflictingEmpIds);
  const candidates = availableEmployees.filter(
    (e) => !assignedEmployeeIds.includes(e.id) && !busyIds.has(e.id),
  );

  const out: ReassignmentSuggestion[] = [];
  const usedReplacements = new Set<string>();
  for (const empId of conflictingEmpIds) {
    const pick = candidates.find((c) => !usedReplacements.has(c.id));
    if (!pick) break;
    usedReplacements.add(pick.id);
    out.push({
      conflictingEmployeeId: empId,
      suggestedEmployeeId: pick.id,
      reason: "Ledig på den nye dato uden tidskonflikt",
    });
  }
  return out;
}