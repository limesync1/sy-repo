import { BadgeCheck, Star, CircleDollarSign, ShieldCheck, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const benefits = [
  {
    icon: CircleDollarSign,
    title: "Gratis at bruge",
    description: "Du kan undersøge markedet, før du beslutter dig.",
    tone: "bg-feature-warm text-feature-warm-foreground",
  },
  {
    icon: BadgeCheck,
    title: "Stærkere profiler",
    description: "Virksomhederne præsenteres mere klart og troværdigt.",
    tone: "bg-feature-cool text-feature-cool-foreground",
  },
  {
    icon: Star,
    title: "Reelle signaler",
    description: "Anmeldelser, prisniveau og lokation giver hurtigere overblik.",
    tone: "bg-feature-lilac text-feature-lilac-foreground",
  },
  {
    icon: ShieldCheck,
    title: "Bedre sammenligning",
    description: "Det vigtigste er prioriteret først i stedet for alt på én gang.",
    tone: "bg-accent-soft text-accent",
  },
];

const WhyUs = () => {
  return (
    <section className="bg-background py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.86fr)_minmax(0,1.14fr)] lg:items-start">
          <div className="surface-panel rounded-[30px] border border-border p-6 shadow-panel md:p-8">
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-muted-foreground">Hvorfor Serviceydere</p>
            <h2 className="mt-3 text-3xl leading-tight text-foreground md:text-[2.5rem]">
              En forside, der hjælper dig videre.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground md:text-base">
              Fokus er flyttet fra pynt og fyld til hurtigere valg, bedre prioritering og mere professionel præsentation.
            </p>
            <div className="mt-6 rounded-[24px] bg-card p-5 shadow-sm">
              <div className="text-sm font-semibold text-foreground">To veje ind</div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Søg direkte blandt virksomheder eller brug tilbudssporet, når du vil sammenligne mere struktureret.</p>
              <Link to="/tilbud" className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-foreground transition-opacity hover:opacity-75">
                Indhent 3 tilbud
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {benefits.map((b) => (
              <div key={b.title} className="rounded-[26px] border border-border bg-card p-5 shadow-sm">
                <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${b.tone}`}>
                  <b.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{b.title}</h3>
                <p className="mt-2 text-sm leading-7 text-muted-foreground">{b.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
