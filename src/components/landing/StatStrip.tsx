import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * StatStrip — kort række med kvalitative nøglepunkter. Bevidst uden
 * fabrikerede tal: hvert punkt er en påstand vi reelt kan stå inde for.
 */
export type StatItem = { value: ReactNode; label: string; hint?: string };

const StatStrip = ({ items, tone = "light" }: { items: StatItem[]; tone?: "light" | "dark" }) => {
  const dark = tone === "dark";
  return (
    <div
      className={cn(
        "grid grid-cols-2 gap-px overflow-hidden rounded-2xl border lg:grid-cols-4",
        dark ? "border-ocean-foreground/15 bg-ocean-foreground/15" : "border-border bg-border",
      )}
    >
      {items.map((s) => (
        <div key={s.label} className={cn("p-5", dark ? "bg-ocean" : "bg-card")}>
          <p
            className={cn(
              "text-xl font-semibold tracking-tight sm:text-2xl",
              dark ? "text-ocean-foreground" : "text-foreground",
            )}
          >
            {s.value}
          </p>
          <p
            className={cn(
              "mt-1 text-[13px] font-medium",
              dark ? "text-ocean-foreground/80" : "text-foreground/80",
            )}
          >
            {s.label}
          </p>
          {s.hint && (
            <p className={cn("mt-0.5 text-xs leading-5", dark ? "text-ocean-foreground/60" : "text-muted-foreground")}>
              {s.hint}
            </p>
          )}
        </div>
      ))}
    </div>
  );
};

export default StatStrip;
