import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  pointerWithin,
  rectIntersection,
  useSensor,
  useSensors,
  type CollisionDetection,
  type DragMoveEvent,
  type DragOverEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useCallback, useRef, useState } from "react";
import { setDragEta, clearDragEta } from "@/components/route-planner/DragEtaOverlay";
import { clearDragValidation, summarize, writeDragValidationDebounced } from "@/components/route-planner/drag-validation-context";
import { dragMetrics } from "@/lib/drag-metrics";
import { startDragAutoScroll } from "@/components/route-planner/lib/drag-auto-scroll";
import { haversineMeters } from "@/lib/geo-distance";
import {
  type DragPoint,
  getDragPoint,
  getRouteDropPointTarget,
  routeIdFromDndId,
} from "@/lib/route-planner/dnd";
import { validateRouteMove, validateStopAssignment } from "@/lib/route-validation";

/** Konverterer "HH:MM[:SS]" til minutter siden midnat (eller null). */
const toMin = (t: string | null | undefined): number | null => {
  if (!t) return null;
  const [h, m] = t.split(":").map((n) => parseInt(n, 10));
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
};

/**
 * useRoutePlannerDnd
 * -----------------------------------------------------------------------------
 * Samler RoutePlanners drag-and-drop primitiver: state, refs, sensors,
 * collision-detection, og start/over/move-handlers. Bemærk: `handleDragEnd`
 * bor stadig i RoutePlanner — den indeholder ~660 linjer mutation-tung kode
 * der er dybt vævet sammen med pending-dialog setters og tre forskellige
 * mutationer. Hooken eksponerer derfor refs + state så DragEnd kan rydde op
 * korrekt fra siden.
 */
