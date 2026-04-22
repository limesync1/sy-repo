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
    <section className="bg-background py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-stretch">
          <div className="flex h-full flex-col justify-between rounded-[40px] bg-foreground px-7 py-8 text-background md:px-8">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-background/60">Hvorfor det virker</div>
              <h2 className="mt-3 max-w-md text-3xl font-bold tracking-tight text-background md:text-4xl">
                Et mere roligt overblik giver bedre valg.
              </h2>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-2xl bg-background/10 px-4 py-4 backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-background/60">Pris</div>
                <div className="mt-2 text-sm font-semibold text-background">Budgettet er lettere at vurdere med det samme.</div>
              </div>
              <div className="rounded-2xl bg-background/10 px-4 py-4 backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-background/60">Kvalitet</div>
                <div className="mt-2 text-sm font-semibold text-background">Profiler og anmeldelser står tydeligere frem.</div>
              </div>
              <div className="rounded-2xl bg-background/10 px-4 py-4 backdrop-blur-sm">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-background/60">Lokation</div>
                <div className="mt-2 text-sm font-semibold text-background">Lokale muligheder kan ses og vælges hurtigere.</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
          {benefits.map((b) => (
            <div key={b.title} className="group flex min-h-[210px] flex-col justify-between gap-4 rounded-[32px] border border-border bg-card p-6 transition-all hover:border-foreground/20 hover:bg-secondary hover:shadow-sm">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                <b.icon className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{b.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{b.description}</p>
              </div>
            </div>
          ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
