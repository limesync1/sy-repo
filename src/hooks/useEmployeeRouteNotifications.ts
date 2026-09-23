import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useMyEmployee } from "@/hooks/useMyEmployee";

export const useEmployeeRouteNotifications = () => {
  const { data: employee } = useMyEmployee();
  return useQuery({
    queryKey: ["employee-route-notifications", employee?.id],
    enabled: !!employee?.id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employee_route_notifications")
        .select("*")
        .eq("employee_id", employee!.id)
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useMarkRouteNotificationRead = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("employee_route_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-route-notifications"] }),
  });
};