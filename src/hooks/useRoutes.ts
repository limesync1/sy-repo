import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type Route = {
  id: string;
  business_id: string;
  employee_id: string | null; // legacy — kept for back-compat, not used in new model
  route_date: string;
  status: string;
  name: string | null;
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
  assigned_employee_id: string | null;
};

export type RouteEmployee = {
  id: string;
  route_id: string;
  employee_id: string;
};

/* ─── Routes for a date ─── */
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

export const useRoutesForRange = (businessId: string | undefined, from: string, to: string) => {
  return useQuery({
    queryKey: ["routes-range", businessId, from, to],
    enabled: !!businessId && !!from && !!to,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("business_id", businessId!)
        .gte("route_date", from)
        .lte("route_date", to)
        .order("route_date", { ascending: true });
      if (error) throw error;
      return (data || []) as Route[];
    },
  });
};

/* ─── Stops for a list of routes ─── */
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

/* ─── Route ↔ Employees junction ─── */
export const useRouteEmployees = (routeIds: string[]) => {
  return useQuery({
    queryKey: ["route-employees-bulk", routeIds.sort().join(",")],
    enabled: routeIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_employees")
        .select("*")
        .in("route_id", routeIds);
      if (error) throw error;
      return (data || []) as RouteEmployee[];
    },
  });
};

export const useAddRouteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ route_id, employee_id }: { route_id: string; employee_id: string }) => {
      const { error } = await supabase
        .from("route_employees")
        .insert({ route_id, employee_id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-employees-bulk"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke tilkoble medarbejder"),
  });
};

export const useRemoveRouteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ route_id, employee_id }: { route_id: string; employee_id: string }) => {
      const { error } = await supabase
        .from("route_employees")
        .delete()
        .eq("route_id", route_id)
        .eq("employee_id", employee_id);
      if (error) throw error;
      // Also clear assigned_employee_id on stops referencing this employee on this route
      await supabase
        .from("route_stops")
        .update({ assigned_employee_id: null })
        .eq("route_id", route_id)
        .eq("assigned_employee_id", employee_id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-employees-bulk"] });
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke fjerne medarbejder"),
  });
};

/* ─── Unassigned: orders not yet on a route ─── */
export const useUnassignedJobs = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ["unassigned-jobs", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id, customer_name, customer_phone, customer_email, total_amount, status, notes,
          address, zip_code, city, latitude, longitude, created_at,
          preferred_date, preferred_time_start, preferred_time_end, next_service_date,
          order_items ( service_name, quantity, total_price, details )
        `)
        .eq("business_id", businessId!)
        .in("status", ["pending", "confirmed", "in_progress"])
        .order("preferred_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;

      const orderIds = (orders || []).map((o) => o.id);
      if (orderIds.length === 0) return [];

      // Find ordrer der allerede har et åbent (ikke-completed) stop på en rute
      const { data: openStops } = await supabase
        .from("route_stops")
        .select("order_id, status")
        .in("order_id", orderIds)
        .neq("status", "completed");
      const usedOpen = new Set((openStops || []).map((s) => s.order_id));

      // Hent abonnement-status + preferred route pr. ordre
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("order_id, status, preferred_route_id")
        .in("order_id", orderIds);
      const subsByOrder = new Map<string, { statuses: string[]; preferredRouteId?: string | null }>();
      (subs || []).forEach((s: any) => {
        if (!s.order_id) return;
        const entry = subsByOrder.get(s.order_id) || { statuses: [], preferredRouteId: null };
        entry.statuses.push(s.status);
        if (s.preferred_route_id && !entry.preferredRouteId) entry.preferredRouteId = s.preferred_route_id;
        subsByOrder.set(s.order_id, entry);
      });

      // Hent rutenavn for preferred routes (vises som hint på kortet)
      const prefRouteIds = Array.from(new Set(
        Array.from(subsByOrder.values()).map(v => v.preferredRouteId).filter(Boolean) as string[]
      ));
      const routeNameById = new Map<string, string>();
      if (prefRouteIds.length > 0) {
        const { data: rts } = await supabase
          .from("routes")
          .select("id, name")
          .in("id", prefRouteIds);
        (rts || []).forEach((r: any) => routeNameById.set(r.id, r.name || "Rute"));
      }

      // Skjul recurring ordrer hvis næste service-dato er mere end 14 dage fremme
      const horizon = new Date();
      horizon.setDate(horizon.getDate() + 14);

      return (orders || [])
        .filter((o) => {
          if (usedOpen.has(o.id)) return false;
          const entry = subsByOrder.get(o.id);
          if (entry && entry.statuses.length > 0) {
            const anyActive = entry.statuses.some((st) => st === "active");
            if (!anyActive) return false; // alle på pause/annulleret
          }
          if (o.next_service_date) {
            const nsd = new Date(o.next_service_date);
            if (nsd > horizon) return false;
          }
          return true;
        })
        .map((o) => {
          const entry = subsByOrder.get(o.id);
          const prefId = entry?.preferredRouteId || null;
          return {
            ...o,
            preferred_route_id: prefId,
            preferred_route_name: prefId ? (routeNameById.get(prefId) || null) : null,
          };
        });
    },
  });
};

export const useOrderForStop = (orderId: string | null | undefined) => {
  return useQuery({
    queryKey: ["order-for-stop", orderId],
    enabled: !!orderId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            service_name, quantity, unit_price, total_price, details,
            services ( id, description, service_category, subcategory, pricing_type, unit, base_price, image_url, interval_options )
          ),
          businesses ( name, phone, email )
        `)
        .eq("id", orderId!)
        .maybeSingle();
      if (error) throw error;

      // Also fetch any active/paused subscription tied to this order so the
      // planner sees if the visit is recurring and on which interval.
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("id, interval, status, next_service_date, paused_at, total_price, service_name")
        .eq("order_id", orderId!);

      return { ...(data || {}), subscriptions: subs || [] } as any;
    },
  });
};

