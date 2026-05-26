// Flydende undo/redo-bar i bunden af ruteplanlæggeren.
// Dukker op de første 8 sek efter en undo-bar handling og bliver liggende
// mens stakken har noget at fortryde — så brugeren altid kan se "Fortryd"
// uden at gå op i toolbaren.
import { useEffect, useState } from "react";
import { Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouteHistory } from "@/hooks/useRouteHistory";
import { cn } from "@/lib/utils";

export default function UndoBar() {
  const h = useRouteHistory();
  const [hidden, setHidden] = useState(false);

  // Vis automatisk når noget nyt kan fortrydes; nulstil dismiss-state.
  useEffect(() => { if (h.canUndo) setHidden(false); }, [h.lastLabel]);

  if (hidden || (!h.canUndo && !h.canRedo)) return null;

  return (
    <div
      className={cn(
        "pointer-events-auto fixed bottom-4 left-1/2 z-50 -translate-x-1/2",
        "flex items-center gap-2 rounded-full border border-border bg-background/95",
        "px-3 py-1.5 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-background/80",
      )}
      role="status"
    >
      <span className="text-xs text-muted-foreground truncate max-w-[40ch]">
        {h.canUndo ? <>Sidste: <span className="font-medium text-foreground">{h.lastLabel}</span></> : "Intet at fortryde"}
      </span>
      <Button
        size="sm" variant="ghost" className="h-7 px-2 text-xs"
        onClick={() => void h.undo()} disabled={!h.canUndo || h.isUndoing}
      >
        <Undo2 className="h-3.5 w-3.5 mr-1" /> Fortryd
      </Button>
      <Button
        size="sm" variant="ghost" className="h-7 px-2 text-xs"
        onClick={() => void h.redo()} disabled={!h.canRedo || h.isUndoing}
      >
        <Redo2 className="h-3.5 w-3.5 mr-1" /> Gentag
      </Button>
      <button
        type="button"
        onClick={() => setHidden(true)}
        className="ml-1 text-muted-foreground hover:text-foreground text-[11px] px-1"
        aria-label="Skjul"
        title="Skjul"
      >×</button>
    </div>
  );
}