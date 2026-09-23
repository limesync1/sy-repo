import { BadgeCheck, Star, CircleDollarSign, ListFilter, ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";

/**
 * "Hvorfor Serviceydere" som redaktionel liste i stedet for fire ens kort:
 * fast overskriftskolonne til venstre, argumenter som store rækker til højre.
 */
const benefits = [
  {
    icon: CircleDollarSign,
    title: "Gratis for private",
    description:
      "Det koster ikke noget at søge, sammenligne og kontakte udbydere — ingen abonnement, ingen gebyrer.",
  },
  {
    icon: BadgeCheck,
    title: "Tjekkede virksomheder",
    description:
      "Alle virksomheder med Verificeret-stempel har et aktivt CVR og bekræftede kontaktoplysninger.",
  },
  {
    icon: Star,
    title: "Anmeldelser fra rigtige opgaver",
    description:
      "Kun kunder med en bekræftet booking kan anmelde — så stjernerne afspejler virkelige erfaringer.",
  },
  {
    icon: ListFilter,
    title: "Sammenlign på sekunder",
    description:
      "Se pris, område, specialer og rating side om side, så du hurtigt finder det rigtige match.",
  },
];

const WhyUs = () => {
  return (
    <section className="relative bg-ocean py-12 text-ocean-foreground sm:py-14 lg:py-16 2xl:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between lg:gap-10">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-ocean-foreground/65">
              <span className="h-px w-6 bg-ocean-foreground/35" />
              Hvorfor Serviceydere
            </span>
            <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.06] text-ocean-foreground sm:text-[2.2rem] lg:text-[2.4rem] 2xl:text-[2.75rem]">
              Trygt valg, hver gang
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-ocean-foreground/70">
              Få et bedre grundlag for dit valg med tydelige profiler, relevante oplysninger og anmeldelser fra gennemførte bookinger.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <SmartLink
              to="/virksomheder"
              className="group inline-flex items-center gap-2 rounded-lg bg-ocean-foreground px-5 py-2.5 text-sm font-semibold text-ocean transition-all hover:-translate-y-0.5"
            >
              Find virksomheder
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
            </SmartLink>
            <SmartLink
              to="/tilbud"
              className="inline-flex items-center gap-2 rounded-lg border border-ocean-foreground/25 px-5 py-2.5 text-sm font-semibold text-ocean-foreground transition-all hover:-translate-y-0.5 hover:bg-ocean-foreground/10"
            >
              Indhent 3 gratis tilbud
            </SmartLink>
          </div>
        </div>

        <ul className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:mt-10">
          {benefits.map((b, i) => (
            <li
              key={b.title}
              className="group relative flex h-full flex-col rounded-xl border border-ocean-foreground/12 bg-ocean-foreground/[0.05] p-5 transition-colors hover:border-ocean-foreground/25 hover:bg-ocean-foreground/[0.08]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-ocean-foreground/10 text-ocean-foreground transition-colors group-hover:bg-ocean-foreground/15">
                  <b.icon className="h-5 w-5" />
                </span>
                <span className="text-[11px] font-semibold tabular-nums text-ocean-foreground/40">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <h3 className="mt-4 text-[16px] font-semibold leading-snug text-ocean-foreground">
                {b.title}
              </h3>
              <p className="mt-2 text-[14px] leading-6 text-ocean-foreground/70">
                {b.description}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end">
          <SmartLink
            to="/hjaelp#faq"
            className="inline-flex items-center gap-2 text-sm font-semibold text-ocean-foreground underline-offset-4 hover:underline"
          >
            Se spørgsmål og svar <ArrowRight className="h-4 w-4" />
          </SmartLink>
        </div>
      </div>
    </section>
  );
};



export default WhyUs;
