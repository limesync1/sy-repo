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
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
          <div className="rounded-[28px] border border-border bg-secondary/60 p-6 md:p-7">
            <div className="max-w-xl">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Vælg klogere</div>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
                Alt er bygget til at gøre vurderingen lettere.
              </h2>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-border bg-card px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Signal</div>
                <div className="mt-1 text-sm font-semibold text-foreground">Anmeldelser, profil og pris står tydeligt.</div>
              </div>
              <div className="rounded-2xl border border-border bg-card px-4 py-4">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Fokus</div>
                <div className="mt-1 text-sm font-semibold text-foreground">Du ser færre ting, men de rigtige ting først.</div>
              </div>
              <div className="rounded-2xl border border-border bg-card px-4 py-4 sm:col-span-2">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Udbytte</div>
                <div className="mt-1 text-sm font-semibold text-foreground">Siden føles som et værktøj til beslutning, ikke bare en liste.</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
          {benefits.map((b) => (
            <div key={b.title} className="group flex flex-col gap-3 rounded-[24px] border border-border bg-card p-5 transition-all hover:border-foreground/20 hover:bg-secondary hover:shadow-sm">
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
