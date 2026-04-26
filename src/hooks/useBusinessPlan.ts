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
        };
      }
      const hasCard = !!data.stripe_payment_method_last4;
      const trialEnd = data.trial_ends_at ? new Date(data.trial_ends_at) : null;
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
        trial_ends_at: data.trial_ends_at,
        days_left: daysLeft,
        has_payment_method: hasCard,
        monthly_price_dkk: Number(data.monthly_price_dkk) || 0,
      };
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
    },
  });
};