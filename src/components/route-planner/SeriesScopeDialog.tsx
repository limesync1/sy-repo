import { useEffect, useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Calendar, CalendarRange, Repeat, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export type SeriesScope = "single" | "future" | "all";

type ScopeOption = {
  value: SeriesScope;
  label: string;
  description: string;
  icon: typeof Calendar;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  /** Hvad ændringen handler om — vises som kontekst (fx "Skift medarbejder", "Flyt aftale"). */
  description?: string;
  /** Antal fremtidige forekomster som "future" ville påvirke. */
  futureCount?: number;
  /** Antal forekomster i hele serien (single + future + historiske). */
  totalCount?: number;
  /** Skjul valg vi ikke understøtter for denne handling. */
  allowedScopes?: SeriesScope[];
  defaultScope?: SeriesScope;
  loading?: boolean;
  confirmLabel?: string;
  onConfirm: (scope: SeriesScope) => Promise<void> | void;
};

/**
 * Genbrugelig dialog der spørger "Skal ændringen gælde kun denne forekomst,
 * alle fremtidige, eller hele serien?". Bruges til medarbejder-skift,
 * intervalskift, aflysning og andre serie-mutations.
 */
export function SeriesScopeDialog({
  open, onOpenChange, title, description,
  futureCount, totalCount,
  allowedScopes = ["single", "future", "all"],
  defaultScope = "single",
  loading,
  confirmLabel = "Bekræft",
  onConfirm,
}: Props) {
  const [scope, setScope] = useState<SeriesScope>(defaultScope);

  useEffect(() => {
    if (open) setScope(defaultScope);
  }, [open, defaultScope]);

  const options: ScopeOption[] = [
    {
      value: "single",
      label: "Kun denne forekomst",
      description: "Resten af serien fortsætter uændret.",
      icon: Calendar,
    },
    {
      value: "future",
      label: "Denne og alle fremtidige",
      description: typeof futureCount === "number"
        ? `Påvirker ${futureCount} kommende ${futureCount === 1 ? "forekomst" : "forekomster"}.`
        : "Påvirker denne og alle fremtidige forekomster.",
      icon: CalendarRange,
    },
    {
      value: "all",
      label: "Hele serien",
      description: typeof totalCount === "number"
        ? `Påvirker alle ${totalCount} forekomster — også historiske.`
        : "Påvirker hele serien — også historiske forekomster.",
      icon: Repeat,
    },
  ].filter((o) => allowedScopes.includes(o.value));

  return (
    <AlertDialog open={open} onOpenChange={(o) => { if (!loading) onOpenChange(o); }}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          {description && (
            <AlertDialogDescription>{description}</AlertDialogDescription>
          )}
        </AlertDialogHeader>

        <div className="space-y-2 py-2">
          {options.map((opt) => {
            const Icon = opt.icon;
            const active = scope === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setScope(opt.value)}
                disabled={loading}
                className={cn(
                  "w-full text-left rounded-md border p-3 transition-colors flex items-start gap-3",
                  active
                    ? "border-foreground bg-muted/60"
                    : "border-border hover:bg-muted/40",
                  loading && "opacity-60 cursor-not-allowed",
                )}
              >
                <div className={cn(
                  "mt-0.5 h-4 w-4 rounded-full border flex items-center justify-center shrink-0",
                  active ? "border-foreground" : "border-muted-foreground/40",
                )}>
                  {active && <div className="h-2 w-2 rounded-full bg-foreground" />}
                </div>
                <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{opt.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Annullér</AlertDialogCancel>
          <AlertDialogAction
            disabled={loading}
            onClick={(e) => { e.preventDefault(); onConfirm(scope); }}
          >
            {loading ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-2" /> Gemmer…</>
            ) : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}