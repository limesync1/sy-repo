import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ExternalLink, Flame, History, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { churnRiskScore, fmtDate, fmtDateTime, fmtKr, planStatusColor, type FieldProps } from "./shared";

const Field = ({ label, children }: FieldProps) => (
  <div className="min-w-0">
    <dt className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</dt>
    <dd className="truncate text-foreground">{children}</dd>
  </div>
);

/**
 * Side-detalje for en business-plan. Viser alle Stripe-felter samlet,
 * direkte link til virksomhed/profil, og hurtighandlinger.
 */
export const PlanDetailDialog = ({ plan, onClose }: { plan: any | null; onClose: () => void }) => {
  const qc = useQueryClient();
  const syncMut = useMutation({
    mutationFn: async (businessId: string) => {
      const { data, error } = await supabase.functions.invoke("admin-sync-business-plan", {
        body: { business_id: businessId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      return data;
    },
    onSuccess: () => {
      toast.success("Synkroniseret med Stripe");
      qc.invalidateQueries({ queryKey: ["admin-business-plans-list"] });
    },
    onError: (e: any) => toast.error(e?.message || "Kunne ikke synkronisere"),
  });

  const { data: history } = useQuery({
    queryKey: ["plan-history", plan?.business_id],
    enabled: !!plan?.business_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("admin_audit_log")
        .select("*")
        .eq("target_type", "business_plan")
        .eq("target_label", plan.business_id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
  });

  if (!plan) return null;
  const risk = churnRiskScore(plan);
  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {plan.businesses?.name || "Plan"}
            <Badge className={`${planStatusColor[plan.status] || ""} border text-[10px]`}>{plan.status}</Badge>
          </DialogTitle>
          <DialogDescription className="text-xs">
            Plan oprettet {fmtDateTime(plan.created_at)} · {plan.stripe_environment}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 rounded-lg border border-border bg-secondary/40 p-3">
            <Field label="Plan-pris">{fmtKr(plan.monthly_price_dkk)} {plan.billing_period === "yearly" ? "/år" : "/md"}</Field>
            <Field label="Næste fornyelse">{fmtDate(plan.current_period_end)}</Field>
            <Field label="Trial slutter">{fmtDate(plan.trial_ends_at)}</Field>
            <Field label="Sidste betaling">{fmtDate(plan.last_payment_at)}</Field>
            <Field label="Stripe customer">
              <span className="font-mono text-[11px] break-all">{plan.stripe_customer_id || "—"}</span>
            </Field>
            <Field label="Stripe subscription">
              <span className="font-mono text-[11px] break-all">{plan.stripe_subscription_id || "—"}</span>
            </Field>
            {plan.stripe_payment_method_last4 && (
              <Field label="Kort">
                {plan.stripe_payment_method_brand} •••• {plan.stripe_payment_method_last4}
              </Field>
            )}
            <Field label="Churn-risk">
              <span className={cn(
                "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                risk >= 60 ? "bg-destructive/10 text-destructive" :
                risk >= 30 ? "bg-amber-500/10 text-amber-700" :
                "bg-emerald-500/10 text-emerald-700",
              )}>
                <Flame className="h-2.5 w-2.5" /> {risk}/100
              </span>
            </Field>
          </dl>

          <div className="flex flex-wrap gap-2">
            {plan.stripe_subscription_id && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={syncMut.isPending}
                onClick={() => syncMut.mutate(plan.business_id)}
              >
                <RefreshCw className={cn("h-3.5 w-3.5", syncMut.isPending && "animate-spin")} />
                {syncMut.isPending ? "Synkroniserer..." : "Synkronisér Stripe"}
              </Button>
            )}
            {plan.businesses?.slug && (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <Link to={`/${plan.businesses.slug}`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" /> Åbn profil
                </Link>
              </Button>
            )}
            {plan.stripe_customer_id && (
              <Button asChild size="sm" variant="outline" className="gap-1.5">
                <a
                  href={`https://dashboard.stripe.com/${plan.stripe_environment === "sandbox" ? "test/" : ""}customers/${plan.stripe_customer_id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-3.5 w-3.5" /> Åbn i Stripe
                </a>
              </Button>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              <History className="h-3 w-3" /> Plan-historik
            </div>
            {!history || history.length === 0 ? (
              <p className="text-xs text-muted-foreground italic">Ingen registrerede ændringer endnu.</p>
            ) : (
              <ul className="space-y-1.5 rounded-lg border border-border bg-secondary/30 p-2 max-h-60 overflow-y-auto">
                {history.map((h: any) => (
                  <li key={h.id} className="text-xs flex items-start gap-2">
                    <span className="text-muted-foreground tabular-nums shrink-0 w-28">{fmtDateTime(h.created_at)}</span>
                    <span className="flex-1">
                      <span className="font-medium text-foreground">{h.action.replace(/^.*\./, "")}</span>
                      {h.admin_email && <span className="text-muted-foreground"> · {h.admin_email}</span>}
                      {h.details && Object.keys(h.details).length > 0 && (
                        <span className="block text-[10px] text-muted-foreground font-mono mt-0.5">
                          {JSON.stringify(h.details)}
                        </span>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};