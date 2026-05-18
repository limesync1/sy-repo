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
    <section className="bg-background py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Hvorfor os
          </span>
          <h2 className="mt-4 text-[1.75rem] font-semibold leading-[1.1] tracking-tight text-foreground md:text-[2.25rem]">Hvorfor Serviceydere</h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">Det vigtigste først: overblik, troværdighed og sammenligning.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="group relative flex flex-col rounded-[24px] border border-border bg-card p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-foreground/15 hover:shadow-lg"
            >
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${b.tone}`}>
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-[15px] font-semibold leading-tight text-foreground">{b.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
