import { Search, BarChart3, CalendarCheck, ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";

/**
 * Tre trin — hvert trin har sin egen kulør fra design-tokens, så sektionen
 * ikke bliver en grå flade. Farverne følger med i mørk tilstand automatisk.
 */
const steps = [
  {
    icon: Search,
    title: "Søg efter en service",
    description: "Skriv hvad du har brug for — fx 'rengøring i Aarhus' eller 'flyttehjælp København'.",
    tone: "bg-feature-cool text-feature-cool-foreground",
    chip: "bg-feature-cool-foreground text-feature-cool",
  },
  {
    icon: BarChart3,
    title: "Sammenlign udbydere",
    description: "Se priser, anmeldelser og afstand side om side, så du kan vælge den rigtige.",
    tone: "bg-feature-warm text-feature-warm-foreground",
    chip: "bg-feature-warm-foreground text-feature-warm",
  },
  {
    icon: CalendarCheck,
    title: "Book eller hent tilbud",
    description: "Book direkte på virksomhedens profil — eller indhent op til 3 gratis tilbud.",
    tone: "bg-feature-lilac text-feature-lilac-foreground",
    chip: "bg-feature-lilac-foreground text-feature-lilac",
  },
];

const HowItWorks = () => {
  return (
    <section className="relative isolate overflow-hidden bg-surface py-20 md:py-32">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -left-24 top-10 h-80 w-80 rounded-full bg-feature-cool opacity-60 blur-[110px]" />
        <div className="absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-feature-warm opacity-50 blur-[110px]" />
      </div>

      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-2xl md:mb-16">
          <span className="inline-flex items-center gap-2.5 rounded-full bg-accent-soft px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">
            Sådan virker det
          </span>
          <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">
            Fra søgning til{" "}
            <span className="bg-[linear-gradient(110deg,hsl(var(--accent))_0%,hsl(var(--feature-lilac-foreground))_60%,hsl(var(--accent))_100%)] bg-[length:200%_100%] bg-clip-text text-transparent animate-gradient-pan">
              booking på 5 minutter
            </span>
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
            Tre enkle trin — uden registrering, uden ventetid.
          </p>
        </div>

        <div className="relative grid gap-4 sm:gap-5 md:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className={`group relative flex flex-col overflow-hidden rounded-[28px] border border-border/50 p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_45px_-30px_rgba(0,0,0,0.4)] ${step.tone}`}
            >
              <div className="flex items-center justify-between">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${step.chip}`}>
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="text-[42px] font-bold leading-none tracking-tight opacity-20">
                  {i + 1}
                </div>
              </div>
              <h3 className="mt-8 text-xl font-semibold tracking-tight">{step.title}</h3>
              <p className="mt-2 text-[14px] leading-6 opacity-80">{step.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SmartLink
            to="/virksomheder"
            className="group inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:-translate-y-0.5"
          >
            Find virksomheder
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </SmartLink>
          <SmartLink
            to="/tilbud"
            className="group inline-flex items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
          >
            Indhent 3 gratis tilbud
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </SmartLink>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
