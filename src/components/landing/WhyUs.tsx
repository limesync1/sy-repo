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
    <section className="bg-background py-16 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-10">
          <h2 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
            Hvorfor Serviceydere?
          </h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 md:gap-10 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.title} className="flex flex-col gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
                <b.icon className="h-5 w-5 text-foreground" />
              </div>
              <h3 className="text-lg font-semibold text-foreground">{b.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
