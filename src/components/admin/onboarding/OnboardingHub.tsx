import { useMemo, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Check, ChevronRight, Sparkles, X, Clock, ArrowRight, PartyPopper,
} from "lucide-react";
import {
  useOnboardingProgress, useUpdateOnboardingProgress, useCompleteOnboardingStep,
} from "@/hooks/useOnboarding";
import { ONBOARDING_STEPS, visibleSteps, type OnboardingStep, type StepCtx } from "./onboarding-steps";
import { useServices } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import { useBusinessPlan } from "@/hooks/useBusinessPlan";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Letvægts-tjek: har virksomheden mindst én rute? */
const useHasAnyRoute = (businessId: string | undefined) =>
  useQuery({
    queryKey: ["onboarding-routes-count", businessId],
    enabled: !!businessId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("routes")
        .select("id", { count: "exact", head: true })
        .eq("business_id", businessId!);
      if (error) throw error;
      return count || 0;
    },
    staleTime: 30_000,
  });

/**
 * OnboardingHub — den centrale "guide mig i gang" oplevelse.
 *
 * Tre dele i ét:
 *  1. **Auto-wizard**: åbnes automatisk første gang virksomheden ikke har
 *     dismissed wizarden og ikke har gennemført alle relevante trin.
 *  2. **Floating launcher** (cirkel nederst til højre): viser fremgang og
 *     genåbner wizarden — altid tilgængelig.
 *  3. **Checklist-modus**: når wizarden åbnes igen efter dismiss, vises den
 *     som en oversigt over alle trin man kan klikke direkte ind i.
 *
 * Trin markeres automatisk som færdige når deres `isDone(ctx)` er sand
 * (fx services-trinnet bliver grønt så snart virksomheden har én service).
 * Brugeren kan også manuelt markere et trin som "Færdig" eller "Spring over".
 */

type OnboardingHubProps = {
  business: any;
};