/* ─── Create a NEW route (manually). Always seeds start address from business. ─── */
export const useCreateRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      business_id, route_date, name,
    }: { business_id: string; route_date: string; name?: string | null }) => {
      const { data: biz } = await supabase
        .from("businesses")
        .select("address, zip_code, city")
        .eq("id", business_id)
        .maybeSingle();
      const startAddr = biz
        ? [biz.address, [biz.zip_code, biz.city].filter(Boolean).join(" ")].filter(Boolean).join(", ")
        : null;

      let startLat: number | null = null, startLng: number | null = null;
      if (startAddr) {
        try {
          const { data: geo } = await supabase.functions.invoke("geocode-address", {
            body: { address: biz?.address, zip_code: biz?.zip_code, city: biz?.city },
          });
          if (geo?.found) { startLat = geo.latitude; startLng = geo.longitude; }
        } catch { /* non-fatal */ }
      }

      const { data, error } = await supabase
        .from("routes")
        .insert({
          business_id,
          route_date,
          name: name || null,
          start_address: startAddr,
          start_latitude: startLat,
          start_longitude: startLng,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as Route;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["routes", vars.business_id, vars.route_date] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke oprette rute"),
  });
};

/* Legacy alias kept for back-compat — now creates a route without locking to an employee.
   Kept so older callers compile. New UI should use useCreateRoute. */
export const useUpsertRoute = () => {
  const create = useCreateRoute();
  return {
    ...create,
    mutateAsync: async (vars: { business_id: string; employee_id: string | null; route_date: string }) =>
      create.mutateAsync({ business_id: vars.business_id, route_date: vars.route_date }),
  } as any;
};

