/**
 * Pure klassifikation af et drag-and-drop event i RoutePlanner.
 * Bruges af `useRoutePlannerDragEnd` til at oversætte `active`/`over` data
 * til en stabil "drop-kind" — uden side effects, så det kan unit-testes.
 *
 * Selve mutationer (DB-kald, toasts, dialog-åbning) sker i hooken; denne
 * fil indeholder kun ren logik der mapper input → kind.
 */

export type DropKind =
  | "noop"
  | "projected-route-to-route"   // blokeret (virtuel rute → flet)
  | "projected-route-to-day"     // åbner pending-projected-move dialog
  | "route-to-route"             // åbner merge-dialog
  | "route-to-day"               // åbner move-dialog
  | "job-to-route"               // commit: tilføj stop til eksisterende rute
  | "job-to-day"                 // commit: opret ny rute + læg stop på
  | "stop-to-day";               // commit: flyt eksisterende stop til ny dato

type ActiveDataLike = { type?: string; route?: { isVirtual?: boolean } } | null | undefined;
type OverDataLike = { type?: string } | null | undefined;

export function classifyDrop(activeData: ActiveDataLike, overData: OverDataLike): DropKind {
  const a = activeData?.type;
  const o = overData?.type;
  if (!a || !o) return "noop";

  if (a === "route" && activeData?.route?.isVirtual) {
    if (o === "route") return "projected-route-to-route";
    if (o === "day") return "projected-route-to-day";
    return "noop";
  }
  if (a === "route" && o === "route") return "route-to-route";
  if (a === "route" && o === "day") return "route-to-day";
  if (a === "job" && o === "route") return "job-to-route";
  if (a === "job" && o === "day") return "job-to-day";
  if (a === "stop" && o === "day") return "stop-to-day";
  return "noop";
}

/**
 * Stabil idempotency-nøgle pr. drop. Bruges af `inFlightDropsRef` (klient)
 * og af `claim_route_planner_idempotency` (DB) til at afvise dobbelt-drop.
 */
export function dropKeyFor(
  activeData: any,
  overData: any,
): string | null {
  const a = activeData?.type;
  const o = overData?.type;
  if (a === "job" && o === "route") return `job:${activeData.job?.id}->route:${overData.routeId}`;
  if (a === "job" && o === "day") return `job:${activeData.job?.id}->day:${overData.date}`;
  if (a === "stop" && o === "day") return `stop:${activeData.stop?.id}->day:${overData.date}`;
  if (a === "route" && o === "route") return `route:${activeData.route?.id}->route:${overData.routeId}`;
  if (a === "route" && o === "day") return `route:${activeData.route?.id}->day:${overData.date}`;
  return null;
}

/** Target-key til busy-markering (visuel "behandler"-feedback). */
export function targetKeyFor(overData: any): string | null {
  if (overData?.type === "route") return `route:${overData.routeId}`;
  if (overData?.type === "day") return `day:${overData.date}`;
  return null;
}

/**
 * Udtrækker target-datoen (yyyy-MM-dd) fra overData. For `day` er det direkte
 * `overData.date`; for `route` slås op i `routesById`. Bruges af guard mod
 * drop på fortidsdatoer. Returnerer null hvis input er korrupt.
 */
export function computeTargetDateForGuard(
  overData: any,
  routesById: Map<string, { route_date?: string | null }>,
): string | null {
  const raw = overData?.type === "day"
    ? overData.date
    : overData?.type === "route"
      ? routesById.get(overData.routeId)?.route_date ?? null
      : null;
  if (!raw) return null;
  const s = String(raw).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null;
}