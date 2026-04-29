/**
 * useEmployeeEarnings — admin-side hook der beregner indtjening pr. medarbejder
 * for en given periode. Bruger den samme provisionsregel som lib/commission.ts:
 *  - Beløb ekskl. moms (25%)
 *  - Hver medarbejders sats / antal medarbejdere på opgaven
 *
 * Dette er en BUSINESS-OWNER hook (ikke medarbejder-app). Den henter alle
 * completed stops for et businessId i perioden og beregner andel pr.
 * medarbejder.
 */
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calcEmployeeShare } from "@/lib/commission";

export type EmployeeEarning = {
  employee_id: string;
  earnings: number;       // medarbejderens udbetaling (ekskl. moms, andel)
  stopsCompleted: number; // antal udførte opgaver
  revenue: number;        // brutto-omsætning fra opgaverne (inkl. moms)
};

export const useEmployeeEarnings = (
  businessId: string | undefined,
  from: string,
  to: string,
) => {
  return useQuery({
    queryKey: ["employee-earnings", businessId, from, to],
    enabled: !!businessId,
    staleTime: 60 * 1000,
    queryFn: async (): Promise<Map<string, EmployeeEarning>> => {
      const result = new Map<string, EmployeeEarning>();
      if (!businessId) return result;

      // 1) Hent alle medarbejdere på business + deres provisionssats.
      const { data: employees } = await supabase
        .from("employees")
        .select("id, commission_pct")
        .eq("business_id", businessId);
      if (!employees?.length) return result;
      const empById = new Map(employees.map((e: any) => [e.id, Number(e.commission_pct || 0)]));

      // 2) Hent alle ruter i perioden for businessId.
      const { data: routes } = await supabase
        .from("routes")
        .select("id, employee_id")
        .eq("business_id", businessId)
        .gte("route_date", from)
        .lte("route_date", to);
      const routeIds = (routes || []).map((r: any) => r.id);
      if (!routeIds.length) return result;
      const routeLegacyEmployee = new Map(
        (routes || []).map((r: any) => [r.id, r.employee_id || null]),
      );

      // 3) Team pr. rute (route_employees junction)
      const { data: routeTeam } = await supabase
        .from("route_employees")
        .select("route_id, employee_id")
        .in("route_id", routeIds);
      const teamByRoute = new Map<string, string[]>();
      (routeTeam || []).forEach((re: any) => {
        const arr = teamByRoute.get(re.route_id) || [];
        arr.push(re.employee_id);
        teamByRoute.set(re.route_id, arr);
      });
      // Fallback: legacy employee_id på ruten
      routeIds.forEach((rid) => {
        if (!teamByRoute.has(rid)) {
          const legacy = routeLegacyEmployee.get(rid);
          teamByRoute.set(rid, legacy ? [legacy as string] : []);
        }
      });

      // 4) Hent alle completed stops på de ruter
      const { data: stops } = await supabase
        .from("route_stops")
        .select("id, route_id, status, order_id, assigned_employee_id")
        .in("route_id", routeIds)
        .eq("status", "completed");
      const completedStops = (stops || []).filter((s: any) => s.order_id);
      if (!completedStops.length) return result;

      // 5) Hent ordrebeløb (inkl. moms)
      const orderIds = Array.from(new Set(completedStops.map((s: any) => s.order_id)));
      const { data: orders } = await supabase
        .from("orders")
        .select("id, total_amount, adjusted_amount")
        .in("id", orderIds);
      const amountByOrder = new Map(
        (orders || []).map((o: any) => [
          o.id,
          Number(o.adjusted_amount ?? o.total_amount ?? 0),
        ]),
      );

      // 6) Hent eksplicitte stop-assignees
      const stopIds = completedStops.map((s: any) => s.id);
      const { data: stopAssignees } = await supabase
        .from("route_stop_assignees")
        .select("stop_id, employee_id")
        .in("stop_id", stopIds);
      const assigneesByStop = new Map<string, string[]>();
      (stopAssignees || []).forEach((a: any) => {
        const arr = assigneesByStop.get(a.stop_id) || [];
        arr.push(a.employee_id);
        assigneesByStop.set(a.stop_id, arr);
      });

      // 7) For hvert stop: bestem assignees, beregn andel pr. medarbejder
      completedStops.forEach((s: any) => {
        const orderAmount = amountByOrder.get(s.order_id) || 0;
        let assignees = assigneesByStop.get(s.id) || [];
        if (!assignees.length) {
          // Fallback 1: stoppets enkelte assigned_employee_id
          if (s.assigned_employee_id) assignees = [s.assigned_employee_id];
          else assignees = teamByRoute.get(s.route_id) || [];
        }
        if (!assignees.length) return;
        const sharers = assignees.length;
        assignees.forEach((empId: string) => {
          const pct = empById.get(empId) || 0;
          const share = calcEmployeeShare(orderAmount, pct, sharers);
          const cur = result.get(empId) || {
            employee_id: empId,
            earnings: 0,
            stopsCompleted: 0,
            revenue: 0,
          };
          cur.earnings += share;
          cur.stopsCompleted += 1;
          cur.revenue += orderAmount;
          result.set(empId, cur);
        });
      });

      return result;
    },
  });
};