import { BadgeCheck, Star, CircleDollarSign, ShieldCheck } from "lucide-react";

const benefits = [
  {
    icon: CircleDollarSign,
    title: "Gratis at bruge",
    description: "Du kan undersøge markedet, før du beslutter dig.",
  },
  {
    icon: BadgeCheck,
    title: "Stærkere profiler",
    description: "Virksomhederne præsenteres mere klart og troværdigt.",
  },
  {
    icon: Star,
    title: "Reelle signaler",
    description: "Anmeldelser, prisniveau og lokation giver hurtigere overblik.",
  },
  {
    icon: ShieldCheck,
    title: "Bedre sammenligning",
    description: "Det vigtigste er prioriteret først i stedet for alt på én gang.",
  },
];

const WhyUs = () => {
  return (
    <section className="bg-background py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
          <div className="rounded-2xl border border-border bg-card p-6 md:p-7">
            <div className="border-b border-border pb-4">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                Hvad folk typisk vurderer
              </div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Sammenlign på det, der faktisk betyder noget.
              </h2>
            </div>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-secondary/60 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Prisniveau</div>
                <div className="mt-1 text-sm font-semibold text-foreground">Se hurtigt om valget passer til budgettet.</div>
              </div>
              <div className="rounded-xl bg-secondary/60 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Anmeldelser</div>
                <div className="mt-1 text-sm font-semibold text-foreground">Fang kvalitet og troværdighed med det samme.</div>
              </div>
              <div className="rounded-xl bg-secondary/60 px-4 py-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Lokation</div>
                <div className="mt-1 text-sm font-semibold text-foreground">Prioritér virksomheder tæt på opgaven.</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
          {benefits.map((b) => (
            <div key={b.title} className="group flex flex-col gap-3 rounded-2xl border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:bg-secondary hover:shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <b.icon className="h-5 w-5" />
              </div>
              <h3 className="text-base font-semibold text-foreground">{b.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{b.description}</p>
            </div>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
