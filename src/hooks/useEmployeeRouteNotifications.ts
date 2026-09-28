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
        .select("*, routes(name, route_date), route_stops(customer_name, address, route_id)")
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

export const useMarkAllRouteNotificationsRead = () => {
  const { data: employee } = useMyEmployee();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!employee?.id) return;
      const { error } = await supabase
        .from("employee_route_notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("employee_id", employee.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["employee-route-notifications"] }),
  });
};

export const useDeleteRouteNotification = () => {
  const { data: employee } = useMyEmployee();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!employee?.id) return;
      const { error } = await supabase
        .from("employee_route_notifications")
        .delete()
        .eq("id", id)
        .eq("employee_id", employee.id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["employee-route-notifications", employee?.id] });
      const key = ["employee-route-notifications", employee?.id];
      const previous = qc.getQueryData<any[]>(key);
      qc.setQueryData<any[]>(key, (old = []) => old.filter((item) => item.id !== id));
      return { key, previous };
    },
    onError: (_error, _id, context) => context?.previous && qc.setQueryData(context.key, context.previous),
    onSettled: () => qc.invalidateQueries({ queryKey: ["employee-route-notifications"] }),
  });
};

export const useDeleteAllRouteNotifications = () => {
  const { data: employee } = useMyEmployee();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      if (!employee?.id) return;
      const { error } = await supabase
        .from("employee_route_notifications")
        .delete()
        .eq("employee_id", employee.id);
      if (error) throw error;
    },
    onSuccess: () => qc.setQueryData(["employee-route-notifications", employee?.id], []),
    onSettled: () => qc.invalidateQueries({ queryKey: ["employee-route-notifications"] }),
  });
};