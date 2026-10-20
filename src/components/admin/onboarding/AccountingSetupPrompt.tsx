import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calculator, CheckCircle2, Info, ArrowLeft, Loader2 } from "lucide-react";

const AccountingTab = lazy(() => import("@/components/admin/AccountingTab"));

const NEW_BUSINESS_DAYS = 14;
const storageKey = (id: string) => `accounting-setup-choice:${id}`;

/**
 * Spørger nyoprettede virksomheder (uden regnskabsintegration) om de vil
 * forbinde deres regnskabsprogram, før de begynder at bruge systemet.
 * "Ja" viser præcis samme trin som Regnskab-siden.
 */
export default function AccountingSetupPrompt({ business }: { business: { id: string; name: string; created_at?: string | null } }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<"choice" | "setup">("choice");

  const isNew = !!business.created_at &&
    Date.now() - new Date(business.created_at).getTime() < NEW_BUSINESS_DAYS * 86400000;
  const decided = typeof window !== "undefined" && !!window.localStorage.getItem(storageKey(business.id));

  const { data: hasIntegration, isSuccess } = useQuery({
    queryKey: ["accounting-integration-exists", business.id],
    enabled: isNew && !decided,
    queryFn: async () => {
      const { data } = await supabase.from("accounting_integrations" as any)
        .select("id").eq("business_id", business.id).maybeSingle();
      return !!data;
    },
  });

  useEffect(() => {
    if (isSuccess && !hasIntegration) setOpen(true);
  }, [isSuccess, hasIntegration]);

  const remember = (choice: string) => window.localStorage.setItem(storageKey(business.id), choice);
  const skip = () => { remember("skip"); setOpen(false); };
  const close = () => { remember(step === "setup" ? "setup" : "later"); setOpen(false); };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) close(); }}>
      <DialogContent className={step === "setup" ? "modal-large flex flex-col gap-0 p-0" : "max-w-lg gap-0 p-0"}>
        {step === "choice" ? (
          <div className="flex flex-col">
            <div className="flex flex-col items-center gap-3 px-6 pb-4 pt-7 text-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl border border-accent/30 bg-accent/10 text-accent">
                <Calculator className="h-8 w-8" />
              </span>
              <DialogTitle className="text-xl font-semibold">Forbind jeres regnskabsprogram?</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-muted-foreground">
                Så bliver kunder, fakturaer og betalinger sendt automatisk til fx e-conomic eller Dinero.
              </DialogDescription>
            </div>
            <div className="mx-6 flex gap-2.5 rounded-md border border-accent/40 bg-accent/10 p-3 text-sm leading-6 text-foreground">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
              <p><strong>Vi anbefaler at gøre det nu</strong>, før I opretter kunder og aftaler. Så kommer alt med fra start, og I slipper for at flytte data bagefter.</p>
            </div>
            <ul className="mx-6 mt-3 space-y-1.5 text-sm text-foreground">
              {["Fakturaer oprettes automatisk ved udført aftale", "Betalinger og kreditnotaer følger med", "Tager kun et par minutter – vi guider jer trin for trin"].map((t) => (
                <li key={t} className="flex items-start gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-accent" />{t}</li>
              ))}
            </ul>
            <div className="mt-5 flex flex-col-reverse gap-2 border-t border-border p-4 sm:flex-row sm:justify-end">
              <Button variant="outline" className="min-h-11" onClick={skip}>Kør uden integration</Button>
              <Button className="min-h-11" onClick={() => { remember("setup"); setStep("setup"); }}>
                Ja, forbind regnskab
              </Button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 border-b border-border px-4 py-3">
              <Button variant="ghost" size="sm" className="min-h-11 gap-1" onClick={() => setStep("choice")}>
                <ArrowLeft className="h-4 w-4" /> Tilbage
              </Button>
              <DialogTitle className="text-base font-semibold">Forbind regnskab</DialogTitle>
              <DialogDescription className="sr-only">Samme trin som på Regnskab-siden.</DialogDescription>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
              <Suspense fallback={<div className="flex justify-center py-16"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}>
                <AccountingTab businessId={business.id} businessName={business.name} />
              </Suspense>
            </div>
            <div className="flex justify-end border-t border-border p-3">
              <Button className="min-h-11" onClick={close}>Færdig</Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
