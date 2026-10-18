// useOnboardingSignals — én delt kilde til "hvor langt er virksomheden i
// opsætningen?". Bruges af sidebar-badgen, næste-trin-striben og selve
// "Kom godt i gang"-fanen, så de aldrig kan vise forskellige tal.
//
// Selve fremgangen detekteres automatisk fra databasen. Brugerens egne valg
// — sprunget over-trin — gemmes i `business_onboarding_progress`, så de følger
// virksomheden på tværs af browsere og kolleger.

import { useCallback, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  CORE_STEPS, NEXT_LEVEL_STEPS,
  type OnboardingStep, type OnboardingStepId,

} from "@/components/admin/onboarding/steps";
import { useOnboardingProgress, useUpdateOnboardingProgress } from "@/hooks/useOnboarding";

export type OnboardingCounts = {
  categoriesCount: number;
  accountingActive: boolean;
  accountingFeatureEnabled: boolean;
  employeesCount: number;
  servicesCount: number;
  ordersCount: number;
  routesCount: number;
};


export type OnboardingState = {
  counts: OnboardingCounts | undefined;
  isLoading: boolean;
  /** Trin der er reelt gennemført (auto-detekteret eller sprunget over). */
  done: Record<OnboardingStepId, boolean>;
  skipped: Record<string, boolean>;
  toggleSkip: (id: OnboardingStepId) => void;
  /** Alle kerne-trin — både faste aftaler og enkeltstående aftaler. */
  steps: OnboardingStep[];
  nextLevelSteps: OnboardingStep[];

  completedCount: number;
  totalCount: number;
  allDone: boolean;
  /** Første ikke-færdige trin — brugt til "næste trin"-striben. */
  nextStepId: OnboardingStepId | null;
};

const EMPTY_COUNTS: OnboardingCounts = {
  categoriesCount: 0,
  accountingActive: false,
  accountingFeatureEnabled: false,
  employeesCount: 0,
  servicesCount: 0,
  ordersCount: 0,
  routesCount: 0,
};

export const useOnboardingSignals = (business: any): OnboardingState => {
  const businessId = business?.id as string | undefined;
  const qc = useQueryClient();

  const { data: counts, isLoading } = useQuery({
    queryKey: ["onboarding-signals", businessId],
    enabled: !!businessId,
    staleTime: 30_000,
    queryFn: async (): Promise<OnboardingCounts> => {
      const bizId = businessId!;
      const settings = (business?.settings ?? {}) as Record<string, any>;
      const categories = (business?.categories as string[] | null) || [];
      const [services, employees, orders, routes, accounting] = await Promise.all([
        supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", bizId),
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("business_id", bizId).eq("is_active", true),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("business_id", bizId),
        supabase.from("routes").select("id", { count: "exact", head: true }).eq("business_id", bizId),
        supabase.from("accounting_integrations").select("id", { count: "exact", head: true }).eq("business_id", bizId).eq("is_active", true),
      ]);
      return {
        categoriesCount: categories.length,
        accountingFeatureEnabled: !!settings.accounting_integration_enabled,
        accountingActive: (accounting.count ?? 0) > 0,
        employeesCount: employees.count ?? 0,
        servicesCount: services.count ?? 0,
        ordersCount: orders.count ?? 0,
        routesCount: routes.count ?? 0,
      };
    },
  });

  const { data: progress } = useOnboardingProgress(businessId);
  const update = useUpdateOnboardingProgress(businessId);

  const skipped = useMemo(() => {
    const map: Record<string, boolean> = {};
    for (const id of progress?.skipped_steps ?? []) map[id] = true;
    return map;
  }, [progress?.skipped_steps]);


  const patchProgress = useCallback(
    (patch: Record<string, unknown>) => {
      // Optimistisk: opdatér cachen med det samme så UI'et ikke hakker.
      qc.setQueryData(["onboarding-progress", businessId], (old: any) =>
        old ? { ...old, ...patch } : old,
      );
      update.mutate(patch as any);
    },
    [qc, businessId, update],
  );

  const toggleSkip = useCallback(
    (id: OnboardingStepId) => {
      const current = new Set(progress?.skipped_steps ?? []);
      if (current.has(id)) current.delete(id);
      else current.add(id);
      patchProgress({ skipped_steps: Array.from(current) });
    },
    [progress?.skipped_steps, patchProgress],
  );


  const effective = counts ?? EMPTY_COUNTS;
  const steps = CORE_STEPS;


  const done = useMemo(() => {
    const map = {} as Record<OnboardingStepId, boolean>;
    for (const step of [...CORE_STEPS, ...NEXT_LEVEL_STEPS]) {
      map[step.id] = step.isDone(effective) || !!skipped[step.id];
    }
    return map;
  }, [effective, skipped]);

  const completedCount = steps.filter((s) => done[s.id]).length;
  const nextStep = steps.find((s) => !done[s.id]) ?? null;

  return {
    counts,
    isLoading,
    done,
    skipped,
    toggleSkip,
    steps,
    nextLevelSteps: NEXT_LEVEL_STEPS,
    completedCount,
    totalCount: steps.length,
    allDone: !isLoading && !!counts && completedCount === steps.length,
    nextStepId: nextStep?.id ?? null,
  };
};
