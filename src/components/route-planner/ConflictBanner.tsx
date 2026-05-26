import { useMemo, useState } from "react";
import { format, parseISO, isWithinInterval } from "date-fns";
import { da } from "date-fns/locale";
import { AlertTriangle, Wrench, X } from "lucide-react";

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
        if ((v.load_pct ?? 0) > 100) out.push(k);
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

  const overLabel = overCount > 0
    ? `${overCount} overbooket dag${overCount === 1 ? "" : "e"}`
    : null;
  const mismatchLabel = mismatchCount > 0
    ? `${mismatchCount} rute${mismatchCount === 1 ? "" : "r"} med manglende færdighed`
    : null;

  // Vis op til 4 datoer som hint
  const dateHints = overbookedDates.slice(0, 4)
    .map((d) => format(parseISO(d), "EEE d.", { locale: da }))
    .join(", ")
    + (overbookedDates.length > 4 ? ` +${overbookedDates.length - 4}` : "");

  return (
    <div className="m-2 mb-0 shrink-0 flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50/80 px-3 py-2 text-xs text-amber-900">
      <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0 space-y-0.5">
        <p className="font-semibold leading-tight">
          {[overLabel, mismatchLabel].filter(Boolean).join(" · ")}
        </p>
        <p className="text-amber-900/80 leading-tight">
          {overCount > 0 && <>Over kapacitet: <span className="font-medium">{dateHints}</span>. </>}
          {mismatchCount > 0 && <span className="inline-flex items-center gap-1"><Wrench className="h-3 w-3" /> Tjek medarbejder-tildelinger på markerede ruter.</span>}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setDismissed(dismissKey)}
        className="shrink-0 -m-1 p-1 rounded hover:bg-amber-100 text-amber-700"
        aria-label="Skjul advarsel"
        title="Skjul indtil næste ændring"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export default ConflictBanner;