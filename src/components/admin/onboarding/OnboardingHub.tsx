import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Check, ChevronRight, ChevronLeft, Sparkles, X, ArrowRight,
  PartyPopper, Building2, Wrench, Users, Route as RouteIcon,
  Image as ImageIcon, Rocket, Tag, Clock, type LucideIcon,
} from "lucide-react";
import {
  useOnboardingProgress, useUpdateOnboardingProgress, useCompleteOnboardingStep,
} from "@/hooks/useOnboarding";
import { useServices } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";

/**
 * OnboardingHub — én sammenhængende onboarding-oplevelse:
 *
 *  1. **Velkomst-wizard** (fuldskærms-dialog): vises kun ved allerførste login,
 *     og kun indtil brugeren enten gennemfører den eller eksplicit lukker den.
 *     Den introducerer platformen kort og guider direkte til de kritiske trin.
 *
 *  2. **Inline-checklist** (kort i toppen af panelet): vises altid så længe
 *     der er ufærdige kerne-trin. Hvert trin har et tydeligt CTA der åbner
 *     den rigtige fane. Når alt er gjort skjules kortet helt — og dukker
 *     ikke op igen.
 *
 * Trin opdateres automatisk når deres betingelse er sand (fx services-trinnet
 * markeres som fuldført så snart virksomheden har én service oprettet).
 */

type Step = {
  id: string;
  title: string;
  description: string;
  cta: string;
  href: string;
  icon: LucideIcon;
  /** Returnerer true hvis dette step bør tælle som færdigt baseret på data. */
  isDone: (ctx: Ctx) => boolean;
  /** Optional: skjul trin hvis ikke relevant for denne virksomhed. */
  isRelevant?: (ctx: Ctx) => boolean;
};

type Ctx = {
  business: any;
  servicesCount: number;
  employeesCount: number;
};

const buildSteps = (ctx: Ctx): Step[] => {
  const settingsHref = "/virksomhed?tab=settings";
  const all: Step[] = [
    {
      id: "company-info",
      title: "Udfyld virksomhedsoplysninger",
      description: "Beskrivelse, telefon og adresse — så kunderne ved hvem I er, og leads kan finde jer.",
      cta: "Åbn indstillinger",
      href: settingsHref,
      icon: Building2,
      isDone: ({ business }) =>
        !!business?.description?.trim() && !!business?.phone?.trim() && !!business?.address?.trim(),
    },
    {
      id: "categories",
      title: "Vælg brancher og kategorier",
      description: "Vælg de brancher og underkategorier I tilbyder, så jeres profil dukker op de rigtige steder.",
      cta: "Vælg brancher",
      href: settingsHref,
      icon: Tag,
      isDone: ({ business }) => {
        const cats = (business?.categories as string[]) || (business?.category ? [business.category] : []);
        return Array.isArray(cats) && cats.length > 0;
      },
    },
    {
      id: "opening-hours",
      title: "Tilføj åbningstider",
      description: "Lad kunder vide hvornår I er åbne — så I ikke mister henvendelser uden for åbningstid.",
      cta: "Sæt åbningstider",
      href: settingsHref,
      icon: Clock,
      isDone: ({ business }) => {
        const hrs = business?.opening_hours;
        if (!hrs || typeof hrs !== "object") return false;
        return Object.values(hrs).some((v: any) => typeof v === "string" && v.trim().length > 0);
      },
    },
    {
      id: "branding",
      title: "Tilføj logo og forsidebillede",
      description: "Et professionelt udtryk gør stor forskel for kundernes tillid.",
      cta: "Tilføj billeder",
      href: settingsHref,
      icon: ImageIcon,
      isDone: ({ business }) => !!business?.logo_url,
    },
    {
      id: "services",
      title: "Opret jeres første service",
      description: "Uden services kan kunder ikke booke. Vælg fast pris, timepris eller en prisberegner.",
      cta: "Opret service",
      href: "/virksomhed?tab=services",
      icon: Wrench,
      isDone: ({ servicesCount }) => servicesCount > 0,
    },
    {
      id: "employees",
      title: "Inviter jeres medarbejdere",
      description: "Giv teamet adgang til medarbejder-appen, så I kan tildele opgaver.",
      cta: "Tilføj medarbejder",
      href: "/virksomhed?tab=employees",
      icon: Users,
      isDone: ({ employeesCount }) => employeesCount > 0,
      isRelevant: ({ business }) => !!(business?.settings as any)?.route_planning_enabled,
    },
    {
      id: "route-planning",
      title: "Planlæg jeres første rute",
      description: "Træk dagens aftaler ind i kalenderen og tildel dem til jeres team.",
      cta: "Åbn ruteplanlægger",
      href: "/virksomhed/ruter",
      icon: RouteIcon,
      // Kan kun markeres færdig manuelt eller via "Spring over".
      isDone: () => false,
      isRelevant: ({ business }) => !!(business?.settings as any)?.route_planning_enabled,
    },
  ];
  return all.filter((s) => (s.isRelevant ? s.isRelevant(ctx) : true));
};

