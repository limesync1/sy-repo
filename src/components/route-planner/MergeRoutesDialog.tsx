// MergeRoutesDialog — bekræft fletning af to ruter og spørg om scope:
//  1) "Kun denne gang" — flyt kun aftalerne i kilderuten ind i målruten.
//  2) "Fremtidige aftaler også" — re-point gentagne aftalers preferred_route_id
//     fra kilden til målruten (og forskyd deres næste forekomst hvis datoerne
//     er forskellige), så fremtidige projektioner tegnes på målruten.
//
// Spejler UI'et fra MoveRouteDateDialog så brugeren genkender mønstret.

import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Combine, Repeat, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { IndustryIcon } from "@/components/IndustryIcon";
import { SheetHeaderBlock, Section, SheetFooterBar } from "./SheetSection";
import { ScopeOption } from "./ScopeOption";

export type MergeScope = "single" | "future";

export type MergeStopPreview = {
  id: string;
  customerName: string | null;
  serviceSummary: string | null;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceName: string;
  targetName: string;
  sourceDate: string;
  targetDate: string;
  recurringAppointmentCount: number;
  loading?: boolean;
  /** Aftaler på kilderuten — vises som lille preview-liste så brugeren ser præcis
   *  hvad der flyttes over på målruten. */
  sourceStops?: MergeStopPreview[];
  /** Antal aftaler på målruten (vises som lille badge). */
  targetStopCount?: number;
  /**
   * Konkrete grunde til at "Fremtidige aftaler også" ikke kan vælges.
   * Vises som bullet-liste under den deaktiverede knap så brugeren altid
   * kan se HVORFOR det kun kan flettes for denne ene dato.
   */
  disabledFutureReasons?: string[];
  onConfirm: (scope: MergeScope) => Promise<void> | void;
};

export const MergeRoutesDialog = ({
  open, onOpenChange, sourceName, targetName, sourceDate, targetDate,
  recurringAppointmentCount, loading, disabledFutureReasons, sourceStops,
  targetStopCount, onConfirm,
}: Props) => {
  const [scope, setScope] = useState<MergeScope>("single");

  useEffect(() => { if (open) setScope("single"); }, [open]);

  const fmt = (d: string) => {
    try { return format(parseISO(d), "EEE d. MMM", { locale: da }); }
    catch { return d; }
  };

  const canChooseFuture =
    recurringAppointmentCount >= 1 && (disabledFutureReasons?.length ?? 0) === 0;

  const busy = !!loading;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="planner-overlay flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-md p-0 sm:max-h-[92vh]">
        <DialogHeader className="planner-overlay-header shrink-0 space-y-0 border-b px-4 py-3 pr-12 text-left sm:px-5">
          <SheetHeaderBlock
            icon={<Combine className="h-4 w-4" />}
            title={<DialogTitle className="text-base">Flet ruter</DialogTitle>}
            description={
              <DialogDescription className="text-xs leading-snug">
                Vælg om kun denne dato flyttes, eller også fremtidige aftaler.
              </DialogDescription>
            }
          />
        </DialogHeader>

        <div className="planner-overlay-body min-h-0 flex-1 space-y-3 overflow-y-auto bg-secondary/20 px-3 py-4 sm:px-5">
          <Section icon={<Combine />} title="Ruter">
            <div className="min-w-0 space-y-2 text-sm">
              <div className="grid min-w-0 gap-2 text-muted-foreground tabular-nums sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                <span className="min-w-0 [overflow-wrap:anywhere] rounded-md border border-border bg-secondary/30 px-2.5 py-2 text-left font-medium capitalize text-foreground sm:truncate">
                  {sourceName} <span className="text-muted-foreground">({fmt(sourceDate)})</span>
                  {sourceStops && (
                    <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-secondary px-1.5 py-0 text-[10px] font-semibold text-foreground/80 tabular-nums normal-case">
                      {sourceStops.length} aftaler
                    </span>
                  )}
                </span>
                <ArrowRight className="mx-auto h-3 w-3 shrink-0 rotate-90 sm:rotate-0" />
                <span className="min-w-0 [overflow-wrap:anywhere] rounded-md border border-border bg-secondary/30 px-2.5 py-2 text-left font-medium capitalize text-foreground sm:truncate">
                  {targetName} <span className="text-muted-foreground">({fmt(targetDate)})</span>
                  {typeof targetStopCount === "number" && (
                    <span className="ml-1 inline-flex items-center gap-0.5 rounded-full bg-secondary px-1.5 py-0 text-[10px] font-semibold text-foreground/80 tabular-nums normal-case">
                      {targetStopCount} aftaler
                    </span>
                  )}
                </span>
              </div>
              {sourceStops && sourceStops.length > 0 && (
                <div className="rounded-md border bg-background">
                  <div className="border-b px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                    Aftaler der flyttes
                  </div>
                  <ul className="max-h-40 divide-y overflow-y-auto">
                    {sourceStops.map((s) => {
                      return (
                        <li key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[12px]">
                          <IndustryIcon name={s.serviceSummary} className="h-5 w-5 shrink-0" alt="" />
                          <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                            {s.customerName || "Aftale"}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Alle aftaler flyttes til målruten. Kilderuten slettes automatisk.
                Medarbejder­tilknytninger pr. aftale bevares.
              </p>
            </div>
          </Section>

          <Section icon={<Repeat />} title="Hvad skal flettes?">
            <div className="space-y-2">
          <ScopeOption
            selected={scope === "single"}
            onClick={() => setScope("single")}
            title="Kun denne gang"
            description="Flet kun denne ene rute. Fremtidige forekomster af gentagne aftaler bliver på den oprindelige rute."
          />
          <ScopeOption
            selected={scope === "future"}
            onClick={() => canChooseFuture && setScope("future")}
            disabled={!canChooseFuture}
            title="Fremtidige aftaler også"
            description={
              canChooseFuture
                ? `Flyt også ${recurringAppointmentCount} tilbagevendende aftale${recurringAppointmentCount === 1 ? "" : "r"} permanent over på målruten — så fremtidige besøg lander samme sted.`
                : "Ingen tilbagevendende aftaler på kilderuten at flytte med."
            }
            icon={<Repeat className="h-3.5 w-3.5" />}
            extra={
              !canChooseFuture && (disabledFutureReasons?.length ?? 0) > 0 ? (
                <div className="mt-1.5 rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 px-2 py-1.5">
                  <div className="mb-0.5 flex items-center gap-1 text-[11px] font-semibold text-amber-900 dark:text-amber-200">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    Hvorfor er denne mulighed låst?
                  </div>
                  <ul className="space-y-0.5 text-[11px] leading-snug text-amber-900/90 dark:text-amber-200/90">
                    {disabledFutureReasons!.map((r, i) => <li key={i}>• {r}</li>)}
                  </ul>
                </div>
              ) : null
            }
          />
            </div>
          </Section>
        </div>

        <SheetFooterBar>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Annullér</Button>
            <Button
              className="bg-accent text-accent-foreground hover:bg-accent/90"
              onClick={async () => { await onConfirm(scope); }}
              disabled={busy}
            >
              {busy && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Flet ruter
            </Button>
          </div>
        </SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
};
