import { Search, BarChart3, CalendarCheck } from "lucide-react";

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
    <section className="bg-secondary py-12 md:py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 max-w-2xl">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl">Sådan fungerer det</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground md:text-base">Et enkelt flow fra søgning til bestilling.</p>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          {steps.map((step, i) => (
            <div key={step.title} className="rounded-[24px] border border-border bg-card p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary text-foreground">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Trin {i + 1}</div>
              </div>
              <h3 className="mt-4 text-lg font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
