import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type MaterializationJob = {
  id: string;
  business_id: string;
  idempotency_key: string;
  agreement_id: string | null;
  occurrence_id: string | null;
  occurrence_date: string | null;
  target_route_id: string | null;
  status: "pending" | "running" | "done" | "failed" | "cancelled";
  attempts: number;
  max_attempts: number;
  last_error: string | null;
  next_attempt_at: string;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
};

/**
 * Læser køen af materialiserings-jobs for en virksomhed. Bruges af admin-
 * panelet til at overvåge retries, fejlede jobs og igangværende arbejde.
 */
export const useMaterializationJobs = (
  businessId: string | undefined,
  filter?: { status?: MaterializationJob["status"]; limit?: number },
) => {
  return useQuery({
    queryKey: ["materialization-jobs", businessId, filter?.status, filter?.limit],
    enabled: !!businessId,
    staleTime: 10_000,
    queryFn: async () => {
      if (!businessId) return [] as MaterializationJob[];
      let q = (supabase as any)
        .from("route_materialization_jobs")
        .select("*")
        .eq("business_id", businessId)
        .order("created_at", { ascending: false })
        .limit(filter?.limit ?? 100);
      if (filter?.status) q = q.eq("status", filter.status);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as MaterializationJob[];
    },
  });
};
