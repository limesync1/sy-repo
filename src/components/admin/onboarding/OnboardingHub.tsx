import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Rocket, Tags, Calculator, Users, Wrench, ShoppingCart, Route as RouteIcon,
  UserPlus, Sparkles, ChevronLeft, ChevronRight, X, ArrowRight, Check,
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
      "Denne guide tager jer trin for trin gennem den rigtige rækkefølge for at få jeres panel i drift. Følg trinene fra start til slut — så undgår I rod i regnskab, ruter og medarbejder-tildelinger senere.",
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

export const OnboardingHub = ({ business }: { business: any }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [step, setStep] = useState(0);

  const params = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const open = params.get("guide") === "1";

  // Reset til første slide hver gang guiden åbnes
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  const close = () => {
    const params = new URLSearchParams(location.search);
    params.delete("guide");
    const search = params.toString();
    navigate({ pathname: location.pathname, search: search ? `?${search}` : "" }, { replace: true });
  };

  const slides = useMemo(() => buildSlides(business?.name), [business?.name]);
  const slide = slides[step];
  const isLast = step === slides.length - 1;

  const goToTab = () => {
    close();
    if (!slide.tab) return;
    if (slide.tab === "dashboard") navigate("/virksomhed");
    else navigate(`/virksomhed?tab=${slide.tab}`);
  };

  if (!open || !slide) return null;

  const Icon = slide.icon;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-0 p-0 shadow-2xl max-h-[92dvh] flex flex-col">
        {/* Header */}
        <div className="relative shrink-0 bg-gradient-to-br from-foreground to-foreground/90 px-6 py-8 text-center text-background sm:px-8">
          <button
            onClick={close}
            aria-label="Luk guide"
            className="absolute right-3 top-3 rounded-md p-1.5 text-background/60 transition-colors hover:bg-background/10 hover:text-background"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-background/10 backdrop-blur-sm">
            <Icon className="h-6 w-6" />
          </div>
          {slide.step !== undefined && (
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-background/55">
              Trin {slide.step} af 6
            </p>
          )}
          <h2 className="text-lg font-semibold leading-tight">{slide.title}</h2>
        </div>

        {/* Body — scrollable */}
        <div className="flex-1 overflow-y-auto bg-card px-5 pb-2 pt-5 sm:px-6">
          <p className="text-sm leading-relaxed text-foreground/85">{slide.body}</p>
          {slide.tip && (
            <div className="mt-3 rounded-lg border border-accent/30 bg-accent/5 p-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-accent">Tip</p>
              <p className="mt-1 text-xs leading-relaxed text-foreground/80">{slide.tip}</p>
            </div>
          )}
        </div>

        {/* Progress dots */}
        <div className="flex shrink-0 items-center justify-center gap-1.5 bg-card pt-4">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setStep(i)}
              aria-label={`Gå til slide ${i + 1}`}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-6 bg-foreground" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 bg-card px-5 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep((i) => Math.max(0, i - 1))}
            disabled={step === 0}
            className="gap-1"
          >
            <ChevronLeft className="h-4 w-4" /> Tilbage
          </Button>

          <div className="flex items-center gap-2">
            {slide.cta && slide.tab && (
              <Button size="sm" variant="outline" onClick={goToTab} className="gap-1.5">
                {slide.cta} <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
            {isLast ? (
              <Button size="sm" onClick={close} className="gap-1">
                Færdig <Check className="h-4 w-4" />
              </Button>
            ) : (
              <Button size="sm" onClick={() => setStep((i) => i + 1)} className="gap-1">
                Næste <ChevronRight className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default OnboardingHub;