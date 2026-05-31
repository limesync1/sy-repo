// MoveRouteDateDialog — spørger om en datoflytning skal gælde:
//  1) Kun denne ene rute (default), eller
//  2) Alle fremtidige ruter i samme serie (samme route_template_id)
//
// Hvis "fremtidige" vælges, spørger vi også om tilknyttede aftaler/abonnementer
// (preferred_route_id på subscriptions) skal følge med — fx hvis en kunde har
// indvendig vinduespudsning der bør flytte sammen med den udvendige.

import { useEffect, useMemo, useState } from "react";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { CalendarRange, Repeat, ArrowRight, Loader2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

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

  useEffect(() => {
    if (open) {
      setScope("single");
      setMoveLinked(true);
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

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="left-4 right-4 top-4 max-h-[calc(100svh-2rem)] w-auto max-w-none translate-x-0 translate-y-0 overflow-y-auto overflow-x-hidden p-4 sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[min(92vw,32rem)] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:p-6">
        <AlertDialogHeader className="min-w-0 text-left">
          <AlertDialogTitle className="flex min-w-0 items-center gap-2">
            <CalendarRange className="h-4 w-4 text-accent" />
            Flyt rute til ny dato
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="min-w-0 space-y-2 text-sm">
              <div className="min-w-0 text-foreground">
                <span className="block min-w-0 [overflow-wrap:anywhere] rounded-md border border-border bg-secondary/30 px-2.5 py-2 font-medium sm:truncate">{routeName}</span>
              </div>
              <div className="grid min-w-0 gap-2 text-muted-foreground tabular-nums sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                <span className="min-w-0 [overflow-wrap:anywhere] rounded-md border border-border bg-secondary/30 px-2.5 py-2 capitalize sm:truncate">{fmt(fromDate)}</span>
                <ArrowRight className="mx-auto h-3 w-3 shrink-0 rotate-90 sm:rotate-0" />
                <span className="min-w-0 [overflow-wrap:anywhere] rounded-md border border-border bg-secondary/30 px-2.5 py-2 font-medium capitalize text-foreground sm:truncate">{fmt(toDate)}</span>
              </div>
              {deltaDays !== 0 && (
                <p className="text-[11px] text-muted-foreground">
                  Forskydes med {Math.abs(deltaDays)} dag{Math.abs(deltaDays) === 1 ? "" : "e"}
                  {deltaDays > 0 ? " frem" : " tilbage"}.
                </p>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 pt-1">
          {warnings && warnings.length > 0 && (
            <div className="rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 mb-0.5">
                    Mulige konflikter på måldatoen
                  </div>
                  <ul className="text-[11px] leading-snug text-amber-900/90 dark:text-amber-200/90 space-y-0.5">
                    {warnings.map((w, i) => <li key={i}>• {w}</li>)}
                  </ul>
                </div>
              </div>
            </div>
          )}
          <ScopeOption
            selected={scope === "single"}
            onClick={() => setScope("single")}
            title="Kun denne gang"
            description="Flyt kun denne ene dato. Fremtidige forekomster af de tilbagevendende aftaler forbliver uændrede."
          />
          <ScopeOption
            selected={scope === "future"}
            onClick={() => canChooseFuture && setScope("future")}
            disabled={!canChooseFuture}
            title="Fremtidige aftaler også"
            description={
              canChooseFuture
                ? `Flyt denne dato og forskyd ${recurringAppointmentCount} tilbagevendende aftale${recurringAppointmentCount === 1 ? "" : "r"} med samme antal dage — så fremtidige besøg fast lander på den nye ugedag.`
                : "Ingen tilbagevendende aftaler på ruten at forskyde."
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

          {/* Linked-subscriptions checkbox fjernet: ved "fremtidige" forskydes
              de tilbagevendende aftalers next_service_date altid med samme delta. */}
        </div>

        <AlertDialogFooter className="pt-1">
          <AlertDialogCancel disabled={loading}>Annullér</AlertDialogCancel>
          <Button
            onClick={async () => { await onConfirm(scope, scope === "future" ? moveLinked : false); }}
            disabled={loading}
          >
            {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Flyt rute
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

const ScopeOption = ({
  selected, onClick, disabled, title, description, icon, extra,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  description: string;
  icon?: React.ReactNode;
  extra?: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-full min-w-0 text-left rounded-md border p-2.5 transition-colors",
      selected ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:bg-secondary/40",
      disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
    )}
  >
    <div className="mb-0.5 flex min-w-0 items-start gap-1.5">
      <span
        className={cn(
          "inline-flex h-3.5 w-3.5 rounded-full border-2 shrink-0",
          selected ? "border-accent bg-accent" : "border-border bg-background",
        )}
      />
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="min-w-0 text-sm font-semibold [overflow-wrap:anywhere]">{title}</span>
    </div>
    <p className="min-w-0 pl-5 text-[11px] leading-snug text-muted-foreground [overflow-wrap:anywhere]">{description}</p>
    {extra && <div className="pl-5">{extra}</div>}
  </button>
);