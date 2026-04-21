// DurationSlotPicker — popover-baseret UI til "tidsrum + varighed (+ valgfri dato)"
// med samme look-and-feel som ejerens StopDetailSheet → PlanningSection.
//
// Bruges fx i "Opret bestilling for kunde"-dialogen, så kunden får præcis
// samme visuelle sprog som ejeren oplever ved planlægning.

import { useState } from "react";
import { format, parseISO } from "date-fns";
import { da } from "date-fns/locale";
import { Clock, Hourglass, Calendar as CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DatePickerField } from "@/components/route-planner/DatePickerField";

const TIME_SLOTS: { value: string; short: string; label: string }[] = [
  { value: "06:00-08:00", short: "06–08", label: "Tidlig morgen" },
  { value: "08:00-12:00", short: "08–12", label: "Formiddag" },
  { value: "12:00-16:00", short: "12–16", label: "Eftermiddag" },
  { value: "16:00-20:00", short: "16–20", label: "Aften" },
  { value: "08:00-16:00", short: "08–16", label: "Hele dagen" },
];

const DURATION_PRESETS: { hours: number; minutes: number; label: string }[] = [
  { hours: 0, minutes: 15, label: "15 min" },
  { hours: 0, minutes: 30, label: "30 min" },
  { hours: 0, minutes: 45, label: "45 min" },
  { hours: 1, minutes: 0, label: "1 time" },
  { hours: 1, minutes: 30, label: "1½ time" },
  { hours: 2, minutes: 0, label: "2 timer" },
  { hours: 3, minutes: 0, label: "3 timer" },
  { hours: 4, minutes: 0, label: "4 timer" },
];

type Props = {
  /** "HH:MM-HH:MM" eller "" */
  timeSlot: string;
  onTimeSlotChange: (v: string) => void;
  durationHours: number;
  durationMinutes: number;
  onDurationChange: (hours: number, minutes: number) => void;

  /** Valgfri dato-vælger — vises som første felt hvis onDateChange er sat. */
  date?: string;
  onDateChange?: (date: string) => void;
  dateLabel?: string;
  dateHint?: string;

  /** Skjul hint-tekst under hvert felt (kompakt brug). */
  hideHints?: boolean;
  /** Layout: "stack" (default, label over felt vertikalt) eller "row" (3 kolonner side-om-side). */
  layout?: "stack" | "row";
};

