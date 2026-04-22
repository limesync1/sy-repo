import { BadgeCheck, Star, CircleDollarSign, ShieldCheck } from "lucide-react";

const benefits = [
  {
    icon: CircleDollarSign,
    title: "Gratis at bruge",
    description: "Det koster dig ikke en krone at søge, sammenligne og indhente tilbud.",
  },
  {
    icon: BadgeCheck,
    title: "Verificerede virksomheder",
    description: "Alle virksomheder er godkendte og kontrolleret af vores team.",
  },
  {
    icon: Star,
    title: "Ægte anmeldelser",
    description: "Læs hvad andre kunder synes – baseret på rigtige oplevelser.",
  },
  {
    icon: ShieldCheck,
    title: "Sammenlign priser",
    description: "Brug prisberegneren og find den bedste pris til dit behov.",
  },
];

const WhyUs = () => {
  return (
    <section className="bg-background py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-2xl md:mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Hvorfor Serviceydere?
          </h2>
          <p className="mt-1 text-sm leading-6 text-muted-foreground md:text-base">Alt er bygget til at gøre valget mere trygt, hurtigt og overskueligt for danske kunder.</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs font-medium text-muted-foreground">
            {[
              "Mindre friktion",
              "Mere tryghed",
              "Bedre overblik",
            ].map((item) => (
              <span key={item} className="inline-flex rounded-full border border-border bg-card px-3 py-1">
                {item}
              </span>
            ))}
          </div>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.title} className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:bg-secondary hover:shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{b.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{b.description}</p>
              <div className="pt-1 text-xs font-medium text-muted-foreground">Gør det lettere at vælge rigtigt første gang.</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
