import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Route = {
  id: string;
  business_id: string;
  employee_id: string | null;
  route_date: string;
  status: string;
  total_distance_km: number | null;
  total_duration_minutes: number | null;
  optimized_at: string | null;
  notes: string | null;
  start_address: string | null;
  start_latitude: number | null;
  start_longitude: number | null;
  planned_start_time: string | null;
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
  planned_departure: string | null;
  completed_at: string | null;
  photo_urls: string[] | null;
  duration_minutes: number;
  time_window_start: string | null;
  time_window_end: string | null;
  distance_to_next_km: number | null;
  travel_time_to_next_min: number | null;
};

/* ─── Routes for a date (planner view) ─── */
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

/* ─── Routes for a week range (multi-day overview) ─── */
export const useRoutesForRange = (businessId: string | undefined, fromDate: string, toDate: string) => {
  return useQuery({
    queryKey: ["routes-range", businessId, fromDate, toDate],
    enabled: !!businessId && !!fromDate && !!toDate,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("business_id", businessId!)
        .gte("route_date", fromDate)
        .lte("route_date", toDate)
        .order("route_date", { ascending: true });
      if (error) throw error;
      return (data || []) as Route[];
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

/* ─── Unassigned: orders with status pending/confirmed/in_progress not yet on a route ─── */
export const useUnassignedJobs = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ["unassigned-jobs", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, customer_name, customer_phone, customer_email, total_amount, status, notes, address, zip_code, city, latitude, longitude, created_at")
        .eq("business_id", businessId!)
        .in("status", ["pending", "confirmed", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(200);
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
    mutationFn: async ({
      business_id, employee_id, route_date,
    }: { business_id: string; employee_id: string | null; route_date: string }) => {
      let query = supabase
        .from("routes")
        .select("*")
        .eq("business_id", business_id)
        .eq("route_date", route_date);
      query = employee_id === null ? query.is("employee_id", null) : query.eq("employee_id", employee_id);
      const { data: existing } = await query.maybeSingle();
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
      latitude?: number | null;
      longitude?: number | null;
      service_summary?: string | null;
      duration_minutes?: number;
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
          latitude: payload.latitude ?? null,
          longitude: payload.longitude ?? null,
          service_summary: payload.service_summary ?? null,
          duration_minutes: payload.duration_minutes ?? 30,
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

/* Bulk reorder — single round-trip for smooth dnd */
export const useReorderStops = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; sequence: number; route_id?: string }[]) => {
      // Run all updates in parallel
      await Promise.all(updates.map((u) => {
        const patch: any = { sequence: u.sequence };
        if (u.route_id) patch.route_id = u.route_id;
        return supabase.from("route_stops").update(patch).eq("id", u.id);
      }));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
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

/* ─── AI / heuristic optimize route ─── */
export const useOptimizeRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (routeId: string) => {
      const { data, error } = await supabase.functions.invoke("optimize-route", {
        body: { route_id: routeId, use_ai: true },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as { ok: true; reasoning: string; reordered: number; total_km: number; total_minutes: number };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
      qc.invalidateQueries({ queryKey: ["routes"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke optimere ruten"),
  });
};

/* ─── Geocode an address (used to enrich orders without coordinates) ─── */
export const useGeocodeAddress = () => {
  return useMutation({
    mutationFn: async (input: { address?: string; zip_code?: string; city?: string }) => {
      const { data, error } = await supabase.functions.invoke("geocode-address", { body: input });
      if (error) throw error;
      return data as { found: boolean; latitude?: number; longitude?: number; display_name?: string };
    },
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
