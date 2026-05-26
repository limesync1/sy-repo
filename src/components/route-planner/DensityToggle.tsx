// 3-trins tæthed-toggle for kalender/lister i ruteplanlæggeren.
// Cyklus: comfortable → cozy → compact → comfortable …
// Persisteres i localStorage så valget overlever reload.
import { Rows3, Rows2, AlignJustify } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { usePersistentState } from "@/hooks/usePersistentState";

export type Density = "comfortable" | "cozy" | "compact";
const ORDER: Density[] = ["comfortable", "cozy", "compact"];
const LABEL: Record<Density, string> = {
  comfortable: "Luftig",
  cozy: "Standard",
  compact: "Tæt",
};

export function useDensity() {
  return usePersistentState<Density>("route-planner:density", "cozy");
}

export default function DensityToggle() {
  const [d, setD] = useDensity();
  const next = () => setD(ORDER[(ORDER.indexOf(d) + 1) % ORDER.length]);
  const Icon = d === "compact" ? AlignJustify : d === "cozy" ? Rows2 : Rows3;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={next} aria-label={`Tæthed: ${LABEL[d]}`}>
          <Icon className="h-3.5 w-3.5" />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">Tæthed: <span className="font-medium">{LABEL[d]}</span> — klik for at skifte</TooltipContent>
    </Tooltip>
  );
}