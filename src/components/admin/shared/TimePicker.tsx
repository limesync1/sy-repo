import { useState } from "react";
import { Clock } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const SLOTS = (() => {
  const out: string[] = [];
  for (let h = 0; h < 24; h++) for (let m = 0; m < 60; m += 15) out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
  return out;
})();

/** Fælles tidsvælger med 15-min slots — samme udtryk som Åbningstider i Indstillinger. */
export const TimePicker = ({ value, onChange, label, placeholder = "Vælg tid" }: {
  value: string; onChange: (v: string) => void; label?: string; placeholder?: string;
}) => {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="inline-flex h-9 min-w-[92px] items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-2.5 text-sm font-medium tabular-nums text-foreground transition-colors hover:border-foreground/40 focus:border-foreground focus:outline-none"
        >
          <Clock className="h-3.5 w-3.5 text-muted-foreground" />
          {value || <span className="text-muted-foreground">{placeholder}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[112px] p-1">
        <div
          className="max-h-64 overflow-y-auto overscroll-contain"
          onWheel={(e) => e.stopPropagation()}
          ref={(el) => { if (el && open) el.querySelector<HTMLElement>("[data-active='true']")?.scrollIntoView({ block: "center" }); }}
        >
          {SLOTS.map((t) => (
            <button
              key={t}
              type="button"
              data-active={t === value || (!value && t === "09:00")}
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

export default TimePicker;
