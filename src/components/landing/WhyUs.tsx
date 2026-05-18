import { BadgeCheck, Star, CircleDollarSign, ShieldCheck } from "lucide-react";

const benefits = [
  {
    icon: CircleDollarSign,
    title: "Gratis at bruge",
    description: "Ingen abonnement. Ingen skjulte gebyrer for at finde og kontakte udbydere.",
    tone: "bg-feature-warm text-feature-warm-foreground",
  },
  {
    icon: BadgeCheck,
    title: "Verificerede udbydere",
    description: "Vi tjekker CVR og kontaktoplysninger, så du ved hvem du har med at gøre.",
    tone: "bg-feature-cool text-feature-cool-foreground",
  },
  {
    icon: Star,
    title: "Ægte anmeldelser",
    description: "Kun anmeldelser fra rigtige opgaver — ingen anonyme stemmer.",
    tone: "bg-feature-lilac text-feature-lilac-foreground",
  },
  {
    icon: ShieldCheck,
    title: "Bedre sammenligning",
    description: "Priser, områder og specialer side om side — så valget bliver let.",
    tone: "bg-accent-soft text-accent",
  },
];

const WhyUs = () => {
  return (
    <section className="bg-background py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-2xl md:mb-16">
          <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-px w-6 bg-foreground/30" />
            Hvorfor os
          </span>
          <h2 className="mt-5 text-[2rem] font-semibold leading-[1.05] tracking-[-0.02em] text-foreground md:text-[2.75rem]">Hvorfor Serviceydere</h2>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">Det vigtigste først: overblik, troværdighed og sammenligning.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="group relative flex flex-col rounded-[24px] border border-border/70 bg-card p-7 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)]"
            >
              <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${b.tone}`}>
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-6 text-[15px] font-semibold leading-tight text-foreground">{b.title}</h3>
              <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
