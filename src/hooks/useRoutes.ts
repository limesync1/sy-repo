import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { MutationQueue, routeMutationQueue } from "@/lib/mutation-queue";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useMyEmployeeId } from "@/hooks/useMyEmployee";
import { filterStopsByOccurrenceDate } from "@/lib/recurring-projection";

export const invalidateRouteSyncQueries = (qc: ReturnType<typeof useQueryClient>) => {
  qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
  qc.invalidateQueries({ queryKey: ["route-stops"] });
  qc.invalidateQueries({ queryKey: ["routes"] });
  qc.invalidateQueries({ queryKey: ["routes-range"] });
  qc.invalidateQueries({ queryKey: ["unassigned-jobs"] });
  qc.invalidateQueries({ queryKey: ["route-calendar"] });
  qc.invalidateQueries({ queryKey: ["aftaler-route-stops"] });
  qc.invalidateQueries({ queryKey: ["my-day-stops"] });
  qc.invalidateQueries({ queryKey: ["my-day-routes"] });
  qc.invalidateQueries({ queryKey: ["my-route-data"] });
  qc.invalidateQueries({ queryKey: ["my-employee-stats"] });
  qc.invalidateQueries({ queryKey: ["order-for-stop"] });
  qc.invalidateQueries({ queryKey: ["route-occurrence-exceptions"] });
};

/** Map Postgres-fejl fra route_stop_assignees til danske beskeder. */
const friendlyAssigneeError = (err: any): Error => {
  const msg = String(err?.message || "");
  const code = String(err?.code || "");
  if (code === "23505" || /duplicate key|unique constraint/i.test(msg)) {
    return new Error("Medarbejderen er allerede tilknyttet dette stop.");
  }
  if (code === "23503" || /foreign key/i.test(msg)) {
    return new Error("Stoppet eller medarbejderen findes ikke længere — opdatér siden.");
  }
  return new Error(msg || "Kunne ikke gemme medarbejder­tilknytning.");
};

/**
 * Per-stop serialisering af medarbejder-tildelinger.
 *
 * Hvis brugeren skifter medarbejder hurtigt på samme stop kan to parallelle
 * `delete + upsert` race mod hinanden og holde row-locks længe nok til at
 * Postgres rammer "canceling statement due to statement timeout". UI'et
 * bugger også frem og tilbage fordi den hurtigste mutation's invalidate
 * refetcher imens den næste mutation stadig har optimistisk state ude.
 *
 * Ved at sende alle assignment-mutationer for et givent stop_id gennem en
 * dedikeret kø sikrer vi at kun én DB-roundtrip kører ad gangen pr. stop —
 * og vi kan tjekke `pending` for at undgå unødige invalidates mens flere
 * klik er på vej.
 */
const stopAssigneeQueues = new Map<string, MutationQueue>();
const getStopQueue = (stopId: string): MutationQueue => {
  let q = stopAssigneeQueues.get(stopId);
  if (!q) { q = new MutationQueue(); stopAssigneeQueues.set(stopId, q); }
  return q;
};

export type Route = {
  id: string;
  business_id: string;
  employee_id: string | null; // legacy — kept for back-compat, not used in new model
  base_route_id?: string | null;
  route_template_id?: string | null;
  route_date: string;
  status: string;
  name: string | null;
  color: string;
  total_distance_km: number | null;
  total_duration_minutes: number | null;
  optimized_at: string | null;
  notes: string | null;
  start_address: string | null;
  start_latitude: number | null;
  start_longitude: number | null;
  planned_start_time: string | null;
  start_from_home?: boolean;
  optimization_summary?: string | null;
  optimization_suggestions?: AISuggestion[] | null;
  created_at: string;
  updated_at: string;
};

export type OpenProjectedRouteBaseInput = {
  businessId: string;
  baseRouteId: string;
  projectedDate: string;
  clientEventId?: string;
};

export const openProjectedRouteBase = async ({
  businessId,
  baseRouteId,
  projectedDate,
  clientEventId,
}: OpenProjectedRouteBaseInput): Promise<Route> => {
  // Åbning af en projiceret rutedag betyder nu "gør klar til kørsel":
  // den virtuelle dag materialiseres som en rigtig route med konkrete
  // agreement_occurrences/route_stops. Det trigger også regnskabs-ordrekladder
  // for de nye kørsler via databaseflowet.
  const { data, error } = await supabase.rpc("materialize_virtual_route" as any, {
    _base_route_id: baseRouteId,
    _date: projectedDate,
  } as any);
  if (error) throw error;
  if (!data) throw new Error("Den projicerede rute kunne ikke gøres klar");
  return data as unknown as Route;
};

export const logRoutePlannerEvent = async (input: {
  businessId: string;
  eventType: string;
  severity?: "info" | "warning" | "error";
  baseRouteId?: string | null;
  routeId?: string | null;
  projectedDate?: string | null;
  clientEventId?: string | null;
  details?: Record<string, unknown>;
}) => {
  try {
    await supabase.rpc("log_route_planner_event" as any, {
      _business_id: input.businessId,
      _event_type: input.eventType,
      _severity: input.severity ?? "info",
      _base_route_id: input.baseRouteId ?? null,
      _route_id: input.routeId ?? null,
      _projected_date: input.projectedDate ?? null,
      _client_event_id: input.clientEventId ?? null,
      _details: input.details ?? {},
    } as any);
  } catch (err) {
    console.warn("route planner telemetry failed", err);
  }
};

export type AISuggestion = {
  id: string;
  title: string;
  reason: string;
  estimated_savings_min?: number;
  estimated_savings_km?: number;
  action: {
    type: "swap_assignee" | "reorder";
    stop_id: string;
    from_employee_id?: string;
    to_employee_id?: string;
  };
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
  /** Lead/primary employee — synced from route_stop_assignees by trigger. */
  assigned_employee_id: string | null;
  /** Hvor mange medarbejdere aftalen kræver (1+). Default 1. */
  required_staff?: number;
  /** Alle tildelte medarbejdere (joinet ind i useStopsForRoutes). */
  assignee_ids?: string[];
  /** Lead-medarbejder på aftalen (kan være forskellig fra assigned_employee_id ved race). */
  lead_employee_id?: string | null;
  /** Betalings-/ordrestatus til medarbejderens aftaleliste. */
  order_status?: string | null;
  /** Betalingsstatus synkroniseret fra regnskabsprogrammet. */
  order_payment_status?: string | null;
  /** Faktura-status synkroniseret fra regnskabsprogrammet. */
  order_invoice_status?: string | null;
  /** Aftalens fulde beløb, inkl. evt. justering. */
  order_amount?: number | null;
  /** Vej + postnr + by — beregnet i useMyDayStops så listen ikke kun viser gaden. */
  full_address?: string | null;
  /** Link til materialiseret aftaleforekomst (single source of truth). */
  agreement_occurrence_id?: string | null;
  /** Status på aftaleforekomsten: planned | completed | cancelled | rescheduled. */
  occurrence_status?: string | null;
  /** Aftaleforekomstens kalenderdato. */
  occurrence_date?: string | null;
  /** ID på den underliggende aftale (hvis kendt). */
  agreement_id?: string | null;
  /** Aftaleinterval — fx 'ugentlig', 'månedlig'. */
  agreement_interval?: string | null;
  /** Aftalens opstartsdato (yyyy-MM-dd) — preferred_date på ordren. Decoreret client-side. */
  start_date?: string | null;
  /** True hvis aftalen endnu ikke er udført én gang (completed_cycles = 0). Decoreret client-side. */
  is_first_occurrence?: boolean;
  /** Antal gennemførte cyklusser på underliggende ordre. Decoreret client-side. */
  completed_cycles?: number;
};

export type RouteEmployee = {
  id: string;
  route_id: string;
  employee_id: string;
};

export type StopAssignee = {
  id: string;
  stop_id: string;
  employee_id: string;
  is_lead: boolean;
};

/* ─── Tidsregistrering pr. stop (per medarbejder) ─── */
export type StopTimeEntry = {
  id: string;
  stop_id: string;
  employee_id: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
  is_team_fallback: boolean;
  notes: string | null;
};

export const useStopTimeEntries = (stopIds: string[]) => {
  return useQuery({
    queryKey: ["stop-time-entries", stopIds.sort().join(",")],
    enabled: stopIds.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("stop_time_entries")
        .select("*")
        .in("stop_id", stopIds);
      if (error) throw error;
      return (data || []) as StopTimeEntry[];
    },
  });
};

/** Start arbejde på et stop. Hvis ingen employeeId angives bruges fallback (team-mode). */
export const useStartStopTime = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      stop_id, employee_id, is_team_fallback,
    }: { stop_id: string; employee_id: string; is_team_fallback?: boolean }) => {
      // Tjek om der allerede er en åben entry — hvis ja, returnér den
      const { data: existing } = await supabase
        .from("stop_time_entries")
        .select("*")
        .eq("stop_id", stop_id)
        .eq("employee_id", employee_id)
        .is("ended_at", null)
        .maybeSingle();
      if (existing) return existing as StopTimeEntry;

      const { data, error } = await supabase
        .from("stop_time_entries")
        .insert({
          stop_id,
          employee_id,
          started_at: new Date().toISOString(),
          is_team_fallback: !!is_team_fallback,
        })
        .select("*")
        .single();
      if (error) throw error;
      return data as StopTimeEntry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stop-time-entries"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke starte tidsregistrering"),
  });
};

