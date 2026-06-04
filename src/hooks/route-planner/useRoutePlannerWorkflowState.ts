import { differenceInCalendarDays, parseISO } from "date-fns";
import { useEffect, useState } from "react";
import { useRouteSeriesInfo } from "@/hooks/useRouteSeriesInfo";
import type { Route } from "@/hooks/useRoutes";

/**
 * useRoutePlannerWorkflowState
 * -----------------------------------------------------------------------------
 * Samler de mange `pending*`-dialog states fra RoutePlanner ét sted. Hooken
 * holder kun state og afledte query-data (serie-info pr. pending dialog) samt
 * smart-default-effekten for projiceret flytning. De faktiske confirm/cancel-
 * handlers bor stadig i RoutePlanner fordi de er dybt vævet sammen med
 * mutationer, supabase-kald og toasts; men ved at samle state-overfladen kan
 * vi senere migrere det hele til en `useReducer` uden flere call-site-ændringer.
 */
export function useRoutePlannerWorkflowState() {
  // ── Pending-flyt af en hel rute (eller serie) til ny dato
  const [pendingRouteMove, setPendingRouteMove] = useState<{
    route: Route;
    newDate: string;
  } | null>(null);

  // ── Optimer-prompt vist efter en vellykket flytning/merge
  const [pendingOptimizePrompt, setPendingOptimizePrompt] = useState<{
    routeId: string;
    routeName: string;
    reason: "moved" | "merged";
    estimate: { savingsKm: number; savingsPct: number; currentKm: number; suggestedKm: number };
  } | null>(null);

  // ── Pending drag-and-drop af en projiceret forekomst til ny dato
  const [pendingProjectedMove, setPendingProjectedMove] = useState<{
    baseRouteId: string;
    routeName: string;
    fromDate: string;
    toDate: string;
    autoSkipCadence?: boolean;
  } | null>(null);

  // ── Pending route-merge
  const [pendingRouteMerge, setPendingRouteMerge] = useState<{
    source: Route;
    target: Route;
  } | null>(null);
  const [mergingRoute, setMergingRoute] = useState(false);

  // ── Start-date konflikter (enkelt + bulk)
  const [pendingStartDateChange, setPendingStartDateChange] = useState<{
    job: any;
    currentStart: string;
    targetDate: string;
    isBefore: boolean;
    targetLabel: string;
    execute: () => Promise<void>;
  } | null>(null);
  const [confirmingStartDate, setConfirmingStartDate] = useState(false);

  const [pendingBulkStartDateChange, setPendingBulkStartDateChange] = useState<{
    targetDate: string;
    mismatches: Array<{ job: any; currentStart: string }>;
    execute: () => Promise<void>;
  } | null>(null);
  const [confirmingBulkStartDate, setConfirmingBulkStartDate] = useState(false);

  // ── Afledte query-data brugt af dialogerne
  const { data: pendingSeriesInfo } = useRouteSeriesInfo(
    pendingRouteMove?.route.id ?? null,
    pendingRouteMove?.route.route_date ?? null,
  );
  const { data: pendingProjectedSeriesInfo } = useRouteSeriesInfo(
    pendingProjectedMove?.baseRouteId ?? null,
    pendingProjectedMove?.fromDate ?? null,
  );
  const { data: pendingMergeSeriesInfo } = useRouteSeriesInfo(
    pendingRouteMerge?.source.id ?? null,
    pendingRouteMerge?.source.route_date ?? null,
  );

  // ── Sync-flags for projiceret flytning + smart-default-effekt
  const [projectedMoveSyncStart, setProjectedMoveSyncStart] = useState(false);
  const [projectedMoveSyncNext, setProjectedMoveSyncNext] = useState(false);

  useEffect(() => {
    if (!pendingProjectedMove) {
      setProjectedMoveSyncStart(false);
      setProjectedMoveSyncNext(false);
      return;
    }
    const intv = pendingProjectedSeriesInfo?.dominantIntervalDays;
    if (!intv || intv <= 0) {
      setProjectedMoveSyncStart(false);
      setProjectedMoveSyncNext(true);
      return;
    }
    let delta = 0;
    try {
      delta = Math.abs(
        differenceInCalendarDays(
          parseISO(pendingProjectedMove.toDate),
          parseISO(pendingProjectedMove.fromDate),
        ),
      );
    } catch {}
    if (delta >= intv) {
      setProjectedMoveSyncStart(true);
      setProjectedMoveSyncNext(false);
    } else {
      setProjectedMoveSyncStart(false);
      setProjectedMoveSyncNext(true);
    }
  }, [pendingProjectedMove, pendingProjectedSeriesInfo?.dominantIntervalDays]);

  return {
    pendingRouteMove,
    setPendingRouteMove,
    pendingOptimizePrompt,
    setPendingOptimizePrompt,
    pendingProjectedMove,
    setPendingProjectedMove,
    pendingRouteMerge,
    setPendingRouteMerge,
    mergingRoute,
    setMergingRoute,
    pendingStartDateChange,
    setPendingStartDateChange,
    confirmingStartDate,
    setConfirmingStartDate,
    pendingBulkStartDateChange,
    setPendingBulkStartDateChange,
    confirmingBulkStartDate,
    setConfirmingBulkStartDate,
    pendingSeriesInfo,
    pendingProjectedSeriesInfo,
    pendingMergeSeriesInfo,
    projectedMoveSyncStart,
    setProjectedMoveSyncStart,
    projectedMoveSyncNext,
    setProjectedMoveSyncNext,
  };
}