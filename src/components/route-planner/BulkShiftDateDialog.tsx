// Bulk-flyt opstartsdato for valgte aftaler i "Aftaler uden rute".
// Brugeren vælger enten en konkret ny dato eller en forskydning i dage,
// ser et forhåndsvisnings-liste med "nuværende → ny" pr. aftale, og
// bekræfter — så opdaterer vi orders.preferred_date i én batch.
import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { CalendarDays, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { SheetHeaderBlock } from "./SheetSection";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateRouteSyncQueries } from "@/hooks/useRoutes";
import { DatePickerField } from "./DatePickerField";
import { cn } from "@/lib/utils";
import { pushRouteUndo } from "@/lib/route-history";
import { toastSuccessWithUndo } from "@/lib/toast-undo";

type Job = {
  id: string;
  customer_name: string;
  preferred_date?: string | null;
  next_service_date?: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobs: Job[];
  onDone?: () => void;
};

const todayStr = () => format(new Date(), "yyyy-MM-dd");

const effectiveDate = (j: Job) => j.preferred_date || j.next_service_date || null;

export default function BulkShiftDateDialog({ open, onOpenChange, jobs, onDone }: Props) {
  const qc = useQueryClient();
  const [mode, setMode] = useState<"set" | "shift">("set");
  const [targetDate, setTargetDate] = useState<string>(todayStr());
  const [shiftDays, setShiftDays] = useState<number>(7);
  const [busy, setBusy] = useState(false);

  // Forhåndsvisning: udregn ny dato for hver valgt aftale ud fra valgt mode.
  // Aftaler uden dato får målddatoen ved "set", eller springes over ved "shift"
  // (det ville være forvirrende at "forskyde" noget der ikke har et udgangspunkt).
  const preview = useMemo(() => {
    return jobs.map((j) => {
      const current = effectiveDate(j);
      let next: string | null;
      if (mode === "set") {
        next = targetDate;
      } else {
        next = current ? format(addDays(parseISO(current), shiftDays), "yyyy-MM-dd") : null;
      }
      return { job: j, current, next, willSkip: next == null };
    });
  }, [jobs, mode, targetDate, shiftDays]);

  const willUpdate = preview.filter((p) => !p.willSkip && p.next !== p.current);
  const willSkip = preview.filter((p) => p.willSkip).length;
  const willNoop = preview.filter((p) => !p.willSkip && p.next === p.current).length;

  const handleConfirm = async () => {
    if (busy || willUpdate.length === 0) return;
    setBusy(true);
    try {
      // Vi opdaterer i små batches efter ny dato, så vi kan sætte
      // preferred_date korrekt pr. gruppe (Postgres' .in() understøtter ikke
      // pr. række-værdi i en enkelt update).
      const byDate = new Map<string, string[]>();
      for (const p of willUpdate) {
        const list = byDate.get(p.next!) ?? [];
        list.push(p.job.id);
        byDate.set(p.next!, list);
      }
      for (const [date, ids] of byDate.entries()) {
        const { error } = await supabase
          .from("orders")
          .update({ preferred_date: date })
          .in("id", ids);
        if (error) throw error;
      }
      invalidateRouteSyncQueries(qc);
      // Fortryd: gendan oprindelige preferred_date pr. aftale i én batch.
      const prevByDate = new Map<string | "null", string[]>();
      for (const p of willUpdate) {
        const k = p.current ?? "null";
        const list = prevByDate.get(k) ?? [];
        list.push(p.job.id);
        prevByDate.set(k, list);
      }
      const label = `Flyt opstartsdato for ${willUpdate.length} aftale${willUpdate.length === 1 ? "" : "r"}`;
      pushRouteUndo({
        label,
        undo: async () => {
          for (const [date, ids] of prevByDate.entries()) {
            const { error } = await supabase
              .from("orders")
              .update({ preferred_date: date === "null" ? null : date })
              .in("id", ids);
            if (error) throw error;
          }
          invalidateRouteSyncQueries(qc);
        },
        redo: async () => {
          for (const [date, ids] of byDate.entries()) {
            const { error } = await supabase
              .from("orders")
              .update({ preferred_date: date })
              .in("id", ids);
            if (error) throw error;
          }
          invalidateRouteSyncQueries(qc);
        },
      });
      toastSuccessWithUndo({
        message: label,
        description: willSkip > 0 ? `${willSkip} sprunget over (manglede dato).` : undefined,
      });
      onOpenChange(false);
      onDone?.();
    } catch (e: any) {
      toast.error("Kunne ikke flytte datoerne", { description: e?.message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!busy) onOpenChange(v); }}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-lg max-h-[calc(100dvh-1rem)] overflow-y-auto rounded-md p-0 gap-0 overflow-hidden flex flex-col max-h-[85vh]">
        <DialogHeader className="px-4 sm:px-5 py-4 pr-12 border-b shrink-0 space-y-0 text-left">
          <SheetHeaderBlock
            icon={<CalendarDays className="h-4 w-4" />}
            title={<DialogTitle className="text-base">Flyt opstartsdato for {jobs.length} aftale{jobs.length === 1 ? "" : "r"}</DialogTitle>}
            description={
              <DialogDescription className="text-xs leading-snug">
                Vælg en ny dato eller forskyd alle valgte med et antal dage. Se forhåndsvisningen før du bekræfter.
              </DialogDescription>
            }
          />
        </DialogHeader>

        <div className="px-5 py-4 space-y-4 overflow-y-auto">
          <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
            <TabsList className="grid grid-cols-2 w-full h-9">
              <TabsTrigger value="set" className="text-xs">Sæt fælles dato</TabsTrigger>
              <TabsTrigger value="shift" className="text-xs">Forskyd med dage</TabsTrigger>
            </TabsList>
            <TabsContent value="set" className="mt-3">
              <Label className="text-xs">Ny opstartsdato</Label>
              <div className="mt-1.5">
                <DatePickerField value={targetDate} onChange={setTargetDate} />
              </div>
            </TabsContent>
            <TabsContent value="shift" className="mt-3 space-y-2">
              <Label className="text-xs">Antal dage (brug negativt tal for at trække fra)</Label>
              <div className="flex items-center gap-2">
                <Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => setShiftDays((n) => n - 1)}>−</Button>
                <Input
                  type="number"
                  value={shiftDays}
                  onChange={(e) => setShiftDays(Number(e.target.value) || 0)}
                  className="h-9 text-center tabular-nums"
                />
                <Button type="button" variant="outline" size="sm" className="h-9 w-9 p-0" onClick={() => setShiftDays((n) => n + 1)}>+</Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {[-7, -1, 1, 7, 14, 30].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setShiftDays(n)}
                    className={cn(
                      "h-7 px-2 rounded-md text-[11px] font-medium border transition-colors",
                      shiftDays === n
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background hover:bg-secondary",
                    )}
                  >
                    {n > 0 ? `+${n}` : n} {Math.abs(n) === 1 ? "dag" : "dage"}
                  </button>
                ))}
              </div>
            </TabsContent>
          </Tabs>

          <div className="rounded-lg border bg-secondary/30 overflow-hidden">
            <div className="px-3 py-2 border-b bg-secondary/60 flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              <span>Forhåndsvisning</span>
              <span className="tabular-nums">
                {willUpdate.length} flyttes
                {willNoop > 0 && ` · ${willNoop} uændret`}
                {willSkip > 0 && ` · ${willSkip} sprunget over`}
              </span>
            </div>
            <div className="max-h-64 overflow-y-auto divide-y divide-border/60">
              {preview.map(({ job, current, next, willSkip: skip }) => (
                <div key={job.id} className="flex items-center gap-2 px-3 py-2 text-xs">
                  <span className="flex-1 truncate font-medium text-foreground">{job.customer_name}</span>
                  <span className="text-muted-foreground tabular-nums shrink-0">
                    {current ? format(parseISO(current), "d. MMM", { locale: da }) : "—"}
                  </span>
                  <ArrowRight className="h-3 w-3 text-muted-foreground/60 shrink-0" />
                  <span className={cn(
                    "tabular-nums font-medium shrink-0",
                    skip ? "text-muted-foreground italic" : next !== current ? "text-foreground" : "text-muted-foreground",
                  )}>
                    {skip ? "sprunget over" : next ? format(parseISO(next), "d. MMM", { locale: da }) : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="px-5 py-3 border-t bg-card shrink-0 gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy} className="h-9">
            Annullér
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={busy || willUpdate.length === 0} className="h-9">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}
            Flyt {willUpdate.length} aftale{willUpdate.length === 1 ? "" : "r"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}