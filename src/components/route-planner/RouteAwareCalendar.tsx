// RouteAwareCalendar — Calendar med visuelle indikatorer for ruter pr. dag.
//
// Bruges i alle dato-popovers i ruteplanlæggeren (topbar, "Opret ny rute",
// "Rediger rute", "Flyt aftaler", ...) så brugeren med ét blik kan se hvilke
// dage der allerede har ruter, hvilke der er travle (høj load), og hvilke
// der er helt frie — uden at skulle lukke popoveren og kigge i kalenderen
// bagved.
//
// Renderer en lille prik under datotallet for hver kategori, plus en
// kompakt legende i bunden.

import { format } from "date-fns";
import { da } from "date-fns/locale";
import { Calendar, type CalendarProps } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

type ExtraProps = {
  /** Datoer (yyyy-MM-dd) der har mindst én rute. */
  routeDates?: Set<string> | null;
  /** Datoer (yyyy-MM-dd) med høj load (>= 90 %). */
  busyDates?: Set<string> | null;
  /** Datoer (yyyy-MM-dd) med overbelastning (>= 110 %). */
  overloadedDates?: Set<string> | null;
  /** Vis kompakt legende under kalenderen. Default: true. */
  showLegend?: boolean;
  /** Mindste tilladte dato (yyyy-MM-dd) — disabler tidligere datoer. */
  minDateIso?: string;
};
type Props = CalendarProps & ExtraProps;

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export const RouteAwareCalendar = ({
  routeDates,
  busyDates,
  overloadedDates,
  showLegend = true,
  minDateIso,
  disabled,
  className,
  ...rest
}: Props) => {
  const has = (set: Set<string> | null | undefined, d: Date) =>
    !!set && set.has(ymd(d));

  const disabledFn = (d: Date) => {
    if (minDateIso) {
      const cmp = ymd(d);
      if (cmp < minDateIso) return true;
    }
    if (typeof disabled === "function") return (disabled as (d: Date) => boolean)(d);
    return false;
  };

  return (
    <div className="flex flex-col">
      <Calendar
        // Calendar's prop type is a discriminated union over `mode`; we forward
        // it through `rest` so the consumer picks the right shape.
        locale={da}
        weekStartsOn={1}
        disabled={disabledFn}
        className={cn("p-3 pointer-events-auto", className)}
        modifiers={{
          hasRoute: (d) => has(routeDates, d) && !has(busyDates, d) && !has(overloadedDates, d),
          busy: (d) => has(busyDates, d) && !has(overloadedDates, d),
          overloaded: (d) => has(overloadedDates, d),
        }}
        modifiersClassNames={{
          hasRoute:
            "relative after:content-[''] after:absolute after:bottom-[3px] after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1 after:rounded-full after:bg-accent",
          busy:
            "relative font-semibold after:content-[''] after:absolute after:bottom-[3px] after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1.5 after:rounded-full after:bg-amber-500",
          overloaded:
            "relative font-semibold after:content-[''] after:absolute after:bottom-[3px] after:left-1/2 after:-translate-x-1/2 after:h-1 after:w-1.5 after:rounded-full after:bg-destructive",
        }}
        {...(rest as CalendarProps)}
      />
      {showLegend && (routeDates || busyDates || overloadedDates) && (
        <div className="flex items-center justify-center gap-3 border-t px-3 py-1.5 text-[10px] text-muted-foreground">
          {routeDates && (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Ruter
            </span>
          )}
          {busyDates && (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-2 rounded-full bg-amber-500" /> Travl
            </span>
          )}
          {overloadedDates && (
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-2 rounded-full bg-destructive" /> Overbooket
            </span>
          )}
        </div>
      )}
    </div>
  );
};