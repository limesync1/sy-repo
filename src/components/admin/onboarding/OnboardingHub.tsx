import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import {
  Check, ChevronRight, ChevronLeft, Sparkles, X, ArrowRight,
  PartyPopper, Building2, Wrench, Users, Route as RouteIcon,
  Image as ImageIcon, Rocket, Tag, Clock, MessageCircle, Link2,
  FileText, Phone, Mail, Star, Share2, Megaphone, type LucideIcon,
} from "lucide-react";
import {
  useOnboardingProgress, useUpdateOnboardingProgress, useCompleteOnboardingStep,
} from "@/hooks/useOnboarding";
import { useServices } from "@/hooks/useDatabase";
import { useEmployees } from "@/hooks/useEmployees";
import { useReviews, useOrders } from "@/hooks/useDatabase";

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
  /**
   * Hvor stor forskel gør dette trin for forretningen?
   * 100 = blokerer kunder fra at booke (fx ingen services).
   *  80 = stærkt boost til konvertering (logo, beskrivelse, kategorier).
   *  60 = vigtigt for tillid/SEO (cover, åbningstider, telefon).
   *  40 = optimering (livechat, ekstra services).
   *  20 = polish (slug, ekstra trin).
   */
  impact: number;
  /** Andre step-id'er der bør være færdige før dette giver mening at vise. */
  dependsOn?: string[];
};

type Ctx = {
  business: any;
  servicesCount: number;
  employeesCount: number;
  reviewsCount: number;
  averageRating: number;
  ordersCount: number;
  pendingOrdersCount: number;
  /** Dage siden sidste ordre — null hvis aldrig haft ordrer. */
  daysSinceLastOrder: number | null;
  /** Dage siden virksomheden blev oprettet. */
  ageInDays: number;
};