export const useEndStopTime = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      stop_id, employee_id,
    }: { stop_id: string; employee_id: string }) => {
      const { data, error } = await supabase
        .from("stop_time_entries")
        .update({ ended_at: new Date().toISOString() })
        .eq("stop_id", stop_id)
        .eq("employee_id", employee_id)
        .is("ended_at", null)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as StopTimeEntry | null;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["stop-time-entries"] });
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
      qc.invalidateQueries({ queryKey: ["my-employee-stats"] });
      qc.invalidateQueries({ queryKey: ["aftaler-route-stops"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke afslutte tidsregistrering"),
  });
};

/* ─── Arbejdsdage (Start dag / Stop dag) ─── */
export type EmployeeWorkday = {
  id: string;
  employee_id: string;
  workday_date: string;
  started_at: string;
  ended_at: string | null;
  duration_minutes: number | null;
};

/** Hent dagens åbne arbejdsdag for den loggede medarbejder. */
export const useMyWorkday = (date: string) => {
  const employeeId = useMyEmployeeId();
  return useQuery({
    queryKey: ["my-workday", employeeId, date],
    enabled: !!employeeId,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: async () => {
      if (!employeeId) return null;
      const { data, error } = await supabase
        .from("employee_workdays")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("workday_date", date)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as EmployeeWorkday | null;
    },
  });
};

export const useStartWorkday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (date: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Ikke logget ind");
      const { data: emp } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.user.id)
        .maybeSingle();
      if (!emp) throw new Error("Du er ikke registreret som medarbejder");

      const { data, error } = await supabase
        .from("employee_workdays")
        .upsert(
          {
            employee_id: emp.id,
            workday_date: date,
            started_at: new Date().toISOString(),
            ended_at: null,
          },
          { onConflict: "employee_id,workday_date" },
        )
        .select("*")
        .single();
      if (error) throw error;
      return data as EmployeeWorkday;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["my-workday"] });
      // Tydelig bekræftelse med præcist tidsstempel — så medarbejderen
      // altid ved hvad der er registreret.
      const startedAt = data?.started_at ? new Date(data.started_at) : new Date();
      const time = startedAt.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
      toast.success("Arbejdsdag startet", {
        description: `Tidsregistrering begyndte kl. ${time}.`,
      });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke starte arbejdsdag"),
  });
};

export const useEndWorkday = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (date: string) => {
      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Ikke logget ind");
      const { data: emp } = await supabase
        .from("employees")
        .select("id")
        .eq("user_id", user.user.id)
        .maybeSingle();
      if (!emp) throw new Error("Ikke medarbejder");
      const { data, error } = await supabase
        .from("employee_workdays")
        .update({ ended_at: new Date().toISOString() })
        .eq("employee_id", emp.id)
        .eq("workday_date", date)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return data as EmployeeWorkday | null;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["my-workday"] });
      qc.invalidateQueries({ queryKey: ["my-employee-stats"] });
      const endedAt = data?.ended_at ? new Date(data.ended_at) : new Date();
      const startedAt = data?.started_at ? new Date(data.started_at) : null;
      const endTime = endedAt.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
      const durationMin = data?.duration_minutes ?? (startedAt
        ? Math.max(0, Math.round((endedAt.getTime() - startedAt.getTime()) / 60000))
        : null);
      const startTime = startedAt
        ? startedAt.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" })
        : null;
      const desc = startTime
        ? `Registreret ${startTime}–${endTime}${durationMin != null ? ` · ${Math.floor(durationMin / 60)}t ${durationMin % 60}min` : ""}.`
        : `Stoppet kl. ${endTime}.`;
      toast.success("Arbejdsdag afsluttet", { description: desc });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke afslutte arbejdsdag"),
  });
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
      return (data || []) as unknown as Route[];
    },
  });
};

export const useRoutesForRange = (businessId: string | undefined, from: string, to: string) => {
  return useQuery({
    queryKey: ["routes-range", businessId, from, to],
    enabled: !!businessId && !!from && !!to,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .eq("business_id", businessId!)
        .gte("route_date", from)
        .lte("route_date", to)
        .order("route_date", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as Route[];
    },
  });
};

/* ─── Stops for a list of routes (joiner assignees ind) ─── */
export const useStopsForRoutes = (routeIds: string[]) => {
  return useQuery({
    // Brug en kopi før sort så vi ikke muterer caller-arrayet (gav ustabile keys/refetches).
    queryKey: ["route-stops-bulk", [...routeIds].sort().join(",")],
    enabled: routeIds.length > 0,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_stops")
        .select("*")
        .in("route_id", routeIds)
        .order("sequence", { ascending: true });
      if (error) throw error;
      const stops = (data || []) as any[];
      const stopIds = stops.map((s) => s.id);
      if (stopIds.length === 0) return stops as RouteStop[];

      const { data: assignees } = await supabase
        .from("route_stop_assignees")
        .select("stop_id, employee_id, is_lead")
        .in("stop_id", stopIds);

      const byStop = new Map<string, { ids: string[]; lead: string | null }>();
      (assignees || []).forEach((a: any) => {
        const entry = byStop.get(a.stop_id) || { ids: [], lead: null };
        entry.ids.push(a.employee_id);
        if (a.is_lead) entry.lead = a.employee_id;
        byStop.set(a.stop_id, entry);
      });

      return stops.map((s) => {
        const entry = byStop.get(s.id);
        return {
          ...s,
          assignee_ids: entry?.ids || (s.assigned_employee_id ? [s.assigned_employee_id] : []),
          lead_employee_id: entry?.lead ?? s.assigned_employee_id ?? null,
        } as RouteStop;
      });
    },
  });
};

/* ─── Route ↔ Employees junction ─── */
export const useRouteEmployees = (routeIds: string[]) => {
  return useRouteEmployeesImpl(routeIds);
};

/**
 * Samlet kalender-data: ruter + stops (med assignees + occurrence-status) i ét RPC-kald.
 *
 * Erstatter behovet for 3 separate queries (`useRoutesForRange` + `useStopsForRoutes`
 * + N+1 assignees-fetch). Brug denne i RoutePlanner og lignende.
 */
export const useCalendarData = (
  businessId: string | undefined,
  from: string,
  to: string,
) => {
  return useQuery({
    queryKey: ["route-calendar", businessId, from, to],
    enabled: !!businessId && !!from && !!to,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_route_calendar", {
        p_business_id: businessId!,
        p_from: from,
        p_to: to,
      });
      if (error) throw error;
      const payload = (data || {}) as {
        routes?: Route[];
        stops?: any[];
        unassigned_jobs?: any[];
      };
      const routes = (payload.routes || []) as Route[];
      const stops = (payload.stops || []).map((s: any) => ({
        ...s,
        assignee_ids: s.assignee_ids || [],
        lead_employee_id: s.lead_employee_id ?? s.assigned_employee_id ?? null,
      })) as RouteStop[];
      return { routes, stops };
    },
  });
};

type RouteOccurrenceException = {
  base_route_id: string;
  occurrence_date: string;
  replacement_route_id: string | null;
  exception_type: string;
};

/** Datoer hvor en projiceret rute er flyttet/materialiseret, så gamle virtuelle forekomster ikke vises igen. */
export const useRouteOccurrenceExceptions = (
  businessId: string | undefined,
  from: string,
  to: string,
) => {
  return useQuery({
    queryKey: ["route-occurrence-exceptions", businessId, from, to],
    enabled: !!businessId && !!from && !!to,
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("route_occurrence_exceptions" as any)
        .select("base_route_id, occurrence_date, replacement_route_id, exception_type")
        .eq("business_id", businessId!)
        .gte("occurrence_date", from)
        .lte("occurrence_date", to);
      if (error) throw error;
      return (data || []) as unknown as RouteOccurrenceException[];
    },
  });
};

