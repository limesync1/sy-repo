import { useState } from "react";
import { Layers, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { SectionCard } from "@/components/admin/shared/AdminUI";
import { usePlatformPricing, useSetPlanKind } from "@/hooks/useBusinessPlan";
import { planKindOf } from "@/lib/business-capabilities";
import { TRIAL_DAYS } from "@/lib/trial";

/** Viser plantypen og lader ejeren skifte. Serveren afviser usikre nedgraderinger med en dansk forklaring. */
export default function PlanKindSection({ business }: { business: { id: string; settings?: unknown } }) {
  const kind = planKindOf(business);
  const setKind = useSetPlanKind();
  const { data: pricing } = usePlatformPricing();
  const days = pricing?.trial_days ?? TRIAL_DAYS;
  const [confirmOpen, setConfirmOpen] = useState(false);

  const change = (next: "listing" | "full") =>
    setKind.mutate(
      { businessId: business.id, kind: next },
      {
        onSuccess: () => {
          setConfirmOpen(false);
          toast.success(next === "full" ? `Det fulde system er slået til. Du har ${days} dages gratis prøve.` : "Du har nu kun en profil på Serviceydere.");
        },
        onError: (e) => {
          setConfirmOpen(false);
          toast.error(e instanceof Error ? e.message : "Vi kunne ikke skifte lige nu. Prøv igen.");
        },
      },
    );

  return (
    <div id="settings-plan-kind" className="scroll-mt-[120px] lg:scroll-mt-[68px]">
      <SectionCard
        title="Abonnementstype"
        icon={<Layers />}
        description="Vælg om I kun vil have en gratis profil på Serviceydere, eller hele systemet med ruteplanlægger, medarbejdere, aftaler og fakturering."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`rounded-xl border p-4 ${kind === "listing" ? "border-foreground" : "border-border"}`}>
            <p className="font-semibold text-foreground">Kun profil – gratis</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Profil, services og priser på Serviceydere. Modtag forespørgsler og anmeldelser.</p>
            {kind === "listing" && <p className="mt-2 text-sm font-semibold text-foreground">Det har I nu</p>}
          </div>
          <div className={`rounded-xl border p-4 ${kind === "full" ? "border-foreground" : "border-border"}`}>
            <p className="font-semibold text-foreground">Fuldt system</p>
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Alt i profilen plus ruteplanlægger, medarbejder-app, kunder, aftaler og fakturering. {days} dage gratis.</p>
            {kind === "full" && <p className="mt-2 text-sm font-semibold text-foreground">Det har I nu</p>}
          </div>
        </div>
        <div className="mt-4">
          {kind === "listing" ? (
            <Button onClick={() => change("full")} disabled={setKind.isPending} className="min-h-11 gap-2">
              {setKind.isPending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Prøv det fulde system gratis
            </Button>
          ) : (
            <Button variant="outline" onClick={() => setConfirmOpen(true)} disabled={setKind.isPending} className="min-h-11">
              Skift til Kun profil
            </Button>
          )}
        </div>
      </SectionCard>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Skift til Kun profil?</AlertDialogTitle>
            <AlertDialogDescription>
              Ruteplanlægger, medarbejdere, kunder, aftaler og regnskab skjules. Intet slettes, og I kan altid skifte tilbage. Har I planlagte ruter, aktive aftaler eller et betalt abonnement, skal de afsluttes først.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Annullér</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" onClick={(e) => { e.preventDefault(); change("listing"); }}>
              {setKind.isPending ? "Skifter…" : "Skift til Kun profil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
