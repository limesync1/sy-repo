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

      // Læs fra snapshot-tabellen så indtjening bevares selvom rute/stop slettes.
      const fromTs = `${from}T00:00:00`;
      const toTs = `${to}T23:59:59.999`;
      const { data: snaps, error } = await supabase
        .from("employee_completed_stops")
        .select("employee_id, earnings, order_amount, completed_at")
        .eq("business_id", businessId)
        .gte("completed_at", fromTs)
        .lte("completed_at", toTs);
      if (error) {
        console.error("employee-earnings snapshot error:", error);
        return result;
      }
      (snaps || []).forEach((s: any) => {
        const cur = result.get(s.employee_id) || {
          employee_id: s.employee_id,
          earnings: 0,
          stopsCompleted: 0,
          revenue: 0,
        };
        cur.earnings += Number(s.earnings || 0);
        cur.stopsCompleted += 1;
        cur.revenue += Number(s.order_amount || 0);
        result.set(s.employee_id, cur);
      });
      return result;
    },
  });
};