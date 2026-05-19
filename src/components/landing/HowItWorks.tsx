import { Search, BarChart3, CalendarCheck, ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";

const steps = [
  {
    icon: Search,
    title: "Søg efter en service",
    description: "Skriv hvad du har brug for — fx 'rengøring i Aarhus' eller 'flyttehjælp København'.",
  },
  {
    icon: BarChart3,
    title: "Sammenlign udbydere",
    description: "Se priser, anmeldelser og afstand side om side, så du kan vælge den rigtige.",
  },
  {
    icon: CalendarCheck,
    title: "Book eller hent tilbud",
    description: "Book direkte på virksomhedens profil — eller indhent op til 3 gratis tilbud.",
  },
];

const HowItWorks = () => {
  return (
    <section className="bg-secondary py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-2xl md:mb-16">
          <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-px w-6 bg-foreground/30" />
            Sådan virker det
          </span>
          <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">
            Fra søgning til booking på 5 minutter
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
            Tre enkle trin — uden registrering, uden ventetid.
          </p>
        </div>

        <div className="relative grid gap-4 sm:gap-5 md:grid-cols-3">
          {/* Tynd forbindende linje på desktop — antyder flow mellem trinene */}
          <div aria-hidden className="pointer-events-none absolute left-[12%] right-[12%] top-14 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="group relative flex flex-col rounded-[28px] border border-border/70 bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-border"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
                  Trin {i + 1}
                </div>
              </div>
              <h3 className="mt-8 text-xl font-semibold tracking-tight text-foreground">{step.title}</h3>
              <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{step.description}</p>
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
