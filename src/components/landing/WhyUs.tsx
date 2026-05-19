import { BadgeCheck, Star, CircleDollarSign, ShieldCheck, ArrowRight } from "lucide-react";
import SmartLink from "@/components/SmartLink";

const benefits = [
  {
    icon: CircleDollarSign,
    title: "Gratis for private",
    description: "Det koster ikke noget at søge, sammenligne og kontakte udbydere — ingen abonnement, ingen gebyrer.",
    tone: "bg-feature-warm text-feature-warm-foreground",
  },
  {
    icon: BadgeCheck,
    title: "Tjekkede virksomheder",
    description: "Alle virksomheder med Verificeret-stempel har et aktivt CVR og bekræftede kontaktoplysninger.",
    tone: "bg-feature-cool text-feature-cool-foreground",
  },
  {
    icon: Star,
    title: "Anmeldelser fra rigtige opgaver",
    description: "Kun kunder med en bekræftet booking kan anmelde — så stjernerne afspejler virkelige erfaringer.",
    tone: "bg-feature-lilac text-feature-lilac-foreground",
  },
  {
    icon: ShieldCheck,
    title: "Sammenlign på sekunder",
    description: "Se pris, område, specialer og rating side om side, så du hurtigt finder det rigtige match.",
    tone: "bg-accent-soft text-accent",
  },
];

const WhyUs = () => {
  return (
    <section className="relative bg-background py-24 md:py-40">
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col gap-6 md:mb-14 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
              <span className="h-px w-6 bg-foreground/30" />
              Hvorfor Serviceydere
            </span>
            <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">
              Trygt valg, hver gang
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
              Verificerede udbydere, ægte anmeldelser og priser i øjenhøjde — så du tør sige ja til den rigtige.
            </p>
          </div>
          <SmartLink
            to="/virksomheder"
            className="group inline-flex items-center gap-2 self-start rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-all hover:-translate-y-0.5 md:self-auto"
          >
            Find virksomheder
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </SmartLink>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="group relative flex flex-col rounded-[24px] border border-border/70 bg-card p-7 shadow-premium shadow-premium-hover hover:border-border"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${b.tone}`}>
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-[15px] font-semibold leading-tight tracking-tight text-foreground">{b.title}</h3>
              <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 flex justify-center">
          <SmartLink
            to="/tilbud"
            className="group inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold text-foreground transition-all hover:-translate-y-0.5"
          >
            Indhent 3 gratis tilbud
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </SmartLink>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
