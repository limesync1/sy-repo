import { useNavigate } from "react-router-dom";
import { ArrowRight, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState, useMemo } from "react";
import { useServices, useOrders } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import { useOnboardingProgress } from "@/hooks/useOnboarding";
import { useTour } from "./TourContext";
import { TOURS } from "./tours";
import { cn } from "@/lib/utils";

/**
 * NextStepRecommendation — vises lige under TrialBanner i toppen af panelet.
 *
 * Den finder ud af hvad det "smarteste næste skridt" er for virksomheden
 * baseret på hvor langt de er kommet:
 *   1. Indstillinger ikke udfyldt → udfyld virksomhedsoplysninger.
 *   2. Ingen services → opret den første service.
 *   3. Ingen bestillinger → opret den første aftale.
 *   4. Ingen medarbejdere (kun hvis ruteplanlægning er aktiveret) → tilføj medarbejder.
 *   5. Ingen ruter (hvis ruteplanlægning) → planlæg første rute.
 *   6. Ellers → skjul (alt er på plads).
 *
 * Brugeren kan altid lukke kortet — vi husker det i sessionStorage så det
 * ikke kommer tilbage i samme session, men vender tilbage næste gang hvis
 * trinnet stadig er relevant.
 */

type Props = {
  business: any;
};

type Recommendation = {
  id: string;
  title: string;
  body: string;
  cta: string;
  href: string;
  /** Tour-id der startes i stedet for navigation. */
  tourId?: string;
};

export const NextStepRecommendation = ({ business }: Props) => {
  const navigate = useNavigate();
  const tour = useTour();
  const { data: services } = useServices(business?.id);
  const { data: orders } = useOrders(business?.id);
  const { data: employees } = useEmployees(business?.id);
  const { data: progress } = useOnboardingProgress(business?.id);

  const dismissKey = `next-step-dismissed:${business?.id}`;
  const [dismissed, setDismissed] = useState(() => {
    try { return sessionStorage.getItem(dismissKey) === "1"; } catch { return false; }
  });

  const settingsComplete = !!(
    business?.description && business?.phone && business?.address
  );
  const hasServices = (services?.length || 0) > 0;
  const hasOrders = (orders?.length || 0) > 0;
  const hasEmployees = (employees?.length || 0) > 0;
  const routePlanningEnabled = !!(business?.settings as any)?.route_planning_enabled;

  const recommendation: Recommendation | null = useMemo(() => {
    if (!business) return null;

    if (!settingsComplete) {
      return {
        id: "settings",
        title: "Vi anbefaler: Udfyld jeres virksomhedsoplysninger først",
        body: "Beskrivelse, telefon og adresse skal være på plads, før kunder og leads kan finde jer rigtigt.",
        cta: "Åbn indstillinger",
        href: "/virksomhed?tab=settings",
        tourId: "company-info",
      };
    }
    if (!hasServices) {
      return {
        id: "services",
        title: "Vi anbefaler: Opret jeres første service nu",
        body: "Uden services kan kunder ikke booke noget hos jer. Det tager kun et par minutter — og I kan altid redigere bagefter.",
        cta: "Opret service",
        href: "/virksomhed?tab=services",
        tourId: "services",
      };
    }
    if (!hasOrders) {
      return {
        id: "orders",
        title: "Vi anbefaler: Opret jeres første aftale",
        body: "Læg en bestilling ind manuelt — fx en kunde der har ringet — så I kommer i gang med at planlægge dagligdagen.",
        cta: "Åbn aftaler",
        href: "/virksomhed?tab=orders",
      };
    }
    if (routePlanningEnabled && !hasEmployees) {
      return {
        id: "employees",
        title: "Vi anbefaler: Tilføj jeres medarbejdere",
        body: "Inviter teamet, så I kan tildele opgaver og bruge ruteplanlæggeren effektivt.",
        cta: "Tilføj medarbejder",
        href: "/virksomhed?tab=employees",
        tourId: "employees",
      };
    }
    if (routePlanningEnabled && hasOrders && hasEmployees) {
      // Tjek let: hvis "route-planning" allerede er markeret som færdig, skjul.
      if (progress?.completed_steps?.includes("route-planning")) return null;
      return {
        id: "route-planning",
        title: "Vi anbefaler: Planlæg jeres første rute",
        body: "Træk dagens aftaler ind i kalenderen og tildel dem til medarbejdere — så har I et fuldt overblik over dagen.",
        cta: "Åbn ruteplanlægger",
        href: "/virksomhed/ruter",
        tourId: "route-planning",
      };
    }
    return null;
  }, [business, settingsComplete, hasServices, hasOrders, hasEmployees, routePlanningEnabled, progress]);

  if (dismissed || !recommendation) return null;

  const handleDismiss = () => {
    try { sessionStorage.setItem(dismissKey, "1"); } catch {}
    setDismissed(true);
  };

  const handleCta = () => {
    if (recommendation.tourId && TOURS[recommendation.tourId]) {
      tour.start(TOURS[recommendation.tourId]);
    } else {
      navigate(recommendation.href);
    }
  };

  return (
    <div
      className={cn(
        "mb-4 flex items-start gap-3 rounded-xl border border-accent/20 bg-accent/5 px-4 py-3",
        "transition-all hover:border-accent/30",
      )}
    >
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-accent">
        <Sparkles className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">{recommendation.title}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{recommendation.body}</p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <Button size="sm" onClick={handleCta} className="h-8 gap-1 text-xs">
          {recommendation.cta} <ArrowRight className="h-3.5 w-3.5" />
        </Button>
        <button
          onClick={handleDismiss}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
          aria-label="Skjul anbefaling"
          title="Skjul"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

export default NextStepRecommendation;