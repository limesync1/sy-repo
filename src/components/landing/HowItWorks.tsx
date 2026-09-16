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
    <section className="bg-ocean py-14 text-ocean-foreground sm:py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-ocean-foreground/65">
            <span className="h-px w-6 bg-ocean-foreground/35" />
            Sådan virker det
          </span>
          <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.06] tracking-[-0.03em] sm:text-[2.35rem] lg:text-[2.75rem]">
            Fra søgning til booking på 5 minutter
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-7 text-ocean-foreground/70">
            Find selv en virksomhed, eller beskriv opgaven én gang og modtag op til tre tilbud.
          </p>
        </div>

        <ol className="mt-8 grid gap-3 sm:mt-10 md:mt-14 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="rounded-lg border border-ocean-foreground/10 bg-ocean-foreground/[0.06] p-5 sm:p-7">
                <div className="flex items-center gap-3 md:justify-between md:gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ocean-foreground/25 text-xs font-semibold tabular-nums text-ocean-foreground">
                    {i + 1}
                  </span>
                  <h3 className="min-w-0 flex-1 text-[17px] font-semibold md:hidden">{step.title}</h3>
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <step.icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-4 md:mt-8">
                  <h3 className="hidden text-lg font-semibold sm:text-xl md:block">{step.title}</h3>
                  <p className="max-w-sm text-[14px] leading-6 text-ocean-foreground/70 md:mt-2">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
        </ol>

        <div className="mt-8 flex flex-col gap-3 sm:mt-12 sm:flex-row sm:flex-wrap sm:items-center">
          <SmartLink
            to="/tilbud"
            className="group inline-flex items-center justify-center gap-2 rounded-lg bg-ocean-foreground px-6 py-3 text-sm font-semibold text-ocean transition-all hover:-translate-y-0.5"
          >
            Indhent 3 gratis tilbud
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </SmartLink>
          <SmartLink
            to="/virksomheder"
            className="group inline-flex items-center justify-center gap-2 rounded-lg border border-ocean-foreground/25 px-6 py-3 text-sm font-semibold text-ocean-foreground transition-all hover:-translate-y-0.5 hover:bg-ocean-foreground/10"
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
