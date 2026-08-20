import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * StepFlow — nummereret trin-forløb ("Sådan virker det").
 * Vandret på desktop med en tynd forbindelseslinje, lodret på mobil.
 */
export type Step = { title: string; body: string; icon?: ReactNode };

const StepFlow = ({ steps, tone = "light" }: { steps: Step[]; tone?: "light" | "dark" }) => {
  const dark = tone === "dark";
  return (
    <ol className="relative grid gap-6 sm:grid-cols-3 sm:gap-8">
      {/* Forbindelseslinje bag trinene — kun på desktop. */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute left-[12%] right-[12%] top-6 hidden h-px sm:block",
          dark ? "bg-ocean-foreground/20" : "bg-border",
        )}
      />
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex gap-4 sm:block">
          <span
            className={cn(
              "relative z-10 inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-sm font-bold",
              dark
                ? "bg-ocean-foreground text-ocean"
                : "bg-foreground text-background",
            )}
          >
            {s.icon ?? i + 1}
          </span>
          <div className="sm:mt-4">
            <h3
              className={cn(
                "text-[15px] font-semibold tracking-tight sm:text-base",
                dark ? "text-ocean-foreground" : "text-foreground",
              )}
            >
              {s.title}
            </h3>
            <p
              className={cn(
                "mt-1 text-[13px] leading-6",
                dark ? "text-ocean-foreground/70" : "text-muted-foreground",
              )}
            >
              {s.body}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
};

export default StepFlow;
