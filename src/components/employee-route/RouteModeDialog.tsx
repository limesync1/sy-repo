import { ListChecks, Navigation2, BatteryCharging } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
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
      <DialogContent className="planner-overlay max-w-[calc(100vw-1rem)] rounded-[6px] p-4 sm:max-w-[440px] sm:p-5">
        <DialogHeader className="text-left">
          <DialogTitle className="text-lg font-semibold leading-tight">
            Hvordan vil du køre ruten?
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-6">
            Du kan skifte undervejs — valget ændrer ikke noget i planen.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 grid gap-2">
          {options.map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.mode}
                type="button"
                onClick={() => onChoose(o.mode, false)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-[5px] border border-border bg-card p-3 text-left transition-all",
                  "min-h-[70px] active:scale-[0.99] hover:border-accent/40 hover:bg-secondary/40 hover:shadow-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                )}
              >
                <span className="mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] bg-secondary text-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-foreground">{o.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">
                    {o.body}
                  </span>
                  <span className="mt-1.5 flex items-start gap-1.5 text-[11.5px] font-medium leading-4 text-muted-foreground">
                    <BatteryCharging className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    <span>{o.note}</span>
                  </span>
                </span>
              </button>
            );
          })}
        </div>

      </DialogContent>
    </Dialog>
  );
};

export default RouteModeDialog;
