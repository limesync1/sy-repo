import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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

  const { data: blockers, isLoading: checking } = useQuery({
    queryKey: ["downgrade-blockers", business.id],
    enabled: confirmOpen,
    staleTime: 0,
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const [routes, agreements, plan] = await Promise.all([
        supabase.from("routes").select("id", { count: "exact", head: true })
          .eq("business_id", business.id).gte("route_date", today).not("status", "in", "(archived,completed)"),
        supabase.from("agreements").select("id", { count: "exact", head: true })
          .eq("business_id", business.id).in("status", ["active", "paused", "pending_approval"]),
        supabase.from("business_plans").select("stripe_subscription_id, status").eq("business_id", business.id).maybeSingle(),
      ]);
      const p = plan.data as { stripe_subscription_id: string | null; status: string } | null;
      return [
        { key: "routes", label: "Ingen planlagte ruter", count: routes.count ?? 0, href: "/virksomhed?tab=routes" },
        { key: "agreements", label: "Ingen aktive aftaler", count: agreements.count ?? 0, href: "/virksomhed?tab=orders" },
        { key: "sub", label: "Intet betalt abonnement", count: p?.stripe_subscription_id && ["active", "trialing", "past_due"].includes(p.status) ? 1 : 0, href: "/virksomhed?tab=settings#settings-billing" },
      ];
    },
  });
  const blocked = (blockers ?? []).some((b) => b.count > 0);

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
            <p className="mt-1 text-sm leading-6 text-muted-foreground">Offentlig profil med jeres services, priser og anmeldelser — bliv fundet på Google, og modtag forespørgsler fra kunder.</p>
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
              Ruteplanlægger, medarbejdere, kunder, aftaler og regnskab skjules. Intet slettes, og I kan altid skifte tilbage. Tjeklisten herunder skal være grøn, før I kan skifte.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <ul className="space-y-2" aria-live="polite">
            {checking && <li className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" aria-hidden />Tjekker…</li>}
            {blockers?.map((b) => (
              <li key={b.key} className="flex min-h-11 items-center gap-2.5 rounded-md border border-border px-3 text-sm">
                {b.count > 0
                  ? <XCircle className="h-4 w-4 shrink-0 text-destructive" aria-hidden />
                  : <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden />}
                <span className="flex-1 text-foreground">
                  {b.count > 0 ? (b.key === "sub" ? "Betalt abonnement skal opsiges" : `${b.count} ${b.key === "routes" ? "planlagte ruter" : "aktive aftaler"} skal afsluttes`) : b.label}
                </span>
                {b.count > 0 && <a href={b.href} className="font-medium text-foreground underline underline-offset-2">Gå dertil</a>}
              </li>
            ))}
          </ul>
          <AlertDialogFooter>
            <AlertDialogCancel className="min-h-11">Annullér</AlertDialogCancel>
            <AlertDialogAction className="min-h-11" disabled={checking || blocked || setKind.isPending} onClick={(e) => { e.preventDefault(); change("listing"); }}>
              {setKind.isPending ? "Skifter…" : "Skift til Kun profil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
