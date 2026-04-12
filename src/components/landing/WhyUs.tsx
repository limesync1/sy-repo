import { BadgeCheck, Star, DollarSign, ShieldCheck } from "lucide-react";

const benefits = [
  {
    icon: DollarSign,
    title: "Gratis at bruge",
    description: "Det koster dig ikke en krone at søge, sammenligne og indhente tilbud.",
  },
  {
    icon: BadgeCheck,
    title: "Verificerede virksomheder",
    description: "Alle virksomheder er godkendte, så du kan handle med ro i sindet.",
  },
  {
    icon: Star,
    title: "Ægte anmeldelser",
    description: "Læs hvad andre kunder synes – baseret på rigtige oplevelser.",
  },
  {
    icon: ShieldCheck,
    title: "Sammenlign priser",
    description: "Brug prisberegneren og find den bedste pris til netop dit behov.",
  },
];

const WhyUs = () => {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="mb-12 text-center text-3xl font-bold text-foreground md:text-4xl">
          Hvorfor Serviceydere?
        </h2>
        <div className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.title} className="flex flex-col items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/15">
                <b.icon className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-foreground">{b.title}</h3>
              <p className="text-sm text-muted-foreground">{b.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
