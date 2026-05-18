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
    <section className="bg-secondary py-16 md:py-24">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-12 max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-accent" />
            Sådan virker det
          </span>
          <h2 className="mt-4 text-[1.75rem] font-semibold leading-[1.1] tracking-tight text-foreground md:text-[2.25rem]">
            Sådan fungerer det
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted-foreground md:text-base">
            Et enkelt flow fra søgning til bestilling — typisk på under 5 minutter.
          </p>
        </div>

        <div className="relative grid gap-5 sm:gap-6 md:grid-cols-3">
          {/* Tynd forbindende linje på desktop — antyder flow mellem trinene */}
          <div aria-hidden className="pointer-events-none absolute left-[12%] right-[12%] top-12 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="group relative flex flex-col rounded-[28px] border border-border bg-card p-7 shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-foreground text-background shadow-md ring-4 ring-card">
                  <step.icon className="h-6 w-6" />
                </div>
                <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Trin {i + 1}
                </div>
              </div>
              <h3 className="mt-6 text-xl font-semibold tracking-tight text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
