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
import { CalendarRange, Repeat, ArrowRight, Loader2 } from "lucide-react";
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
  onConfirm: (scope: MoveRouteScope, moveLinkedSubscriptions: boolean) => Promise<void> | void;
};

export const MoveRouteDateDialog = ({
  open, onOpenChange, routeName, fromDate, toDate,
  recurringAppointmentCount, linkedSubscriptionCount, loading, onConfirm,
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

  const canChooseFuture = recurringAppointmentCount >= 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md overflow-hidden">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-accent" />
            Flyt rute til ny dato
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm min-w-0">
              <div className="flex items-center gap-2 text-foreground min-w-0">
                <span className="font-medium truncate min-w-0 flex-1">{routeName}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground tabular-nums min-w-0 flex-wrap">
                <span className="capitalize truncate">{fmt(fromDate)}</span>
                <ArrowRight className="h-3 w-3 shrink-0" />
                <span className="capitalize text-foreground font-medium truncate">{fmt(toDate)}</span>
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
          />

          {/* Linked-subscriptions checkbox fjernet: ved "fremtidige" forskydes
              de tilbagevendende aftalers next_service_date altid med samme delta. */}
        </div>

        <AlertDialogFooter>
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
  selected, onClick, disabled, title, description, icon,
}: {
  selected: boolean;
  onClick: () => void;
  disabled?: boolean;
  title: string;
  description: string;
  icon?: React.ReactNode;
}) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={cn(
      "w-full text-left rounded-md border p-2.5 transition-colors",
      selected ? "border-accent bg-accent/5 ring-1 ring-accent" : "border-border hover:bg-secondary/40",
      disabled && "opacity-50 cursor-not-allowed hover:bg-transparent",
    )}
  >
    <div className="flex items-center gap-1.5 mb-0.5">
      <span
        className={cn(
          "inline-flex h-3.5 w-3.5 rounded-full border-2 shrink-0",
          selected ? "border-accent bg-accent" : "border-border bg-background",
        )}
      />
      {icon && <span className="text-muted-foreground">{icon}</span>}
      <span className="text-sm font-semibold">{title}</span>
    </div>
    <p className="text-[11px] text-muted-foreground leading-snug pl-5">{description}</p>
  </button>
);