/**
 * Anbefalede service-varigheder baseret på faktiske udførelser (#8).
 *
 * Viser en kompakt liste over services hvor faktisk gennemsnitstid afviger
 * markant fra estimatet — fx "Hovedrengøring: estimat ~60 min, faktisk
 * gennemsnit 78 min (12 udførelser)". Brugeren kan så selv vælge at justere
 * tids-estimaterne på fremtidige stops; vi ændrer aldrig data automatisk.
 */
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles, TrendingUp, TrendingDown, Minus } from "lucide-react";
import { useLearnedServiceDurations } from "@/hooks/useRoutePlannerSmarts";

export const LearnedDurationsCard = ({ businessId }: { businessId: string }) => {
  const { data: rows = [], isLoading } = useLearnedServiceDurations(businessId);

  if (isLoading || rows.length === 0) return null;

  return (
    <Card className="surface-admin rounded-xl border-border/80 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-sm font-semibold">
          <Sparkles className="h-4 w-4 text-accent" />
          Læring fra udførelser
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          Anbefalede varigheder baseret på de seneste 60 dages faktiske udførelser.
          Brug dem til at justere tidsestimaterne på nye stops — vi ændrer aldrig data automatisk.
        </p>
      </CardHeader>
      <CardContent className="space-y-2">
        {rows.map((r) => {
          const trend =
            r.suggested_minutes > r.min_actual_minutes
              ? "up"
              : r.suggested_minutes < r.max_actual_minutes
              ? "down"
              : "flat";
          return (
            <div
              key={r.service_id}
              className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-secondary/20 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{r.service_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  Faktisk: {r.min_actual_minutes}–{r.max_actual_minutes} min · gns. {Math.round(Number(r.avg_actual_minutes))} min · {r.samples} udførelser
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge variant="outline" className="gap-1 tabular-nums">
                  {trend === "up" ? (
                    <TrendingUp className="h-3 w-3 text-amber-500" />
                  ) : trend === "down" ? (
                    <TrendingDown className="h-3 w-3 text-emerald-500" />
                  ) : (
                    <Minus className="h-3 w-3" />
                  )}
                  Anbefalet: {r.suggested_minutes} min
                </Badge>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};