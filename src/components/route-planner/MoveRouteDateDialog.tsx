// MoveRouteDateDialog — spørger om en datoflytning skal gælde:
//  1) Kun denne ene rute (default), eller
//  2) Alle fremtidige ruter i samme serie (samme route_template_id)
//
// Hvis "fremtidige" vælges, spørger vi også om tilknyttede aftaler/abonnementer
// (preferred_route_id på subscriptions) skal følge med — fx hvis en kunde har
// indvendig vinduespudsning der bør flytte sammen med den udvendige.

import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Route as RouteIcon, Repeat, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import { mapPostgresError } from "@/lib/route-errors";
import { SheetHeaderBlock, Section, SheetFooterBar } from "./SheetSection";
import { ScopeOption } from "./ScopeOption";

export type MoveRouteScope = "single" | "future";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeName: string;
  fromDate: string;
  toDate: string;
  /** Antal tilbagevendende aftaler (abonnementer) der ligger på denne rute. */
  recurringAppointmentCount: number;
  /** (Behold for bagudkompatibilitet — bruges ikke længere visuelt.) */
  linkedSubscriptionCount: number;
  loading?: boolean;
  /** Valgfri konflikt-advarsler vist over scope-valgene. */
  warnings?: string[];
  /**
   * Konkrete grunde til at "Fremtidige aftaler også" ikke kan vælges.
   * Hvis tom/undefined falder vi tilbage til en generisk besked. Hvis udfyldt
   * vises de som bullet-liste under den deaktiverede knap, så brugeren altid
   * kan se HVORFOR de kun kan vælge "Kun denne gang".
   */
  disabledFutureReasons?: string[];
  onConfirm: (scope: MoveRouteScope, moveLinkedSubscriptions: boolean) => Promise<void> | void;
};

export const MoveRouteDateDialog = ({
  open, onOpenChange, routeName, fromDate, toDate,
  recurringAppointmentCount, linkedSubscriptionCount, loading, warnings,
  disabledFutureReasons, onConfirm,
}: Props) => {
  void linkedSubscriptionCount;
  const [scope, setScope] = useState<MoveRouteScope>("single");
  const [moveLinked, setMoveLinked] = useState(true);
  // Inline fejl — vises i selve dialogen så brugeren ikke skal jagte en
  // forsvindende toast for at forstå hvad der gik galt.
  const [submitError, setSubmitError] = useState<{ title: string; description?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setScope("single");
      setMoveLinked(true);
      setSubmitError(null);
      setSubmitting(false);
    }
  }, [open]);

  const deltaDays = useMemo(() => {
    try {
      return differenceInCalendarDays(parseISO(toDate), parseISO(fromDate));
    } catch { return 0; }
  }, [fromDate, toDate]);

  const fmt = (d: string) => {
    try { return format(parseISO(d), "EEEE d. MMM yyyy", { locale: da }); }
    catch { return d; }
  };

  const canChooseFuture =
    recurringAppointmentCount >= 1 && (disabledFutureReasons?.length ?? 0) === 0;

  const busy = loading || submitting;
  const handleConfirm = async () => {
    setSubmitError(null);
    setSubmitting(true);
    try {
      await onConfirm(scope, scope === "future" ? moveLinked : false);
    } catch (e: any) {
      const issue = mapPostgresError(e);
      setSubmitError({
        title: issue.title || "Kunne ikke flytte rute",
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
            title={<DialogTitle className="text-base">Flyt rute til ny dato</DialogTitle>}
            description={
              <DialogDescription className="text-xs leading-snug">
                Vælg om kun denne dag skal flyttes, eller også de næste.
              </DialogDescription>
            }
          />
        </DialogHeader>

        <div className="planner-overlay-body min-h-0 flex-1 space-y-3 overflow-y-auto bg-secondary/20 px-3 py-4 sm:px-5">
          <Section icon={<RouteIcon />} title="Rute">
            <div className="space-y-2 text-sm">
              <p className="min-w-0 truncate font-medium text-foreground" title={routeName}>{routeName}</p>
              <div className="grid min-w-0 gap-2 tabular-nums sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                <span className="min-w-0 truncate rounded-md border border-border bg-background px-2.5 py-2 capitalize text-muted-foreground">{fmt(fromDate)}</span>
                <ArrowRight className="mx-auto h-3.5 w-3.5 shrink-0 rotate-90 text-muted-foreground sm:rotate-0" />
                <span className="min-w-0 truncate rounded-md border border-border bg-background px-2.5 py-2 font-medium capitalize text-foreground">{fmt(toDate)}</span>
              </div>
              {deltaDays !== 0 && (
                <p className="text-xs text-muted-foreground">
                  {Math.abs(deltaDays)} dag{Math.abs(deltaDays) === 1 ? "" : "e"} {deltaDays > 0 ? "frem" : "tilbage"}.
                </p>
              )}
            </div>
          </Section>

          {warnings && warnings.length > 0 && (
            <div className="rounded-md border border-amber-300/60 bg-amber-50 p-2.5 dark:bg-amber-950/30">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <div className="mb-0.5 text-xs font-semibold text-amber-900 dark:text-amber-200">Mulige konflikter på den nye dato</div>
                  <ul className="space-y-0.5 text-xs leading-snug text-amber-900/90 dark:text-amber-200/90">
                    {warnings.map((w, i) => <li key={i}>• {w}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}

          <Section icon={<Repeat />} title="Hvad skal flyttes?">
            <div className="space-y-2">
              <ScopeOption
                selected={scope === "single"}
                onClick={() => setScope("single")}
                title="Kun denne dag"
                description="Kun denne dag flyttes. De næste besøg bliver på deres dato."
              />
              <ScopeOption
                selected={scope === "future"}
                onClick={() => canChooseFuture && setScope("future")}
                disabled={!canChooseFuture}
                title="Denne dag og de næste"
                description={
                  canChooseFuture
                    ? `Alle næste besøg flyttes lige så mange dage (${recurringAppointmentCount} fast${recurringAppointmentCount === 1 ? "" : "e"} aftale${recurringAppointmentCount === 1 ? "" : "r"}).`
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
              Flyt til ny dato
            </Button>
          </div>
        </SheetFooterBar>
      </DialogContent>
    </Dialog>
  );
};
