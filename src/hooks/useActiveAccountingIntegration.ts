import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export const useActiveAccountingIntegration = (businessId?: string) =>
  useQuery({
    queryKey: ["active-accounting-integration", businessId],
    enabled: !!businessId,
    staleTime: 60_000,
    queryFn: async () => {
      if (!businessId) return null;
      const { data, error } = await supabase
        .from("accounting_integrations")
        .select("id, provider, is_active")
        .eq("business_id", businessId)
        .eq("is_active", true)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });