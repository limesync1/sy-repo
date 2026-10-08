import { ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import { BrandedIllustration, type BrandedIllustrationName } from "@/components/shared/BrandedIllustration";
import { SectionLabelMark } from "@/components/shared/UiArtwork";
import BlueFlowBackground from "./BlueFlowBackground";
import { Button } from "@/components/ui/button";

/**
 * En enkel, sammenhængende proces frem for tre løsrevne salgskort.
 */
const steps = [
  {
    icon: "searchService" as BrandedIllustrationName,
    title: "Søg efter en service",
    description: "Skriv hvad du har brug for — fx 'rengøring i Aarhus' eller 'flyttehjælp København'.",
  },
  {
    icon: "compareProviders" as BrandedIllustrationName,
    title: "Sammenlign udbydere",
    description: "Se priser, anmeldelser og afstand side om side, så du kan vælge den rigtige.",
  },
  {
    icon: "bookOrQuote" as BrandedIllustrationName,
    title: "Book eller hent tilbud",
    description: "Book direkte på virksomhedens profil — eller indhent op til 3 gratis tilbud.",
  },
];

const HowItWorks = () => {
  return (
    <section className="brand-blue-section relative isolate py-12 text-ocean-foreground sm:py-14 lg:py-16 2xl:py-24">
      <BlueFlowBackground />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-ocean-foreground/65">
            <SectionLabelMark />
            Sådan virker det
          </span>
          <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.06] sm:text-[2.2rem] lg:text-[2.4rem] 2xl:text-[2.75rem]">
            Fra søgning til booking på 5 minutter
          </h2>
          <p className="mt-3 max-w-lg text-[15px] leading-7 text-ocean-foreground/70">
            Find selv en virksomhed, eller beskriv opgaven én gang og modtag op til tre tilbud.
          </p>
        </div>

        <ol className="mt-8 grid gap-3 sm:mt-9 md:grid-cols-3 2xl:mt-14">
            {steps.map((step, i) => (
              <li key={step.title} className="rounded-xl border border-ocean-foreground/10 bg-ocean-foreground/[0.06] shadow-premium-dark p-5 xl:p-6 2xl:p-7">
                <div className="flex items-center gap-3 md:justify-between md:gap-4">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-ocean-foreground/25 text-xs font-semibold tabular-nums text-ocean-foreground">
                    {i + 1}
                  </span>
                  <h3 className="min-w-0 flex-1 text-[17px] font-semibold md:hidden">{step.title}</h3>
                  <span className="icon-tile-glass h-16 w-16 shrink-0 sm:h-20 sm:w-20">
                    <BrandedIllustration name={step.icon} className="h-full w-full" />
                  </span>
                </div>
                <div className="mt-4 md:mt-6 2xl:mt-8">
                  <h3 className="hidden text-lg font-semibold sm:text-xl md:block">{step.title}</h3>
                  <p className="max-w-sm text-[14px] leading-6 text-ocean-foreground/70 md:mt-2">
                    {step.description}
                  </p>
                </div>
              </li>
            ))}
        </ol>

      </div>
    </section>
  );
};

export default HowItWorks;
