import { BadgeCheck, Star, CircleDollarSign, ShieldCheck, ArrowRight } from "lucide-react";
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
    icon: ShieldCheck,
    title: "Sammenlign på sekunder",
    description:
      "Se pris, område, specialer og rating side om side, så du hurtigt finder det rigtige match.",
  },
];

const WhyUs = () => {
  return (
    <section className="relative bg-background py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-6 bg-foreground/30" />
              Hvorfor Serviceydere
            </span>
            <h2 className="mt-4 text-[1.85rem] font-semibold leading-[1.06] tracking-[-0.03em] text-foreground sm:text-[2.35rem] lg:text-[2.75rem]">
              Trygt valg,
              <br className="hidden sm:block" /> hver gang
            </h2>
            <p className="mt-4 max-w-md text-[15px] leading-7 text-muted-foreground">
              Verificerede udbydere, ægte anmeldelser og priser i øjenhøjde — så du tør sige ja
              til den rigtige.
            </p>
            <div className="mt-7 flex flex-wrap gap-2.5">
              <SmartLink
                to="/virksomheder"
                className="group inline-flex items-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:-translate-y-0.5"
              >
                Find virksomheder
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </SmartLink>
              <SmartLink
                to="/tilbud"
                className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
              >
                Indhent 3 gratis tilbud
              </SmartLink>
            </div>
          </div>

          <ul className="divide-y divide-border/70 border-y border-border/70">
            {benefits.map((b, i) => (
              <li
                key={b.title}
                className="group flex gap-5 py-7 transition-colors first:pt-0 last:pb-0 sm:gap-7"
              >
                <span className="mt-1 hidden w-10 shrink-0 text-[13px] font-semibold tabular-nums text-muted-foreground/60 sm:block">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-secondary text-foreground transition-colors group-hover:bg-accent-soft group-hover:text-accent">
                  <b.icon className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-[17px] font-semibold tracking-tight text-foreground sm:text-lg">
                    {b.title}
                  </h3>
                  <p className="mt-1.5 text-[14px] leading-6 text-muted-foreground sm:text-[15px]">
                    {b.description}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
