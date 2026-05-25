import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AgreementPause = {
  id: string;
  business_id: string;
  agreement_id: string;
  start_date: string;
  end_date: string;
  reason: string | null;
};

/**
 * Henter pauser for alle aftaler i en virksomhed der overlapper et givent
 * datointerval. Bruges af `expandRecurringRoutes` til at skippe forekomster
 * der falder i en pause-periode.
 */
export const useAgreementPauses = (
  businessId: string | undefined,
  range?: { start: string; end: string },
) => {
  return useQuery({
    queryKey: ["agreement-pauses", businessId, range?.start, range?.end],
    enabled: !!businessId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!businessId) return [] as AgreementPause[];
      let q = (supabase as any)
        .from("agreement_pauses")
        .select("id, business_id, agreement_id, start_date, end_date, reason")
        .eq("business_id", businessId);
      if (range?.start) q = q.lte("start_date", range.end);
      if (range?.end) q = q.gte("end_date", range.start);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as AgreementPause[];
    },
  });
};
