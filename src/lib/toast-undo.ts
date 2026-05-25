// toastSuccessWithUndo — sonner-toast med inline "Fortryd"-knap, der
// både popper handlingen fra route-history og afspiller dens undo().
//
// Bruges efter alle rute-flytninger (basis + projiceret + merge), så
// brugeren har 10 sekunder til at fortryde direkte fra toast'en — uden
// at skulle finde Cmd+Z eller en separat fortryd-knap.

import { toast } from "sonner";
import { routeHistory } from "@/lib/route-history";

type Opts = {
  /** Hovedbesked, fx "Rute flyttet til torsdag 28. maj". */
  message: string;
  /** Sekundær beskrivelse vist under titlen. */
  description?: string;
  /** Knap-label. Default "Fortryd". */
  undoLabel?: string;
  /** Hvor længe toast'en lever (ms). Default 8000. */
  duration?: number;
};

export function toastSuccessWithUndo({ message, description, undoLabel = "Fortryd", duration = 8000 }: Opts): void {
  toast.success(message, {
    description,
    duration,
    action: {
      label: undoLabel,
      onClick: async () => {
        try {
          const ran = await routeHistory.undoLast();
          if (ran) {
            toast.success(`Fortrudt: ${ran.label}`);
          } else {
            toast.message("Intet at fortryde");
          }
        } catch (e: any) {
          toast.error("Kunne ikke fortryde", {
            description: e?.message ?? "Handlingen er muligvis allerede ændret af en anden.",
          });
        }
      },
    },
  });
}