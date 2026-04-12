import { Search, BarChart3, CalendarCheck, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Søg",
    description: "Find serviceydere i din kategori og dit område.",
  },
  {
    icon: BarChart3,
    title: "Sammenlign",
    description: "Se priser, anmeldelser og beregn din pris direkte.",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    description: "Vælg den bedste og bestil med det samme.",
  },
];

const HowItWorks = () => {
  return (
    <section className="py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">Simpelt & hurtigt</p>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            Sådan virker det
          </h2>
        </div>
        <div className="mx-auto grid max-w-5xl grid-cols-1 gap-8 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="absolute -right-4 top-1/2 z-10 hidden -translate-y-1/2 md:block lg:-right-5">
                  <ArrowRight className="h-6 w-6 text-muted-foreground/40" />
                </div>
              )}
              <div className="rounded-2xl border border-border bg-card p-8 shadow-sm transition-all hover:shadow-md">
                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl bg-foreground text-background">
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Trin {i + 1}
                </div>
                <h3 className="mb-2 text-xl font-bold text-foreground">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
