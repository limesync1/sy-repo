import { Loader2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import PlannerDialogHeader from "./PlannerDialogHeader";
import { SheetFooterBar } from "./SheetSection";

export type RouteOptimizationView = { name: string; busy: boolean; message?: string; error?: boolean };

export default function RouteOptimizerDialog({ result, onClose }: { result: RouteOptimizationView | null; onClose: () => void }) {
  return (
    <Dialog open={result !== null} onOpenChange={(open) => { if (!open && !result?.busy) onClose(); }}>
      <DialogContent className="appointment-details-overlay planner-overlay flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-xl sm:max-w-xl flex-col gap-0 overflow-hidden rounded-md p-0 pb-0 sm:p-0">
        <PlannerDialogHeader icon="optimizeRoute" title="Optimér rute" description={result?.name} />
        <div className="planner-overlay-body min-h-0 overflow-y-auto bg-secondary/20 p-4 sm:p-5">
          <p role={result?.error ? "alert" : "status"} className={result?.error ? "text-sm text-destructive" : "flex items-center gap-2 text-sm text-foreground"}>
            {result?.busy && <Loader2 className="h-4 w-4 shrink-0 animate-spin" />}
            {result?.busy ? "Finder den hurtigste rækkefølge…" : result?.message}
          </p>
        </div>
        <SheetFooterBar className="flex justify-end"><Button variant="outline" className="h-11" disabled={result?.busy} onClick={onClose}>Luk</Button></SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
}