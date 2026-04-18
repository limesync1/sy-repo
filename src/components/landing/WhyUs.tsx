import { BadgeCheck, Star, CircleDollarSign, ShieldCheck } from "lucide-react";

const benefits = [
  {
    icon: CircleDollarSign,
    title: "Gratis at bruge",
    description: "Det koster dig ikke en krone at søge, sammenligne og indhente tilbud.",
    stat: "0 kr",
    statLabel: "i gebyrer",
  },
  {
    icon: BadgeCheck,
    title: "Verificerede virksomheder",
    description: "Alle virksomheder er godkendte og kontrolleret af vores team.",
    stat: "100%",
    statLabel: "verificeret",
  },
  {
    icon: Star,
    title: "Ægte anmeldelser",
    description: "Læs hvad andre kunder synes – baseret på rigtige oplevelser.",
    stat: "8.400+",
    statLabel: "anmeldelser",
  },
  {
    icon: ShieldCheck,
    title: "Sammenlign priser",
    description: "Brug prisberegneren og find den bedste pris til netop dit behov.",
    stat: "−27%",
    statLabel: "i snit billigere",
  },
];

const WhyUs = () => {
  return (
    <section className="py-24 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-16 grid items-end gap-6 md:grid-cols-[1fr_auto]">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent">Hvorfor os</p>
            <h2 className="text-4xl font-extrabold leading-[0.95] tracking-tight text-foreground md:text-6xl">
              Bygget til<br />
              <span className="text-muted-foreground">danske kunder.</span>
            </h2>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {benefits.map((b, i) => (
            <div
              key={b.title}
              className="group relative overflow-hidden rounded-2xl border border-border bg-card p-7 transition-all duration-300 hover:-translate-y-1 hover:border-foreground/20 hover:shadow-xl"
            >
              <div className="absolute right-0 top-0 h-24 w-24 -translate-y-8 translate-x-8 rounded-full bg-accent/0 blur-2xl transition-all duration-500 group-hover:bg-accent/15" />
              <div className="relative">
                <div className="mb-5 flex items-center justify-between">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-foreground text-background transition-transform group-hover:rotate-[-6deg]">
                    <b.icon className="h-5 w-5" />
                  </div>
                  <span className="text-xs font-mono text-muted-foreground/60">0{i + 1}</span>
                </div>
                <div className="mb-4">
                  <div className="text-3xl font-extrabold tracking-tight text-foreground">{b.stat}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{b.statLabel}</div>
                </div>
                <h3 className="mb-2 text-lg font-bold text-foreground">{b.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
