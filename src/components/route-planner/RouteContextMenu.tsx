// Højreklik-menu til ruter/stop. Wrap en rute-pille eller stop-row med
// denne komponent for at få hurtig-handlinger uden at åbne edit-sheet.
import type { ReactNode } from "react";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Sparkles, Copy, ArrowRightLeft, Trash2, MapPin, Eye, History } from "lucide-react";

export type RouteAction = "optimize" | "duplicate" | "move" | "view" | "show-on-map" | "delete" | "history";

type Props = {
  children: ReactNode;
  onAction: (action: RouteAction) => void;
  /** Skjul fx Slet på fremtidige projicerede forekomster. */
  hide?: Partial<Record<RouteAction, boolean>>;
};

export default function RouteContextMenu({ children, onAction, hide }: Props) {
  // Defer alle actions én animation-frame så Radix' context-menu-luknings-
  // event ALDRIG når den nyåbnede dialog/sheet. Uden dette opfattes
  // menuens egen pointer-up som et "klik udenfor" og lukker fx
  // "Åbn rute"-sheet'en med det samme.
  const defer = (action: RouteAction) => (e: Event) => {
    e.preventDefault();
    requestAnimationFrame(() => onAction(action));
  };
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {!hide?.view && (
          <ContextMenuItem onSelect={defer("view")}>
            <Eye className="h-3.5 w-3.5 mr-2" /> Åbn rute
          </ContextMenuItem>
        )}
        {!hide?.optimize && (
          <ContextMenuItem onSelect={defer("optimize")}>
            <Sparkles className="h-3.5 w-3.5 mr-2" /> Optimér rækkefølge
          </ContextMenuItem>
        )}
        {!hide?.["show-on-map"] && (
          <ContextMenuItem onSelect={defer("show-on-map")}>
            <MapPin className="h-3.5 w-3.5 mr-2" /> Vis på kort
          </ContextMenuItem>
        )}
        {!hide?.history && (
          <ContextMenuItem onSelect={defer("history")}>
            <History className="h-3.5 w-3.5 mr-2" /> Vis historik
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        {!hide?.duplicate && (
          <ContextMenuItem onSelect={defer("duplicate")}>
            <Copy className="h-3.5 w-3.5 mr-2" /> Dupliker
          </ContextMenuItem>
        )}
        {!hide?.move && (
          <ContextMenuItem onSelect={defer("move")}>
            <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Flyt til dato…
          </ContextMenuItem>
        )}
        {!hide?.delete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={defer("delete")}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Slet rute…
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}