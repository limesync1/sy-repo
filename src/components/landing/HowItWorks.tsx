import { Search, BarChart3, CalendarCheck } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Søg",
    description: "Find serviceydere i din kategori og dit område på sekunder.",
    detail: "Filtrér på pris, anmeldelser og afstand.",
  },
  {
    icon: BarChart3,
    title: "Sammenlign",
    description: "Se priser, ægte anmeldelser og beregn pris direkte i appen.",
    detail: "Ingen skjulte gebyrer – du ser alt før booking.",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    description: "Vælg den bedste og bestil med ét klik – betal efter levering.",
    detail: "Du får bekræftelse på mail med det samme.",
  },
];

const HowItWorks = () => {
  return (
    <section className="relative py-24 md:py-32">
      <div className="container mx-auto px-4">
        {/* Editorial header */}
        <div className="mb-16 grid items-end gap-6 md:grid-cols-[1fr_auto] md:gap-12">
          <div>
            <p className="mb-3 text-sm font-semibold uppercase tracking-[0.2em] text-accent">Sådan virker det</p>
            <h2 className="text-4xl font-extrabold leading-[0.95] tracking-tight text-foreground md:text-6xl">
              Tre trin.<br />
              <span className="text-muted-foreground">Nul besvær.</span>
            </h2>
          </div>
          <p className="max-w-sm text-base text-muted-foreground md:text-right">
            Fra første klik til bookingen er bekræftet – det tager typisk under 2 minutter.
          </p>
        </div>

        {/* Steps */}
        <div className="mx-auto grid max-w-6xl grid-cols-1 gap-px overflow-hidden rounded-2xl border border-border bg-border md:grid-cols-3">
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="group relative bg-card p-8 transition-colors hover:bg-secondary/40 md:p-10"
            >
              {/* Big step number */}
              <div className="mb-8 flex items-baseline justify-between">
                <span className="text-6xl font-extrabold leading-none tracking-tight text-muted-foreground/20 transition-colors group-hover:text-accent/40 md:text-7xl">
                  0{i + 1}
                </span>
                <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-border bg-background transition-all group-hover:border-foreground/20">
                  <step.icon className="h-5 w-5 text-foreground" />
                </div>
              </div>

              <h3 className="mb-3 text-2xl font-bold tracking-tight text-foreground">{step.title}</h3>
              <p className="mb-3 text-base text-muted-foreground">{step.description}</p>
              <p className="text-sm font-medium text-foreground/70">{step.detail}</p>

              {/* Bottom accent line */}
              <div className="absolute bottom-0 left-0 h-0.5 w-0 bg-accent transition-all duration-500 group-hover:w-full" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
