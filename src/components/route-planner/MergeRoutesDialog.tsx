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
import { Combine, Repeat, ArrowRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type MergeScope = "single" | "future";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sourceName: string;
  targetName: string;
  sourceDate: string;
  targetDate: string;
  recurringAppointmentCount: number;
  loading?: boolean;
  onConfirm: (scope: MergeScope) => Promise<void> | void;
};

export const MergeRoutesDialog = ({
  open, onOpenChange, sourceName, targetName, sourceDate, targetDate,
  recurringAppointmentCount, loading, onConfirm,
}: Props) => {
  const [scope, setScope] = useState<MergeScope>("single");

  useEffect(() => { if (open) setScope("single"); }, [open]);

  const fmt = (d: string) => {
    try { return format(parseISO(d), "EEE d. MMM", { locale: da }); }
    catch { return d; }
  };

  const canChooseFuture = recurringAppointmentCount >= 1;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Combine className="h-4 w-4 text-accent" />
            Flet ruter
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2 text-sm min-w-0">
              <div className="flex items-center gap-2 text-muted-foreground tabular-nums min-w-0">
                <span className="capitalize text-foreground font-medium truncate min-w-0 flex-1">
                  {sourceName} <span className="text-muted-foreground">({fmt(sourceDate)})</span>
                </span>
                <ArrowRight className="h-3 w-3 shrink-0" />
                <span className="capitalize text-foreground font-medium truncate min-w-0 flex-1">
                  {targetName} <span className="text-muted-foreground">({fmt(targetDate)})</span>
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Alle aftaler flyttes til målruten. Kilderuten slettes automatisk.
                Medarbejder­tilknytninger pr. aftale bevares.
              </p>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-2 pt-1">
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
          />
        </div>

        <AlertDialogFooter>
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