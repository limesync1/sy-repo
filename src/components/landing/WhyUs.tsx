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
    <section className="relative bg-background py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-6 bg-foreground/30" />
              Hvorfor Serviceydere
            </span>
            <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.06] tracking-[-0.03em] text-foreground sm:text-[2.35rem] lg:text-[2.75rem]">
              Trygt valg, hver gang
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-muted-foreground">
               Få et bedre grundlag for dit valg med tydelige profiler, relevante oplysninger og anmeldelser fra gennemførte bookinger.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
              <SmartLink
                to="/virksomheder"
                 className="group inline-flex items-center gap-2 rounded-lg bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:-translate-y-0.5"
              >
                Find virksomheder
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </SmartLink>
              <SmartLink
                to="/tilbud"
                 className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
              >
                Indhent 3 gratis tilbud
              </SmartLink>
          </div>
        </div>

          <ul className="mt-10 grid border-y border-border md:grid-cols-2 lg:grid-cols-4 lg:divide-x lg:divide-border">
            {benefits.map((b, i) => (
              <li
                key={b.title}
                className="group flex gap-4 border-b border-border px-0 py-6 last:border-b-0 md:px-6 md:first:pl-0 md:[&:nth-child(3)]:border-b-0 lg:border-b-0 lg:first:pl-0 lg:last:pr-0"
              >
                <span className="mt-1 hidden shrink-0 text-[11px] font-semibold tabular-nums text-muted-foreground sm:block">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-foreground transition-colors group-hover:bg-accent-soft group-hover:text-accent">
                  <b.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[16px] font-semibold text-foreground">
                    {b.title}
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
                    {b.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 flex justify-end">
            <SmartLink to="/hjaelp#faq" className="inline-flex items-center gap-2 text-sm font-semibold text-foreground underline-offset-4 hover:underline">
              Se spørgsmål og svar <ArrowRight className="h-4 w-4" />
            </SmartLink>
          </div>
      </div>
    </section>
  );
};

export default WhyUs;
