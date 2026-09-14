import { Search, BarChart3, CalendarCheck, ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";

/**
 * En enkel, sammenhængende proces frem for tre løsrevne salgskort.
 */
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
    <section className="bg-surface py-16 text-foreground md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-px w-6 bg-foreground/30" />
            Sådan virker det
          </span>
          <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.06] tracking-[-0.03em] sm:text-[2.35rem] lg:text-[2.75rem]">
            Fra søgning til booking på 5 minutter
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-7 text-muted-foreground">
            Find selv en virksomhed, eller beskriv opgaven én gang og modtag op til tre tilbud.
          </p>
        </div>

        <div className="relative mt-10 border-y border-border bg-background md:mt-12">
          {/* Tidslinjen der binder de tre trin sammen på desktop. */}
          <div
            aria-hidden
            className="absolute left-[16.67%] right-[16.67%] top-[51px] hidden h-px bg-border md:block"
          />

          <ol className="relative grid md:grid-cols-3 md:divide-x md:divide-border">
            {steps.map((step, i) => (
              <li key={step.title} className="relative px-5 py-7 sm:px-7 md:min-h-[265px] md:py-8">
                <div className="flex items-center gap-4">
                  <span
                    className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-foreground text-background"
                  >
                    <step.icon className="h-5 w-5" />
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Trin {i + 1}</span>
                </div>
                <div className="mt-6">
                  <h3 className="text-lg font-semibold sm:text-xl">{step.title}</h3>
                  <p className="mt-2 max-w-sm text-[14px] leading-6 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <SmartLink
            to="/tilbud"
            className="group inline-flex items-center justify-center gap-2 rounded-lg bg-foreground px-6 py-3 text-sm font-semibold text-background transition-all hover:-translate-y-0.5"
          >
            Indhent 3 gratis tilbud
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </SmartLink>
          <SmartLink
            to="/virksomheder"
            className="group inline-flex items-center justify-center gap-2 rounded-lg border border-border bg-background px-6 py-3 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5 hover:bg-secondary"
          >
            Find virksomheder
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </SmartLink>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
