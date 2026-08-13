// useOnboardingSignals — én delt kilde til "hvor langt er virksomheden i
// opsætningen?". Bruges af sidebar-badgen, næste-trin-striben og selve
// "Kom godt i gang"-fanen, så de aldrig kan vise forskellige tal.
//
// Alt detekteres automatisk fra databasen. Manuelle overrides bruges kun til
// "spring over" på det enkelte trin og gemmes lokalt pr. virksomhed.
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ONBOARDING_STEPS, type OnboardingStepId } from "@/components/admin/onboarding/steps";

export type OnboardingCounts = {
  categoriesCount: number;
  accountingActive: boolean;
  accountingFeatureEnabled: boolean;
  employeesCount: number;
  servicesCount: number;
  ordersCount: number;
  routesCount: number;
};

const SKIP_KEY_PREFIX = "serviceydere.onboarding.skipped.";

export type OnboardingState = {
  counts: OnboardingCounts | undefined;
  isLoading: boolean;
  /** Trin der er reelt gennemført (auto-detekteret eller sprunget over). */
  done: Record<OnboardingStepId, boolean>;
  skipped: Record<string, boolean>;
  toggleSkip: (id: OnboardingStepId) => void;
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

  const skipKey = SKIP_KEY_PREFIX + (businessId || "anon");
  const [skipped, setSkipped] = useState<Record<string, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(skipKey) || "{}"); } catch { return {}; }
  });

  const toggleSkip = useCallback((id: OnboardingStepId) => {
    setSkipped((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      try { localStorage.setItem(skipKey, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, [skipKey]);

  const effective = counts ?? EMPTY_COUNTS;

  const done = useMemo(() => {
    const map = {} as Record<OnboardingStepId, boolean>;
    for (const step of ONBOARDING_STEPS) {
      map[step.id] = step.isDone(effective) || !!skipped[step.id];
    }
    return map;
  }, [effective, skipped]);

  const completedCount = ONBOARDING_STEPS.filter((s) => done[s.id]).length;
  const nextStep = ONBOARDING_STEPS.find((s) => !done[s.id]) ?? null;

  return {
    counts,
    isLoading,
    done,
    skipped,
    toggleSkip,
    completedCount,
    totalCount: ONBOARDING_STEPS.length,
    allDone: !isLoading && !!counts && completedCount === ONBOARDING_STEPS.length,
    nextStepId: nextStep?.id ?? null,
  };
};
