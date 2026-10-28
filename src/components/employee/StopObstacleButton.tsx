// "Kunne ikke udføres": hurtige årsager sendes til kontoret, og besøget tages
// af ruten og lander i "Aftaler uden rute" til omplanlægning. Seriens faste rute bevares.
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Ban, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useIsBelowBreakpoint } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toDanishError } from "@/lib/danish-errors";

const REASONS = ["Låst låge", "Ingen adgang", "Kunden ikke hjemme", "Håndværkere på adressen", "Dårligt vejr", "Hund løs i haven"];

export function StopObstacleButton({ stopId, onReported }: { stopId: string; onReported?: () => void }) {
  const qc = useQueryClient();
  const isCompact = useIsBelowBreakpoint(1024);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [detail, setDetail] = useState("");

  const report = useMutation({
    mutationFn: async () => {
      if (navigator.onLine === false) throw new Error("Ingen internetforbindelse. Prøv igen, når du har dækning.");
      const { error } = await supabase.rpc("report_stop_obstacle", { _stop_id: stopId, _reason: reason, _detail: detail || null });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Kontoret har fået besked", { description: "Aftalen er markeret til omplanlægning." });
      setOpen(false); setReason(""); setDetail("");
      qc.invalidateQueries({ queryKey: ["employee-stop-notes", stopId] });
      onReported?.();
    },
    onError: (e) => toast.error("Beskeden blev ikke sendt", { description: toDanishError(e, "Prøv igen om lidt.") }),
  });

  return (
    <>
      <Button variant="outline" className="h-11 w-full gap-2 border-warning/50 text-warning-foreground" onClick={() => setOpen(true)}>
        <Ban className="h-4 w-4" /> Kunne ikke udføres
      </Button>
      <Sheet open={open} onOpenChange={(o) => !report.isPending && setOpen(o)}>
        <SheetContent side={isCompact ? "bottom" : "right"} className={cn("flex flex-col gap-0 p-0", isCompact ? "max-h-[92dvh] rounded-t-md" : "w-full sm:max-w-md")}>
          <SheetHeader className="border-b border-border p-5 pr-14 text-left">
            <SheetTitle>Kunne ikke udføres</SheetTitle>
            <SheetDescription>Vælg årsagen. Kontoret får besked og planlægger besøget igen.</SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-5">
            <div className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2">
              {REASONS.map((r) => (
                <Button key={r} type="button" variant={reason === r ? "default" : "outline"} className="h-12 justify-start whitespace-normal text-left" aria-pressed={reason === r} onClick={() => setReason(r)}>{r}</Button>
              ))}
            </div>
            <div>
              <label htmlFor="obstacle-detail" className="mb-1 block text-sm font-medium">Bemærkning (valgfri)</label>
              <Textarea id="obstacle-detail" value={detail} maxLength={1000} onChange={(e) => setDetail(e.target.value)} placeholder="Fx: Låst, ringede uden svar" />
            </div>
          </div>
          <div className="border-t border-border p-4">
            <Button className="h-12 w-full gap-2" disabled={!reason || report.isPending} onClick={() => report.mutate()}>
              {report.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Send til kontoret
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
