import { useMemo, useState } from "react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { da } from "date-fns/locale";
import { AlertTriangle, Wrench, X } from "lucide-react";
import { cn } from "@/lib/utils";

// Tolerance før en dag kategoriseres som overbooket. Vi accepterer 15 %
// over kapacitet før vi alarmerer — dels for at undgå falske alarmer ved
// små afrundinger i RPC'en, dels fordi en arbejdsdag i praksis kan rumme
// lidt buffer uden problemer.
// Tolerance før en dag kategoriseres som overbooket. Vi tillader op til
// 30 % over nominel kapacitet — i praksis svarer det til ca. 10½ timers
// arbejde for en 8-timers dag, hvilket de fleste medarbejdere fint kan
// nå en travl dag uden at "overbooking" er reelt et problem.
const OVERBOOK_PCT_THRESHOLD = 130;
// Kræv også at der faktisk er booket meningsfuldt arbejde — så en dag
// med en lille kapacitet (fx 1 medarbejder med 2 timer) ikke straks
// vises som "overbooked" når der lægges en enkelt aftale ind.
// Mindst 13 timers reelt booket arbejde + kørsel før vi flagger dagen
// som overbooket. Det giver plads til lange men håndterbare dage uden
// at trigger advarsler unødigt.
const OVERBOOK_MIN_BOOKED_MIN = 780;

/**
 * Vedvarende konflikt-banner øverst i rute-kalenderen.
 * Samler de mest aktuelle alarmer i én linje:
 *  • Dage hvor (arbejde + kørsel) overstiger kapacitet (load_pct > 100)
 *  • Ruter hvor tildelt medarbejder mangler en påkrævet færdighed
 *
 * Banneret kan lukkes — det dukker først op igen når nye konflikter opstår
 * (et nyt antal trigger en ny "key"). Holdes uden for kalenderens scroll,
 * så det altid er synligt.
 */
type Props = {
  capacityByDate: Map<string, { load_pct: number; minutes_booked: number; minutes_capacity: number }>;
  mismatchedRouteIds: Set<string>;
  rangeStart: string; // yyyy-MM-dd
  rangeEnd: string;
};

export const ConflictBanner = ({ capacityByDate, mismatchedRouteIds, rangeStart, rangeEnd }: Props) => {
  const overbookedDates = useMemo(() => {
    const out: string[] = [];
    const start = parseISO(rangeStart);
    const end = parseISO(rangeEnd);
    capacityByDate.forEach((v, k) => {
      try {
        const d = parseISO(k);
        if (!isWithinInterval(d, { start, end })) return;
        if (
          (v.load_pct ?? 0) >= OVERBOOK_PCT_THRESHOLD &&
          (v.minutes_booked ?? 0) >= OVERBOOK_MIN_BOOKED_MIN
        ) {
          out.push(k);
        }
      } catch { /* ignore */ }
    });
    return out.sort();
  }, [capacityByDate, rangeStart, rangeEnd]);

  const mismatchCount = mismatchedRouteIds.size;
  const overCount = overbookedDates.length;

  const dismissKey = `${overCount}-${mismatchCount}-${rangeStart}`;
  const [dismissed, setDismissed] = useState<string | null>(null);

  if (overCount === 0 && mismatchCount === 0) return null;
  if (dismissed === dismissKey) return null;

  // Vis op til 3 datoer som chips
  const dateChips = overbookedDates.slice(0, 3).map((d) => ({
    key: d,
    label: format(parseISO(d), "EEE d. MMM", { locale: da }),
  }));
  const extraDates = overbookedDates.length - dateChips.length;

  return (
    <div
      className={cn(
        // Integreret strip — fylder hele kalenderens bredde og hænger
        // sammen med toolbar/kalender (ingen flydende kort-margin).
        "shrink-0 border-y border-amber-300/70 bg-amber-50/85 px-3 py-1.5 text-amber-900",
        "dark:border-amber-500/25 dark:bg-amber-500/10 dark:text-amber-100",
      )}
      role="status"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-amber-200/70 text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">
          <AlertTriangle className="h-3.5 w-3.5" />
        </span>

        <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
          {overCount > 0 && (
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-semibold whitespace-nowrap">
                {overCount === 1 ? "1 overbooket dag" : `${overCount} overbookede dage`}
              </span>
              <div className="flex flex-wrap items-center gap-1 min-w-0">
                {dateChips.map((d) => (
                  <span
                    key={d.key}
                    className="inline-flex items-center rounded-md bg-amber-100 px-1.5 py-0.5 text-[10.5px] font-medium capitalize tabular-nums dark:bg-amber-500/20"
                  >
                    {d.label}
                  </span>
                ))}
                {extraDates > 0 && (
                  <span className="inline-flex items-center rounded-md bg-amber-100/70 px-1.5 py-0.5 text-[10.5px] font-medium tabular-nums dark:bg-amber-500/15">
                    +{extraDates}
                  </span>
                )}
              </div>
            </div>
          )}

          {overCount > 0 && mismatchCount > 0 && (
            <span aria-hidden className="hidden sm:inline h-3 w-px bg-amber-400/40 dark:bg-amber-300/30" />
          )}

          {mismatchCount > 0 && (
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <Wrench className="h-3 w-3 shrink-0" />
              <span className="font-semibold">
                {mismatchCount === 1
                  ? "1 rute mangler færdighed"
                  : `${mismatchCount} ruter mangler færdighed`}
              </span>
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() => setDismissed(dismissKey)}
          className="shrink-0 inline-flex h-6 w-6 items-center justify-center rounded-md text-amber-700/80 hover:bg-amber-100 hover:text-amber-900 dark:text-amber-300 dark:hover:bg-amber-500/20 dark:hover:text-amber-100 transition-colors"
          aria-label="Skjul advarsel"
          title="Skjul indtil næste ændring"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};

export default ConflictBanner;