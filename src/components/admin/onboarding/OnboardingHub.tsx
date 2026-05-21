import { useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Rocket, Building2, Wrench, Users, MessageCircle, BarChart3,
  ChevronLeft, ChevronRight, X, ArrowRight, Check,
  type LucideIcon,
} from "lucide-react";

/**
 * OnboardingHub — simpel, kort guide gennem virksomhedspanelet.
 *
 * Den åbner KUN når brugeren selv beder om det via URL-parameteren `?guide=1`
 * (typisk fra knappen "Se guide til panelet" på Overblik). Ellers er den helt
 * usynlig. Ingen auto-åbning, ingen permanent checkliste, ingen auto-navigation
 * væk fra Overblik — så nye virksomheder lander roligt på deres dashboard og
 * kan tage guiden i deres eget tempo.
 */

type Slide = {
  icon: LucideIcon;
  tab: string;
  title: string;
  body: string;
  cta?: string;
};

const buildSlides = (businessName?: string): Slide[] => [
  {
    icon: Rocket,
    tab: "dashboard",
    title: `Velkommen, ${businessName || "ny virksomhed"}!`,
    body:
      "Her er en kort rundvisning i jeres panel. Det tager mindre end et minut — og I kan altid åbne guiden igen fra Overblik.",
  },
  {
    icon: BarChart3,
    tab: "dashboard",
    title: "Overblik",
    body:
      "Her ser I dagens bestillinger, omsætning og det vigtigste at handle på lige nu. Det er jeres startside hver gang I logger ind.",
  },
  {
    icon: Building2,
    tab: "settings",
    title: "Indstillinger — fyld profilen op",
    body:
      "Tilføj beskrivelse, logo, brancher og åbningstider under Indstillinger. Det er det vigtigste for at kunder kan finde og vælge jer.",
    cta: "Åbn indstillinger",
  },
  {
    icon: Wrench,
    tab: "services",
    title: "Services — det kunderne kan booke",
    body:
      "Opret jeres ydelser med fast pris, timepris eller prisberegner. Uden services kan kunder ikke bestille — så start her efter profilen.",
    cta: "Opret en service",
  },
  {
    icon: Users,
    tab: "employees",
    title: "Medarbejdere & ruter",
    body:
      "Inviter jeres team og tildel dem til dagens ruter. Hver medarbejder får sin egen app med ruteplan og opgaver.",
    cta: "Tilføj medarbejder",
  },
  {
    icon: MessageCircle,
    tab: "livechat",
    title: "Klar til at gå i gang",
    body:
      "Livechat, leads og regnskabsintegration kan slås til under Indstillinger → Ekstra funktioner. Held og lykke — vi er her hvis I har brug for os.",
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
    const url = new URL(window.location.href);
    url.searchParams.delete("guide");
    window.history.replaceState({}, "", url.toString());
    // Trigg en navigation så location-effekter også opdaterer
    navigate(url.pathname + url.search, { replace: true });
  };

  const slides = useMemo(() => buildSlides(business?.name), [business?.name]);
  const slide = slides[step];
  const isLast = step === slides.length - 1;

  const goToTab = () => {
    close();
    if (slide.tab === "dashboard") navigate("/virksomhed");
    else navigate(`/virksomhed?tab=${slide.tab}`);
  };

  if (!open || !slide) return null;

  const Icon = slide.icon;

  return (
    <Dialog open onOpenChange={(v) => { if (!v) close(); }}>
      <DialogContent className="max-w-md gap-0 overflow-hidden border-0 p-0 shadow-2xl">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-foreground to-foreground/90 px-8 py-10 text-center text-background">
          <button
            onClick={close}
            aria-label="Luk guide"
            className="absolute right-3 top-3 rounded-md p-1.5 text-background/60 transition-colors hover:bg-background/10 hover:text-background"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-background/10 backdrop-blur-sm">
            <Icon className="h-6 w-6" />
          </div>
          <h2 className="text-lg font-semibold leading-tight">{slide.title}</h2>
          <p className="mx-auto mt-2.5 max-w-sm text-sm leading-relaxed text-background/75">
            {slide.body}
          </p>
        </div>

        {/* Progress dots */}
        <div className="flex items-center justify-center gap-1.5 bg-card pt-5">
          {slides.map((_, i) => (
            <span
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all",
                i === step ? "w-6 bg-foreground" : "w-1.5 bg-border",
              )}
            />
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-2 bg-card px-5 py-4">
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
            {slide.cta && (
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