// Genbrugelig "Varighed + tidsrum" input — matcher det visuelle sprog fra
// route-planner StopDetailSheet, så kunden får samme oplevelse i CartSheet
// som ejeren har når de planlægger.

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Hourglass, Timer, Calendar as CalendarIcon } from "lucide-react";

const DURATION_PRESETS = [
  { hours: 0, minutes: 30, label: "30 min" },
  { hours: 1, minutes: 0, label: "1 time" },
  { hours: 1, minutes: 30, label: "1,5 time" },
  { hours: 2, minutes: 0, label: "2 timer" },
];

const TIME_WINDOW_PRESETS = [
  { start: "08:00", end: "12:00", label: "Formiddag" },
  { start: "12:00", end: "16:00", label: "Eftermiddag" },
  { start: "16:00", end: "20:00", label: "Aften" },
];
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
      <div className="rounded-[1rem] border border-border bg-card p-3">
        <Label className={labelClass}>
          <Hourglass className="inline h-3 w-3 mr-1 -mt-0.5" />
          Anslået varighed
        </Label>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DURATION_PRESETS.map((preset) => {
            const active = preset.hours === durationHours && preset.minutes === durationMinutes;
            return (
              <Button
                key={preset.label}
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onDurationChange(preset.hours, preset.minutes)}
                className={active ? "border-accent bg-accent text-accent-foreground hover:bg-accent/90" : "bg-background"}
              >
                {preset.label}
              </Button>
            );
          })}
        </div>
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
        <div className="rounded-[1rem] border border-border bg-card p-3">
          <Label className={labelClass}>
            <Timer className="inline h-3 w-3 mr-1 -mt-0.5" />
            Ønsket tidsrum (valgfrit)
          </Label>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {TIME_WINDOW_PRESETS.map((preset) => {
              const active = timeStart === preset.start && timeEnd === preset.end;
              return (
                <Button
                  key={preset.label}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onTimeChange(preset.start, preset.end)}
                  className={active ? "border-accent bg-accent text-accent-foreground hover:bg-accent/90" : "bg-background"}
                >
                  {preset.label}
                </Button>
              );
            })}
          </div>
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