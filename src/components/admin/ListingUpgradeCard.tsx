import { ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { usePlatformPricing, useSetPlanKind } from "@/hooks/useBusinessPlan";
import { TRIAL_DAYS } from "@/lib/trial";
import routeIcon from "@/assets/content-icons/ruteplanlaegger.svg.asset.json";

/** Vises øverst i panelet for "Kun profil"-virksomheder. Én knap opgraderer uden ny oprettelse. */
export default function ListingUpgradeCard({ businessId }: { businessId: string }) {
  const { data: pricing } = usePlatformPricing();
  const setKind = useSetPlanKind();
  const days = pricing?.trial_days ?? TRIAL_DAYS;

  const upgrade = () =>
    setKind.mutate(
      { businessId, kind: "full" },
      {
        onSuccess: () => toast.success(`Det fulde system er slået til. Du har ${days} dages gratis prøve.`),
        onError: (e) => toast.error(e instanceof Error ? e.message : "Vi kunne ikke opgradere lige nu. Prøv igen."),
      },
    );

  return (
    <div className="mb-4 flex flex-col gap-4 rounded-xl border border-border bg-card p-4 sm:flex-row sm:items-center sm:p-5">
      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-border/60 bg-background p-1.5">
        <img src={routeIcon.url} alt="" className="h-full w-full object-contain" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-base font-semibold text-foreground">Du har en gratis profil på Serviceydere</p>
        <p className="mt-0.5 text-sm leading-6 text-muted-foreground">
          Vil du også planlægge ruter, styre medarbejdere og fakturere? Prøv det fulde system gratis i {days} dage. Din profil og dine services bevares.
        </p>
      </div>
      <Button onClick={upgrade} disabled={setKind.isPending} className="min-h-11 shrink-0 gap-2">
        {setKind.isPending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : null}
        Prøv det fulde system
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
}
