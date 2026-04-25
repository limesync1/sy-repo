// useMyEmployee — henter medarbejder-record for nuværende auth-user
// samt aggregerede statistik-data over en periode.
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Employee = Tables<"employees">;

/** Den indloggede medarbejders egen record (incl. avatar, navn, business). */
export const useMyEmployee = () => {
  return useQuery({
    queryKey: ["my-employee"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      const { data, error } = await supabase
        .from("employees")
        .select("*")
        .eq("user_id", u.user.id)
        .maybeSingle();
      if (error) throw error;
      return data as Employee | null;
    },
  });
};

export type EmployeeStats = {
  routesCount: number;
  stopsTotal: number;
  stopsCompleted: number;
  workdaysCount: number;
  workMinutes: number;
  totalDistanceKm: number;
  revenue: number;        // omsætning fra completede stop (ordrer)
  commission: number;     // medarbejderens andel (commission_pct)
  perDay: { date: string; stops: number; revenue: number }[];
};

/** Aggregeret statistik for medarbejder i et datointerval (inkl. begge ender). */
export const useMyEmployeeStats = (
  employeeId: string | undefined,
  commissionPct: number,
  from: string,
  to: string,
) => {
  return useQuery({
    queryKey: ["my-employee-stats", employeeId, from, to],
    enabled: !!employeeId,
    queryFn: async (): Promise<EmployeeStats> => {
      if (!employeeId) {
        return {
          routesCount: 0, stopsTotal: 0, stopsCompleted: 0,
          workdaysCount: 0, workMinutes: 0, totalDistanceKm: 0,
          revenue: 0, commission: 0, perDay: [],
        };
      }

      // 1) Find ruter i perioden, hvor medarbejderen er tilknyttet (via
      //    junction-tabel, legacy-kolonne eller stop-niveau).
      const [linksRes, stopAssignRes] = await Promise.all([
        supabase.from("route_employees").select("route_id").eq("employee_id", employeeId),
        supabase.from("route_stop_assignees").select("stop_id").eq("employee_id", employeeId),
      ]);

      const linkedRouteIds = new Set<string>(
        (linksRes.data || []).map((l: any) => l.route_id),
      );
      const myAssignedStopIds = new Set<string>(
        (stopAssignRes.data || []).map((a: any) => a.stop_id),
      );

      // 2) Hent alle ruter i perioden hvor medarbejderen er på (via junction
      //    eller legacy employee_id).
      const { data: linkedRoutes } = await supabase
        .from("routes")
        .select("id, route_date, total_distance_km, total_duration_minutes")
        .gte("route_date", from)
        .lte("route_date", to)
        .or(`id.in.(${Array.from(linkedRouteIds).join(",") || "00000000-0000-0000-0000-000000000000"}),employee_id.eq.${employeeId}`);

      // Tilføj ruter hvor medarbejderen kun har stop-niveau-assignment
      let extraRouteRows: { id: string; route_date: string; total_distance_km: number | null; total_duration_minutes: number | null }[] = [];
      if (myAssignedStopIds.size > 0) {
        const { data: stopRoutes } = await supabase
          .from("route_stops")
          .select("route_id")
          .in("id", Array.from(myAssignedStopIds));
        const stopRouteIds = Array.from(new Set((stopRoutes || []).map((s: any) => s.route_id)));
        if (stopRouteIds.length > 0) {
          const { data: extra } = await supabase
            .from("routes")
            .select("id, route_date, total_distance_km, total_duration_minutes")
            .in("id", stopRouteIds)
            .gte("route_date", from)
            .lte("route_date", to);
          extraRouteRows = (extra || []) as any;
        }
      }

      const routeMap = new Map<string, { id: string; route_date: string; total_distance_km: number | null; total_duration_minutes: number | null }>();
      [...(linkedRoutes || []), ...extraRouteRows].forEach((r: any) => routeMap.set(r.id, r));
      const routeIds = Array.from(routeMap.keys());

      if (routeIds.length === 0) {
        return {
          routesCount: 0, stopsTotal: 0, stopsCompleted: 0,
          workdaysCount: 0, workMinutes: 0, totalDistanceKm: 0,
          revenue: 0, commission: 0, perDay: [],
        };
      }

      // 3) Hent alle stop på de ruter
      const { data: stops } = await supabase
        .from("route_stops")
        .select("id, route_id, status, assigned_employee_id, completed_at, order_id")
        .in("route_id", routeIds);

      // Filtrér stop som tilhører medarbejderen (specifik tildeling eller team)
      const myStops = (stops || []).filter((s: any) => {
        return (
          s.assigned_employee_id === employeeId ||
          myAssignedStopIds.has(s.id) ||
          // team-stop på rute hvor medarbejderen er linket
          (linkedRouteIds.has(s.route_id) && !s.assigned_employee_id)
        );
      });

      const stopsCompleted = myStops.filter((s: any) => s.status === "completed").length;
      const completedOrderIds = myStops
        .filter((s: any) => s.status === "completed" && s.order_id)
        .map((s: any) => s.order_id);

      // 4) Omsætning fra completede ordrer
      let revenue = 0;
      if (completedOrderIds.length > 0) {
        const { data: orders } = await supabase
          .from("orders")
          .select("id, total_amount, adjusted_amount")
          .in("id", completedOrderIds);
        revenue = (orders || []).reduce(
          (sum: number, o: any) => sum + Number(o.adjusted_amount ?? o.total_amount ?? 0),
          0,
        );
      }

      // 5) Arbejdsdage
      const { data: workdays } = await supabase
        .from("employee_workdays")
        .select("workday_date, duration_minutes, started_at, ended_at")
        .eq("employee_id", employeeId)
        .gte("workday_date", from)
        .lte("workday_date", to);

      const workMinutes = (workdays || []).reduce(
        (sum: number, w: any) => sum + Number(w.duration_minutes || 0),
        0,
      );

      // 6) Total distance — sum kun de ruter hvor medarbejderen reelt har stop
      const myRouteIds = new Set(myStops.map((s: any) => s.route_id));
      let totalDistanceKm = 0;
      myRouteIds.forEach((rid) => {
        const r = routeMap.get(rid as string);
        if (r?.total_distance_km) totalDistanceKm += Number(r.total_distance_km);
      });

      // 7) Per-dag aggregering (til evt. graf eller liste)
      const perDayMap = new Map<string, { date: string; stops: number; revenue: number }>();
      const stopRouteDate = new Map<string, string>();
      myStops.forEach((s: any) => {
        const r = routeMap.get(s.route_id);
        if (r) stopRouteDate.set(s.id, r.route_date);
      });
      myStops.forEach((s: any) => {
        if (s.status !== "completed") return;
        const d = stopRouteDate.get(s.id);
        if (!d) return;
        const row = perDayMap.get(d) || { date: d, stops: 0, revenue: 0 };
        row.stops += 1;
        perDayMap.set(d, row);
      });
      const perDay = Array.from(perDayMap.values()).sort((a, b) => a.date.localeCompare(b.date));

      const commission = revenue * (Number(commissionPct || 0) / 100);

      return {
        routesCount: myRouteIds.size,
        stopsTotal: myStops.length,
        stopsCompleted,
        workdaysCount: (workdays || []).length,
        workMinutes,
        totalDistanceKm,
        revenue,
        commission,
        perDay,
      };
    },
  });
};