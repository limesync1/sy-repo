import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { CalendarDays, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Field, Section, SheetFooterBar, SheetHeaderBlock } from "./SheetSection";
import { BrandedIllustration } from "@/components/shared/BrandedIllustration";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateRouteSyncQueries } from "@/hooks/useRoutes";
import { DatePickerField } from "./DatePickerField";
import { cn } from "@/lib/utils";
import { pushRouteUndo } from "@/lib/route-history";
import { toastSuccessWithUndo } from "@/lib/toast-undo";

/**
 * Bulk-flyt opstartsdato for valgte aftaler i "Aftaler uden rute".
 */

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
  const willSkipCount = preview.filter((p) => p.willSkip).length;
  const willNoopCount = preview.filter((p) => !p.willSkip && p.next === p.current).length;

  const handleConfirm = async () => {
    if (busy || willUpdate.length === 0) return;
    setBusy(true);
    try {
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
        description: willSkipCount > 0 ? `${willSkipCount} sprunget over (manglede dato).` : undefined,
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
      <DialogContent className="planner-overlay w-[calc(100vw-1rem)] max-w-lg max-h-[calc(100dvh-1rem)] flex flex-col rounded-md p-0 overflow-hidden gap-0">
        <DialogHeader className="planner-overlay-header px-4 sm:px-5 py-3 pr-12 border-b shrink-0 space-y-0 text-left">
          <SheetHeaderBlock
            icon={<BrandedIllustration name="calendarWeek" className="h-8 w-8" />}
            iconClassName="h-10 w-10 bg-card border border-border"
            title={<DialogTitle className="text-base">Flyt opstartsdato for {jobs.length} aftale{jobs.length === 1 ? "" : "r"}</DialogTitle>}
            description={
              <DialogDescription className="text-xs leading-snug">
                Vælg en ny dato eller forskyd alle valgte med et antal dage. Se forhåndsvisningen før du bekræfter.
              </DialogDescription>
            }
          />
        </DialogHeader>

        <div className="planner-overlay-body min-h-0 flex-1 overflow-y-auto space-y-4 bg-secondary/20 p-4 sm:p-5">
          <Section icon={<CalendarDays className="h-4 w-4" />} title="Ny opstartsdato" tone="sky">
            <Tabs value={mode} onValueChange={(v) => setMode(v as any)}>
              <TabsList className="grid grid-cols-2 w-full h-9">
                <TabsTrigger value="set" className="text-xs">Sæt fælles dato</TabsTrigger>
                <TabsTrigger value="shift" className="text-xs">Forskyd med dage</TabsTrigger>
              </TabsList>
              <TabsContent value="set" className="mt-3">
                <Field label="Ny opstartsdato" required>
                  <DatePickerField value={targetDate} onChange={setTargetDate} />
                </Field>
              </TabsContent>
              <TabsContent value="shift" className="mt-3 space-y-3">
                <Field label="Antal dage" hint="Brug negativt tal for at trække dage fra">
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" className="h-10 w-10 p-0" onClick={() => setShiftDays((n) => n - 1)}>−</Button>
                    <Input
                      type="number"
                      value={shiftDays}
                      onChange={(e) => setShiftDays(Number(e.target.value) || 0)}
                      className="h-10 text-center tabular-nums text-base sm:text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" className="h-10 w-10 p-0" onClick={() => setShiftDays((n) => n + 1)}>+</Button>
                  </div>
                </Field>
                <div className="flex flex-wrap gap-1.5">
                  {[-7, -1, 1, 7, 14, 30].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setShiftDays(n)}
                      className={cn(
                        "h-7 px-2.5 rounded-md text-[11px] font-semibold border transition-all",
                        shiftDays === n
                          ? "border-primary bg-primary text-primary-foreground shadow-sm"
                          : "border-border bg-card hover:bg-secondary text-muted-foreground hover:text-foreground",
                      )}
                    >
                      {n > 0 ? `+${n}` : n} {Math.abs(n) === 1 ? "dag" : "dage"}
                    </button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </Section>

          <Section 
            icon={<ArrowRight className="h-4 w-4" />} 
            title="Forhåndsvisning" 
            tone="muted"
            hint={
              <span className="tabular-nums">
                {willUpdate.length} flyttes
                {willNoopCount > 0 && ` · ${willNoopCount} uændret`}
                {willSkipCount > 0 && ` · ${willSkipCount} sprunget over`}
              </span>
            }
          >
            <div className="max-h-64 overflow-y-auto overscroll-contain rounded-md border bg-card divide-y divide-border/60">
              {preview.map(({ job, current, next, willSkip: skip }) => (
                <div key={job.id} className="flex items-center gap-3 px-3 py-2 text-[13px]">
                  <span className="flex-1 truncate font-medium text-foreground">{job.customer_name}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-muted-foreground tabular-nums text-xs">
                      {current ? format(parseISO(current), "d. MMM", { locale: da }) : "—"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                    <span className={cn(
                      "tabular-nums font-semibold min-w-[3.5rem] text-right",
                      skip ? "text-muted-foreground italic text-[11px]" : next !== current ? "text-primary" : "text-muted-foreground",
                    )}>
                      {skip ? "springes over" : next ? format(parseISO(next), "d. MMM", { locale: da }) : "—"}
                    </span>
                  </div>
                </div>
              ))}
              {preview.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-6 italic">Ingen aftaler at vise.</p>
              )}
            </div>
          </Section>
        </div>

        <SheetFooterBar className="flex items-center gap-2 bg-card">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy} className="flex-1 h-10">
            Annullér
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={busy || willUpdate.length === 0} className="flex-[1.5] h-10">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarDays className="h-4 w-4 mr-2" />}
            Flyt {willUpdate.length} aftale{willUpdate.length === 1 ? "" : "r"}
          </Button>
        </SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
}
