// MergeRoutesDialog — samme layout og brugervenlighed som MoveRouteDateDialog.
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Route as RouteIcon, Repeat, ArrowRight, Loader2, AlertTriangle, Users } from "lucide-react";
import { mapPostgresError } from "@/lib/route-errors";
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
  sourceStops?: MergeStopPreview[];
  targetStopCount?: number;
  disabledFutureReasons?: string[];
  onConfirm: (scope: MergeScope) => Promise<void> | void;
};

export const MergeRoutesDialog = ({
  open, onOpenChange, sourceName, targetName, sourceDate, targetDate,
  recurringAppointmentCount, loading, disabledFutureReasons, sourceStops,
  targetStopCount, onConfirm,
}: Props) => {
  const [scope, setScope] = useState<MergeScope>("single");
  const [submitError, setSubmitError] = useState<{ title: string; description?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) { setScope("single"); setSubmitError(null); setSubmitting(false); }
  }, [open]);

  const fmt = (d: string) => {
    try { return format(parseISO(d), "EEEE d. MMM", { locale: da }); }
    catch { return d; }
  };

  const canChooseFuture =
    recurringAppointmentCount >= 1 && (disabledFutureReasons?.length ?? 0) === 0;
  const busy = !!loading || submitting;

  const handleConfirm = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onConfirm(scope);
    } catch (e: any) {
      const issue = mapPostgresError(e);
      setSubmitError({
        title: issue.title || "Kunne ikke flette ruterne",
        description: issue.hint ? `${issue.message}\n${issue.hint}` : issue.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!busy) onOpenChange(o); }}>
      <DialogContent className="planner-overlay flex max-h-[calc(100dvh-1rem)] w-[calc(100vw-1rem)] max-w-xl flex-col gap-0 overflow-hidden rounded-md p-0 sm:max-h-[92vh]">
        <DialogHeader className="planner-overlay-header shrink-0 space-y-0 border-b px-4 py-3 pr-12 text-left sm:px-5">
          <SheetHeaderBlock
            title={<DialogTitle className="text-base">Flet ruter</DialogTitle>}
            description={
              <DialogDescription className="text-xs leading-snug">
                Aftalerne flyttes over på den anden rute. Den tomme rute fjernes.
              </DialogDescription>
            }
          />
        </DialogHeader>

        <div className="planner-overlay-body min-h-0 flex-1 space-y-3 overflow-y-auto bg-secondary/20 px-3 py-4 sm:px-5">
          <Section icon={<RouteIcon />} title="Ruter">
            <div className="grid min-w-0 gap-2 text-sm tabular-nums sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
              <div className="min-w-0 rounded-md border border-border bg-background px-2.5 py-2">
                <p className="truncate font-medium text-foreground" title={sourceName}>{sourceName}</p>
                <p className="truncate text-xs capitalize text-muted-foreground">
                  {fmt(sourceDate)}{sourceStops ? ` · ${sourceStops.length} aftaler` : ""}
                </p>
              </div>
              <ArrowRight className="mx-auto h-3.5 w-3.5 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" />
              <div className="min-w-0 rounded-md border border-border bg-background px-2.5 py-2">
                <p className="truncate font-medium text-foreground" title={targetName}>{targetName}</p>
                <p className="truncate text-xs capitalize text-muted-foreground">
                  {fmt(targetDate)}{typeof targetStopCount === "number" ? ` · ${targetStopCount} aftaler` : ""}
                </p>
              </div>
            </div>
          </Section>

          {sourceStops && sourceStops.length > 0 && (
            <Section icon={<Users />} title="Aftaler der flyttes">
              <ul className="max-h-40 divide-y divide-border overflow-y-auto rounded-md border border-border bg-background">
                {sourceStops.map((s) => (
                  <li key={s.id} className="flex items-center gap-2 px-2.5 py-1.5 text-sm">
                    <IndustryIcon name={s.serviceSummary} className="h-5 w-5 shrink-0" alt="" />
                    <span className="min-w-0 flex-1 truncate text-foreground">{s.customerName || "Aftale"}</span>
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <Section icon={<Repeat />} title="Hvad skal flettes?">
            <div className="space-y-2">
              <ScopeOption
                selected={scope === "single"}
                onClick={() => setScope("single")}
                title="Kun denne dag"
                description="Kun denne dag flettes. De næste besøg bliver på deres egen rute."
              />
              <ScopeOption
                selected={scope === "future"}
                onClick={() => canChooseFuture && setScope("future")}
                disabled={!canChooseFuture}
                title="Denne dag og de næste"
                description={
                  canChooseFuture
                    ? `De næste besøg lander også på den nye rute (${recurringAppointmentCount} fast${recurringAppointmentCount === 1 ? "" : "e"} aftale${recurringAppointmentCount === 1 ? "" : "r"}).`
                    : "Der er ingen faste aftaler på ruten."
                }
                icon={<Repeat className="h-3.5 w-3.5" />}
                extra={
                  !canChooseFuture && (disabledFutureReasons?.length ?? 0) > 0 ? (
                    <ul className="mt-1.5 space-y-0.5 text-xs leading-snug text-muted-foreground">
                      {disabledFutureReasons!.map((r, i) => <li key={i}>• {r}</li>)}
                    </ul>
                  ) : null
                }
              />
            </div>
          </Section>

          {submitError && (
            <div role="alert" className="rounded-md border border-destructive/40 bg-destructive/5 p-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" />
                <div className="min-w-0 text-xs leading-snug">
                  <div className="font-semibold text-destructive">{submitError.title}</div>
                  {submitError.description && <p className="mt-0.5 whitespace-pre-line text-destructive/90">{submitError.description}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        <SheetFooterBar>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Annullér</Button>
            <Button className="bg-accent text-accent-foreground hover:bg-accent/90" onClick={handleConfirm} disabled={busy}>
              {busy && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
              Flet ruter
            </Button>
          </div>
        </SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
};
