import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * useRouteSnapshots — Bølge 4 / 4.3 i .lovable/plan.md
 * -----------------------------------------------------------------------------
 * Læser og opretter point-in-time snapshots af ruter via den server-side
 * `snapshot_route(_route_id, _reason)`-funktion. Snapshots er immutable og
 * bruges af reklamationer, simulation-rollback og audit/GDPR-eksport.
 */

export type RouteSnapshot = {
  id: string;
  route_id: string;
  business_id: string;
  snapshot_date: string;
  payload: Record<string, unknown>;
  reason: string;
  locked_at: string;
  created_by: string | null;
};

/** Henter alle snapshots for en given rute (nyeste først). */
export const useRouteSnapshots = (routeId: string | undefined) => {
  return useQuery({
    queryKey: ["route-snapshots", routeId],
    enabled: !!routeId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!routeId) return [] as RouteSnapshot[];
      const { data, error } = await (supabase as any)
        .from("route_snapshots")
        .select("id, route_id, business_id, snapshot_date, payload, reason, locked_at, created_by")
        .eq("route_id", routeId)
        .order("locked_at", { ascending: false });
      if (error) throw error;
      return (data || []) as RouteSnapshot[];
    },
  });
};

/**
 * Mutation der kalder `snapshot_route` på serveren. Returnerer det nye
 * snapshot-id (eller null hvis et identisk snapshot allerede fandtes —
 * pga. UNIQUE (route_id, snapshot_date, reason)).
 */
export const useCreateRouteSnapshot = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { routeId: string; reason?: string }) => {
      const { data, error } = await (supabase as any).rpc("snapshot_route", {
        _route_id: args.routeId,
        _reason: args.reason ?? "locked",
      });
      if (error) throw error;
      return data as string | null;
    },
    onSuccess: (_id, vars) => {
      qc.invalidateQueries({ queryKey: ["route-snapshots", vars.routeId] });
    },
  });
};