import { BatteryCharging, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { RouteRunMode } from "./RouteRunMode";
import { BrandedIllustration, type BrandedIllustrationName } from "@/components/shared/BrandedIllustration";
import { SheetHeaderBlock } from "@/components/route-planner/SheetSection";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (mode: RouteRunMode, remember: boolean) => void;
};

const options: Array<{
  mode: RouteRunMode;
  illustration: BrandedIllustrationName;
  title: string;
  body: string;
  note: string;
}> = [
  {
    mode: "list",
    illustration: "checklist",
    title: "Tjekliste",
    body: "Se stoppene i rækkefølge og tryk “Udført”, når du er færdig hvert sted.",
    note: "Bruger næsten ingen strøm — intet kort, ingen GPS.",
  },
  {
    mode: "guide",
    illustration: "drivingGuide",
    title: "Kørselsguide",
    body: "Kort med rutelinje, afstand til næste stop og talte drej undervejs.",
    note: "Bruger mere strøm — hold gerne telefonen i lader.",
  },
];

export const RouteModeDialog = ({ open, onOpenChange, onChoose }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="planner-overlay max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-md p-0 sm:max-w-[500px]">
        <DialogHeader className="border-b border-border bg-card px-4 py-4 text-left sm:px-5">
          <SheetHeaderBlock
            icon={<BrandedIllustration name="chooseRouteMode" className="h-8 w-8" />}
            title="Hvordan vil du køre ruten?"
            description="Vælg den visning, der passer til turen. Du kan altid skifte senere."
          />
        </DialogHeader>

        <div className="grid gap-2.5 p-3 sm:p-4">
          {options.map((o) => {
            return (
              <Button
                key={o.mode}
                type="button"
                variant="outline"
                onClick={() => onChoose(o.mode, false)}
                className={cn(
                  "group h-auto min-h-[118px] w-full items-center justify-start gap-4 rounded-md border-border bg-card p-4 text-left whitespace-normal shadow-sm transition-colors",
                  "hover:border-foreground/25 hover:bg-secondary/45 focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <span className="inline-flex h-16 w-16 shrink-0 items-center justify-center sm:h-[72px] sm:w-[72px]">
                  <BrandedIllustration name={o.illustration} className="h-full w-full" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 text-[15px] font-semibold text-foreground">
                    {o.title}<ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                  </span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">
                    {o.body}
                  </span>
                  <span className="mt-1.5 flex items-start gap-1.5 text-[11.5px] font-medium leading-4 text-muted-foreground">
                    <BatteryCharging className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{o.note}</span>
                  </span>
                </span>
              </Button>
            );
          })}
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default RouteModeDialog;