export const OnboardingHub = ({ business }: { business: any }) => {
  const navigate = useNavigate();
  const { data: services } = useServices(business?.id);
  const { data: employees } = useEmployees(business?.id);
  const { data: progress, isLoading } = useOnboardingProgress(business?.id);
  const updateProgress = useUpdateOnboardingProgress(business?.id);
  const completeStep = useCompleteOnboardingStep(business?.id);

  const ctx: Ctx = useMemo(() => ({
    business,
    servicesCount: services?.length || 0,
    employeesCount: employees?.length || 0,
  }), [business, services, employees]);

  const steps = useMemo(() => buildSteps(ctx), [ctx]);

  const isDone = (s: Step) =>
    s.isDone(ctx) ||
    !!progress?.completed_steps?.includes(s.id) ||
    !!progress?.skipped_steps?.includes(s.id);

  const doneCount = steps.filter(isDone).length;
  const total = steps.length;
  const allDone = total > 0 && doneCount === total;
  const pct = total === 0 ? 100 : Math.round((doneCount / total) * 100);

  // Auto-sync færdige trin til DB så vi kan vise den rigtige status overalt.
  useEffect(() => {
    if (!progress || isLoading) return;
    const auto = steps
      .filter((s) => s.isDone(ctx))
      .map((s) => s.id)
      .filter((id) => !progress.completed_steps.includes(id));
    if (auto.length > 0) {
      updateProgress.mutate({
        completed_steps: Array.from(new Set([...progress.completed_steps, ...auto])),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    services?.length, employees?.length, business?.logo_url,
    business?.description, business?.phone, business?.address,
    JSON.stringify(business?.categories), JSON.stringify(business?.opening_hours),
  ]);

  // Markér onboarding som færdig når alle trin er overstået.
  useEffect(() => {
    if (!progress || !allDone || progress.fully_completed_at) return;
    updateProgress.mutate({ fully_completed_at: new Date().toISOString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allDone, progress?.fully_completed_at]);

  /* ───────── Velkomst-wizard ───────── */
  // Vises ved allerførste login (ingen progress-række endnu) — eller indtil
  // brugeren har dismissed den. Lukker man, kommer den ikke igen.
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardStep, setWizardStep] = useState(0);

  useEffect(() => {
    if (isLoading) return;
    if (!progress && !wizardOpen) {
      // Helt ny virksomhed — åbn velkomst-wizard
      setWizardStep(0);
      setWizardOpen(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, progress?.id]);

  const wizardSlides = [
    {
      icon: Rocket,
      title: `Velkommen, ${business?.name || "ny virksomhed"}!`,
      body: "Vi guider jer hurtigt i gang med Serviceydere. Det tager omkring 10 minutter at få det vigtigste på plads — og I kan altid vende tilbage til guiden senere.",
    },
    {
      icon: Building2,
      title: "Først: jeres profil",
      body: "Beskrivelse, kontaktoplysninger, brancher og åbningstider. Det er fundamentet for at kunder og leads kan finde jer.",
    },
    {
      icon: Wrench,
      title: "Derefter: jeres services",
      body: "Opret de ydelser I tilbyder med priser. Brug fast pris, timepris eller prisberegner med kvadratmeter, antal eller timer.",
    },
    {
      icon: Sparkles,
      title: "Klar til at gå i gang?",
      body: "Vi har sat en checkliste op i toppen af panelet. Klik dig igennem trinene i det tempo der passer jer — kortet forsvinder når alt er gjort.",
    },
  ];

  const closeWizard = (markStarted = true) => {
    setWizardOpen(false);
    if (markStarted && !progress) {
      // Opret tom progress-række så wizarden ikke åbner igen næste gang
      updateProgress.mutate({ wizard_dismissed: true, current_step: steps[0]?.id ?? null });
    }
  };

  const goToFirstStep = () => {
    closeWizard(true);
    if (steps[0]) navigate(steps[0].href);
  };

  /* ───────── Inline checklist ───────── */
  // Find aktivt anbefalet trin = første ufærdige
  const activeStep = steps.find((s) => !isDone(s));
  const showChecklist = !isLoading && !!business && !allDone && !wizardOpen && !!progress;

  const handleSkip = (s: Step) => {
    const skipped = new Set(progress?.skipped_steps || []);
    skipped.add(s.id);
    updateProgress.mutate({ skipped_steps: Array.from(skipped) });
  };

  const handleMarkDone = (s: Step) => {
    completeStep.mutate(s.id);
  };

  return (
    <>
      {/* ───── Velkomst-wizard (kun første gang) ───── */}
      <Dialog open={wizardOpen} onOpenChange={(v) => { if (!v) closeWizard(true); }}>
        <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden border-0 shadow-2xl">
          <div className="relative bg-gradient-to-br from-foreground to-foreground/90 px-8 py-12 text-background text-center">
            <button
              onClick={() => closeWizard(true)}
              className="absolute right-3 top-3 rounded-md p-1.5 text-background/60 hover:bg-background/10 hover:text-background transition-colors"
              aria-label="Luk"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-background/10 backdrop-blur-sm">
              {(() => {
                const Icon = wizardSlides[wizardStep].icon;
                return <Icon className="h-7 w-7" />;
              })()}
            </div>
            <h2 className="text-xl font-semibold leading-tight">
              {wizardSlides[wizardStep].title}
            </h2>
            <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-background/70">
              {wizardSlides[wizardStep].body}
            </p>
          </div>

          {/* Progress dots */}
          <div className="flex items-center justify-center gap-1.5 bg-card pt-5">
            {wizardSlides.map((_, i) => (
              <span
                key={i}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  i === wizardStep ? "w-6 bg-foreground" : "w-1.5 bg-border",
                )}
              />
            ))}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between gap-2 bg-card px-5 py-4">
            <Button
              variant="ghost" size="sm"
              onClick={() => setWizardStep((i) => Math.max(0, i - 1))}
              disabled={wizardStep === 0}
              className="gap-1"
            >
              <ChevronLeft className="h-4 w-4" /> Tilbage
            </Button>
            {wizardStep < wizardSlides.length - 1 ? (
              <Button
                size="sm"
                onClick={() => setWizardStep((i) => i + 1)}
                className="gap-1"
              >
                Næste <ChevronRight className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={goToFirstStep} className="gap-1">
                Lad os gå i gang <ArrowRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* ───── Inline checklist-kort i toppen af panelet ───── */}
      {showChecklist && activeStep && (
        <ChecklistCard
          steps={steps}
          activeStep={activeStep}
          isDone={isDone}
          doneCount={doneCount}
          total={total}
          pct={pct}
          onCta={() => navigate(activeStep.href)}
          onSkip={() => handleSkip(activeStep)}
          onMarkDone={() => handleMarkDone(activeStep)}
          onJumpToStep={(s) => navigate(s.href)}
        />
      )}

      {/* ───── Færdig-modal — vises ÉN gang når sidste trin tikker af ───── */}
      <CompletionToast
        show={allDone && !!progress && !progress.fully_completed_at}
      />
    </>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */

type ChecklistCardProps = {
  steps: Step[];
  activeStep: Step;
  isDone: (s: Step) => boolean;
  doneCount: number;
  total: number;
  pct: number;
  onCta: () => void;
  onSkip: () => void;
  onMarkDone: () => void;
  onJumpToStep: (s: Step) => void;
};

const ChecklistCard = ({
  steps, activeStep, isDone, doneCount, total, pct, onCta, onSkip, onMarkDone, onJumpToStep,
}: ChecklistCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const ActiveIcon = activeStep.icon;

  return (
    <div className="mb-4 overflow-hidden rounded-xl border border-border bg-card shadow-sm">
      {/* Top: anbefalet næste trin */}
      <div className="flex items-start gap-4 p-4 sm:p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-foreground text-background">
          <ActiveIcon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-5 items-center rounded-full bg-accent/10 px-2 text-[10px] font-semibold uppercase tracking-wide text-accent">
              Næste trin
            </span>
            <span className="text-xs font-medium text-muted-foreground tabular-nums">
              {doneCount} af {total} færdige
            </span>
          </div>
          <h3 className="mt-1 text-sm font-semibold text-foreground sm:text-base">
            {activeStep.title}
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground sm:text-sm">
            {activeStep.description}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={onCta} className="h-8 gap-1.5 text-xs">
              {activeStep.cta} <ArrowRight className="h-3.5 w-3.5" />
            </Button>
            <Button size="sm" variant="ghost" onClick={onMarkDone} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
              Markér som færdig
            </Button>
            <Button size="sm" variant="ghost" onClick={onSkip} className="h-8 px-2 text-xs text-muted-foreground hover:text-foreground">
              Spring over
            </Button>
          </div>
        </div>

        <button
          onClick={() => setExpanded((v) => !v)}
          className="hidden shrink-0 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors sm:inline-flex sm:items-center sm:gap-1"
          aria-expanded={expanded}
        >
          {expanded ? "Skjul liste" : "Se alle trin"}
          <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
        </button>
      </div>

      {/* Progress-bar */}
      <div className="px-4 pb-3 sm:px-5">
        <Progress value={pct} className="h-1" />
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-center justify-center gap-1 border-t border-border py-2 text-xs font-medium text-muted-foreground hover:bg-secondary/50 hover:text-foreground transition-colors sm:hidden"
      >
        {expanded ? "Skjul liste" : "Se alle trin"}
        <ChevronRight className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-90")} />
      </button>

      {/* Hele checklisten — kollapset som default */}
      {expanded && (
        <ol className="border-t border-border bg-secondary/30 py-1">
          {steps.map((s, i) => {
            const done = isDone(s);
            const active = s.id === activeStep.id;
            const StepIcon = s.icon;
            return (
              <li key={s.id}>
                <button
                  onClick={() => onJumpToStep(s)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors sm:px-5",
                    "hover:bg-background",
                  )}
                >
                  <span className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors",
                    done
                      ? "border-accent bg-accent text-accent-foreground"
                      : active
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background text-muted-foreground",
                  )}>
                    {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <StepIcon className={cn("h-4 w-4 shrink-0", done ? "text-muted-foreground" : "text-foreground")} />
                  <span className={cn(
                    "flex-1 truncate text-sm",
                    done ? "text-muted-foreground line-through" : "text-foreground font-medium",
                  )}>
                    {s.title}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────── */

/**
 * CompletionToast — vises som en lille fejringsdialog ÉN GANG når sidste trin
 * tikker af. Vi opdaterer fully_completed_at i baggrunden så den ikke kommer igen.
 */
const CompletionToast = ({ show }: { show: boolean }) => {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (show) setOpen(true);
  }, [show]);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-0 gap-0 overflow-hidden border-0">
        <div className="bg-gradient-to-br from-accent/15 to-accent/5 px-6 py-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg">
            <PartyPopper className="h-7 w-7" />
          </div>
          <h3 className="text-lg font-semibold text-foreground">I er klar! 🎉</h3>
          <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
            I har gennemført alle de vigtigste trin. Jeres profil er klar til at modtage kunder.
          </p>
          <Button onClick={() => setOpen(false)} className="mt-6">Luk</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingHub;
