import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Rocket, Tags, Calculator, Users, Wrench, ShoppingCart, Route as RouteIcon,
  UserPlus, Sparkles, X, ArrowRight, Check,
  type LucideIcon,
} from "lucide-react";

/**
 * OnboardingHub — den officielle "kom-godt-i-gang" guide til virksomhedspanelet.
 *
 * Guiden åbner KUN når brugeren selv beder om det via `?guide=1` (typisk fra
 * "Se guide til panelet" på Overblik). Den følger den anbefalede rækkefølge
 * for at få et nyt firma i drift — fra brancher i indstillinger, til regnskab,
 * medarbejdere, services, første bestilling og endelig tildeling til en rute.
 * Hver slide har en CTA der hopper direkte til den fane brugeren skal arbejde
 * i — så guiden fungerer som en checkliste, ikke kun som tekst.
 */

type Slide = {
  icon: LucideIcon;
  step?: number;
  title: string;
  body: string;
  /** Hvor "Åbn ..." knappen tager brugeren hen. Hvis udeladt vises ingen CTA. */
  tab?: string;
  /** Tekst på CTA-knappen (default: "Åbn"). */
  cta?: string;
  /** Vigtigt tip — vises som fremhævet kort under teksten. */
  tip?: string;
};

const buildSlides = (businessName?: string): Slide[] => [
  {
    icon: Rocket,
    title: `Velkommen, ${businessName || "ny virksomhed"}!`,
    body:
      "Guiden tjekker selv om I har gjort hvert trin og markerer dem færdige automatisk. I behøver ikke krydse manuelt af — kør bare videre i panelet, og statussen herinde opdaterer sig selv.",
  },
  {
    icon: Tags,
    step: 1,
    tab: "settings",
    cta: "Åbn indstillinger",
    title: "Trin 1 — Vælg brancher og underkategorier",
    body:
      "Start altid med Indstillinger. Vælg de brancher og underkategorier I tilbyder (fx Rengøring → Privatrengøring). Det styrer hvor I bliver vist på Serviceydere, og hvilke felter der dukker op på services og bestillinger.",
    tip: "Uden brancher kan kunder ikke finde jer i søgningen — og service-skabelonerne bliver tomme.",
  },
  {
    icon: Calculator,
    step: 2,
    tab: "settings",
    cta: "Åbn indstillinger",
    title: "Trin 2 — Integrér jeres regnskabsprogram",
    body:
      "Forbind e-conomic, Billy, Dinero eller Zenegy under Indstillinger → Ekstra funktioner → Regnskab. Når integrationen er aktiv, sendes fakturaer og kunder automatisk over, så snart en bestilling afsluttes.",
    tip: "VIGTIGT: Sæt regnskab op FØR medarbejderne kører den første rute. Ellers ender I med at skulle bogføre de første bestillinger manuelt — det er besværligt at rette bagefter.",
  },
  {
    icon: UserPlus,
    step: 3,
    tab: "employees",
    cta: "Tilføj medarbejder",
    title: "Trin 3 — Opret jeres medarbejdere",
    body:
      "Tilføj jeres team under Medarbejdere. Hver medarbejder får sit eget login og adgang til medarbejder-appen, hvor de ser deres ruter, opgaver og kontaktoplysninger på kunden.",
    tip: "Selv hvis I er solo, opret jer selv som medarbejder — så kan I afprøve hele flowet og se det fra chaufførens side.",
  },
  {
    icon: Wrench,
    step: 4,
    tab: "services",
    cta: "Opret service",
    title: "Trin 4 — Opret jeres services",
    body:
      "Opret de ydelser I tilbyder. Vælg mellem fast pris, timepris eller prisberegner med jeres egne enheder (m², stk, timer m.fl.). Services er det, kunder bestiller — og det, der ligger til grund for prisen på hver aftale.",
    tip: "Start med 2-3 services I kender godt. I kan altid tilføje flere senere.",
  },
  {
    icon: ShoppingCart,
    step: 5,
    tab: "orders",
    cta: "Opret bestilling",
    title: "Trin 5 — Opret jeres første bestilling",
    body:
      "Gå til Aftaler eller Ruter og klik \"Opret bestilling\". Inde i modulet kan I oprette kunden direkte hvis det er en ny kunde — så behøver I ikke springe frem og tilbage. Vælg services, antal og dato.",
    tip: "Bestillingen kan indeholde flere aftaler (fx ugentlig rengøring i 12 uger). Hver aftale bliver et stop på en rute.",
  },
  {
    icon: RouteIcon,
    step: 6,
    tab: "routes",
    cta: "Åbn ruteplanlæggeren",
    title: "Trin 6 — Læg aftalerne på en rute",
    body:
      "I Ruteplanlæggeren ligger nye aftaler i \"Aftaler uden rute\". Træk dem over på en dato, eller opret en ny rute med aftalerne i. Husk at TILDELE hver aftale til en medarbejder — ellers ser medarbejderen ikke ruten i sin app.",
    tip: "Tildel-feltet sidder på hver enkelt aftale. Uden tildeling = ingen rute hos chaufføren.",
  },
  {
    icon: Sparkles,
    title: "I er klar til at køre",
    body:
      "Det var grundopsætningen. Medarbejderne kan nu logge ind i medarbejder-appen og se deres ruter. Leads, livechat og anmeldelser kan slås til under Indstillinger → Ekstra funktioner når I er klar. I kan altid åbne guiden igen fra Overblik.",
  },
];

