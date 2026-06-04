/**
 * useRoutePlannerSimulation — Bølge 5 / 5.1
 * -----------------------------------------------------------------------------
 * Project-specifik adapter over `useDragSimulation`: bygger en `Plan` fra
 * RoutePlanners `calendarStops` + `calendarRoutesRaw`, og mapper aktiv
 * dnd-data + drop-target til en `SimulationAction`. Holder al mapping-logik
 * ét sted så `RoutePlanner.tsx` blot kalder hooken med rå state.
 */
import { useCallback, useMemo } from "react";
import { useDragSimulation } from "./useDragSimulation";
import type { Plan, SimulationAction } from "@/domain/routes";

const HHMM = (raw: string | null | undefined): string | null => {
  if (!raw) return null;
  // accept "HH:mm[:ss]" or ISO timestamp
  if (/^\d{2}:\d{2}/.test(raw)) return raw.slice(0, 5);
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return null;
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

const addMinutes = (hhmm: string | null, minutes: number): string | null => {
  if (!hhmm) return null;
  const [h, m] = hhmm.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  const total = h * 60 + m + Math.max(0, minutes | 0);
  const hh = Math.floor((total / 60) % 24);
  const mm = total % 60;
  return `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
};

type AnyRoute = { id: string; route_date: string };

export const useRoutePlannerSimulation = (opts: {
  calendarStops: any[];
  calendarRoutesRaw: AnyRoute[];
  activeDragData: any;
  dragOverTargetId: string | null;
}) => {
  const { calendarStops, calendarRoutesRaw, activeDragData, dragOverTargetId } = opts;

  const stops = useMemo<Plan["stops"]>(() => {
    const routeById = new Map(calendarRoutesRaw.map((r) => [r.id, r]));
    return (calendarStops || []).map((s: any) => {
      const start = HHMM(s.planned_arrival) ?? HHMM(s.time_window_start);
      const end = HHMM(s.planned_departure)
        ?? HHMM(s.time_window_end)
        ?? addMinutes(start, Number(s.duration_minutes || 30));
      const ids: string[] = Array.isArray(s.assignee_ids) && s.assignee_ids.length
        ? s.assignee_ids
        : (s.assigned_employee_id ? [s.assigned_employee_id] : []);
      return {
        id: String(s.id),
        route_id: String(s.route_id ?? ""),
        route_date: String(routeById.get(s.route_id)?.route_date ?? s.route_date ?? ""),
        employee_ids: ids,
        start_time: start,
        end_time: end,
        label: s.customer_name ?? null,
      };
    });
  }, [calendarStops, calendarRoutesRaw]);

  const toAction = useCallback((data: any, overTargetId: string): SimulationAction | null => {
    if (!data || !overTargetId) return null;
    const [kind, ...rest] = overTargetId.split(":");
    const targetVal = rest.join(":");

    if (data.type === "stop" && data.stop?.id) {
      const current: string[] = Array.isArray(data.stop.assignee_ids) && data.stop.assignee_ids.length
        ? data.stop.assignee_ids
        : (data.stop.assigned_employee_id ? [data.stop.assigned_employee_id] : []);
      const toEmp = current[0] ?? null;
      if (kind === "day") {
        return { type: "MOVE_STOP", stopId: String(data.stop.id), toEmployeeId: toEmp, toDate: targetVal };
      }
      if (kind === "route" || kind === "route-drop") {
        const route = calendarRoutesRaw.find((r) => r.id === targetVal);
        if (!route) return null;
        return { type: "MOVE_STOP", stopId: String(data.stop.id), toEmployeeId: toEmp, toDate: route.route_date };
      }
    }

    if (data.type === "route" && data.route?.id && kind === "day") {
      return { type: "MOVE_ROUTE", routeId: String(data.route.id), toDate: targetVal };
    }

    // Nye jobs (type "job") findes ikke i planen → ingen simulation.
    return null;
  }, [calendarRoutesRaw]);

  const labelFor = useCallback((data: any, overTargetId: string): string | undefined => {
    const [kind, ...rest] = overTargetId.split(":");
    const targetVal = rest.join(":");
    if (data?.type === "stop") {
      const name = data.stop?.customer_name || "Stop";
      return kind === "day" ? `Flytter ${name} til ${targetVal}` : `Flytter ${name} til anden rute`;
    }
    if (data?.type === "route") {
      const name = data.route?.name || "Rute";
      return `Flytter ${name} til ${targetVal}`;
    }
    return undefined;
  }, []);

  useDragSimulation({
    stops,
    activeData: activeDragData,
    overTargetId: dragOverTargetId,
    toAction,
    labelFor,
  });
};