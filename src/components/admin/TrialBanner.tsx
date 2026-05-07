// TrialBanner — vises i toppen af virksomhedspanelet og fortæller, hvor mange
// dage der er tilbage af gratis prøveperiode. Når der er ≤3 dage tilbage uden
// betalingskort skifter banneret til en advarsel, der minder brugeren om at
// tilføje kort i Indstillinger inden virksomheden deaktiveres.
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { AlertTriangle, Clock, CreditCard, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { BusinessPlanInfo } from "@/hooks/useBusinessPlan";

type Props = {
  plan: BusinessPlanInfo | null | undefined;
  /** Skjul knappen hvis brugeren allerede er på Indstillinger-fanen. */
  hideAction?: boolean;
};

const TrialBanner = ({ plan, hideAction }: Props) => {
  // Tikker hvert minut, så "X timer Y min tilbage" forbliver præcis.
  const [, setTick] = useState(0);
  useEffect(() => {
    const i = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(i);
  }, []);
  if (!plan) return null;
  if (plan.status === "active" || plan.status === "unknown") return null;

  const daysLeft = plan.days_left;
  const isLastDay = daysLeft !== null && daysLeft <= 1;
  const isWarning = plan.status === "trial_ending" || plan.status === "expired" || isLastDay;

  // Beregn præcis tilbageværende tid hvis vi er under én dag.
  const msLeft = plan.trial_ends_at
    ? new Date(plan.trial_ends_at).getTime() - Date.now()
    : null;
  const useFineGrained = msLeft !== null && msLeft > 0 && msLeft < 24 * 60 * 60 * 1000;
  let fineLabel = "";
  if (useFineGrained) {
    const totalMinutes = Math.max(1, Math.floor(msLeft! / 60_000));
    const h = Math.floor(totalMinutes / 60);
    const m = totalMinutes % 60;
    if (h > 0 && m > 0) fineLabel = `${h} ${h === 1 ? "time" : "timer"} og ${m} min tilbage af din prøveperiode`;
    else if (h > 0) fineLabel = `${h} ${h === 1 ? "time" : "timer"} tilbage af din prøveperiode`;
    else fineLabel = `${m} ${m === 1 ? "minut" : "minutter"} tilbage af din prøveperiode`;
  }

  const title = plan.status === "expired"
    ? "Din prøveperiode er udløbet"
    : useFineGrained
      ? fineLabel
      : daysLeft === null
        ? "Din prøveperiode er aktiv"
      : daysLeft <= 1
        ? "Sidste dag af din prøveperiode"
        : `${daysLeft} dage tilbage af din prøveperiode`;

  const description = plan.status === "expired"
    ? "Tilføj et betalingskort i indstillingerne for at genaktivere din virksomhed på Serviceydere."
    : useFineGrained
      ? "Tilføj et betalingskort nu, så din virksomhed ikke bliver deaktiveret når prøveperioden udløber."
      : isLastDay
        ? "Tilføj et betalingskort i dag, så din virksomhed ikke bliver deaktiveret når prøveperioden udløber."
      : isWarning
        ? "Husk at tilføje et betalingskort inden 3 dage — ellers bliver din virksomhed deaktiveret fra Serviceydere."
        : "Du har gratis adgang til alle funktioner. Tilføj et betalingskort i indstillingerne, før prøven udløber.";

  return (
    <div
      className={cn(
        "flex flex-col gap-3 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:gap-4",
        isWarning
          ? "border-destructive/30 bg-destructive/5 text-foreground"
          : "border-accent/30 bg-accent/5 text-foreground",
      )}
    >
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div
          className={cn(
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
            isWarning ? "bg-destructive/15 text-destructive" : "bg-accent/15 text-accent",
          )}
        >
          {isWarning ? <AlertTriangle className="h-5 w-5" /> : <Clock className="h-5 w-5" />}
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        </div>
      </div>
      {!hideAction && (
        <Link
          to="/virksomhed?tab=settings&openCheckout=1#settings-billing"
          className={cn(
            "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors",
            isWarning
              ? "bg-destructive text-destructive-foreground hover:bg-destructive/90"
              : "bg-foreground text-background hover:bg-foreground/90",
          )}
        >
          <CreditCard className="h-3.5 w-3.5" />
          Tilføj betalingskort
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      )}
    </div>
  );
};

export default TrialBanner;