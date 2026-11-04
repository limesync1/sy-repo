// Algoritmisk opsummering af en optimeret plan – ingen AI.
import type { EmployeeCtx, RoutePlan } from "./types.ts";

export function buildPlanSummary(
  employees: EmployeeCtx[],
  stopCount: number,
  plan: RoutePlan,
  before: { km: number; minutes: number },
): string {
  const savedMin = Math.max(0, Math.round(before.minutes - plan.total_minutes));
  const savedKm = Math.max(0, before.km - plan.total_km);
  const parts: string[] = [];
  if (savedMin > 0 || savedKm >= 0.5) {
    parts.push(`Ruten er gjort ${savedMin} min og ${savedKm.toFixed(1).replace(".", ",")} km kortere.`);
  } else {
    parts.push("Ruten var allerede i den bedste rækkefølge, vi kunne finde.");
  }
  parts.push(`${stopCount} stop fordelt på ${employees.length} ${employees.length === 1 ? "medarbejder" : "medarbejdere"}: i alt ${plan.total_km.toFixed(1).replace(".", ",")} km og ${plan.total_minutes} min inkl. opgaver.`);
  if (plan.unassigned_stops.length) parts.push(`${plan.unassigned_stops.length} stop kunne ikke nås inden for arbejdstid eller tidsvindue.`);
  if (plan.soft_window_violations) parts.push(`${plan.soft_window_violations} ønskede tidspunkter kunne ikke helt overholdes.`);
  return parts.join(" ");
}
