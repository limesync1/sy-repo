import { Search, BarChart3, CalendarCheck, ArrowRight } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Søg",
    description:
      "Start med kategori, firma eller område — uden at blive sendt gennem et langt flow.",
  },
  {
    icon: BarChart3,
    title: "Sammenlign",
    description:
      "Pris, anmeldelser og nærhed ligger samlet, så du kan sortere med det samme.",
  },
  {
    icon: CalendarCheck,
    title: "Book",
    description:
      "Når du har fundet det rigtige match, er du allerede tæt på næste skridt.",
  },
];

const HowItWorks = () => {
  return (
    <section className="bg-secondary/40 py-14 md:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex flex-col gap-3 md:mb-10 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Forløb
            </div>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Tre trin, og så er du videre.
            </h2>
          </div>
          <div className="text-sm text-muted-foreground">
            Bygget til at føles som et værktøj, ikke som en brochure.
          </div>
        </div>

        <div className="overflow-hidden rounded-[36px] border border-border bg-background shadow-sm">
          <div className="grid gap-px bg-border lg:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="relative bg-background px-6 py-6 sm:px-7 sm:py-7"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-[18px] bg-secondary text-foreground">
                    <step.icon className="h-6 w-6" />
                  </div>
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    0{index + 1}
                    {index < steps.length - 1 && (
                      <ArrowRight className="hidden h-4 w-4 lg:block" />
                    )}
                  </div>
                </div>
                <h3 className="mt-10 text-xl font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-3 max-w-[32ch] text-sm leading-6 text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
