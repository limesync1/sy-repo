import { Search, BarChart3, CalendarCheck, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Søg",
    description: "Fortæl kort hvad du skal have hjælp til.",
  },
  {
    icon: BarChart3,
    title: "Sammenlign",
    description: "Se de stærkeste muligheder uden at grave dig igennem alt.",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    description: "Vælg den løsning, der passer bedst til pris og timing.",
  },
];

const HowItWorks = () => {
  return (
    <section className="bg-background py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Flow</div>
            <h2 className="mt-2 text-2xl font-bold tracking-tight text-foreground md:text-3xl">
              Fra behov til booking på få trin
            </h2>
          </div>
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-secondary px-3 py-1.5 text-sm font-medium text-foreground">
            <Sparkles className="h-4 w-4 text-accent" />
            Få overblik på få klik
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-[minmax(0,0.82fr)_minmax(0,0.82fr)_minmax(0,0.82fr)]">

          {steps.map((step, i) => (
            <div key={step.title} className="relative flex flex-col gap-5 rounded-[30px] border border-border bg-secondary/55 p-6 md:min-h-[260px] md:p-7">
              <div className="flex items-center justify-between gap-3">
                <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border bg-secondary shadow-sm">
                <step.icon className="h-6 w-6 text-foreground" />
                <span className="absolute -right-1.5 -top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-foreground text-[11px] font-bold text-background shadow-sm">
                  {i + 1}
                </span>
                </div>
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trin {i + 1}</div>
              </div>
              <div>
                <h3 className="mb-1 text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
