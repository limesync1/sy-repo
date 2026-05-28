// 3-trins tæthed-toggle for kalender/lister i ruteplanlæggeren.
// Et synligt segmenteret valg med tre knapper (Luftig/Standard/Tæt) så
// brugeren altid kan se hvilken tilstand der er aktiv. Valget gemmes i
// localStorage og påvirker både aftalekort og kalender-celler via
// data-density-attributten på planner-rod-elementet (se index.css).
import { Rows3, Rows2, AlignJustify } from "lucide-react";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePersistentState } from "@/hooks/usePersistentState";

export type Density = "comfortable" | "cozy" | "compact";
const ORDER: Density[] = ["comfortable", "cozy", "compact"];
const LABEL: Record<Density, string> = {
  comfortable: "Luftig",
  cozy: "Standard",
  compact: "Tæt",
};
const ICONS: Record<Density, typeof Rows3> = {
  comfortable: Rows3,
  cozy: Rows2,
  compact: AlignJustify,
};

export function useDensity() {
  return usePersistentState<Density>("route-planner:density", "cozy");
}

export default function DensityToggle() {
  const [d, setD] = useDensity();
  return (
    <div
      role="radiogroup"
      aria-label="Tæthed"
      className="inline-flex h-7 items-center gap-0.5 rounded-md border border-border bg-background p-0.5"
    >
      {ORDER.map((opt) => {
        const Icon = ICONS[opt];
        const active = d === opt;
        return (
          <Tooltip key={opt}>
            <TooltipTrigger asChild>
              <button
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setD(opt)}
                className={cn(
                  "inline-flex h-6 w-7 items-center justify-center rounded-[5px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                  active
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
                aria-label={`Tæthed: ${LABEL[opt]}`}
              >
                <Icon className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              {LABEL[opt]}
            </TooltipContent>
          </Tooltip>
        );
      })}
    </div>
  );
}