import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Route = {
  id: string;
  business_id: string;
  employee_id: string | null;
  route_date: string; // YYYY-MM-DD
  status: string;
  total_distance_km: number | null;
  optimized_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type RouteStop = {
  id: string;
  route_id: string;
  order_id: string | null;
  subscription_id: string | null;
  sequence: number;
  status: string;
  customer_name: string | null;
  customer_phone: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  service_summary: string | null;
  notes: string | null;
  planned_arrival: string | null;
  completed_at: string | null;
  photo_urls: string[] | null;
};

/* ─── Routes for a date range (planner view) ─── */
export const useRoutesForDate = (businessId: string | undefined, date: string) => {
  return useQuery({
    queryKey: ["routes", businessId, date],
    enabled: !!businessId && !!date,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("business_id", businessId!)
        .eq("route_date", date)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data || []) as Route[];
    },
  });
};

/* ─── Stops on a single route ─── */
export const useRouteStops = (routeId: string | undefined) => {
  return useQuery({
    queryKey: ["route-stops", routeId],
    enabled: !!routeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_stops")
        .select("*")
        .eq("route_id", routeId!)
        .order("sequence", { ascending: true });
      if (error) throw error;
      return (data || []) as RouteStop[];
    },
  });
};

/* ─── Stops on multiple routes (planner) ─── */
export const useStopsForRoutes = (routeIds: string[]) => {
  return useQuery({
    queryKey: ["route-stops-bulk", routeIds.sort().join(",")],
    enabled: routeIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_stops")
        .select("*")
        .in("route_id", routeIds)
        .order("sequence", { ascending: true });
      if (error) throw error;
      return (data || []) as RouteStop[];
    },
  });
};

/* ─── Unassigned: confirmed/in_progress orders not yet on a route for this date ─── */
export const useUnassignedJobs = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ["unassigned-jobs", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      // Pull orders that are confirmed/pending/in_progress and not yet linked to a stop
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, customer_name, customer_phone, customer_email, total_amount, status, notes, created_at")
        .eq("business_id", businessId!)
        .in("status", ["pending", "confirmed", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(100);
      if (error) throw error;

      const orderIds = (orders || []).map((o) => o.id);
      if (orderIds.length === 0) return [];

      const { data: usedStops } = await supabase
        .from("route_stops")
        .select("order_id")
        .in("order_id", orderIds);

      const used = new Set((usedStops || []).map((s) => s.order_id));
      return (orders || []).filter((o) => !used.has(o.id));
    },
  });
};

/* ─── Create or get a route for an employee+date ─── */
export const useUpsertRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ business_id, employee_id, route_date }: { business_id: string; employee_id: string | null; route_date: string }) => {
      // Try find existing
      const { data: existing } = await supabase
        .from("routes")
        .select("*")
        .eq("business_id", business_id)
        .eq("route_date", route_date)
        .eq(employee_id ? "employee_id" : "employee_id", employee_id as any)
        .maybeSingle();
      if (existing) return existing as Route;
      const { data, error } = await supabase
        .from("routes")
        .insert({ business_id, employee_id, route_date })
        .select("*")
        .single();
      if (error) throw error;
      return data as Route;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["routes", vars.business_id, vars.route_date] });
    },
  });
};

/* ─── Add a stop to a route ─── */
export const useAddStop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      route_id: string;
      order_id?: string | null;
      subscription_id?: string | null;
      sequence: number;
      customer_name?: string | null;
      customer_phone?: string | null;
      address?: string | null;
      service_summary?: string | null;
    }) => {
      const { data, error } = await supabase
        .from("route_stops")
        .insert({
          route_id: payload.route_id,
          order_id: payload.order_id ?? null,
          subscription_id: payload.subscription_id ?? null,
          sequence: payload.sequence,
          customer_name: payload.customer_name ?? null,
          customer_phone: payload.customer_phone ?? null,
          address: payload.address ?? null,
          service_summary: payload.service_summary ?? null,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as RouteStop;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
      qc.invalidateQueries({ queryKey: ["unassigned-jobs"] });
    },
  });
};

/* ─── Reorder / move stops ─── */
export const useUpdateStop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<RouteStop> & { id: string }) => {
      const { data, error } = await supabase
        .from("route_stops")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as RouteStop;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
      qc.invalidateQueries({ queryKey: ["route-stops"] });
    },
  });
};

export const useDeleteStop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("route_stops").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
      qc.invalidateQueries({ queryKey: ["unassigned-jobs"] });
    },
  });
};

export const useUpdateStopStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: any = { status };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      if (notes !== undefined) updates.notes = notes;
      const { data, error } = await supabase
        .from("route_stops")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as RouteStop;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-stops"] });
      qc.invalidateQueries({ queryKey: ["my-day-stops"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke opdatere stop"),
  });
};

/* ─── Employee: my routes today ─── */
export const useMyDayRoutes = (date: string) => {
  return useQuery({
    queryKey: ["my-day-routes", date],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];
      const { data: emp } = await supabase
        .from("employees")
        .select("id, business_id, name")
        .eq("user_id", user.user.id)
        .maybeSingle();
      if (!emp) return [];
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("employee_id", emp.id)
        .eq("route_date", date);
      if (error) throw error;
      return (data || []) as Route[];
    },
  });
};

export const useMyDayStops = (date: string) => {
  return useQuery({
    queryKey: ["my-day-stops", date],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];
      const { data: emp } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.user.id)
        .maybeSingle();
      if (!emp) return [];
      const { data: routes } = await supabase
        .from("routes")
        .select("id")
        .eq("employee_id", emp.id)
        .eq("route_date", date);
      const routeIds = (routes || []).map((r) => r.id);
      if (routeIds.length === 0) return [];
      const { data, error } = await supabase
        .from("route_stops")
        .select("*")
        .in("route_id", routeIds)
        .order("sequence", { ascending: true });
      if (error) throw error;
      return (data || []) as RouteStop[];
    },
  });
};
