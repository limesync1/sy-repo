import { BatteryCharging, ArrowRight, CheckCircle2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
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
    body: "Kort med rutelinje, afstand til næste stop og stille vejvisning.",
    note: "Bruger mere strøm — hold gerne telefonen i lader.",
  },
];

export const RouteModeDialog = ({ open, onOpenChange, onChoose }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="planner-overlay flex w-[calc(100vw-1rem)] max-w-[500px] flex-col gap-0 overflow-hidden rounded-md p-0 sm:w-full">
        <DialogHeader className="planner-overlay-header shrink-0 border-b border-border px-4 py-4 pr-12 text-left sm:px-5 sm:py-5 sm:pr-12">
          <SheetHeaderBlock
            icon={<BrandedIllustration name="chooseRouteMode" className="h-10 w-10" alt="" />}
            iconClassName="h-14 w-14 sm:h-16 sm:w-16"
            title={<DialogTitle className="text-left text-lg font-semibold leading-tight text-foreground">Hvordan vil du køre ruten?</DialogTitle>}
            description={<DialogDescription className="mt-1 text-left text-[13px] leading-5 text-muted-foreground">Vælg den visning, der passer til turen. Du kan altid skifte senere.</DialogDescription>}
          />
        </DialogHeader>

        <div className="planner-overlay-body grid min-h-0 flex-1 gap-2.5 overflow-y-auto p-3 sm:p-4 bg-secondary/20">
          {options.map((o) => {
            return (
              <Button
                key={o.mode}
                type="button"
                variant="outline"
                onClick={() => onChoose(o.mode, false)}
                 className={cn(
                   "group h-auto min-h-[112px] w-full min-w-0 items-center justify-start gap-3 rounded-md border-border bg-card p-3 text-left whitespace-normal shadow-none transition-colors sm:gap-4 sm:p-4",
                   "hover:border-accent/45 hover:bg-secondary/35 focus-visible:ring-2 focus-visible:ring-ring",
                 )}
              >
                <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center sm:h-[72px] sm:w-[72px]">
                  <BrandedIllustration name={o.illustration} className="h-full w-full" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center justify-between gap-2 text-[15px] font-semibold text-foreground">
                    <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-accent" />{o.title}</span>
                    <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
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
