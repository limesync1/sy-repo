// Delt interval-badge — bruges i alle aftalekort på Ruter-siden
// ("Aftaler uden rute" + "Stops på ruten") så styling, ikoner og copy
// altid er identiske.
//
// Når intervallet mangler eller ikke kan parses viser vi en neutral
// "Engangsaftale"-badge i stedet for at skjule feltet helt. Det giver et
// meningsfuldt empty-state på kortet — så ejeren aldrig ser et kort uden
// nogen kontekst om hvor ofte aftalen gentages.

import { Badge } from "@/components/ui/badge";
import { Repeat, Hourglass } from "lucide-react";
import { formatInterval, parseInterval } from "@/lib/interval";

type Size = "xs" | "sm";

export const IntervalBadge = ({
  interval, size = "xs", className = "", fallback = true,
}: {
  interval: string | null | undefined;
  size?: Size;
  className?: string;
  /**
   * Når true (default) vises "Engangsaftale" hvis intervallet mangler.
   * Sæt false hvis kortet allerede har en anden kilde til samme info
   * (fx en schedule-banner) for at undgå dobbelt-visning.
   */
  fallback?: boolean;
}) => {
  const parsed = parseInterval(interval);
  if (!parsed && !fallback) return null;
  const isRecurring = !!parsed && !parsed.once;
  const Icon = isRecurring ? Repeat : Hourglass;
  const dims = size === "xs"
    ? "h-4 text-[10px] px-1.5 gap-0.5"
    : "h-5 text-[11px] px-2 gap-1";
  const iconSize = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";
  const label = parsed ? formatInterval(interval) : "Engangsaftale";
  return (
    <Badge
      variant="outline"
      className={`${dims} ${
        isRecurring
          ? "border-primary/40 text-primary bg-primary/5"
          : "border-border text-muted-foreground bg-secondary/40"
      } ${className}`}
    >
      <Icon className={iconSize} />
      {label}
    </Badge>
  );
};
