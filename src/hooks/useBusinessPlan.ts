// useBusinessPlan — henter den abonnementspakke, der er knyttet til en
// virksomhed, og leverer afledte felter (dage tilbage af prøveperiode,
// om virksomheden bør deaktiveres pga. manglende betalingskort osv.).
// Bruges af AdminShell-banneret samt re-aktiveringsflowet ved login.
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type BusinessPlanStatus =
  | "trialing"          // Inden for gratis prøveperiode
  | "trial_ending"      // ≤3 dage tilbage uden kort
  | "expired"           // Prøven er udløbet og der er ikke noget kort → bør deaktiveres
  | "active"            // Betalt abonnement
  | "unknown";          // Ingen plan-række fundet

export interface BusinessPlanInfo {
  id: string | null;
  status: BusinessPlanStatus;
  trial_ends_at: string | null;
  days_left: number | null;
  has_payment_method: boolean;
  monthly_price_dkk: number;
  payment_brand: string | null;
  payment_last4: string | null;
  billing_period: string;
  route_planning_enabled: boolean;
  accounting_integration_enabled: boolean;
  data_import_requested: boolean;
  extra_employee_logins: number;
  startup_fee_charged: boolean;
  locked_extra_employee_logins: number | null;
  locked_accounting_integration: boolean | null;
  locked_at: string | null;
  deletion_requested_at: string | null;
}

export const useBusinessPlan = (businessId: string | null | undefined) => {
  return useQuery<BusinessPlanInfo | null>({
    queryKey: ["business-plan", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("business_plans")
        .select("*")
        .eq("business_id", businessId!)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        return {
          id: null, status: "unknown", trial_ends_at: null,
          days_left: null, has_payment_method: false, monthly_price_dkk: 0,
          payment_brand: null, payment_last4: null, billing_period: "monthly",
          route_planning_enabled: false, accounting_integration_enabled: false,
          data_import_requested: false, extra_employee_logins: 0,
          startup_fee_charged: false,
          locked_extra_employee_logins: null, locked_accounting_integration: null,
          locked_at: null, deletion_requested_at: null,
        };
      }
      const hasCard = !!data.stripe_payment_method_last4;
      // Hvis trial_ends_at mangler, regn et fallback ud fra created_at + 14 dage
      // så banneret altid kan vise "X dage, Y timer tilbage" i stedet for blot
      // "Din prøveperiode er aktiv".
      let trialEnd = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
      if (!trialEnd && data.created_at) {
        const created = new Date(data.created_at);
        trialEnd = new Date(created.getTime() + 14 * 24 * 60 * 60 * 1000);
      }
      const trialEndIso = trialEnd ? trialEnd.toISOString() : null;
      const daysLeft = trialEnd
        ? Math.ceil((trialEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        : null;

      let status: BusinessPlanStatus = "unknown";
      if (data.status === "active" || hasCard) status = "active";
      else if (daysLeft !== null && daysLeft <= 0) status = "expired";
      else if (daysLeft !== null && daysLeft <= 3) status = "trial_ending";
      else if (data.status === "trialing") status = "trialing";

      return {
        id: data.id,
        status,
        trial_ends_at: trialEndIso,
        days_left: daysLeft,
        has_payment_method: hasCard,
        monthly_price_dkk: Number(data.monthly_price_dkk) || 0,
        payment_brand: data.stripe_payment_method_brand,
        payment_last4: data.stripe_payment_method_last4,
        billing_period: data.billing_period || "monthly",
        route_planning_enabled: true, // altid inkluderet
        accounting_integration_enabled: !!data.accounting_integration_enabled,
        data_import_requested: !!data.data_import_requested,
        extra_employee_logins: Number(data.extra_employee_logins) || 0,
        startup_fee_charged: !!(data as any).startup_fee_charged,
        locked_extra_employee_logins: (data as any).locked_extra_employee_logins ?? null,
        locked_accounting_integration: (data as any).locked_accounting_integration ?? null,
        locked_at: (data as any).locked_at ?? null,
        deletion_requested_at: (data as any).deletion_requested_at ?? null,
      };
    },
  });
};

/**
 * usePlatformPricing — henter den offentlige prisliste fra
 * platform_settings (basis, tillæg, rabatter, prøvedage). Bruges af både
 * onboarding og indstillinger så priserne altid stemmer overens.
 */
export interface PlatformPricing {
  base_price_dkk: number;
  price_route_planning_dkk: number;
  price_accounting_integration_dkk: number;
  price_data_import_dkk: number;
  price_per_employee_login_dkk: number;
  startup_fee_dkk: number;
  discount_quarterly_pct: number;
  discount_yearly_pct: number;
  trial_days: number;
}

export const usePlatformPricing = () => {
  return useQuery<PlatformPricing | null>({
    queryKey: ["platform-pricing"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_platform_pricing");
      if (error) throw error;
      const row = data?.[0];
      if (!row) return null;
      return {
        base_price_dkk: Number(row.base_price_dkk) || 0,
        price_route_planning_dkk: Number(row.price_route_planning_dkk) || 0,
        price_accounting_integration_dkk: Number(row.price_accounting_integration_dkk) || 0,
        price_data_import_dkk: Number(row.price_data_import_dkk) || 0,
        price_per_employee_login_dkk: Number(row.price_per_employee_login_dkk) || 0,
        startup_fee_dkk: Number((row as any).startup_fee_dkk) || 2269,
        discount_quarterly_pct: Number(row.discount_quarterly_pct) || 0,
        discount_yearly_pct: Number(row.discount_yearly_pct) || 0,
        trial_days: Number(row.trial_days) || 14,
      };
    },
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * useUpdateBusinessPlan — opdaterer et eller flere felter på business_plans
 * (fx feature-toggles, billing_period, monthly_price_dkk). Bruges af
 * Indstillinger → Priser og betaling, når brugeren slår en funktion til/fra.
 */
export const useUpdateBusinessPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      businessId,
      patch,
    }: {
      businessId: string;
      patch: {
        route_planning_enabled?: boolean;
        accounting_integration_enabled?: boolean;
        data_import_requested?: boolean;
        extra_employee_logins?: number;
        billing_period?: string;
        monthly_price_dkk?: number;
      };
    }) => {
      // Upsert så toggle virker selv hvis virksomheden endnu ikke har en
      // plan-række (fx ældre virksomheder oprettet før business_plans blev tilføjet).
      const { data: existing } = await supabase
        .from("business_plans")
        .select("id")
        .eq("business_id", businessId)
        .maybeSingle();
      if (existing?.id) {
        const { error } = await supabase
          .from("business_plans")
          .update(patch)
          .eq("business_id", businessId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("business_plans")
          .insert({ business_id: businessId, ...patch } as any);
        if (error) throw error;
      }
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["business-plan", vars.businessId] });
    },
  });
};

