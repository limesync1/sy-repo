// Delt interval-badge — bruges i alle aftalekort på Ruter-siden
// ("Aftaler uden rute" + "Stops på ruten") så styling, ikoner og copy
// altid er identiske. Returnerer null hvis intervallet er ukendt — vi
// viser hellere intet end en generisk "Aftale"-label.

import { Badge } from "@/components/ui/badge";
import { Repeat, Hourglass } from "lucide-react";
import { formatInterval, parseInterval } from "@/lib/interval";

type Size = "xs" | "sm";

export const IntervalBadge = ({
  interval, size = "xs", className = "",
}: {
  interval: string | null | undefined;
  size?: Size;
  className?: string;
}) => {
  const parsed = parseInterval(interval);
  if (!parsed) return null;
  const isRecurring = !parsed.once;
  const Icon = isRecurring ? Repeat : Hourglass;
  const dims = size === "xs"
    ? "h-4 text-[10px] px-1.5 gap-0.5"
    : "h-5 text-[11px] px-2 gap-1";
  const iconSize = size === "xs" ? "h-2.5 w-2.5" : "h-3 w-3";
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
      {formatInterval(interval)}
    </Badge>
  );
};
