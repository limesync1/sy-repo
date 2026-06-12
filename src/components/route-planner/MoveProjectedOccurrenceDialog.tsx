// MoveProjectedOccurrenceDialog — bekræftelses-dialog for at flytte EN enkelt
// projiceret forekomst af en tilbagevendende rute til en ny dato. UI matcher
// MoveRouteDateDialog så alle "flyt rute"-popups deler samme layout og
// responsive opførsel.

import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { differenceInCalendarDays, format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { CalendarRange, ArrowRight, Loader2, AlertTriangle, Info, Repeat, Sparkles, SkipForward, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { mapPostgresError } from "@/lib/route-errors";
import { SheetHeaderBlock } from "./SheetSection";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  routeName: string;
  fromDate: string;
  toDate: string;
  /** Antal tilbagevendende aftaler på basisruten — styrer om sync-options vises. */
  recurringAppointmentCount?: number;
  /** Sync-states. Hvis ikke leveret, vises sync-sektionen ikke. */
  syncNext?: boolean;
  onSyncNextChange?: (v: boolean) => void;
  syncStart?: boolean;
  onSyncStartChange?: (v: boolean) => void;
  warnings?: string[];
  /** En foreslået fri dato hvis mål-datoen har konflikter. Vises som "Brug X i stedet". */
  suggestedFreeDate?: string | null;
  onPickSuggestedDate?: (iso: string) => void;
  /** Hvis true: mål-datoen er også en naturlig kadence-dato for samme serie,
   *  så den oprindelige forekomst der ville lande dér bliver sprunget over. */
  autoSkipCadence?: boolean;
  /** Foreslåede medarbejder-erstatninger når original-tildelinger har konflikt
   *  på mål-datoen. Vises som rådgivende note — selve omdelingen sker manuelt
   *  i rute-sheet'et bagefter (vi flytter ikke tildelinger automatisk). */
  reassignSuggestions?: Array<{ conflictingName: string; suggestedName: string }>;
  loading?: boolean;
  onConfirm: () => Promise<void> | void;
};

export const MoveProjectedOccurrenceDialog = ({
  open, onOpenChange, routeName, fromDate, toDate,
  recurringAppointmentCount = 0,
  syncNext, onSyncNextChange, syncStart, onSyncStartChange,
  warnings, suggestedFreeDate, onPickSuggestedDate, autoSkipCadence,
  reassignSuggestions,
  loading, onConfirm,
}: Props) => {
  const [submitError, setSubmitError] = useState<{ title: string; description?: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => { if (open) { setSubmitError(null); setSubmitting(false); } }, [open]);
  const fmt = (d: string) => {
    try { return format(parseISO(d), "EEEE d. MMM yyyy", { locale: da }); }
    catch { return d; }
  };
  const fmtShort = (d: string) => {
    try { return format(parseISO(d), "EEEE d. MMM", { locale: da }); }
    catch { return d; }
  };

  let deltaDays = 0;
  try { deltaDays = differenceInCalendarDays(parseISO(toDate), parseISO(fromDate)); } catch {}

  // Projicerede flytninger er altid “kun denne forekomst”. Rytme-/serie-sync
  // hører kun til MoveRouteDateDialog for faktiske ruter.
  const showSync = false;

  const showSuggestion = !!warnings?.length && !!suggestedFreeDate && suggestedFreeDate !== toDate;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="left-4 right-4 top-4 max-h-[calc(100svh-2rem)] w-auto max-w-none translate-x-0 translate-y-0 overflow-y-auto overflow-x-hidden p-4 sm:left-1/2 sm:right-auto sm:top-1/2 sm:w-[min(92vw,32rem)] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:p-6">
        <AlertDialogHeader className="min-w-0 text-left space-y-2">
          <SheetHeaderBlock
            icon={<CalendarRange className="h-4 w-4" />}
            title={<AlertDialogTitle className="text-base">Flyt rute til ny dato</AlertDialogTitle>}
          />
          <AlertDialogDescription asChild>
            <div className="min-w-0 space-y-2 text-sm">
              <p className="text-muted-foreground">
                Du flytter kun denne ene forekomst. Resten af serien forbliver uændret.
              </p>
              <div className="min-w-0 text-foreground">
                <span className="block min-w-0 [overflow-wrap:anywhere] rounded-md border border-border bg-secondary/30 px-2.5 py-2 font-medium sm:truncate">{routeName}</span>
              </div>
              <div className="grid min-w-0 gap-2 text-muted-foreground tabular-nums sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] sm:items-center">
                <span className="min-w-0 [overflow-wrap:anywhere] rounded-md border border-border bg-secondary/30 px-2.5 py-2 capitalize sm:truncate">{fromDate ? fmt(fromDate) : "—"}</span>
                <ArrowRight className="mx-auto h-3 w-3 shrink-0 rotate-90 sm:rotate-0" />
                <span className="min-w-0 [overflow-wrap:anywhere] rounded-md border border-border bg-secondary/30 px-2.5 py-2 font-medium capitalize text-foreground sm:truncate">{toDate ? fmt(toDate) : "—"}</span>
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
          <div className="rounded-md border border-border bg-secondary/30 p-2.5">
            <div className="flex items-start gap-2">
              <Info className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
              <div className="text-[11px] leading-snug text-muted-foreground space-y-1">
                <p>
                  <span className="capitalize text-foreground font-medium">{fromDate ? fmtShort(fromDate) : "—"}</span> bliver tom,
                  og ruten dukker op på <span className="capitalize text-foreground font-medium">{toDate ? fmtShort(toDate) : "—"}</span> i stedet.
                  Resten af serien fortsætter som før.
                </p>
                {recurringAppointmentCount > 0 && (
                  <p className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {recurringAppointmentCount} aftale{recurringAppointmentCount === 1 ? "" : "r"} flyttes kun for denne dato.
                  </p>
                )}
              </div>
            </div>
          </div>

          {autoSkipCadence && (
            <div className="rounded-md border border-accent/40 bg-accent/5 p-2.5">
              <div className="flex items-start gap-2">
                <SkipForward className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                <div className="text-[11px] leading-snug">
                  <div className="font-semibold text-foreground mb-0.5">Den naturlige forekomst på samme dag springes over</div>
                  <p className="text-muted-foreground">
                    Serien ville normalt også køre på <span className="capitalize text-foreground">{toDate ? fmtShort(toDate) : ""}</span>. Den dag bliver automatisk markeret som sprunget over, så der ikke ligger to forekomster oven i hinanden.
                  </p>
                </div>
              </div>
            </div>
          )}

          {reassignSuggestions && reassignSuggestions.length > 0 && (
            <div className="rounded-md border border-accent/40 bg-accent/5 p-2.5">
              <div className="flex items-start gap-2">
                <Users className="h-3.5 w-3.5 text-accent mt-0.5 shrink-0" />
                <div className="text-[11px] leading-snug min-w-0">
                  <div className="font-semibold text-foreground mb-0.5">
                    Foreslåede medarbejder-erstatninger
                  </div>
                  <p className="text-muted-foreground mb-1">
                    Følgende medarbejdere er allerede booket på den nye dato. Du kan tildele en kollega bagefter i rute-panelet.
                  </p>
                  <ul className="space-y-0.5">
                    {reassignSuggestions.map((s, i) => (
                      <li key={i} className="text-foreground">
                        <span className="font-medium">{s.conflictingName}</span>
                        <span className="text-muted-foreground"> → </span>
                        <span className="font-medium">{s.suggestedName}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}

          {warnings && warnings.length > 0 && (
            <div className="rounded-md border border-amber-300/60 bg-amber-50 dark:bg-amber-950/30 p-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[11px] font-semibold text-amber-900 dark:text-amber-200 mb-0.5">
                    Vær opmærksom på den nye dato
                  </div>
                  <ul className="text-[11px] leading-snug text-amber-900/90 dark:text-amber-200/90 space-y-0.5">
                    {warnings.map((w, i) => <li key={i}>• {w}</li>)}
                  </ul>
                  {showSuggestion && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={() => onPickSuggestedDate?.(suggestedFreeDate!)}
                      disabled={loading}
                      className="mt-2 h-7 text-[11px] gap-1"
                    >
                      <Sparkles className="h-3 w-3" />
                      Brug <span className="capitalize">{fmtShort(suggestedFreeDate!)}</span> i stedet
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {showSync && (
            <div className="rounded-md border border-border p-3 space-y-3">
              <div className="flex items-start gap-2">
                <Repeat className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-foreground">
                    Skal de tilbagevendende aftaler følge med?
                  </div>
                  <p className="text-[11px] leading-snug text-muted-foreground">
                    {recurringAppointmentCount} aftale{recurringAppointmentCount === 1 ? "" : "r"} på ruten gentager sig automatisk. Vælg hvad der skal ske med deres rytme.
                  </p>
                </div>
              </div>

              {onSyncNextChange !== undefined && (
                <label className="flex items-start gap-2 cursor-pointer rounded-md border border-border/60 bg-secondary/20 p-2 hover:bg-secondary/40 transition-colors">
                  <Checkbox
                    checked={!!syncNext}
                    onCheckedChange={(v) => onSyncNextChange(v === true)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 text-xs leading-snug">
                    <span className="block font-medium text-foreground">Flyt kun næste besøg</span>
                    <span className="block text-[11px] text-muted-foreground">Aftalernes næste planlagte dato rykkes til den nye dato. Besøget efter falder tilbage i den normale rytme.</span>
                  </span>
                </label>
              )}

              {onSyncStartChange !== undefined && (
                <label className="flex items-start gap-2 cursor-pointer rounded-md border border-border/60 bg-secondary/20 p-2 hover:bg-secondary/40 transition-colors">
                  <Checkbox
                    checked={!!syncStart}
                    onCheckedChange={(v) => onSyncStartChange(v === true)}
                    className="mt-0.5"
                  />
                  <span className="min-w-0 text-xs leading-snug">
                    <span className="block font-medium text-foreground">Forskyd hele rytmen</span>
                    <span className="block text-[11px] text-muted-foreground">Aftalernes opstartsdato flyttes med, så alle fremtidige besøg lander på den nye ugedag.</span>
                  </span>
                </label>
              )}
            </div>
          )}
        </div>

        <AlertDialogFooter className="pt-1">
          {submitError && (
            <div
              role="alert"
              className="basis-full order-first w-full rounded-md border border-destructive/40 bg-destructive/5 p-2.5 animate-in fade-in-0 slide-in-from-top-1 duration-200"
            >
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-destructive mt-0.5 shrink-0" />
                <div className="min-w-0 text-[12px] leading-snug">
                  <div className="font-semibold text-destructive">{submitError.title}</div>
                  {submitError.description && (
                    <p className="text-destructive/90 mt-0.5">{submitError.description}</p>
                  )}
                </div>
              </div>
            </div>
          )}
          <AlertDialogCancel disabled={loading || submitting}>Fortryd</AlertDialogCancel>
          <Button
            onClick={async () => {
              setSubmitError(null);
              setSubmitting(true);
              try {
                await onConfirm();
              } catch (e: any) {
                const issue = mapPostgresError(e);
                setSubmitError({
                  title: issue.title || "Kunne ikke flytte rute",
                  description: issue.hint ? `${issue.message}\n${issue.hint}` : issue.message,
                });
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={loading || submitting}
          >
            {(loading || submitting) && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
            Flyt denne dag
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};