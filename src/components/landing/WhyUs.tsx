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
    <section className="bg-background py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Hvorfor Serviceydere?
          </h2>
          <p className="mt-2 text-base text-muted-foreground">
            Bygget til danske kunder – med fokus på tryghed, kvalitet og enkelhed.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div
              key={b.title}
              className="rounded-2xl border border-border bg-card p-7 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mb-2 text-lg font-bold text-foreground">{b.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