const buildSteps = (ctx: Ctx): Step[] => {
  const settingsHref = "/virksomhed?tab=settings";
  const business = ctx.business;
  const settings = (business?.settings as any) || {};
  const description = (business?.description || "").trim();
  const hasCategories = Array.isArray(business?.categories) && business.categories.length > 0;
  const hasCoreContact =
    !!business?.description?.trim() && !!business?.phone?.trim() && !!business?.address?.trim();

  const all: Step[] = [
    {
      id: "company-info",
      title: "Udfyld virksomhedsoplysninger",
      description: "Skriv en kort beskrivelse, telefon og adresse — så kunderne ved hvem I er, og leads kan finde jer.",
      cta: "Udfyld nu",
      href: settingsHref,
      icon: Building2,
      isDone: ({ business }) =>
        !!business?.description?.trim() && !!business?.phone?.trim() && !!business?.address?.trim(),
      impact: 90,
    },
    {
      id: "categories",
      title: "Vælg brancher og kategorier",
      description: "Kryds af hvad I tilbyder — det bestemmer hvilke kunder der finder jer på Serviceydere.",
      cta: "Vælg brancher",
      href: settingsHref,
      icon: Tag,
      isDone: ({ business }) => {
        const cats = (business?.categories as string[]) || (business?.category ? [business.category] : []);
        return Array.isArray(cats) && cats.length > 0;
      },
      impact: 95,
    },
    {
      id: "opening-hours",
      title: "Tilføj åbningstider",
      description: "Lad kunderne vide hvornår I tager telefonen — så I ikke mister henvendelser uden for åbningstid.",
      cta: "Sæt tider",
      href: settingsHref,
      icon: Clock,
      isDone: ({ business }) => {
        const hrs = business?.opening_hours;
        if (!hrs || typeof hrs !== "object") return false;
        return Object.values(hrs).some((v: any) => typeof v === "string" && v.trim().length > 0);
      },
      impact: 60,
    },
    {
      id: "branding",
      title: "Tilføj jeres logo",
      description: "Et logo gør jer langt mere troværdige. Det vises øverst på jeres profil og overalt I dukker op.",
      cta: "Upload logo",
      href: settingsHref,
      icon: ImageIcon,
      isDone: ({ business }) => !!business?.logo_url,
      impact: 75,
    },
    {
      id: "cover-image",
      title: "Tilføj et forsidebillede",
      description: "Et stort billede øverst på profilen viser kunderne jeres arbejde, hold eller butik. Profiler med forsidebillede får markant flere henvendelser.",
      cta: "Upload forsidebillede",
      href: settingsHref,
      icon: ImageIcon,
      isDone: ({ business }) => !!business?.cover_image_url || !!business?.cover_url,
      // Vis kun hvis logo allerede er på plads — ellers er det dobbelt-besked
      isRelevant: ({ business }) => !!business?.logo_url,
      impact: 55,
      dependsOn: ["branding"],
    },
    {
      id: "good-description",
      title: "Gør jeres beskrivelse stærkere",
      description: "Jeres beskrivelse er lidt kort. 2-4 sætninger om hvad I gør, hvor I gør det, og hvorfor I er gode, øger kundernes tillid mærkbart.",
      cta: "Skriv mere",
      href: settingsHref,
      icon: FileText,
      // Kun relevant hvis der ER en beskrivelse, men den er for kort til at virke overbevisende
      isRelevant: () => description.length > 0 && description.length < 80,
      isDone: () => description.length >= 80,
      impact: 65,
    },
    {
      id: "contact-email",
      title: "Tilføj en kontakt-e-mail",
      description: "E-mail bruges når kunder ikke kan ringe — og når vi sender jer kvitteringer og notifikationer. Manglende e-mail koster jer typisk 1 ud af 5 leads.",
      cta: "Tilføj e-mail",
      href: settingsHref,
      icon: Mail,
      isRelevant: ({ business }) => !business?.email?.trim(),
      isDone: ({ business }) => !!business?.email?.trim(),
      impact: 70,
    },
    {
      id: "share-link",
      title: "Tjek og gem jeres link",
      description: "Vælg en kort, læsevenlig webadresse til jeres profil (fx /v/nord-rengoering). Den deler I på Facebook, visitkort og e-mail-signaturer.",
      cta: "Gennemgå link",
      href: settingsHref,
      icon: Link2,
      // Vis kun hvis slug er den autogenererede (typisk uuid-agtig eller meget lang)
      isRelevant: ({ business }) => {
        const slug = (business?.slug || "") as string;
        return slug.length === 0 || slug.length > 30 || /[0-9a-f]{8}/i.test(slug);
      },
      // Markeres færdig manuelt — vi ved ikke hvornår "godt nok" er
      isDone: () => false,
      impact: 25,
    },
    {
      id: "services",
      title: "Opret jeres første service",
      description: "Uden services kan kunderne ikke booke. Vælg fast pris, timepris eller en prisberegner.",
      cta: "Opret service",
      href: "/virksomhed?tab=services",
      icon: Wrench,
      isDone: ({ servicesCount }) => servicesCount > 0,
      impact: 100,
      dependsOn: ["categories"],
    },
    {
      id: "more-services",
      title: "Tilføj flere services",
      description: "I har én service oprettet — kunderne booker oftere når de kan se 3+ services. Tilføj fx en standard- og en premium-pakke.",
      cta: "Tilføj service",
      href: "/virksomhed?tab=services",
      icon: Wrench,
      isRelevant: ({ servicesCount }) => servicesCount > 0 && servicesCount < 3,
      isDone: ({ servicesCount }) => servicesCount >= 3,
      impact: 45,
      dependsOn: ["services"],
    },
    {
      id: "employees",
      title: "Inviter jeres medarbejdere",
      description: "Giv teamet adgang til medarbejder-appen, så I kan tildele opgaver og se hvem der har gjort hvad.",
      cta: "Tilføj medarbejder",
      href: "/virksomhed?tab=employees",
      icon: Users,
      isDone: ({ employeesCount }) => employeesCount > 0,
      isRelevant: ({ business }) => !!(business?.settings as any)?.route_planning_enabled,
      impact: 50,
    },
    {
      id: "route-planning",
      title: "Planlæg jeres første rute",
      description: "Træk dagens aftaler ind i kalenderen og tildel dem til jeres team — så ved alle hvad de skal hvornår.",
      cta: "Åbn ruteplanlægger",
      href: "/virksomhed/ruter",
      icon: RouteIcon,
      // Kan kun markeres færdig manuelt eller via "Spring over".
      isDone: () => false,
      isRelevant: ({ business, employeesCount }) =>
        !!(business?.settings as any)?.route_planning_enabled && employeesCount > 0,
      impact: 35,
      dependsOn: ["employees"],
    },
    {
      id: "enable-livechat",
      title: "Slå livechat til",
      description: "Med livechat kan besøgende stille spørgsmål direkte fra jeres profil — det forvandler nysgerrige besøgende til kunder. Slås til under Ekstra funktioner.",
      cta: "Aktivér livechat",
      href: `${settingsHref}#settings-advanced`,
      icon: MessageCircle,
      // Kun relevant når basis-profilen er på plads — ellers spilder I tid
      // på at chatte med folk før profilen overhovedet er klar.
      isRelevant: () => !settings.livechat_enabled && hasCoreContact,
      isDone: () => !!settings.livechat_enabled,
      impact: 40,
      dependsOn: ["company-info"],
    },
    {
      id: "set-phone-format",
      title: "Tjek jeres telefonnummer",
      description: "Telefonnummeret bør være på 8 cifre (med eller uden landekode). Det her er det vigtigste kontaktpunkt for nye kunder.",
      cta: "Ret telefonnummer",
      href: settingsHref,
      icon: Phone,
      isRelevant: ({ business }) => {
        const p = (business?.phone || "").replace(/\D/g, "");
        return p.length > 0 && p.length < 8;
      },
      isDone: ({ business }) => {
        const p = (business?.phone || "").replace(/\D/g, "");
        return p.length >= 8;
      },
      impact: 65,
    },
    /* ───────── Vækst-trin: aktiveres når basis er på plads ───────── */
    {
      id: "promote-profile",
      title: "Del jeres profil for første gang",
      description: "Profilen er klar — men kunderne finder den først når I deler linket. Læg det på jeres hjemmeside, Facebook eller e-mail-signatur.",
      cta: "Sådan deler I",
      href: settingsHref,
      icon: Share2,
      // Kun når basis er på plads, og I endnu ikke har fået ordrer i platformen.
      isRelevant: ({ ordersCount }) =>
        ordersCount === 0 && hasCoreContact && hasCategories && ctx.servicesCount > 0,
      isDone: ({ ordersCount }) => ordersCount > 0,
      impact: 80,
      dependsOn: ["services", "company-info"],
    },
    {
      id: "respond-to-reviews",
      title: "Svar på jeres anmeldelser",
      description: "Når I svarer på anmeldelser viser I nye kunder at I tager feedback alvorligt. Det øger tilliden markant — også ved kritiske anmeldelser.",
      cta: "Gå til anmeldelser",
      href: "/virksomhed?tab=reviews",
      icon: MessageCircle,
      // Vis kun ved lave/blandede anmeldelser hvor det virkelig betyder noget
      isRelevant: ({ reviewsCount, averageRating }) => reviewsCount >= 1 && averageRating < 4.5,
      isDone: () => false,
      impact: 55,
    },
    {
      id: "answer-pending",
      title: "Svar på jeres afventende bestillinger",
      description: "I har bestillinger der venter på svar. Kunder der ikke får svar inden for 2 timer går ofte videre til en konkurrent.",
      cta: "Gennemgå bestillinger",
      href: "/virksomhed?tab=orders",
      icon: Megaphone,
      isRelevant: ({ pendingOrdersCount }) => pendingOrdersCount > 0,
      isDone: ({ pendingOrdersCount }) => pendingOrdersCount === 0,
      impact: 100,
    },
    {
      id: "reactivate",
      title: "Få gang i bestillingerne igen",
      description: "I har ikke fået nye bestillinger i over 14 dage. Del jeres profil eller tilføj en ny pakke — det plejer at sætte gang i tingene.",
      cta: "Se hvad I kan gøre",
      href: "/virksomhed?tab=services",
      icon: Megaphone,
      isRelevant: ({ daysSinceLastOrder, ordersCount }) =>
        ordersCount > 0 && (daysSinceLastOrder ?? 0) >= 14,
      isDone: ({ daysSinceLastOrder }) => (daysSinceLastOrder ?? 999) < 7,
      impact: 70,
    },
  ];
  return all.filter((s) => (s.isRelevant ? s.isRelevant(ctx) : true));
};

