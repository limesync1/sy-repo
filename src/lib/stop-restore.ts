// stop-restore — re-inserter et nyligt slettet route_stop med samme id,
// så brugeren kan fortryde sletningen via toastSuccessWithUndo.
//
// Bemærk: route_stops har ikke en deleted_at-kolonne i skemaet, så vi
// laver en "logisk" soft-delete på client-siden ved at gemme et snapshot
// af rækken + dens assignees og re-inserte med samme primary key, hvis
// brugeren klikker Fortryd inden for toastens levetid. Undo afvises
// hvis ruten i mellemtiden er blevet slettet (route_deleted=true ved
// remove_route_stop_safely).
import { supabase } from "@/integrations/supabase/client";
import type { QueryClient } from "@tanstack/react-query";
import type { RouteStop } from "@/hooks/useRoutes";
import { routeHistory } from "@/lib/route-history";
import { toastSuccessWithUndo } from "@/lib/toast-undo";
import { toast } from "sonner";

const STOP_INSERT_FIELDS = [
  "id", "route_id", "order_id", "subscription_id", "sequence",
  "status", "customer_name", "customer_phone", "address",
  "latitude", "longitude", "service_summary", "notes",
  "planned_arrival", "planned_departure", "photo_urls",
  "duration_minutes", "time_window_start", "time_window_end",
  "distance_to_next_km", "travel_time_to_next_min",
  "assigned_employee_id", "required_staff", "agreement_occurrence_id",
] as const;

function snapshotRow(stop: RouteStop): Record<string, unknown> {
  const row: Record<string, unknown> = {};
  for (const k of STOP_INSERT_FIELDS) {
    const v = (stop as any)[k];
    if (v !== undefined) row[k] = v;
  }
  return row;
}

export type RegisterStopUndoOpts = {
  stop: RouteStop;
  message: string;
  description?: string;
  /** Sat til true når RPC'en svarede route_deleted=true — så undo afvises. */
  routeDeleted?: boolean;
  qc: QueryClient;
};

export function registerStopRestoreUndo({
  stop, message, description, routeDeleted, qc,
}: RegisterStopUndoOpts): void {
  // Hvis ruten er slettet sammen med stoppet, kan vi ikke trivielt
  // re-inserte — falder tilbage til en almindelig success-toast uden
  // fortryd-knap (brugeren kan altid genskabe stoppet manuelt).
  if (routeDeleted) {
    toast.success(message, description ? { description } : undefined);
    return;
  }
  const snapshot = snapshotRow(stop);
  const assigneeIds = stop.assignee_ids ?? [];
  const leadId = stop.lead_employee_id ?? stop.assigned_employee_id ?? null;

  routeHistory.push({
    label: `Sletning af stop på ${stop.customer_name || "ruten"}`,
    undo: async () => {
      const { error } = await supabase.from("route_stops").insert(snapshot as any);
      if (error) throw new Error(error.message);
      if (assigneeIds.length > 0) {
        const rows = assigneeIds.map((eid) => ({
          stop_id: stop.id,
          employee_id: eid,
          is_lead: eid === leadId,
        }));
        // Best-effort — manglende assignees forhindrer ikke restore.
        await supabase.from("route_stop_assignees")
          .upsert(rows, { onConflict: "stop_id,employee_id" });
      }
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
      qc.invalidateQueries({ queryKey: ["routes-with-stops"] });
      qc.invalidateQueries({ queryKey: ["stop-assignees-bulk"] });
      qc.invalidateQueries({ queryKey: ["agreements"] });
    },
  });
  toastSuccessWithUndo({ message, description });
}