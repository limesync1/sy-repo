import { Search, BarChart3, CalendarCheck, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Søg",
    description: "Find serviceydere i din kategori og dit område.",
    color: "bg-blue-50 text-blue-600",
  },
  {
    icon: BarChart3,
    title: "Sammenlign",
    description: "Se priser, anmeldelser og beregn din pris direkte.",
    color: "bg-emerald-50 text-emerald-600",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    description: "Vælg den bedste og bestil med det samme.",
    color: "bg-violet-50 text-violet-600",
  },
];

const HowItWorks = () => {
  return (
    <section className="border-t border-border/50 bg-muted/30 py-20 md:py-28">
      <div className="container mx-auto px-4">
        <div className="mb-14 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-accent">Simpelt & hurtigt</p>
          <h2 className="text-3xl font-bold text-foreground md:text-4xl">
            Sådan virker det
          </h2>
        </div>
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-6 md:flex-row md:items-stretch">
          {steps.map((step, i) => (
            <>
              <div key={step.title} className="flex-1 rounded-2xl border border-border/60 bg-card p-8 text-center shadow-sm transition-all hover:shadow-md">
                <div className={`mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-xl ${step.color}`}>
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="mb-3 text-xs font-bold uppercase tracking-widest text-muted-foreground">
                  Trin {i + 1}
                </div>
                <h3 className="mb-2 text-xl font-bold text-foreground">{step.title}</h3>
                <p className="text-muted-foreground">{step.description}</p>
              </div>
              {i < steps.length - 1 && (
                <div key={`arrow-${i}`} className="hidden items-center md:flex">
                  <ArrowRight className="h-6 w-6 text-accent" />
                </div>
              )}
            </>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
