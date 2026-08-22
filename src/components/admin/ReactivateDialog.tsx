// ReactivateDialog — vises som en blokerende modal hvis virksomhedens
// prøveperiode er udløbet og der endnu ikke er tilføjet et betalingskort.
// Tidligere viste den et fake kort-form; nu åbner den den rigtige Stripe
// Embedded Checkout-flow (samme som i Indstillinger), så betalingen rent
// faktisk oprettes og payments-webhook flipper plan.status til "active".
import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Lock, ShieldCheck, Loader2, Trash2, ArrowLeft, AlertTriangle } from "lucide-react";
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
  const { signOut, user } = useAuth();
  const { data: plan } = useBusinessPlan(businessId);
  const [showCheckout, setShowCheckout] = useState(false);
  const [openingPortal, setOpeningPortal] = useState(false);

  // ---- Sletning af virksomheden ------------------------------------------
  // Brugere der ikke ønsker at betale efter prøveperioden skal kunne komme
  // videre uden at kontakte support. Vi genbruger samme e-mailkode-flow som
  // farezonen i Indstillinger (request_business_deletion_code →
  // confirm_business_deletion), så sletningen er lige så sikker her.
  const [mode, setMode] = useState<"pay" | "delete-intro" | "delete-code">("pay");
  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef<number | null>(null);
  const ownerEmail = user?.email ?? null;

  useEffect(() => {
    if (cooldown <= 0) return;
    cooldownRef.current = window.setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => { if (cooldownRef.current) window.clearTimeout(cooldownRef.current); };
  }, [cooldown]);

  const requestDeletionCode = async () => {
    if (sending || cooldown > 0) return;
    setSending(true);
    try {
      if (!ownerEmail) throw new Error("Ingen e-mail tilknyttet din konto");
      const { data: codeValue, error } = await supabase.rpc("request_business_deletion_code", {
        p_business_id: businessId,
      });
      if (error || !codeValue) throw new Error(error?.message || "Kunne ikke generere kode");
      const { error: mailErr } = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "business-deletion-code",
          recipientEmail: ownerEmail,
          idempotencyKey: `biz-del-${businessId}-${codeValue}`,
          templateData: { businessName, code: codeValue, expiresInMinutes: 15 },
        },
      });
      if (mailErr) throw mailErr;
      setMode("delete-code");
      setCooldown(60);
      toast.success(`Kode sendt til ${ownerEmail}`);
    } catch (err: any) {
      toast.error(err?.message || "Noget gik galt");
    } finally {
      setSending(false);
    }
  };

  const confirmDeletion = async () => {
    const trimmed = code.trim();
    if (trimmed.length !== 5) {
      toast.error("Koden skal være 5 cifre");
      return;
    }
    setConfirming(true);
    try {
      const { data, error } = await supabase.rpc("confirm_business_deletion", {
        p_business_id: businessId,
        p_code: trimmed,
      });
      if (error) throw error;
      if (!data) {
        toast.error("Ugyldig eller udløbet kode");
        setConfirming(false);
        return;
      }
      toast.success("Virksomheden er slettet, og der opkræves ikke yderligere");
      setTimeout(async () => {
        await supabase.auth.signOut();
        window.location.href = "/";
      }, 1200);
    } catch (err: any) {
      toast.error(err?.message || "Kunne ikke slette virksomheden");
      setConfirming(false);
    }
  };


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
          {mode === "pay" ? (
            <>
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
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="flex-1" onClick={() => signOut()}>Log ud</Button>
                  <Button
                    variant="ghost"
                    className="flex-1 text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => { setCode(""); setMode("delete-intro"); }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Slet virksomhed
                  </Button>
                </div>
                <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                  Vil du ikke fortsætte? Du kan slette virksomheden og dine data helt — så opkræves du aldrig.
                </p>
              </div>
            </>
          ) : (
            <>
              <DialogHeader>
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <DialogTitle className="text-center">Slet {businessName}</DialogTitle>
                <DialogDescription className="text-center">
                  {mode === "delete-intro"
                    ? "Virksomheden, dine services og data fjernes fra Serviceydere, og abonnementet annulleres med det samme. Platform-support kan rulle det tilbage i op til 30 dage."
                    : `Indtast den 5-cifrede kode vi har sendt til ${ownerEmail}.`}
                </DialogDescription>
              </DialogHeader>

              {mode === "delete-code" && (
                <div className="space-y-2">
                  <Input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 5))}
                    placeholder="00000"
                    inputMode="numeric"
                    maxLength={5}
                    className="h-14 text-center font-mono text-2xl tabular-nums tracking-[0.5em]"
                    autoFocus
                  />
                  <p className="text-center text-[11px] text-muted-foreground">
                    Koden er gyldig i 15 minutter.{" "}
                    <button
                      type="button"
                      onClick={requestDeletionCode}
                      disabled={sending || cooldown > 0}
                      className="font-medium text-foreground underline-offset-2 hover:underline disabled:cursor-not-allowed disabled:text-muted-foreground disabled:no-underline"
                    >
                      {cooldown > 0 ? `Send ny kode om ${cooldown}s` : "Send ny kode"}
                    </button>
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-2">
                {mode === "delete-intro" ? (
                  <Button variant="destructive" size="lg" onClick={requestDeletionCode} disabled={sending || !ownerEmail}>
                    {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Send bekræftelseskode
                  </Button>
                ) : (
                  <Button variant="destructive" size="lg" onClick={confirmDeletion} disabled={confirming || code.length !== 5}>
                    {confirming ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
                    Bekræft sletning
                  </Button>
                )}
                <Button variant="ghost" onClick={() => setMode("pay")} disabled={sending || confirming}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Tilbage
                </Button>
              </div>
            </>
          )}

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