const STORAGE_KEY_PREFIX = "serviceydere.onboarding.done.";

export const OnboardingHub = ({ business }: { business: any }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-detektion: vi spørger databasen om hvad virksomheden HAR allerede gjort,
  // og bruger det til at præ-markere trin som færdige. Det er klart bedre end
  // at lade brugeren krydse manuelt af — guiden bliver en levende statusrapport
  // i stedet for en huskeliste.
  const { data: autoSignals } = useQuery({
    queryKey: ["onboarding-signals", business?.id],
    enabled: !!business?.id,
    staleTime: 30_000,
    queryFn: async () => {
      const bizId = business.id as string;
      const settings = (business?.settings ?? {}) as Record<string, any>;
      const categories = (business?.categories as string[] | null) || [];
      const [services, employees, orders, routes, accounting] = await Promise.all([
        supabase.from("services").select("id", { count: "exact", head: true }).eq("business_id", bizId),
        supabase.from("employees").select("id", { count: "exact", head: true }).eq("business_id", bizId).eq("is_active", true),
        supabase.from("orders").select("id", { count: "exact", head: true }).eq("business_id", bizId),
        supabase.from("routes").select("id", { count: "exact", head: true }).eq("business_id", bizId),
        supabase.from("accounting_integrations").select("id", { count: "exact", head: true }).eq("business_id", bizId).eq("is_active", true),
      ]);
      const accountingEnabled = !!settings.accounting_integration_enabled;
      return {
        1: categories.length > 0,                                    // brancher valgt
        2: !accountingEnabled || (accounting.count ?? 0) > 0,        // regnskab forbundet (eller fravalgt)
        3: (employees.count ?? 0) > 0,                               // medarbejder oprettet
        4: (services.count ?? 0) > 0,                                // service oprettet
        5: (orders.count ?? 0) > 0,                                  // bestilling oprettet
        6: (routes.count ?? 0) > 0,                                  // rute oprettet
      } as Record<number, boolean>;
    },
  });

  const storageKey = STORAGE_KEY_PREFIX + (business?.id || "anon");
  const [manualOverrides, setManualOverrides] = useState<Record<number, boolean>>(() => {
    if (typeof window === "undefined") return {};
    try { return JSON.parse(localStorage.getItem(storageKey) || "{}"); }
    catch { return {}; }
  });
  // Effektiv færdig-status: auto-detekteret status + manuelle overrides
  // (så brugeren kan markere et trin som færdigt selvom systemet ikke kan
  // detektere det, fx hvis de bevidst springer regnskab over).
  const doneSteps = useMemo<Record<number, boolean>>(() => {
    const base = autoSignals ?? {};
    return { ...base, ...manualOverrides };
  }, [autoSignals, manualOverrides]);
  const toggleDone = (n?: number) => {
    if (n === undefined) return;
    setManualOverrides((prev) => {
      const next = { ...prev, [n]: !prev[n] };
      try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch {}
      return next;
    });
  };

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const open = params.get("guide") === "1";

  // Når guiden åbnes — start altid på hub-skærmen så brugeren ser overblikket
  useEffect(() => { if (open) setStep(0); }, [open]);
  // Scroll body til toppen ved hvert trinskifte — ellers står man midt på det
  // nye trin og bliver forvirret.
  useEffect(() => { scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" }); }, [step]);

  const close = () => {
    const params = new URLSearchParams(location.search);
    params.delete("guide");
    const search = params.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : "" }, { replace: true });
  };

  const slides = useMemo(() => buildSlides(business?.name), [business?.name]);
  const slide = slides[step];
  const isLast = step === slides.length - 1;
  const isFirst = step === 0;
  const guidedSteps = slides.filter((s) => s.step !== undefined);
  const completedCount = guidedSteps.filter((s) => doneSteps[s.step!]).length;
  const allDone = completedCount === guidedSteps.length;

  const goToTab = () => {
    close();
    if (!slide.tab) return;
    if (slide.tab === "dashboard") navigate("/virksomhed");
    else navigate(`/virksomhed?tab=${slide.tab}`);
  };

  if (!open || !slide) return null;

  const Icon = slide.icon;
  const primaryLabel = isLast ? "Færdig" : "Næste";
  const onPrimary = () => {
    if (isLast) { close(); return; }
    if (isFirst) {
      const nextStep = guidedSteps.find((s) => !doneSteps[s.step!]) || guidedSteps[0];
      setStep(slides.indexOf(nextStep));
      return;
    }
    if (slide.step !== undefined && !doneSteps[slide.step]) toggleDone(slide.step);
    setStep((i) => i + 1);
  };

  return (
    <Dialog open onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-2xl gap-0 overflow-hidden border-0 p-0 shadow-2xl max-h-[calc(100dvh-1rem)] flex flex-col">
        {/* Header */}
        <div className="relative shrink-0 bg-gradient-to-br from-foreground to-foreground/90 px-4 py-5 text-left text-background sm:px-7 sm:py-7 sm:text-center">
          <button
            onClick={close}
            aria-label="Luk guide"
            className="absolute right-3 top-3 rounded-md p-1.5 text-background/60 transition-colors hover:bg-background/10 hover:text-background"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-background/10 backdrop-blur-sm sm:mx-auto sm:h-12 sm:w-12 sm:rounded-2xl">
            <Icon className="h-6 w-6" />
          </div>
          {slide.step !== undefined && (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-background/55">
              Trin {slide.step} af 6
            </p>
          )}
          <h2 className="pr-8 text-base font-semibold leading-tight sm:pr-0 sm:text-lg">{slide.title}</h2>
          {isFirst && (
            <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-background/70">
              {allDone
                ? "Alle 6 trin er markeret færdige — flot. Du kan altid gå tilbage og finjustere."
                : `${completedCount} af 6 trin færdige. Vælg det næste eller fortsæt hvor du slap.`}
            </p>
          )}
        </div>

        {guidedSteps.length > 0 && !isFirst && (
          <div className="shrink-0 overflow-x-auto border-b bg-card px-4 py-2.5 [scrollbar-width:none] sm:px-5 [&::-webkit-scrollbar]:hidden">
            <div className="flex min-w-max items-center gap-1.5">
              {guidedSteps.map((s) => {
                const idx = slides.indexOf(s);
                const active = idx === step;
                const done = !!doneSteps[s.step!];
                return (
                  <button
                    key={s.step}
                    type="button"
                    onClick={() => setStep(idx)}
                    className={cn(
                      "inline-flex h-8 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-semibold transition-colors",
                      active && "border-foreground bg-foreground text-background",
                      done && !active && "border-accent/30 bg-accent/10 text-foreground",
                      !active && !done && "border-border bg-secondary/60 text-muted-foreground",
                    )}
                  >
                    <span className="tabular-nums">{done ? "✓" : s.step}</span>
                    <span className="max-w-[7rem] truncate sm:max-w-none">{s.cta?.replace("Åbn ", "") || s.title.replace(/^Trin \d+ — /, "")}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Body — scrollable */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto bg-card px-4 pb-4 pt-4 sm:px-6 sm:pt-5">
          {isFirst ? (
            <div className="space-y-3">
              <p className="text-sm leading-relaxed text-foreground/85">{slide.body}</p>
              <div className="overflow-hidden rounded-xl border border-border bg-secondary/20">
                {guidedSteps.map((s, i) => {
                  const idx = slides.indexOf(s);
                  const done = !!doneSteps[s.step!];
                  const StepIcon = s.icon;
                  return (
                    <div
                      key={s.step}
                      className={cn(
                        "flex items-center gap-3 border-b border-border bg-card px-3 py-3 last:border-b-0 sm:px-4",
                        done && "bg-accent/5",
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => toggleDone(s.step)}
                        aria-label={done ? "Markér som ikke færdig" : "Markér som færdig"}
                        className={cn(
                          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
                          done
                            ? "border-accent bg-accent text-accent-foreground"
                            : "border-border bg-background text-muted-foreground hover:border-foreground",
                        )}
                      >
                        {done ? <Check className="h-4 w-4" /> : <span className="text-[11px] font-bold tabular-nums">{s.step}</span>}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <StepIcon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                          <p className={cn("truncate text-sm font-semibold", done ? "text-foreground/70 line-through" : "text-foreground")}>
                            {s.title.replace(/^Trin \d+ — /, "")}
                          </p>
                        </div>
                        <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{s.body.split(".")[0]}.</p>
                      </div>
                      <Button
                        size="sm"
                        variant={done ? "ghost" : "outline"}
                        onClick={() => setStep(idx)}
                        className="h-8 shrink-0 px-2.5 text-[11px]"
                      >
                        {done ? "Se igen" : "Start"}
                        <ArrowRight className="ml-1 h-3 w-3" />
                      </Button>
                    </div>
                  );
                })}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Tip: klik på cirklen for at markere et trin færdigt — din status gemmes lokalt så du kan komme tilbage senere.
              </p>
            </div>
          ) : (
            <>
              <p className="text-sm leading-relaxed text-foreground/85 whitespace-pre-line">{slide.body}</p>
              {slide.tip && (
                <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Tip</p>
                  <p className="mt-1 text-xs leading-relaxed text-foreground/80">{slide.tip}</p>
                </div>
              )}
              {slide.step !== undefined && (
                <button
                  type="button"
                  onClick={() => toggleDone(slide.step)}
                  className={cn(
                    "mt-4 inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors",
                    doneSteps[slide.step]
                      ? "border-accent bg-accent/10 text-foreground"
                      : "border-border bg-card text-muted-foreground hover:border-foreground hover:text-foreground",
                  )}
                >
                  <span className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-full border",
                    doneSteps[slide.step] ? "border-accent bg-accent text-accent-foreground" : "border-muted-foreground/40",
                  )}>
                    {doneSteps[slide.step] && <Check className="h-3 w-3" />}
                  </span>
                  {doneSteps[slide.step] ? "Trin markeret færdigt" : "Markér dette trin som færdigt"}
                </button>
              )}
            </>
          )}
        </div>

        {/* Progress bar */}
        <div className="shrink-0 bg-card px-5 pt-3">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span className="font-medium">
              {isFirst ? `${completedCount} af ${guidedSteps.length} trin færdige` : `${step + 1} af ${slides.length}`}
            </span>
            {!isLast && !isFirst && (
              <button type="button" onClick={close} className="hover:text-foreground transition-colors">
                Spring over
              </button>
            )}
          </div>
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-foreground transition-all duration-300"
              style={{ width: `${isFirst ? (completedCount / guidedSteps.length) * 100 : ((step + 1) / slides.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Footer — én primær handling. */}
        <div className="flex shrink-0 items-center justify-between gap-2 bg-card px-4 py-3 sm:gap-3 sm:px-5 sm:py-4">
          {!isFirst ? (
            <button
              type="button"
              onClick={() => setStep((i) => Math.max(0, i - 1))}
              className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Tilbage
            </button>
          ) : <span />}

          <div className="flex min-w-0 items-center gap-2">
            {!isLast && slide.tab && (
              <Button size="sm" variant="outline" onClick={goToTab} className="h-9 max-w-[42vw] gap-1.5 truncate px-3 text-xs sm:max-w-none">
                {slide.cta || "Åbn"}
              </Button>
            )}
            <Button size="sm" onClick={onPrimary} className="h-9 gap-1.5 px-4">
              {isFirst ? (completedCount > 0 ? "Fortsæt" : "Start guiden") : primaryLabel}
              {isLast ? <Check className="h-4 w-4" /> : <ArrowRight className="h-3.5 w-3.5" />}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingHub;