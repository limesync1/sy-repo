import {
  BadgeCheck,
  CircleDollarSign,
  MapPin,
  Star,
  ShieldCheck,
  TimerReset,
} from "lucide-react";

const signals = [
  {
    icon: CircleDollarSign,
    title: "Prisniveau",
    description:
      "Du ser hurtigere om opgaven ligger i den billige, mellemste eller stærkere ende.",
  },
  {
    icon: Star,
    title: "Anmeldelser",
    description:
      "Det er nemmere at spotte de profiler andre faktisk har været glade for.",
  },
  {
    icon: MapPin,
    title: "Lokation",
    description:
      "Nære muligheder kommer tydeligere frem, når du vil have hjælp hurtigt.",
  },
  {
    icon: BadgeCheck,
    title: "Verificering",
    description:
      "Du behøver ikke gætte dig frem til, hvem der virker mest troværdig.",
  },
  {
    icon: TimerReset,
    title: "Tidsforbrug",
    description:
      "Færre døde klik og mindre zig-zag mellem sider giver et kortere forløb.",
  },
  {
    icon: ShieldCheck,
    title: "Bedre beslutning",
    description:
      "De rigtige signaler ligger tættere på dit valg, så du hurtigere kan gå videre.",
  },
];

const WhyUs = () => {
  return (
    <section className="bg-background py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 grid gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-end">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Overblik
            </div>
            <h2 className="mt-3 max-w-xl text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Det vigtigste ligger tættere på beslutningen.
            </h2>
          </div>
          <p className="max-w-2xl text-base leading-7 text-muted-foreground lg:justify-self-end">
            I stedet for at sende dig gennem et tungt katalog samler forsiden de
            signaler, der faktisk afgør, hvem du vælger.
          </p>
        </div>

        <div className="overflow-hidden rounded-[36px] border border-border bg-card shadow-sm">
          <div className="grid gap-px bg-border md:grid-cols-2 xl:grid-cols-3">
            {signals.map((signal) => (
              <div
                key={signal.title}
                className="bg-background px-5 py-5 sm:px-6 sm:py-6"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-foreground">
                  <signal.icon className="h-5 w-5" />
                </div>
                <div className="mt-5 text-lg font-semibold text-foreground">
                  {signal.title}
                </div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {signal.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyUs;