export function useRoutePlannerDnd(opts: {
  calendarRoutesRaw: any[];
  visibleCalendarStops: any[];
  calendarStops: any[];
  capacityByDate: Map<string, { minutes_capacity: number; minutes_booked: number }>;
  virtualCalendarRoutes: any[];
  routeOccurrenceExceptions: any[];
  todayStr: () => string;
}) {
  const {
    calendarRoutesRaw,
    visibleCalendarStops,
    calendarStops,
    capacityByDate,
    virtualCalendarRoutes,
    routeOccurrenceExceptions,
    todayStr,
  } = opts;

  // ─── State ───
  const [activeDragId, setActiveDragId] = useState<string | null>(null);
  const [activeDragData, setActiveDragData] = useState<any>(null);
  const [dragOverTargetId, setDragOverTargetId] = useState<string | null>(null);
  const [routeDragPoint, setRouteDragPoint] = useState<DragPoint | null>(null);
  const [busyTargets, setBusyTargets] = useState<Set<string>>(new Set());

  // ─── Refs ───
  const activeDragPointRef = useRef<DragPoint | null>(null);
  const activeDragOriginRef = useRef<DragPoint | null>(null);
  const activeRouteDragPointRef = useRef<DragPoint | null>(null);
  const activeRouteDragOriginRef = useRef<DragPoint | null>(null);
  const routeOverlayRef = useRef<HTMLDivElement | null>(null);
  const inFlightDropsRef = useRef<Set<string>>(new Set());

  const applyRouteOverlayPosition = (point: DragPoint | null) => {
    const el = routeOverlayRef.current;
    if (!el || !point) return;
    el.style.left = `${point.x}px`;
    el.style.top = `${point.y}px`;
  };

  const setTargetBusy = (target: string | null, busy: boolean) => {
    if (!target) return;
    setBusyTargets((prev) => {
      const next = new Set(prev);
      if (busy) next.add(target);
      else next.delete(target);
      return next;
    });
  };

  // ─── Sensors ───
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 120, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  // ─── Collision detection ───
  const routePlannerCollisionDetection = useCallback<CollisionDetection>((args) => {
    const activeType = args.active.data.current?.type;
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      if (activeType === "job") {
        const pointTarget = getRouteDropPointTarget(activeDragPointRef.current, null);
        if (pointTarget?.type === "route") {
          const routeHit = args.droppableContainers.find((container) => container.id === `route-drop:${pointTarget.routeId}`);
          if (routeHit) return [{ id: routeHit.id }];
        }
      }
      if (activeType === "route") {
        const sourceRouteId = routeIdFromDndId(args.active.id);
        const routeHit = pointerCollisions.find((c) => {
          const container = args.droppableContainers.find((d) => d.id === c.id);
          return container?.data.current?.type === "route"
            && container?.data.current?.routeId !== sourceRouteId;
        });
        if (routeHit) return [routeHit];
        const nonSourceHits = pointerCollisions.filter((c) => {
          const container = args.droppableContainers.find((d) => d.id === c.id);
          return !(container?.data.current?.type === "route" && container?.data.current?.routeId === sourceRouteId);
        });
        if (nonSourceHits.length > 0) return nonSourceHits;
      }
      return pointerCollisions;
    }

    const dragPoint = activeType === "route" ? activeRouteDragPointRef.current : activeDragPointRef.current;
    if (dragPoint && (activeType === "route" || activeType === "job")) {
      const pointTarget = getRouteDropPointTarget(dragPoint, activeType === "route" ? routeIdFromDndId(args.active.id) : null);
      const targetId = pointTarget?.type === "route"
        ? `route-drop:${pointTarget.routeId}`
        : pointTarget?.type === "day"
          ? `day:${pointTarget.date}`
          : null;
      const routePointerCollision = targetId
        ? args.droppableContainers.find((container) => container.id === targetId)
        : null;
      if (routePointerCollision) return [{ id: routePointerCollision.id }];
    }

    return activeType === "route"
      ? rectIntersection(args)
      : pointerCollisions;
  }, []);

  // ─── Handlers ───
  const handleDragStart = (e: DragStartEvent) => {
    const data: any = e.active.data.current;
    const metricType: "job" | "route" | "stop" | "unknown" =
      data?.type === "job" || data?.type === "route" || data?.type === "stop"
        ? data.type
        : "unknown";
    dragMetrics.start(metricType);
    setActiveDragId(e.active.id as string);
    setActiveDragData(data);
    const origin = getDragPoint(e.activatorEvent);
    activeDragOriginRef.current = origin;
    activeDragPointRef.current = origin;
    startDragAutoScroll(() => activeDragPointRef.current);
    if (data?.type === "route") {
      activeRouteDragOriginRef.current = origin;
      activeRouteDragPointRef.current = origin;
      setRouteDragPoint(origin);
      applyRouteOverlayPosition(origin);
    } else {
      activeRouteDragOriginRef.current = null;
      activeRouteDragPointRef.current = null;
      setRouteDragPoint(null);
    }
  };

  const handleDragOver = (e: DragOverEvent) => {
    const activeData: any = e.active.data.current;
    const overData: any = e.over?.data.current;
    if (!activeData || !overData) {
      clearDragValidation();
      setDragOverTargetId(null);
      clearDragEta();
      return;
    }

    try {
      if (activeData.type === "job" && overData.type === "route") {
        const targetRoute = calendarRoutesRaw.find((r) => r.id === overData.routeId);
        if (!targetRoute) return clearDragValidation();
        const sameDayStops = visibleCalendarStops.filter((s: any) => {
          const r = calendarRoutesRaw.find((x) => x.id === s.route_id);
          return r?.route_date === targetRoute.route_date;
        });
        const stopsOnRoute = visibleCalendarStops.filter((s) => s.route_id === targetRoute.id) as any[];
        const job = activeData.job ?? {};
        const result = validateStopAssignment(
          {
            order_id: job.id ?? null,
            customer_id: job.customer_id ?? null,
            customer_name: job.customer_name ?? null,
            latitude: job.latitude ?? null,
            longitude: job.longitude ?? null,
          },
          { id: targetRoute.id, route_date: targetRoute.route_date, isVirtual: (targetRoute as any).isVirtual },
          {
            otherStopsSameDay: sameDayStops as any[],
            stopsOnTargetRoute: stopsOnRoute.map((s) => ({ id: s.id, latitude: s.latitude, longitude: s.longitude })),
            estimatedStopCountAfter: stopsOnRoute.length + 1,
          },
        );
        const { severity, topMessage } = summarize(result);
        writeDragValidationDebounced({ targetId: `route:${targetRoute.id}`, severity, topMessage, result });
        setDragOverTargetId(`route:${targetRoute.id}`);
        try {
          const job = activeData.job ?? {};
          let extraDriveMin: number | null = null;
          if (job.latitude != null && job.longitude != null && stopsOnRoute.length) {
            let nearestM = Infinity;
            for (const s of stopsOnRoute) {
              if (s.latitude == null || s.longitude == null) continue;
              const d = haversineMeters(Number(job.latitude), Number(job.longitude), Number(s.latitude), Number(s.longitude));
              if (d < nearestM) nearestM = d;
            }
            if (Number.isFinite(nearestM)) {
              extraDriveMin = (nearestM * 2 * 1.3) / 1000 / 50 * 60;
            }
          }
          const cap = capacityByDate.get(targetRoute.route_date);
          let newLoadPct: number | null = null;
          if (cap && cap.minutes_capacity > 0) {
            const addMin = Number(job.duration_minutes) || 0;
            newLoadPct = ((cap.minutes_booked + addMin) / cap.minutes_capacity) * 100;
          }
          setDragEta({ extraDriveMin, newLoadPct });
        } catch { clearDragEta(); }
        return;
      }

      if (activeData.type === "job" && overData.type === "day") {
        const today = todayStr();
        const result = overData.date < today
          ? validateRouteMove({ id: "new", route_date: today }, overData.date)
          : { ok: true, errors: [], warnings: [], suggestions: [] } as any;
        const { severity, topMessage } = summarize(result);
        writeDragValidationDebounced({ targetId: `day:${overData.date}`, severity, topMessage, result });
        setDragOverTargetId(`day:${overData.date}`);
        const cap = capacityByDate.get(overData.date);
        const job = activeData.job ?? {};
        let newLoadPct: number | null = null;
        if (cap && cap.minutes_capacity > 0) {
          const addMin = Number(job.duration_minutes) || 0;
          newLoadPct = ((cap.minutes_booked + addMin) / cap.minutes_capacity) * 100;
        }
        setDragEta({ newLoadPct, message: "Opretter ny rute" });
        return;
      }

      if (activeData.type === "route" && overData.type === "day") {
        const route = activeData.route;
        if (!route) return clearDragValidation();
        const baseId: string | null = route.base_route_id ?? route.baseRouteId ?? route.id ?? null;
        const seriesRoutesOnTargetDate = calendarRoutesRaw.filter((r: any) =>
          String(r.route_date).slice(0, 10) === overData.date
          && r.id !== route.id
          && (
            (baseId && (r.id === baseId || r.base_route_id === baseId))
            || (!baseId && r.id === route.id)
          )
        );
        const projectedRoutesOnTargetDate = virtualCalendarRoutes.filter((r: any) =>
          String(r.route_date).slice(0, 10) === overData.date
          && r.baseRouteId === baseId
          && r.id !== route.id,
        );
        const movedException = (routeOccurrenceExceptions as any[]).find((ex) =>
          ex.exception_type === "moved"
          && ex.replacement_route_id === route.id
          && ex.base_route_id === baseId,
        );
        const isMovingMovedOccurrenceBack = !!movedException
          && String(movedException.occurrence_date).slice(0, 10) === overData.date;
        const result = validateRouteMove(
          { id: route.id, route_date: route.route_date, isVirtual: route.isVirtual, baseRouteId: baseId },
          overData.date,
          { seriesRoutesOnTargetDate: isMovingMovedOccurrenceBack ? [] : [...seriesRoutesOnTargetDate, ...projectedRoutesOnTargetDate] },
        );
        const { severity, topMessage } = summarize(result);
        writeDragValidationDebounced({ targetId: `day:${overData.date}`, severity, topMessage, result });
        setDragOverTargetId(`day:${overData.date}`);
        clearDragEta();
        return;
      }

      if (activeData.type === "route" && overData.type === "route") {
        const source = activeData.route;
        const target = calendarRoutesRaw.find((r) => r.id === overData.routeId) as any;
        if (!source || !target) return clearDragValidation();
        if (source.isVirtual && target.isVirtual) {
          writeDragValidationDebounced({
            targetId: `route:${target.id}`,
            severity: "error",
            topMessage: "Kan ikke flette to projicerede ruter",
            result: { ok: false, errors: [], warnings: [], suggestions: [] } as any,
          });
          setDragOverTargetId(`route:${target.id}`);
          clearDragEta();
          return;
        }
        writeDragValidationDebounced({
          targetId: `route:${target.id}`,
          severity: "ok",
          topMessage: "Slip her for at flette ruterne",
          result: { ok: true, errors: [], warnings: [], suggestions: [] } as any,
        });
        setDragOverTargetId(`route:${target.id}`);
        clearDragEta();
        return;
      }

      clearDragValidation();
      setDragOverTargetId(null);
      clearDragEta();
    } catch {
      clearDragValidation();
      setDragOverTargetId(null);
      clearDragEta();
    }
  };

  const handleDragMove = (e: DragMoveEvent) => {
    const origin = activeDragOriginRef.current;
    if (!origin) return;
    const point = { x: origin.x + e.delta.x, y: origin.y + e.delta.y };
    activeDragPointRef.current = point;
    if (e.active.data.current?.type === "route") {
      activeRouteDragPointRef.current = point;
      applyRouteOverlayPosition(point);
    }
  };

  const detectAssigneeConflicts = (stop: any, targetDate: string): string | null => {
    const assignees: string[] = stop.assignee_ids || (stop.assigned_employee_id ? [stop.assigned_employee_id] : []);
    if (assignees.length === 0) return null;
    const dur = Number(stop.duration_minutes || 30);
    const startMin = stop.planned_arrival
      ? (() => { const d = new Date(stop.planned_arrival); return d.getHours() * 60 + d.getMinutes(); })()
      : (stop.time_window_start ? toMin(stop.time_window_start) : null);
    if (startMin == null) return null;
    const endMin = startMin + dur;

    const targetRouteIds = new Set(
      calendarRoutesRaw.filter((r) => r.route_date === targetDate).map((r) => r.id),
    );
    if (targetRouteIds.size === 0) return null;

    const conflicts: string[] = [];
    for (const other of calendarStops) {
      if (other.id === stop.id) continue;
      if (!targetRouteIds.has(other.route_id)) continue;
      const otherIds: string[] = (other as any).assignee_ids || [];
      const overlap = otherIds.some((id) => assignees.includes(id));
      if (!overlap) continue;
      const oStart = (other as any).planned_arrival
        ? (() => { const d = new Date((other as any).planned_arrival); return d.getHours() * 60 + d.getMinutes(); })()
        : (other.time_window_start ? toMin(other.time_window_start) : null);
      if (oStart == null) continue;
      const oEnd = oStart + Number(other.duration_minutes || 30);
      if (startMin < oEnd && oStart < endMin) {
        conflicts.push(other.customer_name || "Stop");
      }
    }
    return conflicts.length === 0
      ? null
      : `Overlapper med ${conflicts.length === 1 ? conflicts[0] : `${conflicts.length} andre stops`}`;
  };

  return {
    // State
    activeDragId,
    setActiveDragId,
    activeDragData,
    setActiveDragData,
    dragOverTargetId,
    setDragOverTargetId,
    routeDragPoint,
    setRouteDragPoint,
    busyTargets,
    setBusyTargets,
    // Refs
    activeDragPointRef,
    activeDragOriginRef,
    activeRouteDragPointRef,
    activeRouteDragOriginRef,
    routeOverlayRef,
    inFlightDropsRef,
    // Helpers
    applyRouteOverlayPosition,
    setTargetBusy,
    detectAssigneeConflicts,
    // DnD-kit
    sensors,
    routePlannerCollisionDetection,
    handleDragStart,
    handleDragOver,
    handleDragMove,
  };
}
