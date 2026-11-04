import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { readTradeModules, type TradeModules } from "@/lib/trade-modules";

/** Læser hvilke håndværksmoduler virksomheden har slået til. */
export function useTradeModules(businessId?: string | null) {
  return useQuery({
    queryKey: ["trade-modules", businessId],
    enabled: !!businessId,
    staleTime: 5 * 60_000,
    queryFn: async (): Promise<TradeModules & { categories: string[] }> => {
      const { data, error } = await supabase.from("businesses")
        .select("settings, category, categories").eq("id", businessId!).maybeSingle();
      if (error) throw error;
      const categories = ((data?.categories as string[]) ?? []).length ? (data!.categories as string[]) : data?.category ? [data.category] : [];
      return { ...readTradeModules(data?.settings), categories };
    },
  });
}
