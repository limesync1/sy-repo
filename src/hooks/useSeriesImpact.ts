import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Beregner hvor mange forekomster en serie-mutation rammer.
 * Bruges af SeriesScopeDialog til at vise konsekvens-tal som
 * "Påvirker 12 fremtidige forekomster".
 *
 * Vi tæller materialiserede `agreement_occurrences` rows (sande forekomster).
 * Det giver et konservativt minimums-tal — projicerede fremtidige forekomster
 * tælles ikke, men det rapporterede tal er aldrig for højt.
 */
export const useSeriesImpact = (params: {
  agreementId: string | null | undefined;
  fromDate: string | null | undefined; // yyyy-MM-dd — bruges til "future"
  enabled?: boolean;
}) => {
  const { agreementId, fromDate, enabled = true } = params;
  return useQuery({
    queryKey: ["series-impact", agreementId, fromDate],
    enabled: enabled && !!agreementId,
    staleTime: 30_000,
    queryFn: async () => {
      if (!agreementId) return { totalCount: 0, futureCount: 0 };
      const [{ count: total }, { count: future }] = await Promise.all([
        supabase
          .from("agreement_occurrences")
          .select("id", { head: true, count: "exact" })
          .eq("agreement_id", agreementId),
        supabase
          .from("agreement_occurrences")
          .select("id", { head: true, count: "exact" })
          .eq("agreement_id", agreementId)
          .gte("occurrence_date", fromDate ?? new Date().toISOString().slice(0, 10)),
      ]);
      return {
        totalCount: total ?? 0,
        futureCount: future ?? 0,
      };
    },
  });
};