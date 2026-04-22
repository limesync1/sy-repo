import { BadgeCheck, Star, CircleDollarSign, ShieldCheck } from "lucide-react";

const benefits = [
  { icon: CircleDollarSign, title: "Gratis at bruge", tone: "bg-feature-warm text-feature-warm-foreground" },
  { icon: BadgeCheck, title: "Stærkere profiler", tone: "bg-feature-cool text-feature-cool-foreground" },
  { icon: Star, title: "Reelle signaler", tone: "bg-feature-lilac text-feature-lilac-foreground" },
  { icon: ShieldCheck, title: "Bedre sammenligning", tone: "bg-accent-soft text-accent" },
];

const WhyUs = () => {
  return (
    <section className="bg-background py-12 md:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Hvorfor Serviceydere</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">Det vigtigste først: overblik, troværdighed og sammenligning.</p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b) => (
            <div key={b.title} className="rounded-[22px] border border-border bg-card p-5 shadow-sm">
              <div className={`flex h-11 w-11 items-center justify-center rounded-2xl ${b.tone}`}>
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="mt-4 text-base font-semibold text-foreground">{b.title}</h3>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
