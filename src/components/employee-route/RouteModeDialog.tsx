import { useState } from "react";
import { ListChecks, Navigation2, BatteryCharging } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
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
  const [remember, setRemember] = useState(true);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[calc(100vw-1.5rem)] rounded-2xl p-5 sm:max-w-[440px] sm:p-6">
        <DialogHeader className="text-left">
          <DialogTitle className="text-[19px] font-bold leading-tight">
            Hvordan vil du køre ruten?
          </DialogTitle>
          <DialogDescription className="text-[13.5px] leading-6">
            Du kan skifte undervejs — valget ændrer ikke noget i planen.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-1 grid gap-2.5">
          {options.map((o) => {
            const Icon = o.icon;
            return (
              <button
                key={o.mode}
                type="button"
                onClick={() => onChoose(o.mode, remember)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all",
                  "min-h-[76px] active:scale-[0.99] hover:border-foreground/30 hover:shadow-sm",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30",
                )}
              >
                <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary text-foreground">
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[15px] font-semibold text-foreground">{o.title}</span>
                  <span className="mt-0.5 block text-[13px] leading-5 text-muted-foreground">
                    {o.body}
                  </span>
                  <span className="mt-1.5 flex items-center gap-1 text-[11.5px] font-medium text-muted-foreground">
                    <BatteryCharging className="h-3.5 w-3.5 shrink-0" />
                    {o.note}
                  </span>
                </span>
              </button>
            );
          })}
        </div>

        <label className="mt-1 flex cursor-pointer items-center gap-2.5 rounded-lg border border-border bg-secondary/40 px-3 py-2.5">
          <Checkbox
            checked={remember}
            onCheckedChange={(v) => setRemember(v === true)}
            aria-label="Husk mit valg"
          />
          <span className="text-[13px] text-foreground">Husk mit valg til næste rute</span>
        </label>
      </DialogContent>
    </Dialog>
  );
};

export default RouteModeDialog;
