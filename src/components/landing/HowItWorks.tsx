import { Search, BarChart3, CalendarCheck, ArrowRight } from "lucide-react";

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
    detail: "Ingen skjulte gebyrer. Du ser alt før booking.",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    description: "Vælg den bedste og bestil med ét klik – med betaling efter levering.",
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

        {/* Steps with connecting line */}
        <div className="relative mx-auto max-w-6xl">
          <div className="absolute left-0 right-0 top-[88px] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3 md:gap-8">
            {steps.map((step, i) => (
              <div key={step.title} className="group relative">
                {/* Big number */}
                <div className="mb-6 flex items-center gap-4">
                  <div className="relative flex h-[88px] w-[88px] items-center justify-center rounded-2xl border border-border bg-card shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-foreground/20 group-hover:shadow-lg">
                    <step.icon className="h-8 w-8 text-foreground" />
                    <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-foreground text-xs font-bold text-background">
                      {i + 1}
                    </span>
                  </div>
                  {i < steps.length - 1 && (
                    <ArrowRight className="hidden h-5 w-5 text-muted-foreground/40 md:block" />
                  )}
                </div>
                <h3 className="mb-2 text-2xl font-bold tracking-tight text-foreground">{step.title}</h3>
                <p className="mb-3 text-base text-muted-foreground">{step.description}</p>
                <p className="text-sm font-medium text-foreground/70">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
