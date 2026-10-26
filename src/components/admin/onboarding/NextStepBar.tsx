// Slank "næste trin"-stribe der vises øverst på alle faner indtil opsætningen
// er færdig. Kan skjules for resten af sessionen.
import { useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getStep, type OnboardingStepId } from "./steps";
import type { OnboardingCounts } from "@/hooks/useOnboardingSignals";

const SESSION_KEY = "serviceydere.onboarding.barHidden";

type Props = {
  nextStepId: OnboardingStepId | null;
  counts: OnboardingCounts | undefined;
  completedCount: number;
  totalCount: number;
  onOpenGuide: () => void;
};

export default function NextStepBar({ nextStepId, counts, completedCount, totalCount, onOpenGuide }: Props) {
  const [hidden, setHidden] = useState(() => {
    if (typeof window === "undefined") return false;
    try { return sessionStorage.getItem(SESSION_KEY) === "1"; } catch { return false; }
  });

  if (hidden || !nextStepId || !counts) return null;
  const step = getStep(nextStepId);

  const hide = () => {
    setHidden(true);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch { /* ignore */ }
  };

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2 rounded-md border border-border bg-card px-3 py-2.5 shadow-sm">
      <span className="hidden shrink-0 rounded-full bg-secondary px-2 py-0.5 text-[10px] font-bold tabular-nums text-muted-foreground sm:inline">
        {completedCount}/{totalCount}
      </span>
      <p className="min-w-0 basis-full flex-1 break-words text-sm sm:basis-auto">
        <span className="font-semibold text-foreground">Næste trin: </span>
        <span className="text-muted-foreground">{step.title} — {step.short}</span>
      </p>
      <Button size="sm" variant="outline" className="h-11 shrink-0 px-3 text-sm" onClick={onOpenGuide}>
        Åbn guide
        <ArrowRight className="ml-1 h-3 w-3" />
      </Button>
      <Button variant="ghost" size="icon"
        type="button"
        onClick={hide}
        aria-label="Skjul næste trin"
        className="h-11 w-11 shrink-0 rounded-md text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
