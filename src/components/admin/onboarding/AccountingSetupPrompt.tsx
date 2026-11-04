import { AccountingSkeleton } from "@/components/admin/shared/Skeletons";
import { lazy, Suspense, useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Info, ArrowLeft, Loader2 } from "lucide-react";
import { PanelIcon } from "@/components/shared/PanelIcon";
import { Section, SheetFooterBar, SheetHeaderBlock } from "@/components/route-planner/SheetSection";

const AccountingTab = lazy(() => import("@/components/admin/AccountingTab"));

const NEW_BUSINESS_DAYS = 14;
const storageKey = (id: string) => `accounting-setup-choice:${id}`;

/**
 * Spørger nyoprettede virksomheder (uden regnskabsintegration) om de vil
 * forbinde deres regnskabsprogram, før de begynder at bruge systemet.
 * "Ja" viser præcis samme trin som Regnskab-siden.
 * Vinduet følger samme design som Rediger profil: fritstående ikon uden
 * baggrund eller ramme, sektioner på dæmpet baggrund og fast knaplinje.
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
      <DialogContent className={`appointment-details-overlay planner-overlay flex flex-col gap-0 overflow-hidden rounded-md p-0 sm:p-0 ${step === "setup" ? "modal-large" : "max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-lg sm:max-h-[92vh]"}`}>
        <DialogHeader className="planner-overlay-header shrink-0 space-y-0 border-b px-4 py-3 pr-12 text-left sm:px-5 sm:pr-14">
          <SheetHeaderBlock
            icon={<PanelIcon name="connectAccounting" className="h-14 w-14" />}
            iconClassName="h-14 w-14 rounded-none !bg-transparent ring-0"
            title={<DialogTitle className="text-base">{step === "setup" ? "Forbind regnskab" : "Forbind jeres regnskabsprogram?"}</DialogTitle>}
            description={
              <DialogDescription className="text-xs leading-snug">
                {step === "setup"
                  ? "Samme trin som på Regnskab-siden. I kan altid ændre det senere."
                  : "Så bliver kunder, fakturaer og betalinger sendt automatisk til fx e-conomic eller Dinero."}
              </DialogDescription>
            }
          />
        </DialogHeader>

        {step === "choice" ? (
          <div className="planner-overlay-body min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain bg-secondary/20 px-3 py-4 sm:px-5">
            <Section icon={<Info className="h-3.5 w-3.5" />} title="Vores anbefaling" tone="accent">
              <p className="text-[13px] leading-6 text-foreground">
                <strong>Gør det nu</strong>, før I opretter kunder og aftaler. Så kommer alt med fra start,
                og I slipper for at flytte data bagefter.
              </p>
            </Section>
            <Section icon={<CheckCircle2 className="h-3.5 w-3.5" />} title="Det får I" tone="emerald">
              <ul className="space-y-2 text-[13px] leading-6 text-foreground">
                {["Fakturaer oprettes automatisk ved udført aftale", "Betalinger og kreditnotaer følger med", "Tager kun et par minutter – vi guider jer trin for trin"].map((t) => (
                  <li key={t} className="flex items-start gap-2">
                    <CheckCircle2 className="mt-1 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{t}</span>
                  </li>
                ))}
              </ul>
            </Section>
          </div>
        ) : (
          <div className="planner-overlay-body min-h-0 flex-1 overflow-y-auto overscroll-contain bg-secondary/20 px-3 py-4 sm:px-5">
            <Suspense fallback={<AccountingSkeleton />}>
              <AccountingTab businessId={business.id} businessName={business.name} />
            </Suspense>
          </div>
        )}

        <SheetFooterBar className="pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {step === "choice" ? (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
              <Button variant="outline" className="min-h-11 flex-1 sm:flex-none" onClick={skip}>Kør uden integration</Button>
              <Button className="min-h-11 flex-1 sm:flex-none" onClick={() => { remember("setup"); setStep("setup"); }}>
                Ja, forbind regnskab
              </Button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
              <Button variant="ghost" className="min-h-11 gap-1.5 sm:flex-none" onClick={() => setStep("choice")}>
                <ArrowLeft className="h-4 w-4" /> Tilbage
              </Button>
              <Button className="min-h-11 flex-1 sm:flex-none" onClick={close}>Færdig</Button>
            </div>
          )}
        </SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
}
