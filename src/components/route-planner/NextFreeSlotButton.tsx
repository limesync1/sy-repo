// "Næste ledige slot" — hopper kalenderen til første dag indenfor de
// kommende N dage hvor kapacitets-loaden er under tærsklen.
// Lille knap i toolbaren der lader planlæggeren springe forbi fyldte uger
// uden at klikke sig frem manuelt.
import { useCallback } from "react";
import { addDays, format, parseISO } from "date-fns";
import { CalendarSearch } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";

type Capacity = { load_pct: number };

type Props = {
  /** Aktuel dato — bruges som startpunkt. */
  fromDate: string;
  capacityByDate: Map<string, Capacity>;
  onGoTo: (date: string) => void;
  /** Tærskel i %; default 80 — alt over regnes som "fuld". */
  threshold?: number;
  /** Max antal dage at lede frem. */
  horizonDays?: number;
};

export default function NextFreeSlotButton({
  fromDate, capacityByDate, onGoTo, threshold = 80, horizonDays = 90,
}: Props) {
  const find = useCallback(() => {
    try {
      const start = parseISO(fromDate);
      for (let i = 1; i <= horizonDays; i++) {
        const d = format(addDays(start, i), "yyyy-MM-dd");
        const cap = capacityByDate.get(d);
        // Ingen kapacitets-info = ingen booket arbejde = ledigt.
        if (!cap || cap.load_pct < threshold) {
          onGoTo(d);
          toast.success(`Hopper til ${d}`, { description: cap ? `Belastning ${Math.round(cap.load_pct)}%` : "Ingen booket arbejde" });
          return;
        }
      }
      toast.message("Ingen ledige slots fundet", {
        description: `Alle ${horizonDays} dage er over ${threshold}% belastet.`,
      });
    } catch (e: any) {
      toast.error("Kunne ikke finde slot", { description: e?.message });
    }
  }, [fromDate, capacityByDate, threshold, horizonDays, onGoTo]);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={find}>
          <CalendarSearch className="h-3.5 w-3.5 mr-1" /> Næste ledige
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        Spring til første dag med under {threshold}% belastning
      </TooltipContent>
    </Tooltip>
  );
}