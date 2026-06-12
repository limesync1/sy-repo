// DatePickerField — popover-kalender med quick-actions (i dag, i morgen, +1 uge).
// Bruges i ruteplanlæggeren til at vælge route_date på en venlig, visuel måde.

import { useState } from "react";
import { format, parseISO, addDays, startOfWeek } from "date-fns";
import { da } from "date-fns/locale";
import { Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { RouteAwareCalendar } from "./RouteAwareCalendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type Props = {
  /** ISO yyyy-MM-dd */
  value: string;
  onChange: (newValue: string) => void;
  className?: string;
  /** Mindste tilladte dato (ISO yyyy-MM-dd). Default: ingen. */
  minDate?: string;
  /** Datoer der allerede har ruter — vises som accent-prik i kalenderen. */
  routeDates?: Set<string> | null;
  /** Datoer med høj load (>= 90 %) — vises som amber-prik. */
  busyDates?: Set<string> | null;
  /** Datoer med overbelastning (>= 110 %) — vises som rød prik. */
  overloadedDates?: Set<string> | null;
};

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

export const DatePickerField = ({
  value, onChange, className, minDate, routeDates, busyDates, overloadedDates,
}: Props) => {
  const [open, setOpen] = useState(false);
  const date = value ? parseISO(value) : undefined;

  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextMonday = startOfWeek(addDays(today, 7), { weekStartsOn: 1 });

  const quickPick = (d: Date) => {
    onChange(ymd(d));
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-9 bg-background",
            "hover:bg-secondary hover:text-foreground hover:border-border",
            !date && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
          {date ? (
            <span className="capitalize">{format(date, "EEEE d. MMMM yyyy", { locale: da })}</span>
          ) : (
            <span>Vælg dato</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        {/* Quick-knapper */}
        <div className="border-b p-2 flex flex-wrap gap-1">
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => quickPick(today)}>
            I dag
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => quickPick(tomorrow)}>
            I morgen
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => quickPick(nextMonday)}>
            Næste mandag
          </Button>
        </div>
        <RouteAwareCalendar
          mode="single"
          selected={date}
          onSelect={(d) => {
            if (d) {
              onChange(ymd(d));
              setOpen(false);
            }
          }}
          showOutsideDays
          minDateIso={minDate}
          routeDates={routeDates}
          busyDates={busyDates}
          overloadedDates={overloadedDates}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  );
};
