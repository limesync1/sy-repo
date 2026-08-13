// Ét trin-kort på "Kom godt i gang". Kollapset som standard: ikon, titel og
// CTA på én linje. Det aktuelle trin er udfoldet med beskrivelse, tip og
// eventuelle krav der mangler.
import { Check, ChevronDown, ArrowRight, Lock, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { OnboardingStep } from "./steps";
import type { OnboardingCounts } from "@/hooks/useOnboardingSignals";

type Props = {
  step: OnboardingStep;
  counts: OnboardingCounts;
  done: boolean;
  skipped: boolean;
  expanded: boolean;
  onToggleExpand: () => void;
  onNavigate: (tab: string) => void;
  onToggleSkip: () => void;
};

export default function OnboardingStepCard({
  step, counts, done, skipped, expanded, onToggleExpand, onNavigate, onToggleSkip,
}: Props) {
  const Icon = step.icon;
  const missing = (step.requires ?? []).filter((r) => !r.met(counts));
  const blocked = missing.length > 0 && !done;

  return (
    <div
      className={cn(
        "border-b border-border bg-card transition-colors last:border-b-0",
        done && "bg-secondary/30",
      )}
    >
      <div className="flex items-center gap-3 px-3 py-3 sm:px-4">
        <span
          className={cn(
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 text-[11px] font-bold tabular-nums",
            done
              ? "border-accent bg-accent text-accent-foreground"
              : "border-border bg-background text-muted-foreground",
          )}
          aria-hidden="true"
        >
          {done ? <Check className="h-4 w-4" /> : step.number}
        </span>

        <button
          type="button"
          onClick={onToggleExpand}
          aria-expanded={expanded}
          className="flex min-w-0 flex-1 items-center gap-2 text-left"
        >
          <Icon className="hidden h-4 w-4 shrink-0 text-muted-foreground sm:block" aria-hidden="true" />
          <span className="min-w-0">
            <span className={cn("block truncate text-sm font-semibold", done ? "text-muted-foreground" : "text-foreground")}>
              {step.title}
              {skipped && !step.isDone(counts) && (
                <span className="ml-2 rounded-full bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                  Sprunget over
                </span>
              )}
            </span>
            {!expanded && (
              <span className="block truncate text-[11px] leading-snug text-muted-foreground">{step.short}</span>
            )}
          </span>
          <ChevronDown
            className={cn("ml-auto h-4 w-4 shrink-0 text-muted-foreground transition-transform sm:hidden", expanded && "rotate-180")}
            aria-hidden="true"
          />
        </button>

        <Button
          size="sm"
          variant={done ? "ghost" : "default"}
          disabled={blocked}
          onClick={() => onNavigate(step.tab(counts))}
          className="hidden h-8 shrink-0 px-3 text-xs sm:inline-flex"
          title={blocked ? `Mangler: ${missing.map((m) => m.label).join(", ")}` : undefined}
        >
          {blocked ? <Lock className="mr-1 h-3 w-3" /> : null}
          {step.cta(counts)}
          {!blocked && <ArrowRight className="ml-1 h-3 w-3" />}
        </Button>
      </div>

      {expanded && (
        <div className="space-y-3 border-t border-border/60 bg-background/40 px-3 pb-4 pt-3 sm:px-4 sm:pl-[3.25rem]">
          <p className="text-sm leading-relaxed text-foreground/85">{step.body}</p>

          {step.tip && (
            <div className="flex gap-2 rounded-lg border border-border bg-secondary/40 px-3 py-2">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
              <p className="text-[11px] leading-snug text-muted-foreground">{step.tip}</p>
            </div>
          )}

          {missing.length > 0 && !done && (
            <div className="rounded-lg border border-border bg-card px-3 py-2">
              <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Mangler først
              </p>
              <ul className="space-y-1">
                {missing.map((r) => (
                  <li key={r.label} className="flex items-center gap-2 text-xs text-foreground">
                    <span className="h-1.5 w-1.5 rounded-full bg-destructive" aria-hidden="true" />
                    <span className="flex-1">{r.label}</span>
                    <button
                      type="button"
                      onClick={() => onNavigate(r.tab)}
                      className="text-[11px] font-semibold text-foreground underline underline-offset-2"
                    >
                      Ordn nu
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              disabled={blocked}
              onClick={() => onNavigate(step.tab(counts))}
              className="h-8 px-3 text-xs sm:hidden"
            >
              {step.cta(counts)}
              <ArrowRight className="ml-1 h-3 w-3" />
            </Button>
            {!step.isDone(counts) && (
              <button
                type="button"
                onClick={onToggleSkip}
                className="text-[11px] font-medium text-muted-foreground underline underline-offset-2 hover:text-foreground"
              >
                {skipped ? "Fortryd spring over" : "Spring dette trin over"}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
