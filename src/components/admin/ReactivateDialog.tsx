// ReactivateDialog — vises som en blokerende modal hvis virksomhedens
// prøveperiode er udløbet og der endnu ikke er tilføjet et betalingskort.
// Tidligere viste den et fake kort-form; nu åbner den den rigtige Stripe
// Embedded Checkout-flow (samme som i Indstillinger), så betalingen rent
// faktisk oprettes og payments-webhook flipper plan.status til "active".
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CreditCard, Lock, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useBusinessPlan } from "@/hooks/useBusinessPlan";
import { StripeCheckoutDialog } from "@/components/billing/StripeCheckoutDialog";
import { supabase } from "@/integrations/supabase/client";
import { getStripeEnvironment } from "@/lib/stripe";

type Props = {
  open: boolean;
  businessId: string;
  businessName: string;
};

const ReactivateDialog = ({ open, businessId, businessName }: Props) => {
  const { signOut } = useAuth();
  const { data: plan } = useBusinessPlan(businessId);
  const [showCheckout, setShowCheckout] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  // Hvis virksomheden allerede har et kort hos Stripe (fx udløbet og kortet
  // skal opdateres), åbner vi Billing Portal i stedet for ny checkout.
  const openPortal = async () => {
    setOpeningPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal", {
        body: {
          businessId,
          returnUrl: `${window.location.origin}/virksomhed?tab=settings`,
          environment: getStripeEnvironment(),
        },
      });
      if (error || !data?.url) throw new Error((error as any)?.message || data?.error || "Kunne ikke åbne portal");
      window.location.href = data.url;
    } catch (e: any) {
      toast.error(e?.message || "Kunne ikke åbne kort-administrationen");
    } finally {
      setOpeningPortal(false);
    }
  };

  const billingPeriod = (plan?.billing_period as "monthly" | "quarterly" | "yearly") || "monthly";
  const accounting = !!plan?.accounting_integration_enabled;
  const extraEmployees = plan?.extra_employee_logins ?? 0;
  const hasCard = !!plan?.has_payment_method;

  return (
    <>
      <Dialog open={open && !showCheckout} onOpenChange={() => { /* blokerende */ }}>
        <DialogContent
          className="sm:max-w-md"
          onInteractOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
              <Lock className="h-6 w-6" />
            </div>
            <DialogTitle className="text-center">Genaktivér {businessName}</DialogTitle>
            <DialogDescription className="text-center">
              Din gratis prøveperiode er udløbet, og din virksomhed er midlertidigt deaktiveret. Tilføj et betalingskort for at få adgang til virksomhedspanelet igen.
            </DialogDescription>
          </DialogHeader>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-secondary/50 p-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-accent shrink-0" />
            Sikker betaling via Stripe. Du kan opsige eller skifte plan når som helst fra Indstillinger.
          </div>

          <div className="flex flex-col gap-2">
            <Button
              onClick={() => (hasCard ? openPortal() : setShowCheckout(true))}
              disabled={openingPortal || !plan}
              size="lg"
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {openingPortal ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Åbner sikker betaling…</>
              ) : (
                <><CreditCard className="mr-2 h-4 w-4" />{hasCard ? "Opdatér betalingskort" : "Tilføj betalingskort & genaktivér"}</>
              )}
            </Button>
            <Button variant="ghost" onClick={() => signOut()}>Log ud</Button>
          </div>
        </DialogContent>
      </Dialog>

      <StripeCheckoutDialog
        open={showCheckout}
        onClose={() => setShowCheckout(false)}
        businessId={businessId}
        billingPeriod={billingPeriod}
        routePlanning={true}
        accounting={accounting}
        extraEmployeeLogins={extraEmployees}
        returnPath="/virksomhed?tab=settings&checkout=success"
      />
    </>
  );
};

export default ReactivateDialog;