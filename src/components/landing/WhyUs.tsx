import { ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";
import { BrandedIllustration, type BrandedIllustrationName } from "@/components/shared/BrandedIllustration";
import { SectionLabelMark } from "@/components/shared/UiArtwork";

/**
 * "Hvorfor Serviceydere" som redaktionel liste i stedet for fire ens kort:
 * fast overskriftskolonne til venstre, argumenter som store rækker til højre.
 */
const benefits = [
  {
    icon: "freePrivate" as BrandedIllustrationName,
    title: "Gratis for private",
    description:
      "Det koster ikke noget at søge, sammenligne og kontakte udbydere — ingen abonnement, ingen gebyrer.",
  },
  {
    icon: "checkedBusinesses" as BrandedIllustrationName,
    title: "Tjekkede virksomheder",
    description:
      "Alle virksomheder med Verificeret-stempel har et aktivt CVR og bekræftede kontaktoplysninger.",
  },
  {
    icon: "realReviews" as BrandedIllustrationName,
    title: "Anmeldelser fra rigtige opgaver",
    description:
      "Kun kunder med en bekræftet booking kan anmelde — så stjernerne afspejler virkelige erfaringer.",
  },
  {
    icon: "compareQuickly" as BrandedIllustrationName,
    title: "Sammenlign på sekunder",
    description:
      "Se pris, område, specialer og rating side om side, så du hurtigt finder det rigtige match.",
  },
];

const WhyUs = () => {
  return (
    <section className="border-y border-border/70 bg-secondary/40 py-12 text-foreground sm:py-14 lg:py-16 2xl:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <SectionLabelMark />
              Hvorfor Serviceydere
            </span>
            <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.06] text-foreground sm:text-[2.2rem] lg:text-[2.4rem] 2xl:text-[2.75rem]">
              Trygt valg, hver gang
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground">
              Få et bedre grundlag for dit valg med tydelige profiler, relevante oplysninger og anmeldelser fra gennemførte bookinger.
            </p>
          </div>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:mt-10">
          {benefits.map((b, i) => (
            <li
              key={b.title}
              className="group relative flex h-full flex-col rounded-2xl border border-border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-md sm:p-6"
            >
              <div className="flex items-start justify-between">
                <span className="icon-tile h-20 w-20 p-1 sm:h-24 sm:w-24 [&>*]:scale-[1.35]">
                  <BrandedIllustration name={b.icon} className="h-full w-full" alt="" />
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-5 text-[17px] font-semibold leading-snug text-foreground">
                {b.title}
              </h3>
              <p className="mt-2 text-[14px] leading-6 text-muted-foreground">
                {b.description}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end">
          <SmartLink
            to="/hjaelp#faq"
            className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-foreground underline-offset-4 hover:underline"
          >
            Se spørgsmål og svar <ArrowRight className="h-4 w-4" />
          </SmartLink>
        </div>
      </div>
    </section>
  );
};



export default WhyUs;
