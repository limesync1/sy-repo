// Genbrugelig klokkeslæt-popover med 15-min slots. Bruges både i
// åbningstider og i notifikations-tidsplanlæggeren, så det visuelle sprog
// er ens på tværs af virksomhedsindstillinger.
import { useState } from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const TIME_SLOTS: string[] = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) {
    for (const m of [0, 15, 30, 45]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

type Props = {
  value: string;
  onChange: (v: string) => void;
  label?: string;
  className?: string;
};

export const TimePickerPopover = ({ value, onChange, label, className }: Props) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className={cn(
            "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-sm tabular-nums font-medium text-foreground transition-colors hover:border-foreground/40 focus:border-foreground focus:outline-none",
            className,
          )}
        >
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {value || "--:--"}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[112px] p-1">
        <div className="max-h-64 overflow-y-auto">
          {TIME_SLOTS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => { onChange(t); setOpen(false); }}
              className={cn(
                "block w-full rounded-md px-2 py-1.5 text-center text-sm tabular-nums transition-colors",
                t === value ? "bg-foreground text-background" : "text-foreground hover:bg-secondary",
              )}
            >
              {t}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};