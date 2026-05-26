// Højreklik-menu til ruter/stop. Wrap en rute-pille eller stop-row med
// denne komponent for at få hurtig-handlinger uden at åbne edit-sheet.
import type { ReactNode } from "react";
import {
  ContextMenu, ContextMenuTrigger, ContextMenuContent, ContextMenuItem, ContextMenuSeparator,
} from "@/components/ui/context-menu";
import { Sparkles, Copy, ArrowRightLeft, Trash2, MapPin, Eye } from "lucide-react";

export type RouteAction = "optimize" | "duplicate" | "move" | "view" | "show-on-map" | "delete";

type Props = {
  children: ReactNode;
  onAction: (action: RouteAction) => void;
  /** Skjul fx Slet på fremtidige projicerede forekomster. */
  hide?: Partial<Record<RouteAction, boolean>>;
};

export default function RouteContextMenu({ children, onAction, hide }: Props) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <ContextMenuContent className="w-52">
        {!hide?.view && (
          <ContextMenuItem onSelect={() => onAction("view")}>
            <Eye className="h-3.5 w-3.5 mr-2" /> Åbn rute
          </ContextMenuItem>
        )}
        {!hide?.optimize && (
          <ContextMenuItem onSelect={() => onAction("optimize")}>
            <Sparkles className="h-3.5 w-3.5 mr-2" /> Optimér rækkefølge
          </ContextMenuItem>
        )}
        {!hide?.["show-on-map"] && (
          <ContextMenuItem onSelect={() => onAction("show-on-map")}>
            <MapPin className="h-3.5 w-3.5 mr-2" /> Vis på kort
          </ContextMenuItem>
        )}
        <ContextMenuSeparator />
        {!hide?.duplicate && (
          <ContextMenuItem onSelect={() => onAction("duplicate")}>
            <Copy className="h-3.5 w-3.5 mr-2" /> Dupliker
          </ContextMenuItem>
        )}
        {!hide?.move && (
          <ContextMenuItem onSelect={() => onAction("move")}>
            <ArrowRightLeft className="h-3.5 w-3.5 mr-2" /> Flyt til dato…
          </ContextMenuItem>
        )}
        {!hide?.delete && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive focus:text-destructive" onSelect={() => onAction("delete")}>
              <Trash2 className="h-3.5 w-3.5 mr-2" /> Slet rute…
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  );
}