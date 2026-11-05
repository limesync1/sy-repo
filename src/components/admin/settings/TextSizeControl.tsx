import { useState } from "react";
import { Type } from "lucide-react";
import { TEXT_SIZES, readTextSize, saveTextSize, type TextSizeKey } from "@/lib/text-size";

/** Store, tydelige knapper til at gøre al tekst større. */
export function TextSizeControl() {
  const [size, setSize] = useState<TextSizeKey>(readTextSize);
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4 shadow-sm sm:flex-row sm:items-center">
      <div className="flex min-w-0 items-center gap-2 sm:w-56 sm:shrink-0">
        <Type className="h-5 w-5 text-foreground" aria-hidden />
        <div>
          <p className="text-base font-semibold text-foreground">Tekststørrelse</p>
          <p className="text-sm text-muted-foreground">Gør al tekst lettere at læse</p>
        </div>
      </div>
      <div role="radiogroup" aria-label="Tekststørrelse" className="flex flex-wrap gap-2">
        {TEXT_SIZES.map((s) => {
          const active = s.key === size;
          return (
            <button
              key={s.key}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => { setSize(s.key); saveTextSize(s.key); }}
              className={`min-h-12 min-w-24 rounded-md border px-4 font-semibold transition-colors ${
                active
                  ? "border-foreground bg-foreground text-background"
                  : "border-border bg-card text-foreground hover:bg-secondary"
              }`}
              style={{ fontSize: `${s.pct / 100}rem` }}
            >
              {s.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
