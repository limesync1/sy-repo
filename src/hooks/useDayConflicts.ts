import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { detectConflicts, type ConflictStop, type Conflict } from "@/lib/route-conflicts";

/**
 * Henter alle planlagte stops på en virksomheds ruter for en given dato
 * (eller datointerval) og returnerer dobbeltbookinger pr. medarbejder.
 * Bruges af UI til at advare brugeren før medarbejder-skift eller flyt
 * af aftaler skaber konflikter.
 */
export const useDayConflicts = (
  businessId: string | undefined,
  date: string | undefined,
): { conflicts: Conflict[]; isLoading: boolean } => {
  const q = useQuery({
    queryKey: ["day-conflicts", businessId, date],
    enabled: !!businessId && !!date,
    staleTime: 15_000,
    queryFn: async (): Promise<Conflict[]> => {
      if (!businessId || !date) return [];
      const { data: routes } = await supabase
        .from("routes")
        .select("id, route_date")
        .eq("business_id", businessId)
        .eq("route_date", date)
        .is("archived_at", null)
        .is("deleted_at", null);
      const routeIds = (routes || []).map((r: any) => r.id);
      if (routeIds.length === 0) return [];
      const [{ data: stops }, { data: assignees }] = await Promise.all([
        supabase
          .from("route_stops")
          .select("id, route_id, assigned_employee_id, time_window_start, time_window_end, customer_name, agreement_occurrence_id")
          .in("route_id", routeIds)
          .neq("status", "cancelled"),
        supabase
          .from("route_stop_assignees")
          .select("stop_id, employee_id")
          .in("stop_id", []), // placeholder; we replace below
      ]).then(async ([s]) => {
        const stopIds = (s.data || []).map((x: any) => x.id);
        if (stopIds.length === 0) return [s, { data: [] as any[] }];
        const ass = await supabase
          .from("route_stop_assignees")
          .select("stop_id, employee_id")
          .in("stop_id", stopIds);
        return [s, ass];
      });
      const byStop = new Map<string, string[]>();
      (assignees || []).forEach((a: any) => {
        const arr = byStop.get(a.stop_id) || [];
        arr.push(a.employee_id);
        byStop.set(a.stop_id, arr);
      });
      const input: ConflictStop[] = (stops || []).map((s: any) => ({
        id: s.id,
        route_id: s.route_id,
        route_date: date,
        employee_ids: Array.from(new Set([
          s.assigned_employee_id,
          ...(byStop.get(s.id) || []),
        ].filter(Boolean))),
        start_time: s.time_window_start,
        end_time: s.time_window_end,
        label: s.customer_name,
      }));
      return detectConflicts(input);
    },
  });
  return { conflicts: q.data || [], isLoading: q.isLoading };
};