export const DurationSlotPicker = ({
  timeSlot,
  onTimeSlotChange,
  durationHours,
  durationMinutes,
  onDurationChange,
  date,
  onDateChange,
  dateLabel = "Foreslået dato",
  dateHint,
  hideHints = false,
  layout = "stack",
}: Props) => {
  const [slotOpen, setSlotOpen] = useState(false);
  const [durOpen, setDurOpen] = useState(false);

  const selectedSlot = TIME_SLOTS.find((s) => s.value === timeSlot);
  const totalMin = durationHours * 60 + durationMinutes;
  const durationLabel = totalMin === 0
    ? "Vælg varighed"
    : durationHours === 0
      ? `${durationMinutes} min`
      : durationMinutes === 0
        ? `${durationHours} ${durationHours === 1 ? "time" : "timer"}`
        : `${durationHours} t ${durationMinutes} min`;

  const dateLabelText = date
    ? format(parseISO(date), "EEEE d. MMMM yyyy", { locale: da })
    : "Vælg dato";

  // Kompakt label-stil til row-layout.
  const fieldLabelCls =
    layout === "row"
      ? "text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
      : "";

  const dateField = onDateChange ? (
    <div className="space-y-1.5">
      <Label className={fieldLabelCls}>{dateLabel}</Label>
      <DatePickerField value={date || ""} onChange={onDateChange} />
      <span className="sr-only">{dateLabelText}</span>
    </div>
  ) : null;

  const timeSlotField = (
    <div className="space-y-1.5">
      <Label className={fieldLabelCls}>Tidsrum</Label>
      <Popover open={slotOpen} onOpenChange={setSlotOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-9 bg-background",
              "hover:bg-accent/10 hover:text-foreground hover:border-accent/40",
              !selectedSlot && "text-muted-foreground",
            )}
          >
            <Clock className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            {selectedSlot ? (
              <span className="truncate">
                <span className="font-medium tabular-nums">{selectedSlot.short}</span>
                {layout === "stack" && (
                  <span className="text-muted-foreground ml-2">· {selectedSlot.label}</span>
                )}
              </span>
            ) : (
              <span>Vælg tidsrum</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-2" align="start">
          <div className="space-y-1">
            {TIME_SLOTS.map((s) => {
              const active = s.value === timeSlot;
              return (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => { onTimeSlotChange(s.value); setSlotOpen(false); }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm text-left transition-colors",
                    active ? "bg-accent/15 text-foreground" : "hover:bg-accent/10",
                  )}
                >
                  <span className="font-semibold tabular-nums w-12 text-foreground">{s.short}</span>
                  <span className="text-muted-foreground flex-1">{s.label}</span>
                </button>
              );
            })}
            {timeSlot && (
              <>
                <div className="border-t my-1" />
                <button
                  type="button"
                  onClick={() => { onTimeSlotChange(""); setSlotOpen(false); }}
                  className="w-full text-left rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent/10"
                >
                  Ryd tidsrum
                </button>
              </>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  const durationField = (
    <div className="space-y-1.5">
      <Label className={fieldLabelCls}>Estimeret varighed</Label>
      <Popover open={durOpen} onOpenChange={setDurOpen}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal h-9 bg-background",
              "hover:bg-accent/10 hover:text-foreground hover:border-accent/40",
              totalMin === 0 && "text-muted-foreground",
            )}
          >
            <Hourglass className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
            <span className="font-medium truncate">{durationLabel}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[280px] p-3" align="start">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
            Hurtigvalg
          </p>
          <div className="grid grid-cols-4 gap-1.5 mb-3">
            {DURATION_PRESETS.map((p) => {
              const active = p.hours === durationHours && p.minutes === durationMinutes;
              return (
                <button
                  key={p.label}
                  type="button"
                  onClick={() => onDurationChange(p.hours, p.minutes)}
                  className={cn(
                    "h-8 rounded-md text-xs font-medium border transition-colors",
                    active
                      ? "bg-foreground text-background border-foreground"
                      : "bg-background hover:bg-accent/10 hover:border-accent/40",
                  )}
                >
                  {p.label}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
            Brugerdefineret
          </p>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Input
                type="number"
                min={0}
                max={23}
                value={durationHours}
                onChange={(e) =>
                  onDurationChange(
                    Math.max(0, Math.min(23, Number(e.target.value) || 0)),
                    durationMinutes,
                  )
                }
                className="h-9 text-center tabular-nums"
                aria-label="Timer"
              />
              <p className="text-[10px] text-center text-muted-foreground mt-1">timer</p>
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
                className="h-9 text-center tabular-nums"
                aria-label="Minutter"
              />
              <p className="text-[10px] text-center text-muted-foreground mt-1">min</p>
            </div>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );

  // Row-layout: dato + tidsrum + varighed side om side i ét grid + samlet hint.
  if (layout === "row") {
    return (
      <div className="space-y-2">
        <div
          className={cn(
            "grid gap-2.5",
            onDateChange ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2",
          )}
        >
          {dateField}
          {timeSlotField}
          {durationField}
        </div>
        {!hideHints && (
          <p className="text-[11px] text-muted-foreground">
            {onDateChange
              ? (dateHint || "Foreslået dato, ønsket tidsrum og estimeret varighed — kunden kan bekræfte eller ændre.")
              : "Ønsket tidsrum og estimeret varighed — bruges til at planlægge ruten."}
          </p>
        )}
        <CalendarIcon className="hidden" aria-hidden />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Foreslået dato (valgfrit) */}
      {onDateChange && (
        <div className="space-y-2">
          <Label>{dateLabel}</Label>
          <DatePickerField value={date || ""} onChange={onDateChange} />
          {!hideHints && (
            <p className="text-[11px] text-muted-foreground">
              {dateHint || "Hvilken dag besøget foreslås."}
            </p>
          )}
          {/* Vi viser ikke dateLabelText her — DatePickerField viser allerede den valgte dato */}
          <span className="sr-only">{dateLabelText}</span>
        </div>
      )}

      {/* Tidsrum */}
      <div className="space-y-2">
        <Label>Tidsrum</Label>
        <Popover open={slotOpen} onOpenChange={setSlotOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-9 bg-background",
                "hover:bg-accent/10 hover:text-foreground hover:border-accent/40",
                !selectedSlot && "text-muted-foreground",
              )}
            >
              <Clock className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              {selectedSlot ? (
                <span>
                  <span className="font-medium tabular-nums">{selectedSlot.short}</span>
                  <span className="text-muted-foreground ml-2">· {selectedSlot.label}</span>
                </span>
              ) : (
                <span>Vælg tidsrum</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-2" align="start">
            <div className="space-y-1">
              {TIME_SLOTS.map((s) => {
                const active = s.value === timeSlot;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => { onTimeSlotChange(s.value); setSlotOpen(false); }}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-md px-2.5 py-1.5 text-sm text-left transition-colors",
                      active ? "bg-accent/15 text-foreground" : "hover:bg-accent/10",
                    )}
                  >
                    <span className="font-semibold tabular-nums w-12 text-foreground">{s.short}</span>
                    <span className="text-muted-foreground flex-1">{s.label}</span>
                  </button>
                );
              })}
              {timeSlot && (
                <>
                  <div className="border-t my-1" />
                  <button
                    type="button"
                    onClick={() => { onTimeSlotChange(""); setSlotOpen(false); }}
                    className="w-full text-left rounded-md px-2.5 py-1.5 text-xs text-muted-foreground hover:bg-accent/10"
                  >
                    Ryd tidsrum
                  </button>
                </>
              )}
            </div>
          </PopoverContent>
        </Popover>
        {!hideHints && (
          <p className="text-[11px] text-muted-foreground">
            Hvornår på dagen besøget skal udføres.
          </p>
        )}
      </div>

      {/* Varighed */}
      <div className="space-y-2">
        <Label>Estimeret varighed</Label>
        <Popover open={durOpen} onOpenChange={setDurOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              className={cn(
                "w-full justify-start text-left font-normal h-9 bg-background",
                "hover:bg-accent/10 hover:text-foreground hover:border-accent/40",
                totalMin === 0 && "text-muted-foreground",
              )}
            >
              <Hourglass className="mr-2 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="font-medium">{durationLabel}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-[280px] p-3" align="start">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
              Hurtigvalg
            </p>
            <div className="grid grid-cols-4 gap-1.5 mb-3">
              {DURATION_PRESETS.map((p) => {
                const active = p.hours === durationHours && p.minutes === durationMinutes;
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => onDurationChange(p.hours, p.minutes)}
                    className={cn(
                      "h-8 rounded-md text-xs font-medium border transition-colors",
                      active
                        ? "bg-foreground text-background border-foreground"
                        : "bg-background hover:bg-accent/10 hover:border-accent/40",
                    )}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5 font-semibold">
              Brugerdefineret
            </p>
            <div className="flex items-center gap-2">
              <div className="flex-1">
                <Input
                  type="number"
                  min={0}
                  max={23}
                  value={durationHours}
                  onChange={(e) =>
                    onDurationChange(
                      Math.max(0, Math.min(23, Number(e.target.value) || 0)),
                      durationMinutes,
                    )
                  }
                  className="h-9 text-center tabular-nums"
                  aria-label="Timer"
                />
                <p className="text-[10px] text-center text-muted-foreground mt-1">timer</p>
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
                  className="h-9 text-center tabular-nums"
                  aria-label="Minutter"
                />
                <p className="text-[10px] text-center text-muted-foreground mt-1">min</p>
              </div>
            </div>
          </PopoverContent>
        </Popover>
        {!hideHints && (
          <p className="text-[11px] text-muted-foreground">
            Bruges til at planlægge ruten omkring besøget.
          </p>
        )}
      </div>

      {/* Lille usynlig brug af CalendarIcon for at undgå tree-shake-fjernelse hvis vi ikke bruger den */}
      <CalendarIcon className="hidden" aria-hidden />
    </div>
  );
};