// Genbrugelig "Varighed + tidsrum" input — matcher det visuelle sprog fra
// route-planner StopDetailSheet, så kunden får samme oplevelse i CartSheet
// som ejeren har når de planlægger.

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Hourglass, Timer, Calendar as CalendarIcon } from "lucide-react";
import { DatePickerField } from "@/components/route-planner/DatePickerField";

type Props = {
  durationHours: number;
  durationMinutes: number;
  onDurationChange: (hours: number, minutes: number) => void;
  timeStart: string;
  timeEnd: string;
  onTimeChange: (start: string, end: string) => void;
  /** Kompakt variant (mindre padding/font) når brugt inline i et kort. */
  compact?: boolean;
  /** Skjul tidsrumsfeltet hvis kun varighed skal vises. */
  hideTimeWindow?: boolean;
  /** Valgfri foreslået dato (ISO yyyy-mm-dd). Vises som første felt hvis onDateChange er sat. */
  date?: string;
  onDateChange?: (date: string) => void;
  dateLabel?: string;
  dateHint?: string;
};

export const DurationTimePicker = ({
  durationHours,
  durationMinutes,
  onDurationChange,
  timeStart,
  timeEnd,
  onTimeChange,
  compact = false,
  hideTimeWindow = false,
  date,
  onDateChange,
  dateLabel = "Foreslået dato",
  dateHint,
}: Props) => {
  const inputClass = compact ? "h-8 text-xs" : "h-9";
  const labelClass = compact
    ? "text-[10px] font-medium uppercase tracking-wider text-muted-foreground"
    : "text-xs font-medium uppercase tracking-wider text-muted-foreground";

  return (
    <div className="space-y-3">
      {/* Foreslået dato (valgfri) — vises kun hvis onDateChange er givet */}
      {onDateChange && (
        <div>
          <Label className={labelClass}>
            <CalendarIcon className="inline h-3 w-3 mr-1 -mt-0.5" />
            {dateLabel}
          </Label>
          <div className="mt-1.5">
            <DatePickerField value={date || ""} onChange={onDateChange} />
          </div>
          {dateHint && (
            <p className="text-[10px] text-muted-foreground mt-1">{dateHint}</p>
          )}
        </div>
      )}

      {/* Varighed: timer + minutter */}
      <div>
        <Label className={labelClass}>
          <Hourglass className="inline h-3 w-3 mr-1 -mt-0.5" />
          Anslået varighed
        </Label>
        <div className="flex gap-2 mt-1.5 items-end">
          <div className="flex-1">
            <Input
              type="number"
              min={0}
              max={12}
              value={durationHours}
              onChange={(e) =>
                onDurationChange(
                  Math.max(0, Math.min(12, Number(e.target.value) || 0)),
                  durationMinutes,
                )
              }
              className={`${inputClass} text-center tabular-nums`}
              aria-label="Timer"
            />
            <p className="text-[10px] text-muted-foreground text-center mt-0.5">
              timer
            </p>
          </div>
          <span className="text-muted-foreground pb-5">:</span>
          <div className="flex-1">
            <Input
              type="number"
              min={0}
              max={59}
              step={5}
              value={durationMinutes}
              onChange={(e) =>
                onDurationChange(
                  durationHours,
                  Math.max(0, Math.min(59, Number(e.target.value) || 0)),
                )
              }
              className={`${inputClass} text-center tabular-nums`}
              aria-label="Minutter"
            />
            <p className="text-[10px] text-muted-foreground text-center mt-0.5">
              minutter
            </p>
          </div>
        </div>
      </div>

      {/* Tidsrum (valgfrit) */}
      {!hideTimeWindow && (
        <div>
          <Label className={labelClass}>
            <Timer className="inline h-3 w-3 mr-1 -mt-0.5" />
            Ønsket tidsrum (valgfrit)
          </Label>
          <div className="flex gap-2 items-center mt-1.5">
            <Input
              type="time"
              value={timeStart}
              onChange={(e) => onTimeChange(e.target.value, timeEnd)}
              className={`${inputClass} flex-1`}
              aria-label="Fra"
            />
            <span className="text-muted-foreground text-xs">–</span>
            <Input
              type="time"
              value={timeEnd}
              onChange={(e) => onTimeChange(timeStart, e.target.value)}
              className={`${inputClass} flex-1`}
              aria-label="Til"
            />
          </div>
          <p className="text-[10px] text-muted-foreground mt-1">
            Lad være tomt hvis du er fleksibel
          </p>
        </div>
      )}
    </div>
  );
};