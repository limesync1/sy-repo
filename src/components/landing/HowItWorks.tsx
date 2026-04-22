import { Search, BarChart3, CalendarCheck, Sparkles } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Søg",
    description: "Fortæl kort hvad du skal have hjælp til, og start derfra i stedet for at lede manuelt.",
    detail: "Direkte vej til relevante profiler",
    tone: "bg-feature-cool text-feature-cool-foreground",
  },
  {
    icon: BarChart3,
    title: "Sammenlign",
    description: "Se de stærkeste muligheder uden at grave dig igennem alt på én gang.",
    detail: "Pris, lokation og anmeldelser i samme flow",
    tone: "bg-feature-warm text-feature-warm-foreground",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    description: "Vælg den løsning, der passer bedst til pris, timing og tryghed.",
    detail: "Direkte booking eller 3 tilbud",
    tone: "bg-feature-lilac text-feature-lilac-foreground",
  },
];

const HowItWorks = () => {
  return (
    <section className="bg-secondary py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-5 lg:grid-cols-[minmax(0,0.7fr)_minmax(0,1.3fr)] lg:items-start">
          <div className="rounded-[30px] border border-border bg-card p-6 shadow-sm md:p-8 lg:sticky lg:top-24">
            <div className="inline-flex items-center gap-2 rounded-full bg-accent-soft px-3 py-1.5 text-xs font-semibold text-accent">
              <Sparkles className="h-3.5 w-3.5" />
              Sådan fungerer det
            </div>
            <h2 className="mt-4 text-3xl leading-tight text-foreground md:text-[2.5rem]">
              Hurtigere fra behov til valg.
            </h2>
            <p className="mt-4 max-w-md text-sm leading-7 text-muted-foreground md:text-base">
              Hele flowet er bygget til at give ro og retning først — ikke flere beslutninger end nødvendigt.
            </p>
          </div>

          <div className="space-y-4">
            {steps.map((step, i) => (
              <div key={step.title} className="grid gap-4 rounded-[28px] border border-border bg-background p-5 shadow-sm md:grid-cols-[auto_1fr_auto] md:items-center md:p-6">
                <div className={`flex h-16 w-16 items-center justify-center rounded-[22px] ${step.tone}`}>
                  <step.icon className="h-7 w-7" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">Trin {i + 1}</div>
                  <h3 className="mt-2 text-2xl text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">{step.description}</p>
                </div>
                <div className="rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-foreground">
                  {step.detail}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