export const useDeleteRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (routeId: string) => {
      const { error } = await supabase.from("routes").delete().eq("id", routeId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
      qc.invalidateQueries({ queryKey: ["route-employees-bulk"] });
      qc.invalidateQueries({ queryKey: ["unassigned-jobs"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke slette rute"),
  });
};

/* ─── Stops ─── */
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
      assigned_employee_id?: string | null;
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
          assigned_employee_id: payload.assigned_employee_id ?? null,
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

export const useReorderStops = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { id: string; sequence: number; route_id?: string }[]) => {
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

export const useOptimizeRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    // mutationKey lader os bruge useIsMutating() pr. routeId i UI
    mutationKey: ["optimize-route"],
    mutationFn: async (routeId: string) => {
      const { data, error } = await supabase.functions.invoke("optimize-route", {
        body: { route_id: routeId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as {
        ok: true; reasoning: string; reordered: number;
        total_km: number; total_minutes: number; provider?: string; groups?: number;
      };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["routes-range"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke optimere ruten"),
  });
};

/* ─── Auto-fordel: tildel utildelte stops til medarbejdere uden at skabe overlap.
   Vælger medarbejder med færrest stops OG hvor stoppets tidsvindue er ledigt.
   Hvis ingen er ledige, vælges den med færrest stops (fallback) — UI viser så konflikt-badge. ─── */
export const useAutoAssignStops = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ routeId, employeeIds }: { routeId: string; employeeIds: string[] }) => {
      if (employeeIds.length === 0) throw new Error("Ingen medarbejdere tilkoblet");
      const { data: stops, error } = await supabase
        .from("route_stops")
        .select("id, assigned_employee_id, latitude, longitude, planned_arrival, duration_minutes")
        .eq("route_id", routeId);
      if (error) throw error;

      const unassigned = (stops || []).filter((s) => !s.assigned_employee_id);
      if (unassigned.length === 0) return { assigned: 0 };

      // Helper: minutter siden midnat
      const isoMin = (iso: string | null) => {
        if (!iso) return null;
        const d = new Date(iso);
        if (isNaN(d.getTime())) return null;
        return d.getHours() * 60 + d.getMinutes();
      };

      // Byg busy-intervaller pr. medarbejder
      type Busy = { start: number; end: number };
      const busyByEmp = new Map<string, Busy[]>();
      for (const eid of employeeIds) busyByEmp.set(eid, []);
      for (const s of stops || []) {
        if (!s.assigned_employee_id || !busyByEmp.has(s.assigned_employee_id)) continue;
        const start = isoMin(s.planned_arrival);
        if (start == null) continue;
        busyByEmp.get(s.assigned_employee_id)!.push({
          start, end: start + Math.max(s.duration_minutes || 30, 15),
        });
      }

      // Tæl total stops pr. medarbejder for balance
      const counts = new Map<string, number>();
      for (const eid of employeeIds) counts.set(eid, 0);
      for (const s of stops || []) {
        if (s.assigned_employee_id && counts.has(s.assigned_employee_id)) {
          counts.set(s.assigned_employee_id, (counts.get(s.assigned_employee_id) || 0) + 1);
        }
      }

      const assignments: { id: string; assigned_employee_id: string }[] = [];
      for (const stop of unassigned) {
        const start = isoMin(stop.planned_arrival);
        const dur = Math.max(stop.duration_minutes || 30, 15);
        const end = start != null ? start + dur : null;

        // 1. find ledige (uden overlap), foretræk færrest stops
        let pickedId: string | null = null;
        let pickedCount = Infinity;
        if (start != null && end != null) {
          for (const eid of employeeIds) {
            const busy = busyByEmp.get(eid) || [];
            const clash = busy.some((b) => start < b.end && end > b.start);
            if (clash) continue;
            const c = counts.get(eid) ?? 0;
            if (c < pickedCount) { pickedCount = c; pickedId = eid; }
          }
        }
        // 2. fallback: færrest stops uanset
        if (!pickedId) {
          for (const eid of employeeIds) {
            const c = counts.get(eid) ?? 0;
            if (c < pickedCount) { pickedCount = c; pickedId = eid; }
          }
          if (!pickedId) pickedId = employeeIds[0];
        }
        counts.set(pickedId, (counts.get(pickedId) ?? 0) + 1);
        if (start != null && end != null) {
          busyByEmp.get(pickedId)!.push({ start, end });
        }
        assignments.push({ id: stop.id, assigned_employee_id: pickedId });
      }

      await Promise.all(assignments.map((a) =>
        supabase.from("route_stops")
          .update({ assigned_employee_id: a.assigned_employee_id })
          .eq("id", a.id),
      ));

      return { assigned: assignments.length };
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke fordele opgaver"),
  });
};

export const useGeocodeAddress = () => {
  return useMutation({
    mutationFn: async (input: { address?: string; zip_code?: string; city?: string }) => {
      const { data, error } = await supabase.functions.invoke("geocode-address", { body: input });
      if (error) throw error;
      return data as { found: boolean; latitude?: number; longitude?: number; display_name?: string };
    },
  });
};

export const useUpdateRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Route> & { id: string }) => {
      const { data, error } = await supabase
        .from("routes")
        .update(updates)
        .eq("id", id)
        .select("*")
        .single();
      if (error) throw error;
      return data as Route;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["routes-range"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke opdatere rute"),
  });
};

