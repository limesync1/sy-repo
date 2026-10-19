import { useMemo, useState } from "react";
import { addDays, format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { CalendarDays, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Section, SheetFooterBar } from "./SheetSection";
import PlannerDialogHeader from "./PlannerDialogHeader";
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
        if (!p.next) continue;
        const list = byDate.get(p.next) ?? [];
        list.push(p.job.id);
        byDate.set(p.next, list);
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
      <DialogContent className="planner-overlay planner-bulk-dialog flex min-w-0 flex-col gap-0 overflow-hidden p-0 sm:p-0">
        <PlannerDialogHeader
          artwork={<BrandedIllustration name="calendarWeek" className="h-14 w-14" />}
          title={`Flyt opstartsdato for ${jobs.length} aftale${jobs.length === 1 ? "" : "r"}`}
          description="Vælg en fælles dato eller forskyd opstarten med et antal dage."
        />

        <div className="planner-overlay-body grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-3 overflow-y-auto overflow-x-hidden bg-secondary/20 p-3 sm:p-4 md:grid-cols-2">
          <Section icon={<CalendarDays className="h-4 w-4" />} title="Ny opstartsdato" tone="sky" className="min-w-0 self-start">
            <Tabs value={mode} onValueChange={(v) => { if (v === "set" || v === "shift") setMode(v); }}>
              <TabsList className="grid grid-cols-2 w-full h-auto min-h-11">
                <TabsTrigger value="set" className="min-h-11 whitespace-normal text-xs">Sæt fælles dato</TabsTrigger>
                <TabsTrigger value="shift" className="min-h-11 whitespace-normal text-xs">Forskyd med dage</TabsTrigger>
              </TabsList>
              <TabsContent value="set" className="mt-3">
                <Field label="Ny opstartsdato" required>
                  <DatePickerField value={targetDate} onChange={setTargetDate} />
                </Field>
              </TabsContent>
              <TabsContent value="shift" className="mt-3 space-y-3">
                <Field label="Antal dage" hint="Brug negativt tal for at trække dage fra">
                  <div className="flex items-center gap-2">
                    <Button type="button" variant="outline" size="sm" aria-label="Én dag mindre" className="h-11 w-11 shrink-0 p-0" onClick={() => setShiftDays((n) => n - 1)}>−</Button>
                    <Input
                      type="number"
                      value={shiftDays}
                      onChange={(e) => setShiftDays(Number(e.target.value) || 0)}
                      aria-label="Antal dage"
                      className="h-11 min-w-0 text-center tabular-nums text-base sm:text-sm"
                    />
                    <Button type="button" variant="outline" size="sm" aria-label="Én dag mere" className="h-11 w-11 shrink-0 p-0" onClick={() => setShiftDays((n) => n + 1)}>+</Button>
                  </div>
                </Field>
                <div className="flex flex-wrap gap-1.5">
                  {[-7, -1, 1, 7, 14, 30].map((n) => (
                    <Button
                      key={n}
                      type="button"
                      variant="outline"
                      onClick={() => setShiftDays(n)}
                      className={cn(
                        "h-11 min-w-11 px-2.5 text-xs",
                        shiftDays === n
                          ? "border-accent bg-accent/15 text-foreground shadow-sm hover:bg-accent/20 hover:text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {n > 0 ? `+${n}` : n} {Math.abs(n) === 1 ? "dag" : "dage"}
                    </Button>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          </Section>

          <Section 
            icon={<ArrowRight className="h-4 w-4" />} 
            title="Forhåndsvisning" 
            tone="muted"
            className="min-w-0 self-start"
            hint={
              <span className="tabular-nums">
                {willUpdate.length} flyttes
                {willNoopCount > 0 && ` · ${willNoopCount} uændret`}
                {willSkipCount > 0 && ` · ${willSkipCount} sprunget over`}
              </span>
            }
          >
            <div className="min-w-0 divide-y divide-border/60">
              {preview.map(({ job, current, next, willSkip: skip }) => (
                <div key={job.id} className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 py-2 text-[13px]">
                  <span className="min-w-0 basis-full break-words font-medium text-foreground lg:flex-1 lg:basis-auto">{job.customer_name}</span>
                  <div className="flex min-w-0 items-center gap-2">
                    <span className="text-muted-foreground tabular-nums text-xs">
                      {current ? format(parseISO(current), "d. MMM", { locale: da }) : "—"}
                    </span>
                    <ArrowRight className="h-3 w-3 text-muted-foreground/40" />
                    <span className={cn(
                      "tabular-nums font-semibold min-w-[3.5rem] text-right",
                      skip ? "text-muted-foreground italic text-[11px]" : next !== current ? "text-foreground" : "text-muted-foreground",
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
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy} className="flex-1 h-11">
            Annullér
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={busy || willUpdate.length === 0} className="flex-[1.5] h-11">
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <CalendarDays className="h-4 w-4 mr-2" />}
            Flyt {willUpdate.length} aftale{willUpdate.length === 1 ? "" : "r"}
          </Button>
        </SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
}