const useRouteEmployeesImpl = (routeIds: string[]) => {
  return useQuery({
    queryKey: ["route-employees-bulk", [...routeIds].sort().join(",")],
    enabled: routeIds.length > 0,
    staleTime: 60 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
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
      // Fjern også alle assignees af denne medarbejder på denne rute
      const { data: stopsOnRoute } = await supabase
        .from("route_stops")
        .select("id")
        .eq("route_id", route_id);
      const sIds = (stopsOnRoute || []).map((s) => s.id);
      if (sIds.length > 0) {
        await supabase
          .from("route_stop_assignees")
          .delete()
          .in("stop_id", sIds)
          .eq("employee_id", employee_id);
      }
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
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    placeholderData: keepPreviousData,
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from("orders")
        .select(`
          id, customer_name, customer_phone, customer_email, total_amount, status, notes, completed_cycles,
          address, zip_code, city, latitude, longitude, created_at,
          preferred_date, preferred_time_start, preferred_time_end, estimated_duration_minutes, next_service_date,
          business_response, customer_response, adjusted_details, adjusted_amount,
          order_items ( service_name, quantity, total_price, details )
        `)
        .eq("business_id", businessId!)
        // Aftaler der afventer godkendelse (pending) skal IKKE vises i
        // "Aftaler uden rute" — vi venter til kunden / virksomheden har
        // bekræftet (status = confirmed) eller arbejdet er i gang.
        .in("status", ["confirmed", "in_progress"])
        .order("preferred_date", { ascending: true, nullsFirst: false })
        .order("created_at", { ascending: false })
        .limit(300);
      if (error) throw error;

      const orderIds = (orders || []).map((o) => o.id);
      if (orderIds.length === 0) return [];

      // Find ordrer der allerede er på en rute — uanset stop-status.
      // Tidligere ekskluderede vi kun ikke-completed stops, men det betød
      // at en aftale dukkede op igen i "Aftaler uden rute" så snart den var
      // udført, selvom den stadig var registreret på ruten. For gentagende
      // aftaler er det forventningen at næste forekomst auto-projiceres
      // (via projected routes / next_service_date), så vi skal IKKE vise
      // den gamle ordre i poolen igen.
      const { data: allStops } = await supabase
        .from("route_stops")
        .select("order_id")
        .in("order_id", orderIds);
      const usedOpen = new Set((allStops || []).map((s) => s.order_id));

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

      const acceptedAdjustedItems = (order: any) => (
        order.business_response === "adjusted" &&
        order.customer_response === "accepted" &&
        Array.isArray(order.adjusted_details?.items)
      ) ? order.adjusted_details.items : null;

      const hasRecurringInterval = (items: any[]) => items.some((it) => {
        const interval = it?.details?.interval;
        return interval && interval !== "engangskøb";
      });

      return (orders || [])
        .filter((o) => {
          if (usedOpen.has(o.id)) return false;
          const adjustedItems = acceptedAdjustedItems(o);
          const effectiveItems = adjustedItems || o.order_items || [];
          const isAcceptedOneTimeAdjustment = !!adjustedItems && !hasRecurringInterval(effectiveItems);
          const entry = subsByOrder.get(o.id);
          if (entry && entry.statuses.length > 0 && !isAcceptedOneTimeAdjustment) {
            const anyActive = entry.statuses.some((st) => st === "active");
            if (!anyActive) return false; // alle på pause/annulleret
          }
          return true;
        })
        .map((o) => {
          const entry = subsByOrder.get(o.id);
          const adjustedItems = acceptedAdjustedItems(o);
          const effectiveItems = adjustedItems || o.order_items || [];
          const isAcceptedOneTimeAdjustment = !!adjustedItems && !hasRecurringInterval(effectiveItems);
          const prefId = isAcceptedOneTimeAdjustment ? null : (entry?.preferredRouteId || null);
          return {
            ...o,
            completed_cycles: Number((o as any).completed_cycles ?? 0),
            total_amount: o.customer_response === "accepted" ? (o.adjusted_amount ?? o.total_amount) : o.total_amount,
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
            service_id, service_name, quantity, unit_price, total_price, details,
            services ( id, description, service_category, subcategory, pricing_type, unit, base_price, image_url, interval_options )
          ),
          businesses ( name, phone, email )
        `)
        .eq("id", orderId!)
        .maybeSingle();
      if (error) throw error;

      const effectiveOrder = (() => {
        const items = (data as any)?.business_response === "adjusted" &&
          (data as any)?.customer_response === "accepted" &&
          Array.isArray((data as any)?.adjusted_details?.items)
          ? (data as any).adjusted_details.items.map((item: any) => ({
              ...item,
              services: (data as any)?.order_items?.find((original: any) =>
                original.service_id === item.service_id || original.service_name === item.service_name,
              )?.services,
            }))
          : null;

        return items ? {
          ...(data || {}),
          total_amount: (data as any)?.adjusted_amount ?? (data as any)?.total_amount,
          order_items: items,
        } : (data || {});
      })();

      // Also fetch any active/paused subscription tied to this order so the
      // planner sees if the visit is recurring and on which interval.
      const { data: subs } = await supabase
        .from("subscriptions")
        .select("id, interval, status, next_service_date, paused_at, total_price, service_name")
        .eq("order_id", orderId!);

      return { ...effectiveOrder, subscriptions: subs || [] } as any;
    },
  });
};

/* ─── Create a NEW route (manually). Always seeds start address from business. ─── */
export const useCreateRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      business_id, route_date, name, color,
    }: { business_id: string; route_date: string; name?: string | null; color?: string | null }) => {
      // Fast path: one RPC creates the route with start_address already filled in.
      // Geocoding runs in the background and updates the row afterwards so the
      // UI doesn't have to wait for the edge function round-trip.
      const { data, error } = await supabase.rpc("create_route_fast" as any, {
        _business_id: business_id,
        _route_date: route_date,
        _name: name || null,
        _color: color || "#14b8a6",
      });
      if (error) throw error;
      const route = data as unknown as Route;

      // Fire-and-forget geocoding so the mutation resolves immediately.
      (async () => {
        try {
          const { data: biz } = await supabase
            .from("businesses")
            .select("address, zip_code, city")
            .eq("id", business_id)
            .maybeSingle();
          if (!biz?.address) return;
          const { data: geo } = await supabase.functions.invoke("geocode-address", {
            body: { address: biz.address, zip_code: biz.zip_code, city: biz.city },
          });
          if (geo?.found) {
            await supabase
              .from("routes")
              .update({ start_latitude: geo.latitude, start_longitude: geo.longitude })
              .eq("id", (route as any).id);
            qc.invalidateQueries({ queryKey: ["routes"] });
          }
        } catch { /* non-fatal */ }
      })();

      return route;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["routes", vars.business_id, vars.route_date] });
      qc.invalidateQueries({ queryKey: ["routes-range"] });
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
      qc.invalidateQueries({ queryKey: ["routes-range"] });
      qc.invalidateQueries({ queryKey: ["my-day-routes"] });
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
      qc.invalidateQueries({ queryKey: ["route-employees-bulk"] });
      qc.invalidateQueries({ queryKey: ["unassigned-jobs"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke slette rute"),
  });
};

/**
 * Materialiserer en projiceret (virtuel) gentagende rute som en rigtig DB-rute
 * for en specifik dato. Klone basisrutens metadata (navn, farve, startadresse)
 * og dens stops, så brugeren kan redigere ruten frit. `base_route_id` peger på
 * basisruten så projektionen ved at netop denne dato er overridet.
 */
export const useMaterializeVirtualRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ baseRouteId, date }: { baseRouteId: string; date: string }) =>
      routeMutationQueue.run(async () => {
      // Single RPC materializes the route + clones stops + clones assignees +
      // writes the occurrence exception atomically on the server.
      const { data, error } = await supabase.rpc("materialize_virtual_route" as any, {
        _base_route_id: baseRouteId,
        _date: date,
      });
      if (error) throw error;
      return data as unknown as Route;
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["routes-range"] });
      qc.invalidateQueries({ queryKey: ["route-calendar"] });
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
      qc.invalidateQueries({ queryKey: ["route-stops"] });
      qc.invalidateQueries({ queryKey: ["recurring-base-routes"] });
      qc.invalidateQueries({ queryKey: ["route-occurrence-exceptions"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke materialisere rute"),
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
      time_window_start?: string | null;
      time_window_end?: string | null;
      assigned_employee_id?: string | null;
    }) => {
      // Auto-tildel service'ens standard-medarbejder hvis ingen er valgt
      // og aftalen er knyttet til en ordre. Manuelle valg på enkelte
      // aftaler tilsidesætter altid denne default.
      let resolvedAssignee = payload.assigned_employee_id ?? null;
      if (!resolvedAssignee && payload.order_id) {
        try {
          const { data: items } = await supabase
            .from("order_items")
            .select("service_id")
            .eq("order_id", payload.order_id)
            .limit(1);
          const svcId = items?.[0]?.service_id;
          if (svcId) {
            const { data: svc } = await supabase
              .from("services")
              .select("default_employee_id, default_employee_ids")
              .eq("id", svcId)
              .maybeSingle();
            const fromArr = Array.isArray((svc as any)?.default_employee_ids) && (svc as any).default_employee_ids.length > 0
              ? (svc as any).default_employee_ids[0]
              : null;
            if (fromArr || svc?.default_employee_id) resolvedAssignee = fromArr || svc!.default_employee_id;
          }
        } catch {
          /* lookup må aldrig blokere oprettelse */
        }
      }
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
          time_window_start: payload.time_window_start ?? null,
          time_window_end: payload.time_window_end ?? null,
          assigned_employee_id: resolvedAssignee,
        })
        .select("*")
        .single();
      if (error) throw error;
      // Hvis vi auto-tildelte, opret også en assignee-række så det ses i UI
      if (resolvedAssignee && !payload.assigned_employee_id) {
        try {
          await supabase
            .from("route_stop_assignees")
            .upsert(
              { stop_id: (data as any).id, employee_id: resolvedAssignee, is_lead: true },
              { onConflict: "stop_id,employee_id", ignoreDuplicates: true },
            );
        } catch { /* ignorer hvis trigger allerede har sat den */ }
      }
      // ─── Husk hvilken rute aftalen "hører hjemme" på ───
      // Når en aftale med interval lægges på en rute første gang, sætter vi
      // `preferred_route_id` på både subscription og agreement, så
      // ruteplanlæggeren kan projicere fremtidige forekomster på samme rute
      // (uden at overskrive et eksisterende manuelt valg).
      if (payload.order_id) {
        try {
          const { data: subs } = await supabase
            .from("subscriptions")
            .select("id, preferred_route_id, status, interval")
            .eq("order_id", payload.order_id);
          const targets = (subs || []).filter((s: any) =>
            s.status === "active" &&
            s.interval && s.interval !== "engangskøb" &&
            !s.preferred_route_id,
          );
          if (targets.length > 0) {
            await supabase
              .from("subscriptions")
              .update({ preferred_route_id: payload.route_id })
              .in("id", targets.map((s: any) => s.id));
          }
          // Tilsvarende på agreements (ny model) — match via legacy_subscription_id.
          const subIds = (subs || []).map((s: any) => s.id);
          if (subIds.length > 0) {
            await supabase
              .from("agreements")
              .update({ preferred_route_id: payload.route_id })
              .in("legacy_subscription_id", subIds)
              .is("preferred_route_id", null)
              .neq("interval", "engangskøb")
              .eq("status", "active");
          }
          // Nye aftaler (uden legacy_subscription_id) findes via deres
          // forekomster (agreement_occurrences.legacy_order_id == order_id).
          // Det sikrer at projicerede ruter også oprettes første gang en
          // ny aftale lægges på en rute.
          try {
            const { data: occs } = await supabase
              .from("agreement_occurrences")
              .select("agreement_id")
              .eq("legacy_order_id", payload.order_id);
            const agreementIds = Array.from(new Set(
              (occs || []).map((o: any) => o.agreement_id).filter(Boolean) as string[]
            ));
            if (agreementIds.length > 0) {
              await supabase
                .from("agreements")
                .update({ preferred_route_id: payload.route_id })
                .in("id", agreementIds)
                .is("preferred_route_id", null)
                .neq("interval", "engangskøb")
                .eq("status", "active");
            }
          } catch { /* projektion er best-effort */ }
        } catch {
          /* preferred_route_id er en hint — må aldrig blokere drop'et */
        }
      }
      return data as RouteStop;
    },
    onSuccess: () => invalidateRouteSyncQueries(qc),
  });
};

export const useUpdateStop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...updates }: Partial<RouteStop> & { id: string }) =>
      routeMutationQueue.run(async () => {
        // Strip virtuelle felter der ikke findes i DB-tabellen
        const { assignee_ids, lead_employee_id, required_staff, ...dbUpdates } = updates as any;
        const payload: any = { ...dbUpdates };
        if (typeof required_staff === "number") payload.required_staff = required_staff;
        const { data, error } = await supabase
          .from("route_stops")
          .update(payload)
          .eq("id", id)
          .select("*")
          .single();
        if (error) throw error;
        return data as RouteStop;
      }),
    // Optimistic patch: opdatér allerede-cachede route-stops-bulk-lister med
    // det nye payload, så UI'et ikke "blinker" tilbage til serverens gamle
    // værdier mens mutationen er undervejs.
    onMutate: async ({ id, ...updates }) => {
      await qc.cancelQueries({ queryKey: ["route-stops-bulk"] });
      const snapshots = qc.getQueriesData<RouteStop[]>({ queryKey: ["route-stops-bulk"] });
      qc.setQueriesData<RouteStop[]>({ queryKey: ["route-stops-bulk"] }, (old) =>
        old ? old.map((s) => (s.id === id ? ({ ...s, ...(updates as any) } as RouteStop) : s)) : old,
      );
      return { snapshots };
    },
    onError: (_e, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => {
      invalidateRouteSyncQueries(qc);
      qc.invalidateQueries({ queryKey: ["stop-assignees-bulk"] });
    },
  });
};

export const useReorderStops = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (updates: { id: string; sequence: number; route_id?: string }[]) =>
      routeMutationQueue.run(async () => {
        if (updates.length === 0) return;
        // Single round-trip bulk update instead of N parallel UPDATEs.
        const { error } = await supabase.rpc("reorder_route_stops" as any, {
          _updates: updates.map((u) => ({
            id: u.id,
            sequence: u.sequence,
            route_id: u.route_id ?? null,
          })) as any,
        });
        if (error) throw error;
      }),
    onMutate: async (updates) => {
      await qc.cancelQueries({ queryKey: ["route-stops-bulk"] });
      const snapshots = qc.getQueriesData<RouteStop[]>({ queryKey: ["route-stops-bulk"] });
      const byId = new Map(updates.map((u) => [u.id, u]));
      qc.setQueriesData<RouteStop[]>({ queryKey: ["route-stops-bulk"] }, (old) =>
        old
          ? old.map((s) => {
              const u = byId.get(s.id);
              if (!u) return s;
              return { ...s, sequence: u.sequence, ...(u.route_id ? { route_id: u.route_id } : {}) } as RouteStop;
            })
          : old,
      );
      return { snapshots };
    },
    onError: (_e, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => invalidateRouteSyncQueries(qc),
  });
};

export const useDeleteStop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      routeMutationQueue.run(async () => {
        const { error } = await supabase.from("route_stops").delete().eq("id", id);
        if (error) throw error;
      }),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ["route-stops-bulk"] });
      const snapshots = qc.getQueriesData<RouteStop[]>({ queryKey: ["route-stops-bulk"] });
      qc.setQueriesData<RouteStop[]>({ queryKey: ["route-stops-bulk"] }, (old) =>
        old ? old.filter((s) => s.id !== id) : old,
      );
      return { snapshots };
    },
    onError: (_e, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
    },
    onSettled: () => invalidateRouteSyncQueries(qc),
  });
};

/* ─── Multi-medarbejder pr. stop ───
   Erstatter ALLE assignees for et stop med listen fra `employee_ids`.
   `lead_id` markeres som primær (synces til route_stops.assigned_employee_id af DB-trigger).
   Hvis listen er tom: alle tildelinger fjernes. */
export const useSetStopAssignees = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      stop_id, employee_ids, lead_id,
    }: { stop_id: string; employee_ids: string[]; lead_id?: string | null }) => {
      return getStopQueue(stop_id).run(async () => {
        const { error: delErr } = await supabase
          .from("route_stop_assignees")
          .delete()
          .eq("stop_id", stop_id);
        if (delErr) throw delErr;
        if (employee_ids.length === 0) return { count: 0 };
        const finalLead = lead_id && employee_ids.includes(lead_id) ? lead_id : employee_ids[0];
        const rows = employee_ids.map((eid) => ({
          stop_id, employee_id: eid, is_lead: eid === finalLead,
        }));
        const { error: insErr } = await supabase
          .from("route_stop_assignees")
          .upsert(rows, { onConflict: "stop_id,employee_id", ignoreDuplicates: false });
        if (insErr) throw friendlyAssigneeError(insErr);
        return { count: rows.length };
      });
    },
    // Optimistisk patch: opdatér caches øjeblikkeligt så avatars og medarbejder-
    // kolonner skifter med det samme — uden at vente på round-trip + refetch.
    onMutate: async ({ stop_id, employee_ids, lead_id }) => {
      await qc.cancelQueries({ queryKey: ["route-stops-bulk"] });
      await qc.cancelQueries({ queryKey: ["route-calendar"] });
      await qc.cancelQueries({ queryKey: ["recurring-base-routes"] });
      const finalLead = employee_ids.length === 0
        ? null
        : (lead_id && employee_ids.includes(lead_id) ? lead_id : employee_ids[0]);
      const stopsSnap = qc.getQueriesData<RouteStop[]>({ queryKey: ["route-stops-bulk"] });
      const calSnap = qc.getQueriesData<{ routes: Route[]; stops: RouteStop[] }>({ queryKey: ["route-calendar"] });
      const recSnap = qc.getQueriesData<any[]>({ queryKey: ["recurring-base-routes"] });
      const patchStop = (s: RouteStop): RouteStop =>
        s.id === stop_id
          ? ({ ...s, assignee_ids: [...employee_ids], lead_employee_id: finalLead, assigned_employee_id: finalLead } as RouteStop)
          : s;
      qc.setQueriesData<RouteStop[]>({ queryKey: ["route-stops-bulk"] }, (old) =>
        Array.isArray(old) ? old.map(patchStop) : old,
      );
      qc.setQueriesData<{ routes: Route[]; stops: RouteStop[] }>({ queryKey: ["route-calendar"] }, (old) =>
        old?.stops ? { ...old, stops: old.stops.map(patchStop) } : old,
      );
      qc.setQueriesData<any[]>({ queryKey: ["recurring-base-routes"] }, (old) =>
        Array.isArray(old)
          ? old.map((r) => ({ ...r, stops: (r.stops || []).map(patchStop) }))
          : old,
      );
      return { stopsSnap, calSnap, recSnap };
    },
    onError: (e: any, _vars, ctx) => {
      ctx?.stopsSnap.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx?.calSnap.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx?.recSnap?.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(e.message || "Kunne ikke opdatere medarbejdere");
    },
    onSettled: (_data, _err, vars) => {
      // Spring invalidate over hvis brugeren allerede har klikket igen —
      // næste mutation's onSettled tager refetch'en. Det forhindrer
      // "blink/bug" hvor en in-flight refetch overskriver den nyere
      // optimistiske patch.
      const q = stopAssigneeQueues.get(vars.stop_id);
      if (q && (q.pending > 0 || q.isRunning)) return;
      invalidateRouteSyncQueries(qc);
      qc.invalidateQueries({ queryKey: ["stop-assignees-bulk"] });
      qc.invalidateQueries({ queryKey: ["recurring-base-routes"] });
    },
  });
};

/* Hurtig single-employee assignment (bruges ved drop og dropdown).
   Bevarer is_lead på den tildelte. */
export const useAssignSingleEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      stop_id, employee_id,
    }: { stop_id: string; employee_id: string | null }) => {
      return getStopQueue(stop_id).run(async () => {
        const { error: delErr } = await supabase
          .from("route_stop_assignees")
          .delete()
          .eq("stop_id", stop_id);
        if (delErr) throw delErr;
        if (!employee_id) return;
        const { error: insErr } = await supabase
          .from("route_stop_assignees")
          .upsert(
            { stop_id, employee_id, is_lead: true },
            { onConflict: "stop_id,employee_id", ignoreDuplicates: false },
          );
        if (insErr) throw friendlyAssigneeError(insErr);
      });
    },
    onMutate: async ({ stop_id, employee_id }) => {
      await qc.cancelQueries({ queryKey: ["route-stops-bulk"] });
      await qc.cancelQueries({ queryKey: ["route-calendar"] });
      const stopsSnap = qc.getQueriesData<RouteStop[]>({ queryKey: ["route-stops-bulk"] });
      const calSnap = qc.getQueriesData<{ routes: Route[]; stops: RouteStop[] }>({ queryKey: ["route-calendar"] });
      const patchStop = (s: RouteStop): RouteStop =>
        s.id === stop_id
          ? ({ ...s, assignee_ids: employee_id ? [employee_id] : [], lead_employee_id: employee_id, assigned_employee_id: employee_id } as RouteStop)
          : s;
      qc.setQueriesData<RouteStop[]>({ queryKey: ["route-stops-bulk"] }, (old) =>
        Array.isArray(old) ? old.map(patchStop) : old,
      );
      qc.setQueriesData<{ routes: Route[]; stops: RouteStop[] }>({ queryKey: ["route-calendar"] }, (old) =>
        old?.stops ? { ...old, stops: old.stops.map(patchStop) } : old,
      );
      return { stopsSnap, calSnap };
    },
    onError: (e: any, _vars, ctx) => {
      ctx?.stopsSnap.forEach(([key, data]) => qc.setQueryData(key, data));
      ctx?.calSnap.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(e.message || "Kunne ikke tildele medarbejder");
    },
    onSettled: (_data, _err, vars) => {
      const q = stopAssigneeQueues.get(vars.stop_id);
      if (q && (q.pending > 0 || q.isRunning)) return;
      invalidateRouteSyncQueries(qc);
    },
  });
};

export const useUpdateStopStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: string; notes?: string }) => {
      const updates: any = { status };
      if (status === "completed") updates.completed_at = new Date().toISOString();
      else updates.completed_at = null;
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
    onSuccess: () => invalidateRouteSyncQueries(qc),
    onError: (e: any) => toast.error(e.message || "Kunne ikke opdatere stop"),
  });
};

export const useOptimizeRoute = () => {
  const qc = useQueryClient();
  return useMutation({
    // mutationKey lader os bruge useIsMutating() pr. routeId i UI
    mutationKey: ["optimize-route"],
    mutationFn: async (routeId: string) => {
      // Sørg for et FRISKT access token — undgår "Unauthorized" når sessionen
      // er tæt på at udløbe. functions.invoke sender selv Bearer-headeren.
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        throw new Error("Du skal være logget ind for at optimere ruten");
      }
      // Refresh hvis token er <60s fra at udløbe.
      const expiresAt = sessionData.session.expires_at ?? 0;
      if (expiresAt && expiresAt * 1000 - Date.now() < 60_000) {
        await supabase.auth.refreshSession();
      }

      const { data, error } = await supabase.functions.invoke("optimize-route", {
        body: { route_id: routeId, preserve_assignees: true },
      });
      if (error) throw new Error(error.message || "Kunne ikke optimere ruten");
      if (!data?.ok) throw new Error(data?.error || "Kunne ikke optimere ruten");

      return data as {
        ok: true; reasoning: string; reordered: number;
        total_km: number; total_minutes: number; provider?: string;
        summary?: string | null;
        suggestions?: AISuggestion[];
        unassigned?: number;
        soft_violations?: number;
        employees?: number;
        before_km?: number;
        before_minutes?: number;
        saved_km?: number;
        saved_minutes?: number;
        order_changed?: boolean;
        already_optimal?: boolean;
      };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["routes-range"] });
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke optimere ruten"),
  });
};

/* ─── Anvend ét AI-forslag på en rute. ─── */
export const useApplyRouteSuggestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ routeId, suggestionId }: { routeId: string; suggestionId: string }) => {
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) throw new Error("Du skal være logget ind");
      const expiresAt = sessionData.session.expires_at ?? 0;
      if (expiresAt && expiresAt * 1000 - Date.now() < 60_000) {
        await supabase.auth.refreshSession();
      }
      const { data, error } = await supabase.functions.invoke("apply-route-suggestion", {
        body: { route_id: routeId, suggestion_id: suggestionId },
      });
      if (error) throw new Error(error.message || "Kunne ikke anvende forslag");
      if (!data?.ok) throw new Error(data?.error || "Kunne ikke anvende forslag");
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["route-stops-bulk"] });
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["routes-range"] });
      toast.success("Forslag anvendt");
    },
    onError: (e: any) => toast.error(e.message || "Kunne ikke anvende forslag"),
  });
};

/* ─── Auto-fordel: tildel utildelte stops til medarbejdere uden at skabe overlap.
   Respekterer required_staff: hvis et stop kræver fx 2 personer, vælges 2 medarbejdere
   der begge er ledige i tidsvinduet. Skriver direkte til route_stop_assignees. ─── */
export const useAutoAssignStops = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ routeId, employeeIds }: { routeId: string; employeeIds: string[] }) => {
      if (employeeIds.length === 0) throw new Error("Ingen medarbejdere tilkoblet");

      const { data: stops, error } = await supabase
        .from("route_stops")
        .select("id, latitude, longitude, planned_arrival, planned_departure, duration_minutes, required_staff")
        .eq("route_id", routeId);
      if (error) throw error;

      const allStops = stops || [];
      const stopIds = allStops.map((s) => s.id);

      // Hent eksisterende assignees så vi kun fordeler stops uden tildelinger
      const { data: existingAssignees } = await supabase
        .from("route_stop_assignees")
        .select("stop_id, employee_id")
        .in("stop_id", stopIds.length ? stopIds : ["00000000-0000-0000-0000-000000000000"]);

      const assigneesByStop = new Map<string, string[]>();
      (existingAssignees || []).forEach((a: any) => {
        const arr = assigneesByStop.get(a.stop_id) || [];
        arr.push(a.employee_id);
        assigneesByStop.set(a.stop_id, arr);
      });

      // Brug LOKAL tid (matcher hvordan optimize-route og UI viser planned_arrival).
      // getHours/getMinutes konverterer ISO-strengen (UTC) til klientens tidszone.
      const isoMin = (iso: string | null) => {
        if (!iso) return null;
        const d = new Date(iso);
        if (isNaN(d.getTime())) return null;
        return d.getHours() * 60 + d.getMinutes();
      };

      type Busy = { start: number; end: number };
      const busyByEmp = new Map<string, Busy[]>();
      const counts = new Map<string, number>();
      for (const eid of employeeIds) { busyByEmp.set(eid, []); counts.set(eid, 0); }

      for (const s of allStops) {
        const start = isoMin(s.planned_arrival);
        const ids = assigneesByStop.get(s.id) || [];
        for (const eid of ids) {
          if (counts.has(eid)) counts.set(eid, (counts.get(eid) || 0) + 1);
          if (start != null && busyByEmp.has(eid)) {
            const end = isoMin(s.planned_departure) ?? (start + Math.max(s.duration_minutes || 30, 15));
            busyByEmp.get(eid)!.push({ start, end });
          }
        }
      }

      // Stops der mangler tildelinger (eller ikke nok ift. required_staff)
      const needsAssignment = allStops.filter((s) => {
        const have = (assigneesByStop.get(s.id) || []).length;
        const need = Math.max(1, s.required_staff || 1);
        return have < need;
      });
      if (needsAssignment.length === 0) return { assigned: 0 };

      const inserts: { stop_id: string; employee_id: string; is_lead: boolean }[] = [];

      for (const stop of needsAssignment) {
        const start = isoMin(stop.planned_arrival);
        const dur = Math.max(stop.duration_minutes || 30, 15);
        const end = start != null ? start + dur : null;
        const need = Math.max(1, stop.required_staff || 1);
        const already = new Set(assigneesByStop.get(stop.id) || []);
        const slotsLeft = need - already.size;

        // Sortér medarbejdere: ledige først (uden clash), så færrest stops
        const candidates = employeeIds
          .filter((eid) => !already.has(eid))
          .map((eid) => {
            const busy = busyByEmp.get(eid) || [];
            const clash = (start != null && end != null)
              ? busy.some((b) => start < b.end && end > b.start)
              : false;
            return { eid, clash, count: counts.get(eid) ?? 0 };
          })
          .sort((a, b) => {
            if (a.clash !== b.clash) return a.clash ? 1 : -1;
            return a.count - b.count;
          });

        const picked = (start != null && end != null)
          ? candidates.filter((c) => !c.clash).slice(0, slotsLeft)
          : candidates.slice(0, slotsLeft);
        if (picked.length < slotsLeft) continue;

        picked.forEach((p, idx) => {
          counts.set(p.eid, (counts.get(p.eid) ?? 0) + 1);
          if (start != null && end != null) {
            busyByEmp.get(p.eid)!.push({ start, end });
          }
          inserts.push({
            stop_id: stop.id,
            employee_id: p.eid,
            // Marker første picked som lead hvis stoppet ikke allerede har en lead
            is_lead: already.size === 0 && idx === 0,
          });
        });
      }

      if (inserts.length === 0) return { assigned: 0 };

      // Insert i batch
      const { error: insErr } = await supabase
        .from("route_stop_assignees")
        .upsert(inserts, { onConflict: "stop_id,employee_id", ignoreDuplicates: true });
      if (insErr) throw friendlyAssigneeError(insErr);

      // Tæl unikke stops
      const stopsTouched = new Set(inserts.map((i) => i.stop_id)).size;
      return { assigned: stopsTouched, totalAssignments: inserts.length };
    },
    onSuccess: () => invalidateRouteSyncQueries(qc),
    onError: (e: any) => toast.error(e.message || "Kunne ikke fordele aftaler"),
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
    onMutate: async ({ id, ...updates }: Partial<Route> & { id: string }) => {
      await qc.cancelQueries({ queryKey: ["routes"] });
      await qc.cancelQueries({ queryKey: ["routes-range"] });
      await qc.cancelQueries({ queryKey: ["route-calendar"] });
      await qc.cancelQueries({ queryKey: ["recurring-base-routes"] });
      const snapshots = [
        ...qc.getQueriesData<Route[]>({ queryKey: ["routes"] }),
        ...qc.getQueriesData<Route[]>({ queryKey: ["routes-range"] }),
        ...qc.getQueriesData<{ routes: Route[]; stops: RouteStop[] }>({ queryKey: ["route-calendar"] }),
        ...qc.getQueriesData<any[]>({ queryKey: ["recurring-base-routes"] }),
      ];
      const mergeRoute = (route: Route) => (route.id === id ? { ...route, ...updates } : route);
      qc.setQueriesData({ queryKey: ["routes"] }, (old: Route[] | undefined) =>
        Array.isArray(old) ? old.map(mergeRoute) : old,
      );
      qc.setQueriesData({ queryKey: ["routes-range"] }, (old: Route[] | undefined) =>
        Array.isArray(old) ? old.map(mergeRoute) : old,
      );
      qc.setQueriesData({ queryKey: ["route-calendar"] }, (old: { routes: Route[]; stops: RouteStop[] } | undefined) =>
        old?.routes ? { ...old, routes: old.routes.map(mergeRoute) } : old,
      );
      // Patch også basisrute-cachen som projicerede ruter arver navn/farve fra,
      // så ny farve slår igennem på projektioner med det samme.
      qc.setQueriesData({ queryKey: ["recurring-base-routes"] }, (old: any[] | undefined) =>
        Array.isArray(old)
          ? old.map((r: any) => (r.id === id ? { ...r, ...updates } : r))
          : old,
      );
      return { snapshots };
    },
    mutationFn: async ({ id, ...updates }: Partial<Route> & { id: string }) => {
      const { data, error } = await supabase
        .from("routes")
        .update(updates)
        .eq("id", id)
        .select("*")
        .maybeSingle();
      if (error) throw error;
      return (data ?? { id, ...updates }) as Route;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["routes"] });
      qc.invalidateQueries({ queryKey: ["routes-range"] });
      // Sørg for at kalender-cachen og basisrute-cachen til projektionen
      // også opdateres, ellers fortsætter projicerede ruter med at vise
      // det gamle navn/farve indtil næste fulde refetch.
      qc.invalidateQueries({ queryKey: ["route-calendar"] });
      qc.invalidateQueries({ queryKey: ["recurring-base-routes"] });
    },
    onError: (e: any, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => qc.setQueryData(key, data));
      toast.error(e.message || "Kunne ikke opdatere rute");
    },
  });
};

/* ─── Recurring route series helpers ───
 *
 * En "rute-serie" er flere rute-instanser i `routes` der deler `route_template_id`.
 * Bruges til at vise "Kun denne gang" vs. "Fremtidige også" når brugeren flytter
 * en rute til en ny dato (træk i kalender eller ændrer dato i edit-sheet).
 */

export const useRouteSeriesInfo = (
  routeId: string | null | undefined,
  fromDate: string | null | undefined,
) => {
  return useQuery({
    queryKey: ["route-series-info", routeId, fromDate],
    enabled: !!routeId && !!fromDate,
    staleTime: 30_000,
    queryFn: async () => {
      // En "serie" = de tilbagevendende aftaler/abonnementer som ligger på denne rute.
      // Ruter for kommende datoer er ikke nødvendigvis oprettet endnu — de skabes
      // når abonnementets next_service_date forfalder. Derfor tæller vi
      // tilbagevendende abonnementer på denne rutes stops, ikke søsterruter.
      // 1) Tilbagevendende aftaler der ligger som stops på selve ruten
      //    (subscription_id på route_stops).
      const { data: stops } = await supabase
        .from("route_stops")
        .select("subscription_id")
        .eq("route_id", routeId!)
        .not("subscription_id", "is", null);

      const subIds = Array.from(
        new Set((stops || []).map((s: any) => s.subscription_id).filter(Boolean)),
      );

      // 2) Aftaler/abonnementer der har ruten som "preferred_route_id" — det
      //    er det signal kalender-projektionen bruger til at tegne fremtidige
      //    forekomster, så det er også den korrekte tæller her.
      const [subsByStops, subsByPref, agreementsByPref] = await Promise.all([
        subIds.length > 0
          ? supabase
              .from("subscriptions")
              .select("id, interval, status, next_service_date")
              .in("id", subIds)
          : Promise.resolve({ data: [] as any[], error: null } as any),
        supabase
          .from("subscriptions")
          .select("id, interval, status, next_service_date")
          .eq("preferred_route_id", routeId!)
          .eq("status", "active")
          .neq("interval", "engangskøb"),
        supabase
          .from("agreements")
          .select("id, interval, status, start_date")
          .eq("preferred_route_id", routeId!)
          .eq("status", "active")
          .neq("interval", "engangskøb"),
      ]);

      const recurringSubs = (subsByStops.data || []).filter(
        (s: any) =>
          s.status === "active" &&
          s.interval &&
          s.interval !== "engangskøb" &&
          s.next_service_date,
      );

      const ids = new Set<string>();
      for (const s of recurringSubs) ids.add(`sub:${s.id}`);
      for (const s of (subsByPref.data || [])) ids.add(`sub:${s.id}`);
      for (const a of (agreementsByPref.data || [])) ids.add(`agr:${a.id}`);

      return {
        recurringAppointmentCount: ids.size,
        linkedSubscriptionCount: ids.size,
        subscriptionIds: Array.from(ids),
      };
    },
  });
};

/** Flyt én rute eller hele resten af serien til en ny dato. */
export const useMoveRouteSeries = () => {
  const qc = useQueryClient();
  return useMutation({
    // Optimistisk patch: opdater route_date i alle cache-nøgler øjeblikkeligt
    // så ruten "lander" på den nye dato i kalenderen før server-roundtrippet
    // er færdigt. Det fjerner det 3-4 sek glimt brugeren oplevede.
    onMutate: async ({ routeId, newDate }) => {
      await Promise.all([
        qc.cancelQueries({ queryKey: ["route-calendar"] }),
        qc.cancelQueries({ queryKey: ["routes"] }),
        qc.cancelQueries({ queryKey: ["routes-range"] }),
      ]);
      const snapshots = [
        ...qc.getQueriesData<any>({ queryKey: ["route-calendar"] }),
        ...qc.getQueriesData<any>({ queryKey: ["routes"] }),
        ...qc.getQueriesData<any>({ queryKey: ["routes-range"] }),
      ];
      const patchRoute = (r: any) => (r?.id === routeId ? { ...r, route_date: newDate } : r);
      qc.setQueriesData({ queryKey: ["route-calendar"] }, (old: any) =>
        old?.routes ? { ...old, routes: old.routes.map(patchRoute) } : old,
      );
      qc.setQueriesData({ queryKey: ["routes"] }, (old: any) =>
        Array.isArray(old) ? old.map(patchRoute) : old,
      );
      qc.setQueriesData({ queryKey: ["routes-range"] }, (old: any) =>
        Array.isArray(old) ? old.map(patchRoute) : old,
      );
      return { snapshots };
    },
    mutationFn: ({
      routeId, newDate, scope, moveLinkedSubscriptions,
    }: {
      routeId: string;
      newDate: string;
      scope: "single" | "future";
      moveLinkedSubscriptions: boolean;
    }) => routeMutationQueue.run(async () => {
      // Én atomisk SQL-funktion håndterer hele flytningen i ét round-trip:
      //  - rutens dato
      //  - linkede agreement_occurrences
      //  - planlagte tider på alle stops (shift med dag-delta)
      //  - exception for den oprindelige dato (suppress af projektion)
      //  - ved "future": tilbagevendende subscriptions/agreements
      // Tidligere lavede vi op til 8 sekventielle round-trips + N per-stop
      // updates, hvilket var den primære grund til at flytningen føltes
      // langsom selv om UI'et patchede optimistisk.
      void moveLinkedSubscriptions; // implicit ved "future"
      const { error } = await supabase.rpc("move_route_to_date" as any, {
        _route_id: routeId,
        _new_date: newDate,
        _scope: scope,
      });
      if (error) throw error;
    }),
    onSuccess: () => {
      invalidateRouteSyncQueries(qc);
      qc.invalidateQueries({ queryKey: ["route-series-info"] });
      qc.invalidateQueries({ queryKey: ["recurring-agreements-for-planner"] });
      qc.invalidateQueries({ queryKey: ["recurring-base-routes"] });
      qc.invalidateQueries({ queryKey: ["route-occurrence-exceptions"] });
    },
    onError: (e: any, _vars, ctx: any) => {
      // Rul optimistisk patch tilbage hvis serveren afviser.
      ctx?.snapshots?.forEach(([key, data]: [any, any]) => qc.setQueryData(key, data));
      toast.error(e.message || "Kunne ikke flytte rute");
    },
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

      // Stops where this employee is one of the assignees on this route
      const { data: myAssignments } = await supabase
        .from("route_stop_assignees")
        .select("stop_id")
        .eq("employee_id", employeeId);
      const myStopIds = (myAssignments || []).map((a: any) => a.stop_id);
      const { data: stops } = myStopIds.length > 0
        ? await supabase
            .from("route_stops")
            .select("*")
            .eq("route_id", routeId)
            .in("id", myStopIds)
            .order("sequence", { ascending: true })
        : { data: [] as any[] };
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
  const employeeId = useMyEmployeeId();
  return useQuery({
    queryKey: ["my-day-routes", employeeId, date],
    enabled: !!employeeId,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: async () => {
      if (!employeeId) return [];
      // Find ruter via junction-tabel (nye ruter, evt. team) ELLER legacy
      // routes.employee_id-kolonne (ældre ruter / demo-data).
      // Ét request pr. tabel — ingen duplikater.
      const [linksRes, legacyRes, stopAssignRes] = await Promise.all([
        supabase.from("route_employees").select("route_id").eq("employee_id", employeeId),
        supabase.from("routes").select("id").eq("employee_id", employeeId).eq("route_date", date),
        supabase.from("route_stop_assignees").select("stop_id").eq("employee_id", employeeId),
      ]);
      const assignedStopIds = (stopAssignRes.data || []).map((a: any) => a.stop_id);
      const { data: assignedStopRoutes } = assignedStopIds.length > 0
        ? await supabase.from("route_stops").select("route_id").in("id", assignedStopIds)
        : { data: [] as any[] };
      const linkedRouteIds = new Set<string>([
        ...((linksRes.data || []).map((l: any) => l.route_id)),
        ...((legacyRes.data || []).map((r: any) => r.id)),
        ...((assignedStopRoutes || []).map((s: any) => s.route_id)),
      ]);
      const routeIds = Array.from(linkedRouteIds);
      if (routeIds.length === 0) return [];
      const { data, error } = await supabase
        .from("routes")
        .select("*")
        .in("id", routeIds)
        .eq("route_date", date);
      if (error) throw error;
      const routes = (data || []) as unknown as Route[];
      if (routes.length === 0) return routes;
      const todayRouteIds = routes.map((r) => r.id);
      // Genbrug stopAssignRes — vi har allerede ALLE stop-tildelinger for
      // medarbejderen. Filtrer i hukommelsen i stedet for at kalde igen.
      const myStopIds = new Set(assignedStopIds);
      const { data: stops } = await supabase
        .from("route_stops")
        .select("id, route_id, assigned_employee_id")
        .in("route_id", todayRouteIds);
      // Hvis ruten har stop tildelt SPECIFIKT til andre medarbejdere og
      // INTET er tildelt vores medarbejder (heller ikke utildelte stop
      // som kunne tilfalde dem), så er ruten reelt ikke længere deres —
      // selv hvis junction-row'en stadig findes. I alle andre tilfælde
      // viser vi ruten.
      const visibleRouteIds = new Set<string>();
      routes.forEach((r) => {
        const routeStops = (stops || []).filter((s: any) => s.route_id === r.id);
        if (routeStops.length === 0) {
          // Ny/tom rute — vis stadig så man ikke får et "tomhul" i kalenderen.
          visibleRouteIds.add(r.id);
          return;
        }
        const hasMine = routeStops.some(
          (s: any) => myStopIds.has(s.id) || s.assigned_employee_id === employeeId,
        );
        const hasUnassigned = routeStops.some((s: any) => !s.assigned_employee_id);
        const allAssignedToOthers = routeStops.every(
          (s: any) =>
            s.assigned_employee_id &&
            s.assigned_employee_id !== employeeId &&
            !myStopIds.has(s.id),
        );
        if (hasMine || hasUnassigned || !allAssignedToOthers) {
          visibleRouteIds.add(r.id);
        }
      });
      return routes.filter((r) => visibleRouteIds.has(r.id));
    },
  });
};

export const useMyDayStops = (date: string) => {
  const employeeId = useMyEmployeeId();
  return useQuery({
    queryKey: ["my-day-stops", employeeId, date],
    enabled: !!employeeId,
    placeholderData: keepPreviousData,
    staleTime: 30_000,
    queryFn: async () => {
      if (!employeeId) return [];
      const [linksRes, legacyRes, stopAssignRes] = await Promise.all([
        supabase.from("route_employees").select("route_id").eq("employee_id", employeeId),
        supabase.from("routes").select("id").eq("employee_id", employeeId).eq("route_date", date),
        supabase.from("route_stop_assignees").select("stop_id").eq("employee_id", employeeId),
      ]);
      const assignedStopIds = (stopAssignRes.data || []).map((a: any) => a.stop_id);
      const { data: assignedStopRoutes } = assignedStopIds.length > 0
        ? await supabase.from("route_stops").select("route_id").in("id", assignedStopIds)
        : { data: [] as any[] };
      const linkedRouteIds = new Set<string>([
        ...((linksRes.data || []).map((l: any) => l.route_id)),
        ...((legacyRes.data || []).map((r: any) => r.id)),
        ...((assignedStopRoutes || []).map((s: any) => s.route_id)),
      ]);
      const routeIds = Array.from(linkedRouteIds);
      if (routeIds.length === 0) return [];
      const { data: routes } = await supabase
        .from("routes")
        .select("id")
        .in("id", routeIds)
        .eq("route_date", date);
      const todayIds = (routes || []).map((r) => r.id);
      if (todayIds.length === 0) return [];
      // Genbrug stopAssignRes fra ovenfor — undgå et ekstra request.
      const myStopIds = new Set(assignedStopIds);
      const { data, error } = await supabase
        .from("route_stops")
        // Join occurrence + den linkede aftale så vi kan:
        //  1) validere at stop'et faktisk hører til den interval-forekomst
        //     der ligger på medarbejderens dato (ellers er rækken kommet
        //     med ved en fejl — typisk legacy/dubleret materialisering),
        //  2) hente aftalens `interval` så vi kan vise "Hver uge",
        //     "Månedligt", osv. på aftalekortet i appen.
        .select("*, agreement_occurrence:agreement_occurrences(occurrence_date, agreement:agreements(interval))")
        .in("route_id", todayIds)
        .order("sequence", { ascending: true });
      if (error) throw error;
      const byRoute = new Map<string, any[]>();
      (data || []).forEach((s: any) => {
        const arr = byRoute.get(s.route_id) || [];
        arr.push(s);
        byRoute.set(s.route_id, arr);
      });
      // Reglen er enkel og forudsigelig:
      //  • Hvis medarbejderen har MINDST ÉT specifikt tildelt stop på ruten,
      //    så viser vi KUN deres egne stop. Aldrig tilfældige uassignede
      //    eller stop tildelt kolleger — det forvirrer og ser ud som om
      //    medarbejderen har fået aftaler de ikke skal udføre.
      //  • Hvis medarbejderen er teamlinket til ruten (junction/legacy)
      //    men IKKE har specifikke stop, så viser vi alle stop som
      //    teamopgaver — ellers ville rutekortet være tomt.
      const filtered = (data || []).filter((s: any) => {
        const routeStops = byRoute.get(s.route_id) || [];
        const routeHasMySpecificStops = routeStops.some((rs: any) =>
          myStopIds.has(rs.id) || rs.assigned_employee_id === employeeId,
        );
        const belongsToEmployee = myStopIds.has(s.id) || s.assigned_employee_id === employeeId;
        if (routeHasMySpecificStops) return belongsToEmployee;
        // Ingen specifikke stop til mig på ruten → team-mode (kun hvis
        // ruten er teamlinket; ellers skjul stop tildelt andre).
        if (linkedRouteIds.has(s.route_id)) return true;
        return !s.assigned_employee_id;
      });
      // Interval-validering: drop stops hvor en linket agreement_occurrence
      // peger på en ANDEN dato end medarbejderens dag. Stops uden occurrence
      // (one-off ordrer / legacy) går altid igennem — vi vil aldrig skjule
      // ægte arbejde pga. manglende metadata. Pure helper deles med
      // `useMyRouteData` så reglerne er konsistente på tværs af appen.
      const filteredByInterval = filterStopsByOccurrenceDate(filtered as any[], date);
      const orderIds = Array.from(
        new Set(filteredByInterval.map((s: any) => s.order_id).filter(Boolean)),
      ) as string[];
      if (orderIds.length === 0) return filteredByInterval as RouteStop[];

      const { data: orderRows } = await supabase
        .from("orders")
        .select("id,status,total_amount,adjusted_amount,zip_code,city,payment_status,invoice_status")
        .in("id", orderIds);
      const orderMap = new Map(
        (orderRows || []).map((o: any) => [
          o.id,
          {
            status: o.status as string | null,
            amount: Number(o.adjusted_amount ?? o.total_amount ?? 0),
            zip_code: (o.zip_code as string | null) ?? null,
            city: (o.city as string | null) ?? null,
            payment_status: (o.payment_status as string | null) ?? null,
            invoice_status: (o.invoice_status as string | null) ?? null,
          },
        ]),
      );

      return filteredByInterval.map((s: any) => {
        const order = s.order_id ? orderMap.get(s.order_id) : null;
        // Saml fuld adresse: vej + postnr + by — så medarbejderens
        // overbliksliste ALDRIG viser kun et vejnavn (flere danske
        // adresser eksisterer i flere byer).
        const street = (s.address as string | null) || null;
        const cityLine = [order?.zip_code, order?.city].filter(Boolean).join(" ");
        const fullAddress = (() => {
          if (!street && !cityLine) return null;
          if (street && cityLine && !street.toLowerCase().includes(cityLine.toLowerCase())) {
            return `${street}, ${cityLine}`;
          }
          return street || cityLine || null;
        })();
        return {
          ...s,
          // Hejs interval-tekst op fra det nestede join så aftalekortet kan
          // vise "Hver uge", "Månedligt" osv. uden et ekstra request.
          agreement_interval: s.agreement_occurrence?.agreement?.interval ?? s.agreement_interval ?? null,
          order_status: order?.status ?? null,
          order_payment_status: order?.payment_status ?? null,
          order_invoice_status: order?.invoice_status ?? null,
          order_amount: order?.amount ?? null,
          full_address: fullAddress,
        };
      }) as RouteStop[];
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

      const { data: myAssign } = await supabase
        .from("route_stop_assignees")
        .select("stop_id")
        .eq("employee_id", emp.id);
      const myStopIds = new Set((myAssign || []).map((a: any) => a.stop_id));
      const { data: rawStops } = await supabase
        .from("route_stops")
        // Hent occurrence + aftalens interval i samme request — bruges
        // både til interval-validering (dropper stops der ikke hører til
        // dagen) og til at vise interval-label på aftalekortet i appen.
        .select("*, agreement_occurrence:agreement_occurrences(occurrence_date, agreement:agreements(interval))")
        .eq("route_id", routeId!)
        .order("sequence", { ascending: true });
      // Interval-validering: hvis ruten er dagens dato, drop stops hvis
      // occurrence peger på en anden dato (legacy/fejlmaterialisering).
      // Når vi ikke kender en specifik dag (route uden konkret dato eller
      // legacy-stops uden occurrence), lader vi alle slippe igennem.
      const dayKey = (route as any)?.route_date ? String((route as any).route_date).slice(0, 10) : null;
      const intervalValidStops = dayKey
        ? filterStopsByOccurrenceDate((rawStops || []) as any[], dayKey)
        : (rawStops || []);
      const routeHasMySpecificStops = (intervalValidStops || []).some((s: any) =>
        myStopIds.has(s.id) || s.assigned_employee_id === emp.id,
      );
      const filteredStops = (intervalValidStops || []).filter((s: any) => {
        const belongsToEmployee = myStopIds.has(s.id) || s.assigned_employee_id === emp.id;
        // Hvis medarbejderen har specifikke stop på ruten → kun deres egne.
        // Ellers (team-mode) → vis alle stop på ruten.
        return routeHasMySpecificStops ? belongsToEmployee : true;
      });

      // Join alle assignees for de viste stops, så UI kan beregne fx
      // medarbejderens egen andel af aftalens beløb (delt med kolleger).
      const stopIds = filteredStops.map((s: any) => s.id);
      let assigneeMap = new Map<string, { ids: string[]; lead: string | null }>();
      if (stopIds.length > 0) {
        const { data: assignees } = await supabase
          .from("route_stop_assignees")
          .select("stop_id, employee_id, is_lead")
          .in("stop_id", stopIds);
        (assignees || []).forEach((a: any) => {
          const entry = assigneeMap.get(a.stop_id) || { ids: [], lead: null };
          entry.ids.push(a.employee_id);
          if (a.is_lead) entry.lead = a.employee_id;
          assigneeMap.set(a.stop_id, entry);
        });
      }
      // Hent ordrer for at berige med postnr+by → fuld adresse vises i appen
      // (ellers ser medarbejderen kun gadenavnet på map-popups og rute-kortet,
      // hvilket flere gange fører til besøg på forkert postdistrikt).
      const orderIds = Array.from(
        new Set(filteredStops.map((s: any) => s.order_id).filter(Boolean)),
      ) as string[];
      const orderMap = new Map<string, { status: string | null; amount: number; zip_code: string | null; city: string | null; payment_status: string | null; invoice_status: string | null }>();
      if (orderIds.length > 0) {
        const { data: orderRows } = await supabase
          .from("orders")
          .select("id,status,total_amount,adjusted_amount,zip_code,city,payment_status,invoice_status")
          .in("id", orderIds);
        (orderRows || []).forEach((o: any) => {
          orderMap.set(o.id, {
            status: o.status as string | null,
            amount: Number(o.adjusted_amount ?? o.total_amount ?? 0),
            zip_code: (o.zip_code as string | null) ?? null,
            city: (o.city as string | null) ?? null,
            payment_status: (o.payment_status as string | null) ?? null,
            invoice_status: (o.invoice_status as string | null) ?? null,
          });
        });
      }
      const stops = filteredStops.map((s: any) => {
        const entry = assigneeMap.get(s.id);
        const order = s.order_id ? orderMap.get(s.order_id) : null;
        const street = (s.address as string | null) || null;
        const cityLine = [order?.zip_code, order?.city].filter(Boolean).join(" ");
        const fullAddress = (() => {
          if (!street && !cityLine) return null;
          if (street && cityLine && !street.toLowerCase().includes(cityLine.toLowerCase())) {
            return `${street}, ${cityLine}`;
          }
          return street || cityLine || null;
        })();
        return {
          ...s,
          assignee_ids: entry?.ids || (s.assigned_employee_id ? [s.assigned_employee_id] : []),
          lead_employee_id: entry?.lead ?? s.assigned_employee_id ?? null,
          // Hejs interval-tekst op fra det nestede join — så aftalekort
          // og rute-modal i medarbejder-appen viser "Hver uge" osv.
          agreement_interval: s.agreement_occurrence?.agreement?.interval ?? s.agreement_interval ?? null,
          order_status: order?.status ?? null,
          order_payment_status: order?.payment_status ?? null,
          order_invoice_status: order?.invoice_status ?? null,
          order_amount: order?.amount ?? null,
          full_address: fullAddress,
        };
      });

      return {
        route: route as unknown as Route & { businesses?: { name?: string; phone?: string } },
        stops: (stops || []) as RouteStop[],
        employee: emp,
      };
    },
  });
};

/* ─── Driving directions geometry between two or more waypoints ─── */
export const useDirections = (
  waypoints: { lat: number; lng: number }[] | null,
  options?: { departAt?: string; businessId?: string },
) => {
  const key = waypoints?.map((w) => `${w.lat.toFixed(5)},${w.lng.toFixed(5)}`).join("|") || "";
  const departKey = options?.departAt
    ? new Date(options.departAt).toISOString().slice(0, 16) // minut-præcision i cache-key
    : "now";
  const bizKey = options?.businessId || "none";
  return useQuery({
    queryKey: ["directions", key, departKey, bizKey],
    enabled: !!waypoints && waypoints.length >= 2,
    // Hold cache i 30 sek — kort nok til at en reroute (samme key, men efter
    // invalidate) faktisk fetches igen, langt nok til at vi ikke spammer
    // endpoint mens stableOrigin holdes konstant mellem GPS-fixes.
    staleTime: 30 * 1000,
    gcTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("route-directions", {
        body: {
          waypoints,
          ...(options?.departAt ? { depart_at: options.departAt } : {}),
          ...(options?.businessId ? { business_id: options.businessId } : {}),
        },
      });
      if (error) throw error;
      return data as {
        ok: boolean;
        provider: "mapbox" | "fallback";
        geometry: { type: "LineString"; coordinates: [number, number][] };
        distance_m: number | null;
        duration_s: number | null;
        duration_raw_s?: number | null;
        duration_typical_s?: number | null;
        traffic_multiplier?: number;
        base_multiplier?: number;
        override_applied?: { zip: string | null; label: string | null; multiplier: number } | null;
        depart_at?: string;
        depart_is_future?: boolean;
        alternatives_count?: number;
        steps?: Array<{
          distance_m: number;
          duration_s: number;
          name: string;
          maneuver: {
            type: string;
            modifier?: string;
            instruction?: string;
            bearing_after?: number;
            bearing_before?: number;
            location: [number, number];
          };
          geometry?: { type: "LineString"; coordinates: [number, number][] };
        }>;
      };
    },
  });
};

