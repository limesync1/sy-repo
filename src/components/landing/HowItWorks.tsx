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
    <section className="bg-secondary py-20 md:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-14 max-w-2xl md:mb-16">
          <span className="inline-flex items-center gap-2.5 text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
            <span className="h-px w-6 bg-foreground/30" />
            Sådan virker det
          </span>
          <h2 className="mt-5 text-[2rem] font-semibold leading-[1.04] tracking-[-0.025em] text-foreground md:text-[2.75rem] lg:text-[3.25rem]">
            Sådan fungerer det
          </h2>
          <p className="mt-4 max-w-lg text-[15px] leading-7 text-muted-foreground md:text-base">
            Et enkelt flow fra søgning til bestilling — typisk på under 5 minutter.
          </p>
        </div>

        <div className="relative grid gap-4 sm:gap-5 md:grid-cols-3">
          {/* Tynd forbindende linje på desktop — antyder flow mellem trinene */}
          <div aria-hidden className="pointer-events-none absolute left-[12%] right-[12%] top-14 hidden h-px bg-gradient-to-r from-transparent via-border to-transparent md:block" />
          {steps.map((step, i) => (
            <div
              key={step.title}
              className="group relative flex flex-col rounded-[28px] border border-border/70 bg-card p-8 shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-0.5 hover:border-border hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)]"
            >
              <div className="flex items-center justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-background">
                  <step.icon className="h-5 w-5" />
                </div>
                <div className="text-[10px] font-medium uppercase tracking-[0.22em] text-muted-foreground/70">
                  Trin {i + 1}
                </div>
              </div>
              <h3 className="mt-8 text-xl font-semibold tracking-tight text-foreground">{step.title}</h3>
              <p className="mt-2 text-[14px] leading-6 text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
