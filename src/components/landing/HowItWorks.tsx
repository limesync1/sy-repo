import { Search, BarChart3, CalendarCheck, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Søg",
    description: "Fortæl kort hvad du skal have hjælp til.",
  },
  {
    icon: BarChart3,
    title: "Sammenlign",
    description: "Få overblik over de stærkeste muligheder.",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    description: "Vælg det tilbud eller den profil, der passer bedst.",
  },
];

const HowItWorks = () => {
  return (
    <section className="bg-secondary py-14 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Sådan fungerer det</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">Et enkelt flow fra søgning til bestilling — typisk på under 5 minutter.</p>
        </div>

        <div className="relative grid gap-4 md:grid-cols-3 md:gap-6">
          {/* Forbindelseslinje på desktop */}
          <div aria-hidden className="pointer-events-none absolute inset-x-12 top-12 hidden h-px bg-gradient-to-r from-border via-border to-border md:block" />
          {steps.map((step, i) => (
            <div key={step.title} className="relative rounded-[24px] border border-border bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-center gap-3">
                <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background shadow-sm">
                  <step.icon className="h-5 w-5" />
                  <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-card bg-accent text-[10px] font-bold text-accent-foreground">
                    {i + 1}
                  </span>
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Trin {i + 1}</div>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
              {i < steps.length - 1 && (
                <ArrowRight aria-hidden className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 rounded-full bg-card p-0.5 text-muted-foreground shadow-sm md:block" />
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
