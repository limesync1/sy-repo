import type { DragEndEvent } from "@dnd-kit/core";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { useCallback, type MutableRefObject } from "react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { dragMetrics } from "@/lib/drag-metrics";
import { stopDragAutoScroll } from "@/components/route-planner/lib/drag-auto-scroll";
import { clearDragValidation } from "@/components/route-planner/drag-validation-context";
import { clearSimulationPreview } from "@/components/route-planner/simulation-preview-context";
import { clearDragEta } from "@/components/route-planner/DragEtaOverlay";
import { getRouteDropPointTarget, type DragPoint } from "@/lib/route-planner/dnd";
import { invalidateRouteSyncQueries } from "@/hooks/useRoutes";
import { pushRouteUndo } from "@/lib/route-history";
import { pushBatchedToast } from "@/lib/toast-batch";
import { toastRouteError } from "@/lib/route-errors";
import { pickAvailableColor } from "@/components/route-planner/RouteEditSheet";
import { renameFreshSplitRoutes } from "@/components/route-planner/MoveStopsDialog";
import type { Route } from "@/hooks/useRoutes";
import type { QueryClient } from "@tanstack/react-query";

import {
  dropKeyFor,
  targetKeyFor,
} from "@/lib/route-planner/drop-classifier";
import { decideDrop, type DropDecision, type DropOp } from "@/domain/routes";

/**
 * useRoutePlannerDragEnd — Bølge 1 / pkt. 1.3 i .lovable/plan.md
 * -----------------------------------------------------------------------------
 * Den 666-linjers `handleDragEnd` der tidligere lå inline i `RoutePlanner.tsx`
 * er flyttet hertil. Funktionen er opdelt i en topdel der altid kører
 * (cleanup + guards) og syv per-drop-kind handlere — én for hver kombination
 * af `active.type` × `over.type`. Hver handler følger samme struktur:
 *
 *   validate(): Tjek collisions, status, start-date matches osv. Returnerer
 *               enten en "executable plan" eller åbner en bekræftelses-dialog
 *               (i sidstnævnte tilfælde sker selve mutationen senere via dialog-
 *               handleren i RoutePlanner).
 *   commit():   Asynkront mutation-kald (addStop / createRoute / supabase.rpc).
 *               Kører kun for de tre kinds: job-to-route, job-to-day, stop-to-day.
 *   rollback(): Fanger fejl og viser toast. For duplicate-key fejler vi blødt
 *               (toast.info i stedet for error).
 *
 * Hooken tager én stor `deps` parameter for at gøre alle eksterne afhængigheder
 * eksplicitte — det gør hooken testbar og lettere at forstå end den oprindelige
 * closure med ~25 lokale variable.
 */
export type DragEndDeps = {
  businessId: string | null;
  qc: QueryClient;
  // Kalender-data
  calendarRoutesRaw: any[];
  calendarRoutes: any[];
  calendarStops: any[];
  virtualCalendarRoutes: any[];
  // Mutations
  addStop: { mutateAsync: (args: any) => Promise<any> };
  createRoute: { mutateAsync: (args: any) => Promise<any> };
  // Dialog-setters (fra plannerStore.workflow)
  setPendingProjectedMove: (v: any) => void;
  setPendingRouteMerge: (v: any) => void;
  setPendingRouteMove: (v: any) => void;
  setPendingStartDateChange: (v: any) => void;
  // DnD-state-setters (fra useRoutePlannerDnd)
  setActiveDragId: (v: string | null) => void;
  setActiveDragData: (v: any) => void;
  setRouteDragPoint: (v: DragPoint | null) => void;
  setDragOverTargetId: (v: string | null) => void;
  setTargetBusy: (target: string | null, busy: boolean) => void;
  activeDragPointRef: MutableRefObject<DragPoint | null>;
  activeDragOriginRef: MutableRefObject<DragPoint | null>;
  activeRouteDragPointRef: MutableRefObject<DragPoint | null>;
  activeRouteDragOriginRef: MutableRefObject<DragPoint | null>;
  inFlightDropsRef: MutableRefObject<Set<string>>;
  detectAssigneeConflicts: (stop: any, targetDate: string) => string | null;
  // RoutePlanner-helpers
  serviceSummaryForJob: (job: any) => string;
  todayStr: () => string;
};

export function useRoutePlannerDragEnd(deps: DragEndDeps) {
  const {
    businessId, qc,
    calendarRoutesRaw, calendarRoutes, calendarStops, virtualCalendarRoutes,
    addStop, createRoute,
    setPendingProjectedMove, setPendingRouteMerge, setPendingRouteMove, setPendingStartDateChange,
    setActiveDragId, setActiveDragData, setRouteDragPoint, setDragOverTargetId, setTargetBusy,
    activeDragPointRef, activeDragOriginRef, activeRouteDragPointRef, activeRouteDragOriginRef,
    inFlightDropsRef, detectAssigneeConflicts,
    serviceSummaryForJob, todayStr,
  } = deps;

  return useCallback(async (e: DragEndEvent) => {
    const { active, over } = e;
    const activeDataAtDrop: any = active.data.current;
    const pointAtDrop = activeDataAtDrop?.type === "route" ? activeRouteDragPointRef.current : activeDragPointRef.current;
    const domRouteTarget = activeDataAtDrop?.type === "route" || activeDataAtDrop?.type === "job"
      ? getRouteDropPointTarget(pointAtDrop, activeDataAtDrop?.type === "route" ? activeDataAtDrop.route?.id : null)
      : null;
    const dndRouteTarget = over?.data.current ?? null;
    const preferredRouteTarget = activeDataAtDrop?.type === "route" || activeDataAtDrop?.type === "job"
      ? dndRouteTarget?.type === "route"
        ? dndRouteTarget
        : domRouteTarget?.type === "route"
          ? domRouteTarget
          : dndRouteTarget ?? domRouteTarget
      : null;
    const hasDropTarget = activeDataAtDrop?.type === "route" || activeDataAtDrop?.type === "job" ? !!preferredRouteTarget : !!over;

    // ─── Cleanup state (kører altid) ───
    setActiveDragId(null);
    setActiveDragData(null);
    stopDragAutoScroll();
    activeDragPointRef.current = null;
    activeDragOriginRef.current = null;
    setRouteDragPoint(null);
    activeRouteDragPointRef.current = null;
    activeRouteDragOriginRef.current = null;
    clearDragValidation();
    clearSimulationPreview();
    dragMetrics.end(hasDropTarget);
    setDragOverTargetId(null);
    clearDragEta();
    if (!hasDropTarget || !businessId) return;

    // ─── Lokale helpers (samme adfærd som tidligere inline) ───
    const linkAgreementToRoute = async (orderId: string, routeId: string) => {
      try {
        await supabase.from("subscriptions").update({ preferred_route_id: routeId })
          .eq("order_id", orderId).eq("status", "active").neq("interval", "engangskøb");
      } catch (err) { console.warn("Kunne ikke knytte aftale til rute (projektion)", err); }
      try {
        const { data: occs } = await supabase
          .from("agreement_occurrences").select("agreement_id").eq("legacy_order_id", orderId);
        const agreementIds = Array.from(new Set(
          (occs || []).map((o: any) => o.agreement_id).filter(Boolean) as string[]
        ));
        if (agreementIds.length > 0) {
          await supabase.from("agreements").update({ preferred_route_id: routeId })
            .in("id", agreementIds).neq("interval", "engangskøb").eq("status", "active");
        }
      } catch (err) { console.warn("Kunne ikke knytte ny aftale til rute (projektion)", err); }
      qc.invalidateQueries({ queryKey: ["recurring-agreements-for-planner"] });
      qc.invalidateQueries({ queryKey: ["recurring-base-routes"] });
      qc.invalidateQueries({ queryKey: ["pending-occurrences"] });
    };

    const jobStartDate = (job: any): string | null => {
      const raw = job?.preferred_date || job?.next_service_date;
      return raw ? String(raw).slice(0, 10) : null;
    };

    const shiftJobStartDate = async (orderId: string, newDate: string) => {
      try {
        await supabase.from("orders").update({ preferred_date: newDate, next_service_date: newDate }).eq("id", orderId);
      } catch (err) { console.warn("shift orders.preferred_date failed", err); }
      try {
        await supabase.from("subscriptions").update({ next_service_date: newDate })
          .eq("order_id", orderId).eq("status", "active");
      } catch (err) { console.warn("shift subscriptions.next_service_date failed", err); }
      try {
        const { data: subs } = await supabase.from("subscriptions").select("id").eq("order_id", orderId);
        const subIds = (subs || []).map((s: any) => s.id);
        if (subIds.length > 0) {
          await supabase.from("agreements").update({ start_date: newDate }).in("legacy_subscription_id", subIds);
        }
      } catch (err) { console.warn("shift agreements.start_date failed", err); }
    };

    const ensureStartDateMatches = (
      job: any, targetDate: string, targetLabel: string, execute: () => Promise<void>,
    ): boolean => {
      const start = jobStartDate(job);
      if (!start || start === targetDate) return true;
      setPendingStartDateChange({
        job, currentStart: start, targetDate,
        isBefore: targetDate < start, targetLabel, execute,
      });
      return false;
    };

    const activeData: any = activeDataAtDrop;
    const overData: any = activeData?.type === "route" || activeData?.type === "job"
      ? preferredRouteTarget
      : over?.data.current;

    // ─── Bølge 2: validate → commit → rollback pipeline ───
    // decideDrop er en ren funktion; alle DB-/UI-/toast-effekter sker herunder.
    const todayLocal = todayStr();
    const decision: DropDecision = decideDrop(activeData, overData, {
      todayLocal,
      calendarRoutesRaw,
      virtualCalendarRoutes,
    });

    if (decision.kind === "noop") return;

    if (decision.kind === "blocked") {
      const fn = decision.severity === "info" ? toast.info : toast.error;
      fn(decision.title, decision.description ? { description: decision.description } : undefined);
      return;
    }

    // ─── Re-entrancy guard + idempotency claim (deles af dialog- og commit-grene) ───
    const dropKey = dropKeyFor(activeData, overData);
    if (dropKey) {
      if (inFlightDropsRef.current.has(dropKey)) return;
      inFlightDropsRef.current.add(dropKey);
    }
    const targetKey = targetKeyFor(overData);
    setTargetBusy(targetKey, true);
    const releaseDrop = () => {
      if (dropKey) inFlightDropsRef.current.delete(dropKey);
      setTargetBusy(targetKey, false);
    };

    const claimIdempotency = async (): Promise<boolean> => {
      if (!dropKey) return true;
      const bucket = Math.floor(Date.now() / 3000);
      try {
        const { data, error } = await supabase.rpc("claim_route_planner_idempotency", {
          _key: `${businessId}:${dropKey}:${bucket}`,
          _business_id: businessId,
        });
        if (error) { console.warn("idempotency claim failed", error); return true; }
        return data === true;
      } catch (err) { console.warn("idempotency claim threw", err); return true; }
    };

    // ─── Decision: dialog ──────────────────────────────────────────────
    if (decision.kind === "dialog") {
      const d = decision.dialog;
      if (d.type === "projected-move") {
        setPendingProjectedMove({
          baseRouteId: d.baseRouteId,
          routeName: d.routeName,
          fromDate: d.fromDate,
          toDate: d.toDate,
          autoSkipCadence: false,
        });
      } else if (d.type === "route-merge") {
        setPendingRouteMerge({ source: d.source as Route, target: d.target as unknown as Route });
      } else if (d.type === "route-move") {
        setPendingRouteMove({ route: d.route as Route, newDate: d.newDate });
      }
      releaseDrop();
      return;
    }

    // ─── Decision: commit ──────────────────────────────────────────────
    const op: DropOp = decision.op;

    if (op.type === "add-stop-to-route") {
      const { routeId: targetRouteId, job, targetDate, targetLabel } = op;
      if (!(await claimIdempotency())) {
        toast.info("Aftalen er allerede ved at blive tilføjet");
        releaseDrop(); return;
      }
      const performAddToRoute = async () => {
        const cachedDup = calendarStops.some(
          (s: any) => s.route_id === targetRouteId && s.order_id === job.id,
        );
        if (cachedDup) { toast.info("Aftalen ligger allerede på denne rute"); return; }
        const sequence = calendarStops.filter((s: any) => s.route_id === targetRouteId).length;
        await addStop.mutateAsync({
          route_id: targetRouteId, order_id: job.id, sequence,
          customer_name: job.customer_name, customer_phone: job.customer_phone,
          address: job.address || [job.zip_code, job.city].filter(Boolean).join(" "),
          latitude: job.latitude, longitude: job.longitude,
          service_summary: serviceSummaryForJob(job),
          duration_minutes: Number(job.estimated_duration_minutes) || 30,
          time_window_start: job.preferred_time_start || null,
          time_window_end: job.preferred_time_end || null,
        });
        pushBatchedToast("success", "Aftale tilføjet til ruten", {
          key: "rp-add-to-route", successWord: "aftaler tilføjet", errorWord: "fejlede",
        });
        void linkAgreementToRoute(job.id, targetRouteId);
      };
      if (targetDate && !ensureStartDateMatches(
        job, targetDate, targetLabel,
        async () => { await shiftJobStartDate(job.id, targetDate); await performAddToRoute(); },
      )) { releaseDrop(); return; }
      try {
        await performAddToRoute();
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (msg.includes("uniq_route_stops_route_order") || msg.includes("duplicate key")) {
          toast.info("Aftalen ligger allerede på denne rute");
          invalidateRouteSyncQueries(qc);
        } else {
          toastRouteError(err, toast.error, { titleFallback: "Kunne ikke tilføje aftale" });
        }
      } finally {
        releaseDrop();
      }
      return;
    }

    if (op.type === "create-route-with-stop") {
      const { job, newDate } = op;
      if (!(await claimIdempotency())) {
        toast.info("Aftalen er allerede ved at blive lagt på den dag");
        releaseDrop(); return;
      }
      const performCreateRouteWithStop = async () => {
        const alreadyOnDay = calendarStops.some(
          (s: any) => s.order_id === job.id &&
            calendarRoutesRaw.find((r) => r.id === s.route_id)?.route_date === newDate,
        );
        if (alreadyOnDay) { toast.info("Aftalen ligger allerede på en rute den dag"); return; }
        let chosenColor: string | null = null;
        try {
          const { data: c } = await supabase.rpc("pick_route_color", {
            _business_id: businessId, _route_date: newDate,
          });
          if (typeof c === "string") chosenColor = c;
        } catch { /* fallback nedenfor */ }
        if (!chosenColor) {
          const usedColorsThisDay = calendarRoutes
            .filter((r) => r.route_date === newDate).map((r) => r.color);
          chosenColor = pickAvailableColor(usedColorsThisDay);
        }
        const created = await createRoute.mutateAsync({
          business_id: businessId, route_date: newDate, name: null, color: chosenColor,
        });
        await addStop.mutateAsync({
          route_id: created.id, order_id: job.id, sequence: 0,
          customer_name: job.customer_name, customer_phone: job.customer_phone,
          address: job.address || [job.zip_code, job.city].filter(Boolean).join(" "),
          latitude: job.latitude, longitude: job.longitude,
          service_summary: serviceSummaryForJob(job),
          duration_minutes: Number(job.estimated_duration_minutes) || 30,
          time_window_start: job.preferred_time_start || null,
          time_window_end: job.preferred_time_end || null,
        });
        pushBatchedToast(
          "success",
          `Ny rute oprettet på ${format(parseISO(newDate), "d. MMM", { locale: da })}`,
          { key: "rp-create-route", successWord: "nye ruter oprettet", errorWord: "fejlede" },
        );
        void linkAgreementToRoute(job.id, created.id);
      };
      if (!ensureStartDateMatches(
        job, newDate,
        `${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`,
        async () => { await shiftJobStartDate(job.id, newDate); await performCreateRouteWithStop(); },
      )) { releaseDrop(); return; }
      try {
        await performCreateRouteWithStop();
      } catch (err: any) {
        const msg = String(err?.message || "");
        if (msg.includes("uniq_route_stops_route_order") || msg.includes("duplicate key")) {
          toast.info("Aftalen ligger allerede på en rute den dag");
          invalidateRouteSyncQueries(qc);
        } else {
          toastRouteError(err, toast.error, { titleFallback: "Kunne ikke oprette rute" });
        }
      } finally {
        releaseDrop();
      }
      return;
    }

    if (op.type === "move-stop-to-day") {
      const { stop, newDate, currentRouteDate } = op;
      if (!(await claimIdempotency())) {
        toast.info("Stoppet er allerede ved at blive flyttet");
        releaseDrop(); return;
      }
      const conflictMsg = detectAssigneeConflicts(stop, newDate);
      const performMoveStop = async () => {
        const { data, error } = await supabase.rpc("move_stops_to_date", {
          _stop_ids: [stop.id], _target_date: newDate,
        });
        if (error) throw error;
        const row = Array.isArray(data) ? data[0] : data;
        const moved = Number(row?.moved_count ?? 0);
        const missing = Number(row?.missing_employee_count ?? 0);
        if (moved > 0) {
          try { await renameFreshSplitRoutes([stop.id], newDate); }
          catch (err) { console.warn("renameFreshSplitRoutes", err); }
          const originalDate = currentRouteDate;
          if (originalDate && originalDate !== newDate) {
            pushRouteUndo({
              label: `Flyt stop tilbage til ${format(parseISO(originalDate), "d. MMM", { locale: da })}`,
              undo: async () => {
                const { error: undoErr } = await supabase.rpc("move_stops_to_date", {
                  _stop_ids: [stop.id], _target_date: originalDate,
                });
                if (undoErr) throw undoErr;
                invalidateRouteSyncQueries(qc);
                toast.success("Stop flyttet tilbage");
              },
            });
          }
          if (conflictMsg) {
            toast.success(
              `Stop flyttet til ${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`,
              { description: `⚠️ ${conflictMsg} — tjek tidsplanen` },
            );
          } else {
            pushBatchedToast(
              "success",
              `Stop flyttet til ${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`,
              { key: "rp-move-stop", successWord: "stops flyttet", errorWord: "fejlede" },
            );
          }
        }
        if (missing > 0) {
          toast.error("Stoppet mangler en medarbejder for at kunne flyttes", {
            description: "Tilknyt en medarbejder til ruten eller aftalen, og prøv igen.",
          });
        }
      };
      let startDateForJob: string | null = null;
      let customerName: string | null = stop.customer_name || null;
      if (stop.order_id) {
        try {
          const { data: o } = await supabase
            .from("orders")
            .select("preferred_date, next_service_date, customer_name")
            .eq("id", stop.order_id)
            .maybeSingle();
          if (o) {
            startDateForJob = (o.preferred_date || o.next_service_date) as string | null;
            customerName = customerName || (o.customer_name as string | null);
          }
        } catch { /* stille fejl */ }
      }
      if (startDateForJob && String(startDateForJob).slice(0, 10) !== newDate) {
        const startStr = String(startDateForJob).slice(0, 10);
        setPendingStartDateChange({
          job: { id: stop.order_id, customer_name: customerName },
          currentStart: startStr,
          targetDate: newDate,
          isBefore: newDate < startStr,
          targetLabel: `${format(parseISO(newDate), "EEEE d. MMM", { locale: da })}`,
          execute: async () => { await shiftJobStartDate(stop.order_id, newDate); await performMoveStop(); },
        });
        releaseDrop();
        return;
      }
      try {
        await performMoveStop();
      } catch (err: any) {
        toastRouteError(err, toast.error, { titleFallback: "Kunne ikke flytte stop" });
      } finally {
        releaseDrop();
      }
      return;
    }

    releaseDrop();
  }, [
    businessId, qc,
    calendarRoutesRaw, calendarRoutes, calendarStops, virtualCalendarRoutes,
    addStop, createRoute,
    setPendingProjectedMove, setPendingRouteMerge, setPendingRouteMove, setPendingStartDateChange,
    setActiveDragId, setActiveDragData, setRouteDragPoint, setDragOverTargetId, setTargetBusy,
    activeDragPointRef, activeDragOriginRef, activeRouteDragPointRef, activeRouteDragOriginRef,
    inFlightDropsRef, detectAssigneeConflicts, serviceSummaryForJob, todayStr,
  ]);
}