/* ─── Dispatch route — sends email to a SPECIFIC employee on the route. ─── */
export const useDispatchRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ routeId, employeeId }: { routeId: string; employeeId: string }) => {
      const { data: route, error: rErr } = await supabase
        .from("routes")
        .select("*, businesses(name)")
        .eq("id", routeId)
        .single();
      if (rErr) throw rErr;

      const { data: emp, error: eErr } = await supabase
        .from("employees")
        .select("name, email")
        .eq("id", employeeId)
        .single();
      if (eErr) throw eErr;
      if (!emp?.email) throw new Error("Medarbejderen har ingen email");

      const biz: any = (route as any).businesses;

      // Stops assigned to this employee on this route
      const { data: stops } = await supabase
        .from("route_stops")
        .select("*")
        .eq("route_id", routeId)
        .eq("assigned_employee_id", employeeId)
        .order("sequence", { ascending: true });
      const stopList = stops || [];
      if (stopList.length === 0) throw new Error("Medarbejderen har ingen stop på denne rute");

      await supabase.from("routes").update({ status: "dispatched" }).eq("id", routeId);

      const dateLabel = new Date(route.route_date).toLocaleDateString("da-DK", {
        weekday: "long", day: "numeric", month: "long", year: "numeric",
      });
      const first = stopList[0];

      const { error: sendErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "route-assigned",
          recipientEmail: emp.email,
          idempotencyKey: `route-dispatch-${routeId}-${employeeId}-${Date.now()}`,
          templateData: {
            employeeName: emp.name,
            businessName: biz?.name,
            routeDate: dateLabel,
            stopCount: stopList.length,
            totalKm: route.total_distance_km,
            totalDurationMinutes: route.total_duration_minutes,
            plannedStartTime: route.planned_start_time?.slice(0, 5) || "08:00",
            firstStopName: first.customer_name,
            firstStopAddress: first.address,
            appUrl: `${window.location.origin}/medarbejder`,
          },
        },
      });
      if (sendErr) throw sendErr;
      return { ok: true, recipient: emp.email };
    },
    onSuccess: (res) => {
      toast.success(`Rute sendt til ${res.recipient}`);
      qc.invalidateQueries({ queryKey: ["routes"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke sende ruten"),
  });
};

/* ─── Employee app: my routes today (via junction table) ─── */
export const useMyDayRoutes = (date: string) => {
  return useQuery({
    queryKey: ["my-day-routes", date],
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return [];
      const { data: emp } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.user.id)
        .maybeSingle();
      if (!emp) return [];
      const { data: links } = await supabase
        .from("route_employees")
        .select("route_id")
        .eq("employee_id", emp.id);
      const routeIds = (links || []).map((l) => l.route_id);
      if (routeIds.length === 0) return [];
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .in("id", routeIds)
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
      const { data: links } = await supabase
        .from("route_employees")
        .select("route_id")
        .eq("employee_id", emp.id);
      const routeIds = (links || []).map((l) => l.route_id);
      if (routeIds.length === 0) return [];
      const { data: routes } = await supabase
        .from("routes")
        .select("id")
        .in("id", routeIds)
        .eq("route_date", date);
      const todayIds = (routes || []).map((r) => r.id);
      if (todayIds.length === 0) return [];
      // Show stops on this employee's routes — either explicitly assigned to them
      // or unassigned (shared on the route).
      const { data, error } = await supabase
        .from("route_stops")
        .select("*")
        .in("route_id", todayIds)
        .or(`assigned_employee_id.eq.${emp.id},assigned_employee_id.is.null`)
        .order("sequence", { ascending: true });
      if (error) throw error;
      return (data || []) as RouteStop[];
    },
  });
};

/* ─── Stops for a single route assigned to current employee ─── */
export const useMyRouteData = (routeId: string | undefined) => {
  return useQuery({
    queryKey: ["my-route-data", routeId],
    enabled: !!routeId,
    queryFn: async () => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) return null;
      const { data: emp } = await supabase
        .from("employees")
        .select("id, name")
        .eq("user_id", user.user.id)
        .maybeSingle();
      if (!emp) return null;

      const { data: route } = await supabase
        .from("routes")
        .select("*, businesses(name, phone)")
        .eq("id", routeId!)
        .maybeSingle();
      if (!route) return null;

      const { data: stops } = await supabase
        .from("route_stops")
        .select("*")
        .eq("route_id", routeId!)
        .or(`assigned_employee_id.eq.${emp.id},assigned_employee_id.is.null`)
        .order("sequence", { ascending: true });

      return {
        route: route as Route & { businesses?: { name?: string; phone?: string } },
        stops: (stops || []) as RouteStop[],
        employee: emp,
      };
    },
  });
};

/* ─── Driving directions geometry between two or more waypoints ─── */
export const useDirections = (
  waypoints: { lat: number; lng: number }[] | null,
) => {
  const key = waypoints?.map((w) => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`).join("|") || "";
  return useQuery({
    queryKey: ["directions", key],
    enabled: !!waypoints && waypoints.length >= 2,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("route-directions", {
        body: { waypoints },
      });
      if (error) throw error;
      return data as {
        ok: boolean;
        provider: "mapbox" | "fallback";
        geometry: { type: "LineString"; coordinates: [number, number][] };
        distance_m: number | null;
        duration_s: number | null;
      };
    },
  });
};

