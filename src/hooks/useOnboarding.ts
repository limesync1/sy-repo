import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Onboarding-fremgang for en virksomhed.
 *
 * Vi gemmer hvert fuldført trin (eller eksplicit sprunget over) som en streng
 * i `completed_steps` / `skipped_steps` så vi nemt kan tilføje nye trin senere
 * uden migrations. `wizard_dismissed` betyder at brugeren har lukket wizarden
 * — checklisten i sidebaren er dog stadig tilgængelig.
 */
export type OnboardingProgress = {
  id: string;
  business_id: string;
  completed_steps: string[];
  skipped_steps: string[];
  current_step: string | null;
  wizard_dismissed: boolean;
  fully_completed_at: string | null;
};

const EMPTY: Omit<OnboardingProgress, "id" | "business_id"> = {
  completed_steps: [],
  skipped_steps: [],
  current_step: null,
  wizard_dismissed: false,
  fully_completed_at: null,
};

export const useOnboardingProgress = (businessId: string | undefined) => {
  return useQuery({
    queryKey: ["onboarding-progress", businessId],
    enabled: !!businessId,
    queryFn: async (): Promise<OnboardingProgress | null> => {
      if (!businessId) return null;
      const { data, error } = await supabase
        .from("business_onboarding_progress")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      return {
        ...data,
        completed_steps: (data.completed_steps as string[]) || [],
        skipped_steps: (data.skipped_steps as string[]) || [],
      } as OnboardingProgress;
    },
    staleTime: 30_000,
  });
};

export const useUpdateOnboardingProgress = (businessId: string | undefined) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (patch: Partial<Omit<OnboardingProgress, "id" | "business_id">>) => {
      if (!businessId) throw new Error("Mangler businessId");
      // Hent eksisterende række eller indsæt ny
      const existing = await supabase
        .from("business_onboarding_progress")
        .select("*")
        .eq("business_id", businessId)
        .maybeSingle();

      const base = existing.data
        ? {
            completed_steps: (existing.data.completed_steps as string[]) || [],
            skipped_steps: (existing.data.skipped_steps as string[]) || [],
            current_step: existing.data.current_step,
            wizard_dismissed: existing.data.wizard_dismissed,
            fully_completed_at: existing.data.fully_completed_at,
          }
        : { ...EMPTY };

      const next = { ...base, ...patch };
      if (existing.data) {
        const { error } = await supabase
          .from("business_onboarding_progress")
          .update(next as any)
          .eq("business_id", businessId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_onboarding_progress")
          .insert({ business_id: businessId, ...next } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding-progress", businessId] });
    },
  });
};

/** Markér ét trin som fuldført. Idempotent. */
export const useCompleteOnboardingStep = (businessId: string | undefined) => {
  const update = useUpdateOnboardingProgress(businessId);
  const { data } = useOnboardingProgress(businessId);
  return useMutation({
    mutationFn: async (stepId: string) => {
      const completed = new Set(data?.completed_steps || []);
      completed.add(stepId);
      const skipped = (data?.skipped_steps || []).filter((s) => s !== stepId);
      await update.mutateAsync({
        completed_steps: Array.from(completed),
        skipped_steps: skipped,
      });
    },
  });
};