/**
 * useReactivateBusinessPlan — markerer abonnementet som "active" når
 * brugeren tilføjer et betalingskort. Stripe-flowet kobles på senere;
 * indtil da gemmer vi blot kortets sidste 4 cifre + brand så banneret
 * forsvinder og virksomheden er "betalende".
 */
export const useReactivateBusinessPlan = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      businessId, last4, brand,
    }: { businessId: string; last4: string; brand: string }) => {
      const { error: planError } = await supabase
        .from("business_plans")
        .update({
          status: "active",
          stripe_payment_method_last4: last4,
          stripe_payment_method_brand: brand,
        })
        .eq("business_id", businessId);
      if (planError) throw planError;

      // Sørg for at virksomheden er aktiv igen efter betaling.
      const { error: bizError } = await supabase
        .from("businesses")
        .update({ is_active: true })
        .eq("id", businessId);
      if (bizError) throw bizError;
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["business-plan", vars.businessId] });
      qc.invalidateQueries({ queryKey: ["business"] });
      qc.invalidateQueries({ queryKey: ["my-business"] });
      qc.invalidateQueries({ queryKey: ["admin-business-plans"] });
    },
  });
};

/**
 * useRemovePaymentMethod — fjerner det gemte kort. Hvis prøveperioden
 * er udløbet vil virksomheden falde tilbage til "trialing"/"expired"
 * status næste gang `useBusinessPlan` evalueres.
 */
export const useRemovePaymentMethod = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (businessId: string) => {
      const { error } = await supabase
        .from("business_plans")
        .update({
          status: "trialing",
          stripe_payment_method_last4: null,
          stripe_payment_method_brand: null,
        })
        .eq("business_id", businessId);
      if (error) throw error;
    },
    onSuccess: (_, businessId) => {
      qc.invalidateQueries({ queryKey: ["business-plan", businessId] });
      qc.invalidateQueries({ queryKey: ["admin-business-plans"] });
    },
  });
};