export const OnboardingHub = ({ business }: OnboardingHubProps) => {
  const navigate = useNavigate();
  const { data: plan } = useBusinessPlan(business?.id);
  const { data: services } = useServices(business?.id);
  const { data: employees } = useEmployees(business?.id);
  const { data: routesCount } = useHasAnyRoute(business?.id);
  const { data: progress, isLoading } = useOnboardingProgress(business?.id);
  const updateProgress = useUpdateOnboardingProgress(business?.id);
  const completeStep = useCompleteOnboardingStep(business?.id);

  const ctx: StepCtx = useMemo(() => ({
    business,
    plan,
    servicesCount: services?.length || 0,
    employeesCount: employees?.length || 0,
    routesCount: routesCount || 0,
  }), [business, plan, services, employees, routesCount]);

  const steps = useMemo(() => visibleSteps(ctx), [ctx]);

  // Et trin er færdigt hvis det enten er manuelt markeret ELLER opfylder isDone-betingelsen.
  const isStepDone = (step: OnboardingStep) => {
    if (progress?.completed_steps?.includes(step.id)) return true;
    return step.isDone(ctx);
  };
  const isStepSkipped = (step: OnboardingStep) =>
    !!progress?.skipped_steps?.includes(step.id);

  const doneCount = steps.filter((s) => isStepDone(s) || isStepSkipped(s)).length;
  const totalCount = steps.length;
  const allDone = totalCount > 0 && doneCount === totalCount;
  const pct = totalCount === 0 ? 100 : Math.round((doneCount / totalCount) * 100);

  // Auto-markér færdige trin i DB så fremgang er korrekt på tværs af enheder.
  useEffect(() => {
    if (!progress || isLoading) return;
    const newlyDone = steps
      .filter((s) => s.isDone(ctx))
      .map((s) => s.id)
      .filter((id) => !progress.completed_steps.includes(id));
    if (newlyDone.length > 0) {
      const merged = Array.from(new Set([...progress.completed_steps, ...newlyDone]));
      updateProgress.mutate({ completed_steps: merged });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [services?.length, employees?.length, routesCount, business?.logo_url, business?.description, plan?.payment_last4]);

  // Markér hele onboardingen som "færdig" når alle trin er overstået.
  useEffect(() => {
    if (!progress || !allDone || progress.fully_completed_at) return;
    updateProgress.mutate({ fully_completed_at: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone, progress?.fully_completed_at]);

  // Wizard-dialog state
  const [open, setOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);

  // Åbn automatisk første gang (kun hvis intet er færdigt og brugeren ikke har dismissed).
  useEffect(() => {
    if (isLoading) return;
    const isFirstTime = !progress;
    const notDismissedAndNotDone =
      progress && !progress.wizard_dismissed && !progress.fully_completed_at && doneCount < totalCount;
    if (isFirstTime || notDismissedAndNotDone) {
      // Hop direkte til første ufærdige trin
      const firstUnfinished = Math.max(
        0,
        steps.findIndex((s) => !isStepDone(s) && !isStepSkipped(s)),
      );
      setStepIndex(firstUnfinished === -1 ? 0 : firstUnfinished);
      setOpen(true);
    }
    // Kør kun ved mount / når progress hentes første gang
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

  if (isLoading || !business) return null;
  if (totalCount === 0) return null;

  const currentStep = steps[stepIndex];

  const handleStepCta = (step: OnboardingStep) => {
    setOpen(false);
    navigate(step.href);
  };

  const handleMarkDone = (step: OnboardingStep) => {
    completeStep.mutate(step.id);
  };

  const handleSkip = (step: OnboardingStep) => {
    const skipped = new Set(progress?.skipped_steps || []);
    skipped.add(step.id);
    updateProgress.mutate({ skipped_steps: Array.from(skipped) });
  };

  const handleDismiss = () => {
    setOpen(false);
    updateProgress.mutate({ wizard_dismissed: true });
  };

  const handleReopen = () => {
    const firstUnfinished = steps.findIndex((s) => !isStepDone(s) && !isStepSkipped(s));
    setStepIndex(firstUnfinished === -1 ? 0 : firstUnfinished);
    updateProgress.mutate({ wizard_dismissed: false });
    setOpen(true);
  };

  return (
    <>
      {/* Floating launcher — vises altid (medmindre alt er færdigt og dialog er lukket).
          Klik åbner checklist/wizard. */}
      {(!allDone || open) && (
        <button
          onClick={handleReopen}
          className={cn(
            "fixed bottom-6 right-6 z-30 flex items-center gap-3 rounded-full border border-border bg-card px-4 py-3 shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5",
            "max-w-[calc(100vw-2rem)]",
          )}
          aria-label="Åbn onboarding-guide"
        >
          <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-background">
            <Sparkles className="h-4 w-4" />
            <svg className="absolute inset-0 h-9 w-9 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="16" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
              <circle
                cx="18" cy="18" r="16" fill="none"
                stroke="hsl(var(--accent))" strokeWidth="2"
                strokeDasharray={`${(pct / 100) * 100.53} 100.53`}
                strokeLinecap="round"
                className="transition-all duration-500"
              />
            </svg>
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-foreground">
              {allDone ? "Du er klar! 🎉" : "Kom godt i gang"}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {doneCount} af {totalCount} trin færdige
            </p>
          </div>
        </button>
      )}

      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
          {/* Header med samlet fremgang — vises på ALLE skærme */}
          <div className="border-b border-border bg-secondary/40 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Velkommen til Serviceydere
                </p>
                <h2 className="mt-0.5 text-lg font-semibold text-foreground truncate">
                  Lad os få {business.name} klar
                </h2>
              </div>
              <button
                onClick={handleDismiss}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
                aria-label="Luk"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-3 flex items-center gap-3">
              <Progress value={pct} className="h-1.5 flex-1" />
              <span className="shrink-0 text-xs font-medium text-muted-foreground tabular-nums">
                {doneCount}/{totalCount}
              </span>
            </div>
          </div>

          {/* Indhold: hvis alt er færdigt → fejringsskærm. Ellers → trin-detaljer + checklist. */}
          {allDone ? (
            <div className="px-6 py-10 text-center">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/15 text-accent">
                <PartyPopper className="h-7 w-7" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">Alt er klar!</h3>
              <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
                Du har gennemført alle trin. Du kan altid genåbne guiden fra knappen
                nederst i hjørnet.
              </p>
              <Button onClick={() => setOpen(false)} className="mt-5">Færdig</Button>
            </div>
          ) : (
            <div className="grid md:grid-cols-[260px_1fr]">
              {/* Sidebar med checklist */}
              <ol className="border-b md:border-b-0 md:border-r border-border bg-background py-2 max-h-[60vh] overflow-y-auto">
                {steps.map((s, i) => {
                  const done = isStepDone(s);
                  const skipped = isStepSkipped(s);
                  const active = i === stepIndex;
                  return (
                    <li key={s.id}>
                      <button
                        onClick={() => setStepIndex(i)}
                        className={cn(
                          "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition-colors",
                          active
                            ? "bg-secondary text-foreground"
                            : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                        )}
                      >
                        <span className={cn(
                          "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold",
                          done
                            ? "border-accent bg-accent text-accent-foreground"
                            : skipped
                              ? "border-muted-foreground/40 bg-muted text-muted-foreground"
                              : active
                                ? "border-foreground bg-foreground text-background"
                                : "border-border bg-background",
                        )}>
                          {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                        </span>
                        <span className={cn("truncate", done && "line-through opacity-70")}>
                          {s.title}
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ol>

              {/* Detalje-pane for valgt trin */}
              {currentStep && (
                <div className="flex flex-col">
                  <div className="flex-1 px-6 py-5">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      <span>Ca. {currentStep.estMinutes} min</span>
                      {isStepDone(currentStep) && (
                        <Badge variant="secondary" className="ml-1 gap-1 text-accent">
                          <Check className="h-3 w-3" /> Færdig
                        </Badge>
                      )}
                      {isStepSkipped(currentStep) && (
                        <Badge variant="secondary" className="ml-1">Sprunget over</Badge>
                      )}
                    </div>
                    <div className="mt-3 flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground">
                        <currentStep.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-semibold text-foreground">{currentStep.title}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{currentStep.description}</p>
                      </div>
                    </div>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button onClick={() => handleStepCta(currentStep)} className="gap-1.5">
                        {currentStep.cta} <ArrowRight className="h-4 w-4" />
                      </Button>
                      {!isStepDone(currentStep) && (
                        <Button variant="outline" onClick={() => handleMarkDone(currentStep)}>
                          Markér som færdig
                        </Button>
                      )}
                      {!isStepDone(currentStep) && !isStepSkipped(currentStep) && (
                        <Button variant="ghost" onClick={() => handleSkip(currentStep)}>
                          Spring over
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Footer med næste/forrige */}
                  <div className="flex items-center justify-between border-t border-border bg-secondary/30 px-6 py-3">
                    <Button
                      variant="ghost" size="sm"
                      disabled={stepIndex === 0}
                      onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                    >
                      Forrige
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Trin {stepIndex + 1} af {totalCount}
                    </span>
                    <Button
                      size="sm"
                      disabled={stepIndex === totalCount - 1}
                      onClick={() => setStepIndex((i) => Math.min(totalCount - 1, i + 1))}
                      className="gap-1"
                    >
                      Næste <ChevronRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};

export default OnboardingHub;