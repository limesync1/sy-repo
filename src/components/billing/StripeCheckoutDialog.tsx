// StripeCheckoutDialog — viser Stripe Embedded Checkout i en modal. Modtager
// abonnementsvalget (basis + tilvalg + interval) og kalder edge functionen
// `create-checkout-session` for at hente clientSecret.
import { useEffect, useMemo, useState } from "react";
import { EmbeddedCheckoutProvider, EmbeddedCheckout } from "@stripe/react-stripe-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { getStripe, getStripeEnvironment, buildPriceSelection, type BillingPeriod } from "@/lib/stripe";
import { PaymentTestModeBanner } from "./PaymentTestModeBanner";
import { Loader2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  businessId: string;
  billingPeriod: BillingPeriod;
  routePlanning: boolean;
  accounting: boolean;
  extraEmployeeLogins: number;
  /** Hvor Stripe sender brugeren tilbage efter betaling (samme tab). */
  returnPath?: string;
}

export function StripeCheckoutDialog(props: Props) {
  const { open, onClose, businessId, billingPeriod, routePlanning, accounting, extraEmployeeLogins } = props;
  const [error, setError] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState(0);

  // Reset session når dialog lukkes så næste åbning starter en frisk session.
  useEffect(() => {
    if (!open) {
      setError(null);
      setSessionToken((t) => t + 1);
    }
  }, [open]);

  const fetchClientSecret = useMemo(() => {
    return async () => {
      const selection = buildPriceSelection({
        billingPeriod, routePlanning, accounting, extraEmployeeLogins,
      });
      const returnUrl = `${window.location.origin}${props.returnPath ?? "/virksomhed?tab=settings&checkout=success"}&session_id={CHECKOUT_SESSION_ID}`;
      const { data, error } = await supabase.functions.invoke("create-checkout-session", {
        body: {
          businessId,
          basePriceId: selection.basePriceId,
          addonPriceIds: selection.addonPriceIds,
          extraEmployeeLogins: selection.extraEmployeeLogins,
          extraEmployeePriceId: selection.extraEmployeePriceId,
          returnUrl,
          environment: getStripeEnvironment(),
        },
      });
      if (error || !data?.clientSecret) {
        const msg = (error as any)?.message || data?.error || "Kunne ikke starte checkout";
        setError(typeof msg === "string" ? msg : JSON.stringify(msg));
        throw new Error(typeof msg === "string" ? msg : "Checkout error");
      }
      return data.clientSecret as string;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sessionToken, businessId, billingPeriod, routePlanning, accounting, extraEmployeeLogins]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Tilføj betalingskort</DialogTitle>
          <DialogDescription>
            Sikker betaling via Stripe. Du opkræves ikke før din prøveperiode er slut.
          </DialogDescription>
        </DialogHeader>
        <PaymentTestModeBanner />
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {error}
          </div>
        )}
        {open && !error && (
          <div id="stripe-checkout" key={sessionToken} className="min-h-[400px]">
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ fetchClientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
            <div className="flex items-center justify-center gap-2 pt-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" />
              Indlæser sikker betaling...
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}