// MergeRoutesDialog — bekræft fletning af to ruter og spørg om scope:
//  1) "Kun denne gang" — flyt kun aftalerne i kilderuten ind i målruten.
//  2) "Fremtidige aftaler også" — re-point gentagne aftalers preferred_route_id
//     fra kilden til målruten (og forskyd deres næste forekomst hvis datoerne
//     er forskellige), så fremtidige projektioner tegnes på målruten.
//
// Spejler UI'et fra MoveRouteDateDialog så brugeren genkender mønstret.

import { useEffect, useState } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Combine, Repeat, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { getSubcategoryIcon } from "@/lib/category-icons";
import { SheetHeaderBlock } from "./SheetSection";
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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="planner-overlay left-4 right-4 top-4 max-h-[calc(100svh-2rem)] w-auto max-w-none translate-x-0 translate-y-0 overflow-y-auto overflow-x-hidden p-0 sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[min(92vw,32rem)] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%]">
        <AlertDialogHeader className="planner-overlay-header min-w-0 border-b px-4 py-3 pr-12 text-left space-y-2 sm:px-5">
          <SheetHeaderBlock
            icon={<Combine className="h-4 w-4" />}
            title={<AlertDialogTitle className="text-base">Flet ruter</AlertDialogTitle>}
          />
          <AlertDialogDescription asChild>
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
                      const icon = getSubcategoryIcon(s.serviceSummary);
                      return (
                        <li key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 text-[12px]">
                          <span aria-hidden className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded bg-secondary text-[12px] leading-none">
                            {icon}
                          </span>
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
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="planner-overlay-body space-y-2 px-4 py-3 sm:px-5">
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

        <AlertDialogFooter className="planner-overlay-footer border-t px-4 py-3 sm:px-5">
          <AlertDialogCancel disabled={loading}>Annullér</AlertDialogCancel>
          <Button
            onClick={async () => { await onConfirm(scope); }}
            disabled={loading}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Flet ruter
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
