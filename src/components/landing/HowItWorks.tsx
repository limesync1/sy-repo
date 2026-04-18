import { Search, BarChart3, CalendarCheck } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Søg",
    description: "Find serviceydere i din kategori og dit område på sekunder.",
  },
  {
    icon: BarChart3,
    title: "Sammenlign",
    description: "Se priser, ægte anmeldelser og beregn pris direkte i appen.",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    description: "Vælg den bedste og bestil med ét klik – betal efter levering.",
  },
];

const HowItWorks = () => {
  return (
    <section className="bg-secondary/50 py-20 md:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Sådan virker det
          </h2>
          <p className="mx-auto mt-2 max-w-md text-base text-muted-foreground">
            Tre nemme trin – under to minutter fra start til booking.
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="relative rounded-2xl border border-border bg-card p-7 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md md:p-8"
            >
              <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-accent">
                <step.icon className="h-5 w-5" />
              </div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Trin {i + 1}
              </div>
              <h3 className="mb-2 text-xl font-bold text-foreground">{step.title}</h3>
              <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
