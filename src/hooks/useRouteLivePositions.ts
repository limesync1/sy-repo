import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type RouteLivePosition = {
  employee_id: string;
  latitude: number;
  longitude: number;
  heading: number | null;
  accuracy_m: number | null;
  speed_mps: number | null;
  current_stop_id: string | null;
  recorded_at: string;
  expires_at: string;
};

export const useRouteLivePositions = (routeId?: string | null) => useQuery({
  queryKey: ["route-live-positions", routeId],
  enabled: !!routeId,
  refetchInterval: 15_000,
  staleTime: 10_000,
  queryFn: async () => {
    const { data, error } = await supabase
      .from("route_live_positions")
      .select("employee_id, latitude, longitude, heading, accuracy_m, speed_mps, current_stop_id, recorded_at, expires_at")
      .eq("route_id", routeId as string)
      .gt("expires_at", new Date().toISOString())
      .order("recorded_at", { ascending: false });
    if (error) throw error;
    return (data ?? []) as RouteLivePosition[];
  },
});