export const OnboardingHub = ({ business }: { business: any }) => {
  const navigate = useNavigate();
  const { data: services } = useServices(business?.id);
  const { data: employees } = useEmployees(business?.id);
  const { data: reviews } = useReviews(business?.id);
  const { data: orders } = useOrders(business?.id);
  const { data: progress, isLoading } = useOnboardingProgress(business?.id);
  const updateProgress = useUpdateOnboardingProgress(business?.id);
  const completeStep = useCompleteOnboardingStep(business?.id);

  const ctx: Ctx = useMemo(() => {
    const reviewsCount = reviews?.length || 0;
    const averageRating = reviewsCount > 0
      ? (reviews!.reduce((sum, r: any) => sum + (r.rating || 0), 0) / reviewsCount)
      : 0;
    const ordersCount = orders?.length || 0;
    const pendingOrdersCount = (orders || []).filter((o: any) => o.status === "pending").length;
    const lastOrderTs = (orders || [])
      .map((o: any) => +new Date(o.created_at))
      .filter((n: number) => Number.isFinite(n))
      .sort((a: number, b: number) => b - a)[0];
    const daysSinceLastOrder = lastOrderTs
      ? Math.floor((Date.now() - lastOrderTs) / (1000 * 60 * 60 * 24))
      : null;
    const createdTs = business?.created_at ? +new Date(business.created_at) : Date.now();
    const ageInDays = Math.max(0, Math.floor((Date.now() - createdTs) / (1000 * 60 * 60 * 24)));
    return {
      business,
      servicesCount: services?.length || 0,
      employeesCount: employees?.length || 0,
      reviewsCount,
      averageRating,
      ordersCount,
      pendingOrdersCount,
      daysSinceLastOrder,
      ageInDays,
    };
  }, [business, services, employees, reviews, orders]);

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
    services?.length, employees?.length,
    business?.logo_url, business?.cover_image_url, business?.cover_url,
    business?.description, business?.phone, business?.address, business?.slug,
    JSON.stringify(business?.categories), JSON.stringify(business?.opening_hours),
    JSON.stringify(business?.settings),
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
  // Smart valg af aktivt trin:
  //  1) Spring trin over hvis dets `dependsOn` ikke er færdige (så vi ikke
  //     foreslår "tilføj rute" før medarbejderne overhovedet er inviteret).
  //  2) Vælg det trin med højest `impact` blandt de tilbageværende — så
  //     vi altid foreslår det der reelt rykker mest for forretningen lige nu.
  //  3) Ved ligeværdige impact: behold deklarations­rækkefølgen (basis først).
  const undone = steps.filter((s) => !isDone(s));
  const eligibleUndone = undone.filter((s) => {
    if (!s.dependsOn || s.dependsOn.length === 0) return true;
    return s.dependsOn.every((depId) => {
      const dep = steps.find((x) => x.id === depId);
      return !dep || isDone(dep);
    });
  });
  const pickList = eligibleUndone.length > 0 ? eligibleUndone : undone;
  const activeStep = pickList
    .map((s, i) => ({ s, i }))
    .sort((a, b) => (b.s.impact - a.s.impact) || (a.i - b.i))[0]?.s;
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
            <Button
              size="sm"
              variant="outline"
              onClick={onMarkDone}
              className="h-8 gap-1.5 px-2.5 text-xs text-foreground bg-card border-border hover:bg-secondary hover:text-foreground"
            >
              <Check className="h-3.5 w-3.5" /> Markér som færdig
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onSkip}
              className="h-8 px-2 text-xs text-muted-foreground hover:bg-secondary/70 hover:text-foreground"
            >
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
