// QuickFilters — segmenteret chip-rude med antal pr. valg. Bruges som
// status-filter på Aftaler, Kunder og lignende lister så de visuelt matcher.
import * as React from "react";
import { cn } from "@/lib/utils";

export type QuickFilterOption<T extends string> = {
  key: T;
  label: string;
  count?: number;
};

export function QuickFilters<T extends string>({
  value,
  onChange,
  options,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: QuickFilterOption<T>[];
  className?: string;
}) {
  return (
    <div
      className={cn(
        "inline-flex flex-wrap items-center gap-0.5 rounded-lg border border-border bg-card p-0.5 shadow-sm",
        className,
      )}
    >
      {options.map((opt) => {
        const active = opt.key === value;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => onChange(opt.key)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              active
                ? "bg-foreground text-background shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
          >
            <span>{opt.label}</span>
            {typeof opt.count === "number" && opt.count > 0 && (
              <span
                className={cn(
                  "tabular-nums rounded-md px-1.5 py-0.5 text-[10px] font-semibold",
                  active ? "bg-background/20 text-current" : "bg-secondary text-foreground/70",
                )}
              >
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}