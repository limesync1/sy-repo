import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BusinessHoliday = {
  id: string;
  business_id: string;
  holiday_date: string;
  name: string;
};

/**
 * Henter virksomhedens helligdage/lukkedage i et givent datointerval.
 * Gentagende aftaler projiceres ikke på disse datoer.
 */
export const useBusinessHolidays = (
  businessId: string | undefined,
  range?: { start: string; end: string },
) => {
  return useQuery({
    queryKey: ["business-holidays", businessId, range?.start, range?.end],
    enabled: !!businessId,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!businessId) return [] as BusinessHoliday[];
      let q = (supabase as any)
        .from("business_holidays")
        .select("id, business_id, holiday_date, name")
        .eq("business_id", businessId);
      if (range?.start) q = q.gte("holiday_date", range.start);
      if (range?.end) q = q.lte("holiday_date", range.end);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as BusinessHoliday[];
    },
  });
};
