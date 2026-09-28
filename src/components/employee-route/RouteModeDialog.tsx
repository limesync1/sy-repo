import { ListChecks, Navigation2, BatteryCharging, ArrowRight, Sparkles } from "lucide-react";
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

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChoose: (mode: RouteRunMode, remember: boolean) => void;
};

const options: Array<{
  mode: RouteRunMode;
  icon: typeof ListChecks;
  title: string;
  body: string;
  note: string;
}> = [
  {
    mode: "list",
    icon: ListChecks,
    title: "Tjekliste",
    body: "Se stoppene i rækkefølge og tryk “Udført”, når du er færdig hvert sted.",
    note: "Bruger næsten ingen strøm — intet kort, ingen GPS.",
  },
  {
    mode: "guide",
    icon: Navigation2,
    title: "Kørselsguide",
    body: "Kort med rutelinje, afstand til næste stop og talte drej undervejs.",
    note: "Bruger mere strøm — hold gerne telefonen i lader.",
  },
];

export const RouteModeDialog = ({ open, onOpenChange, onChoose }: Props) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="planner-overlay max-h-[calc(100dvh-1rem)] max-w-[calc(100vw-1rem)] overflow-y-auto rounded-md p-0 sm:max-w-[500px]">
        <DialogHeader className="border-b border-border bg-secondary/30 px-4 py-4 text-left sm:px-5">
          <div className="mb-1 flex h-9 w-9 items-center justify-center rounded-md border border-border bg-card text-foreground shadow-sm">
            <Sparkles className="h-4 w-4" />
          </div>
          <DialogTitle className="text-xl font-semibold leading-tight">
            Hvordan vil du køre ruten?
          </DialogTitle>
          <DialogDescription className="text-[13px] leading-5">
            Vælg den visning, der passer til turen. Du kan altid skifte senere.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2.5 p-3 sm:p-4">
          {options.map((o) => {
            const Icon = o.icon;
            return (
              <Button
                key={o.mode}
                type="button"
                variant="outline"
                onClick={() => onChoose(o.mode, false)}
                className={cn(
                  "group h-auto min-h-[104px] w-full items-start justify-start gap-3 rounded-md border-border bg-card p-3.5 text-left whitespace-normal shadow-none transition-colors",
                  "hover:border-foreground/25 hover:bg-secondary/45 focus-visible:ring-2 focus-visible:ring-ring",
                )}
              >
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-foreground text-background">
                  <Icon className="h-5 w-5" />
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
